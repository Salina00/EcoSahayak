// const CACHE_NAME = "ecosahayak-v5"; // Bump version to force update

// // FILES TO CACHE
// const ASSETS_TO_CACHE = [
//     "./",
//     "./index.html",
//     "./style.css",
//     "./app.js",
//     "./manifest.json",
//     // CDNs (Maps, Icons, Charts)
//     "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
//     "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
//     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
//     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
//     "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
//     "https://cdn.jsdelivr.net/npm/chart.js"
// ];

// // 1. INSTALL: Cache everything
// self.addEventListener("install", (event) => {
//     self.skipWaiting();
//     event.waitUntil(
//         caches.open(CACHE_NAME).then((cache) => {
//             console.log("Caching assets...");
//             return cache.addAll(ASSETS_TO_CACHE);
//         }).catch(err => console.error("Caching failed:", err))
//     );
// });

// // 2. FETCH: Stale-While-Revalidate
// self.addEventListener("fetch", (event) => {
//     // Ignore Google Script API (always network)
//     if (event.request.url.includes("script.google.com")) {
//         event.respondWith(fetch(event.request));
//         return;
//     }

//     event.respondWith(
//         caches.match(event.request).then((cachedResponse) => {
//             // A. NETWORK REQUEST (Update Cache in Background)
//             const fetchPromise = fetch(event.request).then((networkResponse) => {
//                 // If valid, update cache
//                 if (networkResponse && networkResponse.status === 200) {
//                     const responseClone = networkResponse.clone();
//                     caches.open(CACHE_NAME).then((cache) => {
//                         cache.put(event.request, responseClone);
//                     });
//                 }
//                 return networkResponse;
//             }).catch(() => {
//                 // Network failed? Do nothing, we rely on cache.
//             });

//             // B. RETURN STRATEGY
//             // 1. If we have it in cache, return that INSTANTLY (Offline Support)
//             // 2. If not in cache, wait for the network request
//             return cachedResponse || fetchPromise;
//         })
//     );
// });

// // 3. ACTIVATE: Cleanup old caches
// self.addEventListener("activate", (event) => {
//     event.waitUntil(
//         caches.keys().then((cacheNames) => {
//             return Promise.all(
//                 cacheNames.map((cacheName) => {
//                     if (cacheName !== CACHE_NAME) {
//                         console.log("Deleting old cache:", cacheName);
//                         return caches.delete(cacheName);
//                     }
//                 })
//             );
//         }).then(() => self.clients.claim())
//     );
// });
const CACHE_NAME = "ecosahayak-v6"; // ALWAYS bump this version (v6 -> v7) when you code!

// STATIC ASSETS (UI, Libraries, Icons)
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    // External Libraries
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://cdn.jsdelivr.net/npm/chart.js"
];

// 1. INSTALL
self.addEventListener("install", (event) => {
    self.skipWaiting(); // Force activation immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

// 2. ACTIVATE (Clear old caches)
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim()) // Take control immediately
    );
});

// 3. FETCH (The Hybrid Strategy)
self.addEventListener("fetch", (event) => {

    // A. API Calls: Network Only (Never cache)
    if (event.request.url.includes("script.google.com")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // B. HTML Pages: Network First (So you see updates immediately)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((networkRes) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkRes.clone());
                        return networkRes;
                    });
                })
                .catch(() => caches.match(event.request)) // Fallback to cache if offline
        );
        return;
    }

    // C. Assets (CSS, JS, Images): Stale-While-Revalidate (Fast load)
    event.respondWith(
        caches.match(event.request).then((cachedRes) => {
            const networkFetch = fetch(event.request).then((networkRes) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkRes.clone());
                });
                return networkRes;
            });
            return cachedRes || networkFetch;
        })
    );
});