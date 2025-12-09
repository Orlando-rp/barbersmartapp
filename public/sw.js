// Service Worker para Push Notifications - BarberSmart

const CACHE_NAME = 'barbersmart-v1';

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado');
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(clients.claim());
});

// Receber notificações push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);

  let data = {
    title: 'BarberSmart',
    body: 'Nova notificação',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'barbersmart-notification',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Erro ao parsear dados push:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'barbersmart-notification',
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event.action);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já existe uma janela aberta, focar nela
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Senão, abrir uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada');
});

// Sincronização em background (para quando voltar online)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
});
