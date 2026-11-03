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
export type PerfilGestao = 'secretaria' | 'unidade';

/** Identificador de critérios de vulnerabilidade e prioridade legal regulatória */
export type CriterioVulnerabilidadeId =
  | 'medida_protetiva'
  | 'deficiencia_tea'
  | 'cadunico_bolsafamilia'
  | 'mae_trabalhadora'
  | 'irmao_na_escola';

export interface CriterioVulnerabilidade {
  id: CriterioVulnerabilidadeId;
  nome: string;
  pontos: number;
  descricao: string;
  amparoLegal: string;
  documentoExigido: string;
  icone: string;
}

export const CRITERIOS_VULNERABILIDADE: Record<CriterioVulnerabilidadeId, CriterioVulnerabilidade> = {
  medida_protetiva: {
    id: 'medida_protetiva',
    nome: 'Medida Protetiva / Acolhimento Institucional',
    pontos: 100,
    descricao: 'Criança sob tutela do Conselho Tutelar ou Vara da Infância com medida de proteção ativa.',
    amparoLegal: 'ECA (Lei 8.069/90, arts. 98 e 101) e Marco Legal da 1ª Infância',
    documentoExigido: 'Ofício do Conselho Tutelar ou determinação judicial sigilosa',
    icone: 'shield',
  },
  deficiencia_tea: {
    id: 'deficiencia_tea',
    nome: 'Criança com Deficiência ou TEA (AEE)',
    pontos: 50,
    descricao: 'Estudante público-alvo da Educação Especial (Deficiência Física, Sensorial, Intelectual ou TEA).',
    amparoLegal: 'Lei Brasileira de Inclusão (Lei 13.146/15) e Lei Berenice Piana (Lei 12.764/12)',
    documentoExigido: 'Laudo médico com CID ou parecer multiprofissional da UBS',
    icone: 'heart-pulse',
  },
  cadunico_bolsafamilia: {
    id: 'cadunico_bolsafamilia',
    nome: 'Beneficiário do Bolsa Família / CadÚnico',
    pontos: 30,
    descricao: 'Família inscrita no Cadastro Único com benefício social ativo em Patos - PB.',
    amparoLegal: 'Marco Legal da Primeira Infância (Lei 13.257/16, art. 5º)',
    documentoExigido: 'Comprovante com Número do NIS / Folha Resumo do CadÚnico',
    icone: 'credit-card',
  },
  mae_trabalhadora: {
    id: 'mae_trabalhadora',
    nome: 'Mãe Trabalhadora / Família Monoparental',
    pontos: 25,
    descricao: 'Mãe ou responsável com vínculo empregatício formal, MEI ou autônomo com comprovação.',
    amparoLegal: 'Decreto Municipal de Regulação de Vagas e Incentivo ao Trabalho Feminino',
    documentoExigido: 'Carteira de Trabalho (CTPS), holerite recente ou declaração de trabalho',
    icone: 'briefcase',
  },
  irmao_na_escola: {
    id: 'irmao_na_escola',
    nome: 'Irmão Matriculado na Mesma Unidade',
    pontos: 20,
    descricao: 'Garantia legal de irmãos frequentarem a mesma escola para convivência e facilitação familiar.',
    amparoLegal: 'Estatuto da Criança e do Adolescente (ECA - Lei 8.069/90, art. 53, V)',
    documentoExigido: 'Declaração de matrícula ativa do irmão na unidade escolar',
    icone: 'users',
  },
};

export const LISTA_CRITERIOS_VULNERABILIDADE = Object.values(CRITERIOS_VULNERABILIDADE);

export const ORDEM_ETAPAS: EtapaId[] = ['bercario', 'maternal', 'pre', 'fund1', 'fund2'];
export const PERIODOS_VALIDOS: Periodo[] = ['integral', 'parcial'];
export const CANAIS_VALIDOS: Canal[] = ['whatsapp', 'push'];
export const TURNOS_VISITA_VALIDOS: TurnoVisita[] = ['manha', 'tarde'];
export const STATUS_PROTOCOLO_VALIDOS: StatusProtocolo[] = ['aguardando', 'atendido', 'cancelado'];
export const TIPOS_UNIDADE_VALIDOS: TipoUnidade[] = ['Creche', 'CMEI', 'EMEF'];

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
  /** Token de cancelamento individual emitido ao cidadão titular do alerta */
  tokenCancelamento?: string;
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
  /** Se true, uma vaga física da turma foi debitada e pré-reservada no momento da emissão */
  reservaVaga?: boolean;
  /** Motivo em caso de cancelamento ('expirado_sem_comparecimento', 'cancelado_gestor', 'cancelado_cidadao', etc.) */
  motivoCancelamento?: string;
  /** Posição ordinal na fila de espera caso não haja vaga livre no momento */
  posicaoFila?: number;
  /** Documento do estudante (CPF ou Certidão) para controle de reserva única */
  documentoEstudante?: string;
  /** Token de cancelamento individual para que o titular cancele seu próprio agendamento */
  tokenCancelamento?: string;
  /** Timestamp de envio do lembrete matinal no dia da visita */
  notificadoDiaEm?: number;
  /** Timestamp de envio do lembrete de 1 hora antes do início do turno */
  notificado1hEm?: number;
  /** Critérios de vulnerabilidade e prioridade social atendidos (Pilar B - Regulação) */
  criteriosPrioridade?: CriterioVulnerabilidadeId[];
  /** Total de pontos acumulados nos critérios legais de prioridade */
  pontosPrioridade?: number;
  /** Origem da demanda: regular (cidadão) ou judicial (determinação do MP / Defensoria / Juizado) */
  origem?: 'regular' | 'judicial';
  /** Número do processo eletrônico judicial (PJ-e) caso seja demanda judicial */
  numeroProcessoJudicial?: string;
}

/** Item da Fila Pública Auditável (LGPD Safe - sem vazamento de dados de menores) */
export interface FilaItemAuditavel {
  posicao: number;
  codigo: string;
  estudanteIniciais: string;
  responsavelIniciais: string;
  etapa: EtapaId;
  turma: string;
  periodo: Periodo;
  escolaId: string;
  escolaNome: string;
  escolaBairro: string;
  pontosTotais: number;
  criteriosAtendidos: CriterioVulnerabilidadeId[];
  origem: 'regular' | 'judicial';
  criadoEm: number;
  status: StatusProtocolo;
  reservaVaga: boolean;
}

export type StatusDemandaJudicial = 'pendente' | 'alocado' | 'recurso' | 'cancelado';

/** Demanda Judicial (Mandado de Segurança, Ação Civil Pública ou Liminar da Infância) */
export interface DemandaJudicial {
  id: string;
  numeroProcesso: string;
  vara: string;
  juizPromotor?: string;
  estudanteNome: string;
  responsavelNome: string;
  cpfCertidao: string;
  escolaId: string;
  escolaNome: string;
  etapa: EtapaId;
  periodo: Periodo;
  protocoloCodigo?: string;
  prazoLimiteEm: number;
  multaDiaria?: number;
  status: StatusDemandaJudicial;
  alocadoEm?: number;
  observacoes?: string;
  criadoEm: number;
}

/** Trilha de Auditoria Imutável (Audit Trail para TCE e Ministério Público) */
export interface LogAuditoria {
  id: string;
  operadorUsuario: string;
  operadorPerfil: PerfilGestao | 'sistema' | 'cidadao';
  acao: string;
  protocoloCodigo?: string;
  escolaId?: string;
  justificativa: string;
  detalhes?: Record<string, unknown>;
  ip?: string;
  criadoEm: number;
}

/** Certidão Oficial Eletrônica de Cumprimento de Liminar (Juntada no PJ-e) */
export interface CertidaoCumprimentoJudicialDTO {
  numeroProcesso: string;
  vara: string;
  estudanteNome: string;
  responsavelNome: string;
  cpfCertidaoMascarado: string;
  escolaNome: string;
  escolaEndereco: string;
  etapaNome: string;
  turma: string;
  periodo: Periodo;
  protocoloCodigo: string;
  dataVisita: string;
  turnoVisita: TurnoVisita;
  emitidoEm: number;
  hashAutenticidade: string;
  textoCertidao: string;
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
    protocolosCancelados: number;
    protocolosExpirados: number;
    taxaAbsenteismo: number;
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
  protocolos?: ProtocoloVisita[];
  secretaria?: PainelSecretariaDTO;
  evento?: EventoVaga;
}

export interface SessaoGestaoDTO {
  token: string;
  perfil: PerfilGestao;
  usuario: string;
  escolaId?: string;
  escolaNome?: string;
  expiraEm: number;
}

export interface LoginGestaoRequestDTO {
  perfil: PerfilGestao;
  usuario: string;
  senha: string;
  escolaId?: string;
}

export interface EtapaInfo {
  id: EtapaId;
  nome: string;
  emoji: string;
  faixa: string;
  cor: string;
}

export const ETAPAS: Record<EtapaId, EtapaInfo> = {
  bercario: { id: 'bercario', nome: 'Berçário', emoji: 'bercario', faixa: '0 a 1 ano', cor: '#FFB4C6' },
  maternal: { id: 'maternal', nome: 'Maternal', emoji: 'maternal', faixa: '2 a 3 anos', cor: '#FFD27A' },
  pre: { id: 'pre', nome: 'Pré-escola', emoji: 'pre', faixa: '4 a 5 anos', cor: '#9BE3C3' },
  fund1: { id: 'fund1', nome: 'Fundamental I', emoji: 'fund1', faixa: '1º ao 5º ano', cor: '#A9C8FF' },
  fund2: { id: 'fund2', nome: 'Fundamental II', emoji: 'fund2', faixa: '6º ao 9º ano', cor: '#CDB8FF' },
};

export function statusDaOferta(o: Pick<Oferta, 'vagas'>): StatusVaga {
  if (o.vagas <= 0) return 'espera';
  if (o.vagas <= 3) return 'ultimas';
  return 'aberta';
}

export const STATUS_INFO: Record<StatusVaga, { rotulo: string; icone: string; frase: (v: number, fila: number) => string }> = {
  aberta: { rotulo: 'Tem vaga', icone: 'check-circle', frase: (v) => `${v} vagas livres` },
  ultimas: { rotulo: 'Últimas vagas', icone: 'bolt', frase: (v) => (v === 1 ? 'Só 1 vaga!' : `Só ${v} vagas!`) },
  espera: { rotulo: 'Lista de espera', icone: 'hourglass', frase: (_v, fila) => `${fila} na fila` },
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

/** Ano letivo para o qual a matrícula está aberta (a partir de agosto, ano seguinte). */
export function anoLetivo(hoje = new Date()): number {
  return hoje.getMonth() >= 7 ? hoje.getFullYear() + 1 : hoje.getFullYear();
}

/** Formata data no fuso horário local (YYYY-MM-DD), evitando desvio UTC à noite no Brasil (UTC-3). */
export function dataLocalISO(d = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Retorna o próximo dia útil no formato YYYY-MM-DD considerando o fuso local. */
export function proximoDiaUtilISO(diasAdiantados = 1, base = new Date()): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + diasAdiantados);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return dataLocalISO(d);
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

/** Idade completa em uma data de referência. */
export function idadeEm(nascimento: Date, ref: Date): { anos: number; meses: number } {
  let meses = (ref.getFullYear() - nascimento.getFullYear()) * 12 + (ref.getMonth() - nascimento.getMonth());
  if (ref.getDate() < nascimento.getDate()) meses -= 1;
  return { anos: Math.floor(meses / 12), meses };
}

export type ResultadoEtapa =
  | { ok: true; etapa: EtapaId; turma: string; idadeCorte: number; ano: number }
  | { ok: false; motivo: string };

/**
 * Calcula a etapa de ensino pela data de corte de 31 de março do ano letivo
 * (regra nacional – Resolução CNE/CEB nº 2/2018).
 */
export function calcularEtapa(nascimentoISO: string, hoje = new Date()): ResultadoEtapa {
  const nasc = new Date(nascimentoISO + 'T12:00:00');
  if (Number.isNaN(nasc.getTime())) return { ok: false, motivo: 'Data inválida.' };
  if (nasc > hoje) return { ok: false, motivo: 'Essa data ainda não chegou. Confira o ano.' };

  const ano = anoLetivo(hoje);
  const corte = new Date(ano, 2, 31, 12);
  const { anos, meses } = idadeEm(nasc, corte);

  if (meses < 4) {
    return {
      ok: false,
      motivo: 'As creches atendem bebês a partir de 4 meses até 31 de março.',
    };
  }
  if (anos <= 1) return { ok: true, etapa: 'bercario', turma: anos === 0 ? 'Berçário I' : 'Berçário II', idadeCorte: anos, ano };
  if (anos <= 3) return { ok: true, etapa: 'maternal', turma: anos === 2 ? 'Maternal I' : 'Maternal II', idadeCorte: anos, ano };
  if (anos <= 5) return { ok: true, etapa: 'pre', turma: anos === 4 ? 'Pré I' : 'Pré II', idadeCorte: anos, ano };
  if (anos <= 10) return { ok: true, etapa: 'fund1', turma: `${anos - 5}º ano`, idadeCorte: anos, ano };
  if (anos <= 14) return { ok: true, etapa: 'fund2', turma: `${anos - 5}º ano`, idadeCorte: anos, ano };

  return {
    ok: false,
    motivo: 'Para 15 anos ou mais, procure o Ensino Médio (rede estadual) ou a EJA.',
  };
}

/** Retorna 1 resultado por escola (a melhor oferta compatível), dentro do raio. */
export function buscar(
  escolas: Escola[],
  b: Pick<Busca, 'etapa' | 'local' | 'raioKm' | 'periodo' | 'soAcessivel'>,
): Resultado[] {
  if (!b.etapa || !b.local) return [];
  const out: Resultado[] = [];
  for (const escola of escolas) {
    if (b.soAcessivel && !escola.acessivel) continue;
    const ofertas = escola.ofertas.filter(
      (o) => o.etapa === b.etapa && (b.periodo === 'tanto-faz' || o.periodo === b.periodo),
    );
    if (!ofertas.length) continue;
    const distancia = distanciaKm(b.local, escola);
    if (distancia > b.raioKm) continue;
    const oferta = ofertas.reduce((a, c) => (c.vagas > a.vagas || (c.vagas === a.vagas && c.fila < a.fila) ? c : a));
    out.push({ escola, oferta, distanciaKm: distancia, status: statusDaOferta(oferta) });
  }
  return out;
}

export function resumo(rs: Resultado[]) {
  const cont: Record<StatusVaga, number> = { aberta: 0, ultimas: 0, espera: 0 };
  let vagas = 0;
  for (const r of rs) {
    cont[r.status]++;
    vagas += r.oferta.vagas;
  }
  return { ...cont, vagas, total: rs.length, comVaga: cont.aberta + cont.ultimas };
}

/** Vagas totais por etapa na cidade inteira — o "pulso" da rede. */
export function pulsoDaCidade(escolas: Escola[]) {
  const m: Record<EtapaId, { vagas: number; capacidade: number; escolasComVaga: number }> = {
    bercario: { vagas: 0, capacidade: 0, escolasComVaga: 0 },
    maternal: { vagas: 0, capacidade: 0, escolasComVaga: 0 },
    pre: { vagas: 0, capacidade: 0, escolasComVaga: 0 },
    fund1: { vagas: 0, capacidade: 0, escolasComVaga: 0 },
    fund2: { vagas: 0, capacidade: 0, escolasComVaga: 0 },
  };
  for (const e of escolas) {
    const vistos = new Set<EtapaId>();
    for (const o of e.ofertas) {
      m[o.etapa].vagas += o.vagas;
      m[o.etapa].capacidade += o.capacidade;
      if (o.vagas > 0 && !vistos.has(o.etapa)) {
        m[o.etapa].escolasComVaga++;
        vistos.add(o.etapa);
      }
    }
  }
  return m;
}

export function documentosPara(catalogoDocs: Documento[], etapa: EtapaId | null): Documento[] {
  return catalogoDocs.filter((d) => (d.etapas ?? ORDEM_ETAPAS).includes(etapa ?? 'pre'));
}

/**
 * Retorna os horários oficiais de funcionamento de cada turno na Rede Municipal de Patos-PB:
 * - Manhã: 07h30 às 11h30 (com tolerância até 12h30 para encerramento do turno)
 * - Tarde: 13h30 às 17h00 (com tolerância até 18h00 para encerramento do turno)
 */
export function horarioTurnoVisita(turno: TurnoVisita): {
  inicio: string;
  fim: string;
  toleranciaExpira: string;
  horaInicio: number;
  minutoInicio: number;
  horaLimite: number;
  minutoLimite: number;
} {
  if (turno === 'manha') {
    return {
      inicio: '07:30',
      fim: '11:30',
      toleranciaExpira: '12:30',
      horaInicio: 7,
      minutoInicio: 30,
      horaLimite: 12,
      minutoLimite: 30,
    };
  }
  return {
    inicio: '13:30',
    fim: '17:00',
    toleranciaExpira: '18:00',
    horaInicio: 13,
    minutoInicio: 30,
    horaLimite: 18,
    minutoLimite: 0,
  };
}

/**
 * Avalia se um protocolo com status 'aguardando' já excedeu o prazo de comparecimento
 * presencial e deve ter sua vaga devolvida para a rede escolar.
 */
export function verificarProtocoloExpirado(
  protocolo: Pick<ProtocoloVisita, 'dataVisita' | 'turnoVisita' | 'status'>,
  agora = new Date(),
): boolean {
  if (protocolo.status !== 'aguardando') return false;

  const hojeISO = dataLocalISO(agora);
  // Se a data de visita já passou (dias anteriores)
  if (protocolo.dataVisita < hojeISO) return true;
  // Se a data de visita ainda é no futuro (dias seguintes)
  if (protocolo.dataVisita > hojeISO) return false;

  // Se a data é hoje, verifica o horário limite com tolerância do turno
  const { horaLimite, minutoLimite } = horarioTurnoVisita(protocolo.turnoVisita);
  const horaAtual = agora.getHours();
  const minAtual = agora.getMinutes();

  if (horaAtual > horaLimite) return true;
  if (horaAtual === horaLimite && minAtual >= minutoLimite) return true;

  return false;
}

/** Formata CPF ou número de certidão de nascimento */
export function formatarCpfOuCertidao(valor: string): string {
  const d = valor.replace(/\D/g, '');
  if (d.length <= 11) {
    // Formato CPF: 000.000.000-00
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  // Certidão de nascimento nova (32 dígitos) ou termo
  if (d.length > 32) return d.slice(0, 32);
  return d;
}

/** Mascara CPF ou certidão para exibição segura (LGPD) */
export function mascararDocumentoEstudante(valor?: string | null): string {
  if (!valor) return '';
  const limpo = valor.trim();
  const d = limpo.replace(/\D/g, '');
  if (d.length === 11) {
    return `${d.slice(0, 3)}.•••.•••-${d.slice(9)}`;
  }
  if (d.length > 8) {
    return `${d.slice(0, 4)}••••••••${d.slice(-4)}`;
  }
  return limpo.length > 4 ? `${limpo.slice(0, 2)}••••${limpo.slice(-2)}` : '••••';
}

/** Converte matriz de dados em string CSV com escape de caracteres */
export function gerarCsv(cabecalhos: string[], linhas: Array<Array<string | number>>): string {
  const escapar = (val: string | number) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const cabecalhoLinha = cabecalhos.map(escapar).join(';');
  const corpo = linhas.map((l) => l.map(escapar).join(';')).join('\r\n');
  return `\uFEFF${cabecalhoLinha}\r\n${corpo}`;
}

/** Calcula pontuação regulatória somando os critérios legais de vulnerabilidade */
export function calcularPontuacaoVulnerabilidade(criterios?: CriterioVulnerabilidadeId[]): number {
  if (!Array.isArray(criterios) || criterios.length === 0) return 0;
  const unicos = new Set(criterios);
  let soma = 0;
  for (const c of unicos) {
    if (CRITERIOS_VULNERABILIDADE[c]) {
      soma += CRITERIOS_VULNERABILIDADE[c].pontos;
    }
  }
  return soma;
}

/** Extrai as iniciais do nome para divulgação em conformidade estrita com a LGPD e ECA (ex: "Maria Clara Silva" -> "M. C. S.") */
export function iniciaisNome(nomeCompleto?: string | null): string {
  if (!nomeCompleto) return '---';
  const partes = nomeCompleto
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !['de', 'da', 'do', 'dos', 'das', 'e'].includes(p.toLowerCase()));
  if (partes.length === 0) return '---';
  return partes.map((p) => `${p[0].toUpperCase()}.`).join(' ');
}

/** Formata número de processo judicial no padrão CNJ (0000000-00.0000.0.00.0000) */
export function mascararProcessoCNJ(numero?: string | null): string {
  if (!numero) return '';
  const d = numero.replace(/\D/g, '');
  if (d.length === 20) {
    return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
  }
  return numero.trim();
}



