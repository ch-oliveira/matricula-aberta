import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LoginGestaoRequestDTO } from '../../../shared/src/index.ts';
import { autenticarCredenciaisGestao, exigirSessaoGestao } from '../infra/auth.ts';
import { exigirRateLimit, lerJsonSeguro } from '../infra/security.ts';
import { transmitirAtualizacaoSSE } from '../infra/sse.ts';
import { ehStatusProtocoloValido, validarPayloadOferta } from '../infra/validation.ts';
import {
  atualizarStatusProtocolo,
  listarProtocolos,
  obterProtocoloPorCodigo,
} from '../modules/protocolos/protocolos.module.ts';
import { atualizarOfertaUnidade, confirmarUnidade } from '../modules/unidades/unidades.module.ts';
import { invalidarSnapshotPublico, json, type RouteHandler } from './shared.ts';

export const handleUnidadeRoutes: RouteHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
): Promise<boolean> => {
  // 1. Módulo de Autenticação e Sessão de Gestão (SEDUC / Unidades Escolares)
  if (req.method === 'POST' && path === '/api/v1/auth/login') {
    exigirRateLimit(req, 'auth-login', 12, 60_000);
    const body = await lerJsonSeguro<Partial<LoginGestaoRequestDTO>>(req);
    const sessao = await autenticarCredenciaisGestao(body);
    json(req, res, 200, { ok: true, sessao });
    return true;
  }

  if (req.method === 'GET' && path === '/api/v1/auth/me') {
    exigirRateLimit(req, 'auth-me', 60, 60_000);
    const sessao = exigirSessaoGestao(req, url);
    json(req, res, 200, { ok: true, sessao });
    return true;
  }

  if (req.method === 'POST' && path === '/api/v1/auth/logout') {
    json(req, res, 200, { ok: true });
    return true;
  }

  // 2. Atualizar Oferta de Turma da Unidade Escolar
  const matchOferta = path.match(/^\/api\/v1\/gestao\/escolas\/([^/]+)\/ofertas$/);
  if (req.method === 'PATCH' && matchOferta) {
    exigirRateLimit(req, 'gestao-mutacao', 60, 60_000);
    const escolaId = decodeURIComponent(matchOferta[1]).trim();
    const sessao = exigirSessaoGestao(req, url, { escolaId });
    const bodyRaw = await lerJsonSeguro<Record<string, unknown>>(req);
    const payload = validarPayloadOferta(bodyRaw);

    const { escola, evento } = await atualizarOfertaUnidade({
      escolaId,
      etapa: payload.etapa,
      periodo: payload.periodo,
      vagas: payload.vagas,
      fila: payload.fila,
      origem: sessao.perfil === 'secretaria' ? 'secretaria' : payload.origem,
    });

    if (!escola) {
      json(req, res, 404, { erro: 'Unidade ou oferta não encontrada em Patos-PB.' });
      return true;
    }

    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE(evento ?? undefined);
    json(req, res, 200, { ok: true, escola, evento });
    return true;
  }

  // 3. Confirmar Quadro de Vagas da Unidade
  const matchConfirmar = path.match(/^\/api\/v1\/gestao\/escolas\/([^/]+)\/confirmar$/);
  if (req.method === 'POST' && matchConfirmar) {
    exigirRateLimit(req, 'gestao-mutacao', 30, 60_000);
    const escolaId = decodeURIComponent(matchConfirmar[1]).trim();
    exigirSessaoGestao(req, url, { escolaId });
    const ok = await confirmarUnidade(escolaId);
    if (!ok) {
      json(req, res, 404, { erro: 'Unidade não encontrada.' });
      return true;
    }
    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE();
    json(req, res, 200, { ok: true });
    return true;
  }

  // 4. Listar Protocolos da Escola com Isolamento de Escopo RBAC
  if (req.method === 'GET' && path === '/api/v1/protocolos') {
    exigirRateLimit(req, 'leitura', 60, 60_000);
    const sessao = exigirSessaoGestao(req, url);
    const escolaId =
      sessao.perfil === 'unidade'
        ? sessao.escolaId
        : (url.searchParams.get('escolaId') ?? undefined);
    json(req, res, 200, { protocolos: await listarProtocolos(escolaId) });
    return true;
  }

  // 5. Baixa / Mudança de Status do Protocolo Presencial
  const matchStatusProt = path.match(/^\/api\/v1\/gestao\/protocolos\/([^/]+)\/status$/);
  if (req.method === 'PATCH' && matchStatusProt) {
    exigirRateLimit(req, 'gestao-mutacao', 40, 60_000);
    const codigo = decodeURIComponent(matchStatusProt[1]).trim();
    const sessao = exigirSessaoGestao(req, url);

    const existente = await obterProtocoloPorCodigo(codigo);
    if (!existente) {
      json(req, res, 404, { erro: 'Protocolo não encontrado.' });
      return true;
    }

    // Garante que gestor de unidade só dê baixa em protocolos da própria escola (SEDUC pode em todas)
    if (sessao.perfil === 'unidade' && sessao.escolaId && sessao.escolaId !== existente.escolaId) {
      json(req, res, 403, {
        erro: `Este protocolo pertence à unidade "${existente.escolaNome}". Acesse com o perfil da respectiva unidade ou da Secretaria de Educação.`,
      });
      return true;
    }

    const body = await lerJsonSeguro<{ status?: unknown }>(req);
    if (!ehStatusProtocoloValido(body.status)) {
      json(req, res, 400, { erro: 'Status de protocolo inválido.' });
      return true;
    }

    const { protocolo, evento } = await atualizarStatusProtocolo(codigo, body.status);
    if (!protocolo) {
      json(req, res, 404, { erro: 'Protocolo não encontrado.' });
      return true;
    }

    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE(evento ?? undefined);
    json(req, res, 200, { ok: true, protocolo, evento });
    return true;
  }

  return false;
};
