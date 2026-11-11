import type { IncomingMessage, ServerResponse } from 'node:http';
import { exigirSessaoGestao } from '../infra/auth.ts';
import { exigirRateLimit, lerJsonSeguro } from '../infra/security.ts';
import { transmitirAtualizacaoSSE } from '../infra/sse.ts';
import { validarPayloadDemandaJudicial } from '../infra/validation.ts';
import { listarAlertas } from '../modules/alertas/alertas.module.ts';
import { processarNotificacoesWhatsApp } from '../modules/notificacoes/notificacoes.module.ts';
import { processarExpiracaoProtocolosVencidos } from '../modules/protocolos/protocolos.module.ts';
import {
  alocarVagaJudicial,
  cadastrarDemandaJudicial,
  gerarCertidaoCumprimentoJudicial,
  listarDemandasJudiciais,
  listarLogsAuditoria,
} from '../modules/regulacao/regulacao.module.ts';
import { obterPainelSecretariaPatos } from '../modules/secretaria/secretaria.module.ts';
import { listarEscolas } from '../modules/unidades/unidades.module.ts';
import {
  inicializarBancoPatos,
  invalidarSnapshotPublico,
  json,
  type RouteHandler,
} from './shared.ts';

export const handleSecretariaRoutes: RouteHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
): Promise<boolean> => {
  // 1. Painel Macro da Secretaria Municipal de Educação
  if (req.method === 'GET' && path === '/api/v1/secretaria/painel') {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    json(req, res, 200, await obterPainelSecretariaPatos());
    return true;
  }

  // 2. Módulo Alertas (LGPD - Restrito à Secretaria de Educação)
  if (req.method === 'GET' && path === '/api/v1/alertas') {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    json(req, res, 200, { alertas: await listarAlertas() });
    return true;
  }

  // 3. Reset do Banco de Dados com nova Carga Inicial
  if (req.method === 'POST' && path === '/api/v1/gestao/reset') {
    exigirRateLimit(req, 'gestao-reset', 5, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    await inicializarBancoPatos(true);
    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE();
    json(req, res, 200, { ok: true, escolas: await listarEscolas() });
    return true;
  }

  // 4. Módulo Regulação & PJ-e: Listar Demandas Judiciais
  if (req.method === 'GET' && path === '/api/v1/gestao/judicial') {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const demandas = await listarDemandasJudiciais();
    json(req, res, 200, { ok: true, demandas });
    return true;
  }

  // 4.1. Cadastrar Demanda Judicial (Mandado de Segurança / Liminar)
  if (req.method === 'POST' && path === '/api/v1/gestao/judicial') {
    exigirRateLimit(req, 'gestao-mutacao', 30, 60_000);
    const sessao = exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const bodyRaw = await lerJsonSeguro<Record<string, unknown>>(req);
    const payload = validarPayloadDemandaJudicial(bodyRaw);
    const demanda = await cadastrarDemandaJudicial({
      ...payload,
      operadorUsuario: sessao.usuario,
    });

    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE();
    json(req, res, 201, { ok: true, demanda });
    return true;
  }

  // 4.2. Alocar Vaga Judicial com Prioridade Absoluta
  const matchAlocarJudicial = path.match(/^\/api\/v1\/gestao\/judicial\/([^/]+)\/alocar$/);
  if (req.method === 'POST' && matchAlocarJudicial) {
    exigirRateLimit(req, 'gestao-mutacao', 30, 60_000);
    const sessao = exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const demandaId = decodeURIComponent(matchAlocarJudicial[1]).trim();
    const body = await lerJsonSeguro<{ justificativa?: unknown }>(req);
    const justificativa =
      typeof body.justificativa === 'string' && body.justificativa.trim().length > 3
        ? body.justificativa.trim()
        : 'Alocação prioritária em cumprimento à decisão judicial liminar';

    const resultado = await alocarVagaJudicial({
      demandaId,
      operadorUsuario: sessao.usuario,
      justificativa,
    });

    invalidarSnapshotPublico();
    if (resultado.evento) {
      await transmitirAtualizacaoSSE(resultado.evento);
    } else {
      await transmitirAtualizacaoSSE();
    }

    json(req, res, 200, { ok: true, ...resultado });
    return true;
  }

  // 4.3. Emitir Certidão Eletrônica de Cumprimento de Liminar (PJ-e)
  const matchCertidaoJudicial = path.match(/^\/api\/v1\/gestao\/judicial\/([^/]+)\/certidao$/);
  if (req.method === 'GET' && matchCertidaoJudicial) {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const demandaId = decodeURIComponent(matchCertidaoJudicial[1]).trim();
    const certidao = await gerarCertidaoCumprimentoJudicial(demandaId);
    json(req, res, 200, { ok: true, certidao });
    return true;
  }

  // 5. Trilha de Auditoria Imutável (TCE-PB / MP-PB)
  if (req.method === 'GET' && path === '/api/v1/gestao/auditoria') {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const limiteNum = Number(url.searchParams.get('limite') ?? 100);
    const limite = Number.isFinite(limiteNum) ? Math.max(10, Math.min(500, Math.round(limiteNum))) : 100;
    const logs = await listarLogsAuditoria(limite);
    json(req, res, 200, { ok: true, total: logs.length, logs });
    return true;
  }

  // 6. Rotina de Expiração Automática Manual (SEDUC)
  if (req.method === 'POST' && path === '/api/v1/gestao/rotinas/expiracao') {
    exigirRateLimit(req, 'gestao-mutacao', 30, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const resultado = await processarExpiracaoProtocolosVencidos();
    if (resultado.expirados.length > 0) {
      invalidarSnapshotPublico();
      for (const ev of resultado.eventos) {
        await transmitirAtualizacaoSSE(ev);
      }
    }
    json(req, res, 200, { ok: true, ...resultado });
    return true;
  }

  // 7. Rotina de Processamento de Notificações WhatsApp Manual (SEDUC)
  if (req.method === 'POST' && path === '/api/v1/gestao/rotinas/notificacoes') {
    exigirRateLimit(req, 'gestao-mutacao', 30, 60_000);
    exigirSessaoGestao(req, url, { perfil: 'secretaria' });
    const resultado = await processarNotificacoesWhatsApp();
    json(req, res, 200, { ok: true, ...resultado });
    return true;
  }

  return false;
};

