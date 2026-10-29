import type { ServerResponse } from 'node:http';
import type { EventoVaga, SyncFrameDTO } from '../../../shared/src/index.ts';
import { obterCatalogoMunicipio } from '../modules/catalogo/catalogo.module.ts';
import { listarProtocolos } from '../modules/protocolos/protocolos.module.ts';
import { obterPainelSecretariaPatos } from '../modules/secretaria/secretaria.module.ts';
import { listarEscolas, listarHistorico } from '../modules/unidades/unidades.module.ts';

const clientesSSE = new Set<ServerResponse>();

export function construirSnapshotSincronizacao(incluirCatalogo = false, evento?: EventoVaga): SyncFrameDTO {
  return {
    tipo: 'sync',
    ...(incluirCatalogo ? { catalogo: obterCatalogoMunicipio() } : {}),
    escolas: listarEscolas(),
    historico: listarHistorico(40),
    protocolos: listarProtocolos(),
    secretaria: obterPainelSecretariaPatos(),
    ...(evento ? { evento } : {}),
  };
}

export function registrarClienteSSE(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const inicial = JSON.stringify(construirSnapshotSincronizacao(true));
  res.write(`data: ${inicial}\n\n`);
  clientesSSE.add(res);

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(ping);
      clientesSSE.delete(res);
    }
  }, 20_000);

  res.on('close', () => {
    clearInterval(ping);
    clientesSSE.delete(res);
  });
}

export function transmitirAtualizacaoSSE(evento?: EventoVaga): void {
  if (clientesSSE.size === 0) return;
  const payload = JSON.stringify(construirSnapshotSincronizacao(false, evento));
  for (const res of clientesSSE) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      clientesSSE.delete(res);
    }
  }
}

export function totalClientesSSE(): number {
  return clientesSSE.size;
}

