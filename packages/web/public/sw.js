// Service Worker Oficial · Matrícula Aberta (Rede Municipal de Patos - PB)
// Versão do Cache: v2.0.0

const CACHE_NAME = 'matricula-patos-v2.0.0';

const RECURSOS_APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(RECURSOS_APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves.map((chave) => {
            if (chave !== CACHE_NAME) {
              return caches.delete(chave);
            }
            return null;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Não interceptar requisições que não sejam GET (mutação de dados, SSE, auth)
  if (request.method !== 'GET') {
    return;
  }

  // Não interceptar rotas de API em tempo real ou streams SSE
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        // Se a API estiver offline e for leitura de catálogo, tenta snapshot em cache se existir
        const emCache = await caches.match(request);
        if (emCache) return emCache;
        return new Response(
          JSON.stringify({
            erro: 'Modo offline. Você está navegando sem conexão à internet de Patos - PB.',
            offline: true,
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          },
        );
      }),
    );
    return;
  }

  // Requisição de navegação HTML (App Shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((res) => res ?? caches.match('/')),
      ),
    );
    return;
  }

  // Requisições de assets estáticos (JS, CSS, imagens, fontes)
  event.respondWith(
    caches.match(request).then((respostaEmCache) => {
      const fetchPromise = fetch(request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200 && respostaRede.type === 'basic') {
            const respostaParaCache = respostaRede.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, respostaParaCache));
          }
          return respostaRede;
        })
        .catch(() => respostaEmCache);

      return respostaEmCache ?? fetchPromise;
    }),
  );
});

