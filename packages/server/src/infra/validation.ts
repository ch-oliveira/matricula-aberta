import {
  CANAIS_VALIDOS,
  ETAPAS,
  ORDEM_ETAPAS,
  PERIODOS_VALIDOS,
  proximoDiaUtilISO,
  STATUS_PROTOCOLO_VALIDOS,
  TURNOS_VISITA_VALIDOS,
  type Canal,
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
  };
}

