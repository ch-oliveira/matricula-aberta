import { randomUUID } from 'node:crypto';
import {
  distanciaKm,
  type Escola,
  type EtapaId,
  type EventoVaga,
  type Oferta,
  type Periodo,
  type TipoUnidade,
} from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';

const min = (m: number) => Date.now() - m * 60_000;
const hora = (h: number) => Date.now() - h * 3_600_000;

export function construirUnidadesPatosInicial(): Escola[] {
  return [
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
      atualizadoEm: hora(60), // > 48h para demonstrar monitoramento de atualização na Secretaria
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
}

export async function popularUnidadesPatos(forcarReset = false): Promise<void> {
  const rowCount = await db.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM escolas');
  const count = Number(rowCount?.c ?? 0);
  if (count > 0 && !forcarReset) return;

  await db.transaction(async (tx) => {
    if (forcarReset) {
      await tx.execute('DELETE FROM ofertas');
      await tx.execute('DELETE FROM escolas');
      await tx.execute('DELETE FROM historico_vagas');
    }
    for (const esc of construirUnidadesPatosInicial()) {
      await tx.execute(
        `INSERT INTO escolas (id, nome, tipo, bairro, endereco, telefone, lat, lng, acessivel, destaques_json, atendimento, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           nome = EXCLUDED.nome,
           tipo = EXCLUDED.tipo,
           bairro = EXCLUDED.bairro,
           endereco = EXCLUDED.endereco,
           telefone = EXCLUDED.telefone,
           lat = EXCLUDED.lat,
           lng = EXCLUDED.lng,
           acessivel = EXCLUDED.acessivel,
           destaques_json = EXCLUDED.destaques_json,
           atendimento = EXCLUDED.atendimento,
           atualizado_em = EXCLUDED.atualizado_em`,
        [
          esc.id,
          esc.nome,
          esc.tipo,
          esc.bairro,
          esc.endereco,
          esc.telefone,
          esc.lat,
          esc.lng,
          esc.acessivel ? 1 : 0,
          JSON.stringify(esc.destaques),
          esc.atendimento,
          esc.atualizadoEm,
        ],
      );

      for (const of of esc.ofertas) {
        await tx.execute(
          `INSERT INTO ofertas (escola_id, etapa, periodo, vagas, capacidade, fila)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (escola_id, etapa, periodo) DO UPDATE SET
             vagas = EXCLUDED.vagas,
             capacidade = EXCLUDED.capacidade,
             fila = EXCLUDED.fila`,
          [esc.id, of.etapa, of.periodo, of.vagas, of.capacidade, of.fila],
        );
      }
    }
  });
}

export async function listarEscolas(): Promise<Escola[]> {
  const [rowsEscolas, rowsOfertas, rowsAlertas, rowsProtPendentes] = await Promise.all([
    db.query<{
      id: string;
      nome: string;
      tipo: TipoUnidade;
      bairro: string;
      endereco: string;
      telefone: string;
      lat: number;
      lng: number;
      acessivel: number;
      destaques_json: string;
      atendimento: string;
      atualizado_em: number;
    }>('SELECT * FROM escolas ORDER BY nome ASC'),
    db.query<{
      escola_id: string;
      etapa: EtapaId;
      periodo: Periodo;
      vagas: number;
      capacidade: number;
      fila: number;
    }>('SELECT * FROM ofertas'),
    db.query<{
      etapa: EtapaId;
      periodo: string;
      local_lat: number;
      local_lng: number;
      raio_km: number;
      escola_id: string | null;
    }>('SELECT etapa, periodo, local_lat, local_lng, raio_km, escola_id FROM alertas WHERE expira_em > $1', [Date.now()]),
    db.query<{ escola_id: string; c: number }>(
      "SELECT escola_id, COUNT(*) as c FROM protocolos_visita WHERE status = 'aguardando' GROUP BY escola_id",
    ),
  ]);

  const protPorEscola = new Map<string, number>();
  for (const r of rowsProtPendentes) protPorEscola.set(r.escola_id, Number(r.c));

  const porEscola = new Map<string, Oferta[]>();
  for (const r of rowsOfertas) {
    const lista = porEscola.get(r.escola_id) ?? [];
    lista.push({
      etapa: r.etapa,
      periodo: r.periodo,
      vagas: Number(r.vagas),
      capacidade: Number(r.capacidade),
      fila: Number(r.fila),
    });
    porEscola.set(r.escola_id, lista);
  }

  return rowsEscolas.map((e) => {
    const ofertas = porEscola.get(e.id) ?? [];
    const etapasDaEscola = new Set(ofertas.map((o) => o.etapa));

    // Contagem real de alertas no banco compatíveis com esta unidade
    let alertasCompativeis = 0;
    for (const a of rowsAlertas) {
      if (!etapasDaEscola.has(a.etapa)) continue;
      if (a.escola_id) {
        if (a.escola_id === e.id) alertasCompativeis++;
      } else {
        const d = distanciaKm({ lat: Number(a.local_lat), lng: Number(a.local_lng) }, { lat: Number(e.lat), lng: Number(e.lng) });
        if (d <= Number(a.raio_km)) alertasCompativeis++;
      }
    }

    return {
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      bairro: e.bairro,
      endereco: e.endereco,
      telefone: e.telefone,
      lat: Number(e.lat),
      lng: Number(e.lng),
      acessivel: Boolean(e.acessivel),
      destaques: JSON.parse(e.destaques_json) as string[],
      atendimento: e.atendimento,
      atualizadoEm: Number(e.atualizado_em),
      ofertas,
      alertasAtivos: alertasCompativeis,
      protocolosPendentes: protPorEscola.get(e.id) ?? 0,
    };
  });
}

export async function listarHistorico(limite = 40): Promise<EventoVaga[]> {
  const rows = await db.query<{
    id: string;
    escola_id: string;
    escola_nome: string;
    etapa: EtapaId;
    periodo: Periodo;
    de: number;
    para: number;
    em: number;
    origem: EventoVaga['origem'];
  }>('SELECT * FROM historico_vagas ORDER BY em DESC LIMIT $1', [limite]);

  return rows.map((r) => ({
    id: r.id,
    escolaId: r.escola_id,
    escolaNome: r.escola_nome,
    etapa: r.etapa,
    periodo: r.periodo,
    de: Number(r.de),
    para: Number(r.para),
    em: Number(r.em),
    origem: r.origem,
  }));
}

export async function atualizarOfertaUnidade(params: {
  escolaId: string;
  etapa: EtapaId;
  periodo: Periodo;
  vagas?: number;
  fila?: number;
  origem?: EventoVaga['origem'];
}): Promise<{ escola: Escola | null; evento: EventoVaga | null }> {
  const atual = await db.queryOne<{ vagas: number; capacidade: number; fila: number; escola_nome: string }>(
    `SELECT o.vagas, o.capacidade, o.fila, e.nome as escola_nome
     FROM ofertas o
     JOIN escolas e ON e.id = o.escola_id
     WHERE o.escola_id = $1 AND o.etapa = $2 AND o.periodo = $3`,
    [params.escolaId, params.etapa, params.periodo],
  );

  if (!atual) return { escola: null, evento: null };

  const vagasAtual = Number(atual.vagas);
  const capacidadeAtual = Number(atual.capacidade);
  const filaAtual = Number(atual.fila);

  const novasVagas =
    params.vagas !== undefined ? Math.max(0, Math.min(capacidadeAtual, Math.round(params.vagas))) : vagasAtual;
  const novaFila = params.fila !== undefined ? Math.max(0, Math.round(params.fila)) : filaAtual;
  const agora = Date.now();
  let evento: EventoVaga | null = null;

  await db.transaction(async (tx) => {
    await tx.execute(
      'UPDATE ofertas SET vagas = $1, fila = $2 WHERE escola_id = $3 AND etapa = $4 AND periodo = $5',
      [novasVagas, novaFila, params.escolaId, params.etapa, params.periodo],
    );
    await tx.execute('UPDATE escolas SET atualizado_em = $1 WHERE id = $2', [agora, params.escolaId]);

    if (novasVagas !== vagasAtual) {
      evento = {
        id: randomUUID(),
        escolaId: params.escolaId,
        escolaNome: atual.escola_nome,
        etapa: params.etapa,
        periodo: params.periodo,
        de: vagasAtual,
        para: novasVagas,
        em: agora,
        origem: params.origem ?? 'escola',
      };
      await tx.execute(
        `INSERT INTO historico_vagas (id, escola_id, escola_nome, etapa, periodo, de, para, em, origem)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          evento.id,
          evento.escolaId,
          evento.escolaNome,
          evento.etapa,
          evento.periodo,
          evento.de,
          evento.para,
          evento.em,
          evento.origem,
        ],
      );
    }
  });

  const todas = await listarEscolas();
  const escola = todas.find((e) => e.id === params.escolaId) ?? null;
  return { escola, evento };
}

export async function confirmarUnidade(escolaId: string): Promise<boolean> {
  const res = await db.execute('UPDATE escolas SET atualizado_em = $1 WHERE id = $2', [Date.now(), escolaId]);
  return res.changes > 0;
}

