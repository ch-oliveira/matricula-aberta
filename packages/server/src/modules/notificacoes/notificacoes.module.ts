import {
  dataLocalISO,
  horarioTurnoVisita,
  type TurnoVisita,
} from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';
import {
  obterProvedorAtivo,
  type WhatsAppMessageResult,
} from './adapters/index.ts';

export * from './adapters/index.ts';

export interface MensagemWhatsApp {
  id: string;
  telefone: string;
  codigoProtocolo: string;
  tipo: 'lembrete_dia' | 'lembrete_1h';
  texto: string;
  enviadoEm: number;
  sucesso: boolean;
  provedor: string;
  resposta?: string;
}

// Histórico de disparos em memória para auditoria, inspeção e testes automatizados
const historicoNotificacoes: MensagemWhatsApp[] = [];

export function formatarMensagemLembreteDia(p: {
  responsavel: string;
  escolaNome: string;
  turnoVisita: TurnoVisita;
  turma: string;
  codigo: string;
}): string {
  const h = horarioTurnoVisita(p.turnoVisita);
  const turnoRotulo = p.turnoVisita === 'manha' ? 'Manhã' : 'Tarde';
  return (
    `🔔 *Lembrete de Matrícula · Prefeitura Municipal de Patos - PB*\n\n` +
    `Olá, ${p.responsavel}! Lembramos que hoje é o dia do seu atendimento presencial na escola:\n` +
    `🏫 *${p.escolaNome}*\n` +
    `🕒 *Turno:* ${turnoRotulo} (${h.inicio} às ${h.fim})\n` +
    `🎒 *Turma:* ${p.turma}\n\n` +
    `Sua vaga está *pré-reservada e garantida* no sistema. Não se esqueça de levar seus documentos.\n` +
    `🎫 *Código do seu Protocolo:* ${p.codigo}`
  );
}

export function formatarMensagemLembrete1h(p: {
  responsavel: string;
  escolaNome: string;
  turnoVisita: TurnoVisita;
  codigo: string;
}): string {
  const h = horarioTurnoVisita(p.turnoVisita);
  const turnoRotulo = p.turnoVisita === 'manha' ? 'Manhã' : 'Tarde';
  return (
    `⏰ *Atenção: seu atendimento presencial é em 1 hora! · Patos - PB*\n\n` +
    `Olá, ${p.responsavel}! O atendimento do turno da *${turnoRotulo}* na *${p.escolaNome}* inicia em breve (${h.inicio}).\n\n` +
    `Sua vaga está garantida até as ${h.toleranciaExpira}. Apresente seu código *${p.codigo}* na secretaria para confirmar sua matrícula.`
  );
}

export function formatarMensagemConfirmacaoImediata(p: {
  responsavel: string;
  escolaNome: string;
  turma: string;
  turnoVisita: TurnoVisita;
  dataVisita: string;
  codigo: string;
  reservaVaga?: boolean;
}): string {
  const h = horarioTurnoVisita(p.turnoVisita);
  const turnoRotulo = p.turnoVisita === 'manha' ? 'Manhã' : 'Tarde';
  const tipo = p.reservaVaga ? '🔒 *Vaga Pré-Reservada e Garantida*' : '📋 *Inscrição na Fila de Espera Oficial*';
  return (
    `✅ *Confirmação de Agendamento · Prefeitura Municipal de Patos - PB*\n\n` +
    `Olá, ${p.responsavel}! Seu agendamento presencial foi registrado com sucesso:\n` +
    `🏫 *Unidade:* ${p.escolaNome}\n` +
    `🎒 *Turma:* ${p.turma}\n` +
    `📅 *Data da Visita:* ${p.dataVisita}\n` +
    `🕒 *Turno:* ${turnoRotulo} (${h.inicio} às ${h.fim})\n` +
    `${tipo}\n\n` +
    `🎫 *Código do Protocolo:* ${p.codigo}\n` +
    `Apresente este código com os documentos exigidos na secretaria da escola.`
  );
}

export async function enviarMensagemConfirmacaoImediata(p: {
  responsavel: string;
  escolaNome: string;
  turma: string;
  turnoVisita: TurnoVisita;
  dataVisita: string;
  codigo: string;
  reservaVaga?: boolean;
  telefone?: string;
}): Promise<{ ok: boolean }> {
  if (!p.telefone) return { ok: false };
  const tel = p.telefone.replace(/\D/g, '');
  if (!tel || tel.length < 10) return { ok: false };
  const provedor = obterProvedorAtivo();
  const texto = formatarMensagemConfirmacaoImediata(p);
  const res: WhatsAppMessageResult = await provedor.enviarMensagem(tel, texto);
  const agoraMs = Date.now();
  historicoNotificacoes.push({
    id: `${p.codigo}-confirmacao-${agoraMs}`,
    telefone: tel,
    codigoProtocolo: p.codigo,
    tipo: 'lembrete_dia',
    texto,
    enviadoEm: agoraMs,
    sucesso: res.ok,
    provedor: provedor.nome,
    resposta: res.resposta,
  });
  return { ok: res.ok };
}

export async function processarNotificacoesWhatsApp(agora = new Date()): Promise<{
  totalVerificados: number;
  lembretesDiaEnviados: number;
  lembretes1hEnviados: number;
}> {
  const hojeISO = dataLocalISO(agora);
  const hora = agora.getHours();
  const minuto = agora.getMinutes();
  const provedor = obterProvedorAtivo();

  // Busca protocolos aguardando para a data de hoje com telefone cadastrado
  const protocolos = await db.query<{
    codigo: string;
    escola_nome: string;
    turma: string;
    responsavel: string;
    telefone_contato: string | null;
    turno_visita: TurnoVisita;
    notificado_dia_em: number | null;
    notificado_1h_em: number | null;
  }>(
    `SELECT codigo, escola_nome, turma, responsavel, telefone_contato, turno_visita, notificado_dia_em, notificado_1h_em
     FROM protocolos_visita
     WHERE status = 'aguardando'
       AND data_visita = $1
       AND telefone_contato IS NOT NULL
       AND telefone_contato != ''`,
    [hojeISO],
  );

  let lembretesDiaEnviados = 0;
  let lembretes1hEnviados = 0;

  for (const p of protocolos) {
    const tel = p.telefone_contato;
    if (!tel) continue;

    // 1. Lembrete matinal do dia: enviado a partir das 07h00 da manhã
    if (!p.notificado_dia_em && hora >= 7) {
      const texto = formatarMensagemLembreteDia({
        responsavel: p.responsavel,
        escolaNome: p.escola_nome,
        turnoVisita: p.turno_visita,
        turma: p.turma,
        codigo: p.codigo,
      });

      const res = await provedor.enviarMensagem(tel, texto);
      const agoraMs = agora.getTime();

      historicoNotificacoes.push({
        id: `${p.codigo}-dia-${agoraMs}`,
        telefone: tel,
        codigoProtocolo: p.codigo,
        tipo: 'lembrete_dia',
        texto,
        enviadoEm: agoraMs,
        sucesso: res.ok,
        provedor: provedor.nome,
        resposta: res.resposta,
      });

      await db.execute(
        'UPDATE protocolos_visita SET notificado_dia_em = $1 WHERE codigo = $2',
        [agoraMs, p.codigo],
      );
      lembretesDiaEnviados++;
    }

    // 2. Lembrete de 1 hora antes:
    // Turno da Manhã (07h30): dispara entre 06h30 e 07h30 (hora == 6 && min >= 30, ou hora == 7 && min <= 30)
    // Turno da Tarde (13h30): dispara entre 12h30 e 13h30 (hora == 12 && min >= 30, ou hora == 13 && min <= 30)
    if (!p.notificado_1h_em) {
      let deveEnviar1h = false;
      if (p.turno_visita === 'manha') {
        deveEnviar1h = (hora === 6 && minuto >= 30) || (hora === 7 && minuto <= 30);
      } else if (p.turno_visita === 'tarde') {
        deveEnviar1h = (hora === 12 && minuto >= 30) || (hora === 13 && minuto <= 30);
      }

      if (deveEnviar1h) {
        const texto = formatarMensagemLembrete1h({
          responsavel: p.responsavel,
          escolaNome: p.escola_nome,
          turnoVisita: p.turno_visita,
          codigo: p.codigo,
        });

        const res = await provedor.enviarMensagem(tel, texto);
        const agoraMs = agora.getTime();

        historicoNotificacoes.push({
          id: `${p.codigo}-1h-${agoraMs}`,
          telefone: tel,
          codigoProtocolo: p.codigo,
          tipo: 'lembrete_1h',
          texto,
          enviadoEm: agoraMs,
          sucesso: res.ok,
          provedor: provedor.nome,
          resposta: res.resposta,
        });

        await db.execute(
          'UPDATE protocolos_visita SET notificado_1h_em = $1 WHERE codigo = $2',
          [agoraMs, p.codigo],
        );
        lembretes1hEnviados++;
      }
    }
  }

  return {
    totalVerificados: protocolos.length,
    lembretesDiaEnviados,
    lembretes1hEnviados,
  };
}

export function obterHistoricoNotificacoes(): MensagemWhatsApp[] {
  return [...historicoNotificacoes];
}

export function limparHistoricoNotificacoes(): void {
  historicoNotificacoes.length = 0;
}
