import { randomInt } from 'node:crypto';
import {
  proximoDiaUtilISO,
  type EtapaId,
  type EventoVaga,
  type Periodo,
  type ProtocoloVisita,
  type StatusProtocolo,
  type TurnoVisita,
} from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';
import { mascararTelefoneLGPD } from '../alertas/alertas.module.ts';
import { atualizarOfertaUnidade } from '../unidades/unidades.module.ts';

interface LinhaProtocoloDB {
  codigo: string;
  escola_id: string;
  escola_nome: string;
  escola_endereco: string;
  escola_bairro: string;
  etapa: EtapaId;
  turma: string;
  periodo: Periodo;
  responsavel: string;
  telefone_mascarado: string | null;
  nascimento: string | null;
  turno_visita: TurnoVisita;
  data_visita: string;
  documentos_json: string;
  total_obrigatorios: number;
  status: StatusProtocolo;
  criado_em: number;
  atendido_em: number | null;
}

function mapearLinhaProtocolo(r: LinhaProtocoloDB): ProtocoloVisita {
  let docs: string[] = [];
  try {
    const parsed = JSON.parse(r.documentos_json);
    if (Array.isArray(parsed)) docs = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    docs = [];
  }

  return {
    codigo: r.codigo,
    escolaId: r.escola_id,
    escolaNome: r.escola_nome,
    escolaEndereco: r.escola_endereco,
    escolaBairro: r.escola_bairro,
    etapa: r.etapa,
    turma: r.turma,
    periodo: r.periodo,
    responsavel: r.responsavel,
    telefone: r.telefone_mascarado ?? undefined,
    nascimento: r.nascimento ?? undefined,
    turnoVisita: r.turno_visita,
    dataVisita: r.data_visita,
    documentosMarcados: docs,
    totalObrigatorios: r.total_obrigatorios,
    status: r.status,
    criadoEm: r.criado_em,
    atendidoEm: r.atendido_em ?? undefined,
  };
}

async function gerarCodigoProtocolo(): Promise<string> {
  const agora = new Date();
  const ano = agora.getMonth() >= 7 ? agora.getFullYear() + 1 : agora.getFullYear();
  for (let tent = 0; tent < 30; tent++) {
    const num = randomInt(1000, 10000);
    const codigo = `PATOS-${ano}-${num}`;
    const existe = await db.queryOne('SELECT 1 FROM protocolos_visita WHERE codigo = $1', [codigo]);
    if (!existe) return codigo;
  }
  return `PATOS-${ano}-${randomInt(10000, 99999)}`;
}

export async function garantirSeedProtocolosPatos(forcarReset = false): Promise<void> {
  const rowCount = await db.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM protocolos_visita');
  const count = Number(rowCount?.c ?? 0);
  if (count > 0 && !forcarReset) return;

  if (forcarReset) {
    await db.execute('DELETE FROM protocolos_visita');
  }

  const agora = Date.now();
  const amanha = proximoDiaUtilISO(1);
  const depois = proximoDiaUtilISO(2);

  const iniciais: ProtocoloVisita[] = [
    {
      codigo: 'PATOS-2027-4821',
      escolaId: 'creche-manoel-quinidio',
      escolaNome: 'Creche Municipal Manoel Quinídio Sobrinho',
      escolaEndereco: 'Rua Manoel Mota, 340 – Jatobá, Patos - PB',
      escolaBairro: 'Jatobá',
      etapa: 'bercario',
      turma: 'Berçário II',
      periodo: 'integral',
      responsavel: 'Maria Francisca Medeiros',
      telefone: '(83) 9••••-4102',
      nascimento: '2025-06-14',
      turnoVisita: 'manha',
      dataVisita: amanha,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'sus'],
      totalObrigatorios: 7,
      status: 'aguardando',
      criadoEm: agora - 42 * 60_000,
    },
    {
      codigo: 'PATOS-2027-5190',
      escolaId: 'emef-monsenhor-manoel-vieira',
      escolaNome: 'EMEF Monsenhor Manoel Vieira',
      escolaEndereco: 'Praça Edvaldo Mota, 85 – Centro, Patos - PB',
      escolaBairro: 'Centro',
      etapa: 'fund1',
      turma: '1º ano',
      periodo: 'parcial',
      responsavel: 'José Severino Wanderley',
      telefone: '(83) 9••••-8831',
      nascimento: '2020-09-22',
      turnoVisita: 'tarde',
      dataVisita: amanha,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'historico'],
      totalObrigatorios: 7,
      status: 'aguardando',
      criadoEm: agora - 75 * 60_000,
    },
    {
      codigo: 'PATOS-2027-6034',
      escolaId: 'creche-maria-eunice',
      escolaNome: 'Creche Municipal Maria Eunice',
      escolaEndereco: 'Rua Pedro Firmino, 620 – Maternidade, Patos - PB',
      escolaBairro: 'Maternidade',
      etapa: 'maternal',
      turma: 'Maternal I',
      periodo: 'integral',
      responsavel: 'Ana Lúcia Nóbrega',
      telefone: '(83) 9••••-1940',
      nascimento: '2024-02-10',
      turnoVisita: 'manha',
      dataVisita: depois,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'sus'],
      totalObrigatorios: 7,
      status: 'aguardando',
      criadoEm: agora - 110 * 60_000,
    },
    {
      codigo: 'PATOS-2027-3910',
      escolaId: 'creche-manoel-quinidio',
      escolaNome: 'Creche Municipal Manoel Quinídio Sobrinho',
      escolaEndereco: 'Rua Manoel Mota, 340 – Jatobá, Patos - PB',
      escolaBairro: 'Jatobá',
      etapa: 'maternal',
      turma: 'Maternal II',
      periodo: 'integral',
      responsavel: 'Carlos Eduardo Leite',
      telefone: '(83) 9••••-7712',
      nascimento: '2023-05-03',
      turnoVisita: 'manha',
      dataVisita: amanha,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'sus'],
      totalObrigatorios: 7,
      status: 'atendido',
      criadoEm: agora - 240 * 60_000,
      atendidoEm: agora - 90 * 60_000,
    },
  ];

  for (const p of iniciais) {
    await db.execute(
      `INSERT INTO protocolos_visita (
        codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
        etapa, turma, periodo, responsavel, telefone_mascarado, nascimento,
        turno_visita, data_visita, documentos_json, total_obrigatorios,
        status, criado_em, atendido_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (codigo) DO NOTHING`,
      [
        p.codigo,
        p.escolaId,
        p.escolaNome,
        p.escolaEndereco,
        p.escolaBairro,
        p.etapa,
        p.turma,
        p.periodo,
        p.responsavel,
        p.telefone ?? null,
        p.nascimento ?? null,
        p.turnoVisita,
        p.dataVisita,
        JSON.stringify(p.documentosMarcados),
        p.totalObrigatorios,
        p.status,
        p.criadoEm,
        p.atendidoEm ?? null,
      ],
    );
  }
}

export async function obterProtocoloPorCodigo(codigo: string): Promise<ProtocoloVisita | null> {
  const limpo = codigo.trim().toUpperCase();
  if (!limpo) return null;

  const row = await db.queryOne<LinhaProtocoloDB>(
    'SELECT * FROM protocolos_visita WHERE UPPER(codigo) = $1 LIMIT 1',
    [limpo],
  );

  return row ? mapearLinhaProtocolo(row) : null;
}

export async function listarProtocolos(escolaId?: string): Promise<ProtocoloVisita[]> {
  const sql = escolaId
    ? 'SELECT * FROM protocolos_visita WHERE escola_id = $1 ORDER BY criado_em DESC LIMIT 80'
    : 'SELECT * FROM protocolos_visita ORDER BY criado_em DESC LIMIT 100';

  const rows = await (escolaId
    ? db.query<LinhaProtocoloDB>(sql, [escolaId])
    : db.query<LinhaProtocoloDB>(sql));

  return rows.map(mapearLinhaProtocolo);
}

export async function criarProtocoloVisita(dados: {
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
}): Promise<ProtocoloVisita | null> {
  const esc = await db.queryOne<{ id: string; nome: string; endereco: string; bairro: string }>(
    'SELECT id, nome, endereco, bairro FROM escolas WHERE id = $1',
    [dados.escolaId],
  );

  if (!esc) return null;

  const codigo = await gerarCodigoProtocolo();
  const criadoEm = Date.now();
  const { mascarado } = mascararTelefoneLGPD(dados.telefone);
  const responsavelLimpo = dados.responsavel.trim().slice(0, 80) || 'Responsável Familiar';

  await db.execute(
    `INSERT INTO protocolos_visita (
      codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
      etapa, turma, periodo, responsavel, telefone_mascarado, nascimento,
      turno_visita, data_visita, documentos_json, total_obrigatorios,
      status, criado_em, atendido_em
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'aguardando', $16, NULL)`,
    [
      codigo,
      esc.id,
      esc.nome,
      esc.endereco,
      esc.bairro,
      dados.etapa,
      dados.turma,
      dados.periodo,
      responsavelLimpo,
      mascarado,
      dados.nascimento ?? null,
      dados.turnoVisita,
      dados.dataVisita,
      JSON.stringify(dados.documentosMarcados),
      dados.totalObrigatorios,
      criadoEm,
    ],
  );

  return obterProtocoloPorCodigo(codigo);
}

export async function atualizarStatusProtocolo(
  codigo: string,
  novoStatus: StatusProtocolo,
): Promise<{ protocolo: ProtocoloVisita | null; evento: EventoVaga | null }> {
  const atual = await obterProtocoloPorCodigo(codigo);
  if (!atual) return { protocolo: null, evento: null };

  const agora = Date.now();
  await db.execute(
    'UPDATE protocolos_visita SET status = $1, atendido_em = $2 WHERE codigo = $3',
    [novoStatus, novoStatus === 'atendido' ? agora : null, atual.codigo],
  );

  let evento: EventoVaga | null = null;

  // Ao confirmar o atendimento presencial na secretaria da escola, se ainda não estava atendido,
  // ocupa automaticamente 1 vaga na oferta correspondente (ou reduz 1 da fila).
  if (novoStatus === 'atendido' && atual.status !== 'atendido') {
    const of = await db.queryOne<{ vagas: number; fila: number }>(
      'SELECT vagas, fila FROM ofertas WHERE escola_id = $1 AND etapa = $2 AND periodo = $3',
      [atual.escolaId, atual.etapa, atual.periodo],
    );

    if (of) {
      const vagasNum = Number(of.vagas);
      const filaNum = Number(of.fila);
      if (vagasNum > 0) {
        const res = await atualizarOfertaUnidade({
          escolaId: atual.escolaId,
          etapa: atual.etapa,
          periodo: atual.periodo,
          vagas: vagasNum - 1,
          origem: 'protocolo',
        });
        evento = res.evento;
      } else if (filaNum > 0) {
        await atualizarOfertaUnidade({
          escolaId: atual.escolaId,
          etapa: atual.etapa,
          periodo: atual.periodo,
          fila: filaNum - 1,
          origem: 'protocolo',
        });
      }
    }
  }

  const protocolo = await obterProtocoloPorCodigo(atual.codigo);
  return { protocolo, evento };
}
