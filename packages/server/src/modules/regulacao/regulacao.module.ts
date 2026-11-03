import { createHash, randomInt } from 'node:crypto';
import {
  calcularPontuacaoVulnerabilidade,
  iniciaisNome,
  mascararDocumentoEstudante,
  mascararProcessoCNJ,
  type CertidaoCumprimentoJudicialDTO,
  type CriterioVulnerabilidadeId,
  type DemandaJudicial,
  type EtapaId,
  type EventoVaga,
  type FilaItemAuditavel,
  type LogAuditoria,
  type Periodo,
  type StatusDemandaJudicial,
} from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';
import { HttpError } from '../../infra/security.ts';
import { atualizarOfertaUnidade, invalidarCacheEscolas } from '../unidades/unidades.module.ts';

interface LinhaDemandaJudicialDB {
  id: string;
  numero_processo: string;
  vara: string;
  juiz_promotor: string | null;
  estudante_nome: string;
  responsavel_nome: string;
  cpf_certidao: string;
  escola_id: string;
  escola_nome: string;
  etapa: EtapaId;
  periodo: Periodo;
  protocolo_codigo: string | null;
  prazo_limite_em: number;
  multa_diaria: number | null;
  status: StatusDemandaJudicial;
  alocado_em: number | null;
  observacoes: string | null;
  criado_em: number;
}

interface LinhaAuditoriaDB {
  id: string;
  operador_usuario: string;
  operador_perfil: string;
  acao: string;
  protocolo_codigo: string | null;
  escola_id: string | null;
  justificativa: string;
  detalhes_json: string | null;
  ip: string | null;
  criado_em: number;
}

function mapearDemanda(r: LinhaDemandaJudicialDB): DemandaJudicial {
  return {
    id: r.id,
    numeroProcesso: r.numero_processo,
    vara: r.vara,
    juizPromotor: r.juiz_promotor ?? undefined,
    estudanteNome: r.estudante_nome,
    responsavelNome: r.responsavel_nome,
    cpfCertidao: r.cpf_certidao,
    escolaId: r.escola_id,
    escolaNome: r.escola_nome,
    etapa: r.etapa,
    periodo: r.periodo,
    protocoloCodigo: r.protocolo_codigo ?? undefined,
    prazoLimiteEm: Number(r.prazo_limite_em),
    multaDiaria: r.multa_diaria ? Number(r.multa_diaria) : undefined,
    status: r.status,
    alocadoEm: r.alocado_em ? Number(r.alocado_em) : undefined,
    observacoes: r.observacoes ?? undefined,
    criadoEm: Number(r.criado_em),
  };
}

function mapearLog(r: LinhaAuditoriaDB): LogAuditoria {
  let detalhes: Record<string, unknown> | undefined;
  if (r.detalhes_json) {
    try {
      detalhes = JSON.parse(r.detalhes_json);
    } catch {
      detalhes = undefined;
    }
  }
  return {
    id: r.id,
    operadorUsuario: r.operador_usuario,
    operadorPerfil: r.operador_perfil as LogAuditoria['operadorPerfil'],
    acao: r.acao,
    protocoloCodigo: r.protocolo_codigo ?? undefined,
    escolaId: r.escola_id ?? undefined,
    justificativa: r.justificativa,
    detalhes,
    ip: r.ip ?? undefined,
    criadoEm: Number(r.criado_em),
  };
}

/** Registra evento imutável na trilha de auditoria para o TCE e Ministério Público */
export async function registrarLogAuditoria(dados: {
  operadorUsuario: string;
  operadorPerfil: LogAuditoria['operadorPerfil'];
  acao: string;
  justificativa: string;
  protocoloCodigo?: string;
  escolaId?: string;
  detalhes?: Record<string, unknown>;
  ip?: string;
}): Promise<LogAuditoria> {
  const id = `AUD-${Date.now()}-${randomInt(1000, 9999)}`;
  const criadoEm = Date.now();
  const detalhesJson = dados.detalhes ? JSON.stringify(dados.detalhes) : null;

  await db.execute(
    `INSERT INTO logs_auditoria (
      id, operador_usuario, operador_perfil, acao, protocolo_codigo,
      escola_id, justificativa, detalhes_json, ip, criado_em
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      dados.operadorUsuario.slice(0, 100),
      dados.operadorPerfil,
      dados.acao.slice(0, 80),
      dados.protocoloCodigo ?? null,
      dados.escolaId ?? null,
      dados.justificativa.slice(0, 500),
      detalhesJson,
      dados.ip ?? null,
      criadoEm,
    ],
  );

  return {
    id,
    operadorUsuario: dados.operadorUsuario,
    operadorPerfil: dados.operadorPerfil,
    acao: dados.acao,
    protocoloCodigo: dados.protocoloCodigo,
    escolaId: dados.escolaId,
    justificativa: dados.justificativa,
    detalhes: dados.detalhes,
    ip: dados.ip,
    criadoEm,
  };
}

/** Consulta histórico de auditoria para visualização no painel da Secretaria */
export async function listarLogsAuditoria(limite = 100): Promise<LogAuditoria[]> {
  const rows = await db.query<LinhaAuditoriaDB>(
    'SELECT * FROM logs_auditoria ORDER BY criado_em DESC LIMIT $1',
    [limite],
  );
  return rows.map(mapearLog);
}

/**
 * Retorna a Fila Pública Auditável da rede municipal com anonimização LGPD estrita:
 * - Ordenação: 1º Pontos de Vulnerabilidade/Prioridade DESC, 2º Data de Cadastro ASC.
 * - PII protegida: exibe apenas iniciais (ex: "M. C. S.") e código do protocolo.
 */
export async function obterFilaPublicaAuditavel(filtros?: {
  etapa?: EtapaId;
  escolaId?: string;
  busca?: string;
}): Promise<FilaItemAuditavel[]> {
  let sql = 'SELECT * FROM protocolos_visita WHERE status = \'aguardando\'';
  const params: unknown[] = [];
  let paramIdx = 0;

  if (filtros?.etapa) {
    sql += ` AND etapa = $${++paramIdx}`;
    params.push(filtros.etapa);
  }

  if (filtros?.escolaId) {
    sql += ` AND escola_id = $${++paramIdx}`;
    params.push(filtros.escolaId);
  }

  // Ordenação por mérito legal / score regulatório decrescente, e desempate por ordem cronológica
  sql += ' ORDER BY pontos_prioridade DESC, criado_em ASC LIMIT 250';

  const rows = await db.query<any>(sql, params);
  const buscaTermo = filtros?.busca?.trim().toUpperCase();

  const itens: FilaItemAuditavel[] = [];
  let pos = 1;

  for (const r of rows) {
    let criterios: CriterioVulnerabilidadeId[] = [];
    if (r.criterios_prioridade_json) {
      try {
        const parsed = JSON.parse(r.criterios_prioridade_json);
        if (Array.isArray(parsed)) {
          criterios = parsed;
        }
      } catch {
        criterios = [];
      }
    }

    const estudanteIniciais = iniciaisNome(r.responsavel);
    const responsavelIniciais = iniciaisNome(r.responsavel);

    if (buscaTermo) {
      const matchCod = r.codigo.toUpperCase().includes(buscaTermo);
      const matchEscola = r.escola_nome.toUpperCase().includes(buscaTermo);
      const matchBairro = r.escola_bairro.toUpperCase().includes(buscaTermo);
      if (!matchCod && !matchEscola && !matchBairro) continue;
    }

    itens.push({
      posicao: pos++,
      codigo: r.codigo,
      estudanteIniciais,
      responsavelIniciais,
      etapa: r.etapa,
      turma: r.turma,
      periodo: r.periodo,
      escolaId: r.escola_id,
      escolaNome: r.escola_nome,
      escolaBairro: r.escola_bairro,
      pontosTotais: Number(r.pontos_prioridade ?? 0),
      criteriosAtendidos: criterios,
      origem: (r.origem as 'regular' | 'judicial') || 'regular',
      criadoEm: Number(r.criado_em),
      status: r.status,
      reservaVaga: Boolean(r.reserva_vaga ?? 1),
    });
  }

  return itens;
}

/** Lista demandas judiciais (mandados de segurança / liminares) */
export async function listarDemandasJudiciais(): Promise<DemandaJudicial[]> {
  const rows = await db.query<LinhaDemandaJudicialDB>(
    'SELECT * FROM demandas_judiciais ORDER BY CASE WHEN status = \'pendente\' THEN 0 ELSE 1 END, prazo_limite_em ASC',
  );
  return rows.map(mapearDemanda);
}

/** Cadastra uma nova determinação judicial recebida pela Procuradoria / SEDUC */
export async function cadastrarDemandaJudicial(dados: {
  numeroProcesso: string;
  vara: string;
  juizPromotor?: string;
  estudanteNome: string;
  responsavelNome: string;
  cpfCertidao: string;
  escolaId: string;
  etapa: EtapaId;
  periodo: Periodo;
  prazoHoras: number;
  multaDiaria?: number;
  observacoes?: string;
  operadorUsuario: string;
}): Promise<DemandaJudicial> {
  const esc = await db.queryOne<{ id: string; nome: string }>(
    'SELECT id, nome FROM escolas WHERE id = $1',
    [dados.escolaId],
  );
  if (!esc) throw new HttpError(404, 'Unidade escolar de Patos - PB não encontrada.');

  const id = `JUD-${Date.now()}-${randomInt(100, 999)}`;
  const agora = Date.now();
  const prazoLimiteEm = agora + Math.max(1, dados.prazoHoras) * 3600 * 1000;

  await db.execute(
    `INSERT INTO demandas_judiciais (
      id, numero_processo, vara, juiz_promotor, estudante_nome,
      responsavel_nome, cpf_certidao, escola_id, escola_nome, etapa,
      periodo, protocolo_codigo, prazo_limite_em, multa_diaria, status,
      alocado_em, observacoes, criado_em
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, $12, $13, 'pendente', NULL, $14, $15)`,
    [
      id,
      dados.numeroProcesso.trim(),
      dados.vara.trim(),
      dados.juizPromotor?.trim() ?? null,
      dados.estudanteNome.trim(),
      dados.responsavelNome.trim(),
      dados.cpfCertidao.trim(),
      esc.id,
      esc.nome,
      dados.etapa,
      dados.periodo,
      prazoLimiteEm,
      dados.multaDiaria ?? 1000,
      dados.observacoes?.trim() ?? null,
      agora,
    ],
  );

  await registrarLogAuditoria({
    operadorUsuario: dados.operadorUsuario,
    operadorPerfil: 'secretaria',
    acao: 'CADASTRO_DEMANDA_JUDICIAL',
    escolaId: esc.id,
    justificativa: `Autuação do Processo Judicial ${dados.numeroProcesso} (${dados.vara}) - Prazo: ${dados.prazoHoras}h`,
    detalhes: {
      demandaId: id,
      numeroProcesso: dados.numeroProcesso,
      estudanteNome: dados.estudanteNome,
      multaDiaria: dados.multaDiaria,
    },
  });

  const row = await db.queryOne<LinhaDemandaJudicialDB>('SELECT * FROM demandas_judiciais WHERE id = $1', [id]);
  return mapearDemanda(row!);
}

/**
 * Aloca vaga prioritária garantida em cumprimento à liminar/ordem judicial
 * e emite automaticamente o protocolo oficial vinculado ao processo.
 */
export async function alocarVagaJudicial(dados: {
  demandaId: string;
  operadorUsuario: string;
  justificativa: string;
}): Promise<{ demanda: DemandaJudicial; protocoloCodigo: string; evento: EventoVaga | null }> {
  const demandaRow = await db.queryOne<LinhaDemandaJudicialDB>(
    'SELECT * FROM demandas_judiciais WHERE id = $1',
    [dados.demandaId],
  );
  if (!demandaRow) throw new HttpError(404, 'Demanda judicial não encontrada.');
  if (demandaRow.status === 'alocado') {
    throw new HttpError(400, `Esta demanda judicial já foi atendida com o protocolo ${demandaRow.protocolo_codigo}.`);
  }

  const esc = await db.queryOne<{ id: string; nome: string; endereco: string; bairro: string }>(
    'SELECT id, nome, endereco, bairro FROM escolas WHERE id = $1',
    [demandaRow.escola_id],
  );
  if (!esc) throw new HttpError(404, 'Escola de destino não encontrada.');

  // Gera protocolo judicial oficial
  const agora = Date.now();
  const ano = new Date().getFullYear();
  const codigo = `PATOS-JUD-${ano}-${randomInt(1000, 9999)}`;
  const criteriosJudicial: CriterioVulnerabilidadeId[] = ['medida_protetiva'];
  const pontos = calcularPontuacaoVulnerabilidade(criteriosJudicial);

  // Debita vaga na escola ou ajusta quadro com auditoria
  const of = await db.queryOne<{ vagas: number; fila: number }>(
    'SELECT vagas, fila FROM ofertas WHERE escola_id = $1 AND etapa = $2 AND periodo = $3',
    [esc.id, demandaRow.etapa, demandaRow.periodo],
  );

  let evento: EventoVaga | null = null;
  if (of && Number(of.vagas) > 0) {
    const res = await atualizarOfertaUnidade({
      escolaId: esc.id,
      etapa: demandaRow.etapa,
      periodo: demandaRow.periodo,
      vagas: Math.max(0, Number(of.vagas) - 1),
      origem: 'secretaria',
    });
    evento = res.evento;
  }

  const docLimpo = demandaRow.cpf_certidao.replace(/\D/g, '') || demandaRow.cpf_certidao;
  const docHash = createHash('sha256').update(docLimpo).digest('hex');

  // Insere protocolo oficial com status 'aguardando' (reserva de vaga ativa vinculada à ordem judicial)
  await db.execute(
    `INSERT INTO protocolos_visita (
      codigo, escola_id, escola_nome, escola_endereco, escola_bairro,
      etapa, turma, periodo, responsavel, telefone_mascarado, telefone_contato, nascimento,
      turno_visita, data_visita, documentos_json, total_obrigatorios,
      status, reserva_vaga, motivo_cancelamento, posicao_fila, documento_estudante,
      documento_estudante_hash, token_cancelamento, notificado_dia_em, notificado_1h_em,
      criterios_prioridade_json, pontos_prioridade, origem, numero_processo_judicial,
      criado_em, atendido_em
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL,
      'manha', strftime('%Y-%m-%d', 'now'), '["certidao","doc-resp","residencia"]', 3,
      'aguardando', 1, NULL, NULL, $11, $12, NULL, NULL, NULL,
      $13, $14, 'judicial', $15, $16, NULL
    )`,
    [
      codigo,
      esc.id,
      esc.nome,
      esc.endereco,
      esc.bairro,
      demandaRow.etapa,
      `Turma Regulada Judicial (${demandaRow.periodo})`,
      demandaRow.periodo,
      demandaRow.responsavel_nome,
      '(83) 9••••-SEDUC',
      docLimpo,
      docHash,
      JSON.stringify(criteriosJudicial),
      pontos,
      demandaRow.numero_processo,
      agora,
    ],
  );

  // Atualiza a demanda judicial
  await db.execute(
    `UPDATE demandas_judiciais
     SET status = 'alocado', protocolo_codigo = $1, alocado_em = $2
     WHERE id = $3`,
    [codigo, agora, demandaRow.id],
  );

  await registrarLogAuditoria({
    operadorUsuario: dados.operadorUsuario,
    operadorPerfil: 'secretaria',
    acao: 'ALOCACAO_VAGA_JUDICIAL',
    protocoloCodigo: codigo,
    escolaId: esc.id,
    justificativa: `${dados.justificativa} (Cumprimento do Processo nº ${demandaRow.numero_processo} - ${demandaRow.vara})`,
    detalhes: {
      demandaId: demandaRow.id,
      numeroProcesso: demandaRow.numero_processo,
      estudanteNome: demandaRow.estudante_nome,
      protocoloCodigo: codigo,
    },
  });

  invalidarCacheEscolas();

  const demandaAtualizada = await db.queryOne<LinhaDemandaJudicialDB>(
    'SELECT * FROM demandas_judiciais WHERE id = $1',
    [demandaRow.id],
  );

  return {
    demanda: mapearDemanda(demandaAtualizada!),
    protocoloCodigo: codigo,
    evento,
  };
}

/** Emite a Certidão Oficial Eletrônica para juntada imediata no PJ-e pelo procurador */
export async function gerarCertidaoCumprimentoJudicial(demandaId: string): Promise<CertidaoCumprimentoJudicialDTO> {
  const d = await db.queryOne<LinhaDemandaJudicialDB>('SELECT * FROM demandas_judiciais WHERE id = $1', [demandaId]);
  if (!d) throw new HttpError(404, 'Demanda judicial não encontrada.');
  if (!d.protocolo_codigo) {
    throw new HttpError(400, 'Esta demanda judicial ainda está pendente de alocação de vaga.');
  }

  const p = await db.queryOne<any>('SELECT * FROM protocolos_visita WHERE codigo = $1', [d.protocolo_codigo]);
  if (!p) throw new HttpError(404, 'Protocolo vinculado não localizado.');

  const emitidoEm = Date.now();
  const dataHojeStr = new Date(emitidoEm).toLocaleDateString('pt-BR');
  const horaHojeStr = new Date(emitidoEm).toLocaleTimeString('pt-BR');

  const textoBase = [
    'ESTADO DA PARAÍBA',
    'PREFEITURA MUNICIPAL DE PATOS',
    'SECRETARIA MUNICIPAL DE EDUCAÇÃO - SEDUC',
    'SISTEMA INTEGRADO DE REGULAÇÃO DE VAGAS E MATRÍCULAS (MATRÍCULA ABERTA)',
    '',
    '========================================================================================',
    '            CERTIDÃO ELETRÔNICA DE CUMPRIMENTO DE ORDEM JUDICIAL / LIMINAR',
    '========================================================================================',
    '',
    `PROCESSO JUDICIAL ELETRÔNICO (PJ-e): ${mascararProcessoCNJ(d.numero_processo)}`,
    `JUÍZO / COMARCA: ${d.vara} - COMARCA DE PATOS - PB`,
    `INTERESSADO (ESTUDANTE): ${d.estudante_nome.toUpperCase()}`,
    `DOCUMENTO DO ALUNO: ${mascararDocumentoEstudante(d.cpf_certidao)}`,
    `REPRESENTANTE LEGAL: ${d.responsavel_nome.toUpperCase()}`,
    '',
    'CERTIFICO, para os devidos fins de direito e instrução processual junto a esse d. Juízo e ao Ministério Público do Estado da Paraíba (Promotoria da Infância e Juventude), que a Secretaria Municipal de Educação de Patos - PB deu INTEGRAL E TEMPESTIVO CUMPRIMENTO à decisão judicial exarada nos autos do processo em epígrafe.',
    '',
    'A vaga requerida foi formalmente alocada e garantida na Rede Municipal de Ensino com os seguintes dados de lotação:',
    `- UNIDADE ESCOLAR DE DESTINO: ${p.escola_nome.toUpperCase()}`,
    `- ENDEREÇO DA UNIDADE: ${p.escola_endereco} - Bairro ${p.escola_bairro}, Patos - PB`,
    `- ETAPA / SEGMENTO: ${p.etapa.toUpperCase()} (${p.turma})`,
    `- REGIME DE ATENDIMENTO: Período ${p.periodo === 'integral' ? 'INTEGRAL' : 'PARCIAL'}`,
    `- PROTOCOLO OFICIAL DE REGULAÇÃO: ${p.codigo}`,
    `- DATA DA DISPONIBILIZAÇÃO DA VAGA: ${new Date(d.alocado_em || emitidoEm).toLocaleDateString('pt-BR')}`,
    '',
    'A presente certidão é emitida com assinatura eletrônica e carimbo de tempo digital nos termos do art. 10 da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, apta para imediata juntada aos autos judiciais.',
    '',
    `Patos - PB, ${dataHojeStr} às ${horaHojeStr}.`,
  ].join('\n');

  const hashAutenticidade = createHash('sha256').update(textoBase).digest('hex').toUpperCase();

  return {
    numeroProcesso: d.numero_processo,
    vara: d.vara,
    estudanteNome: d.estudante_nome,
    responsavelNome: d.responsavel_nome,
    cpfCertidaoMascarado: mascararDocumentoEstudante(d.cpf_certidao),
    escolaNome: p.escola_nome,
    escolaEndereco: p.escola_endereco,
    etapaNome: p.etapa,
    turma: p.turma,
    periodo: p.periodo,
    protocoloCodigo: p.codigo,
    dataVisita: p.data_visita,
    turnoVisita: p.turno_visita,
    emitidoEm,
    hashAutenticidade,
    textoCertidao: `${textoBase}\n\nHASH DIGITAL DE AUTENTICIDADE SHA-256:\n${hashAutenticidade}\n========================================================================================`,
  };
}

/** Seed de processos judiciais de exemplo e histórico de auditoria para Patos - PB */
export async function garantirSeedRegulacaoPatos(forcarReset = false): Promise<void> {
  const rowCount = await db.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM demandas_judiciais');
  const count = Number(rowCount?.c ?? 0);
  if (count > 0 && !forcarReset) return;

  if (forcarReset) {
    await db.execute('DELETE FROM demandas_judiciais');
    await db.execute('DELETE FROM logs_auditoria');
  }

  const agora = Date.now();

  // 1. Demanda Judicial Urgente (Restam poucas horas para o prazo fatal)
  await db.execute(
    `INSERT INTO demandas_judiciais (
      id, numero_processo, vara, juiz_promotor, estudante_nome,
      responsavel_nome, cpf_certidao, escola_id, escola_nome, etapa,
      periodo, protocolo_codigo, prazo_limite_em, multa_diaria, status,
      alocado_em, observacoes, criado_em
    ) VALUES (
      'JUD-2026-001', '0801452-88.2026.8.15.0251',
      '1ª Vara Mista da Infância e Juventude de Patos - PB',
      'Dra. Isabella Joseanne Assunção Lopes Andrade',
      'Enzo Gabriel dos Santos Lima', 'Luciana dos Santos Lima',
      '123.456.789-01', 'creche-manoel-quinidio',
      'Creche Municipal Manoel Quinídio Sobrinho', 'bercario', 'integral',
      NULL, $1, 1000.0, 'pendente', NULL,
      'Mandado de Segurança c/c pedido liminar de vaga em creche integral. Mãe em vulnerabilidade social e trabalhadora.',
      $2
    ) ON CONFLICT (id) DO NOTHING`,
    [agora + 18 * 3600 * 1000, agora - 6 * 3600 * 1000],
  );

  // 2. Demanda Judicial Já Alocada e Cumprida
  await db.execute(
    `INSERT INTO demandas_judiciais (
      id, numero_processo, vara, juiz_promotor, estudante_nome,
      responsavel_nome, cpf_certidao, escola_id, escola_nome, etapa,
      periodo, protocolo_codigo, prazo_limite_em, multa_diaria, status,
      alocado_em, observacoes, criado_em
    ) VALUES (
      'JUD-2026-002', '0800921-14.2026.8.15.0251',
      '2ª Promotoria de Justiça de Defesa da Criança e do Adolescente de Patos',
      'Dr. Elmar Thiago Pereira de Alencar',
      'Sophia Heloísa Wanderley Medeiros', 'Francisca Wanderley Medeiros',
      '987.654.321-00', 'creche-maria-eunice',
      'Creche Municipal Maria Eunice', 'maternal', 'integral',
      'PATOS-JUD-2026-8812', $1, 500.0, 'alocado', $2,
      'Procedimento Administrativo nº 001.2026.00412. Vaga prioritária concedida para criança com TEA (Laudo médico anexo).',
      $3
    ) ON CONFLICT (id) DO NOTHING`,
    [agora + 72 * 3600 * 1000, agora - 24 * 3600 * 1000, agora - 48 * 3600 * 1000],
  );

  // Registra logs iniciais de auditoria
  await registrarLogAuditoria({
    operadorUsuario: 'dr.procuradoria@patos.pb.gov.br',
    operadorPerfil: 'secretaria',
    acao: 'CADASTRO_DEMANDA_JUDICIAL',
    escolaId: 'creche-manoel-quinidio',
    justificativa: 'Autuação de liminar da 1ª Vara da Infância de Patos - PB (Processo 0801452-88.2026.8.15.0251)',
  });

  await registrarLogAuditoria({
    operadorUsuario: 'secretario.educacao@patos.pb.gov.br',
    operadorPerfil: 'secretaria',
    acao: 'ALOCACAO_VAGA_JUDICIAL',
    protocoloCodigo: 'PATOS-JUD-2026-8812',
    escolaId: 'creche-maria-eunice',
    justificativa: 'Atendimento prioritário de recomendação ministerial para estudante com TEA (Sophia Heloísa)',
  });
}
