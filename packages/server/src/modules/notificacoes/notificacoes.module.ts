import {
  dataLocalISO,
  horarioTurnoVisita,
  type TurnoVisita,
} from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';
import { obterProtocoloPorCodigo } from '../protocolos/protocolos.module.ts';
import {
  extrairCodigoProtocoloTexto,
  normalizarTelefoneWhatsApp,
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
  const tel = normalizarTelefoneWhatsApp(p.telefone);
  if (!tel || tel.length < 12) return { ok: false };
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

export function formatarMensagemRespostaConsultaProtocolo(p: {
  codigo: string;
  responsavel: string;
  escolaNome: string;
  turma: string;
  turnoVisita: TurnoVisita;
  dataVisita: string;
  reservaVaga?: boolean;
}): string {
  const turnoRotulo = p.turnoVisita === 'manha' ? 'Manhã (07h30 às 11h30)' : 'Tarde (13h30 às 17h30)';
  const situacao = p.reservaVaga ? '🔒 *Vaga Pré-Reservada e Garantida*' : '📋 *Inscrito na Fila de Espera Oficial*';
  return (
    `📋 *Consulta de Agendamento · Matrícula Aberta Patos - PB*\n\n` +
    `Olá, *${p.responsavel}*! Localizamos o seu protocolo no sistema:\n\n` +
    `🎫 *Código:* ${p.codigo}\n` +
    `🏫 *Escola:* ${p.escolaNome}\n` +
    `🎒 *Turma:* ${p.turma}\n` +
    `📅 *Data da Visita:* ${p.dataVisita}\n` +
    `🕒 *Turno:* ${turnoRotulo}\n` +
    `${situacao}\n\n` +
    `📌 *Lembre-se de levar:* Certidão de Nascimento/RG da criança, comprovante de residência e documento do responsável com foto.\n\n` +
    `Para visualizar seu comprovante digital completo com QR Code, acesse:\n` +
    `https://matricula.patos.pb.gov.br/#/protocolo/${p.codigo}`
  );
}

export function formatarMensagemMenuAjuda(): string {
  return (
    `👋 *Atendimento Digital · Matrícula Aberta Patos - PB*\n\n` +
    `Olá! Sou o assistente automático da Secretaria Municipal de Educação.\n\n` +
    `• Para consultar seu agendamento, digite o *código do seu protocolo* (exemplo: *PATOS-2027-1234*).\n` +
    `• Para verificar vagas disponíveis na rede escolar e fazer pré-reserva, acesse nosso portal oficial:\n` +
    `👉 https://matricula.patos.pb.gov.br\n\n` +
    `📞 Atendimento SEDUC: (83) 3421-2204 (Segunda a Sexta, das 07h às 13h).`
  );
}

export function extrairMensagemWebhook(payload: Record<string, unknown>): {
  remetente: string | null;
  texto: string | null;
  status?: string;
} {
  // 1. Padrão Meta WhatsApp Cloud API
  const entry = Array.isArray(payload.entry) ? (payload.entry[0] as any) : undefined;
  const changes = Array.isArray(entry?.changes) ? (entry.changes[0] as any) : undefined;
  const value = changes?.value;

  if (value) {
    if (Array.isArray(value.messages) && value.messages.length > 0) {
      const msg = value.messages[0];
      const from = typeof msg.from === 'string' ? msg.from : null;
      const text = typeof msg.text?.body === 'string' ? msg.text.body : null;
      return { remetente: from, texto: text };
    }
    if (Array.isArray(value.statuses) && value.statuses.length > 0) {
      const st = value.statuses[0];
      return {
        remetente: typeof st.recipient_id === 'string' ? st.recipient_id : null,
        texto: null,
        status: typeof st.status === 'string' ? st.status : undefined,
      };
    }
  }

  // 2. Padrão Evolution API
  const evoData = payload.data as any;
  if (evoData) {
    const remoteJid = typeof evoData.key?.remoteJid === 'string' ? evoData.key.remoteJid : '';
    const phone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/\D/g, '');
    const conversation =
      typeof evoData.message?.conversation === 'string'
        ? evoData.message.conversation
        : typeof evoData.message?.extendedTextMessage?.text === 'string'
          ? evoData.message.extendedTextMessage.text
          : null;
    if (phone && conversation) {
      return { remetente: phone, texto: conversation };
    }
  }

  // 3. Padrão Z-API
  if (typeof payload.phone === 'string' || typeof (payload as any).sender === 'string') {
    const phone = (payload.phone as string) || ((payload as any).sender as string);
    const textObj = payload.text as any;
    const text =
      typeof textObj?.message === 'string'
        ? textObj.message
        : typeof payload.message === 'string'
          ? (payload.message as string)
          : null;
    return { remetente: phone, texto: text };
  }

  // 4. Padrão Genérico
  const genericPhone =
    (typeof payload.from === 'string' && payload.from) ||
    (typeof payload.destinatario === 'string' && payload.destinatario) ||
    (typeof payload.telefone === 'string' && payload.telefone) ||
    null;
  const genericText =
    (typeof payload.text === 'string' && payload.text) ||
    (typeof payload.body === 'string' && payload.body) ||
    (typeof payload.mensagem === 'string' && payload.mensagem) ||
    null;

  return { remetente: genericPhone, texto: genericText };
}

export async function processarWebhookWhatsAppEntrada(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  acao: string;
  respostaEnviada?: boolean;
  protocoloCodigo?: string;
  destinatario?: string;
}> {
  const { remetente, texto, status } = extrairMensagemWebhook(payload);

  if (status && remetente) {
    const normalizado = normalizarTelefoneWhatsApp(remetente);
    const registro = historicoNotificacoes.find((h) => normalizarTelefoneWhatsApp(h.telefone) === normalizado);
    if (registro) {
      registro.resposta = `STATUS_UPDATED_${status.toUpperCase()}`;
    }
    return { ok: true, acao: 'recibo_entrega_atualizado', destinatario: normalizado };
  }

  if (!remetente || !texto) {
    return { ok: true, acao: 'ignorado_sem_conteudo' };
  }

  const telNormalizado = normalizarTelefoneWhatsApp(remetente);
  const textoLimpo = texto.trim();
  const provedor = obterProvedorAtivo();

  // 1. Tenta identificar se o usuário enviou um código de protocolo PATOS-AAAA-XXXX
  const codigoIdentificado = extrairCodigoProtocoloTexto(textoLimpo);
  if (codigoIdentificado) {
    const protocolo = await obterProtocoloPorCodigo(codigoIdentificado);
    if (protocolo) {
      const msgResposta = formatarMensagemRespostaConsultaProtocolo(protocolo);
      const res = await provedor.enviarMensagem(telNormalizado, msgResposta);
      return {
        ok: true,
        acao: 'protocolo_encontrado_respondido',
        respostaEnviada: res.ok,
        protocoloCodigo: codigoIdentificado,
        destinatario: telNormalizado,
      };
    } else {
      const msgErro =
        `❌ *Protocolo não localizado · Patos - PB*\n\n` +
        `Não encontramos nenhum agendamento com o código *${codigoIdentificado}*.\n` +
        `Por favor, confira os números no seu voucher ou acesse: https://matricula.patos.pb.gov.br`;
      const res = await provedor.enviarMensagem(telNormalizado, msgErro);
      return {
        ok: true,
        acao: 'protocolo_nao_encontrado_respondido',
        respostaEnviada: res.ok,
        protocoloCodigo: codigoIdentificado,
        destinatario: telNormalizado,
      };
    }
  }

  // 2. Palavras-chave de saudação ou menu de ajuda
  const upper = textoLimpo.toUpperCase();
  const ehSaudacao =
    upper.includes('AJUDA') ||
    upper.includes('OLA') ||
    upper.includes('OLÁ') ||
    upper.includes('OI') ||
    upper.includes('BOM DIA') ||
    upper.includes('BOA TARDE') ||
    upper.includes('MATRICULA') ||
    upper.includes('MATRÍCULA') ||
    upper.includes('MENU') ||
    upper.includes('STATUS');

  if (ehSaudacao) {
    const menu = formatarMensagemMenuAjuda();
    const res = await provedor.enviarMensagem(telNormalizado, menu);
    return {
      ok: true,
      acao: 'menu_ajuda_respondido',
      respostaEnviada: res.ok,
      destinatario: telNormalizado,
    };
  }

  return { ok: true, acao: 'mensagem_recebida_sem_gatilho', destinatario: telNormalizado };
}

export function obterMetricasNotificacoes(): {
  provedorAtivo: string;
  totalEnviadas: number;
  totalSucessos: number;
  totalFalhas: number;
  ultimas: MensagemWhatsApp[];
} {
  const total = historicoNotificacoes.length;
  const sucessos = historicoNotificacoes.filter((h) => h.sucesso).length;
  const falhas = total - sucessos;
  const provedor = obterProvedorAtivo();
  return {
    provedorAtivo: provedor.nome,
    totalEnviadas: total,
    totalSucessos: sucessos,
    totalFalhas: falhas,
    ultimas: historicoNotificacoes.slice(-20).reverse(),
  };
}

export async function dispararMensagemTesteWhatsApp(telefone: string): Promise<{ ok: boolean; resposta?: string }> {
  const limpo = normalizarTelefoneWhatsApp(telefone);
  if (!limpo || limpo.length < 12) {
    throw new Error('Informe um número de telefone com DDD válido.');
  }
  const provedor = obterProvedorAtivo();
  const texto =
    `🧪 *Mensagem de Teste · Secretaria de Educação de Patos - PB*\n\n` +
    `Seu gateway de WhatsApp (*${provedor.nome}*) está conectado e operando com sucesso!\n` +
    `Data do teste: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}.`;

  const res = await provedor.enviarMensagem(limpo, texto);
  const agoraMs = Date.now();
  historicoNotificacoes.push({
    id: `teste-${agoraMs}`,
    telefone: limpo,
    codigoProtocolo: 'TESTE-SEDUC',
    tipo: 'lembrete_dia',
    texto,
    enviadoEm: agoraMs,
    sucesso: res.ok,
    provedor: provedor.nome,
    resposta: res.resposta,
  });
  return { ok: res.ok, resposta: res.resposta };
}

