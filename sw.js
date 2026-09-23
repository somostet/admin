/* Service Worker de tet admin — vanilla (sin Workbox ni CDN en runtime)
   Estrategias equivalentes al sw.js anterior:
   - html/js: NetworkFirst   - css: StaleWhileRevalidate   - imágenes: CacheFirst (máx 20, 7 días) */
const VERSION = 'tet-admin-v1';

const CACHE_HTML = 'tet-html-' + VERSION;
const CACHE_JS = 'tet-js-' + VERSION;
const CACHE_CSS = 'tet-css-' + VERSION;
const CACHE_IMG = 'tet-img-' + VERSION;

const IMAGENES_MAX = 20;
const IMAGENES_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (key) {
                    return key.indexOf('tet-') === 0 && key !== CACHE_HTML &&
                        key !== CACHE_JS && key !== CACHE_CSS && key !== CACHE_IMG;
                }).map(function (key) {
                    return caches.delete(key);
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

function networkFirst(request, cacheName) {
    return fetch(request).then(function (response) {
        if (response && response.ok) {
            var cache = caches.open(cacheName);
            cache.then(function (c) { c.put(request, response.clone()); });
        }
        return response;
    }).catch(function () {
        return caches.match(request).then(function (cached) {
            if (cached) return cached;
            throw new Error('sin red ni caché: ' + request.url);
        });
    });
}

function staleWhileRevalidate(request, cacheName) {
    return caches.open(cacheName).then(function (cache) {
        return cache.match(request).then(function (cached) {
            var network = fetch(request).then(function (response) {
                if (response && response.ok) cache.put(request, response.clone());
                return response;
            }).catch(function () { return null; });
            return cached || network.then(function (r) {
                if (r) return r;
                throw new Error('sin red ni caché: ' + request.url);
            });
        });
    });
}

function cacheFirst(request, cacheName) {
    return caches.open(cacheName).then(function (cache) {
        return cache.match(request).then(function (cached) {
            if (cached) return cached;
            return fetch(request).then(function (response) {
                if (response && response.ok) {
                    cache.put(request, response.clone());
                    limpiarCache(cache);
                }
                return response;
            });
        });
    });
}

function limpiarCache(cache) {
    cache.keys().then(function (keys) {
        if (keys.length > IMAGENES_MAX) cache.delete(keys[0]);
    });
    cache.keys().then(function (keys) {
        Promise.all(keys.map(function (req) {
            return cache.match(req).then(function (res) {
                if (!res) return;
                var fecha = res.headers.get('date');
                if (fecha && Date.now() - new Date(fecha).getTime() > IMAGENES_TTL) {
                    cache.delete(req);
                }
            });
        }));
    });
}

self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET') return;

    var url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // solo recursos del propio sitio

    var ruta = url.pathname;
    if (request.mode === 'navigate' || ruta.slice(-5) === '.html') {
        event.respondWith(networkFirst(request, CACHE_HTML));
    } else if (ruta.slice(-3) === '.js') {
        event.respondWith(networkFirst(request, CACHE_JS));
    } else if (ruta.slice(-4) === '.css') {
        event.respondWith(staleWhileRevalidate(request, CACHE_CSS));
    } else if (/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(ruta)) {
        event.respondWith(cacheFirst(request, CACHE_IMG));
    }
});
