/* ============================================================
   publicar.js — «Publicar en otra red» dentro de la pestaña Publicación

   Nivel 0 (sin backend): por cada red, el texto ya ajustado a su límite y
   la imagen exportada en el tamaño que pide esa red (formatos.js). El botón
   de compartir usa la hoja del sistema con fichero + texto; en escritorio,
   si no hay hoja, copia la imagen y el texto al portapapeles.

   Nivel 1 (sin backend): las redes que permiten publicar desde el navegador
   se enganchan en «Publicar desde aquí» con `window.tetPublicarBsky` y
   `window.tetPublicarMastodon` (se cargan antes que este archivo).

   Requiere: publicacion.js (crea el panel y los campos), formatos.js
   (`tetExportarBlob`) y capas.js (`window.mostrarAviso`). No necesita red:
   sin conexión el panel sigue sirviendo para copiar texto y descargar.
   ============================================================ */
(function () {
    'use strict';

    var caja = document.querySelector('.pub-caja');
    if (!caja) return;                       // página sin pestaña Publicación

    var inTitulo = document.getElementById('pub-titulo');
    var inDesc = document.getElementById('pub-descripcion');
    var inTags = document.getElementById('pub-hashtags');

    /* ---------------- redes y preset de cada una ----------------
       `max` es el límite de caracteres del pie y `tags` cuántos hashtags
       entran sin que la red los recorte. Los presets existen en formatos.js:
       si se renombra uno allí, aquí se ve el aviso y el botón PNG no hace nada. */
    var REDES = [
        { id: 'instagram', nombre: 'Instagram', icono: 'fab fa-instagram', grupo: 'Instagram', preset: 'IG post vertical (4:5)', max: 2200, tags: 5 },
        { id: 'facebook', nombre: 'Facebook', icono: 'fab fa-facebook', grupo: 'Facebook', preset: 'FB post vertical (4:5)', max: 63206, tags: 5 },
        { id: 'x', nombre: 'X', icono: 'fab fa-twitter', grupo: 'X (Twitter)', preset: 'X post horizontal (16:9)', max: 280, tags: 2 },
        { id: 'linkedin', nombre: 'LinkedIn', icono: 'fab fa-linkedin', grupo: 'LinkedIn', preset: 'LI post con enlace', max: 3000, tags: 3 },
        { id: 'tiktok', nombre: 'TikTok', icono: 'fab fa-tiktok', grupo: 'TikTok', preset: 'TikTok vídeo / carrusel', max: 2200, tags: 4 },
        { id: 'threads', nombre: 'Threads', icono: 'fas fa-at', grupo: 'Threads', preset: 'Threads post 3:4', max: 500, tags: 3 },
        { id: 'bluesky', nombre: 'Bluesky', icono: 'fas fa-cloud', grupo: 'Bluesky', preset: 'Bluesky post 4:5', max: 300, tags: 3 },
        { id: 'mastodon', nombre: 'Mastodon', icono: 'fab fa-mastodon', grupo: 'Universal', preset: 'Vertical 4:5 (1080×1350)', max: 500, tags: 3 },
        { id: 'pinterest', nombre: 'Pinterest', icono: 'fab fa-pinterest', grupo: 'Pinterest', preset: 'Pin 2:3', max: 500, tags: 5 },
        { id: 'youtube', nombre: 'YouTube', icono: 'fab fa-youtube', grupo: 'YouTube', preset: 'YT miniatura', max: 5000, tags: 0 }
    ];

    function el(tag, cls, html) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (html != null) d.innerHTML = html;
        return d;
    }
    function avisar(msg, tipo) {
        if (window.mostrarAviso) window.mostrarAviso(msg, tipo);
    }
    function valor(nodo) { return nodo ? nodo.value : ''; }

    /* ---------------- texto por red ---------------- */
    function listaTags(bruto, maximo) {
        var vistos = {}, out = [];
        (bruto || '').split(/[\s,;]+/).forEach(function (t) {
            t = t.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
            if (!t) return;
            var clave = t.toLowerCase();
            if (vistos[clave]) return;
            vistos[clave] = 1;
            out.push('#' + t);
        });
        return out.slice(0, maximo);
    }

    /* Corta por puntos de código, no por unidades UTF-16: cortar un emoji
       por la mitad produce texto corrupto al pegarlo en la red. */
    function recortar(txt, maximo) {
        if (!maximo || maximo <= 0) return maximo === 0 ? '' : txt;
        if (txt.length <= maximo) return txt;
        var puntos = Array.from(txt);
        if (puntos.length <= maximo) return txt;
        return puntos.slice(0, maximo - 1).join('') + '…';
    }

    function unir(titulo, descripcion, tags) {
        var out = [];
        if (titulo) out.push(titulo);
        if (descripcion) out.push(descripcion);
        if (tags) out.push(tags);
        return out.join('\n\n');
    }

    function partes(red) {
        return unir(
            valor(inTitulo).trim(),
            valor(inDesc).trim(),
            listaTags(valor(inTags), red.tags || 0).join(' ')
        );
    }

    /* Si no cabe, se acorta la DESCRIPCIÓN y se salvan título y hashtags: al
       revés se perdían los hashtags, que es lo que más se nota en el feed. */
    function textoPara(red) {
        var t = valor(inTitulo).trim();
        var d = valor(inDesc).trim();
        var g = listaTags(valor(inTags), red.tags || 0).join(' ');
        var txt = unir(t, d, g);
        if (!red.max || txt.length <= red.max) return txt;

        if (d) {
            var sobra = txt.length - red.max;
            var d2 = recortar(d, d.length - sobra);
            txt = unir(t, d2, g);
        }
        if (txt.length > red.max) txt = recortar(txt, red.max);
        return txt;
    }

    /* ---------------- DOM: lista de redes ---------------- */
    var bloque = el('div', 'pub-pub');
    bloque.innerHTML =
        '<span class="pub-et">Publicar en otra red</span>' +
        '<p class="pub-intro">Cada red recibe la imagen en su tamaño y el texto ' +
            'ya recortado a su límite. Compartir abre la hoja del sistema en el ' +
            'móvil; en escritorio copia imagen y texto (o la descarga).</p>' +
        '<ul class="pub-redes" id="pub-redes"></ul>' +
        '<div class="pub-acciones">' +
            '<button type="button" class="btn btn-sm btn-outline-light" id="pub-copiar-todas">' +
                '<i class="far fa-copy" aria-hidden="true"></i> Copiar el de todas</button>' +
        '</div>';

    /* «Publicar desde aquí» (solo las redes que admiten API desde el navegador) */
    var cuentas = el('div', 'pub-pub');
    cuentas.id = 'pub-cuentas';

    caja.appendChild(bloque);
    caja.appendChild(cuentas);

    var lista = bloque.querySelector('#pub-redes');
    var filas = {};

    REDES.forEach(function (red) {
        var dims = window.tetFormatoDims ? window.tetFormatoDims(red.grupo, red.preset) : null;
        var li = el('li', 'pub-red');
        li.dataset.red = red.id;

        var nombre = el('span', 'pub-red-nombre',
            '<i class="' + red.icono + '" aria-hidden="true"></i> ' + red.nombre);
        var cuenta = el('span', 'pub-red-cuenta');
        var dim = el('span', 'pub-red-dim', dims ? dims.w + '×' + dims.h : '—');

        /* nombre arriba y «0/2200 · 1080×1350» debajo: en el dock estrecho no
           caben cinco columnas y así la fila mide 44 px en vez de 76 */
        var meta = el('span', 'pub-red-meta');
        meta.appendChild(cuenta);
        meta.appendChild(dim);
        var info = el('span', 'pub-red-info');
        info.appendChild(nombre);
        info.appendChild(meta);

        var bTexto = el('button', 'btn btn-sm btn-outline-light pub-red-btn',
            '<i class="far fa-clipboard" aria-hidden="true"></i>');
        bTexto.type = 'button';
        bTexto.title = 'Copiar el texto para ' + red.nombre;
        bTexto.setAttribute('aria-label', bTexto.title);

        var bPng = el('button', 'btn btn-sm btn-outline-light pub-red-btn',
            '<i class="fas fa-download" aria-hidden="true"></i>');
        bPng.type = 'button';
        bPng.title = 'Descargar la imagen para ' + red.nombre;
        bPng.setAttribute('aria-label', bPng.title);

        var bCompartir = el('button', 'btn btn-sm btn-outline-light pub-red-btn',
            '<i class="fas fa-share-alt" aria-hidden="true"></i>');
        bCompartir.type = 'button';
        bCompartir.title = 'Compartir en ' + red.nombre;
        bCompartir.setAttribute('aria-label', bCompartir.title);

        li.appendChild(info);
        li.appendChild(bTexto);
        li.appendChild(bPng);
        li.appendChild(bCompartir);
        lista.appendChild(li);

        filas[red.id] = { red: red, fila: li, cuenta: cuenta, dim: dim };

        bTexto.addEventListener('click', function () {
            copiar(textoPara(red), 'El texto de ' + red.nombre + ' está vacío');
        });
        bPng.addEventListener('click', function () { descargarVariante(red); });
        bCompartir.addEventListener('click', function () { compartir(red); });
    });

    /* ---------------- contadores en vivo ---------------- */
    function pintarCuentas() {
        REDES.forEach(function (red) {
            var f = filas[red.id];
            var largo = partes(red).length;
            var sobran = largo > red.max;
            f.cuenta.textContent = largo + '/' + red.max;
            f.cuenta.classList.toggle('es-excedido', sobran);
            f.fila.classList.toggle('es-excedido', sobran);
            f.fila.title = sobran
                ? 'Se recorta a ' + red.max + ' caracteres al publicar aquí'
                : '';
        });
    }
    [inTitulo, inDesc, inTags].forEach(function (nodo) {
        if (nodo) nodo.addEventListener('input', pintarCuentas);
    });

    /* ---------------- portapapeles ---------------- */
    function copiarLegado(txt) {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
        return ok;
    }
    function copiar(txt, vacio) {
        if (!txt) { avisar(vacio || 'No hay nada que copiar', 'warning'); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt)
                .then(function () { avisar('Texto copiado', 'success'); })
                .catch(function () {
                    avisar(copiarLegado(txt) ? 'Texto copiado' : 'No se pudo copiar: selecciónalo a mano',
                        'warning');
                });
        } else {
            avisar(copiarLegado(txt) ? 'Texto copiado' : 'No se pudo copiar: selecciónalo a mano', 'warning');
        }
    }

    /* ---------------- imagen ---------------- */
    function nombreArchivo(red, blob) {
        var ext = (blob && blob.type === 'image/jpeg') ? 'jpg' : 'png';
        var d = filas[red.id].dim.textContent.replace('—', 'auto');
        return 'tet-' + red.id + '-' + d + '.' + ext;
    }

    function descargarBlob(blob, nombre) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }

    /* Envuelve tetExportarBlob para reintentar con menos calidad cuando la red
       tiene tope de peso (Bluesky: 1 MB por imagen). */
    function imagen(red, opciones, done) {
        if (!window.tetExportarBlob) {
            done(null, new Error('Esta página no puede exportar variantes (falta formatos.js)'));
            return;
        }
        opciones = opciones || {};
        var calidades = opciones.calidades || [1];
        var i = 0;
        (function siguiente() {
            if (i >= calidades.length) {
                done(null, new Error('La imagen no baja del límite de ' + red.nombre));
                return;
            }
            var calidad = calidades[i++];
            window.tetExportarBlob(red.grupo, red.preset, {
                tipo: opciones.tipo,
                calidad: calidad
            }, function (blob, err) {
                if (!blob) { done(null, err); return; }
                if (opciones.maxBytes && blob.size > opciones.maxBytes && i < calidades.length) {
                    siguiente();
                    return;
                }
                done(blob, null, calidad);
            });
        })();
    }

    function descargarVariante(red) {
        if (!window.tetExportarBlob) {
            avisar('Esta página no carga los formatos de red', 'warning');
            return;
        }
        imagen(red, { tipo: 'image/png' }, function (blob, err) {
            if (!blob) { avisar(err && err.message ? err.message : 'No se pudo exportar', 'danger'); return; }
            var nombre = nombreArchivo(red, blob);
            descargarBlob(blob, nombre);
            avisar('Descargado ' + nombre, 'success');
        });
    }

    /* ---------------- compartir ---------------- */
    function alPortapapeles(texto, blob, red) {
        /* Chrome y Safari admiten escribir la imagen en el portapapeles; si
           falla (file://, permisos, JPEG) se descarga y se copia solo el texto */
        var intento = null;
        if (blob && blob.type === 'image/png' && navigator.clipboard && navigator.clipboard.write &&
            window.ClipboardItem) {
            try {
                intento = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            } catch (e) {
                intento = null;
            }
        }
        function conTexto() {
            if (!texto) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).catch(function () { copiarLegado(texto); });
            } else {
                copiarLegado(texto);
            }
        }
        if (intento) {
            intento.then(function () {
                conTexto();
                avisar('Imagen y texto copiados: pégalos en ' + red.nombre, 'success');
            }).catch(function () {
                if (blob) descargarBlob(blob, nombreArchivo(red, blob));
                conTexto();
                avisar('Imagen descargada y texto copiado: súbelos en ' + red.nombre, 'info');
            });
            return;
        }
        if (blob) descargarBlob(blob, nombreArchivo(red, blob));
        conTexto();
        avisar(blob
            ? 'Imagen descargada y texto copiado: súbelos en ' + red.nombre
            : 'Texto copiado', blob ? 'info' : 'success');
    }

    function compartir(red) {
        avisar('Preparando ' + red.nombre + '…', 'info');
        imagen(red, { tipo: 'image/png' }, function (blob, err) {
            if (!blob) {
                avisar(err && err.message ? err.message : 'No se pudo preparar la imagen', 'danger');
                return;
            }
            var texto = textoPara(red);
            var archivo = new File([blob], nombreArchivo(red, blob), { type: blob.type });
            if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
                navigator.share({ files: [archivo], text: texto }).catch(function (e) {
                    if (e && e.name === 'AbortError') return;   // cancelado por la persona
                    alPortapapeles(texto, blob, red);
                });
                return;
            }
            alPortapapeles(texto, blob, red);
        });
    }

    /* ---------------- copiar el de todas ---------------- */
    bloque.querySelector('#pub-copiar-todas').addEventListener('click', function () {
        var trozos = [];
        REDES.forEach(function (red) {
            var txt = textoPara(red);
            if (txt) trozos.push('— ' + red.nombre + ' (' + txt.length + '/' + red.max + ') —\n' + txt);
        });
        if (!trozos.length) { avisar('Escribe primero el texto de la publicación', 'warning'); return; }
        copiar(trozos.join('\n\n'), null);
    });

    /* ---------------- API para las cuentas conectadas ---------------- */
    window.tetPublicar = {
        redes: REDES,
        texto: function (opciones) {
            opciones = opciones || {};
            return textoPara({ max: opciones.max || 100000, tags: opciones.tags == null ? 5 : opciones.tags });
        },
        imagen: imagen,
        avisar: avisar,
        el: el,
        /* el panel de cada red se marca como «en marcha» mientras sube */
        progreso: function (nodo, msg, tipo) {
            if (!nodo) return;
            nodo.textContent = msg || '';
            nodo.className = 'pub-cuenta-estado' + (tipo ? ' es-' + tipo : '');
        }
    };

    /* ---------------- cuentas conectadas (Nivel 1) ---------------- */
    var conectadas = 0;
    if (window.tetPublicarBsky) { window.tetPublicarBsky.montar(cuentas); conectadas++; }
    if (window.tetPublicarMastodon) { window.tetPublicarMastodon.montar(cuentas); conectadas++; }
    if (conectadas) {
        cuentas.insertBefore(el('span', 'pub-et', 'Publicar desde aquí'), cuentas.firstChild);
        cuentas.insertBefore(el('p', 'pub-intro',
            'Se publica directamente, sin copiar y pegar. Solo las redes que lo ' +
            'permiten desde el navegador: Bluesky y Mastodon. Las claves se ' +
            'guardan en este navegador y se revocan desde la propia red.'), cuentas.children[1]);
    }

    pintarCuentas();
})();
