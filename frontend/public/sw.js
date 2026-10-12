/**
 * FitTracker Iron - Service Worker (Offline-First)
 * Permite que la PWA abra y funcione sin internet ni datos móviles en el gimnasio.
 */

const CACHE_NAME = "fittracker-iron-v1";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
];

// Instalación: Precarga de shell de la aplicación
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activación: Limpieza de versiones obsoletas de caché y reclamo de clientes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interceptor de peticiones (Fetch)
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Solo interceptar peticiones GET
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Las peticiones al backend /api/ no se cachean en el SW
  // (la cola de sincronización en localStorage gestiona el modo offline)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Peticiones de navegación SPA (HTML): Network first con fallback defensivo a /index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Si no hay red (Modo avión / sin señal en el gimnasio), retornar /index.html de caché
          const cachedIndex = await caches.match("/index.html");
          if (cachedIndex) return cachedIndex;
          const cachedReq = await caches.match(request);
          if (cachedReq) return cachedReq;
          return caches.match("/");
        })
    );
    return;
  }

  // Recursos estáticos (JS, CSS, fuentes, imágenes): Cache-first con actualización en red
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // En background actualizar la caché si hay red disponible
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, resClone);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si no está en caché, buscar en red y guardar en caché
      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin)
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async (fetchErr) => {
          // Fallback para imágenes si fallan
          if (request.destination === "image") {
            const fallbackIcon = await caches.match("/logo.svg");
            if (fallbackIcon) return fallbackIcon;
          }
          throw fetchErr;
        });
    })
  );
});
