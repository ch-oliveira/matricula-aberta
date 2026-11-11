import { createServer } from 'node:http';
import { db } from './infra/db.ts';
import { aplicarHeadersSeguranca, HttpError } from './infra/security.ts';
import { transmitirAtualizacaoSSE } from './infra/sse.ts';
import { processarNotificacoesWhatsApp } from './modules/notificacoes/notificacoes.module.ts';
import { processarExpiracaoProtocolosVencidos } from './modules/protocolos/protocolos.module.ts';
import { handleCidadaoRoutes } from './routes/cidadao.routes.ts';
import { handleCronRoutes } from './routes/cron.routes.ts';
import { handleSecretariaRoutes } from './routes/secretaria.routes.ts';
import {
  inicializarBancoPatos,
  invalidarSnapshotPublico,
  json,
  tentarServirEstatico,
} from './routes/shared.ts';
import { handleUnidadeRoutes } from './routes/unidade.routes.ts';
import { handleWhatsAppRoutes } from './routes/whatsapp.routes.ts';

export { invalidarSnapshotPublico } from './routes/shared.ts';

const PORT = Number(process.env.PORT ?? 3333);

// Inicializa o banco (PostgreSQL ou SQLite WAL) de Patos - PB com todos os módulos do Monolito Modular
await inicializarBancoPatos(false);

const server = createServer(async (req, res) => {
  aplicarHeadersSeguranca(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  // Em produção, se o bundle dist/ existir, serve os arquivos estáticos e rotas SPA do frontend
  if (tentarServirEstatico(req, res, path)) {
    return;
  }

  try {
    // Roteadores modulares desacoplados por escopo de domínio
    if (await handleCidadaoRoutes(req, res, url, path)) return;
    if (await handleUnidadeRoutes(req, res, url, path)) return;
    if (await handleSecretariaRoutes(req, res, url, path)) return;
    if (await handleCronRoutes(req, res, url, path)) return;
    if (await handleWhatsAppRoutes(req, res, url, path)) return;

    return json(req, res, 404, { erro: 'Rota não encontrada na API.' });
  } catch (err) {
    if (err instanceof HttpError) {
      return json(req, res, err.status, { erro: err.message });
    }
    console.error('[API Error]', err);
    return json(req, res, 500, { erro: 'Erro interno no servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(
    `[Matrícula Aberta · Patos-PB] Monolito Modular ativo em http://localhost:${PORT} (${db.tipoBanco.toUpperCase()} + SSE + Auth RBAC)`,
  );
});

// Worker periódico de segundo plano para expiração de protocolos e notificações WhatsApp
let intervaloWorker: NodeJS.Timeout | null = null;

export function iniciarWorkersSegundoPlano(intervaloMs = 60_000): void {
  if (intervaloWorker) return;
  intervaloWorker = setInterval(async () => {
    try {
      const exp = await processarExpiracaoProtocolosVencidos();
      if (exp.expirados.length > 0) {
        invalidarSnapshotPublico();
        for (const ev of exp.eventos) {
          await transmitirAtualizacaoSSE(ev);
        }
      }
      await processarNotificacoesWhatsApp();
    } catch (err) {
      console.error('[Worker Erro]', err);
    }
  }, intervaloMs);
  intervaloWorker.unref();
}

export function pararWorkersSegundoPlano(): void {
  if (intervaloWorker) {
    clearInterval(intervaloWorker);
    intervaloWorker = null;
  }
}

iniciarWorkersSegundoPlano(60_000);

async function encerrarServidor(): Promise<void> {
  pararWorkersSegundoPlano();
  server.close(async () => {
    await db.fecharBanco();
    process.exit(0);
  });
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);
