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
            noticiaVacia('Ajuste en Silicon Valley: la cautela sobre los costes de la IA frena la ambiciosa ronda de OpenAI.',
                'OpenAI ha completado el primer tramo de su nueva ronda de financiación tras cerrar 11.000 millones de dólares a una valoración de 1,25 billones. La noticia cobra peso porque evidencia un ajuste respecto al objetivo inicial de 30.000 millones, impulsado por las reservas de los inversores ante los astronómicos costes operativos y de infraestructura de la IA.'),
            noticiaVacia('Debate sobre Playwright y Chromium: Microsoft aclara la seguridad del navegador y la configuración del sandbox.',
                'El creador de contenido sobre seguridad Iván Pérez advirtió a la comunidad sobre el riesgo de ejecutar agentes de código e IA con Playwright debido a versiones atrasadas de Chromium y el sandbox deshabilitado por defecto. Microsoft respondió aclarando que las compilaciones fijadas existen deliberadamente para evitar que los tests E2E fallen ante cambios del navegador, mientras que herramientas como Playwright MCP usan el Chrome estable del sistema. La polémica afecta directamente a desarrolladores web, especialistas en QA automation e ingenieros que integran agentes de IA para navegar por páginas no confiables.'),
            noticiaVacia('FLOW',
                'Una conmovedora película de animación independiente que sigue a un gato solitario obligado a superar su miedo al agua uniendo fuerzas con otros animales en un mundo postapocalíptico.')
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
            var frac = ratio > 1.6 ? 0.50 : (ratio > 1.15 ? 0.48 : 0.44);
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

    /* ---------- texto ---------- */
    function parteTexto(texto, maxW, maxLineas) {
        var limpio = String(texto || '').replace(/\s+/g, ' ').trim();
        if (!limpio) return [];
        var palabras = limpio.split(' ');
        var lineas = [];
        var actual = '';
        for (var i = 0; i < palabras.length; i++) {
            var prueba = actual ? actual + ' ' + palabras[i] : palabras[i];
            if (!actual || ctx.measureText(prueba).width <= maxW) {
                actual = prueba;
            } else {
                lineas.push(actual);
                actual = palabras[i];
            }
        }
        if (actual) lineas.push(actual);
        if (maxLineas && lineas.length > maxLineas) {
            lineas = lineas.slice(0, maxLineas);
            var ultima = lineas[maxLineas - 1];
            while (ultima.length > 1 && ctx.measureText(ultima + '…').width > maxW) {
                ultima = ultima.slice(0, -1);
            }
            lineas[maxLineas - 1] = ultima.replace(/[\s,;:.\-]+$/, '') + '…';
        }
        return lineas;
    }

    function parteTextoPalabras(texto, maxW, maxLineas) {
        var limpio = String(texto || '').replace(/\s+/g, ' ').trim();
        if (!limpio) return [];
        var palabras = limpio.split(' ');
        var espacio = ctx.measureText(' ').width;
        var lineas = [];
        var actual = [];
        var ancho = 0;
        for (var i = 0; i < palabras.length; i++) {
            var w = ctx.measureText(palabras[i]).width;
            if (actual.length && ancho + espacio + w > maxW) {
                lineas.push(actual);
                actual = [];
                ancho = 0;
            }
            actual.push({ t: palabras[i], w: w });
            ancho += (actual.length > 1 ? espacio : 0) + w;
        }
        if (actual.length) lineas.push(actual);
        if (maxLineas && lineas.length > maxLineas) {
            lineas = lineas.slice(0, maxLineas);
            lineas[maxLineas - 1].push({ t: '…', w: ctx.measureText('…').width });
        }
        return lineas.map(function (linea) {
            var x = 0;
            linea.forEach(function (p) {
                p.x = x;
                x += p.w + espacio;
            });
            return { palabras: linea, ancho: Math.max(0, x - espacio) };
        });
    }

    function ajustaTitulo(texto, maxW, maxH, peso, tamMax, tamMin) {
        var tam = tamMax;
        var lineas = [];
        var lh = 0;
        var maxLineas = 5;
        for (var k = 0; k < 80; k++) {
            ctx.font = peso + ' ' + tam + 'px ' + FUENTE;
            lineas = parteTexto(texto, maxW, maxLineas);
            lh = tam * 1.08;
            if (lineas.length * lh <= maxH || tam <= tamMin) break;
            tam = Math.max(tamMin, tam - Math.max(1, tam * 0.055));
        }
        ctx.font = peso + ' ' + tam + 'px ' + FUENTE;
        lineas = parteTexto(texto, maxW, maxLineas);
        lh = tam * 1.08;
        var cabe = Math.max(1, Math.floor(maxH / lh));
        if (lineas.length > cabe) {
            lineas = lineas.slice(0, cabe);
            var ultima = lineas[cabe - 1];
            while (ultima.length > 1 && ctx.measureText(ultima + '…').width > maxW) {
                ultima = ultima.slice(0, -1);
            }
            lineas[cabe - 1] = ultima.replace(/[\s,;:.\-]+$/, '') + '…';
        }
        return { lineas: lineas, tam: tam, lh: lh, alto: lineas.length * lh };
    }

    function layoutTexto(c, i, geo, W, H) {
        var u = geo.u;
        var t = geo.txt;
        var vertical = geo.vertical;
        var ratio = H / W;
        var labelTam = u * (vertical ? 0.026 : 0.022);
        var labelH = labelTam * 1.2;
        var gap = u * 0.018;
        var footerTam = u * 0.019;
        var footerH = footerTam * 1.4;
        var detTam = u * (vertical ? (ratio > 1.6 ? 0.028 : (ratio > 1.15 ? 0.028 : 0.026)) : 0.024);
        var detLh = detTam * 1.45;
        var detMax = vertical ? (ratio > 1.6 ? 6 : 4) : 6;

        ctx.font = '400 ' + detTam + 'px ' + FUENTE;
        var detLineas = c.detalle ? parteTexto(c.detalle, t.w, detMax) : [];
        var detAlto = detLineas.length * detLh;

        var boxPad = ajustes.cajaTitulo ? u * 0.028 : 0;
        var titleMaxW = Math.max(u * 0.1, t.w - 2 * boxPad);
        var titleMaxH = t.h - labelH - gap - (detAlto ? gap + detAlto : 0) - footerH - u * 0.05;
        titleMaxH = Math.max(u * 0.09, titleMaxH);

        var titMax = u * (vertical ? (ratio > 1.6 ? 0.078 : (ratio > 1.15 ? 0.068 : 0.058)) : 0.066);
        var titMin = u * 0.036;
        var tit = ajustaTitulo(c.titulo || ('Noticia ' + (i + 1)),
            titleMaxW, Math.max(u * 0.06, titleMaxH - 2 * boxPad), '800', titMax, titMin);
        var titAlto = tit.alto + 2 * boxPad;

        var labelY = t.y;
        var lineY = labelY + labelH + u * 0.006;
        var titleY = lineY + u * 0.022;
        var titleTextY = titleY + boxPad;
        var detailY = titleY + titAlto + u * 0.03;
        var footerY = t.y + t.h - footerH;

        return {
            labelTam: labelTam, labelH: labelH, gap: gap,
            footerTam: footerTam, footerH: footerH,
            detTam: detTam, detLh: detLh, detLineas: detLineas, detAlto: detAlto,
            boxPad: boxPad, titleMaxW: titleMaxW, titleMaxH: titleMaxH,
            tit: tit, titAlto: titAlto,
            labelY: labelY, lineY: lineY, titleY: titleY,
            titleTextY: titleTextY, detailY: detailY, footerY: footerY,
            align: vertical ? 'center' : 'left'
        };
    }

    /* ---------- imágenes ---------- */
    function dibujaMedioAjustado(obj, r, modo, zoom, alpha) {
        var iw = obj.videoWidth || obj.naturalWidth || obj.width || 0;
        var ih = obj.videoHeight || obj.naturalHeight || obj.height || 0;
        if (!iw || !ih) return;
        ctx.save();
        ctx.globalAlpha = ctx.globalAlpha * (alpha == null ? 1 : alpha);
        var s;
        if (modo === 'contain') {
            s = Math.min(r.w / iw, r.h / ih);
        } else {
            s = Math.max(r.w / iw, r.h / ih) * (zoom || 1);
        }
        var dw = iw * s;
        var dh = ih * s;
        ctx.drawImage(obj, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
        ctx.restore();
    }

    function portadaVacia(i, r) {
        var tonos = [214, 278, 196, 28, 338, 122, 250, 42];
        var h = tonos[i % tonos.length];
        var g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        g.addColorStop(0, 'hsl(' + h + ', 46%, 30%)');
        g.addColorStop(0.6, 'hsl(' + ((h + 24) % 360) + ', 44%, 20%)');
        g.addColorStop(1, 'hsl(' + ((h + 48) % 360) + ', 40%, 13%)');
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.save();
        ctx.globalAlpha *= 0.18;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, r.w * 0.006);
        for (var k = -1; k < 5; k++) {
            ctx.beginPath();
            ctx.moveTo(r.x + k * r.w * 0.34, r.y + r.h);
            ctx.lineTo(r.x + k * r.w * 0.34 + r.h, r.y);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.font = '800 ' + (r.w * 0.20) + 'px ' + FUENTE;
        ctx.fillText(pad2(i + 1), r.x + r.w / 2, r.y + r.h * 0.46);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '600 ' + (r.w * 0.052) + 'px ' + FUENTE;
        ctx.fillText('SIN IMAGEN', r.x + r.w / 2, r.y + r.h * 0.70);
        ctx.restore();
    }

    function dibujaMarcoImagen(c, i, r, u, escala, dy, alpha, zoomCont, entryP) {
        var modo = c.ajuste || ajustes.ajuste;
        var pad = modo === 'marco' ? u * 0.018 : 0;
        var radio = modo === 'marco' ? u * 0.032 : u * 0.02;
        var rMedio = {
            x: r.x + pad,
            y: r.y + pad,
            w: Math.max(1, r.w - 2 * pad),
            h: Math.max(1, r.h - 2 * pad)
        };
        var cx = r.x + r.w / 2;
        var cy = r.y + r.h / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy + dy);
        ctx.scale(escala, escala);
        ctx.translate(-cx, -cy);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = u * 0.03;
        ctx.shadowOffsetY = u * 0.01;
        ctx.fillStyle = ajustes.caja;
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.fill();
        ctx.restore();

        ctx.save();
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.clip();

        var main = c.img || (c.video && c.video.readyState >= 2 ? c.video : null);

        if (modo === 'contain') {
            ctx.fillStyle = rgba(ajustes.caja, 0.75);
            ctx.fillRect(r.x, r.y, r.w, r.h);
            if (main) {
                ctx.save();
                ctx.globalAlpha *= 0.20;
                dibujaMedioAjustado(main, r, 'cover', 1, 1);
                ctx.restore();
            }
        }

        if (modo === 'marco') {
            ctx.save();
            rectRedondeado(ctx, rMedio.x, rMedio.y, rMedio.w, rMedio.h, radio * 0.8);
            ctx.clip();
            if (main) dibujaMedioAjustado(main, rMedio, 'cover', zoomCont, 1);
            else portadaVacia(i, rMedio);
            if (c.img && c.video && c.video.readyState >= 2) {
                var va = suave((entryP - 0.3) / 0.5);
                if (va > 0.01) dibujaMedioAjustado(c.video, rMedio, 'cover', zoomCont, va);
            }
            ctx.restore();
        } else {
            if (main) dibujaMedioAjustado(main, r, modo, zoomCont, 1);
            else portadaVacia(i, r);
            if (c.img && c.video && c.video.readyState >= 2) {
                var va2 = suave((entryP - 0.3) / 0.5);
                if (va2 > 0.01) dibujaMedioAjustado(c.video, r, modo, zoomCont, va2);
            }
        }

        ctx.restore();

        ctx.strokeStyle = modo === 'marco' ? rgba(ajustes.acento, 0.7) : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = Math.max(1.5, u * 0.0025);
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.stroke();
        ctx.restore();
    }

    /* ---------- dibujo de una noticia ---------- */
    function dibujaTexto(c, i, a, geo, entry, entryRaw, exitA, ex) {
        var L = layoutTexto(c, i, geo, lienzo.width, lienzo.height);
        var u = geo.u;
        var t = geo.txt;
        var animT = ajustes.animTitulo;
        var animD = ajustes.animDetalle;

        var exitDy = 0;
        var exitScale = 1;
        if (ajustes.salidaTexto === 'subir') exitDy = -ex * u * 0.07;
        else if (ajustes.salidaTexto === 'escala') exitScale = 1 + ex * 0.09;

        /* índice y regla */
        var centrado = L.align === 'center';
        ctx.save();
        ctx.globalAlpha = exitA * entry;
        ctx.fillStyle = ajustes.acento;
        ctx.font = '700 ' + L.labelTam + 'px ' + FUENTE;
        ctx.textAlign = centrado ? 'center' : 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('NOTICIA ' + pad2(i + 1) + ' / ' + pad2(noticias.length),
            centrado ? t.x + t.w / 2 : t.x, L.labelY);
        ctx.fillStyle = rgba(ajustes.acento, 0.9);
        if (centrado) {
            ctx.fillRect(t.x + t.w / 2 - u * 0.035, L.lineY, u * 0.07, Math.max(2, u * 0.004));
        } else {
            ctx.fillRect(t.x, L.lineY, u * 0.07, Math.max(2, u * 0.004));
        }
        ctx.restore();

        /* titular */
        var tA = (animT === 'subir' || animT === 'pop') ? entry : 1;
        var tDy = animT === 'subir' ? (1 - entry) * u * 0.07 : 0;
        var tSc = animT === 'pop' ? (0.84 + 0.16 * easeOutBack(entryRaw)) : 1;
        ctx.save();
        ctx.globalAlpha = exitA * (animT === 'palabra' ? entry : tA);
        var tcx = t.x + t.w / 2;
        var tcy = L.titleY + L.titAlto / 2;
        ctx.translate(tcx, tcy + tDy + exitDy);
        ctx.scale(tSc * exitScale, tSc * exitScale);
        ctx.translate(-tcx, -tcy);

        if (ajustes.cajaTitulo) {
            ctx.fillStyle = rgba(ajustes.caja, 0.92);
            rectRedondeado(ctx, t.x, L.titleY, t.w, L.titAlto, u * 0.018);
            ctx.fill();
            ctx.fillStyle = ajustes.acento;
            if (centrado) {
                rectRedondeado(ctx, t.x + t.w / 2 - u * 0.035, L.titleY + u * 0.012,
                    u * 0.07, u * 0.004, u * 0.002);
            } else {
                rectRedondeado(ctx, t.x, L.titleY, u * 0.012, L.titAlto, u * 0.006);
            }
            ctx.fill();
        }

        ctx.fillStyle = ajustes.texto;
        ctx.font = '800 ' + L.tit.tam + 'px ' + FUENTE;
        ctx.textAlign = centrado ? 'center' : 'left';
        ctx.textBaseline = 'top';
        var tx = centrado ? t.x + L.boxPad + L.titleMaxW / 2 : t.x + L.boxPad;
        var ty = L.titleTextY;

        if (animT === 'palabra') {
            var lineasP = parteTextoPalabras(c.titulo || ('Noticia ' + (i + 1)), L.titleMaxW, 5);
            var total = 0;
            lineasP.forEach(function (l) { total += l.palabras.length; });
            var wi = 0;
            lineasP.forEach(function (l, li) {
                var despl = centrado ? (L.titleMaxW - l.ancho) / 2 : 0;
                l.palabras.forEach(function (p) {
                    var ap = clamp((entryRaw * (total + 3) - wi) / 3, 0, 1);
                    ctx.globalAlpha = exitA * ap;
                    ctx.fillText(p.t, t.x + L.boxPad + despl + p.x, ty + li * L.tit.lh);
                    wi++;
                });
            });
        } else {
            L.tit.lineas.forEach(function (linea, li) {
                ctx.fillText(linea, tx, ty + li * L.tit.lh);
            });
        }
        ctx.restore();

        /* entradilla */
        if (L.detLineas.length) {
            var dA = (animD === 'subir' || animD === 'fundido') ? entry : 1;
            var dDy = animD === 'subir' ? (1 - entry) * u * 0.05 : 0;
            ctx.save();
            ctx.globalAlpha = exitA * dA;
            var dcx = t.x + t.w / 2;
            var dcy = L.detailY + L.detAlto / 2;
            ctx.translate(dcx, dcy + dDy + exitDy);
            ctx.scale(exitScale, exitScale);
            ctx.translate(-dcx, -dcy);
            ctx.fillStyle = rgba(ajustes.texto, 0.78);
            ctx.font = '400 ' + L.detTam + 'px ' + FUENTE;
            ctx.textAlign = centrado ? 'center' : 'left';
            ctx.textBaseline = 'top';
            var dx = centrado ? t.x + t.w / 2 : t.x;
            if (animD === 'linea') {
                L.detLineas.forEach(function (linea, li) {
                    var al = clamp((entryRaw * (L.detLineas.length + 2) - li) / 1.5, 0, 1);
                    ctx.globalAlpha = exitA * al;
                    ctx.fillText(linea, dx, L.detailY + li * L.detLh + (1 - al) * u * 0.008);
                });
            } else {
                L.detLineas.forEach(function (linea, li) {
                    ctx.fillText(linea, dx, L.detailY + li * L.detLh);
                });
            }
            ctx.restore();
        }

        /* pie */
        ctx.save();
        ctx.globalAlpha = exitA * 0.5;
        ctx.fillStyle = ajustes.texto;
        ctx.font = '500 ' + L.footerTam + 'px ' + FUENTE;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('somostet.com', t.x + t.w, L.footerY);
        ctx.restore();
    }

    function dibujaSlide(a, geo, W, H) {
        var c = noticias[a.i];
        if (!c) return;
        var u = geo.u;
        var entryRaw = a.entryP;

        /* Al cambiar de noticia, la nueva pinta su propio fondo encima de la
           anterior: tapa el texto viejo antes de que aparezca el nuevo y evita
           el efecto de doble exposición. */
        if (a.i > 0) {
            var tapa = suave(clamp(entryRaw / 0.25, 0, 1));
            if (tapa > 0.001) {
                ctx.save();
                ctx.globalAlpha = tapa;
                dibujaFondo(W, H);
                ctx.restore();
            }
            entryRaw = clamp((entryRaw - 0.25) / 0.75, 0, 1);
        }

        var entry = easeOut(entryRaw);
        var exitA = easeInOut(a.exitP);
        var ex = 1 - exitA;

        var escala = 1;
        var dy = 0;
        if (ajustes.animImg === 'zoom') {
            escala = 1.08 - 0.08 * entry;
        } else if (ajustes.animImg === 'pop') {
            escala = 0.82 + 0.18 * easeOutBack(entryRaw);
        } else if (ajustes.animImg === 'deslizar') {
            dy = (1 - entry) * u * 0.09;
        }
        escala *= 1 + ex * 0.03;
        dy -= ex * u * 0.02;

        var imgA = entry * exitA;
        var zoomCont = 1 + ajustes.zoom * clamp(a.local / Math.max(0.001, ajustes.hold), 0, 1);
        dibujaMarcoImagen(c, a.i, geo.img, u, escala, dy, imgA, zoomCont, entryRaw);
        dibujaTexto(c, a.i, a, geo, entry, entryRaw, exitA, ex);
    }

    /* ---------- fondo, cabecera y cierre ---------- */
    function dibujaFondo(W, H) {
        var u = Math.min(W, H);
        ctx.fillStyle = ajustes.fondo;
        ctx.fillRect(0, 0, W, H);

        if (ajustes.degradado) {
            var g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, ajustes.fondo);
            g.addColorStop(1, ajustes.fondo2);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        var rg = ctx.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, Math.max(W, H) * 0.75);
        rg.addColorStop(0, rgba(ajustes.acento, 0.16));
        rg.addColorStop(0.6, rgba(ajustes.acento, 0.03));
        rg.addColorStop(1, rgba(ajustes.acento, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);

        var vg = ctx.createRadialGradient(W / 2, H / 2, u * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    }

    function dibujaBarra(W, H) {
        if (!barraImg) return;
        var u = Math.min(W, H);
        var h = W * BARRA_ALTO_NAT / BARRA_ANCHO_NAT;
        ctx.save();
        ctx.drawImage(barraImg, 0, 0, W, h);
        var g = ctx.createLinearGradient(0, h, 0, h + u * 0.022);
        g.addColorStop(0, 'rgba(0,0,0,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h, W, u * 0.022);
        ctx.restore();
    }

    function dibujaFin(W, H, endP) {
        var u = Math.min(W, H);
        var a = easeOut(endP);
        if (a <= 0.001) return;
        ctx.save();
        ctx.globalAlpha = a;
        var cx = W / 2;
        var cy = H * 0.46;

        if (logoImg) {
            var lado = u * 0.24;
            var escL = Math.min(lado / logoImg.width, lado / logoImg.height);
            var dw = logoImg.width * escL;
            var dh = logoImg.height * escL;
            ctx.drawImage(logoImg, cx - dw / 2, cy - dh / 2, dw, dh);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = ajustes.texto;
        ctx.font = '800 ' + (u * 0.075) + 'px ' + FUENTE;
        ctx.fillText('tet', cx, cy + u * 0.16);

        ctx.fillStyle = rgba(ajustes.texto, 0.75);
        ctx.font = '400 ' + (u * 0.028) + 'px ' + FUENTE;
        ctx.fillText('La tecnología tiene su espacio', cx, cy + u * 0.27);

        ctx.fillStyle = ajustes.acento;
        ctx.font = '700 ' + (u * 0.026) + 'px ' + FUENTE;
        ctx.fillText('somostet.com', cx, cy + u * 0.34);
        ctx.restore();
    }

    function dibujaProgreso(W, H) {
        if (!ajustes.progreso) return;
        var u = Math.min(W, H);
        var h = Math.max(2, u * 0.004);
        var y = H - Math.max(u * 0.022, h);
        var D = duracionTotal();
        var p = D > 0 ? clamp(tActual / D, 0, 1) : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(0, y, W, h);
        ctx.fillStyle = rgba(ajustes.acento, 0.9);
        ctx.fillRect(0, y, W * p, h);
        ctx.restore();
    }

    /* ---------- vídeos ---------- */
    function sincronizaVideos(est, tocando) {
        var activos = {};
        est.activos.forEach(function (a) {
            if (a.entryP > 0.15 && a.exitP > 0.1) activos[a.i] = a;
        });
        for (var i = 0; i < noticias.length; i++) {
            var c = noticias[i];
            if (!c.video) continue;
            var a = activos[i];
            if (!a || est.fin) {
                if (!c.video.paused) c.video.pause();
                if (c.video.currentTime > 0.04) {
                    try { c.video.currentTime = 0; } catch (e) { }
                }
                continue;
            }
            if (tocando) {
                if (c.video.paused) {
                    try {
                        var pr = c.video.play();
                        if (pr && pr.catch) pr.catch(function () { });
                    } catch (e) { }
                }
            } else {
                if (!c.video.paused) c.video.pause();
                var durV = Math.max(0.1, c.video.duration || 1);
                var objetivo = a.local % durV;
                if (Math.abs(c.video.currentTime - objetivo) > 0.08) {
                    try { c.video.currentTime = objetivo; } catch (e) { }
                }
            }
        }
    }

    /* ---------- pintado ---------- */
    function pintar(t) {
        var W = lienzo.width;
        var H = lienzo.height;
        var D = duracionTotal();
        t = clamp(t, 0, D);
        tActual = t;
        var est = estadoEn(t);

        sincronizaVideos(est, reproduciendo || grabando);

        ctx.clearRect(0, 0, W, H);
        dibujaFondo(W, H);

        var geo = geom(W, H);
        est.activos.forEach(function (a) {
            dibujaSlide(a, geo, W, H);
        });
        if (est.fin) {
            var tapaFin = suave(clamp(est.endP / 0.25, 0, 1));
            if (tapaFin > 0.001) {
                ctx.save();
                ctx.globalAlpha = tapaFin;
                dibujaFondo(W, H);
                ctx.restore();
            }
            dibujaFin(W, H, clamp((est.endP - 0.25) / 0.75, 0, 1));
        }

        dibujaBarra(W, H);
        dibujaProgreso(W, H);
        actualizaReloj();
    }

    /* ---------- reloj y reproducción ---------- */
    function actualizaReloj() {
        var D = duracionTotal();
        if (reloj) reloj.textContent = tActual.toFixed(1).replace('.', ',') + ' / ' + D.toFixed(1).replace('.', ',') + ' s';
        if (rangoTiempo) {
            rangoTiempo.max = D.toFixed(2);
            rangoTiempo.value = tActual.toFixed(2);
        }
    }

    function actualizaDuracion() {
        var D = duracionTotal();
        if (rangoTiempo) rangoTiempo.max = D.toFixed(2);
        if (tActual > D) tActual = D;
        actualizaReloj();
    }

    function ponBotonPlay(activo) {
        if (!btnPlay) return;
        btnPlay.innerHTML = activo
            ? '<i class="fas fa-pause" aria-hidden="true"></i> <span>Pausa</span>'
            : '<i class="fas fa-play" aria-hidden="true"></i> <span>Reproducir</span>';
        btnPlay.setAttribute('aria-label', activo ? 'Pausar' : 'Reproducir');
    }

    function reproducir() {
        if (grabando) return;
        if (reproduciendo) { pausar(); return; }
        if (tActual >= duracionTotal() - 0.02) tActual = 0;
        /* si estamos en la vista inicial (primera noticia ya entrada), al dar
           a reproducir se ve también su animación desde el principio */
        if (tActual > 0 && tActual <= entEfectiva() + 0.01) tActual = 0;
        reproduciendo = true;
        ultimoTs = 0;
        ponBotonPlay(true);
        rafPreview = requestAnimationFrame(buclePreview);
    }

    function pausar() {
        reproduciendo = false;
        if (rafPreview) { cancelAnimationFrame(rafPreview); rafPreview = null; }
        ponBotonPlay(false);
        pintar(tActual);
    }

    function buclePreview(ts) {
        if (!reproduciendo) return;
        if (!ultimoTs) ultimoTs = ts;
        var dt = (ts - ultimoTs) / 1000;
        ultimoTs = ts;
        dt = Math.min(dt, 0.1);
        tActual += dt;
        if (tActual >= duracionTotal()) tActual = 0;
        pintar(tActual);
        rafPreview = requestAnimationFrame(buclePreview);
    }

    /* ---------- lista de noticias ---------- */
    function pintaLista() {
        if (!lista) return;
        var html = '';
        noticias.forEach(function (c, i) {
            var tieneImg = !!c.imgUrl;
            var videoTxt = c.video ? c.videoNombre : 'Sin vídeo';
            html += '<div class="reel-ficha rn-ficha" data-i="' + i + '">' +
                '<div class="reel-ficha-num">' + pad2(i + 1) + '</div>' +
                '<label class="reel-ficha-thumb" for="rn-img-' + i + '" title="Elegir la imagen de la noticia ' + (i + 1) + '">' +
                (tieneImg
                    ? '<img src="' + esc(c.imgUrl) + '" alt="Imagen de la noticia ' + (i + 1) + '">'
                    : '<span><i class="fas fa-image" aria-hidden="true"></i>Portada</span>') +
                '</label>' +
                '<input type="file" class="d-none" id="rn-img-' + i + '" accept="image/*" data-img="' + i + '">' +
                '<div class="reel-ficha-campos">' +
                '<input type="text" class="form-control" data-campo="titulo" data-i="' + i + '" maxlength="90" value="' + esc(c.titulo) + '" placeholder="Titular de la noticia" aria-label="Título de la noticia ' + (i + 1) + '">' +
                '<textarea class="form-control" data-campo="detalle" data-i="' + i + '" rows="2" maxlength="320" placeholder="Entradilla o detalle (opcional)" aria-label="Detalle de la noticia ' + (i + 1) + '">' + esc(c.detalle) + '</textarea>' +
                '<div class="rn-ficha-ajuste">' +
                '<label for="rn-ajuste-' + i + '">Imagen</label>' +
                '<select class="form-select" id="rn-ajuste-' + i + '" data-campo="ajuste" data-i="' + i + '" aria-label="Ajuste de imagen de la noticia ' + (i + 1) + '">' +
                '<option value=""' + (!c.ajuste ? ' selected' : '') + '>Como el global</option>' +
                '<option value="cover"' + (c.ajuste === 'cover' ? ' selected' : '') + '>Rellenar</option>' +
                '<option value="contain"' + (c.ajuste === 'contain' ? ' selected' : '') + '>Entera</option>' +
                '<option value="marco"' + (c.ajuste === 'marco' ? ' selected' : '') + '>Marco redondeado</option>' +
                '</select></div>' +
                '<div class="reel-ficha-media">' +
                '<label class="btn btn-sm btn-outline-secondary" for="rn-video-' + i + '"><i class="fas fa-film" aria-hidden="true"></i> Vídeo</label>' +
                '<input type="file" class="d-none" id="rn-video-' + i + '" accept="video/*" data-video="' + i + '">' +
                '<span class="reel-ficha-video' + (c.video ? ' is-activo' : '') + '" data-video-nombre="' + i + '" title="' + esc(videoTxt) + '">' + esc(videoTxt) + '</span>' +
                (c.video ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-accion="quitar-video" data-i="' + i + '" title="Quitar el vídeo" aria-label="Quitar el vídeo de la noticia ' + (i + 1) + '"><i class="fas fa-times" aria-hidden="true"></i></button>' : '') +
                '</div>' +
                '</div>' +
                '<div class="reel-ficha-acciones">' +
                '<button type="button" data-accion="subir" data-i="' + i + '" title="Subir" aria-label="Subir la noticia ' + (i + 1) + '"' + (i === 0 ? ' disabled' : '') + '><i class="fas fa-arrow-up" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="bajar" data-i="' + i + '" title="Bajar" aria-label="Bajar la noticia ' + (i + 1) + '"' + (i === noticias.length - 1 ? ' disabled' : '') + '><i class="fas fa-arrow-down" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="quitar" data-i="' + i + '" title="Quitar" aria-label="Quitar la noticia ' + (i + 1) + '"><i class="fas fa-trash" aria-hidden="true"></i></button>' +
                '</div>' +
                '</div>';
        });
        lista.innerHTML = html;
    }

    function pintaMiniatura(i) {
        var c = noticias[i];
        var label = lista.querySelector('.rn-ficha[data-i="' + i + '"] .reel-ficha-thumb');
        if (!label) return;
        if (c.imgUrl) {
            label.innerHTML = '<img src="' + esc(c.imgUrl) + '" alt="Imagen de la noticia ' + (i + 1) + '">';
        } else {
            label.innerHTML = '<span><i class="fas fa-image" aria-hidden="true"></i>Portada</span>';
        }
    }

    function actualizaNombreVideo(i) {
        var c = noticias[i];
        var el = lista.querySelector('[data-video-nombre="' + i + '"]');
        if (!el) return;
        el.textContent = c.video ? c.videoNombre : 'Sin vídeo';
        el.title = el.textContent;
        el.classList.toggle('is-activo', !!c.video);
        var ficha = lista.querySelector('.rn-ficha[data-i="' + i + '"]');
        if (!ficha) return;
        var boton = ficha.querySelector('[data-accion="quitar-video"]');
        if (c.video && !boton) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-sm btn-outline-secondary';
            b.dataset.accion = 'quitar-video';
            b.dataset.i = i;
            b.title = 'Quitar el vídeo';
            b.setAttribute('aria-label', 'Quitar el vídeo de la noticia ' + (i + 1));
            b.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            el.parentNode.appendChild(b);
        } else if (!c.video && boton) {
            boton.remove();
        }
    }

    function leeImagen(file, i) {
        if (!file || !/^image\//.test(file.type)) {
            aviso('Ese archivo no es una imagen', 'warning');
            return;
        }
        var lector = new FileReader();
        lector.onload = function () {
            var img = new Image();
            img.onload = function () {
                noticias[i].img = img;
                noticias[i].imgUrl = lector.result;
                pintaMiniatura(i);
                pintar(tActual);
            };
            img.onerror = function () { aviso('No se pudo abrir la imagen', 'danger'); };
            img.src = lector.result;
        };
        lector.onerror = function () { aviso('No se pudo leer la imagen', 'danger'); };
        lector.readAsDataURL(file);
    }

    function cargaVideo(file, i) {
        if (!file || !/^video\//.test(file.type)) {
            aviso('Ese archivo no es un vídeo', 'warning');
            return;
        }
        var c = noticias[i];
        if (c.video) {
            try { c.video.pause(); } catch (e) { }
            c.video.removeAttribute('src');
            try { c.video.load(); } catch (e) { }
        }
        if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        c.videoUrl = URL.createObjectURL(file);
        c.videoNombre = file.name;
        var v = document.createElement('video');
        v.src = c.videoUrl;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.preload = 'auto';
        v.addEventListener('loadeddata', function () { pintar(tActual); });
        v.addEventListener('seeked', function () {
            if (!reproduciendo && !grabando) pintar(tActual);
        });
        v.addEventListener('error', function () {
            aviso('No se pudo abrir el vídeo «' + file.name + '»', 'danger');
        });
        c.video = v;
        actualizaNombreVideo(i);
        pintar(tActual);
    }

    function quitaVideo(i) {
        var c = noticias[i];
        if (!c.video) return;
        try { c.video.pause(); } catch (e) { }
        c.video.removeAttribute('src');
        try { c.video.load(); } catch (e) { }
        if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        c.video = null;
        c.videoUrl = null;
        c.videoNombre = '';
        actualizaNombreVideo(i);
        pintar(tActual);
    }

    function borraNoticia(i) {
        if (noticias.length <= 1) {
            aviso('Deja al menos una noticia', 'warning');
            return;
        }
        var c = noticias[i];
        if (c.video) {
            try { c.video.pause(); } catch (e) { }
            if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        }
        noticias.splice(i, 1);
        pintaLista();
        actualizaDuracion();
        pintar(Math.min(tActual, duracionTotal()));
    }

    function mueveNoticia(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= noticias.length) return;
        var aux = noticias[i];
        noticias[i] = noticias[j];
        noticias[j] = aux;
        pintaLista();
        pintar(tActual);
    }

    function vaciaGuion() {
        if (!confirm('¿Vaciar todas las noticias del guion?')) return;
        noticias.forEach(function (c) {
            if (c.video) {
                try { c.video.pause(); } catch (e) { }
                if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
            }
        });
        noticias = [noticiaVacia()];
        pintaLista();
        actualizaDuracion();
        tActual = 0;
        pintar(0);
    }

    /* ---------- cabecera y ajustes ---------- */
    function indiceBarra(url) {
        for (var i = 0; i < BARRAS.length; i++) {
            if (BARRAS[i].url === url) return i;
        }
        return 0;
    }

    function pintaSelectBarras() {
        if (!inpBarra) return;
        var html = '';
        BARRAS.forEach(function (b, i) {
            html += '<option value="' + i + '">' + esc(b.nombre) + '</option>';
        });
        inpBarra.innerHTML = html;
        inpBarra.value = String(indiceBarra(ajustes.barra));
    }

    function aplicaPaleta(b) {
        if (!b) return;
        ajustes.fondo = b.fondo;
        ajustes.fondo2 = b.fondo2;
        ajustes.acento = b.acento;
        ajustes.texto = b.texto;
        ajustes.caja = b.caja;
        if (inpFondo) inpFondo.value = b.fondo;
        if (inpFondo2) inpFondo2.value = b.fondo2;
        if (inpAcento) inpAcento.value = b.acento;
        if (inpTexto) inpTexto.value = b.texto;
        if (inpCaja) inpCaja.value = b.caja;
        pintar(tActual);
    }

    function cargaBarra(url) {
        if (cacheImgs[url]) {
            barraImg = cacheImgs[url];
            pintar(tActual);
            return;
        }
        var img = new Image();
        img.onload = function () {
            cacheImgs[url] = img;
            barraImg = img;
            pintar(tActual);
        };
        img.onerror = function () {
            barraImg = null;
            pintar(tActual);
        };
        img.src = urlCanvas(url);
    }

    function aplicaFormato() {
        var partes = selFormato.value.split('x');
        var w = parseInt(partes[0], 10) || 1080;
        var h = parseInt(partes[1], 10) || 1920;
        ajustes.formato = { w: w, h: h };
        lienzo.width = w;
        lienzo.height = h;
        if (infoSalida) infoSalida.textContent = w + ' × ' + h + ' · 30 fps';
        if (tActual > duracionTotal()) tActual = 0;
        pintar(tActual);
    }

    function sincronizaControles() {
        if (inpBarra) inpBarra.value = String(indiceBarra(ajustes.barra));
        if (inpColoresAuto) inpColoresAuto.checked = ajustes.coloresAuto;
        if (selAjuste) selAjuste.value = ajustes.ajuste;
        if (selCajaTitulo) selCajaTitulo.value = ajustes.cajaTitulo ? '1' : '0';
        if (inpFondo) inpFondo.value = ajustes.fondo;
        if (inpFondo2) inpFondo2.value = ajustes.fondo2;
        if (inpTexto) inpTexto.value = ajustes.texto;
        if (inpAcento) inpAcento.value = ajustes.acento;
        if (inpCaja) inpCaja.value = ajustes.caja;
        if (inpDegradado) inpDegradado.checked = ajustes.degradado;
        if (inpProgreso) inpProgreso.checked = ajustes.progreso;
        if (inpTarjetaFinal) inpTarjetaFinal.checked = ajustes.tarjetaFinal;
        if (inpZonaSegura) inpZonaSegura.checked = ajustes.zonaSegura;
        if (inpDuracion) inpDuracion.value = ajustes.hold;
        if (inpEntrada) inpEntrada.value = ajustes.entrada;
        if (inpSalida) inpSalida.value = ajustes.salida;
        if (inpCierre) inpCierre.value = ajustes.cierre;
        if (inpZoom) inpZoom.value = ajustes.zoom;
        if (valDuracion) valDuracion.textContent = seg(ajustes.hold);
        if (valEntrada) valEntrada.textContent = seg(ajustes.entrada);
        if (valSalida) valSalida.textContent = seg(ajustes.salida);
        if (valCierre) valCierre.textContent = seg(ajustes.cierre);
        if (valZoom) valZoom.textContent = Math.round(ajustes.zoom * 100) + ' %';
        if (selAnimImg) selAnimImg.value = ajustes.animImg;
        if (selAnimTitulo) selAnimTitulo.value = ajustes.animTitulo;
        if (selAnimDetalle) selAnimDetalle.value = ajustes.animDetalle;
        if (selSalidaTexto) selSalidaTexto.value = ajustes.salidaTexto;
        if (volMusica) volMusica.value = 0.7;
        if (valVolMusica) valVolMusica.textContent = '70 %';
        actualizaDuracion();
    }

    /* ---------- música ---------- */
    function cargaMusica(file) {
        if (!file || !/^audio\//.test(file.type)) {
            aviso('Ese archivo no es audio', 'warning');
            return;
        }
        if (musicaUrl) URL.revokeObjectURL(musicaUrl);
        musicaUrl = URL.createObjectURL(file);
        musicaNombre = file.name;
        if (!musicaEl) {
            musicaEl = document.createElement('audio');
            musicaEl.loop = true;
            musicaEl.preload = 'auto';
        }
        musicaEl.src = musicaUrl;
        if (nombreMusica) {
            nombreMusica.textContent = musicaNombre;
            nombreMusica.title = musicaNombre;
        }
        if (btnQuitarMusica) btnQuitarMusica.hidden = false;
        if (audioCtx) {
            try { musicaEl.load(); } catch (e) { }
        }
        sincListaMusica();
    }

    function quitaMusica() {
        if (musicaEl) {
            try { musicaEl.pause(); } catch (e) { }
            musicaEl.removeAttribute('src');
            try { musicaEl.load(); } catch (e) { }
        }
        if (musicaUrl) URL.revokeObjectURL(musicaUrl);
        musicaUrl = null;
        musicaNombre = '';
        if (inpMusica) inpMusica.value = '';
        if (nombreMusica) { nombreMusica.textContent = 'Sin música'; nombreMusica.title = ''; }
        if (btnQuitarMusica) btnQuitarMusica.hidden = true;
        sincListaMusica();
    }

    var PISTAS = window.TET_LISTA_MUSICA || [];
    var listaPintada = false;

    function formatoAudio(seg2) {
        var m = Math.floor(seg2 / 60);
        var s = Math.round(seg2 % 60);
        if (s >= 60) { m += 1; s = 0; }
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function pintaListaMusica() {
        if (!listaMusica || listaPintada) return;
        listaPintada = true;
        PISTAS.forEach(function (p, i) {
            var item = document.createElement('div');
            item.className = 'reel-pista-item';
            item.innerHTML =
                '<input type="radio" class="btn-check" name="rn-musica-pista" data-idx="' + i + '"' +
                ' id="rn-pista-' + i + '" value="' + esc(p.titulo) + '" autocomplete="off">' +
                '<label class="btn btn-outline-primary reel-pista-nombre" for="rn-pista-' + i + '">' +
                '<span>' + esc(p.titulo) + '</span>' +
                '<span class="reel-pista-meta">' +
                (p.grupo ? esc(p.grupo) + ' · ' : '') + esc(p.autor) + ' · ' + formatoAudio(p.dur) +
                '</span></label>' +
                '<button type="button" class="btn btn-outline-secondary reel-pista-play" data-idx="' + i + '"' +
                ' aria-pressed="false" aria-label="Escuchar ' + esc(p.titulo) + '">' +
                '<i class="fas fa-play" aria-hidden="true"></i></button>';
            listaMusica.appendChild(item);
        });
    }

    var audioPend = [];
    var audioCargando = false;

    function pideAudioData(fn) {
        if (window.TET_AUDIO) { fn(true); return; }
        audioPend.push(fn);
        if (audioCargando) return;
        audioCargando = true;
        var sc = document.createElement('script');
        sc.src = './public/js/audio-data.js?v=q5';
        sc.async = true;
        sc.onload = function () {
            audioCargando = false;
            var ok = !!window.TET_AUDIO;
            audioPend.splice(0).forEach(function (f) { f(ok); });
        };
        sc.onerror = function () {
            audioCargando = false;
            audioPend.splice(0).forEach(function (f) { f(false); });
        };
        document.head.appendChild(sc);
    }

    function dataURLaBlob(du) {
        var sep = du.indexOf(',');
        var mime = du.slice(du.indexOf(':') + 1, du.indexOf(';'));
        var bin = atob(du.slice(sep + 1));
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Blob([u8], { type: mime });
    }

    function eligeMusicaLista(p) {
        detenPreviewMusica();
        pideAudioData(function (ok) {
            if (!ok || !window.TET_AUDIO || !window.TET_AUDIO[p.id]) {
                aviso('No se pudo cargar «' + p.titulo + '»', 'danger');
                sincListaMusica();
                return;
            }
            var dt = new DataTransfer();
            dt.items.add(new File([dataURLaBlob(window.TET_AUDIO[p.id])], p.titulo, { type: 'audio/mpeg' }));
            inpMusica.files = dt.files;
            inpMusica.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function sincListaMusica() {
        if (!listaMusica) return;
        var radios = listaMusica.querySelectorAll('input[name="rn-musica-pista"]');
        for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === musicaNombre);
    }

    listaMusica.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || t.name !== 'rn-musica-pista') return;
        var p = PISTAS[parseInt(t.getAttribute('data-idx'), 10)];
        if (p) eligeMusicaLista(p);
    });

    var prevAudio = null;
    var prevIdx = -1;
    var prevCarga = 0;

    function detenPreviewMusica() {
        prevCarga++;
        if (prevAudio) {
            try { prevAudio.pause(); } catch (e) { }
            var src = prevAudio.src;
            prevAudio.removeAttribute('src');
            if (src.indexOf('blob:') === 0) {
                try { URL.revokeObjectURL(src); } catch (e) { }
            }
            try { prevAudio.remove(); } catch (e) { }
        }
        prevAudio = null;
        prevIdx = -1;
        pintaPreviewMusica();
    }

    function pintaPreviewMusica() {
        if (!listaMusica) return;
        var bs = listaMusica.querySelectorAll('.reel-pista-play');
        for (var i = 0; i < bs.length; i++) {
            var on = !!(prevAudio && prevIdx === i);
            bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
            bs[i].setAttribute('aria-label', (on ? 'Pausar ' : 'Escuchar ') + PISTAS[i].titulo);
            var ic = bs[i].querySelector('i');
            if (ic) ic.className = on ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    listaMusica.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.reel-pista-play') : null;
        if (!b) return;
        var i = parseInt(b.getAttribute('data-idx'), 10);
        if (prevAudio && prevIdx === i) { detenPreviewMusica(); return; }
        detenPreviewMusica();
        var yo = prevCarga;
        pideAudioData(function (ok) {
            if (yo !== prevCarga) return;
            if (!ok || !window.TET_AUDIO || !window.TET_AUDIO[PISTAS[i].id]) {
                aviso('No se pudo reproducir «' + PISTAS[i].titulo + '»', 'danger');
                return;
            }
            var a = new Audio(URL.createObjectURL(dataURLaBlob(window.TET_AUDIO[PISTAS[i].id])));
            a.volume = parseFloat(volMusica.value) || 0.7;
            a.addEventListener('ended', function () {
                if (prevAudio === a) detenPreviewMusica();
            });
            prevAudio = a;
            prevIdx = i;
            a.style.display = 'none';
            document.body.appendChild(a);
            pintaPreviewMusica();
            var prom = a.play();
            if (prom && prom.catch) prom.catch(function () {
                if (prevAudio === a) detenPreviewMusica();
            });
        });
    });

    function conectaAudio() {
        if (!musicaEl || !musicaUrl) return false;
        try {
            if (!audioCtx) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return false;
                audioCtx = new AC();
                fuenteMusica = audioCtx.createMediaElementSource(musicaEl);
                ganMusica = audioCtx.createGain();
                destAudio = audioCtx.createMediaStreamDestination();
                fuenteMusica.connect(ganMusica);
                ganMusica.connect(destAudio);
                ganMusica.connect(audioCtx.destination);
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            ganMusica.gain.value = parseFloat(volMusica.value) || 0.7;
            return true;
        } catch (e) {
            aviso('No se pudo preparar la música para grabar', 'warning');
            return false;
        }
    }

    /* ---------- grabación ---------- */
    function eligeMime(conAudio) {
        var video = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        var audio = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus'
        ];
        var lista2 = conAudio ? audio.concat(video) : video;
        for (var i = 0; i < lista2.length; i++) {
            if (window.MediaRecorder && MediaRecorder.isTypeSupported(lista2[i])) return lista2[i];
        }
        return '';
    }

    function bitrate() {
        var W = lienzo.width;
        var H = lienzo.height;
        return Math.max(1500000, Math.min(24000000, Math.round(W * H * FPS * 0.10)));
    }

    function fechaCorta() {
        var d = new Date();
        return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' +
            pad2(d.getHours()) + pad2(d.getMinutes());
    }

    function preparaResultado(blob, dur) {
        if (!blob || !blob.size) {
            aviso('La grabación salió vacía. Prueba otra vez con la pestaña visible.', 'danger');
            if (estadoGrab) estadoGrab.textContent = 'La grabación salió vacía.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
            return;
        }
        var tipo = blob.type || 'video/webm';
        var ext = /mp4/.test(tipo) ? 'mp4' : 'webm';
        nombreResultado = 'reel-noticias-' + lienzo.width + 'x' + lienzo.height + '-' + fechaCorta() + '.' + ext;

        var listo = function (b) {
            if (urlResultado) URL.revokeObjectURL(urlResultado);
            urlResultado = URL.createObjectURL(b);
            blobResultado = b;
            archivoResultado = (typeof File === 'function')
                ? new File([b], nombreResultado, { type: tipo })
                : null;
            if (videoRes) {
                videoRes.src = urlResultado;
                videoRes.load();
            }
            if (btnDescargar) {
                btnDescargar.href = urlResultado;
                btnDescargar.download = nombreResultado;
            }
            if (btnCompartir) {
                var puede = !!(archivoResultado && navigator.canShare && navigator.canShare({ files: [archivoResultado] }));
                btnCompartir.hidden = !puede;
            }
            if (pesoRes) {
                pesoRes.textContent = 'Archivo: ' + nombreResultado + ' · ' +
                    (b.size / 1048576).toFixed(1).replace('.', ',') + ' MB' +
                    (dur > 0 ? ' · ' + seg(dur) : '');
            }
            if (resWrap) resWrap.hidden = false;
            if (estadoGrab) estadoGrab.textContent = 'Vídeo listo.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
        };

        if (/mp4/.test(tipo) && dur > 0) {
            blob.arrayBuffer().then(function (buf) {
                var parcheado = escribeDuracionMp4(buf, dur);
                if (parcheado) listo(new Blob([parcheado], { type: tipo }));
                else listo(blob);
            }).catch(function () { listo(blob); });
        } else {
            listo(blob);
        }
    }

    function escribeDuracionMp4(buf, segs) {
        try {
            var b = new Uint8Array(buf);
            var dv = new DataView(buf);
            var nom = function (i) { return String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]); };
            var leer = function (desde, hasta) {
                var out = [], off = desde;
                while (off + 8 <= hasta) {
                    var size = dv.getUint32(off);
                    var type = nom(off + 4);
                    var hdr = 8;
                    if (size === 1) { size = Number(dv.getBigUint64(off + 8)); hdr = 16; }
                    if (size < 8 || off + size > hasta) break;
                    out.push({ type: type, off: off, size: size, hdr: hdr });
                    off += size;
                }
                return out;
            };
            var moov = leer(0, b.length).filter(function (x) { return x.type === 'moov'; })[0];
            if (!moov) return null;
            var partes = leer(moov.off + moov.hdr, moov.off + moov.size);
            var tsPelicula = 0;
            partes.forEach(function (h) {
                if (h.type !== 'mvhd') return;
                var i = h.off + 4;
                tsPelicula = dv.getUint32(i + (b[i + 4] === 1 ? 24 : 16));
            });
            if (!tsPelicula) return null;
            var tocado = false;
            var pon = function (i, v1, posV1, posV0, segundos, ts) {
                var n = Math.round(segundos * ts);
                if (v1) {
                    if (Number(dv.getBigUint64(posV1)) !== n) {
                        dv.setBigUint64(posV1, BigInt(n));
                        tocado = true;
                    }
                } else {
                    var m = Math.min(4294967295, n);
                    if (dv.getUint32(posV0) !== m) { dv.setUint32(posV0, m); tocado = true; }
                }
            };
            partes.forEach(function (h) {
                var i = h.off + 4;
                if (h.type === 'mvhd') pon(i, b[i + 4] === 1, i + 28, i + 20, segs, tsPelicula);
                if (h.type !== 'trak') return;
                leer(h.off + h.hdr, h.off + h.size).forEach(function (t) {
                    var j = t.off + 4;
                    if (t.type === 'tkhd') pon(j, b[j + 4] === 1, j + 32, j + 24, segs, tsPelicula);
                    if (t.type !== 'mdia') return;
                    leer(t.off + t.hdr, t.off + t.size).forEach(function (m) {
                        var k = m.off + 4;
                        if (m.type !== 'mdhd') return;
                        var v = b[k + 4];
                        var ts = dv.getUint32(k + (v === 1 ? 24 : 16));
                        if (ts) pon(k, v === 1, k + 28, k + 20, segs, ts);
                    });
                });
            });
            return tocado ? b : null;
        } catch (e) { return null; }
    }

    function empiezaGrabacion() {
        if (grabando) return;
        if (!window.MediaRecorder || !lienzo.captureStream) {
            aviso('Tu navegador no permite grabar vídeo (MediaRecorder). Prueba con Chrome, Edge o Safari actualizado.', 'danger');
            return;
        }
        pausar();
        tActual = 0;
        pintar(0);

        var conMusica = !!(musicaEl && musicaUrl && conectaAudio());
        var mime = eligeMime(conMusica);
        if (!mime) {
            aviso('Tu navegador no admite ningún formato de vídeo para grabar.', 'danger');
            return;
        }
        var conAudio = conMusica && /(mp4a|opus)/.test(mime);
        if (conMusica && !conAudio) {
            aviso('Este navegador graba el vídeo sin pista de audio: la música no entrará.', 'warning');
        }
        var tipo = mime.indexOf('mp4') !== -1 ? 'video/mp4' : 'video/webm';
        var stream;
        pistaVideo = null;
        try {
            stream = lienzo.captureStream(0);
            pistaVideo = stream.getVideoTracks()[0];
            if (!pistaVideo || typeof pistaVideo.requestFrame !== 'function') {
                pistaVideo = null;
                stream = lienzo.captureStream(FPS);
            }
        } catch (e) {
            aviso('No se pudo capturar el lienzo: ' + e.message, 'danger');
            return;
        }
        if (conAudio && destAudio) {
            var pistaAudio = destAudio.stream.getAudioTracks()[0];
            if (pistaAudio) stream.addTrack(pistaAudio);
        }

        try {
            rec = new MediaRecorder(stream, {
                mimeType: mime,
                videoBitsPerSecond: bitrate(),
                audioBitsPerSecond: 128000
            });
        } catch (e) {
            try {
                rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate() });
            } catch (e2) {
                aviso('No se pudo iniciar la grabación: ' + e2.message, 'danger');
                return;
            }
        }

        trozos = [];
        cancelado = false;
        grabando = true;
        grabDur = duracionTotal();
        if (btnGrabar) btnGrabar.disabled = true;
        if (btnCancelar) btnCancelar.hidden = false;
        if (resWrap) resWrap.hidden = true;
        if (progWrap) progWrap.hidden = false;
        if (barraProg) barraProg.style.width = '0%';
        if (progBar) progBar.setAttribute('aria-valuenow', '0');
        if (estadoGrab) estadoGrab.textContent = 'Grabando… no cambies de pestaña.';

        if (conAudio && musicaEl) {
            try {
                musicaEl.currentTime = 0;
                var pm = musicaEl.play();
                if (pm && pm.catch) pm.catch(function () { });
            } catch (e) { }
        }

        rec.ondataavailable = function (ev) {
            if (ev.data && ev.data.size) trozos.push(ev.data);
        };

        rec.onerror = function () {
            grabando = false;
            if (rafGrab) { cancelAnimationFrame(rafGrab); rafGrab = null; }
            if (musicaEl) {
                try { musicaEl.pause(); musicaEl.currentTime = 0; } catch (e) { }
            }
            if (estadoGrab) estadoGrab.textContent = 'La grabación falló.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
            aviso('La grabación falló. Prueba a bajar el formato o usa otro navegador.', 'danger');
        };

        rec.onstop = function () {
            grabando = false;
            if (rafGrab) { cancelAnimationFrame(rafGrab); rafGrab = null; }
            if (musicaEl) {
                try { musicaEl.pause(); musicaEl.currentTime = 0; } catch (e) { }
            }
            var dur = Math.max(0, Math.min(grabDur, tActual));
            var blob = new Blob(trozos, { type: tipo });
            if (cancelado) {
                if (estadoGrab) estadoGrab.textContent = 'Grabación cancelada.';
                if (btnGrabar) btnGrabar.disabled = false;
                if (btnCancelar) btnCancelar.hidden = true;
                if (progWrap) progWrap.hidden = true;
                return;
            }
            preparaResultado(blob, dur);
        };

        rec.start(200);
        grabInicio = 0;
        proximoEnvio = 0;
        rafGrab = requestAnimationFrame(bucleGrabacion);
    }

    function bucleGrabacion(ts) {
        if (!grabando) return;
        if (!grabInicio) {
            grabInicio = ts;
            proximoEnvio = ts;
        }
        var D = duracionTotal();
        var t = Math.min(D, (ts - grabInicio) / 1000);
        var paso = 1000 / FPS;

        if (t >= D) {
            pintar(D);
            if (pistaVideo) { try { pistaVideo.requestFrame(); } catch (e) { } }
            actualizaProgreso(D);
            detieneGrabacion();
            return;
        }

        if (ts + 0.5 >= proximoEnvio) {
            proximoEnvio += paso;
            if (proximoEnvio <= ts) proximoEnvio = ts + paso;
            pintar(t);
            if (pistaVideo) { try { pistaVideo.requestFrame(); } catch (e) { } }
            actualizaProgreso(t);
        }
        rafGrab = requestAnimationFrame(bucleGrabacion);
    }

    function actualizaProgreso(t) {
        var D = duracionTotal();
        var pct = D > 0 ? clamp(t / D, 0, 1) * 100 : 0;
        if (barraProg) barraProg.style.width = pct.toFixed(1) + '%';
        if (progBar) progBar.setAttribute('aria-valuenow', Math.round(pct));
        if (estadoGrab) {
            estadoGrab.textContent = 'Grabando… ' + t.toFixed(1).replace('.', ',') + ' / ' +
                D.toFixed(1).replace('.', ',') + ' s';
        }
    }

    function detieneGrabacion() {
        if (!grabando || !rec) return;
        if (rafGrab) { cancelAnimationFrame(rafGrab); rafGrab = null; }
        try { rec.stop(); } catch (e) {
            grabando = false;
            aviso('No se pudo cerrar la grabación', 'danger');
        }
    }

    /* ---------- eventos de la interfaz ---------- */
    if (btnPlay) btnPlay.addEventListener('click', reproducir);

    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', function () {
            if (grabando) return;
            pausar();
            tActual = 0;
            pintar(0);
        });
    }

    if (rangoTiempo) {
        rangoTiempo.addEventListener('input', function () {
            if (grabando) return;
            if (reproduciendo) pausar();
            tActual = parseFloat(rangoTiempo.value) || 0;
            pintar(tActual);
        });
    }

    if (inpBarra) {
        inpBarra.addEventListener('change', function () {
            var b = BARRAS[parseInt(inpBarra.value, 10) || 0];
            if (!b) return;
            ajustes.barra = b.url;
            if (ajustes.coloresAuto) aplicaPaleta(b);
            cargaBarra(b.url);
            pintar(tActual);
        });
    }

    if (inpColoresAuto) {
        inpColoresAuto.addEventListener('change', function () {
            ajustes.coloresAuto = inpColoresAuto.checked;
            if (ajustes.coloresAuto) {
                aplicaPaleta(BARRAS[indiceBarra(ajustes.barra)] || BARRAS[0]);
            }
        });
    }

    if (selFormato) {
        selFormato.addEventListener('change', function () {
            if (grabando) {
                selFormato.value = ajustes.formato.w + 'x' + ajustes.formato.h;
                return;
            }
            aplicaFormato();
        });
    }

    if (selAjuste) {
        selAjuste.addEventListener('change', function () {
            ajustes.ajuste = selAjuste.value;
            pintar(tActual);
        });
    }

    if (selCajaTitulo) {
        selCajaTitulo.addEventListener('change', function () {
            ajustes.cajaTitulo = selCajaTitulo.value === '1';
            pintar(tActual);
        });
    }

    [
        [inpFondo, 'fondo'],
        [inpFondo2, 'fondo2'],
        [inpTexto, 'texto'],
        [inpAcento, 'acento'],
        [inpCaja, 'caja']
    ].forEach(function (par) {
        if (!par[0]) return;
        par[0].addEventListener('input', function () {
            ajustes[par[1]] = par[0].value;
            pintar(tActual);
        });
    });

    function enlazaCheck(inp, clave) {
        if (!inp) return;
        inp.addEventListener('change', function () {
            ajustes[clave] = inp.checked;
            pintar(tActual);
        });
    }

    enlazaCheck(inpDegradado, 'degradado');
    enlazaCheck(inpProgreso, 'progreso');
    enlazaCheck(inpTarjetaFinal, 'tarjetaFinal');
    enlazaCheck(inpZonaSegura, 'zonaSegura');

    function enlazaRango(inp, clave, val, fmt) {
        if (!inp) return;
        inp.addEventListener('input', function () {
            var v = parseFloat(inp.value);
            if (isNaN(v)) v = 0;
            ajustes[clave] = v;
            if (val) val.textContent = fmt(v);
            actualizaDuracion();
            if (tActual > duracionTotal()) tActual = duracionTotal();
            pintar(tActual);
        });
    }

    enlazaRango(inpDuracion, 'hold', valDuracion, seg);
    enlazaRango(inpEntrada, 'entrada', valEntrada, seg);
    enlazaRango(inpSalida, 'salida', valSalida, seg);
    enlazaRango(inpCierre, 'cierre', valCierre, seg);
    enlazaRango(inpZoom, 'zoom', valZoom, function (v) { return Math.round(v * 100) + ' %'; });

    function enlazaSelect(sel, clave) {
        if (!sel) return;
        sel.addEventListener('change', function () {
            ajustes[clave] = sel.value;
            pintar(tActual);
        });
    }

    enlazaSelect(selAnimImg, 'animImg');
    enlazaSelect(selAnimTitulo, 'animTitulo');
    enlazaSelect(selAnimDetalle, 'animDetalle');
    enlazaSelect(selSalidaTexto, 'salidaTexto');

    if (btnAgregar) {
        btnAgregar.addEventListener('click', function () {
            if (noticias.length >= MAX_NOTICIAS) {
                aviso('Máximo ' + MAX_NOTICIAS + ' noticias', 'warning');
                return;
            }
            noticias.push(noticiaVacia());
            pintaLista();
            actualizaDuracion();
            pintar(tActual);
            var ultima = lista.querySelector('.rn-ficha:last-child input[data-campo="titulo"]');
            if (ultima) ultima.focus();
        });
    }

    if (btnVaciar) btnVaciar.addEventListener('click', vaciaGuion);

    if (lista) {
        lista.addEventListener('input', function (e) {
            var el = e.target;
            var i = parseInt(el.dataset.i, 10);
            var campo = el.dataset.campo;
            if (isNaN(i) || !campo || !noticias[i]) return;
            noticias[i][campo] = el.value;
            if (!grabando) pintar(tActual);
        });

        lista.addEventListener('change', function (e) {
            var el = e.target;
            if (el.dataset.img != null) {
                var i = parseInt(el.dataset.img, 10);
                if (!isNaN(i)) leeImagen(el.files && el.files[0], i);
                el.value = '';
                return;
            }
            if (el.dataset.video != null) {
                var j = parseInt(el.dataset.video, 10);
                if (!isNaN(j)) cargaVideo(el.files && el.files[0], j);
                el.value = '';
            }
        });

        lista.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('button[data-accion]') : null;
            if (!btn) return;
            var i = parseInt(btn.dataset.i, 10);
            if (isNaN(i)) return;
            var accion = btn.dataset.accion;
            if (accion === 'subir') mueveNoticia(i, -1);
            else if (accion === 'bajar') mueveNoticia(i, 1);
            else if (accion === 'quitar') borraNoticia(i);
            else if (accion === 'quitar-video') quitaVideo(i);
        });
    }

    if (inpMusica) {
        inpMusica.addEventListener('change', function () {
            cargaMusica(inpMusica.files && inpMusica.files[0]);
            inpMusica.value = '';
        });
    }

    if (btnQuitarMusica) btnQuitarMusica.addEventListener('click', quitaMusica);

    if (volMusica) {
        volMusica.addEventListener('input', function () {
            var v = parseFloat(volMusica.value) || 0;
            if (valVolMusica) valVolMusica.textContent = Math.round(v * 100) + ' %';
            if (ganMusica) ganMusica.gain.value = v;
        });
    }

    if (btnGrabar) btnGrabar.addEventListener('click', empiezaGrabacion);

    if (btnCancelar) {
        btnCancelar.addEventListener('click', function () {
            cancelado = true;
            detieneGrabacion();
        });
    }

    if (btnDescartar) {
        btnDescartar.addEventListener('click', function () {
            if (videoRes) {
                videoRes.pause();
                videoRes.removeAttribute('src');
                videoRes.load();
            }
            if (urlResultado) URL.revokeObjectURL(urlResultado);
            urlResultado = null;
            blobResultado = null;
            archivoResultado = null;
            if (resWrap) resWrap.hidden = true;
            if (btnDescargar) btnDescargar.href = '#';
            if (estadoGrab) estadoGrab.textContent = '';
        });
    }

    if (btnCompartir) {
        btnCompartir.addEventListener('click', function () {
            if (!archivoResultado) return;
            if (navigator.canShare && navigator.canShare({ files: [archivoResultado] })) {
                navigator.share({ files: [archivoResultado], title: 'Reel de noticias' }).catch(function () { });
            }
        });
    }

    var pestanas = document.getElementById('rn-pestanas');
    if (pestanas) {
        pestanas.addEventListener('shown.bs.tab', function () { pintar(tActual); });
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && reproduciendo) pausar();
    });

    /* ---------- arranque ---------- */
    function arranca() {
        pintaSelectBarras();
        sincronizaControles();
        pintaLista();
        pintaListaMusica();
        aplicaFormato();
        cargaBarra(ajustes.barra);
        cargaImagen('./public/img/Logotet.png', function (img) {
            logoImg = img;
            pintar(tActual);
        });
        /* la primera vista muestra la noticia ya entrada, no el lienzo vacío */
        tActual = entEfectiva();
        pintar(tActual);
    }

    cargarPlantillasData(function () {
        arranca();
        if (location.protocol === 'file:' && !window.TET_PLANTILLAS) {
            aviso('No se pudieron cargar las imágenes embebidas. En modo archivo la grabación puede fallar; abre la página desde el servidor local.', 'warning');
        }
    });

    window.tetReelNoticias = {
        pintar: pintar,
        ir: function (t) { pausar(); tActual = clamp(t, 0, duracionTotal()); pintar(tActual); },
        estado: function () { return { t: tActual, total: duracionTotal(), estado: estadoEn(tActual) }; },
        noticias: function () { return noticias; }
    };
})();
