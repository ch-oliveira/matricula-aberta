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

export function construirSnapshotSincronizacao(opcoes: {
  incluirCatalogo?: boolean;
  incluirDadosGestao?: boolean;
  escolaIdFiltro?: string;
  evento?: EventoVaga;
}): SyncFrameDTO {
  const {
    incluirCatalogo = false,
    incluirDadosGestao = false,
    escolaIdFiltro,
    evento,
  } = opcoes;

  return {
    tipo: 'sync',
    ...(incluirCatalogo ? { catalogo: obterCatalogoMunicipio() } : {}),
    escolas: listarEscolas(),
    historico: listarHistorico(40),
    ...(incluirDadosGestao
      ? {
          protocolos: listarProtocolos(escolaIdFiltro),
          secretaria: obterPainelSecretariaPatos(),
        }
      : {}),
    ...(evento ? { evento } : {}),
  };
}

export function registrarClienteSSE(
  req: IncomingMessage,
  res: ServerResponse,
  sessao: SessaoGestaoDTO | null,
): void {
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

  const inicial = JSON.stringify(
    construirSnapshotSincronizacao({
      incluirCatalogo: true,
      incluirDadosGestao: Boolean(sessao),
    }),
  );
  res.write(`data: ${inicial}\n\n`);

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

export function transmitirAtualizacaoSSE(evento?: EventoVaga): void {
  if (clientesSSE.size === 0) return;

  let payloadPublico: string | null = null;
  let payloadGestao: string | null = null;

  for (const cliente of clientesSSE) {
    try {
      if (cliente.sessao) {
        if (!payloadGestao) {
          payloadGestao = JSON.stringify(
            construirSnapshotSincronizacao({
              incluirCatalogo: false,
              incluirDadosGestao: true,
              evento,
            }),
          );
        }
        cliente.res.write(`data: ${payloadGestao}\n\n`);
      } else {
        if (!payloadPublico) {
          payloadPublico = JSON.stringify(
            construirSnapshotSincronizacao({
              incluirCatalogo: false,
              incluirDadosGestao: false,
              evento,
            }),
          );
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
