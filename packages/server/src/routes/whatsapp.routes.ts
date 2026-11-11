import type { IncomingMessage, ServerResponse } from 'node:http';
import { exigirSessaoGestao } from '../infra/auth.ts';
import { aplicarHeadersSeguranca, exigirRateLimit, lerJsonSeguro } from '../infra/security.ts';
import {
  dispararMensagemTesteWhatsApp,
  obterMetricasNotificacoes,
  processarWebhookWhatsAppEntrada,
} from '../modules/notificacoes/notificacoes.module.ts';
import { json, type RouteHandler } from './shared.ts';

export const handleWhatsAppRoutes: RouteHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
): Promise<boolean> => {
  // 1. Verificação de Handshake Meta Cloud API Webhook
  if (req.method === 'GET' && path === '/api/v1/webhook/whatsapp') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyTokenEnv = (process.env.WHATSAPP_VERIFY_TOKEN ?? 'patos-whatsapp-verify-2026').trim();

    if (mode === 'subscribe' && token === verifyTokenEnv && challenge) {
      aplicarHeadersSeguranca(req, res);
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(challenge);
      return true;
    }

    json(req, res, 403, { erro: 'Token de verificação do webhook inválido.' });
    return true;
  }

  // 2. Recebimento de Webhook de Mensagens e Recibos (Meta / Evolution / Z-API / Custom)
  if (req.method === 'POST' && path === '/api/v1/webhook/whatsapp') {
    exigirRateLimit(req, 'webhook-whatsapp', 120, 60_000);
    const body = await lerJsonSeguro<Record<string, unknown>>(req);
    const resultado = await processarWebhookWhatsAppEntrada(body);
    json(req, res, 200, { ok: true, resultado });
    return true;
  }

  // 3. Status e Métricas do Gateway de Notificações WhatsApp (SEDUC)
  if (req.method === 'GET' && path === '/api/v1/gestao/whatsapp/status') {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const metricas = obterMetricasNotificacoes();
    json(req, res, 200, { ok: true, metricas });
    return true;
  }

  // 4. Disparo de Mensagem de Teste em Tempo Real (SEDUC)
  if (req.method === 'POST' && path === '/api/v1/gestao/whatsapp/teste') {
    exigirRateLimit(req, 'gestao-mutacao', 20, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const body = await lerJsonSeguro<{ telefone?: unknown }>(req);
    const tel = typeof body.telefone === 'string' ? body.telefone : '';
    if (!tel) {
      json(req, res, 400, { erro: 'Informe o número de telefone com DDD para o teste.' });
      return true;
    }

    try {
      const resTeste = await dispararMensagemTesteWhatsApp(tel);
      json(req, res, 200, resTeste);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao disparar teste de WhatsApp.';
      json(req, res, 400, { erro: msg });
      return true;
    }
  }

  return false;
};
