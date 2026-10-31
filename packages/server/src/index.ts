import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { LoginGestaoRequestDTO } from '../../shared/src/index.ts';
import {
  autenticarCredenciaisGestao,
  exigirSessaoGestao,
  extrairSessaoRequisicao,
  verificarTokenCancelamentoAlerta,
} from './infra/auth.ts';
import { db } from './infra/db.ts';
import {
  aplicarHeadersSeguranca,
  exigirRateLimit,
  HttpError,
  lerJsonSeguro,
} from './infra/security.ts';
import { registrarClienteSSE, totalClientesSSE, transmitirAtualizacaoSSE } from './infra/sse.ts';
import {
  ehStatusProtocoloValido,
  validarPayloadAlerta,
  validarPayloadOferta,
  validarPayloadProtocolo,
} from './infra/validation.ts';
import {
  criarAlerta,
  garantirSeedAlertasPatos,
  listarAlertas,
  removerAlerta,
} from './modules/alertas/alertas.module.ts';
import {
  garantirSeedCatalogoPatos,
  obterCatalogoMunicipio,
} from './modules/catalogo/catalogo.module.ts';
import {
  atualizarStatusProtocolo,
  criarProtocoloVisita,
  garantirSeedProtocolosPatos,
  listarProtocolos,
  obterProtocoloPorCodigo,
} from './modules/protocolos/protocolos.module.ts';
import { obterPainelSecretariaPatos } from './modules/secretaria/secretaria.module.ts';
import {
  atualizarOfertaUnidade,
  confirmarUnidade,
  listarEscolas,
  listarHistorico,
  popularUnidadesPatos,
} from './modules/unidades/unidades.module.ts';

const PORT = Number(process.env.PORT ?? 3333);

// Inicializa o banco (PostgreSQL ou SQLite WAL) de Patos - PB com todos os módulos do Monolito Modular
async function inicializarBancoPatos(forcarReset = false): Promise<void> {
  await db.inicializarSchema();
  await garantirSeedCatalogoPatos();
  await popularUnidadesPatos(forcarReset);
  await garantirSeedAlertasPatos(forcarReset);
  await garantirSeedProtocolosPatos(forcarReset);
}

await inicializarBancoPatos(false);

function json(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
  aplicarHeadersSeguranca(req, res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

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

async function sintetizarVozNeuralPtBr(texto: string): Promise<Buffer> {
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

const server = createServer(async (req, res) => {
  aplicarHeadersSeguranca(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  try {
    // 0. Healthcheck e metadados da arquitetura Monolito Modular
    if (req.method === 'GET' && path === '/api/v1/health') {
      exigirRateLimit(req, 'health', 120, 60_000);
      return json(req, res, 200, {
        ok: true,
        arquitetura: 'monorepo-monolito-modular',
        municipio: 'Patos - PB',
        ibge: '2510808',
        banco: db.tipoBanco,
        modulos: ['auth', 'catalogo', 'unidades', 'alertas', 'protocolos', 'secretaria'],
        sseClientes: totalClientesSSE(),
        agora: Date.now(),
      });
    }

    // 0.1. Módulo de Autenticação e Sessão de Gestão (SEDUC / Unidades Escolares)
    if (req.method === 'POST' && path === '/api/v1/auth/login') {
      exigirRateLimit(req, 'auth-login', 12, 60_000);
      const body = await lerJsonSeguro<Partial<LoginGestaoRequestDTO>>(req);
      const sessao = await autenticarCredenciaisGestao(body);
      return json(req, res, 200, { ok: true, sessao });
    }

    if (req.method === 'GET' && path === '/api/v1/auth/me') {
      exigirRateLimit(req, 'auth-me', 60, 60_000);
      const sessao = exigirSessaoGestao(req, url);
      return json(req, res, 200, { ok: true, sessao });
    }

    if (req.method === 'POST' && path === '/api/v1/auth/logout') {
      return json(req, res, 200, { ok: true });
    }

    // 1. Stream Server-Sent Events (Tempo Real unificado com isolamento público vs. gestão)
    if (req.method === 'GET' && path === '/api/v1/stream') {
      exigirRateLimit(req, 'sse', 30, 60_000);
      const sessao = extrairSessaoRequisicao(req, url);
      await registrarClienteSSE(req, res, sessao);
      return;
    }

    // 2. Módulo Catálogo Municipal (Patos-PB: bairros, centro e documentos)
    if (req.method === 'GET' && path === '/api/v1/catalogo') {
      exigirRateLimit(req, 'leitura', 120, 60_000);
      const cat = await obterCatalogoMunicipio();
      return json(req, res, 200, cat);
    }

    // 2.1. Síntese de Voz Neural em Português Brasileiro (acessibilidade cidadã)
    if (req.method === 'GET' && path === '/api/v1/tts') {
      exigirRateLimit(req, 'tts', 30, 60_000);
      const q = (url.searchParams.get('q') ?? '').trim();
      if (!q) return json(req, res, 400, { erro: 'Informe o parâmetro q.' });
      if (q.length > 900) {
        return json(req, res, 400, { erro: 'Texto excede o limite para síntese de voz.' });
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
        return;
      } catch {
        return json(req, res, 503, { erro: 'Serviço de voz neural temporariamente indisponível.' });
      }
    }

    // 3. Módulo Unidades Escolares e Vagas (Snapshot Público + Hidratação autenticada de Gestão)
    if (req.method === 'GET' && path === '/api/v1/escolas') {
      exigirRateLimit(req, 'leitura', 120, 60_000);
      const sessao = extrairSessaoRequisicao(req, url);
      const [catalogo, escolas, historico, protocolos, secretaria] = await Promise.all([
        obterCatalogoMunicipio(),
        listarEscolas(),
        listarHistorico(40),
        sessao ? listarProtocolos() : Promise.resolve(undefined),
        sessao ? obterPainelSecretariaPatos() : Promise.resolve(undefined),
      ]);

      return json(req, res, 200, {
        catalogo,
        escolas,
        historico,
        ...(protocolos ? { protocolos } : {}),
        ...(secretaria ? { secretaria } : {}),
      });
    }

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

      if (!escola) return json(req, res, 404, { erro: 'Unidade ou oferta não encontrada em Patos-PB.' });

      await transmitirAtualizacaoSSE(evento ?? undefined);
      return json(req, res, 200, { ok: true, escola, evento });
    }

    const matchConfirmar = path.match(/^\/api\/v1\/gestao\/escolas\/([^/]+)\/confirmar$/);
    if (req.method === 'POST' && matchConfirmar) {
      exigirRateLimit(req, 'gestao-mutacao', 30, 60_000);
      const escolaId = decodeURIComponent(matchConfirmar[1]).trim();
      exigirSessaoGestao(req, url, { escolaId });
      const ok = await confirmarUnidade(escolaId);
      if (!ok) return json(req, res, 404, { erro: 'Unidade não encontrada.' });
      await transmitirAtualizacaoSSE();
      return json(req, res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/api/v1/gestao/reset') {
      exigirRateLimit(req, 'gestao-reset', 5, 60_000);
      exigirSessaoGestao(req, url, { perfil: 'secretaria' });
      await inicializarBancoPatos(true);
      await transmitirAtualizacaoSSE();
      return json(req, res, 200, { ok: true, escolas: await listarEscolas() });
    }

    // 4. Módulo Alertas (LGPD)
    if (req.method === 'GET' && path === '/api/v1/alertas') {
      exigirRateLimit(req, 'leitura', 60, 60_000);
      exigirSessaoGestao(req, url);
      return json(req, res, 200, { alertas: await listarAlertas() });
    }

    if (req.method === 'POST' && path === '/api/v1/alertas') {
      exigirRateLimit(req, 'criar-alerta', 15, 60_000);
      const bodyRaw = await lerJsonSeguro<Record<string, unknown>>(req);
      const payload = validarPayloadAlerta(bodyRaw);
      const alerta = await criarAlerta(payload);
      await transmitirAtualizacaoSSE();
      return json(req, res, 201, { ok: true, alerta });
    }

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
        return json(req, res, 403, {
          erro: 'Token de cancelamento inválido ou ausente para este alerta.',
        });
      }

      await removerAlerta(id);
      await transmitirAtualizacaoSSE();
      return json(req, res, 200, { ok: true });
    }

    // 5. Módulo Protocolos de Pré-Agendamento / Atendimento Presencial (QR Code)
    const matchGetProtocoloCodigo = path.match(/^\/api\/v1\/protocolos\/([^/]+)$/);
    if (req.method === 'GET' && matchGetProtocoloCodigo) {
      exigirRateLimit(req, 'consulta-protocolo', 60, 60_000);
      const codigo = decodeURIComponent(matchGetProtocoloCodigo[1]).trim();
      const protocolo = await obterProtocoloPorCodigo(codigo);
      if (!protocolo) {
        return json(req, res, 404, { erro: 'Protocolo não encontrado na base de Patos - PB.' });
      }
      return json(req, res, 200, { ok: true, protocolo });
    }

    if (req.method === 'GET' && path === '/api/v1/protocolos') {
      exigirRateLimit(req, 'leitura', 60, 60_000);
      exigirSessaoGestao(req, url);
      const escolaId = url.searchParams.get('escolaId') ?? undefined;
      return json(req, res, 200, { protocolos: await listarProtocolos(escolaId) });
    }

    if (req.method === 'POST' && path === '/api/v1/protocolos') {
      exigirRateLimit(req, 'criar-protocolo', 15, 60_000);
      const bodyRaw = await lerJsonSeguro<Record<string, unknown>>(req);
      const payload = validarPayloadProtocolo(bodyRaw);
      const protocolo = await criarProtocoloVisita(payload);

      if (!protocolo) return json(req, res, 404, { erro: 'Unidade escolar não encontrada.' });

      await transmitirAtualizacaoSSE();
      return json(req, res, 201, { ok: true, protocolo });
    }

    const matchStatusProt = path.match(/^\/api\/v1\/gestao\/protocolos\/([^/]+)\/status$/);
    if (req.method === 'PATCH' && matchStatusProt) {
      exigirRateLimit(req, 'gestao-mutacao', 40, 60_000);
      const codigo = decodeURIComponent(matchStatusProt[1]).trim();
      const sessao = exigirSessaoGestao(req, url);

      const existente = await obterProtocoloPorCodigo(codigo);
      if (!existente) return json(req, res, 404, { erro: 'Protocolo não encontrado.' });

      // Garante que gestor de unidade só dê baixa em protocolos da própria escola (SEDUC pode em todas)
      if (sessao.perfil === 'unidade' && sessao.escolaId && sessao.escolaId !== existente.escolaId) {
        return json(req, res, 403, {
          erro: `Este protocolo pertence à unidade "${existente.escolaNome}". Acesse com o perfil da respectiva unidade ou da Secretaria de Educação.`,
        });
      }

      const body = await lerJsonSeguro<{ status?: unknown }>(req);
      if (!ehStatusProtocoloValido(body.status)) {
        return json(req, res, 400, { erro: 'Status de protocolo inválido.' });
      }

      const { protocolo, evento } = await atualizarStatusProtocolo(codigo, body.status);
      if (!protocolo) return json(req, res, 404, { erro: 'Protocolo não encontrado.' });

      await transmitirAtualizacaoSSE(evento ?? undefined);
      return json(req, res, 200, { ok: true, protocolo, evento });
    }

    // 6. Módulo Painel Macro da Secretaria Municipal de Educação de Patos-PB
    if (req.method === 'GET' && path === '/api/v1/secretaria/painel') {
      exigirRateLimit(req, 'leitura', 60, 60_000);
      exigirSessaoGestao(req, url);
      return json(req, res, 200, await obterPainelSecretariaPatos());
    }

    return json(req, res, 404, { erro: 'Rota não encontrada na API.' });
  } catch (err) {
    if (err instanceof HttpError) {
      return json(req, res, err.status, { erro: err.message });
    }
    console.error('[API Error]', err);
    return json(req, res, 500, { erro: 'Erro interno no servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(
    `[Matrícula Aberta · Patos-PB] Monolito Modular ativo em http://localhost:${PORT} (${db.tipoBanco.toUpperCase()} + SSE + Auth RBAC)`,
  );
});

async function encerrarServidor(): Promise<void> {
  server.close(async () => {
    await db.fecharBanco();
    process.exit(0);
  });
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);
