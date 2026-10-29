import { statusDaOferta } from './etapas';
import { distanciaKm } from './geo';
import type { Busca, EtapaId, Escola, Resultado, StatusVaga } from './types';

/** Retorna 1 resultado por escola (a melhor oferta compatível), dentro do raio. */
export function buscar(escolas: Escola[], b: Pick<Busca, 'etapa' | 'local' | 'raioKm' | 'periodo' | 'soAcessivel'>): Resultado[] {
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

