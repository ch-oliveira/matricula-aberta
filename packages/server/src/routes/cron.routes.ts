import type { IncomingMessage, ServerResponse } from 'node:http';
import { exigirRateLimit } from '../infra/security.ts';
import { transmitirAtualizacaoSSE } from '../infra/sse.ts';
import { processarNotificacoesWhatsApp } from '../modules/notificacoes/notificacoes.module.ts';
import { processarExpiracaoProtocolosVencidos } from '../modules/protocolos/protocolos.module.ts';
import { invalidarSnapshotPublico, json, type RouteHandler } from './shared.ts';

export const handleCronRoutes: RouteHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
): Promise<boolean> => {
  // Endpoint de Cron Unificado para Ambientes Serverless (Vercel Cron / Render / GitHub Actions)
  if ((req.method === 'POST' || req.method === 'GET') && path === '/api/v1/cron/rotinas') {
    exigirRateLimit(req, 'cron-rotinas', 30, 60_000);
    const secretEnv = (process.env.CRON_SECRET ?? 'patos-cron-secret-2026').trim();
    const authHeader = req.headers.authorization ?? '';
    const secretHeader = req.headers['x-cron-secret'];
    const secretQuery = url.searchParams.get('secret') ?? url.searchParams.get('key');

    const matchSecret =
      authHeader === `Bearer ${secretEnv}` ||
      secretHeader === secretEnv ||
      secretQuery === secretEnv;

    if (!matchSecret) {
      json(req, res, 401, { erro: 'Chave de autorização de cron inválida.' });
      return true;
    }

    const [exp, notif] = await Promise.all([
      processarExpiracaoProtocolosVencidos(),
      processarNotificacoesWhatsApp(),
    ]);

    if (exp.expirados.length > 0) {
      invalidarSnapshotPublico();
      for (const ev of exp.eventos) {
        await transmitirAtualizacaoSSE(ev);
      }
    }

    json(req, res, 200, {
      ok: true,
      executadoEm: Date.now(),
      expiracao: exp,
      expirados: exp.expirados.length,
      notificacoes: notif,
    });
    return true;
  }

  return false;
};

