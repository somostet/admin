/* ============================================================
   publicar-mastodon.js — publicar en Mastodon desde el navegador

   La API de Mastodon también manda CORS abierto y se autentica con un token
   de acceso que se crea (y se revoca) en la propia instancia. El token se
   guarda en localStorage de este navegador.

   IMPORTANTE: el host de la instancia tiene que estar en el `connect-src` de
   la CSP de la página (las instancias de INSTANCIAS ya están). Para añadir
   otra: súmala aquí y en los <head> de los editores (ver README).

   Se pinta en la pestaña Publicación cuando publicar.js llama a `montar`.
   Requiere: publicar.js (`window.tetPublicar`).
   ============================================================ */
(function () {
    'use strict';

    var CLAVE = 'tetMastodon';
    var RED = { id: 'mastodon', nombre: 'Mastodon', grupo: 'Universal', preset: 'Vertical 4:5 (1080×1350)' };

    /* tiene que coincidir con el connect-src de los editores */
    var INSTANCIAS = [
        'https://mastodon.social',
        'https://mstdn.social',
        'https://mas.to',
        'https://fosstodon.org',
        'https://mastodon.online',
        'https://techhub.social',
        'https://mastodon.world'
    ];

    var estado = leer();

    function leer() {
        try {
            var o = JSON.parse(localStorage.getItem(CLAVE) || 'null');
            return (o && o.instancia && o.token) ? o : null;
        } catch (e) {
            return null;
        }
    }
    function guardar(o) {
        estado = o;
        try {
            if (o) localStorage.setItem(CLAVE, JSON.stringify(o));
            else localStorage.removeItem(CLAVE);
        } catch (e) { /* modo privado */ }
    }
    function instancia() {
        return (estado && estado.instancia) || INSTANCIAS[0];
    }
    function origen(url) {
        try { return new URL(url).origin; } catch (e) { return ''; }
    }
    function permitida(url) {
        return INSTANCIAS.indexOf(origen(url)) !== -1;
    }

    /* ---------------- transporte ---------------- */
    function api(base, ruta, opciones) {
        opciones = opciones || {};
        var cabeceras = {};
        if (estado && estado.token) cabeceras.Authorization = 'Bearer ' + estado.token;
        if (opciones.json) cabeceras['Content-Type'] = 'application/json';
        if (opciones.cabeceras) {
            for (var k in opciones.cabeceras) {
                if (Object.prototype.hasOwnProperty.call(opciones.cabeceras, k)) {
                    cabeceras[k] = opciones.cabeceras[k];
                }
            }
        }
        var init = { method: opciones.metodo || 'GET', headers: cabeceras };
        if (opciones.json) init.body = JSON.stringify(opciones.json);
        if (opciones.binario) init.body = opciones.binario;   // FormData: el navegador pone el boundary

        return fetch(origen(base) + ruta, init).then(function (r) {
            return r.text().then(function (t) {
                var datos = null;
                try { datos = t ? JSON.parse(t) : {}; } catch (e) { datos = { error: t }; }
                if (r.ok) return datos;
                var err = new Error((datos && (datos.error_description || datos.error)) || ('HTTP ' + r.status));
                err.status = r.status;
                throw err;
            });
        }, function () {
            throw new Error('No se pudo contactar con ' + origen(base) +
                ' (sin conexión, CORS o CSP bloqueando el host)');
        });
    }

    function conectar(urlInstancia, token) {
        var base = origen(urlInstancia);
        if (!base) return Promise.reject(new Error('La dirección de la instancia no es válida'));
        if (!permitida(base)) {
            return Promise.reject(new Error(
                'Esa instancia todavía no está autorizada por la CSP de la página. ' +
                'Añádela a INSTANCIAS (publicar-mastodon.js) y al connect-src de los ' +
                'editores; está explicado en el README.'));
        }
        /* el token se prueba antes de guardarlo: verify_credentials */
        return fetch(base + '/api/v1/accounts/verify_credentials', {
            headers: { Authorization: 'Bearer ' + token }
        }).then(function (r) {
            if (r.status === 401) throw new Error('El token no es válido o no tiene permisos');
            if (!r.ok) throw new Error('La instancia respondió HTTP ' + r.status);
            return r.json();
        }, function () {
            throw new Error('No se pudo contactar con ' + base +
                ' (sin conexión, CORS o CSP bloqueando el host)');
        }).then(function (cuenta) {
            guardar({
                instancia: base,
                token: token,
                cuenta: cuenta.acct || cuenta.username,
                id: cuenta.id,
                cuando: Date.now()
            });
            return cuenta;
        });
    }

    /* ---------------- medios ---------------- */
    function esperarMedia(base, id, intentos) {
        intentos = intentos || 0;
        if (intentos > 15) return Promise.reject(new Error('La instancia no terminó de procesar el fichero'));
        return pretender(2000).then(function () {
            return api(base, '/api/v1/media/' + id);
        }).then(function (m) {
            if (m && m.url) return m;
            return esperarMedia(base, id, intentos + 1);
        });
    }
    function pretender(ms) {
        return new Promise(function (res) { setTimeout(res, ms); });
    }

    function subirMedia(base, blob, alt) {
        var fd = new FormData();
        fd.append('file', blob, 'tet.' + (blob.type === 'image/jpeg' ? 'jpg' : 'png'));
        if (alt) fd.append('description', alt);
        return api(base, '/api/v2/media', {
            metodo: 'POST',
            binario: fd,
            cabeceras: { 'Idempotency-Key': idempotencia() }
        }).then(function (m) {
            /* los vídeos (y algún servidor lento) devuelven 202 sin url: hay
               que consultar hasta que termine de procesar */
            if (m && m.id && !m.url) return esperarMedia(base, m.id, 0);
            return m;
        });
    }

    function idempotencia() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    /* ---------------- publicar ---------------- */
    function publicar(texto, blob, alt) {
        if (!estado) return Promise.reject(new Error('Conecta Mastodon primero'));
        var base = estado.instancia;
        return subirMedia(base, blob, alt).then(function (media) {
            if (!media || !media.id) throw new Error('La instancia no devolvió el fichero subido');
            return api(base, '/api/v1/statuses', {
                metodo: 'POST',
                json: {
                    status: texto,
                    media_ids: [media.id],
                    visibility: 'public'
                },
                cabeceras: { 'Idempotency-Key': idempotencia() }
            });
        }).then(function (r) {
            return { url: (r && r.url) || base, id: r && r.id };
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
        card.dataset.red = 'mastodon';
        contenedor.appendChild(card);

        function progreso(nodo, msg, tipo) {
            if (api2.progreso) api2.progreso(nodo, msg, tipo);
            else if (nodo) { nodo.textContent = msg || ''; }
        }

        function publicarAhora() {
            var st = card.querySelector('.pub-cuenta-estado');
            var texto = api2.texto({ max: 500, tags: 3 });
            if (!texto) {
                progreso(st, 'Escribe primero el título o la descripción', 'warning');
                return;
            }
            var alt = api2.texto({ max: 1500, tags: 0 });
            progreso(st, 'Preparando la imagen…');
            api2.imagen(RED, { tipo: 'image/png' }, function (blob, err) {
                if (!blob) {
                    progreso(st, err && err.message ? err.message : 'No se pudo preparar la imagen', 'danger');
                    return;
                }
                progreso(st, 'Subiendo la imagen…');
                publicar(texto, blob, alt).then(function (r) {
                    progreso(st, 'Publicado en Mastodon', 'success');
                    api2.avisar('Publicado en Mastodon: ' + r.url, 'success');
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
                        '<i class="fab fa-mastodon" aria-hidden="true"></i> <strong>Mastodon</strong>' +
                        '<span class="pub-cuenta-quien">@' + escapar(estado.cuenta) + '</span>' +
                        '<button type="button" class="btn btn-sm btn-outline-secondary" data-accion="salir">' +
                            'Desconectar</button>' +
                    '</div>' +
                    '<div class="pub-cuenta-donde">' + escapar(estado.instancia.replace(/^https?:\/\//, '')) + '</div>' +
                    '<button type="button" class="btn btn-sm btn-success" data-accion="publicar">' +
                        '<i class="fas fa-paper-plane" aria-hidden="true"></i> Publicar en Mastodon</button>' +
                    '<div class="pub-cuenta-estado" aria-live="polite"></div>';
            } else {
                var opciones = INSTANCIAS.map(function (u) {
                    return '<option value="' + escapar(u) + '">' +
                        escapar(u.replace(/^https?:\/\//, '')) + '</option>';
                }).join('');
                card.innerHTML =
                    '<div class="pub-cuenta-cab">' +
                        '<i class="fab fa-mastodon" aria-hidden="true"></i> <strong>Mastodon</strong>' +
                    '</div>' +
                    '<form class="pub-cuenta-form">' +
                        '<select class="form-select" name="instancia">' + opciones + '</select>' +
                        '<input class="form-control" name="token" type="password" autocomplete="off" ' +
                            'placeholder="Token de acceso" required>' +
                        '<button type="submit" class="btn btn-sm btn-outline-light">Conectar</button>' +
                    '</form>' +
                    '<a class="pub-cuenta-ayuda" href="https://docs.joinmastodon.org/user/preferences/" ' +
                        'target="_blank" rel="noopener">Crear un token en Preferencias → Desarrollo ' +
                        '(permisos write:statuses y write:media)</a>' +
                    '<div class="pub-cuenta-estado" aria-live="polite"></div>';
            }

            var salir = card.querySelector('[data-accion="salir"]');
            if (salir) {
                salir.addEventListener('click', function () {
                    guardar(null);
                    pintar();
                    progreso(card.querySelector('.pub-cuenta-estado'),
                        'Token borrado de este navegador', 'info');
                });
            }

            var bPublicar = card.querySelector('[data-accion="publicar"]');
            if (bPublicar) bPublicar.addEventListener('click', publicarAhora);

            var form = card.querySelector('.pub-cuenta-form');
            if (form) {
                form.addEventListener('submit', function (ev) {
                    ev.preventDefault();
                    var st = card.querySelector('.pub-cuenta-estado');
                    var url = form.querySelector('[name="instancia"]').value;
                    var token = form.querySelector('[name="token"]').value.trim();
                    if (!token) {
                        progreso(st, 'Hace falta el token de acceso', 'warning');
                        return;
                    }
                    progreso(st, 'Comprobando el token…');
                    conectar(url, token).then(function (cuenta) {
                        pintar();
                        progreso(card.querySelector('.pub-cuenta-estado'),
                            'Conectado como @' + (cuenta.acct || cuenta.username), 'success');
                    }).catch(function (e) {
                        progreso(st, e.message, 'danger');
                    });
                });
            }
        }

        pintar();
    }

    window.tetPublicarMastodon = {
        montar: montar,
        publicar: publicar,
        conectar: conectar,
        instancias: INSTANCIAS,
        estado: function () { return estado; }
    };
})();
