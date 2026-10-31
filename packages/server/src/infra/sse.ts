import type { IncomingMessage, ServerResponse } from 'node:http';
import type { EventoVaga, SessaoGestaoDTO, SyncFrameDTO } from '../../../shared/src/index.ts';
import { obterCatalogoMunicipio } from '../modules/catalogo/catalogo.module.ts';
import { listarProtocolos } from '../modules/protocolos/protocolos.module.ts';
import { obterPainelSecretariaPatos } from '../modules/secretaria/secretaria.module.ts';
import { listarEscolas, listarHistorico } from '../modules/unidades/unidades.module.ts';
import { resolverOrigemCors } from './security.ts';

interface ClienteSSE {
  res: ServerResponse;
  sessao: SessaoGestaoDTO | null;
}

const clientesSSE = new Set<ClienteSSE>();
const MAX_CLIENTES_SSE = 250;

export async function construirSnapshotSincronizacao(opcoes: {
  incluirCatalogo?: boolean;
  incluirDadosGestao?: boolean;
  escolaIdFiltro?: string;
  evento?: EventoVaga;
}): Promise<SyncFrameDTO> {
  const {
    incluirCatalogo = false,
    incluirDadosGestao = false,
    escolaIdFiltro,
    evento,
  } = opcoes;

  const [catalogo, escolas, historico, protocolos, secretaria] = await Promise.all([
    incluirCatalogo ? obterCatalogoMunicipio() : Promise.resolve(undefined),
    listarEscolas(),
    listarHistorico(40),
    incluirDadosGestao ? listarProtocolos(escolaIdFiltro) : Promise.resolve(undefined),
    incluirDadosGestao ? obterPainelSecretariaPatos() : Promise.resolve(undefined),
  ]);

  return {
    tipo: 'sync',
    ...(catalogo ? { catalogo } : {}),
    escolas,
    historico,
    ...(protocolos ? { protocolos } : {}),
    ...(secretaria ? { secretaria } : {}),
    ...(evento ? { evento } : {}),
  };
}

export async function registrarClienteSSE(
  req: IncomingMessage,
  res: ServerResponse,
  sessao: SessaoGestaoDTO | null,
): Promise<void> {
  if (clientesSSE.size >= MAX_CLIENTES_SSE) {
    // Desconecta o cliente mais antigo caso atinja o teto de segurança
    const maisAntigo = clientesSSE.values().next().value;
    if (maisAntigo) {
      try {
        maisAntigo.res.end();
      } catch {
        /* ignore */
      }
      clientesSSE.delete(maisAntigo);
    }
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': resolverOrigemCors(req),
  });

  const frameInicial = await construirSnapshotSincronizacao({
    incluirCatalogo: true,
    incluirDadosGestao: Boolean(sessao),
  });
  res.write(`data: ${JSON.stringify(frameInicial)}\n\n`);

  const cliente: ClienteSSE = { res, sessao };
  clientesSSE.add(cliente);

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(ping);
      clientesSSE.delete(cliente);
    }
  }, 20_000);

  res.on('close', () => {
    clearInterval(ping);
    clientesSSE.delete(cliente);
  });
}

export async function transmitirAtualizacaoSSE(evento?: EventoVaga): Promise<void> {
  if (clientesSSE.size === 0) return;

  let payloadPublico: string | null = null;
  let payloadGestao: string | null = null;

  for (const cliente of clientesSSE) {
    try {
      if (cliente.sessao) {
        if (!payloadGestao) {
          const snapshot = await construirSnapshotSincronizacao({
            incluirCatalogo: false,
            incluirDadosGestao: true,
            evento,
          });
          payloadGestao = JSON.stringify(snapshot);
        }
        cliente.res.write(`data: ${payloadGestao}\n\n`);
      } else {
        if (!payloadPublico) {
          const snapshot = await construirSnapshotSincronizacao({
            incluirCatalogo: false,
            incluirDadosGestao: false,
            evento,
          });
          payloadPublico = JSON.stringify(snapshot);
        }
        cliente.res.write(`data: ${payloadPublico}\n\n`);
      }
    } catch {
      clientesSSE.delete(cliente);
    }
  }
}

export function totalClientesSSE(): number {
  return clientesSSE.size;
}
