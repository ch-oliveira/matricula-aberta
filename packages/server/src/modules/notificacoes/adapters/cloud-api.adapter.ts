import type { WhatsAppMessageResult, WhatsAppProvider } from './whatsapp.interface.ts';

/**
 * Adaptador para Meta WhatsApp Cloud API (Graph API)
 */
export class CloudApiWhatsAppAdapter implements WhatsAppProvider {
  readonly nome = 'meta-cloud-api';
  private readonly apiUrl: string;
  private readonly accessToken: string;

  constructor(apiUrl: string, accessToken: string) {
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
  }

  async enviarMensagem(destinatario: string, texto: string): Promise<WhatsAppMessageResult> {
    const limpo = destinatario.replace(/\D/g, '');
    try {
      const resp = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: limpo,
          type: 'text',
          text: {
            preview_url: false,
            body: texto,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const bodyTexto = await resp.text();
      return {
        ok: resp.ok,
        provedor: this.nome,
        codigoHttp: resp.status,
        resposta: bodyTexto.slice(0, 300),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha de conexão com Meta WhatsApp Cloud API';
      return {
        ok: false,
        provedor: this.nome,
        resposta: msg,
      };
    }
  }
}

