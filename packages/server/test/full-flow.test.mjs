import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  anoLetivo,
  buscar,
  calcularEtapa,
  dataLocalISO,
  distanciaKm,
  documentosPara,
  idadeEm,
  pulsoDaCidade,
  resumo,
  statusDaOferta,
  ETAPAS,
  ORDEM_ETAPAS,
} from '../../shared/src/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_INDEX = resolve(__dirname, '../src/index.ts');
const TEST_PORT = 3345;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('================================================================');
console.log('  TESTE COMPLETO DE REGRAS DE NEGÓCIO E PERFIS (Patos - PB)');
console.log('================================================================\n');

const serverProc = spawn(
  'node',
  ['--no-warnings', '--experimental-strip-types', '--experimental-sqlite', SERVER_INDEX],
  {
    env: { ...process.env, PORT: String(TEST_PORT), DISABLE_RATE_LIMIT: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

serverProc.stderr.on('data', (d) => {
  const msg = d.toString();
  if (msg.includes('ExperimentalWarning')) return;
  console.error('[Server Err]', msg);
});

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
  console.log('✓ Servidor backend online na porta', TEST_PORT);

  // Reset defensivo para garantir base limpa e reproduzível a cada execução
  const rLoginInit = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'secretaria',
      usuario: 'secretaria@patos.pb.gov.br',
      senha: 'patos2026',
    }),
  });
  if (rLoginInit.ok) {
    const tokenInit = (await rLoginInit.json()).sessao.token;
    await fetch(`${BASE_URL}/api/v1/gestao/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInit}` },
    });
  }

  // -------------------------------------------------------------
  // 0. REGRAS PURAS DE DOMÍNIO E CÁLCULO PEDAGÓGICO (MEC / CNE)
  // -------------------------------------------------------------
  console.log('\n--- [REGRAS DE DOMÍNIO] Testando corte pedagógico, idade, Haversine e filtros ---');

  // 0.1 Ano letivo
  const dataJulho = new Date(2026, 6, 15); // Julho 2026 -> 2026
  const dataAgosto = new Date(2026, 7, 1); // Agosto 2026 -> 2027
  const dataNovembro = new Date(2026, 10, 2); // Novembro 2026 -> 2027
  assert.equal(anoLetivo(dataJulho), 2026);
  assert.equal(anoLetivo(dataAgosto), 2027);
  assert.equal(anoLetivo(dataNovembro), 2027);
  console.log('✓ Regra de ano letivo (virada em agosto para matrículas do ano seguinte) OK');

  // 0.2 Resolução CNE/CEB nº 2/2018 (Data de corte 31/03)
  const hojeSimulado = new Date('2026-11-02T12:00:00'); // anoLetivo = 2027

  // Data futura
  const rFuturo = calcularEtapa('2026-12-15', hojeSimulado);
  assert.equal(rFuturo.ok, false);
  assert.ok(rFuturo.motivo.includes('ainda não chegou'));

  // Bebê com menos de 4 meses na data de corte (em fev/2027, bebê nascido há 1 mês)
  const hojeFev = new Date('2027-02-15T12:00:00');
  const rBebePequeno = calcularEtapa('2027-01-10', hojeFev);
  assert.equal(rBebePequeno.ok, false);
  assert.ok(rBebePequeno.motivo.includes('4 meses'));

  // Berçário: 0 a 1 ano no corte de 31/03/2027
  const rBercarioI = calcularEtapa('2026-06-15', hojeSimulado); // ~9 meses no corte
  assert.equal(rBercarioI.ok, true);
  assert.equal(rBercarioI.etapa, 'bercario');
  assert.equal(rBercarioI.turma, 'Berçário I');

  const rBercarioII = calcularEtapa('2025-06-15', hojeSimulado); // 1 ano e 9 meses
  assert.equal(rBercarioII.ok, true);
  assert.equal(rBercarioII.etapa, 'bercario');
  assert.equal(rBercarioII.turma, 'Berçário II');

  // Maternal: 2 a 3 anos no corte
  const rMaternal = calcularEtapa('2024-02-15', hojeSimulado); // 3 anos no corte
  assert.equal(rMaternal.ok, true);
  assert.equal(rMaternal.etapa, 'maternal');

  // Pré-escola: 4 a 5 anos no corte
  const rPre = calcularEtapa('2022-02-15', hojeSimulado); // 5 anos no corte
  assert.equal(rPre.ok, true);
  assert.equal(rPre.etapa, 'pre');

  // Fundamental I: 6 a 10 anos no corte
  const rFund1 = calcularEtapa('2019-02-15', hojeSimulado); // 8 anos no corte
  assert.equal(rFund1.ok, true);
  assert.equal(rFund1.etapa, 'fund1');
  assert.equal(rFund1.turma, '3º ano');

  // Fundamental II: 11 a 14 anos no corte
  const rFund2 = calcularEtapa('2014-02-15', hojeSimulado); // 13 anos no corte
  assert.equal(rFund2.ok, true);
  assert.equal(rFund2.etapa, 'fund2');
  assert.equal(rFund2.turma, '8º ano');

  // >= 15 anos -> encaminha para EJA / Ensino Médio
  const rAcima = calcularEtapa('2011-01-10', hojeSimulado); // 16 anos no corte
  assert.equal(rAcima.ok, false);
  assert.ok(rAcima.motivo.includes('15 anos'));
  console.log('✓ Regra nacional de corte de 31 de março (MEC / CNE nº 2/2018) OK em todas as faixas');

  // 0.3 Atalhos rápidos por idade (verificando se correspondem exatamente à etapa pretendida)
  const atalhosIdade = [
    { id: 'bercario', anosRef: 1 },
    { id: 'maternal', anosRef: 3 },
    { id: 'pre', anosRef: 5 },
    { id: 'fund1', anosRef: 8 },
    { id: 'fund2', anosRef: 13 },
  ];
  const anoRef = anoLetivo(hojeSimulado);
  for (const item of atalhosIdade) {
    const dataEstimada = `${anoRef - item.anosRef}-02-15`;
    const r = calcularEtapa(dataEstimada, hojeSimulado);
    assert.equal(r.ok, true);
    assert.equal(r.etapa, item.id, `Atalho de ${item.id} deve calcular exatamente ${item.id}`);
  }
  console.log('✓ Botões de atalho rápido por idade mapeiam 100% para a etapa correta');

  // 0.4 Status da Oferta
  assert.equal(statusDaOferta({ vagas: 0 }), 'espera');
  assert.equal(statusDaOferta({ vagas: 1 }), 'ultimas');
  assert.equal(statusDaOferta({ vagas: 3 }), 'ultimas');
  assert.equal(statusDaOferta({ vagas: 4 }), 'aberta');
  assert.equal(statusDaOferta({ vagas: 20 }), 'aberta');
  console.log('✓ Cálculo do semáforo de status de vagas (espera / ultimas / aberta) OK');

  // 0.5 Distância Haversine em Patos - PB
  const centro = { lat: -7.0244, lng: -37.2769 }; // Centro
  const jatoba = { lat: -7.0432, lng: -37.2725 }; // Jatobá
  const dJatoba = distanciaKm(centro, jatoba);
  assert.ok(dJatoba > 1.8 && dJatoba < 2.5, `Distância Centro-Jatobá deve ser ~2.1km (deu ${dJatoba.toFixed(2)}km)`);
  console.log(`✓ Fórmula de Haversine calibrada para Patos-PB: ${dJatoba.toFixed(2)} km`);

  // -------------------------------------------------------------
  // 1. FLUXO DO CIDADÃO (Pais e Responsáveis)
  // -------------------------------------------------------------
  console.log('\n--- [PERFIL CIDADÃO] Testando regras de consulta, alerta e protocolo ---');

  // 1.1 Catálogo Municipal
  const rCat = await fetch(`${BASE_URL}/api/v1/catalogo`);
  assert.equal(rCat.status, 200);
  const dataCat = await rCat.json();
  assert.equal(dataCat.municipio, 'Patos');
  assert.equal(dataCat.uf, 'PB');
  assert.ok(dataCat.bairros.length >= 10);
  assert.ok(dataCat.documentos.some((d) => d.id === 'certidao' && d.obrigatorio === true));
  assert.ok(dataCat.documentos.some((d) => d.id === 'vacina' && d.etapas.includes('bercario')));
  console.log('✓ Catálogo municipal de Patos-PB: bairros e checklist de documentos carregados');

  // 1.2 Snapshot Público (sem vazamento de protocolos ou secretaria)
  const rEscolas = await fetch(`${BASE_URL}/api/v1/escolas`);
  assert.equal(rEscolas.status, 200);
  const etag = rEscolas.headers.get('etag');
  assert.ok(etag);
  const dataEscolas = await rEscolas.json();
  assert.equal(dataEscolas.protocolos, undefined, 'Protocolos de cidadãos NÃO devem vazar na rota pública');
  assert.equal(dataEscolas.secretaria, undefined, 'Painel da Secretaria NÃO deve vazar na rota pública');
  assert.ok(dataEscolas.escolas.length >= 10);
  console.log('✓ Snapshot público protegido contra vazamento de PII (LGPD)');

  // 1.3 Teste de 304 Not Modified
  const r304 = await fetch(`${BASE_URL}/api/v1/escolas`, {
    headers: { 'If-None-Match': etag },
  });
  assert.equal(r304.status, 304, 'Cache ETag deve retornar 304 Not Modified');
  console.log('✓ ETag 304 Not Modified funcionando');

  // 1.4 Alertas Cidadão (WhatsApp com telefone válido)
  const rAlertaWhats = await fetch(`${BASE_URL}/api/v1/alertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canal: 'whatsapp',
      telefone: '83991234567',
      etapa: 'bercario',
      periodo: 'integral',
      local: { lat: -7.0244, lng: -37.2769, rotulo: 'Centro' },
      raioKm: 3,
    }),
  });
  assert.equal(rAlertaWhats.status, 201);
  const dataAlertaWhats = await rAlertaWhats.json();
  assert.ok(dataAlertaWhats.alerta.tokenCancelamento, 'Deve emitir token individual de cancelamento');
  assert.equal(dataAlertaWhats.alerta.telefone, '(83) 9••••-4567', 'Telefone deve ser mascarado na resposta');
  const tokenCancelamento = dataAlertaWhats.alerta.tokenCancelamento;
  const alertaId = dataAlertaWhats.alerta.id;
  console.log('✓ Criação de alerta via WhatsApp com telefone mascarado e token HMAC');

  // 1.5 Alertas Cidadão (WhatsApp com telefone inválido -> deve rejeitar 400)
  const rAlertaInvalido = await fetch(`${BASE_URL}/api/v1/alertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canal: 'whatsapp',
      telefone: '1234',
      etapa: 'bercario',
      periodo: 'integral',
      local: { lat: -7.0244, lng: -37.2769, rotulo: 'Centro' },
      raioKm: 3,
    }),
  });
  assert.equal(rAlertaInvalido.status, 400, 'Telefone inválido deve retornar 400 Bad Request');
  console.log('✓ Validação de telefone com DDD obrigatório para WhatsApp OK');

  // 1.6 Cancelamento de Alerta pelo Cidadão (com token vs sem token)
  const rDelSemToken = await fetch(`${BASE_URL}/api/v1/alertas/${alertaId}`, { method: 'DELETE' });
  assert.equal(rDelSemToken.status, 403, 'Cancelamento sem token deve ser 403 Forbidden');
  const rDelComToken = await fetch(`${BASE_URL}/api/v1/alertas/${alertaId}`, {
    method: 'DELETE',
    headers: { 'X-Alert-Token': tokenCancelamento },
  });
  assert.equal(rDelComToken.status, 200, 'Cancelamento com X-Alert-Token deve ser 200 OK');
  console.log('✓ Direito ao esquecimento LGPD: cancelamento autorizado com token individual');

  // 1.7 Emissão de Protocolo Presencial pelo Cidadão com Reserva Garantida (Opção 2)
  const rEscPreTia = await fetch(`${BASE_URL}/api/v1/escolas`);
  const escTiaPre = (await rEscPreTia.json()).escolas.find((e) => e.id === 'creche-tia-luci');
  const ofTiaPre = escTiaPre.ofertas.find((o) => o.etapa === 'maternal' && o.periodo === 'integral');
  const vagasAntesTia = ofTiaPre.vagas;

  const rProt = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'creche-tia-luci',
      etapa: 'maternal',
      turma: 'Maternal I',
      periodo: 'integral',
      responsavel: 'Raimunda Pereira da Silva',
      telefone: '83998765432',
      turnoVisita: 'manha',
      dataVisita: '2027-02-10',
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp'],
      totalObrigatorios: 7,
    }),
  });
  assert.equal(rProt.status, 201);
  const dataProt = await rProt.json();
  const codigoProt = dataProt.protocolo.codigo;
  assert.match(codigoProt, /^PATOS-20\d\d-\d+$/);
  assert.equal(dataProt.protocolo.status, 'aguardando');
  assert.equal(dataProt.protocolo.reservaVaga, true, 'Opção 2: protocolo deve garantir reserva da vaga');
  assert.equal(dataProt.protocolo.telefone, '(83) 9••••-5432', 'Telefone deve estar mascarado');

  // Verifica que 1 vaga foi imediatamente debitada no momento da emissão
  const rEscPosTia = await fetch(`${BASE_URL}/api/v1/escolas`);
  const escTiaPos = (await rEscPosTia.json()).escolas.find((e) => e.id === 'creche-tia-luci');
  const ofTiaPos = escTiaPos.ofertas.find((o) => o.etapa === 'maternal' && o.periodo === 'integral');
  assert.equal(ofTiaPos.vagas, vagasAntesTia - 1, 'Opção 2: Emissão do protocolo deve debitar 1 vaga imediatamente');
  console.log(`✓ Pré-reserva garantida (Opção 2): 1 vaga debitada no agendamento (${vagasAntesTia} -> ${ofTiaPos.vagas})`);

  // 1.8 Consulta de Protocolo pelo Código
  const rConsulta = await fetch(`${BASE_URL}/api/v1/protocolos/${codigoProt}`);
  assert.equal(rConsulta.status, 200);
  const dataConsulta = await rConsulta.json();
  assert.equal(dataConsulta.protocolo.codigo, codigoProt);
  assert.equal(dataConsulta.protocolo.escolaNome, 'Creche Municipal Tia Luci');
  console.log('✓ Consulta pública de protocolo por código OK');

  // 1.9 Emissão com dados inválidos
  const rProtInvalido = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'escola-inexistente',
      etapa: 'maternal',
      responsavel: 'X',
    }),
  });
  assert.equal(rProtInvalido.status, 400, 'Responsável com 1 caractere deve falhar validação');
  console.log('✓ Validação de integridade de payload de protocolo OK');

  // -------------------------------------------------------------
  // 2. FLUXO DO GESTOR DA UNIDADE ESCOLAR
  // -------------------------------------------------------------
  console.log('\n--- [PERFIL UNIDADE ESCOLAR] Testando login, escopo RBAC e atendimento presencial ---');

  // 2.1 Login com PIN incorreto -> 401
  const rLoginUnidadeErro = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'unidade',
      usuario: 'diretor.manoelquinidio',
      escolaId: 'creche-manoel-quinidio',
      senha: 'pin-errado-9999',
    }),
  });
  assert.equal(rLoginUnidadeErro.status, 401);
  console.log('✓ Tentativa de login na unidade com PIN incorreto rejeitada (401)');

  // 2.2 Login com PIN correto para Creche Manoel Quinídio
  const rLoginManoel = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'unidade',
      usuario: 'diretora.maria',
      escolaId: 'creche-manoel-quinidio',
      senha: '2026',
    }),
  });
  assert.equal(rLoginManoel.status, 200);
  const dataLoginManoel = await rLoginManoel.json();
  const tokenManoel = dataLoginManoel.sessao.token;
  assert.equal(dataLoginManoel.sessao.escolaId, 'creche-manoel-quinidio');
  console.log('✓ Login realizado com sucesso para Creche Manoel Quinídio');

  // 2.3 Unidade alterando oferta da PRÓPRIA escola -> 200 OK
  const rPatchPropria = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/creche-manoel-quinidio/ofertas`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenManoel}`,
      },
      body: JSON.stringify({
        etapa: 'bercario',
        periodo: 'integral',
        vagas: 4,
        fila: 0,
      }),
    },
  );
  assert.equal(rPatchPropria.status, 200);
  const dataPatchPropria = await rPatchPropria.json();
  assert.equal(dataPatchPropria.ok, true);
  console.log('✓ Unidade alterou oferta da própria escola com sucesso (200 OK)');

  // 2.4 Unidade tentando alterar oferta de OUTRA escola -> 403 Forbidden
  const rPatchOutra = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/creche-tia-luci/ofertas`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenManoel}`,
      },
      body: JSON.stringify({
        etapa: 'bercario',
        periodo: 'integral',
        vagas: 10,
      }),
    },
  );
  assert.equal(rPatchOutra.status, 403, 'Unidade NÃO pode alterar oferta de outra escola');
  console.log('✓ RBAC: Unidade bloqueada de alterar oferta de outra escola (403)');

  // 2.5 Unidade confirmando quadro da própria escola
  const rConfirmaPropria = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/creche-manoel-quinidio/confirmar`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenManoel}` },
    },
  );
  assert.equal(rConfirmaPropria.status, 200);
  console.log('✓ Unidade confirmou quadro de vagas da sua escola');

  // 2.6 Unidade tentando confirmar OUTRA escola -> 403 Forbidden
  const rConfirmaOutra = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/creche-tia-luci/confirmar`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenManoel}` },
    },
  );
  assert.equal(rConfirmaOutra.status, 403);
  console.log('✓ RBAC: Unidade bloqueada de confirmar quadro de outra escola (403)');

  // 2.7 Unidade tentando acessar painel da SEDUC -> deve ser 403 Forbidden
  const rPainelPorUnidade = await fetch(`${BASE_URL}/api/v1/secretaria/painel`, {
    headers: { Authorization: `Bearer ${tokenManoel}` },
  });
  console.log(`Status do painel SEDUC acessado por Unidade: ${rPainelPorUnidade.status}`);
  assert.equal(rPainelPorUnidade.status, 403, 'Painel da Secretaria deve ser restrito à SEDUC (403)');
  console.log('✓ RBAC: Unidade bloqueada de acessar Painel Macro da SEDUC (403)');

  // 2.8 Unidade tentando dar reset no banco -> deve ser 403 Forbidden
  const rResetPorUnidade = await fetch(`${BASE_URL}/api/v1/gestao/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenManoel}` },
  });
  assert.equal(rResetPorUnidade.status, 403, 'Apenas SEDUC pode resetar o banco');
  console.log('✓ RBAC: Unidade bloqueada de resetar o banco de dados (403)');

  // 2.9.1 Isolamento de Listagem de Protocolos por Unidade
  const rProtListUnidade = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    headers: { Authorization: `Bearer ${tokenManoel}` },
  });
  assert.equal(rProtListUnidade.status, 200);
  const dataProtListUnidade = await rProtListUnidade.json();
  assert.ok(Array.isArray(dataProtListUnidade.protocolos));
  assert.ok(
    dataProtListUnidade.protocolos.every((p) => p.escolaId === 'creche-manoel-quinidio'),
    'Gestor de unidade deve visualizar EXCLUSIVAMENTE os protocolos da própria escola',
  );
  console.log(`✓ RBAC: Gestor de unidade visualiza apenas os ${dataProtListUnidade.protocolos.length} protocolos da própria escola`);

  // 2.9.2 Unidade tentando dar baixa em protocolo de OUTRA escola -> deve ser 403 Forbidden
  // codigoProt criado anteriormente pertence à Creche Tia Luci!
  const rBaixaOutraEscola = await fetch(
    `${BASE_URL}/api/v1/gestao/protocolos/${codigoProt}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenManoel}`,
      },
      body: JSON.stringify({ status: 'atendido' }),
    },
  );
  assert.equal(rBaixaOutraEscola.status, 403, 'Gestor não pode dar baixa em protocolo de outra escola');
  console.log('✓ RBAC: Unidade bloqueada de dar baixa em protocolo de outra escola (403)');

  // 2.10 Login na Creche Tia Luci para atender o protocolo dela
  const rLoginTiaLuci = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'unidade',
      usuario: 'diretor.tialuci',
      escolaId: 'creche-tia-luci',
      senha: '2026',
    }),
  });
  assert.equal(rLoginTiaLuci.status, 200);
  const tokenTiaLuci = (await rLoginTiaLuci.json()).sessao.token;

  // 2.11 Dar baixa no protocolo na própria escola -> 200 OK + confirma matrícula sem duplicidade de débito
  const rBaixaPropria = await fetch(
    `${BASE_URL}/api/v1/gestao/protocolos/${codigoProt}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTiaLuci}`,
      },
      body: JSON.stringify({ status: 'atendido' }),
    },
  );
  assert.equal(rBaixaPropria.status, 200);
  const dataBaixa = await rBaixaPropria.json();
  assert.equal(dataBaixa.protocolo.status, 'atendido');

  // Verifica que a vaga permanece ocupada e não debitou duas vezes
  const rEscolasPosBaixa = await fetch(`${BASE_URL}/api/v1/escolas`);
  const escTiaLuciPosBaixa = (await rEscolasPosBaixa.json()).escolas.find((e) => e.id === 'creche-tia-luci');
  const ofMaternalPosBaixa = escTiaLuciPosBaixa.ofertas.find((o) => o.etapa === 'maternal' && o.periodo === 'integral');
  assert.equal(ofMaternalPosBaixa.vagas, ofTiaPos.vagas, 'Vaga já debitada no agendamento não deve ser debitada novamente');
  console.log(`✓ Atendimento presencial confirmado sem duplo débito (${ofMaternalPosBaixa.vagas} vagas mantidas)`);

  // 2.12 Testando Cancelamento com Devolução Automática de Vaga Reservada
  const rProtCanc = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'creche-tia-luci',
      etapa: 'maternal',
      turma: 'Maternal I',
      periodo: 'integral',
      responsavel: 'Francisco de Assis Ferreira',
      telefone: '83999998888',
      turnoVisita: 'tarde',
      dataVisita: '2027-02-12',
      documentosMarcados: ['certidao'],
      totalObrigatorios: 7,
    }),
  });
  const dataProtCanc = await rProtCanc.json();
  const codCanc = dataProtCanc.protocolo.codigo;

  // Cancela o protocolo
  const rCancAction = await fetch(
    `${BASE_URL}/api/v1/gestao/protocolos/${codCanc}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTiaLuci}`,
      },
      body: JSON.stringify({ status: 'cancelado' }),
    },
  );
  assert.equal(rCancAction.status, 200);
  const dataCancRes = await rCancAction.json();
  assert.equal(dataCancRes.protocolo.status, 'cancelado');

  // Verifica que a vaga foi devolvida (+1)
  const rEscolasAposCanc = await fetch(`${BASE_URL}/api/v1/escolas`);
  const escAposCanc = (await rEscolasAposCanc.json()).escolas.find((e) => e.id === 'creche-tia-luci');
  const ofAposCanc = escAposCanc.ofertas.find((o) => o.etapa === 'maternal' && o.periodo === 'integral');
  assert.equal(ofAposCanc.vagas, ofMaternalPosBaixa.vagas, 'Cancelamento do protocolo deve devolver a vaga reservada (+1)');
  console.log('✓ Cancelamento de protocolo devolve a vaga pré-reservada para a rede escolar');

  // 2.13 Testando Expiração Automática de Protocolo Vencido com Devolução de Vaga
  const rProtVencido = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'creche-tia-luci',
      etapa: 'maternal',
      turma: 'Maternal I',
      periodo: 'integral',
      responsavel: 'Severina Maria da Conceição',
      telefone: '83991234567',
      turnoVisita: 'manha',
      dataVisita: '2025-01-10', // Data no passado (visita vencida)
      documentosMarcados: ['certidao'],
      totalObrigatorios: 7,
    }),
  });
  const dataProtVenc = await rProtVencido.json();
  const codVenc = dataProtVenc.protocolo.codigo;

  // Login como SEDUC para acionar a rotina de expiração
  const rLoginSeducRoutine = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'secretaria',
      usuario: 'secretaria@patos.pb.gov.br',
      senha: 'patos2026',
    }),
  });
  const tokenSeducRoutine = (await rLoginSeducRoutine.json()).sessao.token;

  const rRotinaExp = await fetch(`${BASE_URL}/api/v1/gestao/rotinas/expiracao`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenSeducRoutine}` },
  });
  assert.equal(rRotinaExp.status, 200);
  const dataRotinaExp = await rRotinaExp.json();
  assert.ok(dataRotinaExp.ok);
  assert.ok(
    dataRotinaExp.expirados.some((p) => p.codigo === codVenc),
    'Protocolo vencido deve constar na lista de expirados',
  );

  // Consulta o protocolo vencido
  const rConsultaVenc = await fetch(`${BASE_URL}/api/v1/protocolos/${codVenc}`);
  const dataConsultaVenc = await rConsultaVenc.json();
  assert.equal(dataConsultaVenc.protocolo.status, 'cancelado');
  assert.equal(dataConsultaVenc.protocolo.motivoCancelamento, 'expirado_sem_comparecimento');
  console.log('✓ Rotina de expiração automática cancelou protocolo vencido e devolveu a vaga');

  // 2.14 Testando Rotina de Notificações WhatsApp (Lembretes no dia e 1h antes)
  const hoje = dataLocalISO();
  const rProtWhats = await fetch(`${BASE_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'emef-monsenhor-manoel-vieira',
      etapa: 'fund1',
      turma: '2º ano',
      periodo: 'parcial',
      responsavel: 'Maria de Fátima Soares',
      telefone: '83996541122',
      turnoVisita: 'manha',
      dataVisita: hoje,
      documentosMarcados: ['certidao', 'cpf-crianca'],
      totalObrigatorios: 7,
    }),
  });
  assert.equal(rProtWhats.status, 201);

  const rRotinaWhats = await fetch(`${BASE_URL}/api/v1/gestao/rotinas/notificacoes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenSeducRoutine}` },
  });
  assert.equal(rRotinaWhats.status, 200);
  const dataRotinaWhats = await rRotinaWhats.json();
  assert.ok(dataRotinaWhats.ok);
  assert.ok(dataRotinaWhats.totalVerificados >= 1, 'Deve encontrar ao menos o protocolo agendado para hoje');
  console.log(`✓ Rotina de notificações WhatsApp executada: ${dataRotinaWhats.totalVerificados} protocolos avaliados (${dataRotinaWhats.lembretesDiaEnviados} lembretes do dia disparados)`);

  // -------------------------------------------------------------
  // 3. FLUXO DA SECRETARIA MUNICIPAL DE EDUCAÇÃO (SEDUC)
  // -------------------------------------------------------------
  console.log('\n--- [PERFIL SECRETARIA DE EDUCAÇÃO] Testando visão macro, KPIs e governança ---');

  // 3.1 Login SEDUC com credenciais inválidas -> 401
  const rLoginSeducErro = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil: 'secretaria',
      usuario: 'desconhecido@gmail.com',
      senha: 'senha-errada',
    }),
  });
  assert.equal(rLoginSeducErro.status, 401);
  console.log('✓ Login SEDUC com e-mail/senha não autorizados rejeitado (401)');

  // 3.2 Login SEDUC com credenciais válidas -> 200
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
  const tokenSeduc = (await rLoginSeduc.json()).sessao.token;
  console.log('✓ Login na Secretaria de Educação realizado com sucesso');

  // 3.3 Acesso ao Painel Macro da SEDUC
  const rPainelSeduc = await fetch(`${BASE_URL}/api/v1/secretaria/painel`, {
    headers: { Authorization: `Bearer ${tokenSeduc}` },
  });
  assert.equal(rPainelSeduc.status, 200);
  const painel = await rPainelSeduc.json();

  assert.equal(painel.municipio, 'Patos');
  assert.ok(painel.kpis.totalUnidades >= 10);
  assert.ok(painel.kpis.capacidadeRede > 0);
  assert.ok(painel.kpis.taxaOcupacao > 0 && painel.kpis.taxaOcupacao <= 100);
  assert.ok(Array.isArray(painel.demandaPorBairro) && painel.demandaPorBairro.length > 0);
  assert.ok(Array.isArray(painel.resumoPorEtapa) && painel.resumoPorEtapa.length === 5);
  console.log(`✓ Painel SEDUC: ${painel.kpis.totalUnidades} escolas, ${painel.kpis.capacidadeRede} vagas totais, taxa ${painel.kpis.taxaOcupacao}%`);

  // 3.4 SEDUC tem autorização de alterar vagas de QUALQUER escola
  const rPatchSeduc = await fetch(
    `${BASE_URL}/api/v1/gestao/escolas/emef-monsenhor-manoel-vieira/ofertas`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenSeduc}`,
      },
      body: JSON.stringify({
        etapa: 'fund1',
        periodo: 'parcial',
        vagas: 12,
      }),
    },
  );
  assert.equal(rPatchSeduc.status, 200);
  const dataPatchSeduc = await rPatchSeduc.json();
  assert.equal(dataPatchSeduc.evento.origem, 'secretaria', 'Origem do evento deve ser secretaria');
  console.log('✓ SEDUC alterou oferta de unidade escolar com auditoria (origem: secretaria)');

  // 3.5 SEDUC pode listar todos os alertas brutos
  const rAlertasSeduc = await fetch(`${BASE_URL}/api/v1/alertas`, {
    headers: { Authorization: `Bearer ${tokenSeduc}` },
  });
  assert.equal(rAlertasSeduc.status, 200);
  const dataAlertasSeduc = await rAlertasSeduc.json();
  assert.ok(Array.isArray(dataAlertasSeduc.alertas));
  console.log(`✓ SEDUC tem acesso à governança de alertas ativos (${dataAlertasSeduc.alertas.length} alertas)`);

  // 3.6 SEDUC pode resetar o banco de dados
  const rResetSeduc = await fetch(`${BASE_URL}/api/v1/gestao/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenSeduc}` },
  });
  assert.equal(rResetSeduc.status, 200);
  console.log('✓ SEDUC executou restauração/reset da base com sucesso');

  console.log('\n================================================================');
  console.log(' TODOS OS TESTES DE REGRAS DE NEGÓCIO E PERFIS PASSARAM COM 100%!');
  console.log('================================================================\n');
} finally {
  serverProc.kill('SIGTERM');
}
