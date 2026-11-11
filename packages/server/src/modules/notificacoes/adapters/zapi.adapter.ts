import type { WhatsAppMessageResult, WhatsAppProvider } from './whatsapp.interface.ts';

/**
 * Adaptador para Z-API - Provedor comercial brasileiro com endpoint /send-text
 */
export class ZApiWhatsAppAdapter implements WhatsAppProvider {
  readonly nome = 'z-api';
  private readonly apiUrl: string;
  private readonly clientToken: string;

  constructor(apiUrl: string, clientToken: string) {
    this.apiUrl = apiUrl.replace(/\/+$/, '');
    this.clientToken = clientToken;
  }

  async enviarMensagem(destinatario: string, texto: string): Promise<WhatsAppMessageResult> {
    const limpo = destinatario.replace(/\D/g, '');
    const endpoint = this.apiUrl.endsWith('/send-text')
      ? this.apiUrl
      : `${this.apiUrl}/send-text`;

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.clientToken,
        },
        body: JSON.stringify({
          phone: limpo,
          message: texto,
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
      const msg = err instanceof Error ? err.message : 'Falha de conexão com Z-API';
      return {
        ok: false,
        provedor: this.nome,
        resposta: msg,
      };
    }
  }
}

