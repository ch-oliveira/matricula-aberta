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

function gerarCodigoProtocolo(): string {
  const agora = new Date();
  const ano = agora.getMonth() >= 7 ? agora.getFullYear() + 1 : agora.getFullYear();
  for (let tent = 0; tent < 30; tent++) {
    const num = randomInt(1000, 10000);
    const codigo = `PATOS-${ano}-${num}`;
    const existe = db.prepare('SELECT 1 FROM protocolos_visita WHERE codigo = ?').get(codigo);
    if (!existe) return codigo;
  }
  return `PATOS-${ano}-${randomInt(10000, 99999)}`;
}

export function garantirSeedProtocolosPatos(forcarReset = false): void {
  const count = (db.prepare('SELECT COUNT(*) as c FROM protocolos_visita').get() as { c: number }).c;
  if (count > 0 && !forcarReset) return;

  if (forcarReset) {
    db.exec('DELETE FROM protocolos_visita;');
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

  const ins = db.prepare(`
    INSERT INTO protocolos_visita (
      codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
      etapa, turma, periodo, responsavel, telefone_mascarado, nascimento,
      turno_visita, data_visita, documentos_json, total_obrigatorios,
      status, criado_em, atendido_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of iniciais) {
    ins.run(
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
    );
  }
}

export function obterProtocoloPorCodigo(codigo: string): ProtocoloVisita | null {
  const limpo = codigo.trim().toUpperCase();
  if (!limpo) return null;

  const row = db
    .prepare('SELECT * FROM protocolos_visita WHERE UPPER(codigo) = ? LIMIT 1')
    .get(limpo) as LinhaProtocoloDB | undefined;

  return row ? mapearLinhaProtocolo(row) : null;
}

export function listarProtocolos(escolaId?: string): ProtocoloVisita[] {
  const sql = escolaId
    ? 'SELECT * FROM protocolos_visita WHERE escola_id = ? ORDER BY criado_em DESC LIMIT 80'
    : 'SELECT * FROM protocolos_visita ORDER BY criado_em DESC LIMIT 100';

  const rows = (
    escolaId ? db.prepare(sql).all(escolaId) : db.prepare(sql).all()
  ) as unknown as LinhaProtocoloDB[];

  return rows.map(mapearLinhaProtocolo);
}

export function criarProtocoloVisita(dados: {
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
}): ProtocoloVisita | null {
  const esc = db
    .prepare('SELECT id, nome, endereco, bairro FROM escolas WHERE id = ?')
    .get(dados.escolaId) as { id: string; nome: string; endereco: string; bairro: string } | undefined;

  if (!esc) return null;

  const codigo = gerarCodigoProtocolo();
  const criadoEm = Date.now();
  const { mascarado } = mascararTelefoneLGPD(dados.telefone);
  const responsavelLimpo = dados.responsavel.trim().slice(0, 80) || 'Responsável Familiar';

  db.prepare(
    `INSERT INTO protocolos_visita (
      codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
      etapa, turma, periodo, responsavel, telefone_mascarado, nascimento,
      turno_visita, data_visita, documentos_json, total_obrigatorios,
      status, criado_em, atendido_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aguardando', ?, NULL)`,
  ).run(
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
  );

  return obterProtocoloPorCodigo(codigo);
}

export function atualizarStatusProtocolo(
  codigo: string,
  novoStatus: StatusProtocolo,
): { protocolo: ProtocoloVisita | null; evento: EventoVaga | null } {
  const atual = obterProtocoloPorCodigo(codigo);
  if (!atual) return { protocolo: null, evento: null };

  const agora = Date.now();
  db.prepare('UPDATE protocolos_visita SET status = ?, atendido_em = ? WHERE codigo = ?').run(
    novoStatus,
    novoStatus === 'atendido' ? agora : null,
    atual.codigo,
  );

  let evento: EventoVaga | null = null;

  // Ao confirmar o atendimento presencial na secretaria da escola, se ainda não estava atendido,
  // ocupa automaticamente 1 vaga na oferta correspondente (ou reduz 1 da fila).
  if (novoStatus === 'atendido' && atual.status !== 'atendido') {
    const of = db
      .prepare('SELECT vagas, fila FROM ofertas WHERE escola_id = ? AND etapa = ? AND periodo = ?')
      .get(atual.escolaId, atual.etapa, atual.periodo) as { vagas: number; fila: number } | undefined;

    if (of) {
      if (of.vagas > 0) {
        const res = atualizarOfertaUnidade({
          escolaId: atual.escolaId,
          etapa: atual.etapa,
          periodo: atual.periodo,
          vagas: of.vagas - 1,
          origem: 'protocolo',
        });
        evento = res.evento;
      } else if (of.fila > 0) {
        atualizarOfertaUnidade({
          escolaId: atual.escolaId,
          etapa: atual.etapa,
          periodo: atual.periodo,
          fila: of.fila - 1,
          origem: 'protocolo',
        });
      }
    }
  }

  const protocolo = obterProtocoloPorCodigo(atual.codigo);
  return { protocolo, evento };
}
