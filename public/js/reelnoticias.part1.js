/* Reel de noticias (reelnoticias.html) — portadas de tet 1 convertidas en un
   vídeo animado. Cada noticia entra con pop-up o zoom suave, el titular y la
   entradilla se animan al entrar y al salir, y se puede añadir un vídeo por
   noticia y música de fondo. Todo se dibuja en un solo canvas desde cero en
   cada fotograma y se graba con canvas.captureStream + MediaRecorder, sin
   dependencias y sin subir nada a ningún servidor. */
(function () {
    'use strict';

    var FPS = 30;
    var MAX_NOTICIAS = 12;
    var FUENTE = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';
    var BARRA_ANCHO_NAT = 1200;
    var BARRA_ALTO_NAT = 93;

    /* ---------- cabeceras de tet 1 ---------- */
    var BARRAS = [
        {
            url: './public/img/bars/tetnews_nuevo.jpg',
            nombre: 'tet news · noticias',
            fondo: '#1d2b43', fondo2: '#0b1220', acento: '#3ea6ff',
            texto: '#ffffff', caja: '#0b0f14'
        },
        {
            url: './public/img/bars/recomendaciones.jpg',
            nombre: 'Recomendaciones',
            fondo: '#2a1733', fondo2: '#120814', acento: '#ff8a3d',
            texto: '#ffffff', caja: '#140a18'
        },
        {
            url: './public/img/bars/recomendaciones_geek_bar.jpg',
            nombre: 'Recomendaciones geek',
            fondo: '#0f2a2a', fondo2: '#041414', acento: '#38d9a9',
            texto: '#ffffff', caja: '#061414'
        },
        {
            url: './public/img/bars/estrenos_streaming.png',
            nombre: 'Estrenos · streaming',
            fondo: '#3a1010', fondo2: '#140505', acento: '#ff6b6b',
            texto: '#ffffff', caja: '#1a0707'
        },
        {
            url: './public/img/bars/estrenos_streaming_rojo.png',
            nombre: 'Estrenos · rojo',
            fondo: '#3a1010', fondo2: '#140505', acento: '#ff5252',
            texto: '#ffffff', caja: '#1a0707'
        },
        {
            url: './public/img/bars/estrenos_streaming_azul.png',
            nombre: 'Estrenos · azul',
            fondo: '#0b1f3a', fondo2: '#040b16', acento: '#4dabf7',
            texto: '#ffffff', caja: '#06101f'
        },
        {
            url: './public/img/bars/tetnews.png',
            nombre: 'tet news · clásica',
            fondo: '#10243a', fondo2: '#050d18', acento: '#4dabf7',
            texto: '#ffffff', caja: '#07111d'
        }
    ];

    /* ---------- estado ---------- */
    var noticias = [];

    var ajustes = {
        formato: { w: 1080, h: 1920 },
        barra: BARRAS[0].url,
        coloresAuto: true,
        ajuste: 'cover',
        cajaTitulo: false,
        fondo: BARRAS[0].fondo,
        fondo2: BARRAS[0].fondo2,
        texto: BARRAS[0].texto,
        acento: BARRAS[0].acento,
        caja: BARRAS[0].caja,
        degradado: true,
        progreso: true,
        tarjetaFinal: true,
        zonaSegura: true,
        hold: 3.2,
        entrada: 0.9,
        salida: 0.6,
        cierre: 1.2,
        zoom: 0.06,
        animImg: 'zoom',
        animTitulo: 'subir',
        animDetalle: 'linea',
        salidaTexto: 'subir'
    };

    var tActual = 0;
    var reproduciendo = false;
    var rafPreview = null;
    var ultimoTs = 0;

    var grabando = false;
    var rec = null;
    var trozos = [];
    var rafGrab = null;
    var grabInicio = 0;
    var grabDur = 0;
    var pistaVideo = null;
    var proximoEnvio = 0;
    var cancelado = false;

    var musicaEl = null;
    var musicaUrl = null;
    var musicaNombre = '';
    var audioCtx = null;
    var fuenteMusica = null;
    var ganMusica = null;
    var destAudio = null;

    var urlResultado = null;
    var blobResultado = null;
    var nombreResultado = 'reel-noticias.mp4';
    var archivoResultado = null;

    var barraImg = null;
    var logoImg = null;
    var cacheImgs = {};

    /* ---------- DOM ---------- */
    var lienzo = document.getElementById('rn-lienzo');
    var ctx = lienzo.getContext('2d');
    var lista = document.getElementById('rn-lista');
    var btnPlay = document.getElementById('rn-play');
    var btnReiniciar = document.getElementById('rn-reiniciar');
    var rangoTiempo = document.getElementById('rn-tiempo');
    var reloj = document.getElementById('rn-reloj');
    var inpBarra = document.getElementById('rn-barra');
    var inpColoresAuto = document.getElementById('rn-colores-auto');
    var btnAgregar = document.getElementById('rn-agregar');
    var btnVaciar = document.getElementById('rn-vaciar');
    var selFormato = document.getElementById('rn-formato');
    var selAjuste = document.getElementById('rn-ajuste');
    var selCajaTitulo = document.getElementById('rn-caja-titulo');
    var inpFondo = document.getElementById('rn-fondo');
    var inpFondo2 = document.getElementById('rn-fondo2');
    var inpTexto = document.getElementById('rn-texto');
    var inpAcento = document.getElementById('rn-acento');
    var inpCaja = document.getElementById('rn-caja');
    var inpDegradado = document.getElementById('rn-degradado');
    var inpProgreso = document.getElementById('rn-progreso');
    var inpTarjetaFinal = document.getElementById('rn-tarjeta-final');
    var inpZonaSegura = document.getElementById('rn-zona-segura');
    var inpDuracion = document.getElementById('rn-duracion');
    var inpEntrada = document.getElementById('rn-entrada');
    var inpSalida = document.getElementById('rn-salida');
    var inpCierre = document.getElementById('rn-cierre');
    var inpZoom = document.getElementById('rn-zoom');
    var valDuracion = document.getElementById('rn-duracion-val');
    var valEntrada = document.getElementById('rn-entrada-val');
    var valSalida = document.getElementById('rn-salida-val');
    var valCierre = document.getElementById('rn-cierre-val');
    var valZoom = document.getElementById('rn-zoom-val');
    var selAnimImg = document.getElementById('rn-anim-img');
    var selAnimTitulo = document.getElementById('rn-anim-titulo');
    var selAnimDetalle = document.getElementById('rn-anim-detalle');
    var selSalidaTexto = document.getElementById('rn-salida-texto');
    var inpMusica = document.getElementById('rn-musica-archivo');
    var listaMusica = document.getElementById('rn-musica-lista');
    var btnQuitarMusica = document.getElementById('rn-musica-quitar');
    var nombreMusica = document.getElementById('rn-musica-nombre');
    var volMusica = document.getElementById('rn-musica-vol');
    var valVolMusica = document.getElementById('rn-musica-vol-val');
    var infoSalida = document.getElementById('rn-info-salida');
    var btnGrabar = document.getElementById('rn-grabar');
    var btnCancelar = document.getElementById('rn-cancelar');
    var estadoGrab = document.getElementById('rn-estado');
    var progWrap = document.getElementById('rn-progreso-grab');
    var barraProg = document.getElementById('rn-barra-prog');
    var progBar = progWrap ? progWrap.querySelector('.progress') : null;
    var resWrap = document.getElementById('rn-resultado');
    var videoRes = document.getElementById('rn-video-resultado');
    var btnDescargar = document.getElementById('rn-descargar');
    var btnCompartir = document.getElementById('rn-compartir');
    var btnDescartar = document.getElementById('rn-descartar');
    var pesoRes = document.getElementById('rn-peso');

    /* ---------- utilidades ---------- */
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function easeInOut(t) {
        t = clamp(t, 0, 1);
        return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOut(t) {
        t = clamp(t, 0, 1);
        return 1 - Math.pow(1 - t, 3);
    }

    function easeOutBack(t) {
        t = clamp(t, 0, 1);
        var c1 = 1.70158;
        var c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function suave(t) {
        t = clamp(t, 0, 1);
        return t * t * (3 - 2 * t);
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function seg(n) {
        return n.toFixed(1).replace('.', ',') + ' s';
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function rgba(hex, alfa) {
        var h = String(hex || '#000').replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (isNaN(n)) return 'rgba(0,0,0,' + alfa + ')';
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alfa + ')';
    }

    function rectRedondeado(c, x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        c.beginPath();
        if (typeof c.roundRect === 'function') {
            c.roundRect(x, y, w, h, r);
            return;
        }
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }

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
            '<button type="button" class="btn btn-close btn-close-white me-2 m-auto" aria-label="Cerrar"></button></div>';
        el.querySelector('.toast-body').textContent = msg;
        cont.appendChild(el);
        el.querySelector('.btn-close').addEventListener('click', function () { el.remove(); });
        setTimeout(function () { el.remove(); }, 5000);
    }

    /* ---------- imágenes de la interfaz y de file:// ---------- */
    function urlCanvas(url) {
        var mapa = window.TET_PLANTILLAS;
        if (location.protocol === 'file:' && mapa && mapa[url]) return mapa[url];
        return url;
    }

    function cargaImagen(url, cb) {
        if (cacheImgs[url]) { cb(cacheImgs[url]); return; }
        var img = new Image();
        img.onload = function () {
            cacheImgs[url] = img;
            cb(img);
        };
        img.onerror = function () { cb(null); };
        img.src = urlCanvas(url);
    }

    function cargarPlantillasData(cb) {
        if (location.protocol !== 'file:' || window.TET_PLANTILLAS) { cb(); return; }
        var sc = document.createElement('script');
        sc.src = './public/js/plantillas-data.js?v=p1';
        sc.async = true;
        sc.onload = function () { cb(); };
        sc.onerror = function () { cb(); };
        document.head.appendChild(sc);
    }

    /* ---------- modelo ---------- */
    function noticiaVacia(titulo, detalle) {
        return {
            titulo: titulo || '',
            detalle: detalle || '',
            img: null,
            imgUrl: null,
            video: null,
            videoUrl: null,
            videoNombre: '',
            ajuste: ''
        };
    }

    function noticiasIniciales() {
        return [
            noticiaVacia('OpenAI presenta su nueva generación de modelos',
                'La compañía ha presentado una nueva familia de modelos con mejor razonamiento, más contexto y respuestas más rápidas.'),
            noticiaVacia('Playwright se actualiza con mejoras para equipos',
                'La herramienta de pruebas de Microsoft estrena depuración más clara, trazas completas y ejecución paralela más sencilla.'),
            noticiaVacia('FLOW amplía sus herramientas de creación',
                'La plataforma de creación con inteligencia artificial lleva sus funciones a más dispositivos y nuevos planes de uso.')
        ];
    }

    noticias = noticiasIniciales();

    /* ---------- geometría ---------- */
    function geom(W, H) {
        var u = Math.min(W, H);
        var p = u * 0.055;
        var barH = W * BARRA_ALTO_NAT / BARRA_ANCHO_NAT;
        var ratio = H / W;
        var safeBottom = ajustes.zonaSegura
            ? (ratio > 1.6 ? u * 0.14 : (ratio > 1.05 ? u * 0.06 : u * 0.03))
            : u * 0.03;
        var contentTop = barH + u * 0.05;
        var contentBottom = H - safeBottom - u * 0.04;
        var area = {
            x: p,
            y: contentTop,
            w: W - 2 * p,
            h: Math.max(u * 0.2, contentBottom - contentTop)
        };
        var vertical = H > W * 0.92;
        if (vertical) {
            var frac = ratio > 1.6 ? 0.55 : (ratio > 1.15 ? 0.52 : 0.48);
            var imgH = area.h * frac;
            var imgV = { x: area.x, y: area.y, w: area.w, h: imgH };
            var txtV = {
                x: area.x,
                y: area.y + imgH + u * 0.05,
                w: area.w,
                h: area.h - imgH - u * 0.05
            };
            return {
                u: u, p: p, barH: barH, area: area, vertical: true,
                img: imgV, txt: txtV, safeBottom: safeBottom
            };
        }
        var imgW = area.w * 0.52;
        var imgH2 = { x: area.x, y: area.y, w: imgW, h: area.h };
        var txtH = {
            x: area.x + imgW + u * 0.055,
            y: area.y,
            w: area.w - imgW - u * 0.055,
            h: area.h
        };
        return {
            u: u, p: p, barH: barH, area: area, vertical: false,
            img: imgH2, txt: txtH, safeBottom: safeBottom
        };
    }

    /* ---------- tiempo ---------- */
    function entEfectiva() {
        return Math.max(0.05, Math.min(ajustes.entrada, ajustes.hold * 0.45));
    }

    function salEfectiva() {
        return Math.max(0.05, Math.min(ajustes.salida, ajustes.hold * 0.35));
    }

    function duracionTotal() {
        var n = noticias.length;
        if (!n) return entEfectiva() + (ajustes.tarjetaFinal ? ajustes.cierre : 0);
        return entEfectiva() + n * ajustes.hold + (ajustes.tarjetaFinal ? ajustes.cierre : 0);
    }

    function estadoEn(t) {
        var ent = entEfectiva();
        var sal = salEfectiva();
        var n = noticias.length;
        var D = duracionTotal();
        t = clamp(t, 0, D);
        if (!n) return { activos: [], fin: true, endP: 1 };

        var slotsEnd = ent + n * ajustes.hold;
        if (t >= slotsEnd) {
            var ep = ajustes.cierre > 0 ? clamp((t - slotsEnd) / ajustes.cierre, 0, 1) : 1;
            var activosFin = [];
            if (ajustes.tarjetaFinal && ep < 1) {
                activosFin.push({ i: n - 1, entryP: 1, exitP: 1 - ep, local: ajustes.hold });
            }
            return { activos: activosFin, fin: true, endP: easeOut(ep) };
        }

        var activos = [];
        for (var i = 0; i < n; i++) {
            var slotStart = ent + i * ajustes.hold;
            var slotEnd = slotStart + ajustes.hold;
            /* la primera noticia entra en la intro; las demás empiezan a
               entrar justo cuando la anterior empieza a salir, para que el
               cambio no deje un hueco vacío */
            var entryStart = i === 0 ? slotStart - ent : slotStart - sal;
            var entryP = clamp((t - entryStart) / ent, 0, 1);
            var exitP = 1;
            if (i < n - 1) {
                exitP = clamp((slotEnd - t) / sal, 0, 1);
            }
            if (entryP > 0 && exitP > 0) {
                activos.push({
                    i: i,
                    entryP: entryP,
                    exitP: exitP,
                    local: clamp(t - slotStart, 0, ajustes.hold)
                });
            }
        }
        return { activos: activos, fin: false, endP: 0 };
    }
