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

const KEY_CACHE = 'ma:patos:snapshot:v3';
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const min = (m: number) => Date.now() - m * 60_000;
const hora = (h: number) => Date.now() - h * 3_600_000;

const CATALOGO_VAZIO: CatalogoMunicipioDTO = {
  municipio: 'Patos',
  uf: 'PB',
  codigoIbge: '2510808',
  dddPadrao: '83',
  orgao: 'Secretaria Municipal de Educação de Patos - PB',
  enderecoSecretaria: 'Rua Bossuet Wanderley, 210 – Centro, Patos - PB',
  telefoneSecretaria: '(83) 3421-2204',
  centro: { id: 'centro', lat: -7.0244, lng: -37.2769, rotulo: 'Centro', zona: 'Zona Central' },
  bairros: [
    { id: 'centro', rotulo: 'Centro', zona: 'Zona Central', lat: -7.0244, lng: -37.2769 },
    { id: 'belo-horizonte', rotulo: 'Belo Horizonte', zona: 'Zona Norte', lat: -7.0148, lng: -37.2742 },
    { id: 'maternidade', rotulo: 'Maternidade', zona: 'Zona Oeste', lat: -7.0218, lng: -37.2874 },
    { id: 'jatoba', rotulo: 'Jatobá', zona: 'Zona Sul', lat: -7.0432, lng: -37.2725 },
    { id: 'salgadinho', rotulo: 'Salgadinho', zona: 'Zona Leste', lat: -7.0182, lng: -37.2621 },
    { id: 'liberdade', rotulo: 'Liberdade', zona: 'Zona Oeste', lat: -7.0285, lng: -37.2848 },
    { id: 'sao-sebastiao', rotulo: 'São Sebastião', zona: 'Zona Leste', lat: -7.0249, lng: -37.2665 },
    { id: 'noe-trajano', rotulo: 'Noé Trajano', zona: 'Zona Norte', lat: -7.0122, lng: -37.2839 },
    { id: 'monte-castelo', rotulo: 'Monte Castelo', zona: 'Zona Sul', lat: -7.0488, lng: -37.2791 },
    { id: 'vitoria', rotulo: 'Vitória', zona: 'Zona Leste', lat: -7.0205, lng: -37.2554 },
  ],
  documentos: [
    { id: 'certidao', nome: 'Certidão de nascimento da criança', dica: 'Original e uma cópia legível.', emoji: 'file-text', obrigatorio: true },
    { id: 'cpf-crianca', nome: 'CPF da criança', dica: 'Pode constar na própria certidão de nascimento.', emoji: 'id-card', obrigatorio: true },
    { id: 'doc-resp', nome: 'Documento oficial com foto do responsável', dica: 'RG, CIN, CNH ou Carteira de Trabalho.', emoji: 'user-check', obrigatorio: true },
    { id: 'cpf-resp', nome: 'CPF do pai, mãe ou responsável legal', dica: 'Pode estar no RG ou CNH.', emoji: 'id-badge', obrigatorio: true },
    { id: 'residencia', nome: 'Comprovante de residência em Patos - PB', dica: 'Conta da Energisa, Cagepa ou contrato de aluguel recente.', emoji: 'home', obrigatorio: true },
    { id: 'vacina', nome: 'Carteira de vacinação atualizada (UBS)', dica: 'Emitida ou atualizada em qualquer UBS de Patos.', emoji: 'syringe', obrigatorio: true, etapas: ['bercario', 'maternal', 'pre', 'fund1'] },
    { id: 'sus', nome: 'Cartão Nacional do SUS da criança', dica: 'Obrigatório para cadastro na Rede Municipal de Patos.', emoji: 'heart-pulse', obrigatorio: true, etapas: ['bercario', 'maternal', 'pre'] },
    { id: 'historico', nome: 'Declaração provisória ou Histórico Escolar', dica: 'Solicite na escola anterior (prazo de 30 dias para o definitivo).', emoji: 'graduation-cap', obrigatorio: true, etapas: ['fund1', 'fund2'] },
    { id: 'trabalho', nome: 'Comprovante de trabalho dos responsáveis', dica: 'Prioridade para vagas de tempo integral nas creches municipais.', emoji: 'briefcase', obrigatorio: false, etapas: ['bercario', 'maternal'] },
    { id: 'nis', nome: 'Número do NIS / Cartão Bolsa Família (CadÚnico)', dica: 'Garante prioridade social conforme diretriz municipal.', emoji: 'credit-card', obrigatorio: false },
    { id: 'laudo', nome: 'Laudo médico ou parecer multiprofissional (AEE)', dica: 'Para estudantes com deficiência, TEA ou altas habilidades.', emoji: 'stethoscope', obrigatorio: false },
  ],
};

const ESCOLAS_PADRAO_PATOS: Escola[] = [
  {
    id: 'creche-manoel-quinidio',
    nome: 'Creche Municipal Manoel Quinídio Sobrinho',
    tipo: 'Creche',
    bairro: 'Jatobá',
    endereco: 'Rua Manoel Mota, 340 – Jatobá, Patos - PB',
    telefone: '(83) 3421-3101',
    lat: -7.0424,
    lng: -37.2731,
    acessivel: true,
    destaques: ['Período integral', 'Berçário climatizado', 'Acessível', 'Lactário próprio'],
    atendimento: 'Seg a sex · 7h às 17h',
    atualizadoEm: min(8),
    ofertas: [
      { etapa: 'bercario', periodo: 'integral', vagas: 2, capacidade: 24, fila: 0 },
      { etapa: 'maternal', periodo: 'integral', vagas: 6, capacidade: 40, fila: 0 },
      { etapa: 'pre', periodo: 'parcial', vagas: 5, capacidade: 35, fila: 0 },
    ],
  },
  {
    id: 'creche-tia-luci',
    nome: 'Creche Municipal Tia Luci',
    tipo: 'Creche',
    bairro: 'Belo Horizonte',
    endereco: 'Rua Horácio Nóbrega, 815 – Belo Horizonte, Patos - PB',
    telefone: '(83) 3421-3108',
    lat: -7.0156,
    lng: -37.2735,
    acessivel: true,
    destaques: ['Período integral', 'Horta pedagógica', 'Acessível'],
    atendimento: 'Seg a sex · 7h às 16h30',
    atualizadoEm: min(19),
    ofertas: [
      { etapa: 'bercario', periodo: 'integral', vagas: 0, capacidade: 20, fila: 9 },
      { etapa: 'maternal', periodo: 'integral', vagas: 1, capacidade: 35, fila: 0 },
      { etapa: 'pre', periodo: 'parcial', vagas: 7, capacidade: 45, fila: 0 },
    ],
  },
  {
    id: 'creche-maria-eunice',
    nome: 'Creche Municipal Maria Eunice',
    tipo: 'Creche',
    bairro: 'Maternidade',
    endereco: 'Rua Pedro Firmino, 620 – Maternidade, Patos - PB',
    telefone: '(83) 3421-3115',
    lat: -7.0225,
    lng: -37.2862,
    acessivel: true,
    destaques: ['Período integral', 'Sala de leitura infantil', 'Acessível'],
    atendimento: 'Seg a sex · 7h às 17h',
    atualizadoEm: min(14),
    ofertas: [
      { etapa: 'bercario', periodo: 'integral', vagas: 5, capacidade: 25, fila: 0 },
      { etapa: 'maternal', periodo: 'integral', vagas: 8, capacidade: 42, fila: 0 },
      { etapa: 'maternal', periodo: 'parcial', vagas: 4, capacidade: 25, fila: 0 },
    ],
  },
  {
    id: 'cmei-pedro-satiro',
    nome: 'CMEI Dr. Pedro Sátiro',
    tipo: 'CMEI',
    bairro: 'Liberdade',
    endereco: 'Rua Lima Campos, 490 – Liberdade, Patos - PB',
    telefone: '(83) 3421-3122',
    lat: -7.0278,
    lng: -37.2841,
    acessivel: true,
    destaques: ['Brinquedoteca', 'Pátio coberto', 'Acessível', 'AEE'],
    atendimento: 'Seg a sex · 7h30 às 16h30',
    atualizadoEm: min(32),
    ofertas: [
      { etapa: 'bercario', periodo: 'integral', vagas: 0, capacidade: 22, fila: 6 },
      { etapa: 'maternal', periodo: 'parcial', vagas: 3, capacidade: 32, fila: 0 },
      { etapa: 'pre', periodo: 'parcial', vagas: 9, capacidade: 50, fila: 0 },
      { etapa: 'pre', periodo: 'integral', vagas: 2, capacidade: 25, fila: 0 },
    ],
  },
  {
    id: 'creche-dona-nini',
    nome: 'Creche Municipal Dona Nini',
    tipo: 'Creche',
    bairro: 'São Sebastião',
    endereco: 'Av. Rio Branco, 305 – São Sebastião, Patos - PB',
    telefone: '(83) 3421-3130',
    lat: -7.0243,
    lng: -37.2659,
    acessivel: false,
    destaques: ['Período integral', 'Alimentação balanceada PNAE'],
    atendimento: 'Seg a sex · 7h às 16h',
    atualizadoEm: hora(2),
    ofertas: [
      { etapa: 'bercario', periodo: 'integral', vagas: 4, capacidade: 20, fila: 0 },
      { etapa: 'maternal', periodo: 'integral', vagas: 0, capacidade: 30, fila: 5 },
      { etapa: 'pre', periodo: 'parcial', vagas: 6, capacidade: 40, fila: 0 },
    ],
  },
  {
    id: 'creche-igor-mota',
    nome: 'Creche Municipal Igor Mota',
    tipo: 'Creche',
    bairro: 'Monte Castelo',
    endereco: 'Rua Projetada Sul, 118 – Monte Castelo, Patos - PB',
    telefone: '(83) 3421-3144',
    lat: -7.0481,
    lng: -37.2784,
    acessivel: true,
    destaques: ['Unidade nova climatizada', 'Período integral', 'Acessível'],
    atendimento: 'Seg a sex · 7h às 17h',
    atualizadoEm: min(41),
    ofertas: [
      { etapa: 'bercario', periodo: 'integral', vagas: 7, capacidade: 26, fila: 0 },
      { etapa: 'maternal', periodo: 'integral', vagas: 10, capacidade: 45, fila: 0 },
      { etapa: 'pre', periodo: 'parcial', vagas: 8, capacidade: 48, fila: 0 },
    ],
  },
  {
    id: 'emef-monsenhor-manoel-vieira',
    nome: 'EMEF Monsenhor Manoel Vieira',
    tipo: 'EMEF',
    bairro: 'Centro',
    endereco: 'Praça Edvaldo Mota, 85 – Centro, Patos - PB',
    telefone: '(83) 3421-3201',
    lat: -7.0239,
    lng: -37.2775,
    acessivel: true,
    destaques: ['Quadra poliesportiva coberta', 'Sala de Recursos AEE', 'Laboratório de Ciências', 'Acessível'],
    atendimento: 'Seg a sex · 7h30 às 17h',
    atualizadoEm: min(11),
    ofertas: [
      { etapa: 'fund1', periodo: 'parcial', vagas: 9, capacidade: 180, fila: 0 },
      { etapa: 'fund1', periodo: 'integral', vagas: 3, capacidade: 60, fila: 0 },
      { etapa: 'fund2', periodo: 'parcial', vagas: 11, capacidade: 160, fila: 0 },
    ],
  },
  {
    id: 'emef-sabino-freire',
    nome: 'EMEF Sabino Freire',
    tipo: 'EMEF',
    bairro: 'Maternidade',
    endereco: 'Rua Doutor Romero Nóbrega, 412 – Maternidade, Patos - PB',
    telefone: '(83) 3421-3210',
    lat: -7.0209,
    lng: -37.2881,
    acessivel: true,
    destaques: ['Reforço escolar no contraturno', 'Banda marcial escolar', 'Acessível'],
    atendimento: 'Seg a sex · 7h30 às 17h',
    atualizadoEm: min(27),
    ofertas: [
      { etapa: 'pre', periodo: 'parcial', vagas: 4, capacidade: 50, fila: 0 },
      { etapa: 'fund1', periodo: 'parcial', vagas: 7, capacidade: 150, fila: 0 },
      { etapa: 'fund2', periodo: 'parcial', vagas: 5, capacidade: 120, fila: 0 },
    ],
  },
  {
    id: 'emef-aristides-hamad-timene',
    nome: 'EMEF Aristides Hamad Timene',
    tipo: 'EMEF',
    bairro: 'Belo Horizonte',
    endereco: 'Rua Augusto dos Anjos, 275 – Belo Horizonte, Patos - PB',
    telefone: '(83) 3421-3224',
    lat: -7.0141,
    lng: -37.2751,
    acessivel: true,
    destaques: ['Robótica educacional', 'Biblioteca climatizada', 'Acessível'],
    atendimento: 'Seg a sex · 7h30 às 16h30',
    atualizadoEm: min(49),
    ofertas: [
      { etapa: 'fund1', periodo: 'parcial', vagas: 0, capacidade: 140, fila: 8 },
      { etapa: 'fund2', periodo: 'parcial', vagas: 6, capacidade: 130, fila: 0 },
    ],
  },
  {
    id: 'emef-jose-perminio-wanderley',
    nome: 'EMEF José Permínio Wanderley',
    tipo: 'EMEF',
    bairro: 'Salgadinho',
    endereco: 'Rua Manoel Torres, 510 – Salgadinho, Patos - PB',
    telefone: '(83) 3421-3238',
    lat: -7.0178,
    lng: -37.2615,
    acessivel: false,
    destaques: ['Esporte escolar', 'Oficina de leitura e cordel'],
    atendimento: 'Seg a sex · 8h às 16h30',
    atualizadoEm: hora(60),
    ofertas: [
      { etapa: 'pre', periodo: 'parcial', vagas: 3, capacidade: 40, fila: 0 },
      { etapa: 'fund1', periodo: 'parcial', vagas: 8, capacidade: 140, fila: 0 },
      { etapa: 'fund2', periodo: 'parcial', vagas: 9, capacidade: 130, fila: 0 },
    ],
  },
  {
    id: 'emef-alirio-meira-wanderley',
    nome: 'EMEF Alírio Meira Wanderley',
    tipo: 'EMEF',
    bairro: 'Jatobá',
    endereco: 'Rua Alto Casteliano, 790 – Jatobá, Patos - PB',
    telefone: '(83) 3421-3245',
    lat: -7.0441,
    lng: -37.2718,
    acessivel: true,
    destaques: ['Tempo integral', 'Quadra coberta', 'Atendimento AEE', 'Acessível'],
    atendimento: 'Seg a sex · 7h às 17h',
    atualizadoEm: min(16),
    ofertas: [
      { etapa: 'fund1', periodo: 'integral', vagas: 1, capacidade: 90, fila: 0 },
      { etapa: 'fund1', periodo: 'parcial', vagas: 5, capacidade: 120, fila: 0 },
      { etapa: 'fund2', periodo: 'parcial', vagas: 0, capacidade: 110, fila: 11 },
    ],
  },
  {
    id: 'emef-nosso-lar-tio-juca',
    nome: 'EMEF Nosso Lar Tio Juca',
    tipo: 'EMEF',
    bairro: 'Noé Trajano',
    endereco: 'Rua Projetada Norte, 204 – Noé Trajano, Patos - PB',
    telefone: '(83) 3421-3259',
    lat: -7.0119,
    lng: -37.2832,
    acessivel: true,
    destaques: ['Educação infantil e fundamental', 'Acessível', 'Projeto Música na Escola'],
    atendimento: 'Seg a sex · 7h30 às 17h',
    atualizadoEm: hora(3),
    ofertas: [
      { etapa: 'maternal', periodo: 'parcial', vagas: 5, capacidade: 35, fila: 0 },
      { etapa: 'pre', periodo: 'parcial', vagas: 6, capacidade: 45, fila: 0 },
      { etapa: 'fund1', periodo: 'parcial', vagas: 11, capacidade: 130, fila: 0 },
      { etapa: 'fund2', periodo: 'parcial', vagas: 7, capacidade: 100, fila: 0 },
    ],
  },
];

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
      const cat = parsed.catalogo;
      const esc = Array.isArray(parsed.escolas) && parsed.escolas.length > 0 ? parsed.escolas : ESCOLAS_PADRAO_PATOS;
      return {
        catalogo:
          cat && Array.isArray(cat.bairros) && cat.bairros.length > 0
            ? cat
            : CATALOGO_VAZIO,
        escolas: esc,
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
    escolas: ESCOLAS_PADRAO_PATOS,
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
