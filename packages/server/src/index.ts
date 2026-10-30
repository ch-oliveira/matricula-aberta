import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type {
  Canal,
  EtapaId,
  EventoVaga,
  Periodo,
  StatusProtocolo,
  TurnoVisita,
} from '../../../shared/src/index.ts';
import { registrarClienteSSE, totalClientesSSE, transmitirAtualizacaoSSE } from './infra/sse.ts';
import {
  criarAlerta,
  garantirSeedAlertasPatos,
  listarAlertas,
  removerAlerta,
} from './modules/alertas/alertas.module.ts';
import { garantirSeedCatalogoPatos, obterCatalogoMunicipio } from './modules/catalogo/catalogo.module.ts';
import {
  atualizarStatusProtocolo,
  criarProtocoloVisita,
  garantirSeedProtocolosPatos,
  listarProtocolos,
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

// Inicializa o banco SQLite de Patos - PB com todos os módulos do Monolito Modular
function inicializarBancoPatos(forcarReset = false) {
  garantirSeedCatalogoPatos();
  popularUnidadesPatos(forcarReset);
  garantirSeedAlertasPatos(forcarReset);
  garantirSeedProtocolosPatos(forcarReset);
}

inicializarBancoPatos(false);

function cors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
}

function json(res: ServerResponse, status: number, body: unknown) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function lerJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

const server = createServer(async (req, res) => {
  cors(res);
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
      return json(res, 200, {
        ok: true,
        arquitetura: 'monorepo-monolito-modular',
        municipio: 'Patos - PB',
        ibge: '2510808',
        modulos: ['catalogo', 'unidades', 'alertas', 'protocolos', 'secretaria'],
        sseClientes: totalClientesSSE(),
        agora: Date.now(),
      });
    }

    // 1. Stream Server-Sent Events (Tempo Real unificado)
    if (req.method === 'GET' && path === '/api/v1/stream') {
      registrarClienteSSE(res);
      return;
    }

    // 2. Módulo Catálogo Municipal (Patos-PB: bairros, centro e documentos)
    if (req.method === 'GET' && path === '/api/v1/catalogo') {
      return json(res, 200, obterCatalogoMunicipio());
    }

    // 3. Módulo Unidades Escolares e Vagas
    if (req.method === 'GET' && path === '/api/v1/escolas') {
      return json(res, 200, {
        catalogo: obterCatalogoMunicipio(),
        escolas: listarEscolas(),
        historico: listarHistorico(40),
        protocolos: listarProtocolos(),
        secretaria: obterPainelSecretariaPatos(),
      });
    }

    const matchOferta = path.match(/^\/api\/v1\/gestao\/escolas\/([^/]+)\/ofertas$/);
    if (req.method === 'PATCH' && matchOferta) {
      const escolaId = decodeURIComponent(matchOferta[1]);
      const body = await lerJson<{
        etapa: EtapaId;
        periodo: Periodo;
        vagas?: number;
        fila?: number;
        origem?: EventoVaga['origem'];
      }>(req);

      if (!body.etapa || !body.periodo) {
        return json(res, 400, { erro: 'Informe etapa e periodo.' });
      }

      const { escola, evento } = atualizarOfertaUnidade({
        escolaId,
        etapa: body.etapa,
        periodo: body.periodo,
        vagas: body.vagas,
        fila: body.fila,
        origem: body.origem ?? 'escola',
      });

      if (!escola) return json(res, 404, { erro: 'Unidade ou oferta não encontrada em Patos-PB.' });

      transmitirAtualizacaoSSE(evento ?? undefined);
      return json(res, 200, { ok: true, escola, evento });
    }

    const matchConfirmar = path.match(/^\/api\/v1\/gestao\/escolas\/([^/]+)\/confirmar$/);
    if (req.method === 'POST' && matchConfirmar) {
      const escolaId = decodeURIComponent(matchConfirmar[1]);
      const ok = confirmarUnidade(escolaId);
      if (!ok) return json(res, 404, { erro: 'Unidade não encontrada.' });
      transmitirAtualizacaoSSE();
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/api/v1/gestao/reset') {
      inicializarBancoPatos(true);
      transmitirAtualizacaoSSE();
      return json(res, 200, { ok: true, escolas: listarEscolas() });
    }

    // 4. Módulo Alertas (LGPD)
    if (req.method === 'GET' && path === '/api/v1/alertas') {
      return json(res, 200, { alertas: listarAlertas() });
    }

    if (req.method === 'POST' && path === '/api/v1/alertas') {
      const body = await lerJson<{
        canal: Canal;
        telefone?: string;
        etapa: EtapaId;
        periodo: Periodo | 'tanto-faz';
        local: { lat: number; lng: number; rotulo: string };
        raioKm: number;
        escolaId?: string;
        escolaNome?: string;
      }>(req);

      if (!body.canal || !body.etapa || !body.local) {
        return json(res, 400, { erro: 'Dados incompletos para criar alerta.' });
      }

      const alerta = criarAlerta(body);
      transmitirAtualizacaoSSE();
      return json(res, 201, { ok: true, alerta });
    }

    const matchDelAlerta = path.match(/^\/api\/v1\/alertas\/([^/]+)$/);
    if (req.method === 'DELETE' && matchDelAlerta) {
      const id = decodeURIComponent(matchDelAlerta[1]);
      removerAlerta(id);
      transmitirAtualizacaoSSE();
      return json(res, 200, { ok: true });
    }

    // 5. Módulo Protocolos de Pré-Agendamento / Atendimento Presencial (QR Code)
    if (req.method === 'GET' && path === '/api/v1/protocolos') {
      const escolaId = url.searchParams.get('escolaId') ?? undefined;
      return json(res, 200, { protocolos: listarProtocolos(escolaId) });
    }

    if (req.method === 'POST' && path === '/api/v1/protocolos') {
      const body = await lerJson<{
        escolaId: string;
        etapa: EtapaId;
        turma: string;
        periodo: Periodo;
        responsavel: string;
        telefone?: string;
        nascimento?: string;
        turnoVisita: TurnoVisita;
        dataVisita: string;
        documentosMarcados: string[];
        totalObrigatorios: number;
      }>(req);

      if (!body.escolaId || !body.etapa || !body.responsavel) {
        return json(res, 400, { erro: 'Informe a escola, a etapa e o nome do responsável.' });
      }

      const protocolo = criarProtocoloVisita({
        escolaId: body.escolaId,
        etapa: body.etapa,
        turma: body.turma || body.etapa,
        periodo: body.periodo || 'integral',
        responsavel: body.responsavel,
        telefone: body.telefone,
        nascimento: body.nascimento,
        turnoVisita: body.turnoVisita || 'manha',
        dataVisita: body.dataVisita || new Date().toISOString().slice(0, 10),
        documentosMarcados: Array.isArray(body.documentosMarcados) ? body.documentosMarcados : [],
        totalObrigatorios: Number(body.totalObrigatorios) || 6,
      });

      if (!protocolo) return json(res, 404, { erro: 'Unidade escolar não encontrada.' });

      transmitirAtualizacaoSSE();
      return json(res, 201, { ok: true, protocolo });
    }

    const matchStatusProt = path.match(/^\/api\/v1\/gestao\/protocolos\/([^/]+)\/status$/);
    if (req.method === 'PATCH' && matchStatusProt) {
      const codigo = decodeURIComponent(matchStatusProt[1]);
      const body = await lerJson<{ status: StatusProtocolo }>(req);
      if (!body.status || !['aguardando', 'atendido', 'cancelado'].includes(body.status)) {
        return json(res, 400, { erro: 'Status inválido.' });
      }
      const { protocolo, evento } = atualizarStatusProtocolo(codigo, body.status);
      if (!protocolo) return json(res, 404, { erro: 'Protocolo não encontrado.' });

      transmitirAtualizacaoSSE(evento ?? undefined);
      return json(res, 200, { ok: true, protocolo, evento });
    }

    // 6. Módulo Painel Macro da Secretaria Municipal de Educação de Patos-PB
    if (req.method === 'GET' && path === '/api/v1/secretaria/painel') {
      return json(res, 200, obterPainelSecretariaPatos());
    }

    return json(res, 404, { erro: 'Rota não encontrada na API.' });
  } catch (err) {
    console.error('[API Error]', err);
    return json(res, 500, { erro: 'Erro interno no servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(
    `[Matrícula Aberta · Patos-PB] Monolito Modular ativo em http://localhost:${PORT} (SQLite WAL + SSE)`,
  );
});
