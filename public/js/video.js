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
    var MAX_TOTAL_SEG = 300;      // 5 minutos: se graba en tiempo real, no conviene más (E4)
    var MINUTOS_MAX = Math.round(MAX_TOTAL_SEG / 60);   // «5» para los avisos (E4)
    var MIN_POR_IMAGEN = 0.1;      // 10 fotogramas/s por imagen: menos no lo distingue el grabador
    var FPS = 30;

    var imagenes = [];    // { url, img, nombre }
    var usosUrl = {};     // objectURL -> veces usada (al duplicar)
    var sel = -1;         // índice de la imagen seleccionada
    var urlVideo = null;  // objectURL del último vídeo
    var blobVideo = null; // F7: blob del último vídeo (para compartirlo)
    var preview = null;   // id de requestAnimationFrame de la vista previa
    var grabando = false;
    var recAct = null;
    var rafAct = null;
    var cancelado = false;
    var videoCargado = false;  // E3: hay un vídeo fuente cargado (modo recorte)
    var urlFuente = null;      // objectURL del vídeo fuente activo
    var durVideo = 0;          // duración de la salida (s): suma de los recortes (E5b)
    /* E5 · cola de clips: se unen en orden en un solo vídeo de salida */
    var colaVideos = [];       // { nombre, url, dur, ini, fin } — E5b: ini/fin
                               // son el recorte de cada clip (segundos)
    var idxActivo = -1;        // clip mostrado en #vid-fuente (vista previa)
    var idxAntesRender = -1;   // E5b: clip activo antes de grabar (se recupera al acabar)
    var desfaseActivo = 0;     // inicio del clip activo dentro de la salida (E5b)
    var marcoSucio = true;     // hay que redibujar el fotograma del vídeo en pausa
    var audioCtx = null;       // Web Audio: sonido del recorte hacia el grabador
    var audioDest = null;
    var fuenteAudio = null;
    /* F6 · música de fondo (misma pareja ctx/dest que el recorte) */
    var inpMusica = document.getElementById('vid-audio-archivo');
    var filaMusica = document.getElementById('vid-audio-fila');
    var nombreMusica = document.getElementById('vid-audio-nombre');
    var volMusica = document.getElementById('vid-audio-vol');
    var volValor = document.getElementById('vid-audio-vol-valor');
    var btnQuitarMusica = document.getElementById('vid-audio-quitar');
    var musicaBuf = null;       // AudioBuffer decodificado del archivo subido
    var musicaNodo = null;      // AudioBufferSourceNode de la grabación en curso
    var musicaGanancia = null;  // GainNode (el volumen también funciona en vivo)
    /* F8 · captura de pestaña (getDisplayMedia) */
    var capturando = false;     // hay una captura de pestaña en curso
    var pidiendo = false;       // selector de pestaña abierto (evita doble clic)
    var recPestana = null;      // MediaRecorder de la captura
    var streamPestana = null;   // stream que compartió el usuario
    var relojPestana = null;    // setInterval del cronómetro

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
    var wrapContenido = document.getElementById('vid-contenido-controles'); // M1: barra junto al lienzo
    var valContenido = document.getElementById('vid-contenido-valor');     // M1: lectura del deslizador
    var btnLlenar = document.getElementById('vid-contenido-llenar');       // M2: atajo «Llenar»
    var btnAjustar = document.getElementById('vid-contenido-ajustar');     // M2: atajo «Ajustar»
    var manijaContenido = document.getElementById('vid-manija-contenido'); // F5d
    var noticiaActiva = false;   // F5d: plantilla Tet News activa
    var contPos = null;          // F5d: centro del contenido en fracciones (null = automático)
    var contEsc = 1;             // F5d: multiplicador del ajuste automático (1 = auto)
    var cajaContenido = null;    // F5d: última caja dibujada del contenido
    var contArrastrando = false; // F5d: puntero sobre la manija del contenido
    var textoArrastreBase = null; // M2: punto de agarre del texto (mover sin salto)
    var contArrastreBase = null;  // M2: punto de agarre del contenido
    var contAsa = null;           // M2: esquina agarrada ('nw'|'ne'|'sw'|'se')
    var contRedimBase = null;     // M2: estado del escalado al empezar
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
    var btnCompartir = document.getElementById('vid-compartir');   // F7
    var repro = document.getElementById('vid-repro');
    var btnImagenLabel = document.getElementById('vid-etiqueta-img');
    var inpVideo = document.getElementById('vid-archivo-video');
    var lblVideo = document.getElementById('vid-etiqueta-video');
    var btnPestana = document.getElementById('vid-pestana');            // F8
    var ayudaPestana = document.getElementById('vid-pestana-ayuda');    // F8
    var filaPestana = document.getElementById('vid-pestana-fila');      // F8
    var tiempoPestana = document.getElementById('vid-pestana-tiempo');  // F8
    var btnPararPestana = document.getElementById('vid-pestana-parar'); // F8
    var btnDirecto = document.getElementById('vid-directo');               // E2
    var contDirecto = document.getElementById('vid-directo-controles');    // E2
    var iconoDirecto = document.getElementById('vid-directo-icon');        // E2
    var txtDirecto = document.getElementById('vid-directo-txt');           // E2
    var btnDescartar = document.getElementById('vid-descartar');           // M3
    var selCalidad = document.getElementById('vid-calidad');               // M4
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
    var colaWrap = document.getElementById('vid-cola');        // E5
    var listaCola = document.getElementById('vid-cola-lista');// E5
    var colaNota = document.getElementById('vid-cola-nota');  // E5
    var rielCol = document.getElementById('vid-riel-col');    // E5 (wrapper del riel)
    var lblFuente = document.getElementById('vid-lbl-fuente');// E5
    var rielLbl = document.getElementById('vid-riel-lbl');    // E5b: clip que recorta el riel
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
    var inpTxtColor = document.getElementById('vid-txt-color');     // F9
    var selTxtFuente = document.getElementById('vid-txt-fuente');   // F9
    var selTxtPeso = document.getElementById('vid-txt-peso');       // F9
    var textos = [];         // F5e: un elemento por cada texto de la salida
    var textoSel = -1;       // F5e: índice del texto en edición
    var cajaTextoSel = null; // F5e: caja dibujada del seleccionado (para la manija)
    var manijaTitulo = document.getElementById('vid-manija-titulo');   // F5b/F5e
    var manijaArrastrando = false;       // F5b: puntero sobre la manija
    var pistaLienzo = document.getElementById('vid-lienzo-pista');    // M1
    var cajasTextos = [];                // M1: cajas de los textos del último fotograma
    var lienzoArrastrando = false;       // M1: puntero arrastrando desde el lienzo (ratón)
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
        if (capturando || pidiendo) {   // F8: la pestaña manda mientras tanto
            aviso('Espera a que termine la captura de la pestaña', 'info');
            return;
        }
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

    /* ---------- E3/E5 · carga de vídeos: cola de montaje ---------- */
    /* E5: el selector acepta varios archivos y todos entran en cola; se unen
       en orden al crear el vídeo. Con un solo clip el comportamiento es el
       mismo que siempre (recorte de E3 sobre ese clip). */
    inpVideo.addEventListener('change', function () {
        var lista = Array.prototype.slice.call(inpVideo.files || []);
        inpVideo.value = '';
        if (!lista.length) return;
        if (grabando) {
            aviso('Espera a que termine la grabación', 'info');
            return;
        }
        if (capturando || pidiendo) {   // F8
            aviso('Espera a que termine la captura de la pestaña', 'info');
            return;
        }
        if (imagenes.length) {
            aviso('Quita las imágenes para recortar un vídeo', 'info');
            return;
        }
        cargarVideos(lista);
    });

    /* F8: la captura de la pestaña entra por la misma puerta que un subido */
    function cargarVideo(f) {
        cargarVideos([f]);
    }

    /* E5: añade archivos a la cola — lee cada duración con un <video> temporal
       (misma danza del webm de MediaRecorder que usaba cargarVideo) y al
       terminar refresca ventana, cola y vista previa */
    function cargarVideos(lista) {
        if (grabando || capturando || pidiendo) return;
        if (imagenes.length) {
            aviso('Quita las imágenes para recortar un vídeo', 'info');
            return;
        }
        var validos = [];
        lista.forEach(function (f) {
            var ok = /^video\//.test(f.type) || /\.(mp4|webm|m4v|mov|ogv)$/i.test(f.name);
            if (ok) validos.push(f);
            else aviso('«' + f.name + '» no es un vídeo', 'warning');
        });
        if (!validos.length) return;
        var eraVacio = colaVideos.length === 0;
        var cola = Promise.resolve();
        validos.forEach(function (f) {
            cola = cola.then(function () {
                return new Promise(function (resolver) {
                    duraDe(f, function (d, url) {
                        if (!d) {
                            URL.revokeObjectURL(url);
                            aviso('No se pudo leer la duración de «' + f.name + '»', 'danger');
                        } else {
                            /* E5b: recorte por defecto = todo el clip, salvo el
                               tope de 5 min de E4 (se aplica por clip) */
                            colaVideos.push({ nombre: f.name, url: url, dur: d,
                                ini: 0, fin: Math.min(d, MAX_TOTAL_SEG) });
                        }
                        resolver();
                    });
                });
            });
        });
        cola.then(function () {
            if (!colaVideos.length) return;
            if (eraVacio) idxActivo = 0;
            if (idxActivo < 0 || idxActivo >= colaVideos.length) idxActivo = 0;
            recargaCola();
            activaClip(idxActivo);   // E5b: pinta cola, riel y miniaturas
        });
    }

    /* E5: duración de un archivo con un <video> temporal — sin tocar el
       reproductor visible ni su raíl de miniaturas */
    function duraDe(f, cb) {
        var url = URL.createObjectURL(f);
        var v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.playsInline = true;
        var cerrado = false;
        var cierra = function (d) {
            if (cerrado) return;
            cerrado = true;
            cb(d > 0 && isFinite(d) ? d : 0, url);
        };
        v.addEventListener('loadedmetadata', function oy() {
            v.removeEventListener('loadedmetadata', oy);
            if (isFinite(v.duration) && v.duration > 0) return cierra(v.duration);
            // webm grabado sin duración en la cabecera (típico de
            // MediaRecorder): busca al final para que el navegador la calcule
            var fin = function () {
                if (isFinite(v.duration) && v.duration > 0) {
                    try { v.currentTime = 0; } catch (e) { }
                    cierra(v.duration);
                }
            };
            ['timeupdate', 'seeked', 'durationchange'].forEach(function (ev) {
                v.addEventListener(ev, fin);
            });
            setTimeout(function () { cierra(0); }, 4000);
            try { v.currentTime = 1e101; } catch (e) { cierra(0); }
        });
        v.addEventListener('error', function () { cierra(0); });
        v.src = url;
    }

    /* ---------- E5 · totales y piezas de la cola (E5b: por clip) ---------- */
    function totalCola() {
        var t = 0;
        for (var i = 0; i < colaVideos.length; i++) t += colaVideos[i].dur;
        return t;
    }

    function clipActivo() { return colaVideos[idxActivo] || null; }

    function durClipActivo() { var c = clipActivo(); return c ? c.dur : 0; }

    /* recorte vigente de un clip, saneado contra su duración */
    function recorteClip(c) {
        var ini = Math.max(0, Math.min(c.ini, c.dur));
        var fin = Math.max(ini, Math.min(c.fin, c.dur));
        return { inicio: ini, fin: fin };
    }

    function durRecorte(c) { var r = recorteClip(c); return r.fin - r.inicio; }

    /* E5b: la salida es el recorte de cada clip unidos en orden */
    function totalRecorte() {
        var t = 0;
        for (var i = 0; i < colaVideos.length; i++) t += durRecorte(colaVideos[i]);
        return t;
    }

    /* instante en el que empieza el clip i dentro de la salida */
    function montajeHasta(i) {
        var t = 0;
        for (var k = 0; k < i && k < colaVideos.length; k++) t += durRecorte(colaVideos[k]);
        return t;
    }

    /* E5b: instante de la salida → clip y tiempo de origen (cabezal de salida) */
    function clipEnSalida(seg) {
        var acc = 0;
        var ultimo = null;
        for (var i = 0; i < colaVideos.length; i++) {
            var r = recorteClip(colaVideos[i]);
            var d = r.fin - r.inicio;
            if (d <= 0) continue;   // clip recortado por completo: no aporta
            if (seg < acc + d) return { i: i, t: r.inicio + (seg - acc) };
            acc += d;
            ultimo = { i: i, t: r.fin };
        }
        return ultimo || { i: Math.max(0, idxActivo), t: 0 };
    }

    /* E5: la cola cambió (alta, baja o reordenación) → duración de la salida,
       recorte del clip activo y avisos */
    function recargaCola() {
        durVideo = totalRecorte();   // E5b: la salida suma el recorte de cada clip
        poneRecorteActivo();
        videoCargado = colaVideos.length > 0;
        /* E4: por defecto los primeros MINUTOS_MAX de cada clip; E5b además
           avisa si la suma de recortes no cabe en una grabación (5 min) */
        if (videoCargado && totalRecorte() > MAX_TOTAL_SEG) {
            aviso('Los recortes suman ' + fmt(totalRecorte()) + ' s: acorta algún ' +
                'vídeo (máximo ' + MINUTOS_MAX + ' minutos por grabación)', 'info');
        } else if (videoCargado && totalCola() > MAX_TOTAL_SEG) {
            aviso((colaVideos.length > 1 ? 'Los vídeos suman ' + fmt(totalCola()) + ' s'
                                         : 'Vídeo de ' + fmt(totalCola()) + ' s') +
                ': por defecto recortamos los primeros ' + MINUTOS_MAX +
                ' minutos de cada uno; mueve «fin» para elegir otra parte', 'info');
        }
        recWrap.hidden = !videoCargado;
        pintarModo();
        pintaCola();
        actualizaCrear();
    }

    /* E5b: inicio/fin y sus topes reflejan el recorte del clip activo */
    function poneRecorteActivo() {
        var c = clipActivo();
        if (!c) {
            recIn.value = '0';
            recFin.value = '0';
            return;
        }
        recIn.max = String(fmt(Math.max(0, c.dur - 0.2)));
        recFin.max = String(fmt(c.dur));
        var r = recorteClip(c);
        recIn.value = fmt(r.inicio);
        recFin.value = fmt(r.fin);
    }

    /* E5b: escribe el recorte del clip activo; refrescaInputs solo cuando no
       se está tecleando (así «1.» no se corroe al vuelo) */
    function ponRecorte(ini, fin, refrescaInputs) {
        if (grabando) return;   // el plan de segmentos ya está montado
        var c = clipActivo();
        if (!c) return;
        c.ini = Math.round(Math.max(0, Math.min(c.dur, ini)) * 10) / 10;
        c.fin = Math.round(Math.max(0, Math.min(c.dur, fin)) * 10) / 10;
        durVideo = totalRecorte();
        if (refrescaInputs) poneRecorteActivo();
        pintaCola();        // las filas y el sello enseñan lo que aporta el clip
        actualizaCrear();   // totales, riel y validez del botón
    }

    /* E5b: lo que hay en los inputs se vuelve el recorte del clip activo */
    function recorteDeInputs(refresca) {
        var c = clipActivo();
        if (!c) return;
        var ini = parseFloat(recIn.value);
        var fin = parseFloat(recFin.value);
        if (!isFinite(ini)) ini = 0;
        if (!isFinite(fin)) fin = c.dur;
        ponRecorte(ini, fin, refresca);
    }

    /* E5: muestra el clip i en el reproductor visible (vista previa) */
    function activaClip(i) {
        if (grabando) return;   // nunca cambiar la fuente en mitad de una grabación
        var c = colaVideos[i];
        if (!c) return;
        idxActivo = i;
        desfaseActivo = montajeHasta(i);   // E5b: dibujarFrame cuenta la salida
        poneRecorteActivo();              // E5b: inputs y riel del clip nuevo
        pintaCola();
        if (urlFuente === c.url && vidFuente.readyState >= 1) return;
        urlFuente = c.url;
        vidFuente.src = c.url;
        marcoSucio = true;
        // Chrome no decodifica el primer fotograma hasta el primer «buscar»:
        // sin este empujón la vista previa se queda en el color de fondo
        vidFuente.addEventListener('loadedmetadata', function oy() {
            vidFuente.removeEventListener('loadedmetadata', oy);
            if (!vidFuente.currentTime) vidFuente.currentTime = 0;
        });
        reiniciarPreview();
        trasActivaClip();   // E5b: riel y miniaturas del clip que acaba de entrar
    }

    /* E5b: el riel y sus miniaturas son del clip activo (siempre visibles) */
    function trasActivaClip() {
        pintarRiel();
        generarMiniaturas();
        actualizaCrear();
    }

    function pintaCola() {
        var n = colaVideos.length;
        listaCola.textContent = '';
        colaVideos.forEach(function (c, i) {
            var fila = document.createElement('div');
            fila.className = 'vid-texto-fila' + (i === idxActivo ? ' vid-texto-activa' : '');
            fila.setAttribute('role', 'listitem');
            var sel = document.createElement('button');
            sel.type = 'button';
            sel.className = 'vid-texto-sel';
            sel.setAttribute('aria-pressed', i === idxActivo ? 'true' : 'false');
            var nom = document.createElement('span');
            nom.className = 'vid-texto-nombre';
            nom.textContent = c.nombre;
            var hora = document.createElement('span');
            hora.className = 'vid-texto-tiempo';
            /* E5b: lo que el clip aporta a la salida (y su duración si lo
               recortamos) */
            var dr = durRecorte(c);
            hora.textContent = fmt(dr) + (dr < c.dur - 0.05 ? ' / ' + fmt(c.dur) : '') + ' s';
            sel.appendChild(nom);
            sel.appendChild(hora);
            sel.addEventListener('click', function () { activaClip(i); });
            fila.appendChild(sel);
            fila.appendChild(accionesCola(i));
            listaCola.appendChild(fila);
        });
        colaWrap.hidden = n < 2;
        colaNota.textContent = 'Se unen en el orden de la lista; «inicio» y «fin» ' +
            'recortan cada vídeo por separado (máximo ' + MINUTOS_MAX +
            ' minutos en total).';
        if (n) {
            recNombre.textContent = n === 1 ? colaVideos[0].nombre : n + ' vídeos en la cola';
            recDur.textContent = fmt(totalRecorte()) + ' s';   // E5b: la salida
        }
        /* E5b: riel y «Poner aquí» trabajan siempre —sobre el clip activo— */
        rielCol.hidden = false;
        recMarcarIn.hidden = false;
        recMarcarFin.hidden = false;
        var act = clipActivo();
        if (rielLbl) {
            var verLbl = n > 1 && !!act;
            rielLbl.hidden = !verLbl;
            if (verLbl) {
                rielLbl.textContent = 'Recortando «' + act.nombre + '» · clip ' +
                    (idxActivo + 1) + ' de ' + n;
            }
        }
        lblFuente.textContent = n > 1
            ? 'Vídeo activo — toca uno de la cola para verlo y recortarlo'
            : 'Vídeo original — arrástralo para elegir el punto';
    }

    function accionesCola(i) {
        var caja = document.createElement('div');
        caja.className = 'vid-texto-acciones';
        [
            { icono: 'fa-arrow-up', titulo: 'Mover el vídeo antes', accion: function () { mueveClip(i, -1); } },
            { icono: 'fa-arrow-down', titulo: 'Mover el vídeo después', accion: function () { mueveClip(i, 1); } },
            { icono: 'fa-trash', titulo: 'Quitar el vídeo', accion: function () { quitaClip(i); } }
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

    function quitaClip(i) {
        if (grabando) { aviso('Espera a que termine la grabación', 'info'); return; }
        var c = colaVideos[i];
        if (!c) return;
        colaVideos.splice(i, 1);
        URL.revokeObjectURL(c.url);
        if (!colaVideos.length) {
            idxActivo = -1;
            desfaseActivo = 0;
            return quitarVideo();   // avisa «Vídeo quitado» y limpia del todo
        }
        if (i < idxActivo) idxActivo--;
        else if (i === idxActivo) idxActivo = Math.min(i, colaVideos.length - 1);
        recargaCola();
        activaClip(idxActivo);   // E5b: pinta cola, riel y miniaturas
        aviso('Vídeo quitado', 'info');
    }

    function mueveClip(i, dir) {
        if (grabando) { aviso('Espera a que termine la grabación', 'info'); return; }
        var j = i + dir;
        if (j < 0 || j >= colaVideos.length) return;
        var activo = colaVideos[idxActivo];
        var c = colaVideos[i];
        colaVideos.splice(i, 1);
        colaVideos.splice(j, 0, c);
        idxActivo = colaVideos.indexOf(activo);
        recargaCola();
        activaClip(idxActivo);   // E5b: pinta cola, riel y miniaturas
    }

    /* E5: vacía toda la cola («Quitar vídeo» quita el clip activo; si era el
       último —o se vacía por dentro— se llega aquí) */
    function quitarVideo(silencio) {
        if (grabando) return;
        vidFuente.pause();
        vidFuente.removeAttribute('src');
        vidFuente.load();
        vidMini.removeAttribute('src');
        rielFotos.textContent = '';
        colaVideos.forEach(function (c) { URL.revokeObjectURL(c.url); });
        colaVideos = [];
        idxActivo = -1;
        desfaseActivo = 0;
        urlFuente = null;
        var estaba = videoCargado;
        videoCargado = false;
        durVideo = 0;
        recWrap.hidden = true;
        colaWrap.hidden = true;
        listaCola.textContent = '';
        pintarModo();
        if (estaba && !silencio) aviso('Vídeo quitado', 'info');
        actualizaCrear();
        reiniciarPreview();
    }

    /* E5: el botón quita el clip que se está viendo; al quitar el último la
       cola se vacía entera (comportamiento de siempre) */
    recQuitar.addEventListener('click', function () {
        if (idxActivo >= 0) quitaClip(idxActivo);
        else quitarVideo();
    });

    /* ---------- F8 · grabar pestaña (getDisplayMedia) ---------- */
    /* El usuario comparte la pestaña donde se reproduce un vídeo (X,
       YouTube…) con el selector del navegador; la captura se guarda como un
       clip y entra por la misma puerta que un vídeo subido (cargarVideo):
       bloque de recorte, riel, miniaturas y duración de E3. El audio de la
       pestaña (si Chrome comparte «audio de pestaña») viaja dentro del clip
       y al render se mezcla con la música en el audioDest de F6. El botón no
       aparece sin getDisplayMedia (iOS) ni con puntero táctil, donde el
       selector de pestañas no tiene sentido. */
    var MAX_PESTANA_SEG = MAX_TOTAL_SEG;   // mismo tope que la salida (E4)

    function hayDisplayMedia() {
        return !!(soportado && navigator.mediaDevices &&
            navigator.mediaDevices.getDisplayMedia &&
            !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
    }

    function pintaBotonPestana() {
        var hay = hayDisplayMedia();
        btnPestana.hidden = !hay;
        ayudaPestana.hidden = !hay;
    }

    btnPestana.addEventListener('click', function () {
        if (capturando || pidiendo) return;
        if (grabando) {
            aviso('Espera a que termine la grabación', 'info');
            return;
        }
        if (!hayDisplayMedia()) {
            aviso('Tu navegador no permite grabar la pestaña', 'warning');
            return;
        }
        if (imagenes.length) {
            aviso('Quita las imágenes para grabar una pestaña', 'info');
            return;
        }
        pidiendo = true;
        navigator.mediaDevices.getDisplayMedia({ video: { frameRate: FPS }, audio: true })
            .then(function (st) {
                pidiendo = false;
                iniciaCaptura(st);
            })
            .catch(function (e) {
                pidiendo = false;
                var n = e && e.name;
                if (n === 'NotAllowedError' || n === 'AbortError') {
                    aviso('Grabación de pestaña cancelada', 'info');
                } else {
                    aviso('No se pudo compartir la pestaña' + (n ? ' (' + n + ')' : ''), 'danger');
                }
            });
    });

    function descartaStream(st, msg) {
        st.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { } });
        if (msg) aviso(msg, 'warning');
    }

    function iniciaCaptura(st) {
        var pistaVideo = st.getVideoTracks()[0];
        var conAudio = st.getAudioTracks().length > 0;
        var mime = elegirMime(conAudio) || elegirMime(false);
        if (grabando) return descartaStream(st, 'Espera a que termine la grabación');
        if (imagenes.length) return descartaStream(st, 'Quita las imágenes para grabar una pestaña');
        if (!pistaVideo || !mime) return descartaStream(st, 'Este navegador no puede grabar la pestaña');
        var chunks = [];
        var rec;
        var cfg = {};
        try { cfg = pistaVideo.getSettings ? pistaVideo.getSettings() : {}; } catch (e0) { }
        /* M4: la captura también respeta «Calidad del vídeo» (antes iba al
           valor por defecto del navegador, sin tasa fijada) */
        var bits = bitrateSalida(cfg.width || 1920, cfg.height || 1080,
            cfg.frameRate || FPS);
        try {
            rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: bits });
        } catch (e) {
            try {
                rec = new MediaRecorder(st, { videoBitsPerSecond: bits });
                mime = rec.mimeType || 'video/webm';
            } catch (e2) {
                return descartaStream(st, 'No se pudo iniciar la grabación de la pestaña');
            }
        }
        capturando = true;
        recPestana = rec;
        streamPestana = st;
        btnCrear.disabled = true;
        pintaBotonDirecto();   // E2: la captura de pestaña bloquea el directo
        btnPestana.hidden = true;
        filaPestana.hidden = false;
        tiempoPestana.textContent = '0:00';
        /* Chrome enseña «Dejar de compartir»: si lo pulsan, la pista acaba,
           MediaRecorder para solo y onstop nos lleva a finCaptura */
        pistaVideo.onended = paraCaptura;
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () { finCaptura(chunks, mime); };
        rec.start();
        pantallaDespierta(true);   // M4: que no se apague la pantalla capturada
        var t0 = Date.now();
        relojPestana = setInterval(function () {
            var s = Math.floor((Date.now() - t0) / 1000);
            tiempoPestana.textContent = formatoAudio(s);
            if (s >= MAX_PESTANA_SEG) {
                paraCaptura();
                aviso('Máximo ' + MINUTOS_MAX + ' minutos de captura: el clip se corta ahí', 'info');
            }
        }, 250);
        aviso('Grabando la pestaña… pulsa «Detener» cuando tengas el clip', 'info');
    }

    function paraCaptura() {
        if (!capturando) return;
        if (recPestana && recPestana.state !== 'inactive') recPestana.stop();
    }

    btnPararPestana.addEventListener('click', paraCaptura);

    function finCaptura(chunks, mime) {
        clearInterval(relojPestana);
        relojPestana = null;
        pantallaDespierta(false);   // M4: fin de la captura de pestaña
        capturando = false;
        recPestana = null;
        filaPestana.hidden = true;
        pintaBotonPestana();
        if (streamPestana) {
            streamPestana.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { } });
            streamPestana = null;
        }
        actualizaCrear();   // «Crear vídeo» vuelve a su estado
        var tipo = (mime || 'video/webm').split(';')[0];
        var blob = new Blob(chunks, { type: tipo });
        if (!blob.size) return aviso('La grabación de la pestaña salió vacía', 'danger');
        var ext = (tipo === 'video/mp4') ? 'mp4' : 'webm';
        var d = new Date();
        var nombre = 'pestana-' + ('0' + d.getHours()).slice(-2) + '-' +
            ('0' + d.getMinutes()).slice(-2) + '.' + ext;
        var sigueSolo = colaVideos.length === 0;   // E5: ¿quedará como único clip?
        cargarVideo(new File([blob], nombre, { type: tipo }));
        aviso('Pestaña grabada: ' + Math.round(blob.size / 1024) + ' KB · ya está como vídeo fuente' +
            (sigueSolo ? ': recórtala en el riel' : ' (y en la cola de vídeos)'), 'success');
    }

    pintaBotonPestana();

    /* ---------- F7 · compartir (Web Share API) ---------- */
    /* Igual que capas.js pero con el vídeo: el blob del último resultado se
       manda como archivo a la hoja de compartir del sistema (WhatsApp,
       Telegram, archivos…). El botón solo aparece si el navegador acepta
       archivos en navigator.share; si no, o si algo falla, se avisa para
       usar «Descargar vídeo», que está justo encima. Cancelar la hoja
       (AbortError) es silencio. */
    function pintaBotonCompartir() {
        var hay = false;
        try {
            var prueba = new File([new Blob(['x'], { type: 'video/mp4' })],
                'prueba.mp4', { type: 'video/mp4' });
            hay = !!(navigator.share && navigator.canShare &&
                navigator.canShare({ files: [prueba] }));
        } catch (e) { hay = false; }
        btnCompartir.hidden = !hay;
    }

    btnCompartir.addEventListener('click', function () {
        if (!blobVideo) {
            aviso('Primero crea el vídeo', 'info');
            return;
        }
        var archivo;
        try {
            archivo = new File([blobVideo], aDesc.download || 'tet.mp4',
                { type: blobVideo.type || 'video/mp4' });
        } catch (e) {
            return aviso('No se pudo preparar el vídeo para compartir', 'danger');
        }
        if (!(navigator.share && navigator.canShare &&
            navigator.canShare({ files: [archivo] }))) {
            aviso('Este navegador no admite compartir archivos; usa «Descargar vídeo»', 'warning');
            return;
        }
        navigator.share({ files: [archivo], title: 'tet admin' })
            .catch(function (err) {
                if (err && err.name === 'AbortError') return;   // cancelado por el usuario
                aviso('No se pudo compartir; usa «Descargar vídeo»', 'warning');
            });
    });

    pintaBotonCompartir();

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
        var d = durClipActivo();   // E5b: el riel mide el clip activo
        if (!videoCargado || !(d > 0)) return;
        var p = Math.max(0, Math.min(100, vidFuente.currentTime / d * 100));
        rielCabezal.style.left = p + '%';
    }

    function pintarRiel() {
        var d = durClipActivo();   // E5b: tiradores sobre el clip activo
        if (!videoCargado || !(d > 0)) return;
        var rr = rangoRecorte();
        var pIn = Math.max(0, Math.min(100, rr.inicio / d * 100));
        var pFin = Math.max(0, Math.min(100, rr.fin / d * 100));
        rielTirIn.style.left = pIn + '%';
        rielTirOut.style.left = pFin + '%';
        rielSombraIn.style.width = pIn + '%';
        rielSombraOut.style.width = (100 - pFin) + '%';
        rielTirIn.setAttribute('aria-valuemax', fmt(d));
        rielTirIn.setAttribute('aria-valuenow', fmt(rr.inicio));
        rielTirOut.setAttribute('aria-valuemax', fmt(d));
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
            var t = durClipActivo() * (i + 0.5) / total;   // E5b: del clip activo
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
        var d = durClipActivo();   // E5b: el riel mide el clip activo
        if (!rielArrastre || !videoCargado || !(d > 0)) return;
        var t = rielPct(e) * d;
        if (rielArrastre === 'in') {
            var rr = rangoRecorte();
            ponRecorte(Math.max(0, Math.min(rr.fin - 0.2, t)), rr.fin, true);
        } else if (rielArrastre === 'out') {
            var rr2 = rangoRecorte();
            ponRecorte(rr2.inicio, Math.max(rr2.inicio + 0.2, Math.min(d, t)), true);
        } else {
            // cabezal (o clic sobre el riel): mueve la reproducción
            t = Math.max(0, Math.min(d, t));
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
            /* E5b: se mueve el recorte del clip activo (lo refrescan los inputs) */
            if (esInicio) {
                ponRecorte(Math.max(0, Math.min(rr.fin - 0.2, t)), rr.fin, true);
            } else {
                ponRecorte(rr.inicio, Math.max(rr.inicio + 0.2,
                    Math.min(durClipActivo(), t)), true);
            }
        });
    });

    /* ---------- F5f · riel de la línea de tiempo de salida ---------- */
    /* Mapea el tiempo de salida (0..total): en vídeo es el recorte, en
       imágenes la duración total. Una barra por texto + cabezal con scrub. */
    function totalSalida() {
        if (videoCargado) {
            return Math.max(0.2, totalRecorte());   // E5b: suma de los recortes
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
        if (grabando) return;   // E5b: no mover la fuente mientras se graba
        var total = totalSalida();
        tMs = Math.max(0, Math.min(Math.max(0, total - 0.01) * 1000, tMs));
        poneCabezalSalida(tMs);
        if (videoCargado) {
            /* E5b: el instante de la salida dice en qué clip cae */
            var m = clipEnSalida(tMs / 1000);
            if (m.i !== idxActivo) activaClip(m.i);
            if (Math.abs((vidFuente.currentTime || 0) - m.t) > 0.03) {
                try { vidFuente.currentTime = m.t; } catch (e) { }
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
        valContenido.textContent = inpEscContenido.value + ' %';   // M1
        wrapContenido.hidden = !noticiaActiva;   // M1: la barra vive junto al lienzo
        if (noticiaActiva && selAjuste.value === 'cover') {
            // cover recortaría los bordes del cuerpo: mejor contenerlo
            selAjuste.value = 'contain';
            aviso('Ajuste cambiado a «contener» para que se vea el contenido en la plantilla', 'info');
        }
        pintaAjusteRapido();   // M2: resalta el atajo tras el posible cambio a «contener»
        repintarSuperp();
        actualizaManijaContenido();
    });

    inpEscContenido.addEventListener('input', function () {
        contEsc = (parseFloat(inpEscContenido.value) || 100) / 100;
        valContenido.textContent = inpEscContenido.value + ' %';   // M1
        redibujarArrastre();
        actualizaManijaContenido();
    });

    btnCentrarContenido.addEventListener('click', function () {
        contPos = null;                 // vuelve al centrado automático del cuerpo
        contEsc = 1;
        inpEscContenido.value = '100';
        valContenido.textContent = '100 %';   // M1
        redibujarArrastre();
        actualizaManijaContenido();
    });

    /* M2 · atajos «Llenar»/«Ajustar» junto al lienzo (como la barra de
       acciones de tet1): reflejan el select de ajuste y lo cambian */
    function pintaAjusteRapido() {
        var c = selAjuste.value === 'cover';
        var a = selAjuste.value === 'contain';
        btnLlenar.classList.toggle('active', c);
        btnLlenar.setAttribute('aria-pressed', String(c));
        btnAjustar.classList.toggle('active', a);
        btnAjustar.setAttribute('aria-pressed', String(a));
    }
    function ajusteRapido(v) {
        if (selAjuste.value === v) return;
        selAjuste.value = v;
        selAjuste.dispatchEvent(new Event('change', { bubbles: true }));
    }
    btnLlenar.addEventListener('click', function () { ajusteRapido('cover'); });
    btnAjustar.addEventListener('click', function () { ajusteRapido('contain'); });

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
       ajuste y tamaño que la salida. F10: mientras el vídeo fuente aún no
       tiene fotogramas (readyState < 2: carga inicial o salto de clip de E5)
       se pinta igualmente el fondo y los superpuestos en vez de no pintar
       nada: captureStream necesita dibujos nuevos y sin ellos la grabación
       puede salir sin pista de vídeo —«solo audio» al compartirla— */
    function dibujarFrame(v) {
        if (!v) return;
        var tMs = Math.max(0, desfaseActivo + (v.currentTime || 0)
            - rangoRecorte().inicio) * 1000;
        pintarFondo();
        if (v.readyState >= 2) {
            if (selAjuste.value === 'blur') pintarDesenfado(v);
            dibujarCentrado(v, 1);
        }
        // F5 · la animación del título cuenta desde el inicio del recorte;
        // E5: con varios clips la cuenta es sobre el montaje (desfaseActivo)
        dibujarSuperposiciones(tMs);
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
        // animación de entrada y de salida; por defecto blanco en negrita con
        // sombra para que se lea sobre cualquier fondo (F9: color/fuente/peso
        // propios de cada texto)
        cajaTextoSel = null;
        cajasTextos = [];   // M1: se rellena con la caja de cada texto dibujado
        for (var i = 0; i < textos.length; i++) {
            dibujaTexto(textos[i], tMs, w, h, margen, fuente, i === textoSel, i);
        }
        actualizaManija();   // F5b/F5e: coloca (o esconde) la manija sobre el texto
        actualizaManijaContenido();   // F5d: idem para el contenido de Tet News
        // F5f: el cabezal de la línea de tiempo sigue el fotograma mostrado
        // (durante la grabación y el scrub ya lo coloca quien corresponde)
        if (!grabando && !rielSalScrub && tMs != null && isFinite(tMs)) {
            poneCabezalSalida(tMs);
        }
    }

    /* F9 · familias y pesos disponibles para los textos (antes todo el mundo
       salía blanco, en negrita y con la pila de sistema) */
    var FUENTES_VIDEO = {
        sistema: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        sans: 'Arial, Helvetica, sans-serif',
        serif: 'Georgia, "Times New Roman", Times, serif',
        redonda: 'Verdana, Tahoma, sans-serif',
        mono: '"Courier New", Courier, monospace'
    };
    var PESOS_VIDEO = {
        negrita: '700',
        normal: '400',
        cursiva: '400 italic',
        'negrita-cursiva': '700 italic'
    };

    /* F5e · dibuja un texto de la lista en el instante tMs (ms desde el inicio
       del vídeo de salida). Ventana activa: [inicio, inicio+dur) con dur = 0
       significando «hasta el final». p recorre la entrada (0 → 1) y q la
       salida (0 → 1); si no cabe, la fuente se encoge hasta el ancho. */
    function dibujaTexto(t, tMs, w, h, margen, fuente, esSel, indice) {
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
        /* F9: familia y peso por texto; los textos antiguos (sin campos) caen
           en la pila de sistema y la negrita de siempre */
        var familia = FUENTES_VIDEO[t.fuente] || fuente;
        var peso = PESOS_VIDEO[t.peso] || '700';
        ctx.save();
        ctx.font = peso + ' ' + fs + 'px ' + familia;
        var maxW = w - margen * 2;
        var tw = ctx.measureText(txt).width;
        if (tw > maxW && tw > 0) {
            fs = Math.max(10, Math.round(fs * maxW / tw));
            ctx.font = peso + ' ' + fs + 'px ' + familia;
            tw = ctx.measureText(txt).width;   // F5b: ancho real tras encoger
        }
        ctx.textBaseline = 'middle';
        ctx.fillStyle = t.color || '#fff';   // F9
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
        // F5e: caja de reposo del texto seleccionado para situar la manija;
        // M1: la caja de TODOS los textos permite tocarlos sobre el lienzo
        if (esSel || typeof indice === 'number') {
            var caja = { x: tx, y: ty, w: tw, h: fs * 1.2 };
            if (esSel) cajaTextoSel = caja;
            if (typeof indice === 'number') cajasTextos[indice] = caja;
        }

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
    /* motivo por el que el recorte de un clip no vale, o '' si vale (E5b) */
    function recorteClipMsg(c) {
        var r = recorteClip(c);
        var seg = Math.round((r.fin - r.inicio) * 100) / 100;
        if (seg < 0.2) {
            return 'El recorte de «' + c.nombre + '» necesita fin - inicio de al menos 0,2 s';
        }
        if (seg > MAX_TOTAL_SEG) {
            return '«' + c.nombre + '» pasa de ' + MINUTOS_MAX +
                ' minutos: mueve «fin» (se graba en tiempo real)';
        }
        return '';
    }

    /* E5b: recorte vigente del clip activo —inputs, riel y render trabajan
       sobre el clip que está en la cola resaltado */
    function rangoRecorte() {
        var c = clipActivo();
        if (!c) return { inicio: 0, fin: 0, ok: false, msg: 'Carga un vídeo' };
        var r = recorteClip(c);
        var m = recorteClipMsg(c);
        return { inicio: r.inicio, fin: r.fin, ok: !m, msg: m };
    }

    /* E5b: validez de la salida entera —cada clip y la suma del montaje,
       porque la grabación es en tiempo real (máximo 5 min por grabación) */
    function validadorRecorte() {
        for (var i = 0; i < colaVideos.length; i++) {
            var m = recorteClipMsg(colaVideos[i]);
            if (m) return { inicio: 0, fin: 0, ok: false, msg: m };
        }
        var tot = totalRecorte();
        if (tot > MAX_TOTAL_SEG) {
            return { inicio: 0, fin: 0, ok: false,
                msg: 'Los recortes suman ' + fmt(tot) + ' s: acorta algún vídeo ' +
                     '(máximo ' + MINUTOS_MAX + ' minutos por grabación)' };
        }
        return rangoRecorte();
    }

    function actualizaCrear() {
        pintaBotonDirecto();   // E2: el botón de directo refleja el estado global
        /* F5f: el total de la salida cambia → barras, regla y cabezal se
           recolocan (vale para recorte de vídeo y duración de imágenes) */
        pintaRielSalida();
        poneCabezalSalida(rielSalUltimoMs);
        if (videoCargado) {
            var rr = validadorRecorte();   // E5b: cada clip y la suma del montaje
            var n = colaVideos.length;
            var pref = n > 1 ? n + ' vídeos · ' : '';   // E5
            var salida = totalRecorte();
            var origen = totalCola();
            recIn.disabled = grabando || capturando;   // E5b: el plan no se toca
            recFin.disabled = grabando || capturando;   // mientras se graba
            vidTotal.textContent = rr.ok
                ? (n > 1
                    ? pref + 'Salida de ' + fmt(salida) + ' s' +
                      (Math.abs(salida - origen) > 0.05 ?
                        ' (origen ' + fmt(origen) + ' s)' : '') +
                      ' · se graba en tiempo real'
                    : 'Recorte de ' + fmt(salida) + ' s de ' + fmt(origen) +
                      ' s · se graba en tiempo real')
                : rr.msg;
            btnCrear.disabled = grabando || capturando || !rr.ok;
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
                (d.total > MAX_TOTAL_SEG ? ' (máximo ' + MINUTOS_MAX + ' minutos: reduce el total)' :
                    totalCorto ? ' (con ' + n + ' imágenes hacen falta al menos ' +
                        fmt(n * MIN_POR_IMAGEN) + ' s)' : '');
        } else {
            vidTotal.textContent = n + (n === 1 ? ' imagen × ' : ' imágenes × ') +
                fmt(d.porImagen) + ' s = ' + fmt(d.total) + ' s de vídeo · se graba en tiempo real' +
                (d.total > MAX_TOTAL_SEG ? ' (máximo ' + MINUTOS_MAX + ' minutos: reduce la duración o las imágenes)' : '');
        }
        btnCrear.disabled = !n || grabando || capturando || excede;
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
            pistaLienzo.hidden = false;   // M1: hay lienzo que tocar
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
            pistaLienzo.hidden = true;    // M1: sin lienzo no hay pista
            return;
        }
        vacio.hidden = true;
        rielSalWrap.hidden = false;
        lienzo.style.display = 'block';
        pistaLienzo.hidden = false;   // M1: hay lienzo que tocar
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

    /* inputs de recorte: el «input» refleja el recorte del clip activo en
       vivo; el «change» además normaliza los valores (E5b) */
    [recIn, recFin].forEach(function (el) {
        el.addEventListener('input', function () { recorteDeInputs(false); });
        el.addEventListener('change', function () { recorteDeInputs(true); });
    });
    /* E5b: «Poner aquí» marca el instante del vídeo activo en su recorte */
    recMarcarIn.addEventListener('click', function () {
        var rr = rangoRecorte();
        ponRecorte(Math.max(0, Math.min(rr.fin - 0.2,
            Math.round(vidFuente.currentTime * 10) / 10)), rr.fin, true);
    });
    recMarcarFin.addEventListener('click', function () {
        var rr = rangoRecorte();
        ponRecorte(rr.inicio, Math.max(rr.inicio + 0.2,
            Math.round(vidFuente.currentTime * 10) / 10), true);
    });

    [selTam, inpDur, selAjuste, selTrans, inpFondo].forEach(function (el) {
        el.addEventListener('change', function () {
            if (el === selAjuste && selAjuste.value === 'blur' && !soportaFilter) {
                aviso('Tu navegador no hace desenfoque: se usará el color de fondo', 'info');
            }
            if (el === selAjuste) pintaAjusteRapido();   // M2: resalta el atajo activo
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
        poneZonaTactil(manijaTitulo);   // M1: zona de toque hasta 44 px
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
        desenfocaCampo();         // M2: el campo con foco no debe tirar de la página
        iniciaArrastreTexto(e);   // M2: delta desde donde se agarra
        manijaArrastrando = true;
        try { manijaTitulo.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
        e.preventDefault();
    });
    manijaTitulo.addEventListener('pointermove', function (e) {
        if (!manijaArrastrando || textoSel < 0) return;
        arrastraTextoA(e);   // M1: mismo motor que el arrastre desde el lienzo
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
        manijaTitulo.addEventListener(ev, function (e) {
            if (!manijaArrastrando) return;
            manijaArrastrando = false;
            textoArrastreBase = null;   // M2
            try { manijaTitulo.releasePointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
            redibujarArrastre();
            actualizaManija();
        });
    });

    /* ---------- M1 · tocar y arrastrar directamente en el lienzo (móvil) ---------- */
    /* Un toque sobre un texto lo selecciona —con tolerancia alrededor de su
       caja— sin tener que ir a buscarlo a la lista, y con ratón se arrastra
       desde el propio lienzo. En táctil NO se arrastra desde aquí: el deslizar
       vertical debe mover la página, así que el dedo selecciona con el toque y
       coloca con la manija, que sí tiene touch-action:none y zona ensanchada. */
    function cajaTextoBajo(e) {
        var r = lienzo.getBoundingClientRect();
        if (!r.width || !r.height) return -1;
        var x = (e.clientX - r.left) * (lienzo.width / r.width);
        var y = (e.clientY - r.top) * (lienzo.height / r.height);
        var tol = 14 * (lienzo.width / r.width);   // 14 px de pantalla en cada lado
        for (var i = cajasTextos.length - 1; i >= 0; i--) {
            var c = cajasTextos[i];
            if (!c) continue;   // texto fuera de su ventana en este fotograma
            if (x >= c.x - c.w / 2 - tol && x <= c.x + c.w / 2 + tol &&
                y >= c.y - c.h / 2 - tol && y <= c.y + c.h / 2 + tol) return i;
        }
        return -1;
    }

    /* M2: el texto se agarra DONDE se toca y lo sigue (delta); antes el
       centro saltaba al puntero y el arrastre se sentía raro. El origen es el
       centro DIBUJADO: t.x/t.y sin sincronizar en una posición de plantilla
       harían que el texto saltara en el primer agarre */
    function iniciaArrastreTexto(e) {
        var t = textos[textoSel];
        if (!t) return;
        var cx = cajaTextoSel ? cajaTextoSel.x / lienzo.width : t.x;
        var cy = cajaTextoSel ? cajaTextoSel.y / lienzo.height : t.y;
        textoArrastreBase = { x: e.clientX, y: e.clientY, tx: cx, ty: cy };
    }

    function arrastraTextoA(e) {
        if (textoSel < 0) return;
        var t = textos[textoSel];
        if (!t) return;
        var b = textoArrastreBase;
        if (!b) return;   // M2: sin punto de agarre no se mueve
        var r = lienzo.getBoundingClientRect();
        // F5e: mover el texto lo lleva a posición «personalizada»
        t.x = Math.max(0.05, Math.min(0.95, b.tx + (e.clientX - b.x) / r.width));
        t.y = Math.max(0.05, Math.min(0.95, b.ty + (e.clientY - b.y) / r.height));
        t.pos = 'personalizada';
        if (selTxtPos.value !== 'personalizada') selTxtPos.value = 'personalizada';
        redibujarArrastre();
        actualizaManija();
    }

    /* M1: ensancha el área agarrable de la manija hasta ~44 px de dedo (y hasta
       32 px de más por lado como tope) vía el pseudo-elemento ::before, sin
       agrandar el recuadro visible */
    function poneZonaTactil(el) {
        var w = parseFloat(el.style.width) || 0;
        var h = parseFloat(el.style.height) || 0;
        var z = Math.min(32, Math.max(12, Math.ceil((44 - w) / 2), Math.ceil((44 - h) / 2)));
        el.style.setProperty('--zona', '-' + z + 'px');
    }

    lienzo.addEventListener('click', function (e) {
        if (grabando) return;
        var idx = cajaTextoBajo(e);
        if (idx >= 0 && idx !== textoSel) seleccionaTexto(idx);
    });

    /* M2 · al tocar el lienzo se suelta el campo con foco: si no, el navegador
       «revela» el textarea (fuera de pantalla) y tira de la página hacia el
       formulario en mitad del arrastre —ese salto era parte de lo raro— */
    function desenfocaCampo() {
        var a = document.activeElement;
        if (a && a !== document.body && typeof a.blur === 'function') a.blur();
    }

    lienzo.addEventListener('pointerdown', function (e) {
        desenfocaCampo();   // M2: también cierra el teclado al tocar en móvil
        if (grabando || e.pointerType === 'touch') return;   // en táctil manda el scroll
        var idx = cajaTextoBajo(e);
        if (idx < 0) return;
        if (idx !== textoSel) seleccionaTexto(idx);
        iniciaArrastreTexto(e);   // M2: delta desde donde se agarra
        lienzoArrastrando = true;
        try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
        e.preventDefault();
    });

    /* M1: el seguimiento vive en window para que el arrastre continúe aunque
       el puntero salga del lienzo o empiece sobre la manija del contenido */
    window.addEventListener('pointermove', function (e) {
        if (!lienzoArrastrando) return;
        arrastraTextoA(e);
    });

    ['pointerup', 'pointercancel'].forEach(function (ev) {
        window.addEventListener(ev, function (e) {
            if (!lienzoArrastrando) return;
            lienzoArrastrando = false;
            textoArrastreBase = null;   // M2
            try { lienzo.releasePointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
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
        poneZonaTactil(manijaContenido);   // M1: zona de toque hasta 44 px
    }

    /* ---------- M2 · mover y escalar el contenido como en tet1 ---------- */
    /* El contenido se agarra DONDE se toca (delta: sigue al dedo sin saltar)
       y las asas de las esquinas escalan dejando la esquina opuesta clavada,
       igual que la selección de objetos de Fabric en tet1. Mismos límites de
       siempre: el centro no sale del cuerpo y el escalado va de 30 % a 300 %. */
    function contPosClamp(x, y) {
        var z = zonaDibujo();
        return {
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(z.y / lienzo.height,
                Math.min((z.y + z.h) / lienzo.height, y))
        };
    }

    function iniciaArrastreContenido(e) {
        contArrastreBase = {
            x: e.clientX, y: e.clientY,
            px: cajaContenido.x / lienzo.width,   // M2: el centro tal y como se dibuja
            py: cajaContenido.y / lienzo.height
        };
    }

    function iniciaRedimContenido(e, esq) {
        var rr = lienzo.getBoundingClientRect();
        var f = rr.width / lienzo.width;
        var sX = (esq === 'se' || esq === 'ne') ? 1 : -1;
        var sY = (esq === 'se' || esq === 'sw') ? 1 : -1;
        // centro y semieje del contenido en coordenadas de pantalla
        var c0 = { x: rr.left + cajaContenido.x * f, y: rr.top + cajaContenido.y * f };
        var v0 = { x: sX * cajaContenido.w * f / 2, y: sY * cajaContenido.h * f / 2 };
        // esquina opuesta (la que se queda clavada) y distancia de referencia
        var q = { x: c0.x - v0.x, y: c0.y - v0.y };
        var dx = e.clientX - q.x, dy = e.clientY - q.y;
        contRedimBase = {
            esq: esq, q: q, k0: Math.sqrt(dx * dx + dy * dy) || 1,
            c0: c0, v0: v0, esc0: contEsc
        };
        contAsa = esq;
        contArrastrando = false;
        contArrastreBase = null;
    }

    function redimContenidoA(e) {
        var b = contRedimBase;
        if (!b) return;
        var dx = e.clientX - b.q.x, dy = e.clientY - b.q.y;
        var k = Math.sqrt(dx * dx + dy * dy) / b.k0;
        // pasos del 5 %: exactamente la misma rejilla y rango que el deslizador
        contEsc = Math.max(0.3, Math.min(3, Math.round(b.esc0 * k * 20) / 20));
        var k2 = b.esc0 ? contEsc / b.esc0 : 1;
        // el centro se reubica para que la esquina opuesta no se mueva
        var nx = b.c0.x + (k2 - 1) * b.v0.x;
        var ny = b.c0.y + (k2 - 1) * b.v0.y;
        var rr = lienzo.getBoundingClientRect();
        contPos = contPosClamp((nx - rr.left) / rr.width, (ny - rr.top) / rr.height);
        inpEscContenido.value = String(Math.round(contEsc * 100));
        valContenido.textContent = inpEscContenido.value + ' %';   // M1
        redibujarArrastre();
        actualizaManijaContenido();
    }

    manijaContenido.addEventListener('pointerdown', function (e) {
        if (!noticiaActiva || grabando) return;
        desenfocaCampo();   // M2: el campo con foco no debe tirar de la página
        /* M2: agarrando una asa → escalar (la esquina opuesta se queda fija) */
        var esq = e.target && e.target.getAttribute ? e.target.getAttribute('data-esq') : null;
        if (esq) {
            iniciaRedimContenido(e, esq);
            try { manijaContenido.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
            e.preventDefault();
            return;
        }
        /* M1: si hay un texto encima, manda el texto —el dedo lo selecciona y
           el ratón lo arrastra—; el contenido solo se arrastra sin texto encima */
        var idx = cajaTextoBajo(e);
        if (idx >= 0) {
            if (idx !== textoSel) seleccionaTexto(idx);
            if (e.pointerType === 'touch') return;   // en táctil: el toque selecciona
            iniciaArrastreTexto(e);   // M2: delta desde el punto de agarre
            lienzoArrastrando = true;
            try { manijaContenido.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
            e.preventDefault();
            return;
        }
        iniciaArrastreContenido(e);   // M2: sigue al dedo desde el agarre
        contArrastrando = true;
        try { manijaContenido.setPointerCapture(e.pointerId); } catch (err) { /* id sintético */ }
        e.preventDefault();
    });
    /* M1: en táctil el toque sobre un texto —aunque esté dibujado sobre el
       contenido de Tet News— lo selecciona, igual que en el resto del lienzo */
    manijaContenido.addEventListener('click', function (e) {
        if (grabando) return;
        var idx = cajaTextoBajo(e);
        if (idx >= 0 && idx !== textoSel) seleccionaTexto(idx);
    });
    manijaContenido.addEventListener('pointermove', function (e) {
        if (contAsa) { redimContenidoA(e); return; }
        if (!contArrastrando) return;
        var b = contArrastreBase;
        if (!b) return;
        var r = lienzo.getBoundingClientRect();
        // M2: delta — el contenido se queda bajo el dedo desde el agarre
        contPos = contPosClamp(
            b.px + (e.clientX - b.x) / r.width,
            b.py + (e.clientY - b.y) / r.height
        );
        redibujarArrastre();
        actualizaManijaContenido();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
        manijaContenido.addEventListener(ev, function (e) {
            if (!contArrastrando && !contAsa) return;
            contArrastrando = false;
            contAsa = null;
            contArrastreBase = null;
            contRedimBase = null;
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
            dur: 0,
            color: '#ffffff',   // F9
            fuente: 'sistema',  // F9
            peso: 'negrita'     // F9
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
        inpTxtColor.value = t.color || '#ffffff';   // F9
        selTxtFuente.value = FUENTES_VIDEO[t.fuente] ? t.fuente : 'sistema';
        selTxtPeso.value = PESOS_VIDEO[t.peso] ? t.peso : 'negrita';
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

    [[selTxtPos, 'pos'], [selTxtAnim, 'anim'], [selTxtSalida, 'salida'],
     [selTxtFuente, 'fuente'], [selTxtPeso, 'peso']].forEach(function (par) {   // F9: +fuente y peso
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

    /* F9: el color se aplica en vivo mientras el selector está en pantalla */
    ['input', 'change'].forEach(function (ev) {
        inpTxtColor.addEventListener(ev, function () {
            var t = textoActual();
            if (!t) return;
            t.color = inpTxtColor.value;
            repintarSuperp();
        });
    });

    [[inpTxtTam, 'tam', 2, 25, 7],
     [inpTxtAnimDur, 'animDur', 0.2, 5, 1],
     [inpTxtSalidaDur, 'salidaDur', 0.2, 5, 0.5],
     [inpTxtInicio, 'inicio', 0, MAX_TOTAL_SEG, 0],
     [inpTxtDur, 'dur', 0, MAX_TOTAL_SEG, 0]].forEach(function (cfg) {
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
    pintaAjusteRapido();   // M2: resalta «Llenar»/«Ajustar» según el ajuste inicial

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
       viaja en la pista añadida desde Web Audio). F10: avc1 va primero y
       avc3 queda de reserva —WhatsApp, Instagram y Facebook en el móvil
       decodifican mejor el MP4 con los parámetros solo en avcC— y la
       advertencia de Chrome que motivaba avc3 («the codec description is
       not supposed to change…») ya no aparece al grabar avc1 con audio */
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
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4;codecs=avc3.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc3,mp4a.40.2',
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
        if (capturando) {   // F8
            aviso('Espera a que termine la captura de la pestaña', 'info');
            return;
        }
        if (!soportado) {
            aviso('Tu navegador no permite crear vídeos', 'danger');
            return;
        }
        if (videoCargado) {
            var r = validadorRecorte();   // E5b: clips y suma del montaje
            if (!r.ok) {
                aviso(r.msg, 'warning');
                return;
            }
            return crearVideoRecorte();
        }
        if (!imagenes.length) return;
        var d = calculoDuracion();
        if (d.total > MAX_TOTAL_SEG) {
            aviso('Máximo ' + MINUTOS_MAX + ' minutos: reduce la duración o el número de imágenes', 'warning');
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
        detenerMusica();   // F6: corta la música al terminar, fallar o cancelar
        pantallaDespierta(false);   // M4: termina cualquier grabación en marcha
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
        /* E5b: la grabación recorre los clips del montaje; al terminar el
           reproductor vuelve al clip que estaba resaltado antes de empezar */
        if (videoCargado) {
            var vuelve = (idxAntesRender >= 0 && colaVideos[idxAntesRender])
                ? idxAntesRender : idxActivo;
            idxAntesRender = -1;
            if (colaVideos[vuelve]) activaClip(vuelve);
        }
        actualizaCrear();
        actualizarBarra();
        reiniciarPreview();
    }

    function fallo(msg) {
        console.warn('video: ' + msg);
        aviso(msg, 'danger');
        limpiar();
    }

    /* ---------- M3 · el resultado no se pierde ---------- */
    /* Antes el blob solo vivía en la pestaña: si Chrome mataba la pestaña
       (frecuente en el móvil) el vídeo se perdía sin más. Ahora el último
       resultado se guarda en IndexedDB y se restaura al volver a abrir;
       todo con try/catch para que sin IDB (file://, modo privado) la app
       siga funcionando igual que siempre. */
    function idbVideo(cb) {
        var req;
        try {
            req = indexedDB.open('tet-video', 1);
        } catch (e) { return cb(null); }
        req.onupgradeneeded = function () {
            var db = req.result;
            if (!db.objectStoreNames.contains('resultados')) db.createObjectStore('resultados');
        };
        req.onsuccess = function () { cb(req.result); };
        req.onerror = function () { cb(null); };
        req.onblocked = function () { cb(null); };
    }

    function guardaUltimo(blob, nombre, tipo) {
        idbVideo(function (db) {
            if (!db) return;
            try {
                var tx = db.transaction('resultados', 'readwrite');
                tx.objectStore('resultados').put(
                    { blob: blob, nombre: nombre, tipo: tipo, fecha: Date.now() }, 'ultimo');
                tx.oncomplete = function () { try { db.close(); } catch (e) { } };
            } catch (e) { try { db.close(); } catch (e2) { } }
        });
    }

    function borraUltimo() {
        idbVideo(function (db) {
            if (!db) return;
            try {
                var tx = db.transaction('resultados', 'readwrite');
                tx.objectStore('resultados').delete('ultimo');
                tx.oncomplete = function () { try { db.close(); } catch (e) { } };
            } catch (e) { try { db.close(); } catch (e2) { } }
        });
    }

    /* F10 · nombre de archivo único con fecha y hora: en el móvil cada
       render cae en Descargas y con «tet.mp4» fijo los archivos se pisan
       (o el sistema le añade « (1)»); las apps sociales distinguen mejor
       un nombre único. La comparte el botón «Compartir vídeo»: usa el
       mismo aDesc.download */
    function nombreConFecha(ext) {
        var d = new Date();
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return 'tet-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' +
            p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) +
            p(d.getSeconds()) + '.' + ext;
    }

    /* pinta el bloque de resultado desde un blob (recién grabado o
       recuperado de IndexedDB); sinScroll = al restaurar al abrir */
    function muestraResultado(blob, tipo, sinScroll) {
        if (urlVideo) URL.revokeObjectURL(urlVideo);
        urlVideo = URL.createObjectURL(blob);
        blobVideo = blob;
        var ext = (tipo === 'video/mp4') ? 'mp4' : 'webm';
        aDesc.href = urlVideo;
        aDesc.download = nombreConFecha(ext);
        txtDesc.textContent = 'Descargar vídeo ' + ext.toUpperCase() +
            ' (' + Math.round(blob.size / 1024) + ' KB)';
        repro.src = urlVideo;
        repro.hidden = false;
        resWrap.hidden = false;
        if (!sinScroll) resWrap.scrollIntoView({ block: 'nearest' });
        guardaUltimo(blob, aDesc.download, tipo);
    }

    function recuperaUltimo() {
        idbVideo(function (db) {
            if (!db) return;
            try {
                var req = db.transaction('resultados', 'readonly')
                    .objectStore('resultados').get('ultimo');
                req.onsuccess = function () {
                    try { db.close(); } catch (e) { }
                    var reg = req.result;
                    if (!reg || !reg.blob || !reg.blob.size || blobVideo) return;
                    muestraResultado(reg.blob, reg.tipo || 'video/mp4', true);
                    aviso('Recuperamos «' + (reg.nombre || 'tet') +
                        '»: seguía guardado en este equipo', 'info');
                };
                req.onerror = function () { try { db.close(); } catch (e) { } };
            } catch (e) { }
        });
    }

    btnDescartar.addEventListener('click', function () {
        repro.pause();
        repro.removeAttribute('src');
        repro.load();
        if (urlVideo) URL.revokeObjectURL(urlVideo);
        urlVideo = null;
        blobVideo = null;
        aDesc.href = '#';
        resWrap.hidden = true;
        borraUltimo();
        aviso('Vídeo descartado', 'info');
    });

    recuperaUltimo();

    /* ---------- M4 · peso del archivo y grabación estable ---------- */
    /* Antes: 8 Mbps fijos para todo —un minuto de 1080p salía a ~60 MB—.
       Ahora la tasa la da la fórmula bits = píxeles × fotogramas × calidad,
       según el selector «Calidad del vídeo», con suelo de 400 kbps para
       lienzos pequeños. Y con wake lock: si el móvil se apagaba en mitad de
       la grabación en tiempo real, los rAF se congelaban y el vídeo se
       perdía. Todo protegido: sin la API o sin permiso, se avisa y sigue. */
    var BPP_CALIDAD = { ligiana: 0.03, media: 0.06, alta: 0.1 };
    function bitrateSalida(ancho, alto, fps) {
        var bpp = BPP_CALIDAD[selCalidad.value] || BPP_CALIDAD.media;
        if (!(fps > 0)) fps = FPS;
        return Math.max(400000, Math.round(ancho * alto * fps * bpp));
    }

    var wakeLock = null;
    var quiereDespierta = false;
    function pantallaDespierta(si) {
        quiereDespierta = !!si;
        if (!si) {
            if (wakeLock) {
                var w = wakeLock;
                wakeLock = null;
                try { w.release(); } catch (e) { }
            }
            return;
        }
        if (wakeLock) return;
        var avisa = function () {
            aviso('No se pudo mantener la pantalla encendida: no la apagues ' +
                'hasta que termine la grabación', 'info');
        };
        if (!navigator.wakeLock) return avisa();
        try {
            navigator.wakeLock.request('screen').then(function (w) {
                if (!quiereDespierta) { try { w.release(); } catch (e) { } return; }
                wakeLock = w;
                w.addEventListener('release', function () {
                    if (wakeLock === w) wakeLock = null;
                });
            }).catch(avisa);
        } catch (e) { avisa(); }
    }
    document.addEventListener('visibilitychange', function () {
        /* el navegador suelta el wake lock al ocultar la pestaña: al volver,
           si aún estamos grabando, hay que pedirlo otra vez */
        if (document.visibilityState === 'visible' && quiereDespierta) pantallaDespierta(true);
    });

    function crearVideo() {
        var durMs = Math.max(Math.round(MIN_POR_IMAGEN * 1000),
            Math.round(calculoDuracion().porImagen * 1000));
        var total = durMs * imagenes.length;
        var hayMusica = preparaMusica(total / 1000);   // F6
        var mime = elegirMime(hayMusica) || elegirMime(false);
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
        pintaBotonDirecto();   // E2: no se puede grabar en directo mientras hay render

        var d = dimsSalida();
        if (d.reducido) {
            aviso('Salida reducida a ' + d.w + '×' + d.h + ' px para que el vídeo no sea gigante', 'info');
        }
        lienzo.width = d.w;
        lienzo.height = d.h;

        dibujarEn(0, durMs);

        var stream = lienzo.captureStream(FPS);
        if (hayMusica && audioDest) {
            audioDest.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
        }
        var mimeUsado = mime;
        var chunks = [];
        var rec;
        try {
            rec = new MediaRecorder(stream, { mimeType: mimeUsado, videoBitsPerSecond: bitrateSalida(lienzo.width, lienzo.height, FPS) });
        } catch (e) {
            var mv = elegirMime(false);
            if (!hayMusica || !mv) {
                detenerMusica();
                return fallo('No se pudo iniciar la grabación en este navegador');
            }
            try {
                stream = lienzo.captureStream(FPS);   // stream limpio, sin audio
                rec = new MediaRecorder(stream, { mimeType: mv, videoBitsPerSecond: bitrateSalida(lienzo.width, lienzo.height, FPS) });
                mimeUsado = mv;
                detenerMusica();                     // la música no entra: no iniciarla
                hayMusica = false;
            } catch (e2) {
                detenerMusica();
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
            muestraResultado(blob, tipo);   // M3: pinta el bloque y lo persiste en IDB
            aviso('Vídeo listo: ' + fmt(total / 1000) + ' s · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
        };

        progWrap.hidden = false;
        barra.style.width = '0%';
        barra.textContent = '0%';
        estado.textContent = 'Grabando…';

        var t0 = performance.now();
        rec.start(200);
        iniciaMusica();   // F6: la música entra al empezar a grabar
        pantallaDespierta(true);   // M4: que no se apague la pantalla al grabar

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

    /* ---------- E2 · grabar el lienzo en directo ---------- */
    /* A diferencia de «Crear vídeo» (línea de tiempo fija), aquí se graba lo
       que el lienzo muestra ahora mismo —plantilla animada o edición en
       directo— hasta que se pulsa Detener. Misma tubería: captureStream +
       MediaRecorder con autodetección de códec (máx. 5 minutos). */
    var grabandoDirecto = false;
    var t0Directo = 0;
    var segsDirecto = 0;
    var segDirectoUlt = -1;

    function hayContenidoDirecto() {
        return !!(imagenes.length || videoCargado);
    }

    function pintaBotonDirecto() {
        contDirecto.hidden = !soportado;
        if (!soportado) return;
        if (grabandoDirecto) {
            btnDirecto.disabled = false;   // mientras graba, el botón es «Detener»
            btnDirecto.classList.remove('btn-outline-danger');
            btnDirecto.classList.add('btn-danger');
            iconoDirecto.className = 'fas fa-stop';
            txtDirecto.textContent = 'Detener (' + formatoAudio(Math.max(0, segDirectoUlt)) + ')';
            return;
        }
        btnDirecto.classList.remove('btn-danger');
        btnDirecto.classList.add('btn-outline-danger');
        iconoDirecto.className = 'fas fa-record-vinyl';
        txtDirecto.textContent = 'Grabar en directo';
        var libre = !grabando && !capturando && !pidiendo && hayContenidoDirecto();
        btnDirecto.disabled = !libre;
        btnDirecto.title = !hayContenidoDirecto()
            ? 'Agrega imágenes o un vídeo para grabar el lienzo'
            : libre ? 'Graba lo que se ve en el lienzo hasta que pulses Detener (máx. ' + MINUTOS_MAX + ' min)'
                : 'Espera a que termine lo que está en marcha';
    }

    btnDirecto.addEventListener('click', function () {
        if (grabandoDirecto) return paraDirecto();
        iniciaDirecto();
    });

    function iniciaDirecto() {
        if (grabandoDirecto || grabando || capturando || pidiendo) {
            aviso('Espera a que termine lo que está en marcha', 'info');
            return;
        }
        if (!soportado) {
            aviso('Tu navegador no permite grabar vídeo (MediaRecorder)', 'danger');
            return;
        }
        if (!hayContenidoDirecto()) {
            aviso('Agrega imágenes o un vídeo para grabar el lienzo', 'info');
            return;
        }

        var audio = videoCargado ? conectarAudio() : null;   // sonido del vídeo fuente
        var hayMusica = preparaMusica(MAX_TOTAL_SEG);   // F6: en bucle; corta al parar
        var mime = elegirMime(!!audio || hayMusica) || elegirMime(false);
        if (!mime) {
            detenerMusica();
            return aviso('No hay códec de vídeo disponible en este navegador', 'danger');
        }

        grabando = true;
        grabandoDirecto = true;
        cancelado = false;
        segsDirecto = 0;
        segDirectoUlt = -1;
        btnCrear.disabled = true;   // como E1: nada de renders mientras se graba
        resWrap.hidden = true;
        detenerPreview();           // este tick lleva el dibujo (repintar cada
                                    // fotograma: sin repaint captureStream corta)

        var d = dimsSalida();
        if (lienzo.width !== d.w || lienzo.height !== d.h) {
            lienzo.width = d.w;
            lienzo.height = d.h;
            if (videoCargado) {
                dibujarFrame(vidFuente);   // F10: pinta aunque la fuente
                                           // aún no tenga fotogramas
            } else {
                dibujarEn(0, durMsPorImagen());   // fotograma semilla del stream
            }
        }

        var stream = lienzo.captureStream(FPS);
        if ((audio || hayMusica) && audioDest) {
            audioDest.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
        }
        var mimeUsado = mime;
        var chunks = [];
        var rec;
        try {
            rec = new MediaRecorder(stream, { mimeType: mimeUsado, videoBitsPerSecond: bitrateSalida(lienzo.width, lienzo.height, FPS) });
        } catch (e) {
            var mv = elegirMime(false);
            if (!(audio || hayMusica) || !mv) {
                grabando = false;
                grabandoDirecto = false;
                detenerMusica();
                return fallo('No se pudo iniciar la grabación en este navegador');
            }
            try {
                stream = lienzo.captureStream(FPS);   // stream limpio, sin audio
                rec = new MediaRecorder(stream, { mimeType: mv, videoBitsPerSecond: bitrateSalida(lienzo.width, lienzo.height, FPS) });
                mimeUsado = mv;
                detenerMusica();                      // la música no entra: no iniciarla
                hayMusica = false;
            } catch (e2) {
                grabando = false;
                grabandoDirecto = false;
                detenerMusica();
                return fallo('No se pudo iniciar la grabación en este navegador');
            }
        }
        recAct = rec;
        rec.ondataavailable = function (e) {
            if (e.data && e.data.size) chunks.push(e.data);
        };
        rec.onstop = function () {
            grabandoDirecto = false;
            if (cancelado) {
                aviso('Grabación cancelada', 'info');
                return limpiar();
            }
            var tipo = mimeUsado.split(';')[0];
            var blob = new Blob(chunks, { type: tipo });
            if (!blob.size) return fallo('La grabación salió vacía');
            muestraResultado(blob, tipo);   // M3: pinta el bloque y lo persiste en IDB
            aviso('Grabación directa: ' + fmt(segsDirecto) + ' s · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
        };

        t0Directo = performance.now();
        rec.start(200);
        iniciaMusica();   // F6: la música entra al empezar a grabar
        pantallaDespierta(true);   // M4: que no se apague la pantalla al grabar
        pintaBotonDirecto();
        aviso('Grabando el lienzo… pulsa «Detener» cuando quieras parar (máx. ' + MINUTOS_MAX + ' min)', 'info');

        function tickDirecto() {
            if (!grabandoDirecto) return;
            var t = performance.now() - t0Directo;
            if (t >= MAX_TOTAL_SEG * 1000) {
                segsDirecto = MAX_TOTAL_SEG;
                grabandoDirecto = false;
                if (recAct && recAct.state !== 'inactive') recAct.stop();
                aviso('Máximo ' + MINUTOS_MAX + ' minutos: la grabación directa se corta ahí', 'info');
                return;
            }
            /* con la previa detenida aquí se bombea el dibujo en ambos modos:
               repintar cada fotograma mantiene el stream vivo (si el lienzo
               no cambia, captureStream deja de emitir y el clip sale corto) */
            if (videoCargado) {
                dibujarFrame(vidFuente);   // F10: el stream no se apaga si
                                           // la fuente se queda sin datos
            } else if (imagenes.length) {
                dibujarEn(t % (durMsPorImagen() * imagenes.length), durMsPorImagen());
            }
            var s = Math.floor(t / 1000);
            if (s !== segDirectoUlt) {
                segDirectoUlt = s;
                segsDirecto = s;
                txtDirecto.textContent = 'Detener (' + formatoAudio(s) + ')';
            }
            rafAct = requestAnimationFrame(tickDirecto);
        }
        rafAct = requestAnimationFrame(tickDirecto);
    }

    function paraDirecto() {
        if (!grabandoDirecto) return;
        segsDirecto = Math.max(segDirectoUlt, Math.floor((performance.now() - t0Directo) / 1000));
        grabandoDirecto = false;
        if (rafAct) {
            cancelAnimationFrame(rafAct);
            rafAct = null;
        }
        if (recAct && recAct.state !== 'inactive') recAct.stop();
    }

    pintaBotonDirecto();

    /* ---------- F6 · música de fondo ---------- */
    /* El archivo subido se decodifica al elegirlo; al grabar, un
       AudioBufferSourceNode (en bucle si es más corto) entra en el mismo
       audioDest que ya usa el recorte, así el grabador lleva una única pista
       de audio. No suena en la vista previa: solo se mezcla en la grabación. */
    function formatoAudio(seg) {
        var m = Math.floor(seg / 60);
        var s = Math.round(seg % 60);
        if (s >= 60) { m += 1; s = 0; }
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function pintaMusica() {
        var f = inpMusica.files && inpMusica.files[0];
        var hay = !!(f && musicaBuf);
        filaMusica.hidden = !hay;
        nombreMusica.textContent = hay ? f.name + ' · ' + formatoAudio(musicaBuf.duration) : '';
    }

    function preparaCtxAudio() {
        if (audioCtx && audioDest) return true;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        if (!audioCtx) audioCtx = new AC();
        if (!audioDest) audioDest = audioCtx.createMediaStreamDestination();
        return true;
    }

    function decodificaMusica(datos, nombre) {
        var hecho = false;
        var ok = function (buf) {
            if (hecho) return;
            hecho = true;
            musicaBuf = buf;
            pintaMusica();
        };
        var mal = function () {
            if (hecho) return;
            hecho = true;
            aviso('No se pudo decodificar «' + nombre + '»: prueba con MP3 o WAV', 'danger');
        };
        try {
            var r = audioCtx.decodeAudioData(datos, ok, mal);
            if (r && r.then) r.then(ok).catch(mal);   // Safari solo promesa
        } catch (e) {
            mal();
        }
    }

    inpMusica.addEventListener('change', function () {
        var f = inpMusica.files && inpMusica.files[0];
        musicaBuf = null;
        pintaMusica();
        if (!f) return;
        if (!(/^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(f.name))) {
            aviso('«' + f.name + '» no es un audio', 'warning');
            return;
        }
        if (!preparaCtxAudio()) {
            aviso('Tu navegador no soporta Web Audio', 'warning');
            return;
        }
        var lector = new FileReader();
        lector.onload = function () { decodificaMusica(lector.result, f.name); };
        lector.onerror = function () { aviso('No se pudo leer «' + f.name + '»', 'danger'); };
        lector.readAsArrayBuffer(f);
    });

    btnQuitarMusica.addEventListener('click', function () {
        inpMusica.value = '';
        musicaBuf = null;
        pintaMusica();
    });

    volMusica.addEventListener('input', function () {
        volValor.textContent = volMusica.value + ' %';
        if (musicaGanancia) musicaGanancia.gain.value = parseInt(volMusica.value, 10) / 100;
    });

    /* Prepara la música para la grabación que va a empezar y devuelve si hay.
       Se llama desde el clic de «Crear vídeo» (gesto del usuario ⇒ contexto
       despierto en iOS). La fuente de buffer sirve una sola vez: cada
       grabación crea la suya. segTotal es la duración de la salida. */
    function preparaMusica(segTotal) {
        detenerMusica();   // por si quedó algo de una grabación anterior
        if (!musicaBuf) return false;
        try {
            if (!preparaCtxAudio()) return false;
            if (audioCtx.state === 'suspended') {
                var p = audioCtx.resume();
                if (p && p.catch) p.catch(function () { });
            }
            var nodo = audioCtx.createBufferSource();
            nodo.buffer = musicaBuf;
            nodo.loop = musicaBuf.duration < segTotal;   // más corta ⇒ bucle
            var gan = audioCtx.createGain();
            gan.gain.value = parseInt(volMusica.value, 10) / 100;
            nodo.connect(gan);
            gan.connect(audioDest);   // al grabador, no a los altavoces
            musicaNodo = nodo;
            musicaGanancia = gan;
            return true;
        } catch (e) {
            detenerMusica();
            return false;
        }
    }

    function iniciaMusica() {
        if (!musicaNodo) return;
        try { musicaNodo.start(0); } catch (e) { }
    }

    function detenerMusica() {
        if (musicaNodo) {
            try { musicaNodo.stop(); } catch (e) { }   // sin start() esto lanza
            try { musicaNodo.disconnect(); } catch (e) { }
        }
        if (musicaGanancia) {
            try { musicaGanancia.disconnect(); } catch (e) { }
        }
        musicaNodo = null;
        musicaGanancia = null;
    }

    /* ---------- E3 · recorte: regrabar el rango elegido ---------- */
    /* El sonido del propio vídeo pasa por Web Audio para que el grabador lo
       lleve al resultado. createMediaElementSource solo puede hacerse UNA vez
       por elemento: se crea en el primer clic de grabar (con gesto del
       usuario, así el AudioContext arranca despierto). */
    function conectarAudio() {
        try {
            // F6: el ctx/dest pueden existir ya por la música; el
            // createMediaElementSource sigue siendo de UN solo uso
            if (!preparaCtxAudio()) return null;
            if (!fuenteAudio) {
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
            return null;
        }
    }

    vidFuente.addEventListener('play', function () {
        if (audioCtx && audioCtx.state === 'suspended') {
            var p = audioCtx.resume();
            if (p && p.catch) p.catch(function () {});
        }
    });

    /* E5b: plan de la salida — un segmento por clip con su recorte [ini, fin],
       desde = instante del segmento medido desde el inicio de la salida y
       desfase = lo que mide el propio clip una vez recortado menos su inicio
       (así desfase + tiempo de origen = instante de salida). Con un solo
       vídeo devuelve un único segmento idéntico al recorte de siempre. */
    function segmentosDeMontaje() {
        var segs = [];
        var salida = 0;
        for (var i = 0; i < colaVideos.length; i++) {
            var c = colaVideos[i];
            var r = recorteClip(c);
            if (r.fin - r.inicio > 0.03) {
                segs.push({ clip: c, idx: i, a: r.inicio, b: r.fin,
                            desde: salida, desfase: salida });
                salida += r.fin - r.inicio;
            }
        }
        return segs;
    }

    function crearVideoRecorte() {
        var audio = conectarAudio();
        var total = Math.round(totalRecorte() * 1000);   // E5b: suma de recortes
        var hayMusica = preparaMusica(total / 1000);   // F6
        var mime = elegirMime(!!audio || hayMusica) || elegirMime(false);
        if (!mime) {
            aviso('No hay códec de vídeo disponible en este navegador', 'danger');
            return;
        }

        /* E5b: plan de segmentos — el recorte de cada clip, en orden */
        var segmentos = segmentosDeMontaje();
        if (!segmentos.length) {
            aviso('No hay vídeo dentro del rango elegido', 'warning');
            return;
        }
        var segIdx = 0;
        var cambiando = false;   // E5: cambio de clip → el lienzo se congela
        var primerSeg = true;

        grabando = true;
        cancelado = false;
        idxAntesRender = idxActivo;   // E5b: se recupera al terminar
        btnCrear.disabled = true;
        actualizaCrear();   // E5b: inputs de recorte inertes mientras se graba
        btnCancelar.hidden = false;
        resWrap.hidden = true;
        actualizarBarra();
        detenerPreview();
        pintaBotonDirecto();   // E2: no se puede grabar en directo mientras hay render
        vidFuente.pause();
        vidFuente.controls = false;   // sin controles mientras se graba

        var d = dimsSalida();
        if (d.reducido) {
            aviso('Salida reducida a ' + d.w + '×' + d.h + ' px para que el vídeo no sea gigante', 'info');
        }
        lienzo.width = d.w;
        lienzo.height = d.h;

        var stream = lienzo.captureStream(FPS);
        if ((audio || hayMusica) && audioDest) {
            audioDest.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
        }
        var chunks = [];
        var mimeUsado = mime;
        var rec;
        try {
            rec = new MediaRecorder(stream, { mimeType: mimeUsado, videoBitsPerSecond: bitrateSalida(lienzo.width, lienzo.height, FPS) });
        } catch (e1) {
            var mv = elegirMime(false);
            if (!audio || !mv) return fallo('No se pudo iniciar la grabación en este navegador');
            try {
                stream = lienzo.captureStream(FPS);   // stream limpio, sin audio
                rec = new MediaRecorder(stream, { mimeType: mv, videoBitsPerSecond: bitrateSalida(lienzo.width, lienzo.height, FPS) });
                mimeUsado = mv;
                detenerMusica();                      // F6: no entra, no se inicia
            } catch (e2) {
                detenerMusica();
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
            muestraResultado(blob, tipo);   // M3: pinta el bloque y lo persiste en IDB
            aviso('Vídeo recortado: ' + fmt(total / 1000) + ' s · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
        };

        progWrap.hidden = false;
        barra.style.width = '0%';
        barra.textContent = '0%';
        estado.textContent = 'Preparando…';

        /* E5: deja listo el segmento en marcha (fuente + posición) y
           reproduce; el primer segmento además enciende el grabador, la
           música y la pantalla despierta */
        function preparaSeg() {
            var s = segmentos[segIdx];
            /* E5b: el clip en marcha pasa a ser el activo —inputs, riel y
               dibujarFrame (desfase + su inicio) cuentan sobre él */
            idxActivo = s.idx;
            desfaseActivo = s.desfase;
            poneRecorteActivo();
            pintaCola();
            var busca = function () {
                if (vidFuente.readyState >= 2 && Math.abs(vidFuente.currentTime - s.a) < 0.05) {
                    return listoSeg();
                }
                var oy = function () {
                    vidFuente.removeEventListener('seeked', oy);
                    listoSeg();
                };
                vidFuente.addEventListener('seeked', oy);
                vidFuente.currentTime = s.a;
            };
            if (urlFuente === s.clip.url && vidFuente.readyState >= 1) return busca();
            // E5: el segmento es otro clip → cambiamos la fuente; mientras el
            // navegador lo prepara el tick no pinta y el lienzo conserva el
            // último fotograma (sin destello del color de fondo)
            cambiando = true;
            urlFuente = s.clip.url;
            vidFuente.src = s.clip.url;
            var om = function () {
                vidFuente.removeEventListener('loadedmetadata', om);
                if (!grabando) return;
                busca();
            };
            vidFuente.addEventListener('loadedmetadata', om);
        }

        function listoSeg() {
            if (!grabando) return;   // se canceló mientras buscaba la posición
            cambiando = false;
            if (primerSeg) {
                primerSeg = false;
                dibujarFrame(vidFuente);
                recAct.start(200);
                iniciaMusica();   // F6: la música entra al empezar a grabar
                pantallaDespierta(true);   // M4: que no se apague la pantalla al grabar
                estado.textContent = 'Grabando…';
            }
            var p = vidFuente.play();
            if (p && p.catch) {
                p.catch(function () {
                    fallo('El navegador no dejó reproducir el vídeo: toca el vídeo una vez y reintenta');
                });
            }
            rafAct = requestAnimationFrame(tickRec);
        }

        preparaSeg();

        function tickRec() {
            if (!grabando) return;
            if (cambiando) {   // E5: esperando al siguiente clip, lienzo congelado
                rafAct = requestAnimationFrame(tickRec);
                return;
            }
            var s = segmentos[segIdx];
            if (vidFuente.ended || vidFuente.currentTime >= s.b) {
                if (segIdx < segmentos.length - 1) {   // E5: sigue con el clip siguiente
                    segIdx++;
                    preparaSeg();
                    rafAct = requestAnimationFrame(tickRec);
                    return;
                }
                dibujarFrame(vidFuente);
                grabando = false;
                vidFuente.pause();
                if (recAct && recAct.state !== 'inactive') recAct.stop();
                return;
            }
            dibujarFrame(vidFuente);
            var t = Math.max(0, s.desde + (vidFuente.currentTime - s.a));
            var secs = total / 1000;   // E5b: la salida mide la suma de recortes
            var pct = Math.max(0, Math.min(100, Math.round(t / secs * 100)));
            barra.style.width = pct + '%';
            barra.textContent = pct + '%';
            estado.textContent = 'Grabando… ' + fmt(t) + ' / ' + fmt(secs) + ' s';
            rafAct = requestAnimationFrame(tickRec);
        }
    }
})();
