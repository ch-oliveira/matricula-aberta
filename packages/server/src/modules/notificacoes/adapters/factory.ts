import { CloudApiWhatsAppAdapter } from './cloud-api.adapter.ts';
import { EvolutionWhatsAppAdapter } from './evolution.adapter.ts';
import { MockWhatsAppAdapter } from './mock.adapter.ts';
import { WebhookWhatsAppAdapter } from './webhook.adapter.ts';
import type { WhatsAppProvider } from './whatsapp.interface.ts';
import { ZApiWhatsAppAdapter } from './zapi.adapter.ts';

export type WhatsAppProviderTipo = 'mock' | 'evolution' | 'zapi' | 'cloud-api' | 'webhook';

let provedorSobrescrito: WhatsAppProvider | null = null;

/**
 * Cria uma instância de WhatsAppProvider de acordo com o tipo e parâmetros fornecidos
 */
export function criarWhatsAppAdapter(
  tipo?: WhatsAppProviderTipo,
  opcoes?: {
    apiUrl?: string;
    apiToken?: string;
    instance?: string;
    webhookHeaders?: Record<string, string>;
  },
): WhatsAppProvider {
  const url = (opcoes?.apiUrl ?? process.env.WHATSAPP_API_URL ?? '').trim();
  const token = (opcoes?.apiToken ?? process.env.WHATSAPP_API_TOKEN ?? '').trim();
  const instance = opcoes?.instance ?? process.env.WHATSAPP_INSTANCE ?? 'default';

  const tipoEscolhido = tipo ?? detectarTipoProvedor(url);

  switch (tipoEscolhido) {
    case 'evolution':
      if (url && token) return new EvolutionWhatsAppAdapter(url, token, instance);
      break;
    case 'zapi':
      if (url && token) return new ZApiWhatsAppAdapter(url, token);
      break;
    case 'cloud-api':
      if (url && token) return new CloudApiWhatsAppAdapter(url, token);
      break;
    case 'webhook':
      if (url) return new WebhookWhatsAppAdapter(url, token || undefined, opcoes?.webhookHeaders);
      break;
    case 'mock':
    default:
      return new MockWhatsAppAdapter();
  }

  return new MockWhatsAppAdapter();
}

/**
 * Detecta o tipo de provedor a partir da URL da API ou da variável de ambiente WHATSAPP_PROVIDER
 */
function detectarTipoProvedor(apiUrl: string): WhatsAppProviderTipo {
  const envProvider = (process.env.WHATSAPP_PROVIDER ?? '').toLowerCase().trim();
  if (['evolution', 'zapi', 'cloud-api', 'webhook', 'mock'].includes(envProvider)) {
    return envProvider as WhatsAppProviderTipo;
  }

  if (apiUrl) {
    if (apiUrl.includes('z-api.io')) return 'zapi';
    if (apiUrl.includes('graph.facebook.com')) return 'cloud-api';
    if (apiUrl.includes('evolution') || apiUrl.includes('/message/sendText')) return 'evolution';
    return 'webhook';
  }

  return 'mock';
}

/**
 * Retorna o provedor ativo atual (permite injeção de dependência em testes)
 */
export function obterProvedorAtivo(): WhatsAppProvider {
  if (provedorSobrescrito) return provedorSobrescrito;
  return criarWhatsAppAdapter();
}

/**
 * Sobrescreve o provedor ativo (útil para testes unitários com spy/mock)
 */
export function definirProvedorWhatsApp(provedor: WhatsAppProvider | null): void {
  provedorSobrescrito = provedor;
}

