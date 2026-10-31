import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const CORS_ORIGIN_ENV = (process.env.CORS_ORIGIN ?? '*').trim();
const ORIGENS_PERMITIDAS = CORS_ORIGIN_ENV.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function resolverOrigemCors(req?: IncomingMessage): string {
  if (ORIGENS_PERMITIDAS.includes('*') || ORIGENS_PERMITIDAS.length === 0) {
    return '*';
  }
  const originHeader = req?.headers.origin;
  if (originHeader && ORIGENS_PERMITIDAS.includes(originHeader)) {
    return originHeader;
  }
  return ORIGENS_PERMITIDAS[0];
}

export function aplicarHeadersSeguranca(req: IncomingMessage, res: ServerResponse): void {
  const origemPermitida = resolverOrigemCors(req);
  res.setHeader('Access-Control-Allow-Origin', origemPermitida);
  if (origemPermitida !== '*') {
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Idempotency-Key, X-Alert-Token',
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Hardening HTTP (equivalente ao Helmet)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
}

export function obterIpCliente(req: IncomingMessage): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim().slice(0, 64);
  }
  return (req.socket?.remoteAddress ?? '127.0.0.1').slice(0, 64);
}

interface JanelaRateLimit {
  contagem: number;
  resetEm: number;
}

const mapaRateLimit = new Map<string, JanelaRateLimit>();
const MAX_CHAVES_RATE_LIMIT = 5_000;

export function exigirRateLimit(
  req: IncomingMessage,
  escopo: string,
  limite: number,
  janelaMs: number,
): void {
  const agora = Date.now();

  if (mapaRateLimit.size > MAX_CHAVES_RATE_LIMIT) {
    for (const [k, v] of mapaRateLimit) {
      if (v.resetEm <= agora) mapaRateLimit.delete(k);
    }
  }

  const ip = obterIpCliente(req);
  const chave = `${escopo}:${ip}`;
  const atual = mapaRateLimit.get(chave);

  if (!atual || atual.resetEm <= agora) {
    mapaRateLimit.set(chave, { contagem: 1, resetEm: agora + janelaMs });
    return;
  }

  atual.contagem += 1;
  if (atual.contagem > limite) {
    const segundosRestantes = Math.max(1, Math.ceil((atual.resetEm - agora) / 1000));
    throw new HttpError(
      429,
      `Muitas requisições em sequência. Aguarde ${segundosRestantes}s e tente novamente.`,
    );
  }
}

const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizarObjetoJson(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(sanitizarObjetoJson);
  }
  if (valor !== null && typeof valor === 'object') {
    const limpo: Record<string, unknown> = Object.create(null);
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (CHAVES_PROIBIDAS.has(k)) continue;
      limpo[k] = sanitizarObjetoJson(v);
    }
    return limpo;
  }
  return valor;
}

export async function lerJsonSeguro<T = Record<string, unknown>>(
  req: IncomingMessage,
  limiteBytes = 32 * 1024,
): Promise<T> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
    totalBytes += buf.length;
    if (totalBytes > limiteBytes) {
      throw new HttpError(413, 'Payload da requisição excede o tamanho máximo permitido (32 KB).');
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) return {} as T;

  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'Corpo da requisição deve ser um objeto JSON válido.');
    }
    return sanitizarObjetoJson(parsed) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, 'JSON malformado no corpo da requisição.');
  }
}

