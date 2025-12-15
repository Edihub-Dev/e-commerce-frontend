// const HERO_CACHE = "hero-images-v1";
// const STATIC_CACHE = "static-assets-v1";
const CACHE_VERSION = "2025-12-12T22-05";
const HERO_CACHE = `hero-images-${CACHE_VERSION}`;
const STATIC_CACHE = `static-assets-${CACHE_VERSION}`;
const HERO_IMAGE_MATCHERS = [
  /https:\/\/ecom-mega-mart\.s3\.ap-south-1\.amazonaws\.com\/hero-carousel\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![HERO_CACHE, STATIC_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

const shouldHandleAsHeroImage = (request) => {
  if (request.destination !== "image") {
    return false;
  }
  const url = request.url;
  return HERO_IMAGE_MATCHERS.some((regex) => regex.test(url));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (shouldHandleAsHeroImage(request)) {
    event.respondWith(cacheFirst(request, HERO_CACHE));
    return;
  }

  if (request.destination === "style" || request.destination === "script") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request, { ignoreSearch: false });
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkFetch;
}
