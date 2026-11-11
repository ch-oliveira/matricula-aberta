import assert from 'node:assert/strict';
import {
  MockWhatsAppAdapter,
  EvolutionWhatsAppAdapter,
  ZApiWhatsAppAdapter,
  CloudApiWhatsAppAdapter,
  WebhookWhatsAppAdapter,
  criarWhatsAppAdapter,
  definirProvedorWhatsApp,
  obterProvedorAtivo,
  enviarMensagemConfirmacaoImediata,
  limparHistoricoNotificacoes,
  obterHistoricoNotificacoes,
} from '../src/modules/notificacoes/notificacoes.module.ts';

console.log('--- Testando Adaptadores e Gateway de WhatsApp (Patos - PB) ---');

// 1. Mock Adapter
{
  const mock = new MockWhatsAppAdapter(false);
  assert.equal(mock.nome, 'mock-local');
  const res = await mock.enviarMensagem('83999998888', 'Mensagem de teste');
  assert.equal(res.ok, true);
  assert.equal(res.codigoHttp, 200);
  assert.equal(res.resposta, 'MOCK_SENT_200');
  console.log('✓ 1. MockWhatsAppAdapter OK');
}

// 2. Evolution API Adapter
{
  let requisicaoEnviada = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    requisicaoEnviada = { url, opts, body: JSON.parse(opts.body) };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ key: { id: 'EVO-123' }, messageTimestamp: Date.now() }),
    };
  };

  try {
    const evo = new EvolutionWhatsAppAdapter('https://evo.patos.pb.gov.br', 'segredo-evo', 'escola-patos');
    assert.equal(evo.nome, 'evolution-api');
    const res = await evo.enviarMensagem('(83) 98888-7777', 'Olá Patos');
    assert.equal(res.ok, true);
    assert.equal(res.codigoHttp, 200);
    assert.equal(requisicaoEnviada.url, 'https://evo.patos.pb.gov.br/message/sendText/escola-patos');
    assert.equal(requisicaoEnviada.opts.headers.apikey, 'segredo-evo');
    assert.equal(requisicaoEnviada.body.number, '83988887777');
    assert.equal(requisicaoEnviada.body.text, 'Olá Patos');
    console.log('✓ 2. EvolutionWhatsAppAdapter OK');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// 3. Z-API Adapter
{
  let requisicaoEnviada = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    requisicaoEnviada = { url, opts, body: JSON.parse(opts.body) };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ zaapId: 'ZAAP-999', messageId: 'MSG-001' }),
    };
  };

  try {
    const zapi = new ZApiWhatsAppAdapter('https://api.z-api.io/instances/INSTANCE_ID/token/TOKEN', 'client-token-xyz');
    assert.equal(zapi.nome, 'z-api');
    const res = await zapi.enviarMensagem('83987654321', 'Aviso de vaga');
    assert.equal(res.ok, true);
    assert.equal(res.codigoHttp, 200);
    assert.equal(requisicaoEnviada.url, 'https://api.z-api.io/instances/INSTANCE_ID/token/TOKEN/send-text');
    assert.equal(requisicaoEnviada.opts.headers['Client-Token'], 'client-token-xyz');
    assert.equal(requisicaoEnviada.body.phone, '83987654321');
    assert.equal(requisicaoEnviada.body.message, 'Aviso de vaga');
    console.log('✓ 3. ZApiWhatsAppAdapter OK');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// 4. Meta WhatsApp Cloud API Adapter
{
  let requisicaoEnviada = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    requisicaoEnviada = { url, opts, body: JSON.parse(opts.body) };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messaging_product: 'whatsapp', contacts: [{ wa_id: '558399999999' }] }),
    };
  };

  try {
    const cloud = new CloudApiWhatsAppAdapter('https://graph.facebook.com/v21.0/1000000/messages', 'EAAG_TOKEN');
    assert.equal(cloud.nome, 'meta-cloud-api');
    const res = await cloud.enviarMensagem('+55 83 99999-9999', 'Texto de confirmação');
    assert.equal(res.ok, true);
    assert.equal(res.codigoHttp, 200);
    assert.equal(requisicaoEnviada.opts.headers.Authorization, 'Bearer EAAG_TOKEN');
    assert.equal(requisicaoEnviada.body.messaging_product, 'whatsapp');
    assert.equal(requisicaoEnviada.body.to, '5583999999999');
    assert.equal(requisicaoEnviada.body.text.body, 'Texto de confirmação');
    console.log('✓ 4. CloudApiWhatsAppAdapter OK');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// 5. Webhook Gateway Adapter
{
  let requisicaoEnviada = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    requisicaoEnviada = { url, opts, body: JSON.parse(opts.body) };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ received: true }),
    };
  };

  try {
    const webhook = new WebhookWhatsAppAdapter('https://webhook.patos.pb.gov.br/notificacoes', 'token-secreto-wh', {
      'X-Prefeitura': 'Patos',
    });
    assert.equal(webhook.nome, 'webhook-gateway');
    const res = await webhook.enviarMensagem('83988880000', 'Mensagem webhook');
    assert.equal(res.ok, true);
    assert.equal(requisicaoEnviada.opts.headers.Authorization, 'Bearer token-secreto-wh');
    assert.equal(requisicaoEnviada.opts.headers['X-Prefeitura'], 'Patos');
    assert.equal(requisicaoEnviada.body.municipio, 'Patos - PB');
    assert.equal(requisicaoEnviada.body.destinatario, '83988880000');
    console.log('✓ 5. WebhookWhatsAppAdapter OK');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// 6. Factory de Provedores com Detecção Inteligente
{
  const evoAuto = criarWhatsAppAdapter(undefined, { apiUrl: 'https://evolution.gateway.com', apiToken: 'token123' });
  assert.equal(evoAuto.nome, 'evolution-api');

  const zapiAuto = criarWhatsAppAdapter(undefined, { apiUrl: 'https://api.z-api.io/v1/xyz', apiToken: 'token456' });
  assert.equal(zapiAuto.nome, 'z-api');

  const cloudAuto = criarWhatsAppAdapter(undefined, { apiUrl: 'https://graph.facebook.com/v21.0/messages', apiToken: 'token789' });
  assert.equal(cloudAuto.nome, 'meta-cloud-api');

  const genericWh = criarWhatsAppAdapter(undefined, { apiUrl: 'https://n8n.meu-servidor.com/webhook/whats' });
  assert.equal(genericWh.nome, 'webhook-gateway');

  const mockFallback = criarWhatsAppAdapter();
  assert.equal(mockFallback.nome, 'mock-local');
  console.log('✓ 6. criarWhatsAppAdapter Factory com auto-detecção OK');
}

// 7. Injeção de Provedor & Envio Imediato de Confirmação
{
  limparHistoricoNotificacoes();
  const mensagensEnviadas = [];
  const fakeProvider = {
    nome: 'fake-test-spy',
    enviarMensagem: async (dest, msg) => {
      mensagensEnviadas.push({ dest, msg });
      return { ok: true, provedor: 'fake-test-spy', resposta: 'OK_SPY' };
    },
  };

  definirProvedorWhatsApp(fakeProvider);
  assert.equal(obterProvedorAtivo().nome, 'fake-test-spy');

  const res = await enviarMensagemConfirmacaoImediata({
    responsavel: 'Maria Silva',
    escolaNome: 'Creche Manoel Quinídio',
    turma: 'Berçário I',
    turnoVisita: 'manha',
    dataVisita: '2027-02-15',
    codigo: 'PATOS-2027-TEST',
    reservaVaga: true,
    telefone: '(83) 98888-1234',
  });

  assert.equal(res.ok, true);
  assert.equal(mensagensEnviadas.length, 1);
  assert.equal(mensagensEnviadas[0].dest, '83988881234');
  assert.match(mensagensEnviadas[0].msg, /PATOS-2027-TEST/);
  assert.match(mensagensEnviadas[0].msg, /Vaga Pré-Reservada e Garantida/);

  const hist = obterHistoricoNotificacoes();
  assert.equal(hist.length, 1);
  assert.equal(hist[0].codigoProtocolo, 'PATOS-2027-TEST');
  assert.equal(hist[0].provedor, 'fake-test-spy');

  definirProvedorWhatsApp(null);
  console.log('✓ 7. Injeção de dependência e envio imediato de protocolo OK');
}

console.log('\n======================================================');
console.log(' TODOS OS ADAPTADORES WHATSAPP TESTADOS COM SUCESSO! ');
console.log('======================================================\n');
