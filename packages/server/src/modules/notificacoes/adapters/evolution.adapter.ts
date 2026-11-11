import type { WhatsAppMessageResult, WhatsAppProvider } from './whatsapp.interface.ts';

/**
 * Adaptador para Evolution API (v1 / v2) - Gateway Open-Source popular para WhatsApp
 */
export class EvolutionWhatsAppAdapter implements WhatsAppProvider {
  readonly nome = 'evolution-api';
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor(apiUrl: string, apiKey: string, instance = 'default') {
    this.apiUrl = apiUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.instance = instance;
  }

  async enviarMensagem(destinatario: string, texto: string): Promise<WhatsAppMessageResult> {
    const limpo = destinatario.replace(/\D/g, '');
    const endpoint = this.apiUrl.includes('/message/sendText')
      ? this.apiUrl
      : `${this.apiUrl}/message/sendText/${this.instance}`;

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: limpo,
          text: texto,
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
      const msg = err instanceof Error ? err.message : 'Falha de conexão com Evolution API';
      return {
        ok: false,
        provedor: this.nome,
        resposta: msg,
      };
    }
  }
}
