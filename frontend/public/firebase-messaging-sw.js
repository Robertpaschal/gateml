// Firebase Cloud Messaging Service Worker
// This file must be at the root of the public/ directory.
// It handles background push notifications when the dashboard tab is not active.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// These values are replaced at build time by next.config.ts if using env vars,
// or set directly here for simplicity (they are public, non-secret values).
firebase.initializeApp({
  apiKey:    self.__FIREBASE_API_KEY__     || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:self.__FIREBASE_AUTH_DOMAIN__ || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: self.__FIREBASE_PROJECT_ID__  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId:     self.__FIREBASE_APP_ID__      || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

// Handle background messages — shows a native OS notification
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'GateML Alert';
  const body  = payload.notification?.body  || '';
  const icon  = '/icon-192.png';
  const link  = payload.fcmOptions?.link    || 'https://gateml.io/dashboard';

  self.registration.showNotification(title, {
    body,
    icon,
    data: { link },
  });
});

// When user clicks the notification, open the dashboard
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = event.notification.data?.link || 'https://gateml.io/dashboard';
  event.waitUntil(clients.openWindow(link));
});
