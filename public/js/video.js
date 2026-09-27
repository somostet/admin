/* Creador de vídeo — modo "imágenes → vídeo" (lote E1)
   Motor: nativo del navegador (canvas.captureStream + MediaRecorder), sin
   dependencias. Autodetección de formato: MP4 (Chrome reciente, Edge, Safari/iOS)
   y si no WebM (VP9/VP8). La grabación es en tiempo real: cada imagen se pinta
   en el lienzo durante su duración mientras el stream se codifica.
   Espejo de gif.js en la tira de imágenes (reordenar/duplicar/quitar). */
(function () {
    'use strict';

    var MAX_IMAGENES = 60;
    var MAX_LADO = 1920;          // tope de píxeles (los presets más grandes se reducen con aviso)
    var MAX_TOTAL_SEG = 120;      // 2 minutos: se graba en tiempo real, no conviene más
    var MIN_POR_IMAGEN = 0.1;      // 10 fotogramas/s por imagen: menos no lo distingue el grabador
    var FPS = 30;

    var imagenes = [];    // { url, img, nombre }
    var usosUrl = {};     // objectURL -> veces usada (al duplicar)
    var sel = -1;         // índice de la imagen seleccionada
    var urlVideo = null;  // objectURL del último vídeo
    var preview = null;   // id de requestAnimationFrame de la vista previa
    var grabando = false;
    var recAct = null;
    var rafAct = null;
    var cancelado = false;

    var input = document.getElementById('vid-archivos');
    var tiraWrap = document.getElementById('vid-tira-wrap');
    var tira = document.getElementById('vid-tira');
    var barraAcc = document.getElementById('vid-acciones');
    var btnSubir = document.getElementById('vid-subir');
    var btnBajar = document.getElementById('vid-bajar');
    var btnDuplicar = document.getElementById('vid-duplicar');
    var btnQuitar = document.getElementById('vid-quitar');
    var conteo = document.getElementById('vid-conteo');
    var selTam = document.getElementById('vid-tamano');
    var inpDur = document.getElementById('vid-duracion');
    var selModoDur = document.getElementById('vid-modo-dur');
    var selAjuste = document.getElementById('vid-ajuste');
    var selTrans = document.getElementById('vid-transicion');
    var inpFondo = document.getElementById('vid-fondo');
    var vidTotal = document.getElementById('vid-total');
    var lienzo = document.getElementById('vid-lienzo');
    var ctx = lienzo.getContext('2d', { willReadFrequently: false });
    var vacio = document.getElementById('vid-vacio');
    var progWrap = document.getElementById('vid-progreso');
    var barra = document.getElementById('vid-barra');
    var estado = document.getElementById('vid-estado');
    var btnCrear = document.getElementById('vid-crear');
    var btnCancelar = document.getElementById('vid-cancelar');
    var aDesc = document.getElementById('vid-descargar');
    var txtDesc = document.getElementById('vid-descargar-texto');
    var resWrap = document.getElementById('vid-resultado');
    var repro = document.getElementById('vid-repro');

    var soportado = !!(window.MediaRecorder &&
        HTMLCanvasElement.prototype.captureStream &&
        MediaRecorder.isTypeSupported);

    /* ctx.filter no existe en Safari < 17.4; sin él, «fondo desenfocado»
       degrada al color de fondo normal */
    var soportaFilter = (function () {
        try {
            var c = document.createElement('canvas').getContext('2d');
            if (!('filter' in c)) return false;
            c.filter = 'blur(2px)';
            return c.filter === 'blur(2px)';
        } catch (e) { return false; }
    })();

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

    function fmt(x) {
        return String(Math.round(x * 10) / 10);
    }

    if (!soportado) {
        aviso('Tu navegador no permite grabar vídeo (MediaRecorder). ' +
            'Prueba con Chrome, Edge, Firefox o Safari actualizados.', 'danger');
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
        input.value = '';
        if (!lista.length) return;
        var cola = Promise.resolve();
        lista.forEach(function (f) {
            cola = cola.then(function () { return cargarImagen(f); });
        });
    });

    function cargarImagen(f) {
        return new Promise(function (resolver) {
            if (!/^image\//.test(f.type)) {
                aviso('«' + f.name + '» no es una imagen', 'warning');
                return resolver();
            }
            if (grabando) {
                aviso('Espera a que termine la grabación', 'info');
                return resolver();
            }
            if (imagenes.length >= MAX_IMAGENES) {
                aviso('Máximo ' + MAX_IMAGENES + ' imágenes por vídeo', 'warning');
                return resolver();
            }
            var url = URL.createObjectURL(f);
            var img = new Image();
            img.onload = function () {
                imagenes.push({ url: url, img: img, nombre: f.name });
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

    /* ---------- tira de imágenes ---------- */
    function pintarTira() {
        tira.textContent = '';
        imagenes.forEach(function (f, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'vid-foto';
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
            b.title = f.nombre;
            var img = document.createElement('img');
            img.src = f.url;
            img.alt = 'Imagen ' + (i + 1);
            img.className = 'vid-foto-img';
            var n = document.createElement('span');
            n.className = 'vid-foto-num';
            n.textContent = String(i + 1);
            b.appendChild(img);
            b.appendChild(n);
            b.addEventListener('click', function () { seleccionar(i); });
            tira.appendChild(b);
        });

        var hay = imagenes.length > 0;
        tiraWrap.hidden = !hay;
        conteo.textContent = imagenes.length + (imagenes.length === 1 ? ' imagen' : ' imágenes') +
            ' · toca una para reordenarla o quitarla' +
            (imagenes.length >= MAX_IMAGENES ? ' (máximo alcanzado)' : '');
        if (!hay) sel = -1;
        else if (sel < 0 || sel >= imagenes.length) sel = 0; // barra ↑↓ visible de entrada
        actualizarBarra();
        actualizaCrear();
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
        barraAcc.classList.toggle('is-on', sel !== -1 && !grabando);
        btnSubir.disabled = sel <= 0;
        btnBajar.disabled = sel < 0 || sel >= imagenes.length - 1;
        btnDuplicar.disabled = sel < 0 || imagenes.length >= MAX_IMAGENES;
        btnQuitar.disabled = sel < 0;
    }

    function mover(desde, hasta) {
        if (desde < 0 || hasta < 0 || desde >= imagenes.length || hasta >= imagenes.length) return;
        var f = imagenes.splice(desde, 1)[0];
        imagenes.splice(hasta, 0, f);
        sel = hasta;
        pintarTira();
    }

    btnSubir.addEventListener('click', function () { mover(sel, sel - 1); });
    btnBajar.addEventListener('click', function () { mover(sel, sel + 1); });

    btnDuplicar.addEventListener('click', function () {
        if (sel < 0 || imagenes.length >= MAX_IMAGENES) return;
        var f = imagenes[sel];
        usosUrl[f.url] = (usosUrl[f.url] || 1) + 1;
        imagenes.splice(sel + 1, 0, f);
        sel = sel + 1;
        pintarTira();
    });

    btnQuitar.addEventListener('click', function () {
        if (sel < 0) return;
        var f = imagenes.splice(sel, 1)[0];
        soltarUrl(f.url);
        if (sel >= imagenes.length) sel = imagenes.length - 1;
        pintarTira();
    });

    /* ---------- tamaño de salida (con tope de píxeles) ---------- */
    function dimsSalida() {
        var w, h;
        if (selTam.value === 'orig') {
            var img = imagenes[0] && imagenes[0].img;
            w = img ? img.naturalWidth : 1280;
            h = img ? img.naturalHeight : 720;
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

    /* F1 · duración: el input puede ser «segundos por imagen» o «total del
       vídeo»; en modo total las imágenes se reparten solas. */
    function calculoDuracion() {
        var v = parseFloat(inpDur.value);
        if (!(v > 0)) v = 2;
        if (selModoDur.value === 'total') {
            return { total: v, porImagen: imagenes.length ? v / imagenes.length : v };
        }
        var porImagen = Math.max(0.5, Math.min(30, v));
        return { total: porImagen * imagenes.length, porImagen: porImagen };
    }

    /* ---------- dibujo (cover/contain sobre fondo) ---------- */
    function pintarFondo() {
        ctx.fillStyle = inpFondo.value;
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    }

    /* estilo «stories»: la propia imagen en cover, desenfocada, como fondo */
    function pintarDesenfado(img, alpha) {
        if (!soportaFilter) return;
        var w = lienzo.width;
        var h = lienzo.height;
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;
        // 15% más grande que cover: el halo del desenfoque cae fuera del lienzo
        var esc = Math.max(w / iw, h / ih) * 1.15;
        var dw = iw * esc;
        var dh = ih * esc;
        ctx.save();
        ctx.filter = 'blur(' + Math.max(16, Math.round(Math.min(w, h) / 20)) + 'px)';
        if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.restore();
    }

    function dibujarCentrado(img, zoom, alpha, dx) {
        var w = lienzo.width;
        var h = lienzo.height;
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;
        var ajuste = selAjuste.value;
        var base = (ajuste === 'contain' || ajuste === 'blur')
            ? Math.min(w / iw, h / ih)
            : Math.max(w / iw, h / ih);
        var dw = iw * base * (zoom || 1);
        var dh = ih * base * (zoom || 1);
        if (alpha != null && alpha < 1) {
            ctx.save();
            ctx.globalAlpha = alpha;
        }
        ctx.drawImage(img, (w - dw) / 2 + (dx || 0), (h - dh) / 2, dw, dh);
        if (alpha != null && alpha < 1) {
            ctx.restore();
        }
    }

    function dibujar(img, zoom) {
        pintarFondo();
        if (selAjuste.value === 'blur') pintarDesenfado(img);
        dibujarCentrado(img, zoom || 1);
    }

    /* ---------- F2 · transiciones ---------- */
    function durTransicion(durMs) {
        var t = Math.round(durMs * 0.4);   // 40% del tiempo de cada imagen…
        if (t < 150) t = 150;              // …con suelo y techo…
        if (t > 800) t = 800;
        if (t > durMs) t = durMs;          // …sin pasarse del tiempo de la imagen
        return t;
    }

    function zoomKen(local, durMs) {
        if (selTrans.value !== 'kenburns') return 1;
        var p = durMs > 0 ? local / durMs : 0;
        if (p > 1) p = 1;
        return 1 + 0.08 * p;               // el encuadre se abre un 8% durante cada imagen
    }

    /* Fotograma en el instante t (ms): el MISMO dibujo sirve para la vista
       previa y para la grabación (las dos van contra un reloj). */
    function dibujarEn(t, durMs) {
        var n = imagenes.length;
        var modo = selTrans.value;
        var idx = Math.floor(t / durMs);
        if (idx >= n) idx = n - 1;
        if (idx < 0) idx = 0;
        var local = t - idx * durMs;
        var transMs = (idx > 0 && modo !== 'ninguna') ? durTransicion(durMs) : 0;
        if (transMs > 0 && local < transMs) {
            var p = local / transMs;
            var anterior = imagenes[idx - 1].img;
            var actual = imagenes[idx].img;
            pintarFondo();
            if (selAjuste.value === 'blur') {   // el fondo desenfocado también funde
                pintarDesenfado(anterior);
                pintarDesenfado(actual, p);
            }
            if (modo === 'deslizar') {
                dibujarCentrado(anterior, zoomKen(durMs, durMs));
                dibujarCentrado(actual, zoomKen(local, durMs), 1, lienzo.width * (1 - p));
            } else {
                // fundido cruzado (kenburns funde además de encuadrar en zoom)
                dibujarCentrado(anterior, zoomKen(durMs, durMs));
                dibujarCentrado(actual, zoomKen(local, durMs), p);
            }
        } else {
            dibujar(imagenes[idx].img, zoomKen(local, durMs));
        }
    }

    /* ---------- duración total + estado del botón ---------- */
    function actualizaCrear() {
        var d = calculoDuracion();
        var n = imagenes.length;
        var totalCorto = n > 0 && d.porImagen < MIN_POR_IMAGEN;
        var excede = n > 0 && (d.total > MAX_TOTAL_SEG || totalCorto);
        if (!n) {
            vidTotal.textContent = '';
        } else if (selModoDur.value === 'total') {
            vidTotal.textContent = n + (n === 1 ? ' imagen repartida en ' : ' imágenes repartidas en ') +
                fmt(d.total) + ' s (' + fmt(d.porImagen) + ' s cada una) · se graba en tiempo real' +
                (d.total > MAX_TOTAL_SEG ? ' (máximo 2 minutos: reduce el total)' :
                    totalCorto ? ' (con ' + n + ' imágenes hacen falta al menos ' +
                        fmt(n * MIN_POR_IMAGEN) + ' s)' : '');
        } else {
            vidTotal.textContent = n + (n === 1 ? ' imagen × ' : ' imágenes × ') +
                fmt(d.porImagen) + ' s = ' + fmt(d.total) + ' s de vídeo · se graba en tiempo real' +
                (d.total > MAX_TOTAL_SEG ? ' (máximo 2 minutos: reduce la duración o las imágenes)' : '');
        }
        btnCrear.disabled = !n || grabando || excede;
    }

    /* ---------- vista previa ciclando ---------- */
    function detenerPreview() {
        if (preview) {
            cancelAnimationFrame(preview);
            preview = null;
        }
    }

    function reiniciarPreview() {
        detenerPreview();
        if (!imagenes.length) {
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
        var durMs = Math.max(Math.round(MIN_POR_IMAGEN * 1000),
            Math.round(calculoDuracion().porImagen * 1000));
        var total = durMs * imagenes.length;
        dibujarEn(0, durMs);
        var animar = selTrans.value === 'kenburns' ||
            (selTrans.value !== 'ninguna' && imagenes.length > 1);
        if (!animar && imagenes.length < 2) return;
        var t0 = performance.now();
        var ultimo = -1;
        function paso() {
            var t = (performance.now() - t0) % total;
            var idx = Math.floor(t / durMs);
            if (animar || idx !== ultimo) {   // sin transiciones solo se redibuja al cambiar de imagen
                dibujarEn(t, durMs);
                ultimo = idx;
            }
            preview = requestAnimationFrame(paso);
        }
        preview = requestAnimationFrame(paso);
    }

    [selTam, inpDur, selAjuste, selTrans, inpFondo].forEach(function (el) {
        el.addEventListener('change', function () {
            if (el === selAjuste && selAjuste.value === 'blur' && !soportaFilter) {
                aviso('Tu navegador no hace desenfoque: se usará el color de fondo', 'info');
            }
            actualizaCrear();
            if (!grabando) reiniciarPreview();
        });
    });

    /* al cambiar de modo se convierte el valor (2 s×5 → 10 s totales y al revés)
       y los límites del input pasan a ser los del nuevo modo */
    var modoAnterior = selModoDur.value;
    selModoDur.addEventListener('change', function () {
        var esTotal = selModoDur.value === 'total';
        if (esTotal) {
            inpDur.min = '1';
            inpDur.max = String(MAX_TOTAL_SEG);
        } else {
            inpDur.min = '0.5';
            inpDur.max = '30';
        }
        if (imagenes.length) {
            var v = parseFloat(inpDur.value) || 2;
            var porImagen = (modoAnterior === 'cada') ? v : v / imagenes.length;
            var total = (modoAnterior === 'total') ? v : v * imagenes.length;
            var val = esTotal ? total : porImagen;
            var lo = parseFloat(inpDur.min);
            var hi = parseFloat(inpDur.max);
            inpDur.value = String(Math.round(Math.max(lo, Math.min(hi, val)) * 10) / 10);
        }
        modoAnterior = selModoDur.value;
        actualizaCrear();
        if (!grabando) reiniciarPreview();
    });

    /* ---------- grabación ---------- */
    function elegirMime() {
        if (!soportado) return null;
        var candidatos = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        for (var i = 0; i < candidatos.length; i++) {
            if (MediaRecorder.isTypeSupported(candidatos[i])) return candidatos[i];
        }
        return null;
    }

    btnCrear.addEventListener('click', function () {
        if (!imagenes.length || grabando) return;
        if (!soportado) {
            aviso('Tu navegador no permite crear vídeos', 'danger');
            return;
        }
        var d = calculoDuracion();
        if (d.total > MAX_TOTAL_SEG) {
            aviso('Máximo 2 minutos: reduce la duración o el número de imágenes', 'warning');
            return;
        }
        if (d.porImagen < MIN_POR_IMAGEN) {
            aviso('Con ' + imagenes.length + ' imágenes hacen falta al menos ' +
                fmt(imagenes.length * MIN_POR_IMAGEN) + ' s en total', 'warning');
            return;
        }
        crearVideo();
    });

    btnCancelar.addEventListener('click', function () {
        if (!grabando) return;
        cancelado = true;
        grabando = false;
        if (rafAct) cancelAnimationFrame(rafAct);
        rafAct = null;
        if (recAct && recAct.state !== 'inactive') recAct.stop();
        else limpiar();
    });

    function limpiar() {
        progWrap.hidden = true;
        btnCancelar.hidden = true;
        grabando = false;
        recAct = null;
        rafAct = null;
        actualizaCrear();
        actualizarBarra();
        reiniciarPreview();
    }

    function fallo(msg) {
        console.warn('video: ' + msg);
        aviso(msg, 'danger');
        limpiar();
    }

    function crearVideo() {
        var mime = elegirMime();
        if (!mime) {
            aviso('No hay códec de vídeo disponible en este navegador', 'danger');
            return;
        }

        grabando = true;
        cancelado = false;
        btnCrear.disabled = true;
        btnCancelar.hidden = false;
        resWrap.hidden = true;
        actualizarBarra();
        detenerPreview();

        var d = dimsSalida();
        if (d.reducido) {
            aviso('Salida reducida a ' + d.w + '×' + d.h + ' px para que el vídeo no sea gigante', 'info');
        }
        lienzo.width = d.w;
        lienzo.height = d.h;

        var durMs = Math.max(Math.round(MIN_POR_IMAGEN * 1000),
            Math.round(calculoDuracion().porImagen * 1000));
        var total = durMs * imagenes.length;
        dibujarEn(0, durMs);

        var stream = lienzo.captureStream(FPS);
        var chunks = [];
        var rec;
        try {
            rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
        } catch (e) {
            return fallo('No se pudo iniciar la grabación en este navegador');
        }
        recAct = rec;
        rec.ondataavailable = function (e) {
            if (e.data && e.data.size) chunks.push(e.data);
        };
        rec.onstop = function () {
            if (cancelado) {
                aviso('Grabación cancelada', 'info');
                return limpiar();
            }
            var tipo = mime.split(';')[0];
            var blob = new Blob(chunks, { type: tipo });
            if (!blob.size) return fallo('La grabación salió vacía');
            if (urlVideo) URL.revokeObjectURL(urlVideo);
            urlVideo = URL.createObjectURL(blob);
            var ext = (tipo === 'video/mp4') ? 'mp4' : 'webm';
            aDesc.href = urlVideo;
            aDesc.download = 'tet.' + ext;
            txtDesc.textContent = 'Descargar vídeo ' + ext.toUpperCase() +
                ' (' + Math.round(blob.size / 1024) + ' KB)';
            repro.src = urlVideo;
            repro.hidden = false;
            resWrap.hidden = false;
            aviso('Vídeo listo: ' + fmt(total / 1000) + ' s · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
            resWrap.scrollIntoView({ block: 'nearest' });
        };

        progWrap.hidden = false;
        barra.style.width = '0%';
        barra.textContent = '0%';
        estado.textContent = 'Grabando…';

        var t0 = performance.now();
        rec.start(200);

        function tick() {
            if (!grabando) return;
            var t = performance.now() - t0;
            if (t >= total) {
                dibujarEn(total - 1, durMs);
                grabando = false;
                if (recAct && recAct.state !== 'inactive') recAct.stop();
                return;
            }
            dibujarEn(t, durMs);
            var pct = Math.round(t / total * 100);
            barra.style.width = pct + '%';
            barra.textContent = pct + '%';
            estado.textContent = 'Grabando… ' + fmt(t / 1000) + ' / ' + fmt(total / 1000) + ' s';
            rafAct = requestAnimationFrame(tick);
        }
        rafAct = requestAnimationFrame(tick);
    }
})();
