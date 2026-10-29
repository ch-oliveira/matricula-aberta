/**
 * Camada de dados 100% integrada ao Monolito Modular (SQLite + SSE em /api/v1/*)
 * Município de Patos - PB (IBGE 2510808).
 *
 * - Zero dados mockados ou seeds hardcoded no cliente.
 * - Hidrata catálogo municipal (bairros de Patos-PB, documentos oficiais), unidades escolares,
 *   protocolos de pré-agendamento e painel macro da Secretaria de Educação direto da API.
 * - Mantém espelho reativo via Server-Sent Events (/api/v1/stream) e cache localStorage de leitura
 *   para resiliência em conexões móveis instáveis.
 */
import { useSyncExternalStore } from 'react';
import type {
  CatalogoMunicipioDTO,
  Escola,
  EtapaId,
  EventoVaga,
  Oferta,
  PainelSecretariaDTO,
  Periodo,
  ProtocoloVisita,
  StatusProtocolo,
  SyncFrameDTO,
  TurnoVisita,
} from '../domain/types';

export type { EventoVaga };

const KEY_CACHE = 'ma:patos:snapshot:v2';
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const CATALOGO_VAZIO: CatalogoMunicipioDTO = {
  municipio: 'Patos',
  uf: 'PB',
  codigoIbge: '2510808',
  dddPadrao: '83',
  orgao: 'Secretaria Municipal de Educação de Patos - PB',
  enderecoSecretaria: 'Rua Bossuet Wanderley, 210 – Centro, Patos - PB',
  telefoneSecretaria: '(83) 3421-2204',
  centro: { id: 'centro', lat: -7.0244, lng: -37.2769, rotulo: 'Centro', zona: 'Zona Central' },
  bairros: [],
  documentos: [],
};

interface EstadoServidor {
  catalogo: CatalogoMunicipioDTO;
  escolas: Escola[];
  historico: EventoVaga[];
  protocolos: ProtocoloVisita[];
  secretaria: PainelSecretariaDTO | null;
  carregando: boolean;
  apiOnline: boolean;
}

function carregarCacheInicial(): Omit<EstadoServidor, 'carregando' | 'apiOnline'> {
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EstadoServidor>;
      return {
        catalogo: parsed.catalogo ?? CATALOGO_VAZIO,
        escolas: Array.isArray(parsed.escolas) ? parsed.escolas : [],
        historico: Array.isArray(parsed.historico) ? parsed.historico : [],
        protocolos: Array.isArray(parsed.protocolos) ? parsed.protocolos : [],
        secretaria: parsed.secretaria ?? null,
      };
    }
  } catch {
    /* sem cache prévio */
  }
  return {
    catalogo: CATALOGO_VAZIO,
    escolas: [],
    historico: [],
    protocolos: [],
    secretaria: null,
  };
}

const cacheInicial = carregarCacheInicial();

let catalogo: CatalogoMunicipioDTO = cacheInicial.catalogo;
let escolas: Escola[] = cacheInicial.escolas;
let historico: EventoVaga[] = cacheInicial.historico;
let protocolos: ProtocoloVisita[] = cacheInicial.protocolos;
let secretaria: PainelSecretariaDTO | null = cacheInicial.secretaria;
let carregando = escolas.length === 0;
let apiOnline = false;

const assinantes = new Set<() => void>();
const ouvintesEvento = new Set<(e: EventoVaga) => void>();

function emitir() {
  assinantes.forEach((fn) => fn());
}

function persistirCache() {
  try {
    localStorage.setItem(
      KEY_CACHE,
      JSON.stringify({
        catalogo,
        escolas,
        historico: historico.slice(0, 40),
        protocolos: protocolos.slice(0, 50),
        secretaria,
      }),
    );
  } catch {
    /* storage cheio ou modo privado */
  }
}

function aplicarSnapshot(dados: Partial<SyncFrameDTO>) {
  if (dados.catalogo) catalogo = dados.catalogo;
  if (Array.isArray(dados.escolas)) escolas = dados.escolas;
  if (Array.isArray(dados.historico)) historico = dados.historico;
  if (Array.isArray(dados.protocolos)) protocolos = dados.protocolos;
  if (dados.secretaria) secretaria = dados.secretaria;
  carregando = false;
  apiOnline = true;
  persistirCache();
  emitir();
  if (dados.evento) {
    ouvintesEvento.forEach((fn) => fn(dados.evento!));
  }
}

// Hidratação imediata via REST + assinatura contínua via SSE (/api/v1/stream)
if (typeof window !== 'undefined') {
  fetch(`${API_BASE}/api/v1/escolas`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((dados: Partial<SyncFrameDTO>) => {
      aplicarSnapshot(dados);
    })
    .catch(() => {
      carregando = false;
      apiOnline = false;
      emitir();
    });

  if ('EventSource' in window) {
    const es = new EventSource(`${API_BASE}/api/v1/stream`);
    es.onopen = () => {
      apiOnline = true;
      emitir();
    };
    es.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data) as SyncFrameDTO;
        if (frame.tipo === 'sync') {
          aplicarSnapshot(frame);
        }
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => {
      apiOnline = false;
      emitir();
    };
  }
}

export const vagasStore = {
  getCatalogo: () => catalogo,
  getEscolas: () => escolas,
  getHistorico: () => historico,
  getProtocolos: () => protocolos,
  getSecretaria: () => secretaria,
  isCarregando: () => carregando,
  isApiOnline: () => apiOnline,

  subscribe(fn: () => void) {
    assinantes.add(fn);
    return () => {
      assinantes.delete(fn);
    };
  },

  onEvento(fn: (e: EventoVaga) => void) {
    ouvintesEvento.add(fn);
    return () => {
      ouvintesEvento.delete(fn);
    };
  },

  async atualizarOferta(
    escolaId: string,
    etapa: EtapaId,
    periodo: Periodo,
    patch: Partial<Pick<Oferta, 'vagas' | 'fila'>>,
    origem: EventoVaga['origem'] = 'escola',
  ) {
    const res = await fetch(`${API_BASE}/api/v1/gestao/escolas/${encodeURIComponent(escolaId)}/ofertas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa, periodo, ...patch, origem }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar oferta no servidor');
    apiOnline = true;
  },

  async confirmarDados(escolaId: string) {
    const res = await fetch(`${API_BASE}/api/v1/gestao/escolas/${encodeURIComponent(escolaId)}/confirmar`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Falha ao confirmar dados no servidor');
  },

  async resetar() {
    const res = await fetch(`${API_BASE}/api/v1/gestao/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao restaurar banco de Patos-PB');
  },

  async emitirProtocoloVisita(dados: {
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
  }): Promise<ProtocoloVisita> {
    const res = await fetch(`${API_BASE}/api/v1/protocolos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error('Não foi possível emitir o protocolo');
    const json = (await res.json()) as { protocolo: ProtocoloVisita };
    return json.protocolo;
  },

  async atualizarStatusProtocolo(codigo: string, status: StatusProtocolo): Promise<ProtocoloVisita> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/protocolos/${encodeURIComponent(codigo)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar protocolo');
    const json = (await res.json()) as { protocolo: ProtocoloVisita };
    return json.protocolo;
  },
};

export function useCatalogo(): CatalogoMunicipioDTO {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getCatalogo);
}

export function useEscolas(): Escola[] {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getEscolas);
}

export function useHistorico(): EventoVaga[] {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getHistorico);
}

export function useProtocolos(): ProtocoloVisita[] {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getProtocolos);
}

export function usePainelSecretaria(): PainelSecretariaDTO | null {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getSecretaria);
}

export function useStatusApi(): boolean {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.isApiOnline);
}
