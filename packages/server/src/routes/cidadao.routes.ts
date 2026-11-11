import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  extrairSessaoRequisicao,
  verificarTokenCancelamentoAlerta,
  verificarTokenCancelamentoProtocolo,
} from '../infra/auth.ts';
import { db } from '../infra/db.ts';
import { aplicarHeadersSeguranca, exigirRateLimit, lerJsonSeguro } from '../infra/security.ts';
import { registrarClienteSSE, totalClientesSSE, transmitirAtualizacaoSSE } from '../infra/sse.ts';
import {
  validarPayloadAlerta,
  validarPayloadProtocolo,
} from '../infra/validation.ts';
import { criarAlerta, removerAlerta } from '../modules/alertas/alertas.module.ts';
import { obterCatalogoMunicipio } from '../modules/catalogo/catalogo.module.ts';
import {
  atualizarStatusProtocolo,
  cancelarProtocoloPorCidadao,
  criarProtocoloVisita,
  listarProtocolos,
  obterProtocoloPorCodigo,
} from '../modules/protocolos/protocolos.module.ts';
import { obterFilaPublicaAuditavel } from '../modules/regulacao/regulacao.module.ts';
import { obterPainelSecretariaPatos } from '../modules/secretaria/secretaria.module.ts';
import { listarEscolas, listarHistorico } from '../modules/unidades/unidades.module.ts';
import {
  definirCacheSnapshotPublico,
  invalidarSnapshotPublico,
  json,
  obterCacheSnapshotPublico,
  sintetizarVozNeuralPtBr,
  TTL_SNAPSHOT_PUBLICO_MS,
  type RouteHandler,
} from './shared.ts';

export const handleCidadaoRoutes: RouteHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
): Promise<boolean> => {
  // 0. Healthcheck e metadados da arquitetura Monolito Modular
  if (req.method === 'GET' && (path === '/api/v1/health' || path === '/health' || path === '/')) {
    exigirRateLimit(req, 'health', 120, 60_000);
    json(req, res, 200, {
      ok: true,
      arquitetura: 'monorepo-monolito-modular',
      municipio: 'Patos - PB',
      ibge: '2510808',
      banco: db.tipoBanco,
      modulos: ['auth', 'catalogo', 'unidades', 'alertas', 'protocolos', 'secretaria'],
      sseClientes: totalClientesSSE(),
      agora: Date.now(),
    });
    return true;
  }

  // 1. Stream Server-Sent Events (Tempo Real unificado com isolamento público vs. gestão)
  if (req.method === 'GET' && path === '/api/v1/stream') {
    exigirRateLimit(req, 'sse', 30, 60_000);
    const sessao = extrairSessaoRequisicao(req, url);
    await registrarClienteSSE(req, res, sessao);
    return true;
  }

  // 2. Módulo Catálogo Municipal (Patos-PB: bairros, centro e documentos)
  if (req.method === 'GET' && path === '/api/v1/catalogo') {
    exigirRateLimit(req, 'leitura', 120, 60_000);
    const cat = await obterCatalogoMunicipio();
    json(req, res, 200, cat);
    return true;
  }

  // 2.1. Síntese de Voz Neural em Português Brasileiro (acessibilidade cidadã)
  if (req.method === 'GET' && path === '/api/v1/tts') {
    exigirRateLimit(req, 'tts', 30, 60_000);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (!q) {
      json(req, res, 400, { erro: 'Informe o parâmetro q.' });
      return true;
    }
    if (q.length > 900) {
      json(req, res, 400, { erro: 'Texto excede o limite para síntese de voz.' });
      return true;
    }
    try {
      const mp3 = await sintetizarVozNeuralPtBr(q);
      aplicarHeadersSeguranca(req, res);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(mp3.length),
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(mp3);
      return true;
    } catch {
      json(req, res, 503, { erro: 'Serviço de voz neural temporariamente indisponível.' });
      return true;
    }
  }

  // 3. Módulo Unidades Escolares e Vagas (Snapshot Público + Hidratação autenticada de Gestão)
  if (req.method === 'GET' && path === '/api/v1/escolas') {
    exigirRateLimit(req, 'leitura', 120, 60_000);
    const sessao = extrairSessaoRequisicao(req, url);

    // Cidadão comum (sem autenticação de gestão): rota mais crítica de leitura sob alta concorrência
    if (!sessao) {
      const agora = Date.now();
      const cache = obterCacheSnapshotPublico();
      if (cache && cache.expiraEm > agora) {
        const etagCliente = req.headers['if-none-match'];
        if (etagCliente && etagCliente === cache.etag) {
          aplicarHeadersSeguranca(req, res);
          res.writeHead(304, {
            ETag: cache.etag,
            'Cache-Control': 'public, max-age=3, stale-while-revalidate=10',
          });
          res.end();
          return true;
        }

        aplicarHeadersSeguranca(req, res);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3, stale-while-revalidate=10',
          ETag: cache.etag,
        });
        res.end(cache.jsonString);
        return true;
      }

      const [catalogo, escolas, historico] = await Promise.all([
        obterCatalogoMunicipio(),
        listarEscolas(),
        listarHistorico(40),
      ]);

      const bodyObj = { catalogo, escolas, historico };
      const jsonString = JSON.stringify(bodyObj);
      const etag = `"${createHash('md5').update(jsonString).digest('hex').slice(0, 16)}"`;

      definirCacheSnapshotPublico({
        jsonString,
        etag,
        expiraEm: agora + TTL_SNAPSHOT_PUBLICO_MS,
      });

      aplicarHeadersSeguranca(req, res);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3, stale-while-revalidate=10',
        ETag: etag,
      });
      res.end(jsonString);
      return true;
    }

    // Usuário autenticado da Gestão (SEDUC / Unidade): hidratação completa com isolamento de escopo
    const [catalogo, escolas, historico, protocolos, secretaria] = await Promise.all([
      obterCatalogoMunicipio(),
      listarEscolas(),
      listarHistorico(40),
      listarProtocolos(sessao.perfil === 'unidade' ? sessao.escolaId : undefined),
      sessao.perfil === 'secretaria' ? obterPainelSecretariaPatos() : Promise.resolve(undefined),
    ]);

    json(req, res, 200, {
      catalogo,
      escolas,
      historico,
      protocolos,
      ...(secretaria ? { secretaria } : {}),
    });
    return true;
  }

  // 4. Criação de Alerta pelo cidadão
  if (req.method === 'POST' && path === '/api/v1/alertas') {
    exigirRateLimit(req, 'criar-alerta', 15, 60_000);
    const bodyRaw = await lerJsonSeguro<Record<string, unknown>>(req);
    const payload = validarPayloadAlerta(bodyRaw);
    const alerta = await criarAlerta(payload);
    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE();
    json(req, res, 201, { ok: true, alerta });
    return true;
  }

  // 4.1. Exclusão de Alerta (Direito ao esquecimento LGPD ou Gestão)
  const matchDelAlerta = path.match(/^\/api\/v1\/alertas\/([^/]+)$/);
  if (req.method === 'DELETE' && matchDelAlerta) {
    exigirRateLimit(req, 'del-alerta', 20, 60_000);
    const id = decodeURIComponent(matchDelAlerta[1]).trim();
    const tokenHeader =
      typeof req.headers['x-alert-token'] === 'string'
        ? req.headers['x-alert-token']
        : url.searchParams.get('token');

    const autorizadoPorToken = verificarTokenCancelamentoAlerta(id, tokenHeader);
    const sessaoGestao = extrairSessaoRequisicao(req, url);

    if (!autorizadoPorToken && !sessaoGestao) {
      json(req, res, 403, {
        erro: 'Token de cancelamento inválido ou ausente para este alerta.',
      });
      return true;
    }

    await removerAlerta(id);
    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE();
    json(req, res, 200, { ok: true });
    return true;
  }

  // 5. Consulta Pública de Protocolo por Código
  const matchGetProtocoloCodigo = path.match(/^\/api\/v1\/protocolos\/([^/]+)$/);
  if (req.method === 'GET' && matchGetProtocoloCodigo) {
    exigirRateLimit(req, 'consulta-protocolo', 60, 60_000);
    const codigo = decodeURIComponent(matchGetProtocoloCodigo[1]).trim();
    const protocolo = await obterProtocoloPorCodigo(codigo);
    if (!protocolo) {
      json(req, res, 404, { erro: 'Protocolo não encontrado na base de Patos - PB.' });
      return true;
    }
    json(req, res, 200, { ok: true, protocolo });
    return true;
  }

  // 5.1. Emissão de Protocolo de Visita pelo cidadão
  if (req.method === 'POST' && path === '/api/v1/protocolos') {
    exigirRateLimit(req, 'criar-protocolo', 15, 60_000);
    const bodyRaw = await lerJsonSeguro<Record<string, unknown>>(req);
    const payload = validarPayloadProtocolo(bodyRaw);
    const { protocolo, evento } = await criarProtocoloVisita(payload);

    if (!protocolo) {
      json(req, res, 404, { erro: 'Unidade escolar não encontrada.' });
      return true;
    }

    invalidarSnapshotPublico();
    await transmitirAtualizacaoSSE(evento ?? undefined);
    json(req, res, 201, { ok: true, protocolo, evento });
    return true;
  }

  // 5.2. Cancelamento de protocolo pelo próprio cidadão com liberação imediata da vaga
  const matchCancelProt =
    path.match(/^\/api\/v1\/protocolos\/([^/]+)\/cancelar$/) ||
    (req.method === 'DELETE' && path.match(/^\/api\/v1\/protocolos\/([^/]+)$/));
  if (matchCancelProt && (req.method === 'POST' || req.method === 'DELETE')) {
    exigirRateLimit(req, 'cancelar-protocolo', 20, 60_000);
    const codigo = decodeURIComponent(matchCancelProt[1]).trim();
    const tokenHeader =
      typeof req.headers['x-protocolo-token'] === 'string'
        ? req.headers['x-protocolo-token']
        : url.searchParams.get('token');

    const sessaoGestao = extrairSessaoRequisicao(req, url);
    let resCancel: { protocolo: any; evento: any };

    if (tokenHeader && verificarTokenCancelamentoProtocolo(codigo, tokenHeader)) {
      resCancel = await cancelarProtocoloPorCidadao(codigo, tokenHeader);
    } else if (sessaoGestao) {
      resCancel = await atualizarStatusProtocolo(codigo, 'cancelado', 'cancelado_gestor');
    } else {
      json(req, res, 403, {
        erro: 'Token de cancelamento do protocolo inválido ou ausente.',
      });
      return true;
    }

    if (!resCancel.protocolo) {
      json(req, res, 404, { erro: 'Protocolo não encontrado.' });
      return true;
    }

    invalidarSnapshotPublico();
    if (resCancel.evento) {
      await transmitirAtualizacaoSSE(resCancel.evento);
    }
    json(req, res, 200, { ok: true, protocolo: resCancel.protocolo });
    return true;
  }

  // 6. Fila Pública Auditável (Acesso Público com Proteção LGPD estrita)
  if (req.method === 'GET' && path === '/api/v1/regulacao/fila-publica') {
    exigirRateLimit(req, 'leitura', 120, 60_000);
    const etapaRaw = url.searchParams.get('etapa');
    const escolaId = url.searchParams.get('escolaId') || undefined;
    const busca = url.searchParams.get('busca') || undefined;
    const etapa =
      etapaRaw && ['bercario', 'maternal', 'pre', 'fund1', 'fund2'].includes(etapaRaw)
        ? (etapaRaw as any)
        : undefined;

    const fila = await obterFilaPublicaAuditavel({ etapa, escolaId, busca });
    json(req, res, 200, {
      ok: true,
      municipio: 'Patos - PB',
      total: fila.length,
      geradoEm: Date.now(),
      fila,
    });
    return true;
  }

  return false;
};
