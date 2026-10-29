/**
 * @matricula-aberta/shared
 * Contratos de domínio, DTOs da API e regras puras compartilhadas entre
 * o Monolito Modular (`packages/server`) e o cliente PWA (`packages/web`).
 *
 * Município de implantação: Patos - PB (IBGE 2510808)
 */

export type EtapaId = 'bercario' | 'maternal' | 'pre' | 'fund1' | 'fund2';
export type Periodo = 'integral' | 'parcial';
export type TipoUnidade = 'Creche' | 'CMEI' | 'EMEF';
export type StatusVaga = 'aberta' | 'ultimas' | 'espera';
export type Canal = 'whatsapp' | 'push';
export type TurnoVisita = 'manha' | 'tarde';
export type StatusProtocolo = 'aguardando' | 'atendido' | 'cancelado';

export interface Oferta {
  etapa: EtapaId;
  periodo: Periodo;
  /** Vagas livres agora */
  vagas: number;
  /** Capacidade total da(s) turma(s) desta oferta */
  capacidade: number;
  /** Pessoas na lista de espera */
  fila: number;
}

export interface Escola {
  id: string;
  nome: string;
  tipo: TipoUnidade;
  bairro: string;
  endereco: string;
  telefone: string;
  lat: number;
  lng: number;
  acessivel: boolean;
  destaques: string[];
  atendimento: string;
  ofertas: Oferta[];
  /** Epoch ms da última atualização feita pela unidade */
  atualizadoEm: number;
  /** Quantidade real de alertas ativos para esta unidade/região no banco */
  alertasAtivos?: number;
  /** Quantidade real de protocolos de pré-agendamento aguardando atendimento */
  protocolosPendentes?: number;
}

export interface Local {
  id?: string;
  lat: number;
  lng: number;
  rotulo: string;
  zona?: string;
}

export interface Documento {
  id: string;
  nome: string;
  dica: string;
  emoji: string;
  obrigatorio: boolean;
  etapas?: EtapaId[];
}

export interface Busca {
  nascimento: string | null;
  etapa: EtapaId | null;
  local: Local | null;
  raioKm: number;
  periodo: Periodo | 'tanto-faz';
  soAcessivel: boolean;
}

export interface Resultado {
  escola: Escola;
  oferta: Oferta;
  distanciaKm: number;
  status: StatusVaga;
}

export interface Alerta {
  id: string;
  canal: Canal;
  telefone?: string;
  etapa: EtapaId;
  periodo: Periodo | 'tanto-faz';
  local: Local;
  raioKm: number;
  escolaId?: string;
  escolaNome?: string;
  criadoEm: number;
}

export interface EventoVaga {
  id: string;
  escolaId: string;
  escolaNome: string;
  etapa: EtapaId;
  periodo: Periodo;
  de: number;
  para: number;
  em: number;
  origem: 'escola' | 'protocolo' | 'secretaria';
}

export interface ProtocoloVisita {
  codigo: string;
  escolaId: string;
  escolaNome: string;
  escolaEndereco: string;
  escolaBairro: string;
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
  status: StatusProtocolo;
  criadoEm: number;
  atendidoEm?: number;
}

export interface DemandaBairroDTO {
  bairro: string;
  zona: string;
  unidades: number;
  vagasLivres: number;
  capacidadeTotal: number;
  filaEspera: number;
  alertasAtivos: number;
  protocolosPendentes: number;
  /** Demanda reprimida total = filaEspera + alertasAtivos */
  demandaReprimida: number;
  /** Deficit líquido = max(0, demandaReprimida - vagasLivres) */
  deficitVagas: number;
  statusPressao: 'critico' | 'atencao' | 'equilibrado';
}

export interface ResumoEtapaMacroDTO {
  etapa: EtapaId;
  nome: string;
  vagasLivres: number;
  capacidadeTotal: number;
  filaEspera: number;
  alertasAtivos: number;
  taxaOcupacao: number;
}

export interface PainelSecretariaDTO {
  municipio: string;
  uf: string;
  codigoIbge: string;
  orgao: string;
  geradoEm: number;
  kpis: {
    totalUnidades: number;
    capacidadeRede: number;
    vagasLivres: number;
    taxaOcupacao: number;
    filaEsperaTotal: number;
    alertasAtivosTotal: number;
    protocolosAguardando: number;
    protocolosAtendidos: number;
    unidadesDesatualizadas: number;
  };
  demandaPorBairro: DemandaBairroDTO[];
  resumoPorEtapa: ResumoEtapaMacroDTO[];
  unidadesAtencao: Array<{
    id: string;
    nome: string;
    bairro: string;
    atualizadoEm: number;
    filaTotal: number;
    vagasLivres: number;
  }>;
}

export interface CatalogoMunicipioDTO {
  municipio: string;
  uf: string;
  codigoIbge: string;
  dddPadrao: string;
  orgao: string;
  enderecoSecretaria: string;
  telefoneSecretaria: string;
  centro: Local;
  bairros: Local[];
  documentos: Documento[];
}

export interface SyncFrameDTO {
  tipo: 'sync';
  catalogo?: CatalogoMunicipioDTO;
  escolas: Escola[];
  historico: EventoVaga[];
  protocolos: ProtocoloVisita[];
  secretaria: PainelSecretariaDTO;
  evento?: EventoVaga;
}

export interface EtapaInfo {
  id: EtapaId;
  nome: string;
  emoji: string;
  faixa: string;
  cor: string;
}

export const ETAPAS: Record<EtapaId, EtapaInfo> = {
  bercario: { id: 'bercario', nome: 'Berçário', emoji: '🍼', faixa: '0 a 1 ano', cor: '#FFB4C6' },
  maternal: { id: 'maternal', nome: 'Maternal', emoji: '🧸', faixa: '2 a 3 anos', cor: '#FFD27A' },
  pre: { id: 'pre', nome: 'Pré-escola', emoji: '🖍️', faixa: '4 a 5 anos', cor: '#9BE3C3' },
  fund1: { id: 'fund1', nome: 'Fundamental I', emoji: '✏️', faixa: '1º ao 5º ano', cor: '#A9C8FF' },
  fund2: { id: 'fund2', nome: 'Fundamental II', emoji: '📚', faixa: '6º ao 9º ano', cor: '#CDB8FF' },
};

export const ORDEM_ETAPAS: EtapaId[] = ['bercario', 'maternal', 'pre', 'fund1', 'fund2'];

export function statusDaOferta(o: Pick<Oferta, 'vagas'>): StatusVaga {
  if (o.vagas <= 0) return 'espera';
  if (o.vagas <= 3) return 'ultimas';
  return 'aberta';
}

export const STATUS_INFO: Record<StatusVaga, { rotulo: string; icone: string; frase: (v: number, fila: number) => string }> = {
  aberta: { rotulo: 'Tem vaga', icone: '✅', frase: (v) => `${v} vagas livres` },
  ultimas: { rotulo: 'Últimas vagas', icone: '⚡', frase: (v) => (v === 1 ? 'Só 1 vaga!' : `Só ${v} vagas!`) },
  espera: { rotulo: 'Lista de espera', icone: '⏳', frase: (_v, fila) => `${fila} na fila` },
};

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Gera uma matriz 21x21 determinística com padrões de localização (finder patterns)
 * nos 3 cantos + bits derivados do código do protocolo para renderizar QR Code SVG nítido.
 */
export function gerarMatrizQrCode(texto: string): boolean[][] {
  const N = 21;
  const mat: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  const reservado: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  function desenharFinder(r0: number, c0: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        reservado[rr][cc] = true;
        const bordaExterna = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
        const miolo = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        mat[rr][cc] = bordaExterna || miolo;
      }
    }
  }

  desenharFinder(0, 0);
  desenharFinder(0, N - 7);
  desenharFinder(N - 7, 0);

  // Timing patterns na linha 6 e coluna 6
  for (let i = 8; i < N - 8; i++) {
    reservado[6][i] = true;
    reservado[i][6] = true;
    mat[6][i] = i % 2 === 0;
    mat[i][6] = i % 2 === 0;
  }

  // Hash FNV-1a + LCG determinístico do payload
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (reservado[r][c]) continue;
      h = (Math.imul(h, 1664525) + 1013904223 + r * 31 + c * 17) >>> 0;
      mat[r][c] = ((h >>> 16) & 1) === 1;
    }
  }

  return mat;
}

