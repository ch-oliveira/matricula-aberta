import type { WhatsAppMessageResult, WhatsAppProvider } from './whatsapp.interface.ts';

/**
 * Adaptador Webhook genérico para qualquer serviço de integração (n8n, Make, custom gateway, etc.)
 */
export class WebhookWhatsAppAdapter implements WhatsAppProvider {
  readonly nome = 'webhook-gateway';
  private readonly webhookUrl: string;
  private readonly secretToken?: string;
  private readonly cabecalhosCustomizados?: Record<string, string>;

  constructor(
    webhookUrl: string,
    secretToken?: string,
    cabecalhosCustomizados?: Record<string, string>,
  ) {
    this.webhookUrl = webhookUrl;
    this.secretToken = secretToken;
    this.cabecalhosCustomizados = cabecalhosCustomizados;
  }

  async enviarMensagem(destinatario: string, texto: string): Promise<WhatsAppMessageResult> {
    const limpo = destinatario.replace(/\D/g, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.cabecalhosCustomizados,
    };

    if (this.secretToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${this.secretToken}`;
    }

    try {
      const resp = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          evento: 'whatsapp_notificacao_matricula',
          municipio: 'Patos - PB',
          destinatario: limpo,
          mensagem: texto,
          enviadoEm: Date.now(),
        }),
      });

      const bodyTexto = await resp.text();
      return {
        ok: resp.ok,
        provedor: this.nome,
        codigoHttp: resp.status,
        resposta: bodyTexto.slice(0, 300),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha de conexão com webhook de WhatsApp';
      return {
        ok: false,
        provedor: this.nome,
        resposta: msg,
      };
    }
  }
}
