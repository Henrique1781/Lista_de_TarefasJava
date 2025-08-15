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

// Evento de Instalação: Salva os ficheiros essenciais em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: Interceta os pedidos para funcionar offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o recurso estiver no cache, retorna-o.
        if (response) {
          return response;
        }
        // Caso contrário, busca na rede.
        return fetch(event.request);
      }
    )
  );
});

// --- CÓDIGO NOVO E ESSENCIAL ADICIONADO ---
// Evento de Push: Ouve as notificações push recebidas do servidor
self.addEventListener('push', event => {
  // Extrai os dados da notificação. Por defeito, usamos um texto padrão se não vier nada.
  const data = event.data ? event.data.json() : { title: 'Minha Rotina', body: 'Não se esqueça das suas tarefas!' };

  const title = data.title || 'Minha Rotina';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    icon: '/icons/icon-192x192.png', // Ícone que aparece na notificação
    badge: '/icons/icon-192x192.png' // Ícone para a barra de status no Android
  };

  // Pede ao navegador para mostrar a notificação com o título e as opções definidas
  event.waitUntil(self.registration.showNotification(title, options));
});


// Evento de Clique na Notificação
self.addEventListener('notificationclick', event => {
  // Fecha a notificação
  event.notification.close();

  // Abre a janela da aplicação ou foca nela se já estiver aberta
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se uma janela da app já estiver aberta, foca nela
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Se não houver uma janela aberta, abre uma nova
      return clients.openWindow('/');
    })
  );
});