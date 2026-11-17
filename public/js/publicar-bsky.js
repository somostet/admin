/* ============================================================
   publicar-bsky.js — publicar en Bluesky desde el navegador

   Bluesky (AT Protocol) es la única red grande que se puede usar sin
   backend: su API manda CORS abierto y se autentica con una «contraseña de
   aplicación» revocable, no con la contraseña de la cuenta. El token se
   guarda en localStorage de este navegador; el botón «Desconectar» lo borra
   y desde la propia red se revoca la contraseña.

   Se pinta en la pestaña Publicación cuando publicar.js llama a `montar`.
   Requiere: publicar.js (`window.tetPublicar`).
   ============================================================ */
(function () {
    'use strict';

    var CLAVE = 'tetBsky';
    var PDS = 'https://bsky.social';          // debe estar en el connect-src de la CSP
    var MAX_IMG = 1000000;                    // tope real de app.bsky.embed.images
    var RED = { id: 'bluesky', nombre: 'Bluesky', grupo: 'Bluesky', preset: 'Bluesky post 4:5' };
    var estado = leer();

    function leer() {
        try {
            var o = JSON.parse(localStorage.getItem(CLAVE) || 'null');
            return (o && o.did && o.accessJwt) ? o : null;
        } catch (e) {
            return null;
        }
    }
    function guardar(o) {
        estado = o;
        try {
            if (o) localStorage.setItem(CLAVE, JSON.stringify(o));
            else localStorage.removeItem(CLAVE);
        } catch (e) { /* modo privado: la sesión dura lo que la pestaña */ }
    }
    function base() { return (estado && estado.pds) || PDS; }

    /* ---------------- transporte ---------------- */
    /* `opciones`: { metodo, json, binario, tipoContenido, sinAuth }
       Las cabeceras se construyen en cada llamada para que el reintento tras
       refrescar la sesión use el token nuevo, no el viejo. */
    function api(ruta, opciones, reintento) {
        opciones = opciones || {};
        var cabeceras = {};
        if (!opciones.sinAuth) cabeceras.Authorization = 'Bearer ' + (estado && estado.accessJwt);
        if (opciones.json) cabeceras['Content-Type'] = 'application/json';
        if (opciones.tipoContenido) cabeceras['Content-Type'] = opciones.tipoContenido;

        var init = { method: opciones.metodo || 'GET', headers: cabeceras };
        if (opciones.json) init.body = JSON.stringify(opciones.json);
        if (opciones.binario) init.body = opciones.binario;

        return fetch(base() + '/xrpc/' + ruta, init).then(function (r) {
            return r.text().then(function (t) {
                var datos = null;
                try { datos = t ? JSON.parse(t) : {}; } catch (e) { datos = { error: t }; }
                if (r.ok) return datos;
                if (r.status === 401 && !reintento && estado && estado.refreshJwt) {
                    return refrescar().then(function () { return api(ruta, opciones, true); });
                }
                var err = new Error((datos && (datos.message || datos.error)) || ('HTTP ' + r.status));
                err.status = r.status;
                throw err;
            });
        }, function () {
            /* fetch solo rechaza por red/CORS: el mensaje tiene que orientar */
            throw new Error('No se pudo contactar con ' + base() +
                ' (sin conexión, CORS o CSP bloqueando el host)');
        });
    }

    function refrescar() {
        return fetch(base() + '/xrpc/com.atproto.server.refreshSession', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + estado.refreshJwt }
        }).then(function (r) {
            if (!r.ok) {
                guardar(null);
                throw new Error('La sesión de Bluesky ha caducado: vuelve a conectar');
            }
            return r.json();
        }).then(function (s) {
            estado.accessJwt = s.accessJwt;
            estado.refreshJwt = s.refreshJwt || estado.refreshJwt;
            if (s.did) estado.did = s.did;
            if (s.handle) estado.handle = s.handle;
            guardar(estado);
        });
    }

    function conectar(identificador, clave) {
        return api('com.atproto.server.createSession', {
            sinAuth: true,
            metodo: 'POST',
            json: { identifier: identificador, password: clave }
        }).then(function (s) {
            guardar({
                pds: PDS,
                did: s.did,
                handle: s.handle,
                accessJwt: s.accessJwt,
                refreshJwt: s.refreshJwt,
                cuando: Date.now()
            });
            return s;
        });
    }

    /* ---------------- texto enriquecido (facets) ----------------
       Bluesky no detecta enlaces ni hashtags solo: hay que mandar los tramos
       con sus desplazamientos en BYTES UTF-8, no en caracteres. */
    var codificador = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
    function nbytes(txt) {
        return codificador ? codificador.encode(txt).length : txt.length;
    }

    function facetas(texto) {
        var out = [];
        var re = /(https?:\/\/[^\s]+)|#([\p{L}\p{N}_]+)/gu;
        var m;
        while ((m = re.exec(texto))) {
            var ini = m.index;
            var bIni = nbytes(texto.slice(0, ini));
            var bFin = bIni + nbytes(m[0]);
            if (m[2]) {
                out.push({
                    index: { byteStart: bIni, byteEnd: bFin },
                    features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[2] }]
                });
            } else {
                out.push({
                    index: { byteStart: bIni, byteEnd: bFin },
                    features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[1] }]
                });
            }
        }
        return out.length ? out : null;
    }

    /* ---------------- publicar ---------------- */
    function publicar(texto, blob, alt) {
        if (!estado) return Promise.reject(new Error('Conecta Bluesky primero'));
        return api('com.atproto.repo.uploadBlob', {
            metodo: 'POST',
            binario: blob,
            tipoContenido: blob.type || 'image/png'
        }).then(function (subida) {
            var registro = {
                $type: 'app.bsky.feed.post',
                text: texto,
                createdAt: new Date().toISOString()
            };
            if (subida && subida.blob) {
                registro.embed = {
                    $type: 'app.bsky.embed.images',
                    images: [{ alt: alt || '', image: subida.blob }]
                };
            }
            var f = facetas(texto);
            if (f) registro.facets = f;
            return api('com.atproto.repo.createRecord', {
                metodo: 'POST',
                json: {
                    repo: estado.did,
                    collection: 'app.bsky.feed.post',
                    record: registro
                }
            });
        }).then(function (r) {
            var uri = (r && r.uri) || '';
            var rkey = uri.split('/').pop();
            return {
                uri: uri,
                url: rkey ? 'https://bsky.app/profile/' + estado.handle + '/post/' + rkey : 'https://bsky.app'
            };
        });
    }

    /* ---------------- UI ---------------- */
    function escapar(txt) {
        return String(txt || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function montar(contenedor) {
        var api2 = window.tetPublicar || {};
        var el = api2.el || function (tag, cls) {
            var n = document.createElement(tag);
            if (cls) n.className = cls;
            return n;
        };

        var card = el('div', 'pub-cuenta-card');
        card.dataset.red = 'bluesky';
        contenedor.appendChild(card);

        function progreso(nodo, msg, tipo) {
            if (api2.progreso) api2.progreso(nodo, msg, tipo);
            else if (nodo) { nodo.textContent = msg || ''; }
        }

        function publicarAhora() {
            var st = card.querySelector('.pub-cuenta-estado');
            var texto = api2.texto({ max: 300, tags: 3 });
            if (!texto) {
                progreso(st, 'Escribe primero el título o la descripción', 'warning');
                return;
            }
            var alt = api2.texto({ max: 2000, tags: 0 });
            progreso(st, 'Preparando la imagen…');
            api2.imagen(RED, {
                tipo: 'image/jpeg',
                calidades: [0.9, 0.78, 0.62, 0.5],
                maxBytes: MAX_IMG
            }, function (blob, err) {
                if (!blob) {
                    progreso(st, err && err.message ? err.message : 'No se pudo preparar la imagen', 'danger');
                    return;
                }
                progreso(st, 'Subiendo la imagen…');
                publicar(texto, blob, alt).then(function (r) {
                    progreso(st, 'Publicado en Bluesky', 'success');
                    api2.avisar('Publicado en Bluesky: ' + r.url, 'success');
                }).catch(function (e) {
                    progreso(st, e.message, 'danger');
                    api2.avisar(e.message, 'danger');
                });
            });
        }

        function pintar() {
            if (estado) {
                card.innerHTML =
                    '<div class="pub-cuenta-cab">' +
                        '<i class="fas fa-cloud" aria-hidden="true"></i> <strong>Bluesky</strong>' +
                        '<span class="pub-cuenta-quien">@' + escapar(estado.handle) + '</span>' +
                        '<button type="button" class="btn btn-sm btn-outline-secondary" data-accion="salir">' +
                            'Desconectar</button>' +
                    '</div>' +
                    '<button type="button" class="btn btn-sm btn-success" data-accion="publicar">' +
                        '<i class="fas fa-paper-plane" aria-hidden="true"></i> Publicar en Bluesky</button>' +
                    '<div class="pub-cuenta-estado" aria-live="polite"></div>';
            } else {
                card.innerHTML =
                    '<div class="pub-cuenta-cab">' +
                        '<i class="fas fa-cloud" aria-hidden="true"></i> <strong>Bluesky</strong>' +
                    '</div>' +
                    '<form class="pub-cuenta-form">' +
                        '<input class="form-control" name="usuario" autocomplete="username" ' +
                            'placeholder="usuario.bsky.social" required>' +
                        '<input class="form-control" name="clave" type="password" autocomplete="off" ' +
                            'placeholder="Contraseña de aplicación" required>' +
                        '<button type="submit" class="btn btn-sm btn-outline-light">Conectar</button>' +
                    '</form>' +
                    '<a class="pub-cuenta-ayuda" href="https://bsky.app/settings/app-passwords" ' +
                        'target="_blank" rel="noopener">Crear una contraseña de aplicación ' +
                        '(no uses la tuya)</a>' +
                    '<div class="pub-cuenta-estado" aria-live="polite"></div>';
            }

            var salir = card.querySelector('[data-accion="salir"]');
            if (salir) {
                salir.addEventListener('click', function () {
                    guardar(null);
                    pintar();
                    progreso(card.querySelector('.pub-cuenta-estado'),
                        'Sesión borrada de este navegador', 'info');
                });
            }

            var bPublicar = card.querySelector('[data-accion="publicar"]');
            if (bPublicar) bPublicar.addEventListener('click', publicarAhora);

            var form = card.querySelector('.pub-cuenta-form');
            if (form) {
                form.addEventListener('submit', function (ev) {
                    ev.preventDefault();
                    var st = card.querySelector('.pub-cuenta-estado');
                    var usuario = form.querySelector('[name="usuario"]').value.trim();
                    var clave = form.querySelector('[name="clave"]').value;
                    if (!usuario || !clave) {
                        progreso(st, 'Hacen falta el usuario y la contraseña de aplicación', 'warning');
                        return;
                    }
                    progreso(st, 'Conectando…');
                    conectar(usuario, clave).then(function () {
                        pintar();
                        progreso(card.querySelector('.pub-cuenta-estado'),
                            'Conectado con @' + estado.handle, 'success');
                    }).catch(function (e) {
                        progreso(st, e.message, 'danger');
                    });
                });
            }
        }

        pintar();
    }

    window.tetPublicarBsky = {
        montar: montar,
        publicar: publicar,
        conectar: conectar,
        estado: function () { return estado; }
    };
})();
