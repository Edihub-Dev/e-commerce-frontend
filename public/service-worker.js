// const HERO_CACHE = "hero-images-v1";
// const STATIC_CACHE = "static-assets-v1";
// Cache version - update this to invalidate all caches
const CACHE_VERSION = "2025-12-15-lcp-optimized";
const HERO_CACHE = `hero-images-${CACHE_VERSION}`;
const STATIC_CACHE = `static-assets-${CACHE_VERSION}`;
const HERO_IMAGE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const HERO_IMAGE_MATCHERS = [
  /https:\/\/ecom-mega-mart\.s3\.ap-south-1\.amazonaws\.com\/hero-carousel\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        // Pre-cache critical assets
        return cache.addAll([
          "/",
          "/index.html",
          "/manifest.json",
          // Add other critical assets here
        ]);
      })
      .then(() => self.skipWaiting())
  );
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
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension URLs
  if (request.method !== "GET" || url.protocol === "chrome-extension:") {
    return;
  }

  // Handle hero images with cache-first strategy
  if (shouldHandleAsHeroImage(request)) {
    event.respondWith(cacheFirst(request, HERO_CACHE));
    return;
  }

  // Cache static assets with stale-while-revalidate
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // For other resources, try network first, then cache
  if (
    request.destination === "image" &&
    !url.pathname.includes("hero-carousel") &&
    !url.pathname.includes("placeholder")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the response is good, cache it
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((response) => {
            return response || new Response("Offline", { status: 503 });
          });
        })
    );
  }
});

async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request, { ignoreSearch: false });

    // If we have a cached response, return it immediately for LCP
    if (cachedResponse) {
      // Update cache in the background
      fetchAndUpdateCache(request, cache);
      return cachedResponse;
    }

    // If no cache, wait for the network response
    return fetchAndUpdateCache(request, cache);
  } catch (error) {
    console.error("Cache first failed:", error);
    return fetch(request);
  }
}

async function fetchAndUpdateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse && networkResponse.ok) {
      // Create a new response with cache control headers
      const responseToCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          "Cache-Control": "public, max-age=604800, immutable", // 7 days
          "X-SW-Cache": "true",
        },
      });

      // Cache the response
      cache.put(request, responseToCache.clone());

      // Return the original response
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    console.error("Fetch and update cache failed:", error);
    throw error;
  }
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
