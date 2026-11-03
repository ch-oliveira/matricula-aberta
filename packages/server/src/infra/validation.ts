import {
  CANAIS_VALIDOS,
  CRITERIOS_VULNERABILIDADE,
  ETAPAS,
  ORDEM_ETAPAS,
  PERIODOS_VALIDOS,
  proximoDiaUtilISO,
  STATUS_PROTOCOLO_VALIDOS,
  TURNOS_VISITA_VALIDOS,
  type Canal,
  type CriterioVulnerabilidadeId,
  type EtapaId,
  type EventoVaga,
  type Periodo,
  type StatusProtocolo,
  type TurnoVisita,
} from '../../../shared/src/index.ts';
import { HttpError } from './security.ts';

function limparTexto(valor: unknown, maxLen: number): string {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function ehEtapaValida(v: unknown): v is EtapaId {
  return typeof v === 'string' && (ORDEM_ETAPAS as string[]).includes(v);
}

export function ehPeriodoValido(v: unknown): v is Periodo {
  return typeof v === 'string' && (PERIODOS_VALIDOS as string[]).includes(v);
}

export function ehCanalValido(v: unknown): v is Canal {
  return typeof v === 'string' && (CANAIS_VALIDOS as string[]).includes(v);
}

export function ehTurnoVisitaValido(v: unknown): v is TurnoVisita {
  return typeof v === 'string' && (TURNOS_VISITA_VALIDOS as string[]).includes(v);
}

export function ehStatusProtocoloValido(v: unknown): v is StatusProtocolo {
  return typeof v === 'string' && (STATUS_PROTOCOLO_VALIDOS as string[]).includes(v);
}

const REGEX_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarPayloadOferta(body: Record<string, unknown>): {
  etapa: EtapaId;
  periodo: Periodo;
  vagas?: number;
  fila?: number;
  origem: EventoVaga['origem'];
} {
  if (!ehEtapaValida(body.etapa)) {
    throw new HttpError(400, 'Etapa de ensino inválida.');
  }
  if (!ehPeriodoValido(body.periodo)) {
    throw new HttpError(400, 'Período inválido. Informe "integral" ou "parcial".');
  }

  let vagas: number | undefined;
  if (body.vagas !== undefined) {
    const n = Number(body.vagas);
    if (!Number.isFinite(n) || n < 0 || n > 2000) {
      throw new HttpError(400, 'Quantidade de vagas inválida.');
    }
    vagas = Math.round(n);
  }

  let fila: number | undefined;
  if (body.fila !== undefined) {
    const n = Number(body.fila);
    if (!Number.isFinite(n) || n < 0 || n > 5000) {
      throw new HttpError(400, 'Quantidade de fila de espera inválida.');
    }
    fila = Math.round(n);
  }

  const origensValidas: Array<EventoVaga['origem']> = ['escola', 'protocolo', 'secretaria'];
  const origem: EventoVaga['origem'] =
    typeof body.origem === 'string' && origensValidas.includes(body.origem as EventoVaga['origem'])
      ? (body.origem as EventoVaga['origem'])
      : 'escola';

  return {
    etapa: body.etapa,
    periodo: body.periodo,
    vagas,
    fila,
    origem,
  };
}

export function validarPayloadAlerta(body: Record<string, unknown>): {
  canal: Canal;
  telefone?: string;
  etapa: EtapaId;
  periodo: Periodo | 'tanto-faz';
  local: { lat: number; lng: number; rotulo: string };
  raioKm: number;
  escolaId?: string;
  escolaNome?: string;
} {
  if (!ehCanalValido(body.canal)) {
    throw new HttpError(400, 'Canal de alerta inválido. Use "whatsapp" ou "push".');
  }
  if (!ehEtapaValida(body.etapa)) {
    throw new HttpError(400, 'Etapa de ensino inválida para o alerta.');
  }

  const periodoRaw = body.periodo ?? 'tanto-faz';
  if (periodoRaw !== 'tanto-faz' && !ehPeriodoValido(periodoRaw)) {
    throw new HttpError(400, 'Período inválido para o alerta.');
  }

  const localObj =
    body.local !== null && typeof body.local === 'object'
      ? (body.local as Record<string, unknown>)
      : null;

  if (!localObj) {
    throw new HttpError(400, 'Informe a localização de referência em Patos - PB.');
  }

  const lat = Number(localObj.lat);
  const lng = Number(localObj.lng);
  const rotulo = limparTexto(localObj.rotulo, 80);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !rotulo) {
    throw new HttpError(400, 'Coordenadas ou rótulo de bairro inválidos.');
  }

  const raioNum = Number(body.raioKm ?? 2);
  const raioKm = Number.isFinite(raioNum) ? Math.max(0.5, Math.min(50, raioNum)) : 2;

  const telefoneLimpo = typeof body.telefone === 'string' ? body.telefone.replace(/\D/g, '') : '';
  if (body.canal === 'whatsapp' && (telefoneLimpo.length < 10 || telefoneLimpo.length > 13)) {
    throw new HttpError(400, 'Para alertas via WhatsApp, informe um celular válido com DDD.');
  }

  const escolaId = limparTexto(body.escolaId, 80) || undefined;
  const escolaNome = limparTexto(body.escolaNome, 120) || undefined;

  return {
    canal: body.canal,
    telefone: telefoneLimpo || undefined,
    etapa: body.etapa,
    periodo: periodoRaw,
    local: { lat, lng, rotulo },
    raioKm,
    escolaId,
    escolaNome,
  };
}

export function validarPayloadProtocolo(body: Record<string, unknown>): {
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
  criteriosPrioridade?: CriterioVulnerabilidadeId[];
  origem?: 'regular' | 'judicial';
  numeroProcessoJudicial?: string;
} {
  const escolaId = limparTexto(body.escolaId, 80);
  if (!escolaId) {
    throw new HttpError(400, 'Informe a unidade escolar de Patos - PB.');
  }

  if (!ehEtapaValida(body.etapa)) {
    throw new HttpError(400, 'Etapa de ensino inválida.');
  }

  const responsavel = limparTexto(body.responsavel, 80);
  if (responsavel.length < 2) {
    throw new HttpError(400, 'Informe o nome do pai, mãe ou responsável legal (mínimo 2 caracteres).');
  }

  const periodo: Periodo = ehPeriodoValido(body.periodo) ? body.periodo : 'integral';
  const turma = limparTexto(body.turma, 60) || ETAPAS[body.etapa].nome;
  const turnoVisita: TurnoVisita = ehTurnoVisitaValido(body.turnoVisita) ? body.turnoVisita : 'manha';

  const dataRaw = limparTexto(body.dataVisita, 10);
  const dataVisita = REGEX_DATA_ISO.test(dataRaw) ? dataRaw : proximoDiaUtilISO(1);

  const nascRaw = limparTexto(body.nascimento, 10);
  const nascimento = REGEX_DATA_ISO.test(nascRaw) ? nascRaw : undefined;

  const telefone = limparTexto(body.telefone, 30) || undefined;
  const documentoEstudante = limparTexto(body.documentoEstudante, 50) || undefined;

  const documentosMarcados = Array.isArray(body.documentosMarcados)
    ? body.documentosMarcados
        .filter((item): item is string => typeof item === 'string')
        .map((s) => limparTexto(s, 40))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const totalNum = Number(body.totalObrigatorios);
  const totalObrigatorios = Number.isFinite(totalNum)
    ? Math.max(1, Math.min(20, Math.round(totalNum)))
    : 6;

  const criteriosPrioridade: CriterioVulnerabilidadeId[] = [];
  if (Array.isArray(body.criteriosPrioridade)) {
    for (const item of body.criteriosPrioridade) {
      if (typeof item === 'string' && item in CRITERIOS_VULNERABILIDADE) {
        criteriosPrioridade.push(item as CriterioVulnerabilidadeId);
      }
    }
  }

  const origem = body.origem === 'judicial' ? 'judicial' : 'regular';
  const numeroProcessoJudicial = limparTexto(body.numeroProcessoJudicial, 40) || undefined;

  return {
    escolaId,
    etapa: body.etapa,
    turma,
    periodo,
    responsavel,
    telefone,
    nascimento,
    turnoVisita,
    dataVisita,
    documentosMarcados,
    totalObrigatorios,
    documentoEstudante,
    criteriosPrioridade: criteriosPrioridade.length > 0 ? criteriosPrioridade : undefined,
    origem,
    numeroProcessoJudicial,
  };
}

export function validarPayloadDemandaJudicial(body: Record<string, unknown>): {
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
} {
  const numeroProcesso = limparTexto(body.numeroProcesso, 40);
  if (numeroProcesso.length < 5) {
    throw new HttpError(400, 'Informe o número válido do processo judicial (formato CNJ/PJe).');
  }

  const vara = limparTexto(body.vara, 120);
  if (vara.length < 3) {
    throw new HttpError(400, 'Informe a Vara ou Promotoria de origem.');
  }

  const estudanteNome = limparTexto(body.estudanteNome, 100);
  if (estudanteNome.length < 2) {
    throw new HttpError(400, 'Informe o nome do estudante.');
  }

  const responsavelNome = limparTexto(body.responsavelNome, 100);
  if (responsavelNome.length < 2) {
    throw new HttpError(400, 'Informe o nome do representante legal.');
  }

  const cpfCertidao = limparTexto(body.cpfCertidao, 50);
  if (cpfCertidao.length < 4) {
    throw new HttpError(400, 'Informe o CPF ou número da certidão de nascimento do aluno.');
  }

  const escolaId = limparTexto(body.escolaId, 80);
  if (!escolaId) {
    throw new HttpError(400, 'Selecione a unidade escolar designada em Patos - PB.');
  }

  if (!ehEtapaValida(body.etapa)) {
    throw new HttpError(400, 'Etapa de ensino inválida.');
  }

  const periodo: Periodo = ehPeriodoValido(body.periodo) ? body.periodo : 'integral';
  const juizPromotor = limparTexto(body.juizPromotor, 100) || undefined;
  const observacoes = limparTexto(body.observacoes, 500) || undefined;

  const prazoNum = Number(body.prazoHoras ?? 48);
  const prazoHoras = Number.isFinite(prazoNum) ? Math.max(1, Math.min(720, Math.round(prazoNum))) : 48;

  const multaNum = Number(body.multaDiaria ?? 1000);
  const multaDiaria = Number.isFinite(multaNum) && multaNum >= 0 ? multaNum : 1000;

  return {
    numeroProcesso,
    vara,
    juizPromotor,
    estudanteNome,
    responsavelNome,
    cpfCertidao,
    escolaId,
    etapa: body.etapa,
    periodo,
    prazoHoras,
    multaDiaria,
    observacoes,
  };
}

