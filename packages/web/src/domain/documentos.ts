import type { Documento, EtapaId } from './types';

export type { Documento };

const TODAS: EtapaId[] = ['bercario', 'maternal', 'pre', 'fund1', 'fund2'];

export function documentosPara(catalogoDocs: Documento[], etapa: EtapaId | null): Documento[] {
  return catalogoDocs.filter((d) => (d.etapas ?? TODAS).includes(etapa ?? 'pre'));
}
