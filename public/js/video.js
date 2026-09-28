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
    var chkNews = document.getElementById('vid-news');                     // F5d
    var inpEscContenido = document.getElementById('vid-contenido-esc');    // F5d
    var btnCentrarContenido = document.getElementById('vid-contenido-centrar'); // F5d
    var manijaContenido = document.getElementById('vid-manija-contenido'); // F5d
    var noticiaActiva = false;   // F5d: plantilla Tet News activa
    var contPos = null;          // F5d: centro del contenido en fracciones (null = automático)
    var contEsc = 1;             // F5d: multiplicador del ajuste automático (1 = auto)
    var cajaContenido = null;    // F5d: última caja dibujada del contenido
    var contArrastrando = false; // F5d: puntero sobre la manija del contenido
    var barraNews = new Image(); // F5d: barra «tet news» (1200×93)
    var barraNewsLista = false;
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
    /* F4 · superposiciones */
    var supLogoArchivo = document.getElementById('vid-logo-archivo');
    var supLogoMini = document.getElementById('vid-logo-mini');
    var supLogoNombre = document.getElementById('vid-logo-nombre');
    var supLogoEstado = document.getElementById('vid-logo-estado');
    var supLogoQuitar = document.getElementById('vid-logo-quitar');
    var supLogoPos = document.getElementById('vid-logo-pos');
    var supLogoTam = document.getElementById('vid-logo-tam');
    var listaTextos = document.getElementById('vid-textos-lista');   // F5e
    var btnAddTexto = document.getElementById('vid-texto-add');      // F5e
    var editTexto = document.getElementById('vid-texto-edit');       // F5e
    var inpTxtContenido = document.getElementById('vid-txt-contenido');
    var selTxtPos = document.getElementById('vid-txt-pos');
    var inpTxtTam = document.getElementById('vid-txt-tam');
    var selTxtAnim = document.getElementById('vid-txt-anim');
    var inpTxtAnimDur = document.getElementById('vid-txt-anim-dur');
    var selTxtSalida = document.getElementById('vid-txt-salida');
    var inpTxtSalidaDur = document.getElementById('vid-txt-salida-dur');
    var inpTxtInicio = document.getElementById('vid-txt-inicio');
    var inpTxtDur = document.getElementById('vid-txt-dur');
    var textos = [];         // F5e: un elemento por cada texto de la salida
    var textoSel = -1;       // F5e: índice del texto en edición
    var cajaTextoSel = null; // F5e: caja dibujada del seleccionado (para la manija)
    var manijaTitulo = document.getElementById('vid-manija-titulo');   // F5b/F5e
    var manijaArrastrando = false;       // F5b: puntero sobre la manija
    var tUltimo = 0;                     // F5b: último instante dibujado en modo imágenes
    /* F5f · riel de la línea de tiempo de salida */
    var rielSalWrap = document.getElementById('vid-riel-salida-wrap');
    var rielSal = document.getElementById('vid-riel-salida');
    var rielSalRegla = document.getElementById('vid-riel-salida-regla');
    var rielSalFilas = document.getElementById('vid-riel-salida-filas');
    var rielSalCabezal = document.getElementById('vid-riel-salida-cabezal');
    var rielSalChip = document.getElementById('vid-riel-salida-chip');
    var rielSalArrastre = null;   // 'cabezal' | { tipo: 'barra'|'ini'|'fin', i, x0, inicio0, dur0 }
    var rielSalScrub = false;     // el cabezal se está arrastrando (pausa la previa)
    var rielSalUltimoMs = 0;      // último instante mostrado (para recolocar el cabezal)
    var previewFase = 0;          // ms desde los que sigue el bucle tras un scrub
    var scrubVideoPausa = null;   // estado de reproducción del vídeo antes del scrub
    var logoImg = null;    // Image del logo cargado (null = sin logo)
    var logoUrl = null;    // blob URL del logo para poder revocarlo

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
            // Chrome no decodifica el primer fotograma hasta el primer «buscar»:
            // sin este empujón la vista previa se queda en el color de fondo
            if (!vidFuente.currentTime) vidFuente.currentTime = 0;
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

    /* ---------- F5f · riel de la línea de tiempo de salida ---------- */
    /* Mapea el tiempo de salida (0..total): en vídeo es el recorte, en
       imágenes la duración total. Una barra por texto + cabezal con scrub. */
    function totalSalida() {
        if (videoCargado) {
            var rr = rangoRecorte();
            return Math.max(0.2, rr.fin - rr.inicio);
        }
        return Math.max(0.5, calculoDuracion().total);
    }

    function poneCabezalSalida(ms) {
        if (!rielSalCabezal) return;   // refs aún no asignadas (eval inicial)
        var total = totalSalida();
        if (!(total > 0)) return;
        if (!(ms >= 0) || !isFinite(ms)) ms = 0;
        rielSalUltimoMs = ms;
        var p = Math.max(0, Math.min(100, ms / 1000 / total * 100));
        var izq = p + '%';
        if (rielSalCabezal.style.left !== izq) rielSalCabezal.style.left = izq;
        var chipP = Math.max(6, Math.min(94, p)) + '%';   // el chip nunca sale del riel
        if (rielSalChip.style.left !== chipP) rielSalChip.style.left = chipP;
        var txt = fmtSeg(Math.min(ms / 1000, total)) + ' s';
        if (rielSalChip.textContent !== txt) rielSalChip.textContent = txt;
    }

    /* el scrub pausa la vista previa y muestra el instante pedido */
    function iniciaScrub() {
        if (rielSalScrub) return;
        rielSalScrub = true;
        if (videoCargado) {
            scrubVideoPausa = vidFuente.paused;
            try { vidFuente.pause(); } catch (e) { }
        } else {
            detenerPreview();
        }
    }

    function muestraInstante(tMs) {
        var total = totalSalida();
        tMs = Math.max(0, Math.min(Math.max(0, total - 0.01) * 1000, tMs));
        poneCabezalSalida(tMs);
        if (videoCargado) {
            var rr = rangoRecorte();
            var destino = Math.max(rr.inicio, Math.min(rr.fin, rr.inicio + tMs / 1000));
            if (Math.abs((vidFuente.currentTime || 0) - destino) > 0.03) {
                try { vidFuente.currentTime = destino; } catch (e) { }
            }
            marcoSucio = true;
            arrancarPreviewVideo();   // dibuja el fotograma en pausa (marcoSucio)
        } else if (imagenes.length) {
            dibujarEn(tMs, durMsPorImagen());
        }
    }

    function finScrub() {
        rielSalScrub = false;
        if (videoCargado) {
            if (scrubVideoPausa === false) {
                var p = vidFuente.play();
                if (p && p.catch) p.catch(function () { });
            } else {
                marcoSucio = true;
                arrancarPreviewVideo();
            }
            scrubVideoPausa = null;
        } else if (previewNecesitaLoop()) {
            previewFase = rielSalUltimoMs;   // el bucle sigue desde el cabezal
            reiniciarPreview();
        }
        /* sin bucle (imagen única sin animación): se queda el fotograma rascado */
    }

    /* aplica inicio/duración de una barra con los mismos límites que los
       arrastres: dur = 0 significa «hasta el final» */
    function aplicaBarra(i, inicio, dur, total) {
        var t = textos[i];
        if (!t) return;
        inicio = Math.round(inicio * 10) / 10;
        if (dur > 0) {
            dur = Math.round(dur * 10) / 10;
            inicio = Math.max(0, Math.min(Math.max(0, total - dur), inicio));
            dur = Math.max(0.2, Math.min(Math.max(0.2, total - inicio), dur));
            t.inicio = inicio;
            t.dur = dur;
        } else {
            t.dur = 0;
            t.inicio = Math.max(0, Math.min(Math.max(0, total - 0.2), inicio));
        }
    }

    function posicionaBarra(barra, t, total) {
        var ini = Math.max(0, t.inicio || 0);
        var fin = t.dur > 0 ? Math.min(ini + t.dur, total) : total;
        barra.style.left = (total > 0 ? ini / total * 100 : 0) + '%';
        barra.style.width = (total > 0 ? Math.max(0, fin - ini) / total * 100 : 0) + '%';
    }

    /* refresco en caliente durante un arrastre: sin reconstruir el DOM
       (destruiría el nodo que se está arrastrando) */
    function refrescaBarra(i) {
        var t = textos[i];
        if (!t) return;
        var total = totalSalida();
        var barra = rielSalFilas.querySelector('.vid-riel-barra[data-i="' + i + '"]');
        if (barra) {
            posicionaBarra(barra, t, total);
            barra.setAttribute('aria-valuenow', fmt(t.inicio));
        }
        var fila = listaTextos.querySelectorAll('.vid-texto-fila')[i];
        if (fila) {
            var hora = fila.querySelector('.vid-texto-tiempo');
            if (hora) hora.textContent = etiquetaTiempo(t);
        }
        if (i === textoSel) {   // los inputs del editor siguen el arrastre
            inpTxtInicio.value = String(t.inicio);
            inpTxtDur.value = String(t.dur);
        }
    }

    function pintaRielSalida() {
        if (!rielSalFilas) return;
        var total = totalSalida();
        /* regla: marcas cada «paso» bonito sin pasarse de ~8 etiquetas */
        rielSalRegla.textContent = '';
        if (total > 0) {
            var pasos = [0.5, 1, 2, 5, 10, 15, 30, 60];
            var paso = pasos[pasos.length - 1];
            for (var ip = 0; ip < pasos.length; ip++) {
                if (total / pasos[ip] <= 8) { paso = pasos[ip]; break; }
            }
            for (var tt = 0; tt < total - 0.001; tt += paso) {
                var tick = document.createElement('span');
                tick.className = 'vid-riel-salida-tick';
                tick.style.left = (tt / total * 100) + '%';
                tick.textContent = fmtSeg(tt);
                rielSalRegla.appendChild(tick);
            }
        }
        /* una fila por texto, con su barra y sus tiradores */
        rielSalFilas.textContent = '';
        textos.forEach(function (t, i) {
            var fila = document.createElement('div');
            fila.className = 'vid-riel-fila' + (i === textoSel ? ' vid-riel-fila-activa' : '');
            fila.setAttribute('data-riel-salida', 'pista');
            var barra = document.createElement('div');
            barra.className = 'vid-riel-barra';
            barra.setAttribute('data-riel-salida', 'barra');
            barra.setAttribute('data-i', String(i));
            barra.setAttribute('tabindex', '0');
            barra.setAttribute('role', 'slider');
            barra.setAttribute('aria-valuemin', '0');
            barra.setAttribute('aria-valuemax', fmt(total));
            barra.setAttribute('aria-valuenow', fmt(t.inicio));
            barra.setAttribute('aria-label', 'Barra de ' + (t.txt.trim() || 'texto vacío') +
                ': flechas para mover cuándo aparece');
            posicionaBarra(barra, t, total);
            var etiqueta = document.createElement('span');
            etiqueta.className = 'vid-riel-barra-txt';
            etiqueta.textContent = t.txt.trim() || '(sin texto)';
            var tIni = document.createElement('span');
            tIni.className = 'vid-riel-barra-tir vid-riel-barra-tir-ini';
            tIni.setAttribute('data-riel-salida', 'ini');
            tIni.setAttribute('data-i', String(i));
            var tFin = document.createElement('span');
            tFin.className = 'vid-riel-barra-tir vid-riel-barra-tir-fin';
            tFin.setAttribute('data-riel-salida', 'fin');
            tFin.setAttribute('data-i', String(i));
            barra.appendChild(tIni);
            barra.appendChild(etiqueta);
            barra.appendChild(tFin);
            fila.appendChild(barra);
            rielSalFilas.appendChild(fila);
        });
        poneCabezalSalida(rielSalUltimoMs);
    }

    function rielSalPct(e) {
        var r = rielSal.getBoundingClientRect();
        if (!r.width) return 0;
        return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }

    function rielSalEmpezar(e) {
        if (grabando) return;
        var diana = (e.target && e.target.closest) ? e.target.closest('[data-riel-salida]') : null;
        if (!diana) return;
        var tipo = diana.getAttribute('data-riel-salida');
        if (tipo === 'pista' || tipo === 'cabezal') {
            rielSalArrastre = 'cabezal';
            iniciaScrub();
        } else {
            var i = parseInt(diana.getAttribute('data-i'), 10);
            var t = textos[i];
            if (!t) return;
            rielSalArrastre = { tipo: tipo, i: i, x0: e.clientX, inicio0: t.inicio, dur0: t.dur };
            seleccionaTexto(i);   // la lista y el editor siguen a la barra
        }
        try { rielSal.setPointerCapture(e.pointerId); } catch (e2) { /* id sintético */ }
        if (rielSalArrastre === 'cabezal') rielSalMover(e);   // toque = salto al instante
        e.preventDefault();
    }

    function rielSalMover(e) {
        if (!rielSalArrastre) return;
        var total = totalSalida();
        if (!(total > 0)) return;
        if (rielSalArrastre === 'cabezal') {
            muestraInstante(rielSalPct(e) * total * 1000);
            return;
        }
        var a = rielSalArrastre;
        var r = rielSal.getBoundingClientRect();
        var dT = r.width ? ((e.clientX - a.x0) / r.width) * total : 0;
        var t = textos[a.i];
        if (!t) return;
        if (a.tipo === 'barra') {
            /* «dur = 0» mantiene el fin clavado al final: solo se mueve el inicio */
            aplicaBarra(a.i, a.inicio0 + dT, a.dur0, total);
        } else if (a.tipo === 'ini') {
            if (a.dur0 > 0) {
                var fin = a.inicio0 + a.dur0;              // el borde derecho no se mueve
                var ni = Math.max(0, Math.min(fin - 0.2, a.inicio0 + dT));
                aplicaBarra(a.i, ni, fin - ni, total);
            } else {
                aplicaBarra(a.i, a.inicio0 + dT, 0, total);
            }
        } else {   /* 'fin': estira o recorta la duración */
            if (a.dur0 > 0) {
                aplicaBarra(a.i, a.inicio0, a.dur0 + dT, total);
            } else {
                var nf = Math.max(a.inicio0 + 0.2, Math.min(total, total + dT));
                if (nf < total - 0.02) aplicaBarra(a.i, a.inicio0, nf - a.inicio0, total);
            }
        }
        refrescaBarra(a.i);
    }

    function rielSalFin() {
        var a = rielSalArrastre;
        rielSalArrastre = null;
        if (a === 'cabezal') {
            finScrub();
        } else if (a) {
            pintaListaTextos();   // sincroniza etiquetas, barras y resalte
        }
    }

    rielSal.addEventListener('pointerdown', rielSalEmpezar);
    window.addEventListener('pointermove', function (e) {
        if (rielSalArrastre) rielSalMover(e);
    });
    window.addEventListener('pointerup', rielSalFin);
    window.addEventListener('pointercancel', rielSalFin);

    /* teclado: las flechas mueven la barra enfocada (mayús = 1 s) */
    rielSalFilas.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var barra = (e.target && e.target.closest) ? e.target.closest('.vid-riel-barra') : null;
        if (!barra) return;
        var i = parseInt(barra.getAttribute('data-i'), 10);
        var t = textos[i];
        if (!t) return;
        e.preventDefault();
        var paso = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 0.1);
        aplicaBarra(i, t.inicio + paso, t.dur, totalSalida());
        inpTxtInicio.value = String(t.inicio);   // el editor sigue el teclado
        inpTxtDur.value = String(t.dur);
        pintaListaTextos();
        var nb = rielSalFilas.querySelector('.vid-riel-barra[data-i="' + i + '"]');
        if (nb) nb.focus();
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
    /* F5d · zona útil del dibujo: con la plantilla Tet News activa es el
       cuerpo del canvas de noticias (debajo de la barra); sin ella, el lienzo
       entero, igual que siempre. La barra mide lo mismo que en tet1.html:
       la imagen 1200×93 escalada al ancho de la salida. */
    var RUTA_BARRA_NEWS = './public/img/bars/tetnews.png';
    var BARRA_RATIO = 93 / 1200;

    function altoBarraNews() {
        var bh = Math.round(lienzo.width * BARRA_RATIO);
        if (bh >= lienzo.height) bh = Math.round(lienzo.height * 0.1);   // nunca invade todo
        return bh;
    }

    function zonaDibujo() {
        if (!noticiaActiva) return { x: 0, y: 0, w: lienzo.width, h: lienzo.height };
        var barH = altoBarraNews();
        return { x: 0, y: barH, w: lienzo.width, h: Math.max(1, lienzo.height - barH) };
    }

    function pintarFondo() {
        ctx.fillStyle = inpFondo.value;
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        // F5d: plantilla Tet News = barra azul arriba + cuerpo de color
        // (blanco por defecto, igual que el editor de noticias)
        if (noticiaActiva && barraNewsLista && barraNews.naturalWidth) {
            ctx.drawImage(barraNews, 0, 0, lienzo.width, altoBarraNews());
        }
    }

    /* F5d · la barra se sirve como data: URL en doble clic (mismo motivo que
       F5c: evita el lienzo «tainted» que rompería grabación y descargas) */
    function urlRecurso(ruta) {
        return (location.protocol === 'file:' && window.TET_PLANTILLAS &&
            window.TET_PLANTILLAS[ruta]) || ruta;
    }

    function cargarBarraNews() {
        barraNews.onload = function () {
            barraNewsLista = true;
            repintarSuperp();
        };
        barraNews.onerror = function () {
            barraNewsLista = false;
            if (noticiaActiva) aviso('No se pudo cargar la barra de Tet News', 'danger');
        };
        barraNews.src = urlRecurso(RUTA_BARRA_NEWS);
    }

    if (location.protocol === 'file:') {
        // en doble clic no hay servidor: los data: URL evitan el lienzo
        // «tainted», que rompería la grabación y las descargas
        var scPlantillas = document.createElement('script');
        scPlantillas.src = './public/js/plantillas-data.js?v=f5d';
        scPlantillas.async = true;
        scPlantillas.onload = cargarBarraNews;
        scPlantillas.onerror = cargarBarraNews;
        document.head.appendChild(scPlantillas);
    } else {
        cargarBarraNews();
    }

    /* F5d · interruptor de la plantilla: el contenido pasa a vivir dentro del
       cuerpo, contenido y centrado (como en el canvas de imágenes) */
    chkNews.addEventListener('change', function () {
        noticiaActiva = chkNews.checked;
        inpEscContenido.disabled = !noticiaActiva;
        btnCentrarContenido.disabled = !noticiaActiva;
        inpEscContenido.value = String(Math.round(contEsc * 100));
        if (noticiaActiva && selAjuste.value === 'cover') {
            // cover recortaría los bordes del cuerpo: mejor contenerlo
            selAjuste.value = 'contain';
            aviso('Ajuste cambiado a «contener» para que se vea el contenido en la plantilla', 'info');
        }
        repintarSuperp();
        actualizaManijaContenido();
    });

    inpEscContenido.addEventListener('input', function () {
        contEsc = (parseFloat(inpEscContenido.value) || 100) / 100;
        redibujarArrastre();
        actualizaManijaContenido();
    });

    btnCentrarContenido.addEventListener('click', function () {
        contPos = null;                 // vuelve al centrado automático del cuerpo
        contEsc = 1;
        inpEscContenido.value = '100';
        redibujarArrastre();
        actualizaManijaContenido();
    });

    /* estilo «stories»: la propia imagen en cover, desenfocada, como fondo */
    function pintarDesenfado(img, alpha) {
        if (!soportaFilter) return;
        var z = zonaDibujo();   // F5d: con Tet News, solo el cuerpo
        var w = lienzo.width;
        var h = lienzo.height;
        var iw = img.naturalWidth || img.videoWidth;   // el <video> trae videoWidth
        var ih = img.naturalHeight || img.videoHeight;
        // 15% más grande que cover: el halo del desenfoque cae fuera de la zona
        var esc = Math.max(z.w / iw, z.h / ih) * 1.15;
        var dw = iw * esc;
        var dh = ih * esc;
        ctx.save();
        if (noticiaActiva) {   // F5d: el contenido nunca tapa la barra
            ctx.beginPath();
            ctx.rect(z.x, z.y, z.w, z.h);
            ctx.clip();
        }
        ctx.filter = 'blur(' + Math.max(16, Math.round(Math.min(w, h) / 20)) + 'px)';
        if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
        ctx.drawImage(img, z.x + (z.w - dw) / 2, z.y + (z.h - dh) / 2, dw, dh);
        ctx.restore();
    }

    function dibujarCentrado(img, zoom, alpha, dx) {
        var w = lienzo.width;
        var h = lienzo.height;
        var z = zonaDibujo();   // F5d: lienzo completo o cuerpo de Tet News
        var iw = img.naturalWidth || img.videoWidth;
        var ih = img.naturalHeight || img.videoHeight;
        var ajuste = selAjuste.value;
        var base = (ajuste === 'contain' || ajuste === 'blur')
            ? Math.min(z.w / iw, z.h / ih)
            : Math.max(z.w / iw, z.h / ih);
        var esc = noticiaActiva ? contEsc : 1;
        var dw = iw * base * (zoom || 1) * esc;
        var dh = ih * base * (zoom || 1) * esc;
        var cx = z.x + z.w / 2;
        var cy = z.y + z.h / 2;
        if (noticiaActiva && contPos) {
            // posición personalizada guardada en fracciones del lienzo
            cx = contPos.x * w;
            cy = contPos.y * h;
        }
        ctx.save();
        if (noticiaActiva) {   // F5d: recortado al cuerpo: la barra queda limpia
            ctx.beginPath();
            ctx.rect(z.x, z.y, z.w, z.h);
            ctx.clip();
        }
        if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
        ctx.drawImage(img, cx - dw / 2 + (dx || 0), cy - dh / 2, dw, dh);
        ctx.restore();
        // F5d: caja de reposo del contenido para situar la manija de arrastre
        cajaContenido = { x: cx, y: cy, w: dw, h: dh };
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
        // F5 · la animación del título cuenta desde el inicio del recorte
        dibujarSuperposiciones(Math.max(0, (v.currentTime || 0) - rangoRecorte().inicio) * 1000);
    }

    /* ---------- F4/F5 · logotipo y línea de título superpuestos ---------- */
    /* Se dibuja al FINAL de cada fotograma compuesto (dibujarFrame en vídeo e
       dibujarEn en imágenes), así acompaña a vista previa y grabación y queda
       por encima de las transiciones. tMs = milisegundos desde el inicio del
       vídeo de salida (F5: alimenta la animación de entrada del título). */
    function dibujarSuperposiciones(tMs) {
        var w = lienzo.width;
        var h = lienzo.height;
        if (!w || !h) return;
        var margen = Math.max(6, Math.round(Math.min(w, h) * 0.03));
        var fuente = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

        // logotipo: alto = % del lienzo, respetando su proporción
        if (logoImg && logoImg.naturalWidth && logoImg.naturalHeight) {
            var pct = parseFloat(supLogoTam.value);
            if (!(pct >= 4 && pct <= 40)) pct = 12;
            var lh = h * pct / 100;
            var lw = lh * (logoImg.naturalWidth / logoImg.naturalHeight);
            if (lw > w * 0.4) {   // logotipos muy apaisados: tope por ancho
                lw = w * 0.4;
                lh = lw * (logoImg.naturalHeight / logoImg.naturalWidth);
            }
            var pl = supLogoPos.value;
            var x = margen;
            var y = margen;
            if (pl === 'arriba-derecha') x = w - margen - lw;
            else if (pl === 'abajo-izquierda') y = h - margen - lh;
            else if (pl === 'abajo-derecha') { x = w - margen - lw; y = h - margen - lh; }
            else if (pl === 'abajo-centro') { x = (w - lw) / 2; y = h - margen - lh; }
            ctx.drawImage(logoImg, x, y, lw, lh);
        }

        // F5e: cada texto de la lista, dentro de su ventana temporal y con su
        // animación de entrada y de salida; blanco en negrita con sombra para
        // que se lea sobre cualquier fondo
        cajaTextoSel = null;
        for (var i = 0; i < textos.length; i++) {
            dibujaTexto(textos[i], tMs, w, h, margen, fuente, i === textoSel);
        }
        actualizaManija();   // F5b/F5e: coloca (o esconde) la manija sobre el texto
        actualizaManijaContenido();   // F5d: idem para el contenido de Tet News
        // F5f: el cabezal de la línea de tiempo sigue el fotograma mostrado
        // (durante la grabación y el scrub ya lo coloca quien corresponde)
        if (!grabando && !rielSalScrub && tMs != null && isFinite(tMs)) {
            poneCabezalSalida(tMs);
        }
    }

    /* F5e · dibuja un texto de la lista en el instante tMs (ms desde el inicio
       del vídeo de salida). Ventana activa: [inicio, inicio+dur) con dur = 0
       significando «hasta el final». p recorre la entrada (0 → 1) y q la
       salida (0 → 1); si no cabe, la fuente se encoge hasta el ancho. */
    function dibujaTexto(t, tMs, w, h, margen, fuente, esSel) {
        var txt = t.txt.trim();
        if (!txt) return;
        var iniMs = (t.inicio || 0) * 1000;
        var finMs = (t.dur > 0) ? iniMs + t.dur * 1000 : Infinity;
        if (!(tMs >= iniMs && tMs < finMs)) return;   // fuera de su ventana

        var p = 1;
        if (t.anim && t.anim !== 'ninguna') {
            var segAnim = t.animDur;
            if (!(segAnim >= 0.2 && segAnim <= 5)) segAnim = 1;
            p = (tMs - iniMs) / (segAnim * 1000);
            p = Math.max(0, Math.min(1, p));
        }
        var q = 0;
        if (t.salida && t.salida !== 'ninguna' && isFinite(finMs)) {
            var segOut = t.salidaDur;
            if (!(segOut >= 0.2 && segOut <= 5)) segOut = 0.5;
            q = (tMs - (finMs - segOut * 1000)) / (segOut * 1000);
            q = Math.max(0, Math.min(1, q));
        }

        var pt = t.tam;
        if (!(pt >= 2 && pt <= 25)) pt = 7;
        var fs = Math.max(12, Math.round(h * pt / 100));
        ctx.save();
        ctx.font = '700 ' + fs + 'px ' + fuente;
        var maxW = w - margen * 2;
        var tw = ctx.measureText(txt).width;
        if (tw > maxW && tw > 0) {
            fs = Math.max(10, Math.round(fs * maxW / tw));
            ctx.font = '700 ' + fs + 'px ' + fuente;
            tw = ctx.measureText(txt).width;   // F5b: ancho real tras encoger
        }
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0, 0, 0, .75)';
        ctx.shadowBlur = Math.max(2, Math.round(fs / 5));
        ctx.shadowOffsetY = Math.max(1, Math.round(fs / 20));
        var tp = t.pos;
        var tx;
        var ty;
        if (tp === 'personalizada') {
            ctx.textAlign = 'center';
            tx = t.x * w;
            ty = t.y * h;
            // F5b: el texto siempre cabe por completo dentro del lienzo
            tx = Math.max(tw / 2, Math.min(w - tw / 2, tx));
            ty = Math.max(fs / 2, Math.min(h - fs / 2, ty));
        } else if (tp === 'abajo-centro') {
            ctx.textAlign = 'center';
            tx = w / 2;
            ty = h - margen - fs / 2;
        } else {
            ctx.textAlign = (tp === 'arriba-izquierda' || tp === 'abajo-izquierda') ? 'left' : 'right';
            tx = (ctx.textAlign === 'left') ? margen : w - margen;
            ty = (tp.indexOf('arriba') === 0) ? margen + fs / 2 : h - margen - fs / 2;
        }
        // F5e: caja de reposo del texto seleccionado para situar la manija
        if (esSel) cajaTextoSel = { x: tx, y: ty, w: tw, h: fs * 1.2 };

        var abajo = ty > h / 2;   // el texto entra y sale por su propio borde
        var viaje = fs * 1.5;
        if (t.anim === 'aparecer') ctx.globalAlpha = p;        // fundido de entrada
        if (t.salida === 'fundido') ctx.globalAlpha *= (1 - q); // fundido de salida
        if (p < 1) {
            if (t.anim === 'deslizar') {
                ty += (abajo ? viaje : -viaje) * (1 - p);       // entra desde su borde
            } else if (t.anim === 'escribir') {
                txt = txt.slice(0, Math.ceil(p * txt.length));  // máquina de escribir
            }
        } else if (q > 0 && t.salida === 'deslizar') {
            ty += (abajo ? viaje : -viaje) * q;                 // sale por su borde
        }
        ctx.fillText(txt, tx, ty);
        ctx.restore();
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
        tUltimo = t;   // F5b: lo guarda para redibujar durante el arrastre
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
        dibujarSuperposiciones(t);
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
        /* F5f: el total de la salida cambia → barras, regla y cabezal se
           recolocan (vale para recorte de vídeo y duración de imágenes) */
        pintaRielSalida();
        poneCabezalSalida(rielSalUltimoMs);
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

    /* duración por imagen que usan vista previa y grabación */
    function durMsPorImagen() {
        return Math.max(Math.round(MIN_POR_IMAGEN * 1000),
            Math.round(calculoDuracion().porImagen * 1000));
    }

    /* F5e/F5f: la previa necesita bucle si los textos animan o tienen ventana */
    function hayTextoAnimado() {
        for (var it = 0; it < textos.length; it++) {
            var tIt = textos[it];
            if (tIt.txt.trim() && (tIt.anim !== 'ninguna' || tIt.salida !== 'ninguna' ||
                tIt.inicio > 0 || tIt.dur > 0)) {
                return true;
            }
        }
        return false;
    }

    function previewNecesitaLoop() {
        if (videoCargado) return true;
        if (!imagenes.length) return false;
        var animar = selTrans.value === 'kenburns' ||
            (selTrans.value !== 'ninguna' && imagenes.length > 1);
        return animar || hayTextoAnimado() || imagenes.length > 1;
    }

    function reiniciarPreview() {
        detenerPreview();
        if (videoCargado) {
            rielSalWrap.hidden = false;   // F5f: hay línea de tiempo de salida
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
            rielSalWrap.hidden = true;    // F5f: sin contenido no hay riel
            lienzo.style.display = 'none';
            vacio.hidden = false;
            return;
        }
        vacio.hidden = true;
        rielSalWrap.hidden = false;
        lienzo.style.display = 'block';
        var d = dimsSalida();
        if (lienzo.width !== d.w || lienzo.height !== d.h) {
            lienzo.width = d.w;
            lienzo.height = d.h;
        }
        /* F5f: el bucle continúa desde donde quedó el cabezal tras un scrub */
        var fase = previewFase;
        previewFase = 0;
        var durMs = durMsPorImagen();
        var total = durMs * imagenes.length;
        dibujarEn(fase, durMs);
        var animar = selTrans.value === 'kenburns' ||
            (selTrans.value !== 'ninguna' && imagenes.length > 1);
        // F5e: con una sola imagen, si algún texto anima o tiene ventana
        // temporal la vista previa también necesita bucle
        var animaTexto = hayTextoAnimado();
        if (!animar && !animaTexto && imagenes.length < 2) return;
        var t0 = performance.now();
        var ultimo = -1;
        function paso() {
            var t = (fase + performance.now() - t0) % total;
            var idx = Math.floor(t / durMs);
            if (animar || animaTexto || idx !== ultimo) {   // sin transiciones solo se redibuja al cambiar de imagen
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

    /* ---------- F4 · superposiciones: cargar el logo y repintar ---------- */
    function repintarSuperp() {
        if (grabando) return;
        reiniciarPreview();
        actualizaManija();   // F5b: la manija sigue al texto aunque no haya dibujo
        actualizaManijaContenido();   // F5d: idem con el contenido de Tet News
    }

    /* ---------- F5b · título arrastrable (posición «personalizada») ---------- */
    /* La manija cubre solo la caja del texto y usa touch-action:none, así que
       el arrastre no roba el desplazamiento vertical de la página en móvil.
       El centro se guarda en fracciones del lienzo: al cambiar de tamaño de
       salida el título queda en su sitio. */
    function actualizaManija() {
        var activa = textoSel >= 0 && lienzo.style.display !== 'none' && !!cajaTextoSel;
        manijaTitulo.hidden = !activa;
        if (!activa) return;
        var f = lienzo.clientWidth / lienzo.width;
        var pad = 4;
        manijaTitulo.style.left = (lienzo.offsetLeft + (cajaTextoSel.x - cajaTextoSel.w / 2) * f - pad) + 'px';
        manijaTitulo.style.top = (lienzo.offsetTop + (cajaTextoSel.y - cajaTextoSel.h / 2) * f - pad) + 'px';
        manijaTitulo.style.width = (cajaTextoSel.w * f + pad * 2) + 'px';
        manijaTitulo.style.height = (cajaTextoSel.h * f + pad * 2) + 'px';
    }

    function redibujarArrastre() {
        if (grabando) return;
        if (videoCargado) { dibujarFrame(vidFuente); return; }
        if (!imagenes.length) return;
        var durMs = Math.max(Math.round(MIN_POR_IMAGEN * 1000),
            Math.round(calculoDuracion().porImagen * 1000));
        dibujarEn(tUltimo, durMs);   // mantiene el instante de la animación
    }

    manijaTitulo.addEventListener('pointerdown', function (e) {
        if (textoSel < 0 || grabando) return;
        manijaArrastrando = true;
        try { manijaTitulo.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
        e.preventDefault();
    });
    manijaTitulo.addEventListener('pointermove', function (e) {
        if (!manijaArrastrando || textoSel < 0) return;
        var t = textos[textoSel];
        if (!t) return;
        var r = lienzo.getBoundingClientRect();
        // F5e: mover el texto lo lleva a posición «personalizada»
        t.x = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width));
        t.y = Math.max(0.05, Math.min(0.95, (e.clientY - r.top) / r.height));
        t.pos = 'personalizada';
        if (selTxtPos.value !== 'personalizada') selTxtPos.value = 'personalizada';
        redibujarArrastre();
        actualizaManija();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
        manijaTitulo.addEventListener(ev, function (e) {
            if (!manijaArrastrando) return;
            manijaArrastrando = false;
            try { manijaTitulo.releasePointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
            redibujarArrastre();
            actualizaManija();
        });
    });

    /* ---------- F5d · contenido arrastrable dentro de la plantilla Tet News ---------- */
    /* La manija muestra la intersección de la caja del contenido con el cuerpo:
       así se ve entera aunque el contenido se agrande y siempre se agarra la
       parte visible. Como en F5b, cubre solo su caja y usa touch-action:none,
       así que en móvil no roba el desplazamiento vertical de la página. */
    function actualizaManijaContenido() {
        var activa = noticiaActiva && !!cajaContenido &&
            lienzo.style.display !== 'none' && (imagenes.length > 0 || videoCargado);
        manijaContenido.hidden = !activa;
        if (!activa) return;
        var z = zonaDibujo();
        var x0 = Math.max(cajaContenido.x - cajaContenido.w / 2, z.x);
        var y0 = Math.max(cajaContenido.y - cajaContenido.h / 2, z.y);
        var x1 = Math.min(cajaContenido.x + cajaContenido.w / 2, z.x + z.w);
        var y1 = Math.min(cajaContenido.y + cajaContenido.h / 2, z.y + z.h);
        if (x1 <= x0 || y1 <= y0) {
            manijaContenido.hidden = true;
            return;
        }
        var f = lienzo.clientWidth / lienzo.width;
        var pad = 4;
        manijaContenido.style.left = (lienzo.offsetLeft + x0 * f - pad) + 'px';
        manijaContenido.style.top = (lienzo.offsetTop + y0 * f - pad) + 'px';
        manijaContenido.style.width = ((x1 - x0) * f + pad * 2) + 'px';
        manijaContenido.style.height = ((y1 - y0) * f + pad * 2) + 'px';
    }

    manijaContenido.addEventListener('pointerdown', function (e) {
        if (!noticiaActiva || grabando) return;
        contArrastrando = true;
        try { manijaContenido.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
        e.preventDefault();
    });
    manijaContenido.addEventListener('pointermove', function (e) {
        if (!contArrastrando) return;
        var r = lienzo.getBoundingClientRect();
        var z = zonaDibujo();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        // el centro no puede salir del cuerpo de la plantilla
        contPos = {
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(z.y / lienzo.height,
                Math.min((z.y + z.h) / lienzo.height, y))
        };
        redibujarArrastre();
        actualizaManijaContenido();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
        manijaContenido.addEventListener(ev, function (e) {
            if (!contArrastrando) return;
            contArrastrando = false;
            try { manijaContenido.releasePointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
            redibujarArrastre();
            actualizaManijaContenido();
        });
    });

    supLogoArchivo.addEventListener('change', function () {
        var f = supLogoArchivo.files && supLogoArchivo.files[0];
        if (!f) return;
        if (logoUrl) URL.revokeObjectURL(logoUrl);
        logoUrl = URL.createObjectURL(f);
        var im = new Image();
        im.onload = function () {
            logoImg = im;
            supLogoMini.src = logoUrl;
            supLogoNombre.textContent = f.name;
            supLogoEstado.hidden = false;
            repintarSuperp();
        };
        im.onerror = function () {
            logoImg = null;
            supLogoEstado.hidden = true;
            aviso('No se pudo leer «' + f.name + '» como imagen: prueba con un PNG', 'danger');
        };
        im.src = logoUrl;
    });

    supLogoQuitar.addEventListener('click', function () {
        supLogoArchivo.value = '';
        if (logoUrl) URL.revokeObjectURL(logoUrl);
        logoUrl = null;
        logoImg = null;
        supLogoMini.removeAttribute('src');
        supLogoEstado.hidden = true;
        repintarSuperp();
    });

    [supLogoPos, supLogoTam].forEach(function (el) {
        el.addEventListener('change', function () {
            repintarSuperp();
        });
    });

    /* ---------- F5e · lista de textos (título, descripción…) ---------- */
    /* Cada texto guarda: contenido, posición (preset o x/y en fracciones),
       tamaño (% del alto), animación de entrada y de salida, y su ventana
       temporal (inicio y duración; dur = 0 → hasta el final del vídeo). */
    function nuevoTexto(txt, n) {
        return {
            txt: txt || '',
            pos: n === 0 ? 'abajo-centro' : 'personalizada',
            x: 0.5,
            y: Math.max(0.12, 0.9 - n * 0.08),   // los nuevos se apilan
            tam: 7,
            anim: 'ninguna',
            animDur: 1,
            salida: 'ninguna',
            salidaDur: 0.5,
            inicio: 0,
            dur: 0
        };
    }

    function fmtSeg(x) {
        return (Math.round(x * 10) / 10).toString().replace('.', ',');
    }

    function textoActual() {
        return (textoSel >= 0 && textos[textoSel]) ? textos[textoSel] : null;
    }

    function etiquetaTiempo(t) {
        return (t.dur > 0)
            ? fmtSeg(t.inicio) + '–' + fmtSeg(t.inicio + t.dur) + ' s'
            : fmtSeg(t.inicio) + ' s → final';
    }

    function pintaListaTextos() {
        listaTextos.innerHTML = '';
        textos.forEach(function (t, i) {
            var fila = document.createElement('div');
            fila.className = 'vid-texto-fila' + (i === textoSel ? ' vid-texto-activa' : '');
            var sel = document.createElement('button');
            sel.type = 'button';
            sel.className = 'vid-texto-sel';
            sel.setAttribute('role', 'option');
            sel.setAttribute('aria-selected', i === textoSel ? 'true' : 'false');
            var nom = document.createElement('span');
            nom.className = 'vid-texto-nombre';
            nom.textContent = t.txt.trim() || '(texto vacío)';
            var hora = document.createElement('span');
            hora.className = 'vid-texto-tiempo';
            hora.textContent = etiquetaTiempo(t);
            sel.appendChild(nom);
            sel.appendChild(hora);
            sel.addEventListener('click', function () { seleccionaTexto(i); });
            fila.appendChild(sel);
            fila.appendChild(accionesTexto(i));
            listaTextos.appendChild(fila);
        });
        editTexto.hidden = textoSel < 0;
        pintaRielSalida();   // F5f: barras y regla al día con la lista
    }

    function accionesTexto(i) {
        var caja = document.createElement('div');
        caja.className = 'vid-texto-acciones';
        [
            { icono: 'fa-arrow-up', titulo: 'Subir el texto', accion: function () { mueveTexto(i, -1); } },
            { icono: 'fa-arrow-down', titulo: 'Bajar el texto', accion: function () { mueveTexto(i, 1); } },
            { icono: 'fa-trash', titulo: 'Quitar el texto', accion: function () { quitaTexto(i); } }
        ].forEach(function (b) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn';
            btn.title = b.titulo;
            btn.setAttribute('aria-label', b.titulo);
            btn.innerHTML = '<i class="fas ' + b.icono + '" aria-hidden="true"></i>';
            btn.addEventListener('click', b.accion);
            caja.appendChild(btn);
        });
        return caja;
    }

    function seleccionaTexto(i) {
        textoSel = (i >= 0 && i < textos.length) ? i : -1;
        pintaListaTextos();
        cargaEditor();
        repintarSuperp();
    }

    function mueveTexto(i, delta) {
        var j = i + delta;
        if (j < 0 || j >= textos.length) return;
        var t = textos[i];
        textos[i] = textos[j];
        textos[j] = t;
        if (textoSel === i) textoSel = j;
        else if (textoSel === j) textoSel = i;
        pintaListaTextos();
        repintarSuperp();
    }

    function quitaTexto(i) {
        textos.splice(i, 1);
        if (textoSel >= textos.length) textoSel = textos.length - 1;
        pintaListaTextos();
        cargaEditor();
        repintarSuperp();
    }

    function cargaEditor() {
        var t = textoActual();
        editTexto.hidden = !t;
        if (!t) return;
        inpTxtContenido.value = t.txt;
        selTxtPos.value = t.pos;
        inpTxtTam.value = String(t.tam);
        selTxtAnim.value = t.anim;
        inpTxtAnimDur.value = String(t.animDur);
        selTxtSalida.value = t.salida;
        inpTxtSalidaDur.value = String(t.salidaDur);
        inpTxtInicio.value = String(t.inicio);
        inpTxtDur.value = String(t.dur);
    }

    /* el texto se escribe directo en la lista: se repinta al escribir y se
       sanea al salir del campo (mismo patrón que el resto de inputs) */
    inpTxtContenido.addEventListener('input', function () {
        var t = textoActual();
        if (!t) return;
        t.txt = inpTxtContenido.value;
        pintaListaTextos();
        repintarSuperp();
    });

    [[selTxtPos, 'pos'], [selTxtAnim, 'anim'], [selTxtSalida, 'salida']].forEach(function (par) {
        par[0].addEventListener('change', function () {
            var t = textoActual();
            if (!t) return;
            t[par[1]] = par[0].value;
            if (par[1] === 'pos' && par[0].value === 'personalizada') {
                aviso('Arrastra el texto en la vista previa para colocarlo donde quieras', 'info');
            }
            repintarSuperp();
        });
    });

    [[inpTxtTam, 'tam', 2, 25, 7],
     [inpTxtAnimDur, 'animDur', 0.2, 5, 1],
     [inpTxtSalidaDur, 'salidaDur', 0.2, 5, 0.5],
     [inpTxtInicio, 'inicio', 0, 120, 0],
     [inpTxtDur, 'dur', 0, 120, 0]].forEach(function (cfg) {
        cfg[0].addEventListener('change', function () {
            var t = textoActual();
            if (!t) return;
            var v = parseFloat(cfg[0].value);
            if (!isFinite(v)) v = cfg[4];
            if (v < cfg[2]) v = cfg[2];
            if (v > cfg[3]) v = cfg[3];
            t[cfg[1]] = Math.round(v * 10) / 10;
            cfg[0].value = String(t[cfg[1]]);
            pintaListaTextos();
            repintarSuperp();
        });
    });

    btnAddTexto.addEventListener('click', function () {
        textos.push(nuevoTexto('', textos.length));
        seleccionaTexto(textos.length - 1);
        inpTxtContenido.focus();
    });

    /* arranca con un texto listo para escribir (abajo al centro) */
    textos = [nuevoTexto('', 0)];
    textoSel = 0;
    pintaListaTextos();
    cargaEditor();

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
