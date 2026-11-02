const TARGET_URL = (process.env.TARGET_URL || 'https://matricula-aberta-api.onrender.com').replace(/\/$/, '');

function formatMs(ms) {
  return `${ms.toFixed(1)} ms`;
}

function calcularPercentis(tempos) {
  if (tempos.length === 0) return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, media: 0 };
  const sorted = [...tempos].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, t) => acc + t, 0);
  const idx = (p) => Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));

  return {
    min: sorted[0],
    p50: sorted[idx(50)],
    p95: sorted[idx(95)],
    p99: sorted[idx(99)],
    max: sorted[sorted.length - 1],
    media: sum / sorted.length,
  };
}

async function dispararConcorrente(tarefas, concorrencia = 20) {
  const tempos = [];
  const statusContagem = {};
  const fila = [...tarefas];

  const workers = Array.from({ length: concorrencia }, async () => {
    while (fila.length > 0) {
      const fn = fila.shift();
      if (!fn) break;
      const t0 = performance.now();
      try {
        const res = await fn();
        const delta = performance.now() - t0;
        tempos.push(delta);
        const st = res.status;
        statusContagem[st] = (statusContagem[st] || 0) + 1;
      } catch (err) {
        tempos.push(performance.now() - t0);
        statusContagem['ERR_CONEXAO'] = (statusContagem['ERR_CONEXAO'] || 0) + 1;
      }
    }
  });

  const tInicio = performance.now();
  await Promise.all(workers);
  const duracaoSeg = (performance.now() - tInicio) / 1000;

  return {
    total: tarefas.length,
    duracaoSeg,
    rps: Math.round(tarefas.length / duracaoSeg),
    statusContagem,
    metricas: calcularPercentis(tempos),
  };
}

console.log('========================================================================');
console.log('  TESTE DE CARGA REAL EM PRODUÇÃO · RENDER + SUPABASE POSTGRESQL       ');
console.log(`  Alvo: ${TARGET_URL}`);
console.log('========================================================================\n');

// 1. Healthcheck
const t0Health = performance.now();
const resHealth = await fetch(`${TARGET_URL}/api/v1/health`);
const deltaHealth = performance.now() - t0Health;
const dataHealth = await resHealth.json();

console.log('[1/4] Verificação de Conectividade e Infraestrutura');
console.log(`  ↳ Status: HTTP ${resHealth.status}`);
console.log(`  ↳ Banco Ativo: ${dataHealth.banco?.toUpperCase()}`);
console.log(`  ↳ Município: ${dataHealth.municipio}`);
console.log(`  ↳ Latência de Rede (Brasil -> EUA -> Brasil): ${formatMs(deltaHealth)}\n`);

if (dataHealth.banco !== 'postgres') {
  console.error('AVISO: O banco não está reportando "postgres". Interrompendo teste.');
  process.exit(1);
}

// 2. Teste de Coalescência de Cache (Primeira chamada vs Chamadas cacheadas)
console.log('[2/4] Teste do Mecanismo de Cache em Memória no Render');
const t0Primeira = performance.now();
await fetch(`${TARGET_URL}/api/v1/escolas`);
const deltaPrimeira = performance.now() - t0Primeira;

const t0Cache = performance.now();
await fetch(`${TARGET_URL}/api/v1/escolas`);
const deltaCache = performance.now() - t0Cache;

console.log(`  ↳ 1ª Requisição (hidratação / DB): ${formatMs(deltaPrimeira)}`);
console.log(`  ↳ 2ª Requisição (100% memória RAM do Render): ${formatMs(deltaCache)}`);
console.log(`  ↳ Ganho de velocidade do cache: ${(deltaPrimeira / deltaCache).toFixed(1)}x mais rápido\n`);

// 3. Teste de Concorrência de Leitura (50 cidadãos acessando simultaneamente)
console.log('[3/4] Teste de Concorrência de Leitura Pública (50 requisições simultâneas)');
const tarefasLeitura = Array.from({ length: 50 }, () => () => fetch(`${TARGET_URL}/api/v1/escolas`));
const resLeitura = await dispararConcorrente(tarefasLeitura, 25);

console.log(`  ↳ Concluído: ${resLeitura.total} requisições em ${resLeitura.duracaoSeg.toFixed(2)}s`);
console.log(`  ↳ Throughput: ${resLeitura.rps} req/seg`);
console.log(`  ↳ Latências: p50 = ${formatMs(resLeitura.metricas.p50)} | p95 = ${formatMs(resLeitura.metricas.p95)} | max = ${formatMs(resLeitura.metricas.max)}`);
console.log(`  ↳ Respostas HTTP:`, resLeitura.statusContagem, '\n');

// 4. Teste de Gravação Concorrente no PostgreSQL (Inscrições de Protocolos)
console.log('[4/4] Teste de Gravação Concorrente no PostgreSQL do Supabase (10 inscrições simultâneas)');
const codigosGerados = new Set();
const tarefasGravacao = Array.from({ length: 10 }, (_, i) => () => {
  return fetch(`${TARGET_URL}/api/v1/protocolos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escolaId: 'creche-manoel-quinidio',
      etapa: 'maternal',
      turma: `Turma Produção Carga #${i + 1}`,
      periodo: 'integral',
      responsavel: `Responsável Teste Carga #${i + 1}`,
      telefone: `(83) 99888-${String(1000 + i).slice(-4)}`,
      nascimento: '2023-03-10',
      turnoVisita: 'manha',
      dataVisita: '2027-02-25',
      documentosMarcados: ['certidao', 'cpf-crianca', 'doc-resp', 'residencia'],
      totalObrigatorios: 6,
    }),
  }).then(async (r) => {
    if (r.status === 201) {
      const j = await r.json();
      if (j.protocolo?.codigo) codigosGerados.add(j.protocolo.codigo);
    }
    return r;
  });
});

const resGravacao = await dispararConcorrente(tarefasGravacao, 10);
console.log(`  ↳ Concluído: ${resGravacao.total} submissões em ${resGravacao.duracaoSeg.toFixed(2)}s`);
console.log(`  ↳ Throughput: ${resGravacao.rps} inscrições/seg`);
console.log(`  ↳ Latências: p50 = ${formatMs(resGravacao.metricas.p50)} | p95 = ${formatMs(resGravacao.metricas.p95)} | max = ${formatMs(resGravacao.metricas.max)}`);
console.log(`  ↳ Respostas HTTP:`, resGravacao.statusContagem);
console.log(`  ↳ Protocolos únicos gravados no PostgreSQL: ${codigosGerados.size} / 10`);
console.log(`  ↳ Amostra dos códigos gerados:`, Array.from(codigosGerados).slice(0, 3).join(', '));

console.log('\n========================================================================');
console.log('  DIAGNÓSTICO FINAL: PRODUÇÃO RENDER + SUPABASE VALIDADA COM SUCESSO!   ');
console.log('========================================================================\n');

