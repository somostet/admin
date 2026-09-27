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
    var videoCargado = false;  // E3: hay un vídeo fuente cargado (modo recorte)
    var urlFuente = null;      // objectURL del vídeo fuente
    var durVideo = 0;          // duración del fuente (s)
    var marcoSucio = true;     // hay que redibujar el fotograma del vídeo en pausa
    var audioCtx = null;       // Web Audio: sonido del recorte hacia el grabador
    var audioDest = null;
    var fuenteAudio = null;

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
    var btnImagenLabel = document.getElementById('vid-etiqueta-img');
    var inpVideo = document.getElementById('vid-archivo-video');
    var lblVideo = document.getElementById('vid-etiqueta-video');
    var recWrap = document.getElementById('vid-recorte');
    var recNombre = document.getElementById('vid-rec-nombre');
    var recDur = document.getElementById('vid-rec-duracion');
    var recQuitar = document.getElementById('vid-rec-quitar');
    var recIn = document.getElementById('vid-rec-in');
    var recFin = document.getElementById('vid-rec-fin');
    var recMarcarIn = document.getElementById('vid-rec-marcar-in');
    var recMarcarFin = document.getElementById('vid-rec-marcar-fin');
    var vidFuente = document.getElementById('vid-fuente');
    var vidMini = document.getElementById('vid-mini');        // vídeo oculto para las miniaturas
    var riel = document.getElementById('vid-riel');
    var rielFotos = document.getElementById('vid-riel-fotos');
    var rielSombraIn = document.getElementById('riel-sombra-in');
    var rielSombraOut = document.getElementById('riel-sombra-out');
    var rielTirIn = document.getElementById('riel-tirador-in');
    var rielTirOut = document.getElementById('riel-tirador-out');
    var rielCabezal = document.getElementById('riel-cabezal');

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
            if (videoCargado) {
                aviso('Quita el vídeo para agregar imágenes', 'info');
                return resolver();
            }
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

    /* ---------- E3 · carga del vídeo fuente (modo recorte) ---------- */
    inpVideo.addEventListener('change', function () {
        var f = (inpVideo.files || [])[0];
        inpVideo.value = '';
        if (!f) return;
        if (grabando) {
            aviso('Espera a que termine la grabación', 'info');
            return;
        }
        if (imagenes.length) {
            aviso('Quita las imágenes para recortar un vídeo', 'info');
            return;
        }
        var esVideo = /^video\//.test(f.type) || /\.(mp4|webm|m4v|mov|ogv)$/i.test(f.name);
        if (!esVideo) {
            aviso('«' + f.name + '» no es un vídeo', 'warning');
            return;
        }
        cargarVideo(f);
    });

    function cargarVideo(f) {
        quitarVideo(true);   // sustituye una carga anterior sin avisos
        urlFuente = URL.createObjectURL(f);
        recNombre.textContent = f.name;
        var mia = urlFuente;
        vidFuente.src = urlFuente;
        var listo = function (d) {
            durVideo = d;
            recIn.value = '0';
            recFin.value = String(fmt(durVideo));
            recIn.max = String(fmt(Math.max(0, durVideo - 0.2)));
            recFin.max = String(fmt(durVideo));
            videoCargado = true;
            recDur.textContent = fmt(durVideo) + ' s';
            recWrap.hidden = false;
            pintarModo();
            actualizaCrear();
            reiniciarPreview();
            pintarRiel();
            generarMiniaturas();
        };
        vidFuente.addEventListener('loadedmetadata', function oy() {
            vidFuente.removeEventListener('loadedmetadata', oy);
            if (!isFinite(vidFuente.duration)) {
                // webm grabado sin duración en la cabecera (típico de
                // MediaRecorder): busca al final para que el navegador la
                // calcule y vuelve al principio
                var cerrado = false;
                var desenganchar = function () {
                    vidFuente.removeEventListener('timeupdate', fin);
                    vidFuente.removeEventListener('seeked', fin);
                    vidFuente.removeEventListener('durationchange', fin);
                };
                var fin = function () {
                    if (cerrado) return;
                    var d = vidFuente.duration;
                    if (!isFinite(d) || d <= 0) return;   // aún no la calculó
                    cerrado = true;
                    desenganchar();
                    vidFuente.currentTime = 0;
                    listo(d);
                };
                var reloj = setTimeout(function () {
                    if (cerrado) return;
                    if (vidFuente.getAttribute('src') !== mia) return;
                    cerrado = true;
                    desenganchar();
                    aviso('No se pudo leer la duración de «' + f.name + '»', 'danger');
                    quitarVideo();
                }, 4000);
                ['timeupdate', 'seeked', 'durationchange'].forEach(function (ev) {
                    vidFuente.addEventListener(ev, fin);
                });
                vidFuente.currentTime = 1e101;
                return;
            }
            if (vidFuente.duration <= 0) {
                aviso('No se pudo leer la duración de «' + f.name + '»', 'danger');
                return quitarVideo();
            }
            listo(vidFuente.duration);
        });
    }

    function quitarVideo(silencio) {
        if (grabando) return;
        vidFuente.pause();
        vidFuente.removeAttribute('src');
        vidFuente.load();
        vidMini.removeAttribute('src');
        rielFotos.textContent = '';
        if (urlFuente) {
            URL.revokeObjectURL(urlFuente);
            urlFuente = null;
        }
        var estaba = videoCargado;
        videoCargado = false;
        durVideo = 0;
        recWrap.hidden = true;
        pintarModo();
        if (estaba && !silencio) aviso('Vídeo quitado', 'info');
        actualizaCrear();
        reiniciarPreview();
    }

    recQuitar.addEventListener('click', function () { quitarVideo(); });

    /* controles que no aplican en modo recorte (y etiquetas cruzadas) */
    function pintarModo() {
        var v = videoCargado;
        inpDur.disabled = v;
        selModoDur.disabled = v;
        selTrans.disabled = v;
        lblVideo.classList.toggle('disabled', v);
        btnImagenLabel.classList.toggle('disabled', v);
        if (selTam.options.length) {
            selTam.options[0].textContent = v ?
                'Tamaño original del vídeo' : 'Tamaño de la primera imagen';
        }
    }

    /* ---------- E3 · riel de recorte (estilo editor) ---------- */
    var rielArrastre = null;   // qué se arrastra: 'in' | 'out' | 'cabezal' | 'riel'

    function pintarCabezal() {
        if (!videoCargado || !(durVideo > 0)) return;
        var p = Math.max(0, Math.min(100, vidFuente.currentTime / durVideo * 100));
        rielCabezal.style.left = p + '%';
    }

    function pintarRiel() {
        if (!videoCargado || !(durVideo > 0)) return;
        var rr = rangoRecorte();
        var pIn = Math.max(0, Math.min(100, rr.inicio / durVideo * 100));
        var pFin = Math.max(0, Math.min(100, rr.fin / durVideo * 100));
        rielTirIn.style.left = pIn + '%';
        rielTirOut.style.left = pFin + '%';
        rielSombraIn.style.width = pIn + '%';
        rielSombraOut.style.width = (100 - pFin) + '%';
        rielTirIn.setAttribute('aria-valuemax', fmt(durVideo));
        rielTirIn.setAttribute('aria-valuenow', fmt(rr.inicio));
        rielTirOut.setAttribute('aria-valuemax', fmt(durVideo));
        rielTirOut.setAttribute('aria-valuenow', fmt(rr.fin));
        pintarCabezal();
    }

    /* miniaturas del filmstrip: se recorren con un <video> oculto para no
       mover el cabezal del reproductor visible */
    function generarMiniaturas() {
        var mia = urlFuente;
        var total = Math.max(6, Math.min(24, Math.round((riel.offsetWidth || 600) / 72)));
        var i = 0;
        rielFotos.textContent = '';
        vidMini.removeAttribute('src');
        vidMini.src = mia;

        var avanzar = function () {
            if (mia !== urlFuente || !videoCargado) return;   // se quitó o cambió
            if (i >= total) {
                vidMini.removeAttribute('src');
                return;
            }
            var t = durVideo * (i + 0.5) / total;
            var hecho = false;
            var avance = function () {
                if (hecho) return;
                hecho = true;
                vidMini.removeEventListener('seeked', avance);
                if (mia !== urlFuente || !videoCargado) return;
                try {
                    var mini = document.createElement('canvas');
                    mini.width = 96;
                    mini.height = 54;
                    mini.getContext('2d').drawImage(vidMini, 0, 0, 96, 54);
                    var img = new Image();
                    img.alt = '';
                    img.src = mini.toDataURL('image/jpeg', 0.65);
                    rielFotos.appendChild(img);
                } catch (e2) { }   // fotograma no disponible: seguimos sin esta
                i++;
                setTimeout(avanzar, 0);
            };
            vidMini.addEventListener('seeked', avance);
            setTimeout(avance, 2500);   // si el navegador no busca, no bloqueamos
            vidMini.currentTime = t;
        };

        vidMini.addEventListener('loadedmetadata', function oy() {
            vidMini.removeEventListener('loadedmetadata', oy);
            if (mia !== urlFuente) return;
            if (!isFinite(vidMini.duration)) {
                // webm sin duración en la cabecera: mismo truco que en la fuente
                var oyd = function () {
                    if (!isFinite(vidMini.duration)) return;
                    vidMini.removeEventListener('timeupdate', oyd);
                    avanzar();
                };
                vidMini.addEventListener('timeupdate', oyd);
                vidMini.currentTime = 1e101;
                return;
            }
            avanzar();
        });
    }

    function rielPct(e) {
        var r = riel.getBoundingClientRect();
        if (!r.width) return 0;
        return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }

    function rielEmpezar(e) {
        if (grabando || !videoCargado) return;
        var diana = (e.target && e.target.closest) ? e.target.closest('[data-riel]') : null;
        rielArrastre = diana ? diana.getAttribute('data-riel') : 'riel';
        if (diana && diana.setPointerCapture) {
            try { diana.setPointerCapture(e.pointerId); } catch (e2) { }   // punteros sintéticos
        }
        rielMover(e);
        e.preventDefault();
    }

    function rielMover(e) {
        if (!rielArrastre || !videoCargado || !(durVideo > 0)) return;
        var t = rielPct(e) * durVideo;
        if (rielArrastre === 'in') {
            var rr = rangoRecorte();
            t = Math.max(0, Math.min(rr.fin - 0.2, t));
            recIn.value = String(Math.round(t * 10) / 10);
            actualizaCrear();   // repinta tiradores, sombras y resumen
        } else if (rielArrastre === 'out') {
            var rr2 = rangoRecorte();
            t = Math.max(rr2.inicio + 0.2, Math.min(durVideo, t));
            recFin.value = String(Math.round(t * 10) / 10);
            actualizaCrear();
        } else {
            // cabezal (o clic sobre el riel): mueve la reproducción
            t = Math.max(0, Math.min(durVideo, t));
            if (Math.abs(vidFuente.currentTime - t) > 0.03) vidFuente.currentTime = t;
            pintarCabezal();
        }
    }

    riel.addEventListener('pointerdown', rielEmpezar);
    window.addEventListener('pointermove', function (e) {
        if (rielArrastre) rielMover(e);
    });
    window.addEventListener('pointerup', function () { rielArrastre = null; });
    window.addEventListener('pointercancel', function () { rielArrastre = null; });

    /* tiradores accesibles también con las flechas del teclado */
    [[rielTirIn, recIn], [rielTirOut, recFin]].forEach(function (par) {
        var esInicio = par[0] === rielTirIn;
        par[0].addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            var paso = (e.shiftKey ? 1 : 0.1) * (e.key === 'ArrowRight' ? 1 : -1);
            var rr = rangoRecorte();
            var base = esInicio ? rr.inicio : rr.fin;
            var t = base + paso;
            if (esInicio) {
                t = Math.max(0, Math.min(rr.fin - 0.2, t));
            } else {
                t = Math.max(rr.inicio + 0.2, Math.min(durVideo, t));
            }
            par[1].value = String(Math.round(t * 10) / 10);
            actualizaCrear();
        });
    });

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
            if (videoCargado && vidFuente.videoWidth) {
                w = vidFuente.videoWidth;
                h = vidFuente.videoHeight;
            } else {
                var img = imagenes[0] && imagenes[0].img;
                w = img ? img.naturalWidth : 1280;
                h = img ? img.naturalHeight : 720;
            }
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
        var iw = img.naturalWidth || img.videoWidth;   // el <video> trae videoWidth
        var ih = img.naturalHeight || img.videoHeight;
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
        var iw = img.naturalWidth || img.videoWidth;
        var ih = img.naturalHeight || img.videoHeight;
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

    /* fotograma del vídeo fuente compuesto en el lienzo (E3): mismo fondo,
       ajuste y tamaño que la salida */
    function dibujarFrame(v) {
        if (!v || v.readyState < 2) return;
        pintarFondo();
        if (selAjuste.value === 'blur') pintarDesenfado(v);
        dibujarCentrado(v, 1);
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
    /* E3 · lectura saneada de los inputs de recorte */
    function rangoRecorte() {
        var ini = parseFloat(recIn.value);
        var fin = parseFloat(recFin.value);
        if (!isFinite(ini)) ini = 0;
        if (!isFinite(fin)) fin = durVideo;
        if (ini < 0) ini = 0;
        if (ini > durVideo) ini = durVideo;
        if (fin > durVideo) fin = durVideo;
        if (fin < 0) fin = 0;
        var seg = Math.round((fin - ini) * 100) / 100;
        if (seg < 0.2) {
            return { inicio: ini, fin: fin, ok: false,
                msg: 'El recorte necesita fin - inicio de al menos 0,2 s' };
        }
        if (seg > MAX_TOTAL_SEG) {
            return { inicio: ini, fin: fin, ok: false,
                msg: 'Máximo 2 minutos por grabación en tiempo real' };
        }
        return { inicio: ini, fin: fin, ok: true, msg: '' };
    }

    function actualizaCrear() {
        if (videoCargado) {
            var rr = rangoRecorte();
            vidTotal.textContent = rr.ok
                ? 'Recorte de ' + fmt(rr.fin - rr.inicio) + ' s de ' + fmt(durVideo) +
                  ' s · se graba en tiempo real'
                : rr.msg;
            btnCrear.disabled = grabando || !rr.ok;
            pintarRiel();
            return;
        }
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
        if (videoCargado) {
            lienzo.style.display = 'block';
            vacio.hidden = true;
            var dv = dimsSalida();
            if (lienzo.width !== dv.w || lienzo.height !== dv.h) {
                lienzo.width = dv.w;
                lienzo.height = dv.h;
            }
            marcoSucio = true;
            dibujarFrame(vidFuente);
            arrancarPreviewVideo();
            return;
        }
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

    /* E3 · la vista previa refleja el vídeo fuente: fotograma actual cuando
       está en pausa, en bucle mientras se reproduce */
    function arrancarPreviewVideo() {
        if (preview || grabando || !videoCargado) return;
        function paso() {
            preview = null;
            if (!videoCargado || grabando) return;
            if (vidFuente.readyState >= 2 && (!vidFuente.paused || marcoSucio)) {
                dibujarFrame(vidFuente);
                marcoSucio = false;
                pintarCabezal();   // cabezal suavemente mientras se reproduce
            }
            preview = requestAnimationFrame(paso);
        }
        preview = requestAnimationFrame(paso);
    }

    ['timeupdate', 'seeked', 'loadeddata'].forEach(function (ev) {
        vidFuente.addEventListener(ev, function () {
            marcoSucio = true;
            pintarCabezal();
            if (videoCargado && !grabando) arrancarPreviewVideo();
        });
    });

    /* inputs de recorte: el «input» actualiza el resumen en vivo y el
       «change» escribe los valores saneados de vuelta */
    [recIn, recFin].forEach(function (el) {
        el.addEventListener('input', function () { actualizaCrear(); });
        el.addEventListener('change', function () {
            var rr = rangoRecorte();
            recIn.value = String(rr.inicio);
            recFin.value = String(rr.fin);
            actualizaCrear();
        });
    });
    recMarcarIn.addEventListener('click', function () {
        recIn.value = String(Math.round(vidFuente.currentTime * 10) / 10);
        actualizaCrear();
    });
    recMarcarFin.addEventListener('click', function () {
        recFin.value = String(Math.round(vidFuente.currentTime * 10) / 10);
        actualizaCrear();
    });

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
    /* conAudio: lista con códecs de sonido delante (el sonido del recorte
       viaja en la pista añadida desde Web Audio). avc3 va primero porque
       Chrome avisa de «the codec description is not supposed to change…»
       al grabar avc1 con audio y él mismo recomienda avc3 (SPS/PPS en banda) */
    function elegirMime(conAudio) {
        if (!soportado) return null;
        var video = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        var candidatos = conAudio ? [
            'video/mp4;codecs=avc3.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc3,mp4a.40.2',
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus'
        ].concat(video) : video;
        for (var i = 0; i < candidatos.length; i++) {
            if (MediaRecorder.isTypeSupported(candidatos[i])) return candidatos[i];
        }
        return null;
    }

    btnCrear.addEventListener('click', function () {
        if (grabando) return;
        if (!soportado) {
            aviso('Tu navegador no permite crear vídeos', 'danger');
            return;
        }
        if (videoCargado) {
            var r = rangoRecorte();
            if (!r.ok) {
                aviso(r.msg, 'warning');
                return;
            }
            return crearVideoRecorte(r);
        }
        if (!imagenes.length) return;
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
        if (videoCargado) {
            vidFuente.pause();
            vidFuente.controls = true;
            marcoSucio = true;
        }
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

    /* ---------- E3 · recorte: regrabar el rango elegido ---------- */
    /* El sonido del propio vídeo pasa por Web Audio para que el grabador lo
       lleve al resultado. createMediaElementSource solo puede hacerse UNA vez
       por elemento: se crea en el primer clic de grabar (con gesto del
       usuario, así el AudioContext arranca despierto). */
    function conectarAudio() {
        try {
            if (!audioCtx) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                audioCtx = new AC();
                audioDest = audioCtx.createMediaStreamDestination();
                fuenteAudio = audioCtx.createMediaElementSource(vidFuente);
                fuenteAudio.connect(audioCtx.destination);  // seguimos oyendo el vídeo
                fuenteAudio.connect(audioDest);            // pista para el grabador
            }
            if (audioCtx.state === 'suspended') {
                var p = audioCtx.resume();
                if (p && p.catch) p.catch(function () {});
            }
            return audioDest;
        } catch (e) {
            audioCtx = null;
            return null;
        }
    }

    vidFuente.addEventListener('play', function () {
        if (audioCtx && audioCtx.state === 'suspended') {
            var p = audioCtx.resume();
            if (p && p.catch) p.catch(function () {});
        }
    });

    function crearVideoRecorte(r) {
        var audio = conectarAudio();
        var mime = elegirMime(!!audio) || elegirMime(false);
        if (!mime) {
            aviso('No hay códec de vídeo disponible en este navegador', 'danger');
            return;
        }

        var inicio = r.inicio;
        var fin = r.fin;
        var total = Math.round((fin - inicio) * 1000);

        grabando = true;
        cancelado = false;
        btnCrear.disabled = true;
        btnCancelar.hidden = false;
        resWrap.hidden = true;
        actualizarBarra();
        detenerPreview();
        vidFuente.pause();
        vidFuente.controls = false;   // sin controles mientras se graba

        var d = dimsSalida();
        if (d.reducido) {
            aviso('Salida reducida a ' + d.w + '×' + d.h + ' px para que el vídeo no sea gigante', 'info');
        }
        lienzo.width = d.w;
        lienzo.height = d.h;

        var stream = lienzo.captureStream(FPS);
        if (audio) {
            audio.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
        }
        var chunks = [];
        var mimeUsado = mime;
        var rec;
        try {
            rec = new MediaRecorder(stream, { mimeType: mimeUsado, videoBitsPerSecond: 8000000 });
        } catch (e1) {
            var mv = elegirMime(false);
            if (!audio || !mv) return fallo('No se pudo iniciar la grabación en este navegador');
            try {
                stream = lienzo.captureStream(FPS);   // stream limpio, sin audio
                rec = new MediaRecorder(stream, { mimeType: mv, videoBitsPerSecond: 8000000 });
                mimeUsado = mv;
            } catch (e2) {
                return fallo('No se pudo iniciar la grabación en este navegador');
            }
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
            var tipo = mimeUsado.split(';')[0];
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
            aviso('Vídeo recortado: ' + fmt(total / 1000) + ' s · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
            resWrap.scrollIntoView({ block: 'nearest' });
        };

        progWrap.hidden = false;
        barra.style.width = '0%';
        barra.textContent = '0%';
        estado.textContent = 'Preparando…';

        var arrancar = function () {
            if (!grabando) return;   // se canceló mientras buscaba la posición
            dibujarFrame(vidFuente);
            recAct.start(200);
            var p = vidFuente.play();
            if (p && p.catch) {
                p.catch(function () {
                    fallo('El navegador no dejó reproducir el vídeo: toca el vídeo una vez y reintenta');
                });
            }
            estado.textContent = 'Grabando…';
            rafAct = requestAnimationFrame(tickRec);
        };

        if (vidFuente.readyState >= 2 && Math.abs(vidFuente.currentTime - inicio) < 0.05) {
            arrancar();
        } else {
            var oy = function () {
                vidFuente.removeEventListener('seeked', oy);
                arrancar();
            };
            vidFuente.addEventListener('seeked', oy);
            vidFuente.currentTime = inicio;
        }

        function tickRec() {
            if (!grabando) return;
            if (vidFuente.ended || vidFuente.currentTime >= fin) {
                dibujarFrame(vidFuente);
                grabando = false;
                vidFuente.pause();
                if (recAct && recAct.state !== 'inactive') recAct.stop();
                return;
            }
            dibujarFrame(vidFuente);
            var t = Math.max(0, vidFuente.currentTime - inicio);
            var pct = Math.max(0, Math.min(100, Math.round(t / (fin - inicio) * 100)));
            barra.style.width = pct + '%';
            barra.textContent = pct + '%';
            estado.textContent = 'Grabando… ' + fmt(t) + ' / ' + fmt(fin - inicio) + ' s';
            rafAct = requestAnimationFrame(tickRec);
        }
    }
})();
