// HealthVault Service Worker — Medicine Reminder Push Notifications
// This file MUST be at /public/sw.js for browser Service Worker registration

self.addEventListener('install', (event) => {
  console.log('[HealthVault SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[HealthVault SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let title = '💊 HealthVault Reminder';
  let options = {
    body: 'You have a medicine reminder!',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'healthvault-' + Date.now(),
    requireInteraction: true,
    data: {}
  };

  if (event.data) {
    try {
      const raw = event.data.json();
      title = raw.title || title;
      options.body = raw.body || options.body;
      options.icon = raw.icon || '/icon.png';
      options.badge = '/icon.png';
      options.data = raw.data || {};
    } catch (e) {
      options.body = event.data.text();
    }
  }

  console.log('[SW] Push received! Title:', title, '| Body:', options.body);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] ✅ Notification shown successfully!');
      })
      .catch((err) => {
        console.error('[SW] ❌ showNotification failed:', err);
      })
  );
});


// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'taken') {
    console.log('[SW] Medicine marked as taken');
  } else if (event.action === 'snooze') {
    console.log('[SW] Reminder snoozed');
  } else {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('localhost') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/reminders');
        }
      })
    );
  }
});
