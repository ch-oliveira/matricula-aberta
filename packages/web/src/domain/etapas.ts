import {
  ETAPAS,
  ORDEM_ETAPAS,
  STATUS_INFO,
  statusDaOferta,
  type EtapaId,
  type EtapaInfo,
} from './types';

export { ETAPAS, ORDEM_ETAPAS, STATUS_INFO, statusDaOferta, type EtapaInfo };

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
