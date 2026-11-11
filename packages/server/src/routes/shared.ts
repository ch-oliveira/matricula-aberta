import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../infra/db.ts';
import { aplicarHeadersSeguranca } from '../infra/security.ts';
import { garantirSeedAlertasPatos } from '../modules/alertas/alertas.module.ts';
import { garantirSeedCatalogoPatos } from '../modules/catalogo/catalogo.module.ts';
import { garantirSeedProtocolosPatos } from '../modules/protocolos/protocolos.module.ts';
import { garantirSeedRegulacaoPatos } from '../modules/regulacao/regulacao.module.ts';
import { popularUnidadesPatos } from '../modules/unidades/unidades.module.ts';

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
) => Promise<boolean>;

/**
 * Envia resposta padronizada em formato JSON com headers de segurança.
 */
export function json(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
  aplicarHeadersSeguranca(req, res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

export interface CacheSnapshotPublico {
  jsonString: string;
  etag: string;
  expiraEm: number;
}

let cacheSnapshotPublico: CacheSnapshotPublico | null = null;
export const TTL_SNAPSHOT_PUBLICO_MS = 3_500;

export function invalidarSnapshotPublico(): void {
  cacheSnapshotPublico = null;
}

export function obterCacheSnapshotPublico(): CacheSnapshotPublico | null {
  return cacheSnapshotPublico;
}

export function definirCacheSnapshotPublico(cache: CacheSnapshotPublico): void {
  cacheSnapshotPublico = cache;
}

/**
 * Inicializa o banco de dados (SQLite WAL ou PostgreSQL) e garante todas as seeds de Patos - PB.
 */
export async function inicializarBancoPatos(forcarReset = false): Promise<void> {
  await db.inicializarSchema();
  await garantirSeedCatalogoPatos();
  await popularUnidadesPatos(forcarReset);
  await garantirSeedAlertasPatos(forcarReset);
  await garantirSeedProtocolosPatos(forcarReset);
  await garantirSeedRegulacaoPatos(forcarReset);
}

// Cache LRU em memória para arquivos MP3 sintetizados
const cacheTts = new Map<string, Buffer>();

function dividirFrasesTts(texto: string, limite = 175): string[] {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo) return [];
  const sentencas = limpo.split(/(?<=[.!?])\s+/);
  const blocos: string[] = [];

  for (const s of sentencas) {
    if (s.length <= limite) {
      blocos.push(s);
      continue;
    }
    const partes = s.split(/(?<=[,;:])\s+/);
    let atual = '';
    for (const p of partes) {
      if ((atual ? `${atual} ${p}` : p).length <= limite) {
        atual = atual ? `${atual} ${p}` : p;
      } else {
        if (atual) blocos.push(atual);
        if (p.length <= limite) {
          atual = p;
        } else {
          const palavras = p.split(' ');
          let fatia = '';
          for (const pl of palavras) {
            if ((fatia ? `${fatia} ${pl}` : pl).length <= limite) {
              fatia = fatia ? `${fatia} ${pl}` : pl;
            } else {
              if (fatia) blocos.push(fatia);
              fatia = pl;
            }
          }
          atual = fatia;
        }
      }
    }
    if (atual) blocos.push(atual);
  }

  return blocos.filter(Boolean);
}

/**
 * Síntese de Voz Neural em Português Brasileiro para acessibilidade cidadã
 */
export async function sintetizarVozNeuralPtBr(texto: string): Promise<Buffer> {
  const chave = texto.slice(0, 600).trim();
  const emCache = cacheTts.get(chave);
  if (emCache) return emCache;

  const trechos = dividirFrasesTts(chave);
  if (trechos.length === 0) throw new Error('Texto vazio para síntese de voz.');

  const buffers = await Promise.all(
    trechos.map(async (trecho) => {
      const endpoint =
        `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&ttsspeed=1&q=` +
        encodeURIComponent(trecho);
      const r = await fetch(endpoint, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
        signal: AbortSignal.timeout(4500),
      });
      if (!r.ok) throw new Error(`TTS upstream status ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    }),
  );

  const audioFinal = Buffer.concat(buffers);
  if (cacheTts.size >= 120) {
    const primeiraChave = cacheTts.keys().next().value;
    if (primeiraChave) cacheTts.delete(primeiraChave);
  }
  cacheTts.set(chave, audioFinal);
  return audioFinal;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));

function obterDiretorioDist(): string | null {
  const caminhos = [
    resolve(__dirnameLocal, '../../../../dist'),
    resolve(__dirnameLocal, '../../../dist'),
    resolve(__dirnameLocal, '../../web/dist'),
    resolve(process.cwd(), 'dist'),
    resolve(process.cwd(), 'packages/web/dist'),
  ];
  for (const c of caminhos) {
    if (existsSync(c) && existsSync(join(c, 'index.html'))) {
      return c;
    }
  }
  return null;
}

/**
 * Servidor de arquivos estáticos e suporte a SPA fallback para o frontend web
 */
export function tentarServirEstatico(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (pathname.startsWith('/api/')) return false;

  const distDir = obterDiretorioDist();
  if (!distDir) return false;

  const caminhoRelativo = pathname.replace(/^\/+/, '');
  let arquivoAlvo = join(distDir, caminhoRelativo);
  let ehSpaFallback = false;

  if (!caminhoRelativo || !existsSync(arquivoAlvo) || !statSync(arquivoAlvo).isFile()) {
    arquivoAlvo = join(distDir, 'index.html');
    ehSpaFallback = true;
  }

  if (!existsSync(arquivoAlvo)) return false;

  const ext = extname(arquivoAlvo).toLowerCase();
  const mime = MIME_TYPES[ext] ?? 'application/octet-stream';

  aplicarHeadersSeguranca(req, res);

  let cacheControl = 'public, max-age=3600';
  if (pathname.startsWith('/assets/')) {
    cacheControl = 'public, max-age=31536000, immutable';
  } else if (pathname === '/sw.js' || pathname === '/manifest.webmanifest') {
    cacheControl = 'public, max-age=0, must-revalidate';
  } else if (ehSpaFallback || ext === '.html') {
    cacheControl = 'no-cache';
  }

  const stat = statSync(arquivoAlvo);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
  });

  if (req.method === 'HEAD') {
    res.end();
    return true;
  }

  createReadStream(arquivoAlvo).pipe(res);
  return true;
}
