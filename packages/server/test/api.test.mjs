import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_INDEX = resolve(__dirname, '../src/index.ts');
const TEST_PORT = 3339;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('--- Iniciando Teste de Integração & Segurança do Backend (Patos - PB) ---');

const serverProc = spawn(
  'node',
  ['--no-warnings', '--experimental-strip-types', '--experimental-sqlite', SERVER_INDEX],
  {
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

serverProc.stderr.on('data', (d) => {
  const msg = d.toString();
  if (msg.includes('ExperimentalWarning')) return;
  console.error('[Server Err]', msg);
});

// Aguarda o servidor subir
async function aguardarServidor(limiteMs = 8000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/health`);
      if (res.ok) return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error('Servidor não inicializou no prazo.');
}

try {
  await aguardarServidor();
  console.log('✓ Servidor backend online e respondendo na porta', TEST_PORT);

  // 1. Healthcheck
  const rHealth = await fetch(`${BASE_URL}/api/v1/health`);
  assert.equal(rHealth.status, 200);
  const dataHealth = await rHealth.json();
  assert.equal(dataHealth.municipio, 'Patos - PB');
  assert.equal(dataHealth.ibge, '2510808');
  assert.ok(['postgres', 'sqlite'].includes(dataHealth.banco));
  console.log(`✓ 1. Healthcheck OK (Engine ativo: ${dataHealth.banco.toUpperCase()})`);

  // 2. Catálogo Municipal de Patos - PB
  const rCat = await fetch(`${BASE_URL}/api/v1/catalogo`);
  assert.equal(rCat.status, 200);
  const dataCat = await rCat.json();
  assert.ok(Array.isArray(dataCat.bairros) && dataCat.bairros.length >= 10);
  assert.ok(Array.isArray(dataCat.documentos) && dataCat.documentos.length >= 8);
  console.log('✓ 2. Catálogo de Bairros e Documentos OK');

  // 3. Unidades e Ofertas Públicas (sem vazamento de PII de protocolos)
  const rEscolas = await fetch(`${BASE_URL}/api/v1/escolas`);
  assert.equal(rEscolas.status, 200);
  const dataEscolas = await rEscolas.json();
  assert.ok(Array.isArray(dataEscolas.escolas) && dataEscolas.escolas.length >= 10);
  assert.equal(dataEscolas.protocolos, undefined); // Não deve vazar protocolos na rota pública
  assert.equal(dataEscolas.secretaria, undefined); // Não deve vazar painel de gestão na rota pública
  console.log('✓ 3. Escolas Públicas OK (Proteção LGPD / Protocolos preservada)');

  // 4. Autenticação RBAC - Perfil SEDUC
  const rLoginSeduc = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'secretaria',
      usuario: 'secretaria@patos.pb.gov.br',
      senha: 'patos2026',
    }),
  });
  assert.equal(rLoginSeduc.status, 200);
  const dataLoginSeduc = await rLoginSeduc.json();
  const tokenSeduc = dataLoginSeduc.sessao.token;
  assert.ok(tokenSeduc);

  // 4.1. Painel da Secretaria autenticado
  const rPainel = await fetch(`${BASE_URL}/api/v1/secretaria/painel`, {
    headers: { Authorization: `Bearer ${tokenSeduc}` },
  });
  assert.equal(rPainel.status, 200);
  const dataPainel = await rPainel.json();
  assert.ok(dataPainel.kpis.capacidadeRede > 0);
  assert.ok(Array.isArray(dataPainel.demandaPorBairro));
  console.log('✓ 4. Login SEDUC e Painel Macro da Educação OK');

  // 5. Autenticação RBAC - Perfil Unidade Escolar
  const rLoginUnidade = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'unidade',
      usuario: 'diretoria.jatoba',
      escolaId: 'creche-manoel-quinidio',
      senha: '2026',
    }),
  });
  assert.equal(rLoginUnidade.status, 200);
  const dataLoginUnidade = await rLoginUnidade.json();
  const tokenUnidade = dataLoginUnidade.sessao.token;
  assert.ok(tokenUnidade);

  // 5.1. Unidade alterando a própria oferta -> 200 OK
  const rPatchPropria = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/creche-manoel-quinidio/ofertas`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUnidade}`,
      },
      body: JSON.stringify({
        etapa: 'bercario',
        periodo: 'integral',
        vagas: 3,
      }),
    },
  );
  assert.equal(rPatchPropria.status, 200);

  // 5.2. Unidade tentando alterar outra escola -> 403 Forbidden
  const rPatchOutra = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/creche-tia-luci/ofertas`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUnidade}`,
      },
      body: JSON.stringify({
        etapa: 'bercario',
        periodo: 'integral',
        vagas: 5,
      }),
    },
  );
  assert.equal(rPatchOutra.status, 403);
  console.log('✓ 5. Isolamento de Escopo RBAC por Escola OK');

  // 6. Alertas e Proteção LGPD
  const rCriarAlerta = await fetch(`${BASE_URL}/api/v1/alertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canal: 'whatsapp',
      telefone: '83999998888',
      etapa: 'bercario',
      periodo: 'integral',
      local: { lat: -7.0244, lng: -37.2769, rotulo: 'Centro' },
      raioKm: 2,
    }),
  });
  assert.equal(rCriarAlerta.status, 201);
  const dataAlerta = await rCriarAlerta.json();
  const alertaId = dataAlerta.alerta.id;
  const tokenCancelamento = dataAlerta.alerta.tokenCancelamento;
  assert.ok(tokenCancelamento);

  // Exclusão não autorizada de alerta -> 403
  const rDelSemToken = await fetch(`${BASE_URL}/api/v1/alertas/${alertaId}`, {
    method: 'DELETE',
  });
  assert.equal(rDelSemToken.status, 403);

  // Exclusão autorizada com X-Alert-Token -> 200
  const rDelComToken = await fetch(`${BASE_URL}/api/v1/alertas/${alertaId}`, {
    method: 'DELETE',
    headers: { 'X-Alert-Token': tokenCancelamento },
  });
  assert.equal(rDelComToken.status, 200);
  console.log('✓ 6. Alertas e Exclusão LGPD com Token HMAC OK');

  // 7. Protocolos de Visita com QR Code
  const rCriarProt = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'creche-manoel-quinidio',
      etapa: 'maternal',
      turma: 'Maternal I',
      periodo: 'integral',
      responsavel: 'Maria Severina Leite',
      telefone: '83991112222',
      turnoVisita: 'manha',
      dataVisita: '2027-02-05',
      documentosMarcados: ['certidao', 'cpf-crianca'],
      totalObrigatorios: 6,
    }),
  });
  assert.equal(rCriarProt.status, 201);
  const dataProt = await rCriarProt.json();
  const codigoProt = dataProt.protocolo.codigo;
  assert.match(codigoProt, /^PATOS-20\d\d-\d+$/);

  // Consulta por código
  const rGetProt = await fetch(`${BASE_URL}/api/v1/protocolos/${codigoProt}`);
  assert.equal(rGetProt.status, 200);
  const dataGetProt = await rGetProt.json();
  assert.equal(dataGetProt.protocolo.codigo, codigoProt);
  assert.equal(dataGetProt.protocolo.status, 'aguardando');
  console.log(`✓ 7. Protocolo e Agendamento Presencial OK (${codigoProt})`);

  console.log('\n======================================================');
  console.log(' TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ');
  console.log('======================================================\n');
} finally {
  serverProc.kill('SIGTERM');
}
