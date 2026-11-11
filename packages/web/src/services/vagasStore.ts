/**
 * Camada de dados e autenticação integrada ao Monolito Modular (SQLite + SSE + RBAC em /api/v1/*)
 * Município de Patos - PB (IBGE 2510808).
 *
 * - Isolamento estrito entre dados públicos (catálogo, escolas, histórico) e dados protegidos
 *   de gestão (protocolos presenciais e painel macro da SEDUC).
 * - Autenticação real com token HMAC-SHA256 via Bearer header e reconexão autenticada no SSE.
 */
import { useSyncExternalStore } from 'react';
import type {
  CatalogoMunicipioDTO,
  CertidaoCumprimentoJudicialDTO,
  CriterioVulnerabilidadeId,
  DemandaJudicial,
  Escola,
  EtapaId,
  EventoVaga,
  FilaItemAuditavel,
  LogAuditoria,
  LoginGestaoRequestDTO,
  Oferta,
  PainelSecretariaDTO,
  PerfilGestao,
  Periodo,
  ProtocoloVisita,
  SessaoGestaoDTO,
  StatusProtocolo,
  SyncFrameDTO,
  TurnoVisita,
} from '../domain/types';

export type { EventoVaga };

const KEY_CACHE = 'ma:patos:snapshot:v4';
const KEY_SESSAO_SEC = 'ma:gestao:sessao:secretaria:v2';
const KEY_SESSAO_UNI = 'ma:gestao:sessao:unidade:v2';

export function obterApiBase(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Em desenvolvimento local ou testes em rede local, usa rota relativa com proxy do Vite (porta 3333)
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return '';
    }
    // Em produção na nuvem (Vercel, domínios públicos), conecta diretamente à API hospedada no Render
    return 'https://matricula-aberta-api.onrender.com';
  }
  return 'https://matricula-aberta-api.onrender.com';
}

export const API_BASE = obterApiBase();

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

function lerSessaoSalva(chave: string): SessaoGestaoDTO | null {
  try {
    const raw = sessionStorage.getItem(chave);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessaoGestaoDTO>;
    if (
      parsed &&
      typeof parsed.token === 'string' &&
      (parsed.perfil === 'secretaria' || parsed.perfil === 'unidade') &&
      typeof parsed.usuario === 'string' &&
      typeof parsed.expiraEm === 'number' &&
      parsed.expiraEm > Date.now()
    ) {
      return parsed as SessaoGestaoDTO;
    }
    sessionStorage.removeItem(chave);
  } catch {
    /* ignore */
  }
  return null;
}

interface CachePublico {
  catalogo: CatalogoMunicipioDTO;
  escolas: Escola[];
  historico: EventoVaga[];
}

function carregarCacheInicial(): CachePublico {
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CachePublico>;
      const cat = parsed.catalogo;
      const esc =
        Array.isArray(parsed.escolas) && parsed.escolas.length > 0
          ? parsed.escolas
          : ESCOLAS_PADRAO_PATOS;
      return {
        catalogo:
          cat && Array.isArray(cat.bairros) && cat.bairros.length > 0 ? cat : CATALOGO_VAZIO,
        escolas: esc,
        historico: Array.isArray(parsed.historico) ? parsed.historico : [],
      };
    }
  } catch {
    /* sem cache prévio */
  }
  return {
    catalogo: CATALOGO_VAZIO,
    escolas: ESCOLAS_PADRAO_PATOS,
    historico: [],
  };
}

const cacheInicial = carregarCacheInicial();

let catalogo: CatalogoMunicipioDTO = cacheInicial.catalogo;
let escolas: Escola[] = cacheInicial.escolas;
let historico: EventoVaga[] = cacheInicial.historico;
let protocolos: ProtocoloVisita[] = [];
let secretaria: PainelSecretariaDTO | null = null;
let sessaoSecretaria: SessaoGestaoDTO | null =
  typeof window !== 'undefined' ? lerSessaoSalva(KEY_SESSAO_SEC) : null;
let sessaoUnidade: SessaoGestaoDTO | null =
  typeof window !== 'undefined' ? lerSessaoSalva(KEY_SESSAO_UNI) : null;
let carregando = escolas.length === 0;
let apiOnline = false;
let fonteSSE: EventSource | null = null;

const assinantes = new Set<() => void>();
const ouvintesEvento = new Set<(e: EventoVaga) => void>();

function emitir() {
  assinantes.forEach((fn) => fn());
}

function obterTokenGestaoPreferencial(escolaIdAlvo?: string): string | null {
  const agora = Date.now();
  if (sessaoSecretaria && sessaoSecretaria.expiraEm > agora) {
    return sessaoSecretaria.token;
  }
  if (sessaoUnidade && sessaoUnidade.expiraEm > agora) {
    if (!escolaIdAlvo || !sessaoUnidade.escolaId || sessaoUnidade.escolaId === escolaIdAlvo) {
      return sessaoUnidade.token;
    }
  }
  return null;
}

function headersAutenticados(
  escolaIdAlvo?: string,
  comJson = false,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (comJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = obterTokenGestaoPreferencial(escolaIdAlvo);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function persistirCachePublico() {
  try {
    // Nunca persiste dados de gestão ou protocolos de terceiros no localStorage público
    localStorage.setItem(
      KEY_CACHE,
      JSON.stringify({
        catalogo,
        escolas,
        historico: historico.slice(0, 40),
      }),
    );
  } catch {
    /* storage cheio ou modo privado */
  }
}

function mesclarProtocolos(novos: ProtocoloVisita[]) {
  const mapa = new Map<string, ProtocoloVisita>();
  for (const p of novos) mapa.set(p.codigo, p);
  for (const p of protocolos) {
    if (!mapa.has(p.codigo)) mapa.set(p.codigo, p);
  }
  protocolos = Array.from(mapa.values()).sort((a, b) => b.criadoEm - a.criadoEm);
}

function aplicarSnapshot(dados: Partial<SyncFrameDTO>) {
  if (dados.catalogo) catalogo = dados.catalogo;
  if (Array.isArray(dados.escolas)) escolas = dados.escolas;
  if (Array.isArray(dados.historico)) historico = dados.historico;
  if (Array.isArray(dados.protocolos)) mesclarProtocolos(dados.protocolos);
  if (dados.secretaria) secretaria = dados.secretaria;
  carregando = false;
  apiOnline = true;
  persistirCachePublico();
  emitir();
  if (dados.evento) {
    ouvintesEvento.forEach((fn) => fn(dados.evento!));
  }
}

function sincronizarSnapshotHttp() {
  if (typeof window === 'undefined') return;
  fetch(`${API_BASE}/api/v1/escolas`, {
    headers: headersAutenticados(),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((dados: Partial<SyncFrameDTO>) => {
      aplicarSnapshot(dados);
    })
    .catch(() => {
      carregando = false;
      apiOnline = false;
      emitir();
    });
}

function conectarStreamSSE() {
  if (typeof window === 'undefined' || !('EventSource' in window)) return;
  if (fonteSSE) {
    try {
      fonteSSE.close();
    } catch {
      /* ignore */
    }
    fonteSSE = null;
  }

  const token = obterTokenGestaoPreferencial();
  const sufixo = token ? `?token=${encodeURIComponent(token)}` : '';
  const es = new EventSource(`${API_BASE}/api/v1/stream${sufixo}`);
  fonteSSE = es;

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

// Hidratação imediata via REST + assinatura contínua via SSE (/api/v1/stream)
if (typeof window !== 'undefined') {
  // Remove chaves legadas inseguras
  try {
    localStorage.removeItem('ma:patos:snapshot:v3');
    sessionStorage.removeItem('ma:gestao:auth:secretaria:v1');
    sessionStorage.removeItem('ma:gestao:auth:unidade:v1');
  } catch {
    /* ignore */
  }
  sincronizarSnapshotHttp();
  conectarStreamSSE();
}

async function extrairMensagemErro(res: Response, padrao: string): Promise<string> {
  try {
    const data = (await res.json()) as { erro?: string };
    if (data?.erro) return data.erro;
  } catch {
    /* ignore */
  }
  return padrao;
}

const FILA_PUBLICA_FALLBACK: FilaItemAuditavel[] = [
  {
    posicao: 1,
    codigo: 'PATOS-2027-4821',
    estudanteIniciais: 'M. F. M.',
    responsavelIniciais: 'M. F. M.',
    etapa: 'bercario',
    turma: 'Berçário II',
    periodo: 'integral',
    escolaId: 'creche-manoel-quinidio',
    escolaNome: 'Creche Municipal Manoel Quinídio Sobrinho',
    escolaBairro: 'Jatobá',
    pontosTotais: 160,
    criteriosAtendidos: ['cadunico_bolsafamilia', 'mae_trabalhadora'],
    origem: 'regular',
    criadoEm: Date.now() - 42 * 60_000,
    status: 'aguardando',
    reservaVaga: true,
  },
  {
    posicao: 2,
    codigo: 'PATOS-2027-6034',
    estudanteIniciais: 'A. L. N.',
    responsavelIniciais: 'A. L. N.',
    etapa: 'maternal',
    turma: 'Maternal I',
    periodo: 'integral',
    escolaId: 'creche-maria-eunice',
    escolaNome: 'Creche Municipal Maria Eunice',
    escolaBairro: 'Maternidade',
    pontosTotais: 150,
    criteriosAtendidos: ['deficiencia_tea'],
    origem: 'regular',
    criadoEm: Date.now() - 110 * 60_000,
    status: 'aguardando',
    reservaVaga: true,
  },
  {
    posicao: 3,
    codigo: 'PATOS-2027-7201',
    estudanteIniciais: 'K. R. S.',
    responsavelIniciais: 'R. S. S.',
    etapa: 'pre',
    turma: 'Pré II',
    periodo: 'parcial',
    escolaId: 'emef-sabino-freire',
    escolaNome: 'EMEF Sabino Freire',
    escolaBairro: 'Maternidade',
    pontosTotais: 100,
    criteriosAtendidos: ['cadunico_bolsafamilia'],
    origem: 'regular',
    criadoEm: Date.now() - 65 * 60_000,
    status: 'aguardando',
    reservaVaga: true,
  },
  {
    posicao: 4,
    codigo: 'PATOS-2027-5190',
    estudanteIniciais: 'J. S. W.',
    responsavelIniciais: 'J. S. W.',
    etapa: 'fund1',
    turma: '1º ano',
    periodo: 'parcial',
    escolaId: 'emef-monsenhor-manoel-vieira',
    escolaNome: 'EMEF Monsenhor Vieira',
    escolaBairro: 'Centro',
    pontosTotais: 50,
    criteriosAtendidos: ['irmao_na_escola'],
    origem: 'regular',
    criadoEm: Date.now() - 75 * 60_000,
    status: 'aguardando',
    reservaVaga: true,
  },
  {
    posicao: 5,
    codigo: 'PATOS-2027-8344',
    estudanteIniciais: 'G. H. T.',
    responsavelIniciais: 'A. H. T.',
    etapa: 'fund2',
    turma: '6º ano',
    periodo: 'parcial',
    escolaId: 'emef-aristides-hamad-timene',
    escolaNome: 'EMEF Aristides Hamad Timene',
    escolaBairro: 'Belo Horizonte',
    pontosTotais: 50,
    criteriosAtendidos: ['irmao_na_escola'],
    origem: 'regular',
    criadoEm: Date.now() - 150 * 60_000,
    status: 'aguardando',
    reservaVaga: false,
  },
  {
    posicao: 1,
    codigo: 'PATOS-2027-9901',
    estudanteIniciais: 'E. G. L.',
    responsavelIniciais: 'L. S. L.',
    etapa: 'bercario',
    turma: 'Berçário I',
    periodo: 'integral',
    escolaId: 'creche-manoel-quinidio',
    escolaNome: 'Creche Municipal Manoel Quinídio Sobrinho',
    escolaBairro: 'Jatobá',
    pontosTotais: 200,
    criteriosAtendidos: ['medida_protetiva'],
    origem: 'judicial',
    criadoEm: Date.now() - 20 * 60_000,
    status: 'aguardando',
    reservaVaga: true,
  },
];

function filtrarFilaMock(
  itens: FilaItemAuditavel[],
  filtros?: { etapa?: EtapaId; escolaId?: string; busca?: string },
): FilaItemAuditavel[] {
  let res = [...itens];
  if (filtros?.etapa) {
    res = res.filter((i) => i.etapa === filtros.etapa);
  }
  if (filtros?.escolaId) {
    res = res.filter((i) => i.escolaId === filtros.escolaId);
  }
  if (filtros?.busca) {
    const b = filtros.busca.trim().toUpperCase();
    res = res.filter(
      (i) =>
        i.codigo.toUpperCase().includes(b) ||
        i.escolaNome.toUpperCase().includes(b) ||
        i.escolaBairro.toUpperCase().includes(b) ||
        i.estudanteIniciais.toUpperCase().includes(b),
    );
  }
  return res.map((item, idx) => ({ ...item, posicao: idx + 1 }));
}

export const vagasStore = {
  getCatalogo: () => catalogo,
  getEscolas: () => escolas,
  getHistorico: () => historico,
  getProtocolos: () => protocolos,
  getSecretaria: () => secretaria,
  getSessaoSecretaria: () => sessaoSecretaria,
  getSessaoUnidade: () => sessaoUnidade,
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

  async autenticarGestao(credenciais: LoginGestaoRequestDTO): Promise<SessaoGestaoDTO> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credenciais),
    });

    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Credenciais inválidas ou acesso não autorizado.');
      throw new Error(msg);
    }

    const { sessao } = (await res.json()) as { ok: boolean; sessao: SessaoGestaoDTO };
    if (sessao.perfil === 'secretaria') {
      sessaoSecretaria = sessao;
      try {
        sessionStorage.setItem(KEY_SESSAO_SEC, JSON.stringify(sessao));
      } catch {
        /* ignore */
      }
    } else {
      sessaoUnidade = sessao;
      try {
        sessionStorage.setItem(KEY_SESSAO_UNI, JSON.stringify(sessao));
      } catch {
        /* ignore */
      }
    }

    emitir();
    sincronizarSnapshotHttp();
    conectarStreamSSE();
    return sessao;
  },

  encerrarSessaoGestao(perfil: PerfilGestao) {
    if (perfil === 'secretaria') {
      sessaoSecretaria = null;
      try {
        sessionStorage.removeItem(KEY_SESSAO_SEC);
      } catch {
        /* ignore */
      }
    } else {
      sessaoUnidade = null;
      try {
        sessionStorage.removeItem(KEY_SESSAO_UNI);
      } catch {
        /* ignore */
      }
    }

    if (!sessaoSecretaria && !sessaoUnidade) {
      secretaria = null;
    }

    emitir();
    conectarStreamSSE();
    fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST' }).catch(() => {
      /* ignore */
    });
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
      headers: headersAutenticados(escolaId, true),
      body: JSON.stringify({ etapa, periodo, ...patch, origem }),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao atualizar oferta no servidor.');
      throw new Error(msg);
    }
    apiOnline = true;
  },

  async confirmarDados(escolaId: string) {
    const res = await fetch(`${API_BASE}/api/v1/gestao/escolas/${encodeURIComponent(escolaId)}/confirmar`, {
      method: 'POST',
      headers: headersAutenticados(escolaId),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao confirmar dados no servidor.');
      throw new Error(msg);
    }
  },

  async resetar() {
    const res = await fetch(`${API_BASE}/api/v1/gestao/reset`, {
      method: 'POST',
      headers: headersAutenticados(),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao restaurar banco de Patos-PB.');
      throw new Error(msg);
    }
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
    documentoEstudante?: string;
    criteriosPrioridade?: CriterioVulnerabilidadeId[];
  }): Promise<ProtocoloVisita> {
    const res = await fetch(`${API_BASE}/api/v1/protocolos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Não foi possível emitir o protocolo.');
      throw new Error(msg);
    }
    const json = (await res.json()) as { protocolo: ProtocoloVisita };
    mesclarProtocolos([json.protocolo]);
    emitir();
    return json.protocolo;
  },

  async cancelarProtocoloPorCidadao(codigo: string, token: string): Promise<ProtocoloVisita> {
    const res = await fetch(`${API_BASE}/api/v1/protocolos/${encodeURIComponent(codigo)}/cancelar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-protocolo-token': token,
      },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao cancelar o agendamento.');
      throw new Error(msg);
    }
    const json = (await res.json()) as { protocolo: ProtocoloVisita };
    mesclarProtocolos([json.protocolo]);
    emitir();
    return json.protocolo;
  },

  async buscarProtocoloPorCodigo(codigo: string): Promise<ProtocoloVisita | null> {
    const limpo = codigo.trim().toUpperCase();
    if (!limpo) return null;
    try {
      const res = await fetch(`${API_BASE}/api/v1/protocolos/${encodeURIComponent(limpo)}`);
      if (!res.ok) return null;
      const json = (await res.json()) as { protocolo?: ProtocoloVisita };
      if (json.protocolo) {
        mesclarProtocolos([json.protocolo]);
        emitir();
        return json.protocolo;
      }
    } catch {
      /* fallback para lista em memória */
    }
    return protocolos.find((p) => p.codigo.toUpperCase() === limpo) ?? null;
  },

  async atualizarStatusProtocolo(codigo: string, status: StatusProtocolo): Promise<ProtocoloVisita> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/protocolos/${encodeURIComponent(codigo)}/status`, {
      method: 'PATCH',
      headers: headersAutenticados(undefined, true),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao atualizar protocolo.');
      throw new Error(msg);
    }
    const json = (await res.json()) as { protocolo: ProtocoloVisita };
    mesclarProtocolos([json.protocolo]);
    emitir();
    return json.protocolo;
  },

  // ================= PILAR B: REGULAÇÃO, FILA PÚBLICA & JUDICIÁRIO =================
  async obterFilaPublicaAuditavel(filtros?: {
    etapa?: EtapaId;
    escolaId?: string;
    busca?: string;
  }): Promise<FilaItemAuditavel[]> {
    const sp = new URLSearchParams();
    if (filtros?.etapa) sp.set('etapa', filtros.etapa);
    if (filtros?.escolaId) sp.set('escolaId', filtros.escolaId);
    if (filtros?.busca) sp.set('busca', filtros.busca);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    try {
      const res = await fetch(`${API_BASE}/api/v1/regulacao/fila-publica${qs}`);
      if (res.ok) {
        const json = (await res.json()) as { ok: boolean; fila: FilaItemAuditavel[] };
        if (json.fila && json.fila.length > 0) {
          return json.fila;
        }
      }
    } catch {
      /* fallback se o backend estiver inacessível */
    }
    return filtrarFilaMock(FILA_PUBLICA_FALLBACK, filtros);
  },

  async listarDemandasJudiciais(): Promise<DemandaJudicial[]> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/judicial`, {
      headers: headersAutenticados('secretaria', true),
    });
    if (!res.ok) {
      throw new Error('Falha ao consultar processos judiciais da SEDUC.');
    }
    const json = (await res.json()) as { ok: boolean; demandas: DemandaJudicial[] };
    return json.demandas ?? [];
  },

  async cadastrarDemandaJudicial(dados: {
    numeroProcesso: string;
    vara: string;
    juizPromotor?: string;
    estudanteNome: string;
    responsavelNome: string;
    cpfCertidao: string;
    escolaId: string;
    etapa: EtapaId;
    periodo: Periodo;
    prazoHoras: number;
    multaDiaria?: number;
    observacoes?: string;
  }): Promise<DemandaJudicial> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/judicial`, {
      method: 'POST',
      headers: headersAutenticados('secretaria', true),
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao cadastrar processo judicial.');
      throw new Error(msg);
    }
    const json = (await res.json()) as { ok: boolean; demanda: DemandaJudicial };
    emitir();
    return json.demanda;
  },

  async alocarVagaJudicial(
    demandaId: string,
    justificativa?: string,
  ): Promise<{ demanda: DemandaJudicial; protocoloCodigo: string }> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/judicial/${encodeURIComponent(demandaId)}/alocar`, {
      method: 'POST',
      headers: headersAutenticados('secretaria', true),
      body: JSON.stringify({ justificativa }),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao alocar vaga prioritária judicial.');
      throw new Error(msg);
    }
    const json = (await res.json()) as { ok: boolean; demanda: DemandaJudicial; protocoloCodigo: string };
    emitir();
    return json;
  },

  async obterCertidaoJudicial(demandaId: string): Promise<CertidaoCumprimentoJudicialDTO> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/judicial/${encodeURIComponent(demandaId)}/certidao`, {
      headers: headersAutenticados('secretaria', true),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao gerar certidão de cumprimento judicial.');
      throw new Error(msg);
    }
    const json = (await res.json()) as { ok: boolean; certidao: CertidaoCumprimentoJudicialDTO };
    return json.certidao;
  },

  async listarLogsAuditoria(limite = 100): Promise<LogAuditoria[]> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/auditoria?limite=${limite}`, {
      headers: headersAutenticados('secretaria', true),
    });
    if (!res.ok) {
      throw new Error('Falha ao carregar trilha de auditoria.');
    }
    const json = (await res.json()) as { ok: boolean; logs: LogAuditoria[] };
    return json.logs ?? [];
  },

  async obterStatusWhatsApp(): Promise<{
    provedorAtivo: string;
    totalEnviadas: number;
    totalSucessos: number;
    totalFalhas: number;
    ultimas: Array<{ id: string; telefone: string; codigoProtocolo: string; tipo: string; enviadoEm: number; sucesso: boolean; provedor: string; resposta?: string }>;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/whatsapp/status`, {
      headers: headersAutenticados('secretaria', true),
    });
    if (!res.ok) {
      throw new Error('Falha ao carregar status do gateway de WhatsApp.');
    }
    const json = (await res.json()) as { ok: boolean; metricas: any };
    return json.metricas;
  },

  async dispararTesteWhatsApp(telefone: string): Promise<{ ok: boolean; resposta?: string }> {
    const res = await fetch(`${API_BASE}/api/v1/gestao/whatsapp/teste`, {
      method: 'POST',
      headers: {
        ...headersAutenticados('secretaria', true),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ telefone }),
    });
    if (!res.ok) {
      const msg = await extrairMensagemErro(res, 'Falha ao disparar teste de WhatsApp.');
      throw new Error(msg);
    }
    return (await res.json()) as { ok: boolean; resposta?: string };
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

export function useSessaoSecretaria(): SessaoGestaoDTO | null {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getSessaoSecretaria);
}

export function useSessaoUnidade(): SessaoGestaoDTO | null {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.getSessaoUnidade);
}

export function useStatusApi(): boolean {
  return useSyncExternalStore(vagasStore.subscribe, vagasStore.isApiOnline);
}
