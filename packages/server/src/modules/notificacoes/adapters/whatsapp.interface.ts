/**
 * Contrato de Provedor de Disparo de WhatsApp
 */
export interface WhatsAppMessageResult {
  ok: boolean;
  provedor: string;
  resposta?: string;
  codigoHttp?: number;
}

export interface WhatsAppProvider {
  readonly nome: string;
  enviarMensagem(destinatario: string, texto: string): Promise<WhatsAppMessageResult>;
}
