import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import CONFIG from './config';

// Do precaching
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);
 
// Runtime caching
registerRoute(
  ({ url }) => {
    return (
      url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com'
    );
  },
  new CacheFirst({
    cacheName: 'google-fonts',
  })
);

registerRoute(
  ({ url }) => {
    return (
      url.origin === 'https://cdnjs.cloudflare.com' ||
      url.origin.includes('fontawesome')
    );
  },
  new CacheFirst({
    cacheName: 'fontawesome',
  })
);

registerRoute(
  ({ url }) => {
    return url.origin === 'https://ui-avatars.com';
  },
  new CacheFirst({
    cacheName: 'avatars-api',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(CONFIG.BASE_URL);
    return baseUrl.origin === url.origin && request.destination !== 'image';
  },
  new NetworkFirst({
    cacheName: 'story-api',
  })
);

registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(CONFIG.BASE_URL);
    return baseUrl.origin === url.origin && request.destination === 'image';
  },
  new StaleWhileRevalidate({
    cacheName: 'story-api-images',
  })
);

registerRoute(
  ({ url }) => {
    return url.origin.includes('maptiler');
  },
  new CacheFirst({
    cacheName: 'maptiler-api',
  })
);

self.addEventListener('push', (event) => {
  let data = {
    title: 'New Story',
    options: {
      body: 'You have a new story!',
      icon: '/icon.png', // Optional: Add an icon for the notification
      badge: '/badge.png' // Optional: Add a badge for the notification
    }
  };

  if (event.data) {
    try {
      // Try to parse the data as JSON
      const parsedData = event.data.json();
      data = parsedData;
    } catch (error) {
      console.error('Error parsing push data:', error);
      // Fallback: Use the text data as the body if JSON parsing fails
      try {
        data.options.body = event.data.text() || 'You have a new story!';
      } catch (textError) {
        console.error('Error reading text data:', textError);
      }
    }
  }

  const promiseChain = self.registration.showNotification(data.title, data.options);
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});