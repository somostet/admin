/* Service Worker de tet admin — vanilla (sin Workbox ni CDN en runtime)
   Estrategias equivalentes al sw.js anterior:
   - html/js: NetworkFirst (y 5xx -> copia en caché)   - css: StaleWhileRevalidate
   - imágenes y fuentes: CacheFirst (máx 20, 7 días) */
const VERSION = 'tet-admin-v4';

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
            // El clon se hace ANTES de devolver la respuesta: si se difiere, el
            // navegador ya se ha llevado el body y clone() revienta en silencio
            // (html y js nunca se cacheaban y no había modo offline real).
            var copia = response.clone();
            caches.open(cacheName).then(function (c) {
                return c.put(request, copia).then(function () { return limitar(c, 40); });
            }).catch(function (e) {
                console.warn('[sw] no se pudo guardar ' + request.url + ': ' + e);
            });
        }
        // 5xx (p. ej. sin red el proxy responde 502, que es una respuesta y no
        // un error): si hay copia en caché se sirve esa; sin copia, la respuesta.
        if (response && response.status >= 500) {
            return caches.match(request).then(function (guardada) { return guardada || response; });
        }
        return response;
    }).catch(function () {
        return caches.match(request).then(function (cached) {
            if (cached) return cached;
            throw new Error('sin red ni caché: ' + request.url);
        });
    });
}

function limitar(cache, maximo) {
    // las urls con ?t= de cada recarga se acumulan: nos quedamos con las últimas
    return cache.keys().then(function (claves) {
        if (claves.length > maximo) {
            return cache.delete(claves[0]).then(function () { return limitar(cache, maximo); });
        }
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
    } else if (/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot)$/i.test(ruta)) {
        event.respondWith(cacheFirst(request, CACHE_IMG));
    }
});
