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
  const origin = self.location.origin || 'https://health-mate-hackathon-project.vercel.app';
  let title = '💊 HealthVault Reminder';
  let options = {
    body: 'You have a medicine reminder!',
    icon: origin + '/icon.png',
    badge: origin + '/icon.png',
    tag: 'healthvault-reminder',
    renotify: true,
    requireInteraction: true,
    data: {}
  };

  if (event.data) {
    try {
      const raw = event.data.json();
      title = raw.title || title;
      options.body = raw.body || options.body;
      if (raw.icon) {
        options.icon = raw.icon.startsWith('http') ? raw.icon : origin + raw.icon;
      }
      options.data = raw.data || {};
    } catch (e) {
      options.body = event.data.text();
    }
  }

  console.log('[SW] Push event received! Displaying notification:', title, options.body);


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
