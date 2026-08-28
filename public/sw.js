const CACHE = 'iray-v1';
const ASSETS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Só a "casca" (HTML/ícones) fica em cache — o chat em si precisa sempre de
// rede (WebSocket), por isso não tentamos servir mensagens offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/') || e.request.url.includes('/ws')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Notificação push a sério — chega mesmo com a app completamente fechada,
// porque quem "acorda" para receber isto é o browser/sistema, não a app.
self.addEventListener('push', (e) => {
  let dados = { titulo: 'Iray', corpo: 'Tens uma mensagem nova.' };
  try { dados = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'iray-chat',
      renotify: true
    })
  );
});

// Ao tocar na notificação, abre (ou traz para a frente) a app.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const cliente of lista) {
        if ('focus' in cliente) return cliente.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
