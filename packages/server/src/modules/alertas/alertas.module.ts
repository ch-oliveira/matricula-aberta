import { createHash, randomUUID } from 'node:crypto';
import type { Alerta, Canal, EtapaId, Periodo } from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';

const NOVENTA_DIAS_MS = 90 * 24 * 3600 * 1000;

export function mascararTelefoneLGPD(tel?: string): { mascarado: string | null; hash: string | null } {
  if (!tel) return { mascarado: null, hash: null };
  const digitos = tel.replace(/\D/g, '');
  if (digitos.length < 10) return { mascarado: null, hash: null };
  const ddd = digitos.slice(0, 2);
  const final = digitos.slice(-4);
  const mascarado = `(${ddd}) 9••••-${final}`;
  const hash = createHash('sha256').update(`ma-lgpd-patos:${digitos}`).digest('hex');
  return { mascarado, hash };
}

export function garantirSeedAlertasPatos(forcarReset = false) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM alertas').get() as { c: number }).c;
  if (count > 0 && !forcarReset) return;

  if (forcarReset) {
    db.exec('DELETE FROM alertas;');
  }

  const agora = Date.now();
  const expira = agora + NOVENTA_DIAS_MS;
  const seed = [
    {
      canal: 'whatsapp' as Canal,
      tel: '83996124810',
      etapa: 'bercario' as EtapaId,
      periodo: 'integral',
      lat: -7.0148,
      lng: -37.2742,
      rotulo: 'Belo Horizonte',
      raio: 2,
      escolaId: 'creche-tia-luci',
      escolaNome: 'Creche Municipal Tia Luci',
      offsetMin: 180,
    },
    {
      canal: 'whatsapp' as Canal,
      tel: '83988412290',
      etapa: 'bercario' as EtapaId,
      periodo: 'integral',
      lat: -7.0148,
      lng: -37.2742,
      rotulo: 'Belo Horizonte',
      raio: 3,
      escolaId: 'creche-tia-luci',
      escolaNome: 'Creche Municipal Tia Luci',
      offsetMin: 145,
    },
    {
      canal: 'whatsapp' as Canal,
      tel: '83991337054',
      etapa: 'bercario' as EtapaId,
      periodo: 'integral',
      lat: -7.0285,
      lng: -37.2848,
      rotulo: 'Liberdade',
      raio: 2,
      escolaId: 'cmei-pedro-satiro',
      escolaNome: 'CMEI Dr. Pedro Sátiro',
      offsetMin: 95,
    },
    {
      canal: 'push' as Canal,
      tel: undefined,
      etapa: 'maternal' as EtapaId,
      periodo: 'integral',
      lat: -7.0249,
      lng: -37.2665,
      rotulo: 'São Sebastião',
      raio: 2,
      escolaId: 'creche-dona-nini',
      escolaNome: 'Creche Municipal Dona Nini',
      offsetMin: 72,
    },
    {
      canal: 'whatsapp' as Canal,
      tel: '83999045123',
      etapa: 'fund1' as EtapaId,
      periodo: 'parcial',
      lat: -7.0148,
      lng: -37.2742,
      rotulo: 'Belo Horizonte',
      raio: 2,
      escolaId: 'emef-aristides-hamad-timene',
      escolaNome: 'EMEF Aristides Hamad Timene',
      offsetMin: 50,
    },
    {
      canal: 'whatsapp' as Canal,
      tel: '83987158832',
      etapa: 'fund2' as EtapaId,
      periodo: 'parcial',
      lat: -7.0432,
      lng: -37.2725,
      rotulo: 'Jatobá',
      raio: 3,
      escolaId: 'emef-alirio-meira-wanderley',
      escolaNome: 'EMEF Alírio Meira Wanderley',
      offsetMin: 35,
    },
    {
      canal: 'whatsapp' as Canal,
      tel: '83993221109',
      etapa: 'fund2' as EtapaId,
      periodo: 'parcial',
      lat: -7.0432,
      lng: -37.2725,
      rotulo: 'Jatobá',
      raio: 2,
      escolaId: 'emef-alirio-meira-wanderley',
      escolaNome: 'EMEF Alírio Meira Wanderley',
      offsetMin: 20,
    },
  ];

  const ins = db.prepare(`
    INSERT INTO alertas (
      id, canal, telefone_mascarado, telefone_hash, etapa, periodo,
      local_lat, local_lng, local_rotulo, raio_km, escola_id, escola_nome, criado_em, expira_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of seed) {
    const { mascarado, hash } = mascararTelefoneLGPD(s.tel);
    ins.run(
      randomUUID(),
      s.canal,
      mascarado,
      hash,
      s.etapa,
      s.periodo,
      s.lat,
      s.lng,
      s.rotulo,
      s.raio,
      s.escolaId,
      s.escolaNome,
      agora - s.offsetMin * 60_000,
      expira,
    );
  }
}

export function listarAlertas(): Alerta[] {
  const agora = Date.now();
  db.prepare('DELETE FROM alertas WHERE expira_em < ?').run(agora);

  const rows = db.prepare('SELECT * FROM alertas ORDER BY criado_em DESC').all() as Array<{
    id: string;
    canal: Canal;
    telefone_mascarado: string | null;
    etapa: EtapaId;
    periodo: Periodo | 'tanto-faz';
    local_lat: number;
    local_lng: number;
    local_rotulo: string;
    raio_km: number;
    escola_id: string | null;
    escola_nome: string | null;
    criado_em: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    canal: r.canal,
    telefone: r.telefone_mascarado ?? undefined,
    etapa: r.etapa,
    periodo: r.periodo,
    local: { lat: r.local_lat, lng: r.local_lng, rotulo: r.local_rotulo },
    raioKm: r.raio_km,
    escolaId: r.escola_id ?? undefined,
    escolaNome: r.escola_nome ?? undefined,
    criadoEm: r.criado_em,
  }));
}

export function criarAlerta(dados: {
  canal: Canal;
  telefone?: string;
  etapa: EtapaId;
  periodo: Periodo | 'tanto-faz';
  local: { lat: number; lng: number; rotulo: string };
  raioKm: number;
  escolaId?: string;
  escolaNome?: string;
}): Alerta {
  const id = randomUUID();
  const criadoEm = Date.now();
  const expiraEm = criadoEm + NOVENTA_DIAS_MS;
  const { mascarado, hash } = mascararTelefoneLGPD(dados.telefone);

  db.prepare(
    `INSERT INTO alertas (
      id, canal, telefone_mascarado, telefone_hash, etapa, periodo,
      local_lat, local_lng, local_rotulo, raio_km, escola_id, escola_nome, criado_em, expira_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    dados.canal,
    mascarado,
    hash,
    dados.etapa,
    dados.periodo,
    dados.local.lat,
    dados.local.lng,
    dados.local.rotulo,
    dados.raioKm,
    dados.escolaId ?? null,
    dados.escolaNome ?? null,
    criadoEm,
    expiraEm,
  );

  return {
    id,
    canal: dados.canal,
    telefone: mascarado ?? undefined,
    etapa: dados.etapa,
    periodo: dados.periodo,
    local: dados.local,
    raioKm: dados.raioKm,
    escolaId: dados.escolaId,
    escolaNome: dados.escolaNome,
    criadoEm,
  };
}

export function removerAlerta(id: string): boolean {
  const res = db.prepare('DELETE FROM alertas WHERE id = ?').run(id);
  return res.changes > 0;
}

