const CACHE_NAME = "ecosahayak-v3";

const ASSETS_TO_CACHE = [
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
];

// INSTALL
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

// FETCH
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) =>
                Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                )
            ),
            self.clients.claim()
        ])
    );
});
