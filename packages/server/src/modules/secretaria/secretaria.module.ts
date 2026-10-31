import {
  ETAPAS,
  ORDEM_ETAPAS,
  type DemandaBairroDTO,
  type PainelSecretariaDTO,
  type ResumoEtapaMacroDTO,
} from '../../../../shared/src/index.ts';
import { listarAlertas } from '../alertas/alertas.module.ts';
import { listarBairrosPatos, MUNICIPIO_PATOS_META } from '../catalogo/catalogo.module.ts';
import { listarProtocolos } from '../protocolos/protocolos.module.ts';
import { listarEscolas } from '../unidades/unidades.module.ts';

const LIMITE_DESATUALIZADA_MS = 48 * 3600 * 1000;

export async function obterPainelSecretariaPatos(): Promise<PainelSecretariaDTO> {
  const agora = Date.now();
  const [escolas, bairros, alertas, protocolos] = await Promise.all([
    listarEscolas(),
    listarBairrosPatos(),
    listarAlertas(),
    listarProtocolos(),
  ]);

  let capacidadeRede = 0;
  let vagasLivres = 0;
  let filaEsperaTotal = 0;
  let unidadesDesatualizadas = 0;

  for (const e of escolas) {
    if (agora - e.atualizadoEm > LIMITE_DESATUALIZADA_MS) {
      unidadesDesatualizadas++;
    }
    for (const o of e.ofertas) {
      capacidadeRede += o.capacidade;
      vagasLivres += o.vagas;
      filaEsperaTotal += o.fila;
    }
  }

  const ocupadas = Math.max(0, capacidadeRede - vagasLivres);
  const taxaOcupacao = capacidadeRede > 0 ? Math.round((ocupadas / capacidadeRede) * 1000) / 10 : 0;

  const protocolosAguardando = protocolos.filter((p) => p.status === 'aguardando').length;
  const protocolosAtendidos = protocolos.filter((p) => p.status === 'atendido').length;

  // Demanda reprimida e equilíbrio por bairro de Patos-PB
  const mapaBairro = new Map<string, DemandaBairroDTO>();
  for (const b of bairros) {
    mapaBairro.set(b.rotulo, {
      bairro: b.rotulo,
      zona: b.zona ?? 'Zona Urbana',
      unidades: 0,
      vagasLivres: 0,
      capacidadeTotal: 0,
      filaEspera: 0,
      alertasAtivos: 0,
      protocolosPendentes: 0,
      demandaReprimida: 0,
      deficitVagas: 0,
      statusPressao: 'equilibrado',
    });
  }

  for (const e of escolas) {
    const item = mapaBairro.get(e.bairro) ?? {
      bairro: e.bairro,
      zona: 'Zona Urbana',
      unidades: 0,
      vagasLivres: 0,
      capacidadeTotal: 0,
      filaEspera: 0,
      alertasAtivos: 0,
      protocolosPendentes: 0,
      demandaReprimida: 0,
      deficitVagas: 0,
      statusPressao: 'equilibrado' as const,
    };
    item.unidades++;
    item.protocolosPendentes += e.protocolosPendentes ?? 0;
    for (const o of e.ofertas) {
      item.vagasLivres += o.vagas;
      item.capacidadeTotal += o.capacidade;
      item.filaEspera += o.fila;
    }
    mapaBairro.set(e.bairro, item);
  }

  for (const a of alertas) {
    const rotuloBairro = a.local.rotulo;
    const item = mapaBairro.get(rotuloBairro);
    if (item) {
      item.alertasAtivos++;
    }
  }

  const demandaPorBairro: DemandaBairroDTO[] = Array.from(mapaBairro.values())
    .filter((b) => b.unidades > 0 || b.alertasAtivos > 0)
    .map((b) => {
      const demandaReprimida = b.filaEspera + b.alertasAtivos;
      const deficitVagas = Math.max(0, demandaReprimida - b.vagasLivres);
      const statusPressao: DemandaBairroDTO['statusPressao'] =
        deficitVagas >= 4 || (b.filaEspera > 0 && b.vagasLivres <= 4)
          ? 'critico'
          : demandaReprimida > 0
            ? 'atencao'
            : 'equilibrado';
      return {
        ...b,
        demandaReprimida,
        deficitVagas,
        statusPressao,
      };
    })
    .sort((a, b) => b.demandaReprimida - a.demandaReprimida || b.filaEspera - a.filaEspera);

  // Resumo por etapa de ensino na rede municipal de Patos-PB
  const resumoPorEtapa: ResumoEtapaMacroDTO[] = ORDEM_ETAPAS.map((etapa) => {
    let vLivres = 0;
    let cap = 0;
    let fila = 0;
    for (const e of escolas) {
      for (const o of e.ofertas) {
        if (o.etapa !== etapa) continue;
        vLivres += o.vagas;
        cap += o.capacidade;
        fila += o.fila;
      }
    }
    const alertasEtapa = alertas.filter((a) => a.etapa === etapa).length;
    const tx = cap > 0 ? Math.round(((cap - vLivres) / cap) * 1000) / 10 : 0;
    return {
      etapa,
      nome: ETAPAS[etapa].nome,
      vagasLivres: vLivres,
      capacidadeTotal: cap,
      filaEspera: fila,
      alertasAtivos: alertasEtapa,
      taxaOcupacao: tx,
    };
  });

  const unidadesAtencao = escolas
    .map((e) => ({
      id: e.id,
      nome: e.nome,
      bairro: e.bairro,
      atualizadoEm: e.atualizadoEm,
      filaTotal: e.ofertas.reduce((s, o) => s + o.fila, 0),
      vagasLivres: e.ofertas.reduce((s, o) => s + o.vagas, 0),
    }))
    .filter((u) => u.filaTotal > 0 || agora - u.atualizadoEm > LIMITE_DESATUALIZADA_MS)
    .sort((a, b) => b.filaTotal - a.filaTotal || a.atualizadoEm - b.atualizadoEm);

  return {
    municipio: MUNICIPIO_PATOS_META.municipio,
    uf: MUNICIPIO_PATOS_META.uf,
    codigoIbge: MUNICIPIO_PATOS_META.codigoIbge,
    orgao: MUNICIPIO_PATOS_META.orgao,
    geradoEm: agora,
    kpis: {
      totalUnidades: escolas.length,
      capacidadeRede,
      vagasLivres,
      taxaOcupacao,
      filaEsperaTotal,
      alertasAtivosTotal: alertas.length,
      protocolosAguardando,
      protocolosAtendidos,
      unidadesDesatualizadas,
    },
    demandaPorBairro,
    resumoPorEtapa,
    unidadesAtencao,
  };
}

