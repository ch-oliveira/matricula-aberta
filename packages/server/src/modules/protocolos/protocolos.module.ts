import { createHash, randomInt } from 'node:crypto';
import {
  anoLetivo,
  proximoDiaUtilISO,
  verificarProtocoloExpirado,
  type EtapaId,
  type EventoVaga,
  type Periodo,
  type ProtocoloVisita,
  type StatusProtocolo,
  type TurnoVisita,
} from '../../../../shared/src/index.ts';
import {
  gerarTokenCancelamentoProtocolo,
  verificarTokenCancelamentoProtocolo,
} from '../../infra/auth.ts';
import { db } from '../../infra/db.ts';
import { HttpError } from '../../infra/security.ts';
import { mascararTelefoneLGPD } from '../alertas/alertas.module.ts';
import { enviarMensagemConfirmacaoImediata } from '../notificacoes/notificacoes.module.ts';
import { atualizarOfertaUnidade, invalidarCacheEscolas } from '../unidades/unidades.module.ts';

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
  telefone_contato?: string | null;
  nascimento: string | null;
  turno_visita: TurnoVisita;
  data_visita: string;
  documentos_json: string;
  total_obrigatorios: number;
  status: StatusProtocolo;
  reserva_vaga?: number;
  motivo_cancelamento?: string | null;
  posicao_fila?: number | null;
  documento_estudante?: string | null;
  documento_estudante_hash?: string | null;
  token_cancelamento?: string | null;
  notificado_dia_em?: number | null;
  notificado_1h_em?: number | null;
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
    reservaVaga: Boolean(r.reserva_vaga ?? 1),
    motivoCancelamento: r.motivo_cancelamento ?? undefined,
    posicaoFila: r.posicao_fila ?? undefined,
    documentoEstudante: r.documento_estudante ?? undefined,
    tokenCancelamento: r.token_cancelamento ?? undefined,
    notificadoDiaEm: r.notificado_dia_em ?? undefined,
    notificado1hEm: r.notificado_1h_em ?? undefined,
    criadoEm: r.criado_em,
    atendidoEm: r.atendido_em ?? undefined,
  };
}

async function gerarCodigoProtocolo(): Promise<string> {
  const agora = new Date();
  const ano = anoLetivo(agora);
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

  const iniciais = [
    {
      codigo: 'PATOS-2027-4821',
      escolaId: 'creche-manoel-quinidio',
      escolaNome: 'Creche Municipal Manoel Quinídio Sobrinho',
      escolaEndereco: 'Rua Manoel Mota, 340 – Jatobá, Patos - PB',
      escolaBairro: 'Jatobá',
      etapa: 'bercario' as EtapaId,
      turma: 'Berçário II',
      periodo: 'integral' as Periodo,
      responsavel: 'Maria Francisca Medeiros',
      telefone: '(83) 9••••-4102',
      telefoneContato: '83996124102',
      nascimento: '2025-06-14',
      turnoVisita: 'manha' as TurnoVisita,
      dataVisita: amanha,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'sus'],
      totalObrigatorios: 7,
      status: 'aguardando' as StatusProtocolo,
      reservaVaga: 1,
      criadoEm: agora - 42 * 60_000,
    },
    {
      codigo: 'PATOS-2027-5190',
      escolaId: 'emef-monsenhor-manoel-vieira',
      escolaNome: 'EMEF Monsenhor Manoel Vieira',
      escolaEndereco: 'Praça Edvaldo Mota, 85 – Centro, Patos - PB',
      escolaBairro: 'Centro',
      etapa: 'fund1' as EtapaId,
      turma: '1º ano',
      periodo: 'parcial' as Periodo,
      responsavel: 'José Severino Wanderley',
      telefone: '(83) 9••••-8831',
      telefoneContato: '83998768831',
      nascimento: '2020-09-22',
      turnoVisita: 'tarde' as TurnoVisita,
      dataVisita: amanha,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'historico'],
      totalObrigatorios: 7,
      status: 'aguardando' as StatusProtocolo,
      reservaVaga: 1,
      criadoEm: agora - 75 * 60_000,
    },
    {
      codigo: 'PATOS-2027-6034',
      escolaId: 'creche-maria-eunice',
      escolaNome: 'Creche Municipal Maria Eunice',
      escolaEndereco: 'Rua Pedro Firmino, 620 – Maternidade, Patos - PB',
      escolaBairro: 'Maternidade',
      etapa: 'maternal' as EtapaId,
      turma: 'Maternal I',
      periodo: 'integral' as Periodo,
      responsavel: 'Ana Lúcia Nóbrega',
      telefone: '(83) 9••••-1940',
      telefoneContato: '83981121940',
      nascimento: '2024-02-10',
      turnoVisita: 'manha' as TurnoVisita,
      dataVisita: depois,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'sus'],
      totalObrigatorios: 7,
      status: 'aguardando' as StatusProtocolo,
      reservaVaga: 1,
      criadoEm: agora - 110 * 60_000,
    },
    {
      codigo: 'PATOS-2027-3910',
      escolaId: 'creche-manoel-quinidio',
      escolaNome: 'Creche Municipal Manoel Quinídio Sobrinho',
      escolaEndereco: 'Rua Manoel Mota, 340 – Jatobá, Patos - PB',
      escolaBairro: 'Jatobá',
      etapa: 'maternal' as EtapaId,
      turma: 'Maternal II',
      periodo: 'integral' as Periodo,
      responsavel: 'Carlos Eduardo Leite',
      telefone: '(83) 9••••-7712',
      telefoneContato: '83999447712',
      nascimento: '2023-05-03',
      turnoVisita: 'manha' as TurnoVisita,
      dataVisita: amanha,
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'cpf-resp', 'residencia', 'vacina', 'sus'],
      totalObrigatorios: 7,
      status: 'atendido' as StatusProtocolo,
      reservaVaga: 1,
      criadoEm: agora - 240 * 60_000,
      atendidoEm: agora - 90 * 60_000,
    },
  ];

  for (const p of iniciais) {
    await db.execute(
      `INSERT INTO protocolos_visita (
        codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
        etapa, turma, periodo, responsavel, telefone_mascarado, telefone_contato, nascimento,
        turno_visita, data_visita, documentos_json, total_obrigatorios,
        status, reserva_vaga, criado_em, atendido_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
        p.telefoneContato ?? null,
        p.nascimento ?? null,
        p.turnoVisita,
        p.dataVisita,
        JSON.stringify(p.documentosMarcados),
        p.totalObrigatorios,
        p.status,
        p.reservaVaga,
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
  documentoEstudante?: string;
}): Promise<{ protocolo: ProtocoloVisita | null; evento: EventoVaga | null }> {
  const esc = await db.queryOne<{ id: string; nome: string; endereco: string; bairro: string }>(
    'SELECT id, nome, endereco, bairro FROM escolas WHERE id = $1',
    [dados.escolaId],
  );

  if (!esc) return { protocolo: null, evento: null };

  // Prevenção de reservas múltiplas abusivas (1 reserva ativa por criança na rede)
  let docLimpo: string | null = null;
  let docHash: string | null = null;
  if (dados.documentoEstudante) {
    const limpo = dados.documentoEstudante.replace(/\D/g, '') || dados.documentoEstudante.trim();
    if (limpo.length >= 4) {
      docLimpo = limpo;
      docHash = createHash('sha256').update(limpo).digest('hex');
      const existente = await db.queryOne<{ codigo: string; escola_nome: string }>(
        `SELECT codigo, escola_nome FROM protocolos_visita WHERE status = 'aguardando' AND documento_estudante_hash = $1 LIMIT 1`,
        [docHash],
      );
      if (existente) {
        throw new HttpError(
          409,
          `A criança já possui a reserva ativa ${existente.codigo} na unidade "${existente.escola_nome}". Para reservar nesta unidade, cancele o agendamento anterior primeiro.`,
        );
      }
    }
  }

  const codigo = await gerarCodigoProtocolo();
  const tokenCancelamento = gerarTokenCancelamentoProtocolo(codigo);
  const criadoEm = Date.now();
  const { mascarado } = mascararTelefoneLGPD(dados.telefone);
  const telefoneContato = dados.telefone?.replace(/\D/g, '') || null;
  const responsavelLimpo = dados.responsavel.trim().slice(0, 80) || 'Responsável Familiar';

  // Opção 2 - Pré-reserva garantida:
  // Se houver vaga disponível na oferta, debita imediatamente 1 vaga do quadro escolar.
  // Se a turma estiver com 0 vagas livres, o protocolo é gerado para a fila de espera.
  const of = await db.queryOne<{ vagas: number; fila: number }>(
    'SELECT vagas, fila FROM ofertas WHERE escola_id = $1 AND etapa = $2 AND periodo = $3',
    [esc.id, dados.etapa, dados.periodo],
  );

  let reservaVaga = false;
  let eventoVaga: EventoVaga | null = null;
  let posicaoFila: number | null = null;

  if (of) {
    const vagasNum = Number(of.vagas);
    const filaNum = Number(of.fila);
    if (vagasNum > 0) {
      reservaVaga = true;
      const res = await atualizarOfertaUnidade({
        escolaId: esc.id,
        etapa: dados.etapa,
        periodo: dados.periodo,
        vagas: vagasNum - 1,
        origem: 'protocolo',
      });
      eventoVaga = res.evento;
    } else {
      reservaVaga = false;
      posicaoFila = filaNum + 1;
      await atualizarOfertaUnidade({
        escolaId: esc.id,
        etapa: dados.etapa,
        periodo: dados.periodo,
        fila: filaNum + 1,
        origem: 'protocolo',
      });
    }
  }

  await db.execute(
    `INSERT INTO protocolos_visita (
      codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
      etapa, turma, periodo, responsavel, telefone_mascarado, telefone_contato, nascimento,
      turno_visita, data_visita, documentos_json, total_obrigatorios,
      status, reserva_vaga, motivo_cancelamento, posicao_fila, documento_estudante,
      documento_estudante_hash, token_cancelamento, notificado_dia_em, notificado_1h_em,
      criado_em, atendido_em
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'aguardando', $17, NULL, $18, $19, $20, $21, NULL, NULL, $22, NULL)`,
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
      telefoneContato,
      dados.nascimento ?? null,
      dados.turnoVisita,
      dados.dataVisita,
      JSON.stringify(dados.documentosMarcados),
      dados.totalObrigatorios,
      reservaVaga ? 1 : 0,
      posicaoFila,
      docLimpo,
      docHash,
      tokenCancelamento,
      criadoEm,
    ],
  );

  invalidarCacheEscolas();
  const protocolo = await obterProtocoloPorCodigo(codigo);

  // Disparo assíncrono de confirmação imediata no WhatsApp caso configurado
  if (protocolo && telefoneContato) {
    void enviarMensagemConfirmacaoImediata(protocolo).catch((err) => {
      console.warn('[WhatsApp] Falha ao enviar confirmação imediata:', err);
    });
  }

  return { protocolo, evento: eventoVaga };
}

/**
 * Cancelamento de protocolo pelo próprio cidadão mediante apresentação do token HMAC individual.
 * Devolve a vaga imediatamente para o quadro escolar.
 */
export async function cancelarProtocoloPorCidadao(
  codigo: string,
  token: string,
): Promise<{ protocolo: ProtocoloVisita | null; evento: EventoVaga | null }> {
  const autorizado = verificarTokenCancelamentoProtocolo(codigo, token);
  if (!autorizado) {
    throw new HttpError(403, 'Token de cancelamento inválido para este protocolo.');
  }

  const atual = await obterProtocoloPorCodigo(codigo);
  if (!atual) {
    throw new HttpError(404, 'Protocolo não encontrado.');
  }

  if (atual.status === 'cancelado') {
    return { protocolo: atual, evento: null };
  }

  if (atual.status === 'atendido') {
    throw new HttpError(400, 'Este agendamento já foi atendido presencialmente e a matrícula foi concluída.');
  }

  return atualizarStatusProtocolo(codigo, 'cancelado', 'cancelado_cidadao');
}

export async function atualizarStatusProtocolo(
  codigo: string,
  novoStatus: StatusProtocolo,
  motivoCancelamento?: string,
): Promise<{ protocolo: ProtocoloVisita | null; evento: EventoVaga | null }> {
  const atual = await obterProtocoloPorCodigo(codigo);
  if (!atual) return { protocolo: null, evento: null };

  const agora = Date.now();
  await db.execute(
    'UPDATE protocolos_visita SET status = $1, atendido_em = $2, motivo_cancelamento = $3 WHERE codigo = $4',
    [
      novoStatus,
      novoStatus === 'atendido' ? agora : null,
      novoStatus === 'cancelado' ? (motivoCancelamento ?? atual.motivoCancelamento ?? 'cancelado_gestor') : null,
      atual.codigo,
    ],
  );
  invalidarCacheEscolas();

  let evento: EventoVaga | null = null;

  // Lógica da Opção 2 no ciclo de vida da vaga:
  // 1) Se já tinha vaga reservada no protocolo (reservaVaga === true) e foi atendido presencialmente:
  //    A vaga JÁ foi debitada no agendamento. Não debita de novo! Apenas confirma o atendimento.
  // 2) Se era um protocolo de fila (sem vaga reservada) e foi atendido presencialmente:
  //    Reduz 1 da fila de espera daquela oferta.
  if (novoStatus === 'atendido' && atual.status !== 'atendido') {
    if (!atual.reservaVaga) {
      const of = await db.queryOne<{ vagas: number; fila: number }>(
        'SELECT vagas, fila FROM ofertas WHERE escola_id = $1 AND etapa = $2 AND periodo = $3',
        [atual.escolaId, atual.etapa, atual.periodo],
      );
      if (of && Number(of.fila) > 0) {
        await atualizarOfertaUnidade({
          escolaId: atual.escolaId,
          etapa: atual.etapa,
          periodo: atual.periodo,
          fila: Number(of.fila) - 1,
          origem: 'protocolo',
        });
      }
    }
  }

  // 3) Se o protocolo estava aguardando e foi cancelado (manualmente ou por expiração automática):
  //    Se havia vaga pré-reservada (reservaVaga === true), DEVOLVE a vaga imediatamente para a escola!
  if (novoStatus === 'cancelado' && atual.status === 'aguardando') {
    const of = await db.queryOne<{ vagas: number; fila: number; capacidade: number }>(
      'SELECT vagas, fila, capacidade FROM ofertas WHERE escola_id = $1 AND etapa = $2 AND periodo = $3',
      [atual.escolaId, atual.etapa, atual.periodo],
    );

    if (of) {
      if (atual.reservaVaga) {
        const vagasNum = Number(of.vagas);
        const capNum = Number(of.capacidade);
        const novasVagas = Math.min(capNum, vagasNum + 1);
        const res = await atualizarOfertaUnidade({
          escolaId: atual.escolaId,
          etapa: atual.etapa,
          periodo: atual.periodo,
          vagas: novasVagas,
          origem: 'protocolo',
        });
        evento = res.evento;
      } else {
        const filaNum = Number(of.fila);
        if (filaNum > 0) {
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
  }

  const protocolo = await obterProtocoloPorCodigo(atual.codigo);
  return { protocolo, evento };
}

/**
 * Rotina automática que identifica protocolos com prazo expirado de comparecimento presencial,
 * transiciona para 'cancelado' com motivo 'expirado_sem_comparecimento' e devolve a vaga para a rede.
 */
export async function processarExpiracaoProtocolosVencidos(agora = new Date()): Promise<{
  expirados: ProtocoloVisita[];
  eventos: EventoVaga[];
}> {
  const protocolosAguardando = await db.query<LinhaProtocoloDB>(
    `SELECT * FROM protocolos_visita WHERE status = 'aguardando'`,
  );

  const expirados: ProtocoloVisita[] = [];
  const eventos: EventoVaga[] = [];

  for (const linha of protocolosAguardando) {
    const prot = mapearLinhaProtocolo(linha);
    if (verificarProtocoloExpirado(prot, agora)) {
      const { protocolo, evento } = await atualizarStatusProtocolo(
        prot.codigo,
        'cancelado',
        'expirado_sem_comparecimento',
      );
      if (protocolo) expirados.push(protocolo);
      if (evento) eventos.push(evento);
    }
  }

  return { expirados, eventos };
}
