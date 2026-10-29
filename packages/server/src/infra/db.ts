import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/patos-pb-matricula.sqlite');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;

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
    atualizado_em INTEGER NOT NULL
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
    em INTEGER NOT NULL,
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
    criado_em INTEGER NOT NULL,
    expira_em INTEGER NOT NULL
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
    criado_em INTEGER NOT NULL,
    atendido_em INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_historico_em ON historico_vagas(em DESC);
  CREATE INDEX IF NOT EXISTS idx_alertas_etapa ON alertas(etapa);
  CREATE INDEX IF NOT EXISTS idx_protocolos_escola ON protocolos_visita(escola_id, criado_em DESC);
`);

