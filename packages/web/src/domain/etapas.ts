import type { EtapaId, Oferta, StatusVaga } from './types';

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

export const ORDEM_ETAPAS: EtapaId[] = ['bercario', 'maternal', 'pre', 'fund1', 'fund2'];

/** Ano letivo para o qual a matrícula está aberta. */
export function anoLetivo(hoje = new Date()): number {
  // A partir de agosto, as matrículas são para o ano seguinte.
  return hoje.getMonth() >= 7 ? hoje.getFullYear() + 1 : hoje.getFullYear();
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
    return { ok: false, motivo: 'As creches recebem bebês a partir de 4 meses. Você pode criar um alerta para ser avisado(a) quando chegar a hora!' };
  }
  if (anos >= 15) {
    return { ok: false, motivo: 'A partir de 15 anos o atendimento é no Ensino Médio (rede estadual) ou EJA. Procure a Secretaria Estadual de Educação.' };
  }

  const turmas: [number, EtapaId, string][] = [
    [0, 'bercario', 'Berçário I'],
    [1, 'bercario', 'Berçário II'],
    [2, 'maternal', 'Maternal I'],
    [3, 'maternal', 'Maternal II'],
    [4, 'pre', 'Pré I'],
    [5, 'pre', 'Pré II'],
    [6, 'fund1', '1º ano'],
    [7, 'fund1', '2º ano'],
    [8, 'fund1', '3º ano'],
    [9, 'fund1', '4º ano'],
    [10, 'fund1', '5º ano'],
    [11, 'fund2', '6º ano'],
    [12, 'fund2', '7º ano'],
    [13, 'fund2', '8º ano'],
    [14, 'fund2', '9º ano'],
  ];
  const [, etapa, turma] = turmas.find(([a]) => a === anos)!;
  return { ok: true, etapa, turma, idadeCorte: anos, ano };
}

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

