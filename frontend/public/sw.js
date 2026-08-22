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
  let payload = {
    title: '💊 HealthVault Reminder',
    body: 'You have a medicine reminder!',
    icon: '/icon.png',
    badge: '/icon.png',
    data: {}
  };

  if (event.data) {
    try {
      const raw = event.data.json();
      payload = {
        title: raw.title || payload.title,
        body: raw.body || payload.body,
        icon: raw.icon || '/icon.png',
        badge: '/icon.png',
        data: raw.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          { action: 'taken', title: '✅ Taken' },
          { action: 'snooze', title: '⏰ Snooze 10min' }
        ]
      };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
      data: payload.data,
      actions: payload.actions || []
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
