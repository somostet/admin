/* Creador de GIF — modo "varías imágenes → GIF" (lote D1)
   Motor: gifenc (vendor local, window.GIFEnc) — síncrono y sin Web Workers,
   así funciona igual en doble clic (file://) y en GitHub Pages.
   La codificación avanza fotograma a fotograma con setTimeout para no
   congelar la interfaz (sobre todo en el móvil). */
(function () {
    'use strict';

    var MAX_FOTOS = 60;
    var MAX_LADO = 2048; // tope de píxeles (los presets más grandes se reducen con aviso)

    var fotos = [];      // { url, img, nombre }
    var usosUrl = {};    // objectURL -> veces usada (al duplicar)
    var sel = -1;        // índice del fotograma seleccionado
    var urlGif = null;   // objectURL del último GIF
    var preview = null;  // temporizador de la vista previa
    var creando = false;

    var input = document.getElementById('gif-archivos');
    var tiraWrap = document.getElementById('gif-tira-wrap');
    var tira = document.getElementById('gif-tira');
    var barraAcc = document.getElementById('gif-acciones');
    var btnSubir = document.getElementById('gif-subir');
    var btnBajar = document.getElementById('gif-bajar');
    var btnDuplicar = document.getElementById('gif-duplicar');
    var btnQuitar = document.getElementById('gif-quitar');
    var conteo = document.getElementById('gif-conteo');
    var selTam = document.getElementById('gif-tamano');
    var inpDelay = document.getElementById('gif-delay');
    var selAjuste = document.getElementById('gif-ajuste');
    var inpFondo = document.getElementById('gif-fondo');
    var chkBucle = document.getElementById('gif-bucle');
    var lienzo = document.getElementById('gif-lienzo');
    // willReadFrequently: se lee en cada codificación (y quita el aviso de consola)
    var ctx = lienzo.getContext('2d', { willReadFrequently: true });
    var vacio = document.getElementById('gif-vacio');
    var progWrap = document.getElementById('gif-progreso');
    var barra = document.getElementById('gif-barra');
    var estado = document.getElementById('gif-estado');
    var btnCrear = document.getElementById('gif-crear');
    var aDesc = document.getElementById('gif-descargar');
    var txtDesc = document.getElementById('gif-descargar-texto');
    var resWrap = document.getElementById('gif-resultado');

    /* ---------- avisos (mismo patrón que mostrarAviso de capas.js) ---------- */
    function aviso(msg, tipo) {
        var cont = document.getElementById('tet-toast-container');
        if (!cont) {
            cont = document.createElement('div');
            cont.id = 'tet-toast-container';
            cont.className = 'toast-container position-fixed top-0 end-0 p-3';
            cont.style.zIndex = '1100';
            document.body.appendChild(cont);
        }
        var el = document.createElement('div');
        el.className = 'toast align-items-center text-bg-' + (tipo || 'warning') + ' border-0 show';
        el.setAttribute('role', 'alert');
        el.innerHTML = '<div class="d-flex"><div class="toast-body"></div>' +
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Cerrar"></button></div>';
        el.querySelector('.toast-body').textContent = msg;
        cont.appendChild(el);
        el.querySelector('.btn-close').addEventListener('click', function () { el.remove(); });
        setTimeout(function () { el.remove(); }, 4500);
    }

    /* ---------- selector de tamaño desde TET_FORMATOS (formatos.js) ---------- */
    (function poblarTamano() {
        var html = '<option value="orig">Tamaño de la primera imagen</option>';
        (window.TET_FORMATOS || []).forEach(function (g) {
            var items = g.items.filter(function (f) { return !f.orig && f.w && f.h; }).map(function (f) {
                return '<option value="' + f.w + 'x' + f.h + '">' + f.n + ' — ' + f.w + '×' + f.h + '</option>';
            }).join('');
            if (items) html += '<optgroup label="' + g.grupo + '">' + items + '</optgroup>';
        });
        selTam.innerHTML = html;
    })();

    /* ---------- carga de archivos (en cadena para respetar el orden) ---------- */
    input.addEventListener('change', function () {
        var lista = Array.prototype.slice.call(input.files || []);
        input.value = ''; // permite volver a elegir los mismos archivos
        if (!lista.length) return;
        var cola = Promise.resolve();
        lista.forEach(function (f) {
            cola = cola.then(function () { return cargarFoto(f); });
        });
    });

    function cargarFoto(f) {
        return new Promise(function (resolver) {
            if (!/^image\//.test(f.type)) {
                aviso('«' + f.name + '» no es una imagen', 'warning');
                return resolver();
            }
            if (creando) {
                aviso('Espera a que termine el GIF actual', 'info');
                return resolver();
            }
            if (fotos.length >= MAX_FOTOS) {
                aviso('Máximo ' + MAX_FOTOS + ' fotos por GIF', 'warning');
                return resolver();
            }
            var url = URL.createObjectURL(f);
            var img = new Image();
            img.onload = function () {
                fotos.push({ url: url, img: img, nombre: f.name });
                usosUrl[url] = (usosUrl[url] || 0) + 1;
                pintarTira();
                resolver();
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                aviso('No se pudo leer «' + f.name + '»', 'danger');
                resolver();
            };
            img.src = url;
        });
    }

    function soltarUrl(url) {
        usosUrl[url] = (usosUrl[url] || 1) - 1;
        if (usosUrl[url] <= 0) {
            delete usosUrl[url];
            URL.revokeObjectURL(url);
        }
    }

    /* ---------- tira de fotogramas ---------- */
    function pintarTira() {
        tira.textContent = '';
        fotos.forEach(function (f, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'gif-foto';
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
            b.title = f.nombre;
            var img = document.createElement('img');
            img.src = f.url;
            img.alt = 'Fotograma ' + (i + 1);
            img.className = 'gif-foto-img';
            var n = document.createElement('span');
            n.className = 'gif-foto-num';
            n.textContent = String(i + 1);
            b.appendChild(img);
            b.appendChild(n);
            b.addEventListener('click', function () { seleccionar(i); });
            tira.appendChild(b);
        });

        var hay = fotos.length > 0;
        tiraWrap.hidden = !hay;
        conteo.textContent = fotos.length + (fotos.length === 1 ? ' fotograma' : ' fotogramas') +
            ' · toca uno para reordenarlo o quitarlo' +
            (fotos.length >= MAX_FOTOS ? ' (máximo alcanzado)' : '');
        btnCrear.disabled = !hay || creando;
        if (!hay) sel = -1;
        else if (sel < 0 || sel >= fotos.length) sel = 0; // barra ↑↓ visible de entrada
        actualizarBarra();
        reiniciarPreview();
    }

    function seleccionar(i) {
        sel = (sel === i) ? -1 : i;
        actualizarBarra();
    }

    function actualizarBarra() {
        Array.prototype.forEach.call(tira.children, function (b, i) {
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
        });
        barraAcc.classList.toggle('is-on', sel !== -1 && !creando);
        btnSubir.disabled = sel <= 0;
        btnBajar.disabled = sel < 0 || sel >= fotos.length - 1;
        btnDuplicar.disabled = sel < 0 || fotos.length >= MAX_FOTOS;
        btnQuitar.disabled = sel < 0;
    }

    function mover(desde, hasta) {
        if (desde < 0 || hasta < 0 || desde >= fotos.length || hasta >= fotos.length) return;
        var f = fotos.splice(desde, 1)[0];
        fotos.splice(hasta, 0, f);
        sel = hasta;
        pintarTira();
    }

    btnSubir.addEventListener('click', function () { mover(sel, sel - 1); });
    btnBajar.addEventListener('click', function () { mover(sel, sel + 1); });

    btnDuplicar.addEventListener('click', function () {
        if (sel < 0 || fotos.length >= MAX_FOTOS) return;
        var f = fotos[sel];
        usosUrl[f.url] = (usosUrl[f.url] || 1) + 1;
        fotos.splice(sel + 1, 0, f);
        sel = sel + 1;
        pintarTira();
    });

    btnQuitar.addEventListener('click', function () {
        if (sel < 0) return;
        var f = fotos.splice(sel, 1)[0];
        soltarUrl(f.url);
        if (sel >= fotos.length) sel = fotos.length - 1;
        pintarTira();
    });

    /* ---------- tamaño de salida (con tope de píxeles) ---------- */
    function dimsSalida() {
        var w, h;
        if (selTam.value === 'orig') {
            var img = fotos[0] && fotos[0].img;
            w = img ? img.naturalWidth : 800;
            h = img ? img.naturalHeight : 800;
        } else {
            var p = selTam.value.split('x');
            w = parseInt(p[0], 10);
            h = parseInt(p[1], 10);
        }
        var lado = Math.max(w, h);
        if (lado > MAX_LADO) {
            var esc = MAX_LADO / lado;
            return { w: Math.round(w * esc), h: Math.round(h * esc), reducido: true };
        }
        return { w: w, h: h, reducido: false };
    }

    /* ---------- dibujo (cover/contain sobre fondo) ---------- */
    function dibujar(img) {
        var w = lienzo.width;
        var h = lienzo.height;
        ctx.fillStyle = inpFondo.value;
        ctx.fillRect(0, 0, w, h);
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;
        var esc = (selAjuste.value === 'contain')
            ? Math.min(w / iw, h / ih)
            : Math.max(w / iw, h / ih);
        var dw = iw * esc;
        var dh = ih * esc;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }

    /* ---------- vista previa ciclando ---------- */
    function reiniciarPreview() {
        if (preview) {
            clearInterval(preview);
            preview = null;
        }
        if (!fotos.length) {
            lienzo.style.display = 'none';
            vacio.hidden = false;
            return;
        }
        vacio.hidden = true;
        lienzo.style.display = 'block';
        var d = dimsSalida();
        if (lienzo.width !== d.w || lienzo.height !== d.h) {
            lienzo.width = d.w;
            lienzo.height = d.h;
        }
        var i = 0;
        dibujar(fotos[0].img);
        if (fotos.length < 2) return;
        var ms = Math.max(20, Math.min(10000, parseInt(inpDelay.value, 10) || 500));
        preview = setInterval(function () {
            i = (i + 1) % fotos.length;
            dibujar(fotos[i].img);
        }, ms);
    }

    [selTam, inpDelay, selAjuste, inpFondo].forEach(function (el) {
        el.addEventListener('change', function () {
            if (!creando) reiniciarPreview();
        });
    });

    /* ---------- codificación ---------- */
    btnCrear.addEventListener('click', function () {
        if (!fotos.length || creando) return;
        if (typeof window.GIFEnc === 'undefined') {
            aviso('El motor GIF no está disponible: recarga la página', 'danger');
            return;
        }
        crearGif();
    });

    function crearGif() {
        creando = true;
        btnCrear.disabled = true;
        resWrap.hidden = true;
        actualizarBarra();
        if (preview) {
            clearInterval(preview);
            preview = null;
        }
        progWrap.hidden = false;
        barra.style.width = '0%';
        barra.textContent = '0%';

        var d = dimsSalida();
        if (d.reducido && selTam.value !== 'orig') {
            // el preset más grande se reduce al tope del GIF
            aviso('Salida reducida a ' + d.w + '×' + d.h + ' px para que el GIF no sea gigante', 'info');
        }
        lienzo.width = d.w;
        lienzo.height = d.h;

        var delay = Math.max(20, Math.min(10000, parseInt(inpDelay.value, 10) || 500));
        var bucle = chkBucle.checked;
        var total = fotos.length;
        var gif = window.GIFEnc.GIFEncoder();
        var i = 0;

        function paso() {
            if (i >= total) return terminar();
            var datos;
            try {
                dibujar(fotos[i].img);
                datos = ctx.getImageData(0, 0, d.w, d.h).data;
            } catch (e) {
                // navegador bloqueando el lienzo (típico en file://): aviso claro
                return fallo(e);
            }
            var paleta = window.GIFEnc.quantize(datos, 256);
            var indice = window.GIFEnc.applyPalette(datos, paleta);
            gif.writeFrame(indice, d.w, d.h, {
                palette: paleta,
                delay: delay,
                repeat: (i === 0) ? (bucle ? 0 : -1) : undefined
            });
            i++;
            var pct = Math.round(i / total * 100);
            barra.style.width = pct + '%';
            barra.textContent = pct + '%';
            estado.textContent = 'Codificando fotograma ' + i + ' de ' + total + '…';
            setTimeout(paso, 0); // deja pintar la interfaz antes del siguiente
        }

        function limpiar() {
            progWrap.hidden = true;
            creando = false;
            btnCrear.disabled = fotos.length === 0;
            actualizarBarra();
            reiniciarPreview();
        }

        function fallo(e) {
            console.warn('gif: no se pudo codificar', e);
            aviso('El navegador bloqueó la exportación (común en modo doble-clic). ' +
                'Abre la página desde GitHub Pages o un servidor local.', 'danger');
            limpiar();
        }

        function terminar() {
            gif.finish();
            var blob = new Blob([gif.bytes()], { type: 'image/gif' });
            if (urlGif) URL.revokeObjectURL(urlGif);
            urlGif = URL.createObjectURL(blob);
            aDesc.href = urlGif;
            txtDesc.textContent = 'Descargar GIF (' + Math.round(blob.size / 1024) + ' KB)';
            resWrap.hidden = false;
            aviso('GIF listo: ' + total + (total === 1 ? ' foto' : ' fotos') + ' · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
            resWrap.scrollIntoView({ block: 'nearest' });
        }

        estado.textContent = 'Codificando…';
        setTimeout(paso, 0);
    }
})();
