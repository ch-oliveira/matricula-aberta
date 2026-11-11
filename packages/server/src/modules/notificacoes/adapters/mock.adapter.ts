import type { WhatsAppMessageResult, WhatsAppProvider } from './whatsapp.interface.ts';

/**
 * Adaptador Mock para desenvolvimento local, CI e testes automatizados.
 * Não realiza requisições HTTP externas e simula entrega com log estruturado opcional.
 */
export class MockWhatsAppAdapter implements WhatsAppProvider {
  readonly nome = 'mock-local';
  private readonly registrarLog: boolean;

  constructor(registrarLog = process.env.WHATSAPP_LOG_MOCK === 'true') {
    this.registrarLog = registrarLog;
  }

  async enviarMensagem(destinatario: string, texto: string): Promise<WhatsAppMessageResult> {
    if (this.registrarLog) {
      console.log(`[WhatsApp Mock] Para: ${destinatario} | Texto: ${texto.slice(0, 80).replace(/\n/g, ' ')}...`);
    }
    return {
      ok: true,
      provedor: this.nome,
      resposta: 'MOCK_SENT_200',
      codigoHttp: 200,
    };
  }
}

