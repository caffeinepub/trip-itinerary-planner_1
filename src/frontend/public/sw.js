const CACHE_NAME = 'trip-itinerary-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Cache blob storage assets (images, PDFs) and app shell
  const shouldCache =
    url.includes('/api/') === false && (
      event.request.destination === 'image' ||
      url.endsWith('.pdf') ||
      url.includes('blob') ||
      url.startsWith(self.location.origin)
    );

  if (!shouldCache) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached || new Response('Offline', { status: 503 }));
      })
    )
  );
});
