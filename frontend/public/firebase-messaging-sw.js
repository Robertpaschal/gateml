// Firebase Cloud Messaging Service Worker
// Config is fetched from /api/firebase-config at install time because
// service workers run outside the Next.js bundler and cannot access process.env.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Fetch config immediately (top-level, so it's ready before push events fire).
const configPromise = fetch('/api/firebase-config')
  .then(r => r.json())
  .then(config => {
    if (!firebase.apps.length) firebase.initializeApp(config);
    return firebase.messaging();
  })
  .catch(err => {
    console.error('[FCM SW] Failed to load Firebase config:', err);
    return null;
  });

// Block install until config + messaging are ready.
self.addEventListener('install', event => event.waitUntil(configPromise));

// Register background message handler after messaging is ready.
configPromise.then(messaging => {
  if (!messaging) return;

  messaging.onBackgroundMessage(payload => {
    const title = payload.notification?.title || 'GateML Alert';
    const body  = payload.notification?.body  || '';
    const link  = payload.fcmOptions?.link    || 'https://gateml.io/dashboard';

    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192.png',
      badge: '/badge-72.png',
      data:  { link },
    });
  });
});

// Open dashboard when the user clicks a notification.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = event.notification.data?.link || 'https://gateml.io/dashboard';
  event.waitUntil(clients.openWindow(link));
});
