import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

// Configura o parser do node-postgres para converter BIGINT (int8) para number em JavaScript
pg.types.setTypeParser(20, (val: string) => Number(val));

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/patos-pb-matricula.sqlite');

export type TipoBanco = 'postgres' | 'sqlite';

export interface DbClient {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  execScript(sql: string): Promise<void>;
}

const DATABASE_URL = (
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_POSTGRES_URL ??
  ''
).trim();

export const ehPostgres = Boolean(DATABASE_URL);
export const tipoBanco: TipoBanco = ehPostgres ? 'postgres' : 'sqlite';

let pgPool: pg.Pool | null = null;
let sqliteDb: DatabaseSync | null = null;

function obterSqlite(): DatabaseSync {
  if (!sqliteDb) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    sqliteDb = new DatabaseSync(DB_PATH);
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA synchronous = NORMAL;
    `);
  }
  return sqliteDb;
}

function obterPgPool(): pg.Pool {
  if (!pgPool) {
    const isLocalhost =
      DATABASE_URL.includes('localhost') ||
      DATABASE_URL.includes('127.0.0.1') ||
      DATABASE_URL.includes('patos_local');

    pgPool = new Pool({
      connectionString: DATABASE_URL,
      max: Number(process.env.PG_MAX_POOL ?? 10),
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    });

    pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err);
    });
  }
  return pgPool;
}

/**
 * Normaliza parâmetros e placeholders para PostgreSQL ($1, $2, ...)
 */
function adaptarParaPostgres(sql: string, params: unknown[] = []): { sql: string; params: unknown[] } {
  if (!sql.includes('?')) {
    return { sql, params };
  }
  let i = 0;
  const sqlPg = sql.replace(/\?/g, () => `$${++i}`);
  return { sql: sqlPg, params };
}

/**
 * Normaliza parâmetros e placeholders para SQLite (? positional)
 */
function adaptarParaSqlite(sql: string, params: unknown[] = []): { sql: string; params: unknown[] } {
  if (!sql.includes('$')) {
    return { sql, params };
  }
  const paramsAdaptados: unknown[] = [];
  const sqlSqlite = sql.replace(/\$(\d+)/g, (_, numStr) => {
    const idx = Number(numStr) - 1;
    paramsAdaptados.push(params[idx]);
    return '?';
  });
  return { sql: sqlSqlite, params: paramsAdaptados };
}

export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (ehPostgres) {
    const pool = obterPgPool();
    const { sql: sqlPg, params: paramsPg } = adaptarParaPostgres(sql, params);
    const res = await pool.query(sqlPg, paramsPg);
    return res.rows as T[];
  } else {
    const sqlite = obterSqlite();
    const { sql: sqlLite, params: paramsLite } = adaptarParaSqlite(sql, params);
    const stmt = sqlite.prepare(sqlLite);
    return stmt.all(...(paramsLite as any[])) as T[];
  }
}

export async function queryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  if (ehPostgres) {
    const pool = obterPgPool();
    const { sql: sqlPg, params: paramsPg } = adaptarParaPostgres(sql, params);
    const res = await pool.query(sqlPg, paramsPg);
    return { changes: res.rowCount ?? 0 };
  } else {
    const sqlite = obterSqlite();
    const { sql: sqlLite, params: paramsLite } = adaptarParaSqlite(sql, params);
    const stmt = sqlite.prepare(sqlLite);
    const res = stmt.run(...(paramsLite as any[]));
    return { changes: Number(res.changes ?? 0) };
  }
}

export async function execScript(sql: string): Promise<void> {
  if (ehPostgres) {
    const pool = obterPgPool();
    await pool.query(sql);
  } else {
    const sqlite = obterSqlite();
    sqlite.exec(sql);
  }
}

export async function transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  if (ehPostgres) {
    const pool = obterPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txClient: DbClient = {
        async query<R = any>(sql: string, params: unknown[] = []): Promise<R[]> {
          const { sql: sqlPg, params: paramsPg } = adaptarParaPostgres(sql, params);
          const res = await client.query(sqlPg, paramsPg);
          return res.rows as R[];
        },
        async queryOne<R = any>(sql: string, params: unknown[] = []): Promise<R | null> {
          const rows = await this.query<R>(sql, params);
          return rows[0] ?? null;
        },
        async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
          const { sql: sqlPg, params: paramsPg } = adaptarParaPostgres(sql, params);
          const res = await client.query(sqlPg, paramsPg);
          return { changes: res.rowCount ?? 0 };
        },
        async execScript(sql: string): Promise<void> {
          await client.query(sql);
        },
      };

      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const sqlite = obterSqlite();
    sqlite.exec('BEGIN');
    try {
      const txClient: DbClient = {
        async query<R = any>(sql: string, params: unknown[] = []): Promise<R[]> {
          const { sql: sqlLite, params: paramsLite } = adaptarParaSqlite(sql, params);
          const stmt = sqlite.prepare(sqlLite);
          return stmt.all(...(paramsLite as any[])) as R[];
        },
        async queryOne<R = any>(sql: string, params: unknown[] = []): Promise<R | null> {
          const rows = await this.query<R>(sql, params);
          return rows[0] ?? null;
        },
        async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
          const { sql: sqlLite, params: paramsLite } = adaptarParaSqlite(sql, params);
          const stmt = sqlite.prepare(sqlLite);
          const res = stmt.run(...(paramsLite as any[]));
          return { changes: Number(res.changes ?? 0) };
        },
        async execScript(sql: string): Promise<void> {
          sqlite.exec(sql);
        },
      };

      const result = await fn(txClient);
      sqlite.exec('COMMIT');
      return result;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }
}

export async function inicializarSchema(): Promise<void> {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS bairros_patos (
      id TEXT PRIMARY KEY,
      rotulo TEXT NOT NULL UNIQUE,
      zona TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      ordem INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documentos_catalogo (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      dica TEXT NOT NULL,
      emoji TEXT NOT NULL,
      obrigatorio INTEGER NOT NULL DEFAULT 1,
      etapas_json TEXT,
      ordem INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS escolas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('Creche', 'CMEI', 'EMEF')),
      bairro TEXT NOT NULL,
      endereco TEXT NOT NULL,
      telefone TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      acessivel INTEGER NOT NULL DEFAULT 1,
      destaques_json TEXT NOT NULL DEFAULT '[]',
      atendimento TEXT NOT NULL,
      atualizado_em BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ofertas (
      escola_id TEXT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
      etapa TEXT NOT NULL CHECK (etapa IN ('bercario', 'maternal', 'pre', 'fund1', 'fund2')),
      periodo TEXT NOT NULL CHECK (periodo IN ('integral', 'parcial')),
      vagas INTEGER NOT NULL CHECK (vagas >= 0),
      capacidade INTEGER NOT NULL CHECK (capacidade > 0),
      fila INTEGER NOT NULL DEFAULT 0 CHECK (fila >= 0),
      PRIMARY KEY (escola_id, etapa, periodo)
    );

    CREATE TABLE IF NOT EXISTS historico_vagas (
      id TEXT PRIMARY KEY,
      escola_id TEXT NOT NULL,
      escola_nome TEXT NOT NULL,
      etapa TEXT NOT NULL,
      periodo TEXT NOT NULL,
      de INTEGER NOT NULL,
      para INTEGER NOT NULL,
      em BIGINT NOT NULL,
      origem TEXT NOT NULL CHECK (origem IN ('escola', 'protocolo', 'secretaria'))
    );

    CREATE TABLE IF NOT EXISTS alertas (
      id TEXT PRIMARY KEY,
      canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'push')),
      telefone_mascarado TEXT,
      telefone_hash TEXT,
      etapa TEXT NOT NULL,
      periodo TEXT NOT NULL,
      local_lat REAL NOT NULL,
      local_lng REAL NOT NULL,
      local_rotulo TEXT NOT NULL,
      raio_km REAL NOT NULL,
      escola_id TEXT,
      escola_nome TEXT,
      criado_em BIGINT NOT NULL,
      expira_em BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS protocolos_visita (
      codigo TEXT PRIMARY KEY,
      escola_id TEXT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
      escola_nome TEXT NOT NULL,
      escola_endereco TEXT NOT NULL,
      escola_bairro TEXT NOT NULL,
      etapa TEXT NOT NULL,
      turma TEXT NOT NULL,
      periodo TEXT NOT NULL,
      responsavel TEXT NOT NULL,
      telefone_mascarado TEXT,
      nascimento TEXT,
      turno_visita TEXT NOT NULL CHECK (turno_visita IN ('manha', 'tarde')),
      data_visita TEXT NOT NULL,
      documentos_json TEXT NOT NULL DEFAULT '[]',
      total_obrigatorios INTEGER NOT NULL DEFAULT 6,
      status TEXT NOT NULL CHECK (status IN ('aguardando', 'atendido', 'cancelado')),
      criado_em BIGINT NOT NULL,
      atendido_em BIGINT
    );

    CREATE INDEX IF NOT EXISTS idx_historico_em ON historico_vagas(em DESC);
    CREATE INDEX IF NOT EXISTS idx_alertas_etapa ON alertas(etapa);
    CREATE INDEX IF NOT EXISTS idx_protocolos_escola ON protocolos_visita(escola_id, criado_em DESC);
  `;

  await execScript(schemaSql);
}

export async function fecharBanco(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

export const db = {
  query,
  queryOne,
  execute,
  execScript,
  transaction,
  fecharBanco,
  inicializarSchema,
  tipoBanco,
  ehPostgres,
};
