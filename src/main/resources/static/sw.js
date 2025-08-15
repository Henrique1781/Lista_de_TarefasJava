const CACHE_NAME = 'minha-rotina-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://unpkg.com/@phosphor-icons/web@2.0.3',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
];

// Evento de Instalação: Salva os arquivos essenciais em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: Intercepta as requisições para funcionar offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o recurso estiver no cache, retorna ele.
        if (response) {
          return response;
        }
        // Caso contrário, busca na rede.
        return fetch(event.request);
      }
    )
  );
});

// --- NOVO CÓDIGO ADICIONADO ---
// Evento de Clique na Notificação
self.addEventListener('notificationclick', event => {
  // Fecha a notificação
  event.notification.close();

  // Abre a janela do aplicativo ou foca nela se já estiver aberta
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se uma janela do app já estiver aberta, foque nela
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Se não houver uma janela aberta, abra uma nova
      return clients.openWindow('/');
    })
  );
});