/* Reel de cuadros (reel.html) — una rejilla de portadas donde cada cuadro se
   abre, los demás se ocultan, sale su texto o su vídeo y después se cierra para
   dar paso al siguiente. Todo se dibuja en un canvas desde cero en cada
   fotograma y se graba con canvas.captureStream + MediaRecorder, sin
   dependencias y sin subir nada a ningún servidor. */
(function () {
    'use strict';

    var FPS = 30;
    var MAX_CUADROS = 12;
    var FUENTE = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';

    /* ---------- estado ---------- */
    var cuadros = [];
    var ajustes = {
        formato: { w: 1080, h: 1080 },
        columnas: 3,
        usarVideo: true,
        hold: 2.8,
        trans: 0.65,
        intro: 0.9,
        outro: 1.2,
        fondo: '#17181b',
        panel: '#232529',
        texto: '#ffffff',
        suave: '#9aa4b2',
        acento: '#3ea6ff',
        cabecera: '#ConRobots',
        firma: 'somostet.com',
        seccion: 'Recomendaciones'
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
    var nombreResultado = 'reel.mp4';
    var archivoResultado = null;

    /* ---------- DOM ---------- */
    var lienzo = document.getElementById('reel-lienzo');
    var ctx = lienzo.getContext('2d');
    var lista = document.getElementById('reel-lista');
    var btnPlay = document.getElementById('reel-play');
    var btnReiniciar = document.getElementById('reel-reiniciar');
    var rangoTiempo = document.getElementById('reel-tiempo');
    var reloj = document.getElementById('reel-reloj');
    var inpCabecera = document.getElementById('reel-cabecera');
    var inpFirma = document.getElementById('reel-firma');
    var inpSeccion = document.getElementById('reel-seccion');
    var btnAgregar = document.getElementById('reel-agregar');
    var selFormato = document.getElementById('reel-formato');
    var selColumnas = document.getElementById('reel-columnas');
    var selVideo = document.getElementById('reel-video-min');
    var inpDuracion = document.getElementById('reel-duracion');
    var inpTransicion = document.getElementById('reel-transicion');
    var inpEntrada = document.getElementById('reel-entrada');
    var inpSalida = document.getElementById('reel-salida');
    var valDuracion = document.getElementById('reel-duracion-val');
    var valTransicion = document.getElementById('reel-transicion-val');
    var valEntrada = document.getElementById('reel-entrada-val');
    var valSalida = document.getElementById('reel-salida-val');
    var inpAcento = document.getElementById('reel-acento');
    var inpFondo = document.getElementById('reel-fondo');
    var inpPanel = document.getElementById('reel-panel');
    var inpTexto = document.getElementById('reel-texto');
    var inpSuave = document.getElementById('reel-suave');
    var inpMusica = document.getElementById('reel-musica-archivo');
    var btnQuitarMusica = document.getElementById('reel-musica-quitar');
    var nombreMusica = document.getElementById('reel-musica-nombre');
    var volMusica = document.getElementById('reel-musica-vol');
    var valVolMusica = document.getElementById('reel-musica-vol-val');
    var infoSalida = document.getElementById('reel-info-salida');
    var btnGrabar = document.getElementById('reel-grabar');
    var btnCancelar = document.getElementById('reel-cancelar');
    var estadoGrab = document.getElementById('reel-estado');
    var progWrap = document.getElementById('reel-progreso');
    var barraProg = document.getElementById('reel-barra');
    var progBar = progWrap ? progWrap.querySelector('.progress') : null;
    var resWrap = document.getElementById('reel-resultado');
    var videoRes = document.getElementById('reel-video-resultado');
    var btnDescargar = document.getElementById('reel-descargar');
    var btnCompartir = document.getElementById('reel-compartir');
    var btnDescartar = document.getElementById('reel-descartar');
    var pesoRes = document.getElementById('reel-peso');

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

    /* #rgb / #rrggbb -> rgba() */
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

    /* ---------- modelo ---------- */
    function cuadroVacio(titulo, texto) {
        return {
            titulo: titulo || '',
            texto: texto || '',
            img: null,
            imgUrl: null,
            video: null,
            videoUrl: null,
            videoNombre: ''
        };
    }

    function cuadrosIniciales() {
        return [
            cuadroVacio('Detroit: Become Human', 'Una historia sobre lo que significa ser humano.'),
            cuadroVacio('NieR: Automata', 'Un viaje por un mundo devastado por las máquinas.'),
            cuadroVacio('Portal & Portal 2', 'Puzles, portales y mucho humor negro.'),
            cuadroVacio('Horizon: Zero Dawn', 'Paisajes imposibles y máquinas gigantes.'),
            cuadroVacio('tet', 'La tecnología tiene su espacio.'),
            cuadroVacio('Xenoblade Chronicles', 'La trilogía que hay que jugar.')
        ];
    }

    cuadros = cuadrosIniciales();

    /* ---------- geometría ---------- */
    function unidad(W, H) { return Math.min(W, H); }

    function cabeceraAlto(W, H) {
        var u = unidad(W, H);
        if (H > W * 1.12) return u * 0.24;      // vertical: la cabecera no se come el alto
        if (W > H * 1.25) return H * 0.24;      // horizontal
        return H * 0.215;                        // cuadrado
    }

    function geomRejilla(W, H) {
        var u = unidad(W, H);
        var p = u * 0.052;
        var hh = cabeceraAlto(W, H);
        var area = { x: p, y: hh, w: W - 2 * p, h: H - hh - u * 0.095 };
        var cols = ajustes.columnas;
        var n = Math.max(1, cuadros.length);
        var filas = Math.ceil(n / cols);
        var gap = u * 0.028;
        var tituloTam = u * 0.030;
        var tituloAlto = tituloTam * 2.5;
        var celdaW = (area.w - gap * (cols - 1)) / cols;
        var celdaH = celdaW + tituloAlto;
        var totalH = filas * celdaH + gap * (filas - 1);
        if (totalH > area.h && totalH > 0) {
            var k = (area.h - gap * (filas - 1)) / (filas * celdaH);
            k = Math.max(0.2, k);
            celdaW *= k;
            celdaH *= k;
            tituloAlto *= k;
            tituloTam *= k;
        }
        var rejW = cols * celdaW + gap * (cols - 1);
        var rejH = filas * celdaH + gap * (filas - 1);
        var x0 = area.x + (area.w - rejW) / 2;
        var y0 = area.y + Math.max(0, (area.h - rejH) / 2);
        var celdas = [];
        for (var i = 0; i < n; i++) {
            var col = i % cols;
            var fila = Math.floor(i / cols);
            celdas.push({
                x: x0 + col * (celdaW + gap),
                y: y0 + fila * (celdaH + gap),
                w: celdaW,
                h: celdaW,
                tituloY: y0 + fila * (celdaH + gap) + celdaW + tituloTam * 0.55
            });
        }
        return {
            u: u, p: p, hh: hh, area: area, gap: gap,
            celdaW: celdaW, celdaH: celdaH, tituloTam: tituloTam,
            celdas: celdas
        };
    }

    function geomHero(W, H) {
        var u = unidad(W, H);
        var p = u * 0.052;
        var hh = cabeceraAlto(W, H);
        var area = { x: p, y: hh, w: W - 2 * p, h: H - hh - p * 0.9 };
        var vertical = H > W * 1.12;
        if (vertical) {
            var imgH = area.h * 0.55;
            return {
                u: u, p: p, hh: hh, area: area, vertical: vertical,
                img: { x: area.x, y: area.y, w: area.w, h: imgH },
                txt: {
                    x: area.x,
                    y: area.y + imgH + u * 0.055,
                    w: area.w,
                    h: area.h - imgH - u * 0.055
                }
            };
        }
        var imgW = area.w * 0.56;
        return {
            u: u, p: p, hh: hh, area: area, vertical: vertical,
            img: { x: area.x, y: area.y, w: imgW, h: area.h },
            txt: {
                x: area.x + imgW + u * 0.055,
                y: area.y,
                w: area.w - imgW - u * 0.055,
                h: area.h
            }
        };
    }

    /* ---------- tiempo ---------- */
    function duracionTotal() {
        var n = cuadros.length;
        return ajustes.intro + n * (ajustes.trans + ajustes.hold + ajustes.trans) + ajustes.outro;
    }

    function estadoEn(t) {
        var D = duracionTotal();
        t = clamp(t, 0, D);
        if (t < ajustes.intro) {
            return { modo: 'grid', idx: -1, p: 0, entrada: easeOut(t / Math.max(0.001, ajustes.intro)), local: 0 };
        }
        var r = t - ajustes.intro;
        var ciclo = ajustes.trans + ajustes.hold + ajustes.trans;
        var i = Math.floor(r / ciclo);
        if (i >= cuadros.length) {
            return { modo: 'grid', idx: cuadros.length - 1, p: 0, entrada: 1, local: 0, fin: true };
        }
        var local = r - i * ciclo;
        if (local < ajustes.trans) {
            return { modo: 'abriendo', idx: i, p: easeInOut(local / ajustes.trans), entrada: 1, local: local };
        }
        local -= ajustes.trans;
        if (local < ajustes.hold) {
            return { modo: 'hero', idx: i, p: 1, entrada: 1, local: local };
        }
        local -= ajustes.hold;
        return { modo: 'cerrando', idx: i, p: 1 - easeInOut(local / ajustes.trans), entrada: 1, local: local };
    }

    /* ---------- dibujo ---------- */
    function fondo(W, H) {
        ctx.fillStyle = ajustes.fondo;
        ctx.fillRect(0, 0, W, H);

        var u = unidad(W, H);
        var g = ctx.createRadialGradient(W * 0.18, H * 0.12, 0, W * 0.18, H * 0.12, Math.max(W, H) * 0.9);
        g.addColorStop(0, rgba(ajustes.acento, 0.14));
        g.addColorStop(0.55, rgba(ajustes.acento, 0.035));
        g.addColorStop(1, rgba(ajustes.acento, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        var vg = ctx.createRadialGradient(W / 2, H / 2, u * 0.25, W / 2, H / 2, Math.max(W, H) * 0.76);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    }

    function cabecera(W, H, est) {
        var u = unidad(W, H);
        var p = u * 0.052;
        var hh = cabeceraAlto(W, H);
        var abre = est.p || 0;
        var alphaTitulo = (1 - suave(Math.min(1, abre / 0.7))) * (0.90 + 0.10 * (est.entrada == null ? 1 : est.entrada));

        ctx.save();
        ctx.textBaseline = 'top';

        ctx.globalAlpha = 0.82;
        ctx.fillStyle = ajustes.texto;
        ctx.font = '600 ' + (u * 0.026) + 'px ' + FUENTE;
        ctx.textAlign = 'left';
        ctx.fillText(ajustes.firma, p, p * 0.62);

        ctx.textAlign = 'right';
        ctx.fillText(ajustes.seccion, W - p, p * 0.62);

        var lineaY = p * 0.62 + u * 0.038;
        var lg = ctx.createLinearGradient(p, 0, W - p, 0);
        lg.addColorStop(0, rgba(ajustes.acento, 0.7));
        lg.addColorStop(0.55, rgba(ajustes.acento, 0.14));
        lg.addColorStop(1, rgba(ajustes.acento, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = lg;
        ctx.fillRect(p, lineaY, W - 2 * p, Math.max(1.5, u * 0.0025));

        if (alphaTitulo > 0.01) {
            ctx.globalAlpha = alphaTitulo;
            ctx.fillStyle = ajustes.texto;
            var tam = u * 0.092;
            ctx.font = '800 ' + tam + 'px ' + FUENTE;
            while (tam > u * 0.045 && ctx.measureText(ajustes.cabecera).width > W - 2 * p) {
                tam -= u * 0.004;
                ctx.font = '800 ' + tam + 'px ' + FUENTE;
            }
            ctx.textAlign = 'left';
            ctx.fillText(ajustes.cabecera, p, hh * 0.40 + (1 - est.entrada) * u * 0.018);
        }
        ctx.restore();
    }

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
            lineas[maxLineas - 1] = ultima.replace(/[\s,;:.-]+$/, '') + '…';
        }
        return lineas;
    }

    function tituloAjustado(texto, x, y, maxW, maxH, peso, tamMax, tamMin, color) {
        var tam = tamMax;
        var lineas = [];
        var lh = 0;
        for (var intento = 0; intento < 40; intento++) {
            ctx.font = peso + ' ' + tam + 'px ' + FUENTE;
            lineas = parteTexto(texto, maxW, 4);
            lh = tam * 1.08;
            if (lineas.length * lh <= maxH || tam <= tamMin) break;
            tam -= Math.max(1, tam * 0.06);
        }
        tam = Math.max(tamMin, tam);
        ctx.font = peso + ' ' + tam + 'px ' + FUENTE;
        lineas = parteTexto(texto, maxW, 4);
        lh = tam * 1.08;
        ctx.fillStyle = color || ajustes.texto;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lineas.forEach(function (linea, i) {
            ctx.fillText(linea, x, y + i * lh);
        });
        return y + lineas.length * lh;
    }

    function cubrir(obj, r, zoom, alpha) {
        var iw = obj.videoWidth || obj.naturalWidth || obj.width || 0;
        var ih = obj.videoHeight || obj.naturalHeight || obj.height || 0;
        if (!iw || !ih) return;
        var s = Math.max(r.w / iw, r.h / ih) * (zoom || 1);
        var dw = iw * s;
        var dh = ih * s;
        var anterior = ctx.globalAlpha;
        ctx.globalAlpha = anterior * (alpha == null ? 1 : alpha);
        ctx.drawImage(obj, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
        ctx.globalAlpha = anterior;
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
        ctx.globalAlpha = 0.18;
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
        ctx.fillText('SIN PORTADA', r.x + r.w / 2, r.y + r.h * 0.70);
        ctx.restore();
    }

    function medioDe(c) {
        if (c.img) return c.img;
        if (ajustes.usarVideo && c.video && c.video.readyState >= 2) return c.video;
        return null;
    }

    function dibujaTarjeta(i, celda, alpha, g) {
        var c = cuadros[i];
        if (!c || alpha <= 0.003) return;
        var u = g.u;
        var r = { x: celda.x, y: celda.y, w: celda.w, h: celda.h };
        var radio = u * 0.012;

        ctx.save();
        ctx.globalAlpha = alpha;

        /* sombra de la portada */
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = u * 0.022;
        ctx.shadowOffsetY = u * 0.009;
        ctx.fillStyle = ajustes.panel;
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.fill();
        ctx.restore();

        ctx.save();
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.clip();
        var medio = medioDe(c);
        if (medio) cubrir(medio, r, 1);
        else portadaVacia(i, r);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = Math.max(1, u * 0.0012);
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.stroke();

        /* título bajo la portada */
        var titulo = c.titulo || ('Cuadro ' + (i + 1));
        ctx.fillStyle = ajustes.texto;
        ctx.globalAlpha = alpha * 0.94;
        ctx.font = '600 ' + g.tituloTam + 'px ' + FUENTE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var lineas = parteTexto(titulo, celda.w * 0.96, 2);
        for (var l = 0; l < lineas.length; l++) {
            ctx.fillText(lineas[l], celda.x + celda.w / 2, celda.tituloY + l * g.tituloTam * 1.16);
        }
        ctx.restore();
    }

    function dibujaImagenHero(i, r, est, hg) {
        var c = cuadros[i];
        var u = hg.u;
        var radio = u * 0.028;
        var p = est.p;

        /* halo de acento */
        ctx.save();
        ctx.shadowColor = rgba(ajustes.acento, 0.35);
        ctx.shadowBlur = u * 0.05;
        ctx.fillStyle = ajustes.panel;
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.fill();
        ctx.restore();

        ctx.save();
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.clip();

        var zoom = 1;
        if (est.modo === 'hero') {
            zoom = 1 + 0.035 * clamp(est.local / Math.max(0.001, ajustes.hold), 0, 1);
        }
        var medio = medioDe(c);
        if (medio) cubrir(medio, r, zoom);
        else portadaVacia(i, r);

        if (ajustes.usarVideo && c.video && c.video.readyState >= 2 && p > 0.30) {
            var aVideo = suave((p - 0.30) / 0.45);
            cubrir(c.video, r, zoom, aVideo);
        }
        ctx.restore();

        ctx.strokeStyle = rgba(ajustes.acento, 0.72);
        ctx.lineWidth = Math.max(1.5, u * 0.0035);
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.stroke();

        /* chapa «VÍDEO» */
        if (ajustes.usarVideo && c.video && p > 0.55) {
            ctx.save();
            ctx.globalAlpha = suave((p - 0.55) / 0.35);
            var chipH = u * 0.038;
            var chipW = u * 0.102;
            var cx = r.x + u * 0.022;
            var cy = r.y + u * 0.022;
            ctx.fillStyle = 'rgba(0,0,0,0.62)';
            rectRedondeado(ctx, cx, cy, chipW, chipH, chipH / 2);
            ctx.fill();
            ctx.fillStyle = ajustes.acento;
            ctx.beginPath();
            ctx.moveTo(cx + chipH * 0.36, cy + chipH * 0.28);
            ctx.lineTo(cx + chipH * 0.36, cy + chipH * 0.72);
            ctx.lineTo(cx + chipH * 0.68, cy + chipH * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = ajustes.texto;
            ctx.font = '700 ' + (u * 0.018) + 'px ' + FUENTE;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('VÍDEO', cx + chipH * 0.85, cy + chipH * 0.52);
            ctx.restore();
        }
    }

    function dibujaTextoHero(i, est, hg) {
        var c = cuadros[i];
        var u = hg.u;
        var t = hg.txt;
        var p = est.p;
        var alpha = suave((p - 0.62) / 0.38);
        if (alpha <= 0.003) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textBaseline = 'top';

        /* índice */
        ctx.fillStyle = ajustes.acento;
        ctx.font = '700 ' + (u * 0.022) + 'px ' + FUENTE;
        ctx.textAlign = 'left';
        ctx.fillText(pad2(i + 1) + ' / ' + pad2(cuadros.length), t.x, t.y);

        /* regla de acento */
        ctx.fillStyle = rgba(ajustes.acento, 0.85);
        ctx.fillRect(t.x, t.y + u * 0.040, u * 0.055, Math.max(2, u * 0.0035));

        var titulo = c.titulo || ('Cuadro ' + (i + 1));
        var yTitulo = t.y + u * 0.062;
        var yFin = tituloAjustado(titulo, t.x, yTitulo, t.w, t.h * (hg.vertical ? 0.34 : 0.42),
            '800', u * 0.070, u * 0.040, ajustes.texto);

        /* texto */
        if (c.texto) {
            var tamTexto = u * 0.028;
            var lh = tamTexto * 1.45;
            var maxLineas = Math.max(2, Math.floor((t.h - (yFin - t.y) - u * 0.10) / lh));
            maxLineas = Math.min(maxLineas, hg.vertical ? 4 : 7);
            ctx.font = '400 ' + tamTexto + 'px ' + FUENTE;
            ctx.fillStyle = ajustes.suave;
            var lineas = parteTexto(c.texto, t.w, maxLineas);
            lineas.forEach(function (linea, k) {
                ctx.fillText(linea, t.x, yFin + u * 0.035 + k * lh);
            });
        }

        /* pie */
        ctx.fillStyle = ajustes.suave;
        ctx.globalAlpha = alpha * 0.65;
        ctx.font = '500 ' + (u * 0.019) + 'px ' + FUENTE;
        ctx.fillText(ajustes.firma, t.x, t.y + t.h - u * 0.020);

        ctx.restore();
    }

    function dibujaProgreso(W, H, est) {
        var u = unidad(W, H);
        var n = cuadros.length;
        if (!n) return;
        var radio = Math.max(2, u * 0.0036);
        var gap = u * 0.014;
        var total = (n - 1) * gap;
        var x = (W - total) / 2;
        var y = H - u * 0.030;

        for (var i = 0; i < n; i++) {
            var activo = i === est.idx && est.p > 0.5;
            ctx.beginPath();
            ctx.arc(x + i * gap, y, activo ? radio * 1.5 : radio, 0, Math.PI * 2);
            ctx.fillStyle = activo ? ajustes.acento : 'rgba(255,255,255,0.24)';
            ctx.fill();
        }

        var D = duracionTotal();
        var prog = D > 0 ? clamp(tActual / D, 0, 1) : 0;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, H - Math.max(2, u * 0.004), W, Math.max(2, u * 0.004));
        ctx.fillStyle = rgba(ajustes.acento, 0.8);
        ctx.fillRect(0, H - Math.max(2, u * 0.004), W * prog, Math.max(2, u * 0.004));
    }

    function sincronizaVideos(est, tocando) {
        var idx = est.idx;
        for (var i = 0; i < cuadros.length; i++) {
            var c = cuadros[i];
            if (!c.video) continue;
            var esActivo = ajustes.usarVideo && i === idx && est.modo !== 'grid' && est.p > 0.05;
            if (!esActivo) {
                if (!c.video.paused) c.video.pause();
                if (c.video.currentTime > 0.04) {
                    try { c.video.currentTime = 0; } catch (e) { }
                }
                continue;
            }
            if (est.modo === 'hero') {
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
                    var objetivo = est.local % durV;
                    if (Math.abs(c.video.currentTime - objetivo) > 0.08) {
                        try { c.video.currentTime = objetivo; } catch (e) { }
                    }
                }
            } else {
                if (!c.video.paused) c.video.pause();
                if (c.video.currentTime > 0.04) {
                    try { c.video.currentTime = 0; } catch (e) { }
                }
            }
        }
    }

    function pintar(t) {
        var W = lienzo.width;
        var H = lienzo.height;
        var D = duracionTotal();
        t = clamp(t, 0, D);
        tActual = t;
        var est = estadoEn(t);

        sincronizaVideos(est, reproduciendo || grabando);

        ctx.clearRect(0, 0, W, H);
        fondo(W, H);

        var g = geomRejilla(W, H);
        var hg = geomHero(W, H);

        /* rejilla */
        var alphaRejilla = (1 - suave(Math.min(1, est.p / 0.55))) * (0.90 + 0.10 * est.entrada);
        ctx.save();
        for (var i = 0; i < cuadros.length; i++) {
            if (i === est.idx && est.p > 0.001) continue;
            var desplaz = (1 - est.entrada) * g.u * 0.02;
            var celda = g.celdas[i];
            ctx.save();
            var escala = (1 - 0.035 * suave(est.p)) * (0.985 + 0.015 * est.entrada);
            var cx = celda.x + celda.w / 2;
            var cy = celda.y + celda.h / 2;
            ctx.translate(0, desplaz);
            ctx.translate(cx, cy);
            ctx.scale(escala, escala);
            ctx.translate(-cx, -cy);
            dibujaTarjeta(i, celda, alphaRejilla, g);
            ctx.restore();
        }
        ctx.restore();

        /* tarjeta activa: morfa de su celda al héroe */
        if (est.idx >= 0 && est.p > 0.001) {
            var a = g.celdas[est.idx];
            var b = hg.img;
            var pr = easeInOut(est.p);
            var r = {
                x: lerp(a.x, b.x, pr),
                y: lerp(a.y, b.y, pr),
                w: lerp(a.w, b.w, pr),
                h: lerp(a.h, b.h, pr)
            };
            dibujaImagenHero(est.idx, r, est, hg);

            /* el título de la celda se va apagando */
            if (est.p < 0.35) {
                var c = cuadros[est.idx];
                ctx.save();
                ctx.globalAlpha = (1 - suave(est.p / 0.35));
                ctx.fillStyle = ajustes.texto;
                ctx.font = '600 ' + g.tituloTam + 'px ' + FUENTE;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                var titulo = c.titulo || ('Cuadro ' + (est.idx + 1));
                var lineas = parteTexto(titulo, a.w * 0.96, 2);
                for (var l = 0; l < lineas.length; l++) {
                    ctx.fillText(lineas[l], a.x + a.w / 2, a.tituloY + l * g.tituloTam * 1.16);
                }
                ctx.restore();
            }

            dibujaTextoHero(est.idx, est, hg);
        }

        cabecera(W, H, est);
        dibujaProgreso(W, H, est);

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
        var D = duracionTotal();
        if (tActual >= D) {
            tActual = 0;
            pintar(tActual);
        } else {
            pintar(tActual);
        }
        rafPreview = requestAnimationFrame(buclePreview);
    }

    /* ---------- lista de cuadros ---------- */
    function pintaLista() {
        if (!lista) return;
        var html = '';
        cuadros.forEach(function (c, i) {
            var tieneImg = !!c.imgUrl;
            var videoTxt = c.video ? c.videoNombre : 'Sin vídeo';
            html += '<div class="reel-ficha" data-i="' + i + '">' +
                '<div class="reel-ficha-num">' + pad2(i + 1) + '</div>' +
                '<label class="reel-ficha-thumb" for="reel-img-' + i + '" title="Elegir la portada del cuadro ' + (i + 1) + '">' +
                (tieneImg
                    ? '<img src="' + esc(c.imgUrl) + '" alt="Portada del cuadro ' + (i + 1) + '">'
                    : '<span><i class="fas fa-image" aria-hidden="true"></i>Portada</span>') +
                '</label>' +
                '<input type="file" class="d-none" id="reel-img-' + i + '" accept="image/*" data-img="' + i + '">' +
                '<div class="reel-ficha-campos">' +
                '<input type="text" class="form-control" data-campo="titulo" data-i="' + i + '" maxlength="80" value="' + esc(c.titulo) + '" placeholder="Título del cuadro" aria-label="Título del cuadro ' + (i + 1) + '">' +
                '<textarea class="form-control" data-campo="texto" data-i="' + i + '" rows="2" maxlength="240" placeholder="Texto que sale al abrirse (opcional)" aria-label="Texto del cuadro ' + (i + 1) + '">' + esc(c.texto) + '</textarea>' +
                '<div class="reel-ficha-media">' +
                '<label class="btn btn-sm btn-outline-secondary" for="reel-video-' + i + '"><i class="fas fa-film" aria-hidden="true"></i> Vídeo</label>' +
                '<input type="file" class="d-none" id="reel-video-' + i + '" accept="video/*" data-video="' + i + '">' +
                '<span class="reel-ficha-video' + (c.video ? ' is-activo' : '') + '" data-video-nombre="' + i + '" title="' + esc(videoTxt) + '">' + esc(videoTxt) + '</span>' +
                (c.video ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-accion="quitar-video" data-i="' + i + '" title="Quitar el vídeo" aria-label="Quitar el vídeo del cuadro ' + (i + 1) + '"><i class="fas fa-times" aria-hidden="true"></i></button>' : '') +
                '</div>' +
                '</div>' +
                '<div class="reel-ficha-acciones">' +
                '<button type="button" data-accion="subir" data-i="' + i + '" title="Subir" aria-label="Subir el cuadro ' + (i + 1) + '"' + (i === 0 ? ' disabled' : '') + '><i class="fas fa-arrow-up" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="bajar" data-i="' + i + '" title="Bajar" aria-label="Bajar el cuadro ' + (i + 1) + '"' + (i === cuadros.length - 1 ? ' disabled' : '') + '><i class="fas fa-arrow-down" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="quitar" data-i="' + i + '" title="Quitar" aria-label="Quitar el cuadro ' + (i + 1) + '"><i class="fas fa-trash" aria-hidden="true"></i></button>' +
                '</div>' +
                '</div>';
        });
        lista.innerHTML = html;
    }

    function pintaMiniatura(i) {
        var c = cuadros[i];
        var label = lista.querySelector('.reel-ficha[data-i="' + i + '"] .reel-ficha-thumb');
        if (!label) return;
        if (c.imgUrl) {
            label.innerHTML = '<img src="' + esc(c.imgUrl) + '" alt="Portada del cuadro ' + (i + 1) + '">';
        } else {
            label.innerHTML = '<span><i class="fas fa-image" aria-hidden="true"></i>Portada</span>';
        }
    }

    function actualizaNombreVideo(i) {
        var c = cuadros[i];
        var el = lista.querySelector('[data-video-nombre="' + i + '"]');
        if (!el) return;
        el.textContent = c.video ? c.videoNombre : 'Sin vídeo';
        el.title = el.textContent;
        el.classList.toggle('is-activo', !!c.video);
        var ficha = lista.querySelector('.reel-ficha[data-i="' + i + '"]');
        if (!ficha) return;
        var boton = ficha.querySelector('[data-accion="quitar-video"]');
        if (c.video && !boton) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-sm btn-outline-secondary';
            b.dataset.accion = 'quitar-video';
            b.dataset.i = i;
            b.title = 'Quitar el vídeo';
            b.setAttribute('aria-label', 'Quitar el vídeo del cuadro ' + (i + 1));
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
                cuadros[i].img = img;
                cuadros[i].imgUrl = lector.result;
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
        var c = cuadros[i];
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
        v.addEventListener('loadeddata', function () { pintar(tActual); }, { once: false });
        v.addEventListener('seeked', function () {
            if (!reproduciendo && !grabando) pintar(tActual);
        });
        v.addEventListener('error', function () { aviso('No se pudo abrir el vídeo «' + file.name + '»', 'danger'); });
        c.video = v;
        actualizaNombreVideo(i);
        pintar(tActual);
    }

    function quitaVideo(i) {
        var c = cuadros[i];
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

    function borraCuadro(i) {
        if (cuadros.length <= 1) {
            aviso('Deja al menos un cuadro', 'warning');
            return;
        }
        var c = cuadros[i];
        if (c.video) {
            try { c.video.pause(); } catch (e) { }
            if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        }
        cuadros.splice(i, 1);
        pintaLista();
        actualizaDuracion();
        pintar(Math.min(tActual, duracionTotal()));
    }

    function mueveCuadro(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= cuadros.length) return;
        var aux = cuadros[i];
        cuadros[i] = cuadros[j];
        cuadros[j] = aux;
        pintaLista();
        pintar(tActual);
    }

    /* ---------- formato y ajustes ---------- */
    function aplicaFormato() {
        var partes = selFormato.value.split('x');
        var w = parseInt(partes[0], 10) || 1080;
        var h = parseInt(partes[1], 10) || 1080;
        ajustes.formato = { w: w, h: h };
        lienzo.width = w;
        lienzo.height = h;
        if (infoSalida) infoSalida.textContent = w + ' × ' + h + ' · 30 fps';
        if (tActual > duracionTotal()) tActual = 0;
        pintar(tActual);
    }

    function sincronizaControles() {
        inpCabecera.value = ajustes.cabecera;
        inpFirma.value = ajustes.firma;
        inpSeccion.value = ajustes.seccion;
        selColumnas.value = String(ajustes.columnas);
        selVideo.value = ajustes.usarVideo ? '1' : '0';
        inpDuracion.value = ajustes.hold;
        inpTransicion.value = ajustes.trans;
        inpEntrada.value = ajustes.intro;
        inpSalida.value = ajustes.outro;
        valDuracion.textContent = seg(ajustes.hold);
        valTransicion.textContent = seg(ajustes.trans);
        valEntrada.textContent = seg(ajustes.intro);
        valSalida.textContent = seg(ajustes.outro);
        inpAcento.value = ajustes.acento;
        inpFondo.value = ajustes.fondo;
        inpPanel.value = ajustes.panel;
        inpTexto.value = ajustes.texto;
        inpSuave.value = ajustes.suave;
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
    }

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
        var lista = conAudio ? audio.concat(video) : video;
        for (var i = 0; i < lista.length; i++) {
            if (window.MediaRecorder && MediaRecorder.isTypeSupported(lista[i])) return lista[i];
        }
        return '';
    }

    function bitrate() {
        var W = lienzo.width;
        var H = lienzo.height;
        return Math.max(1500000, Math.min(24000000, Math.round(W * H * FPS * 0.10)));
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
        nombreResultado = 'reel-' + lienzo.width + 'x' + lienzo.height + '-' + fechaCorta() + '.' + ext;

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
            if (pesoRes) pesoRes.textContent = 'Archivo: ' + nombreResultado + ' · ' + (b.size / 1048576).toFixed(1).replace('.', ',') + ' MB' + (dur > 0 ? ' · ' + seg(dur) : '');
            if (resWrap) resWrap.hidden = false;
            if (estadoGrab) estadoGrab.textContent = 'Vídeo listo.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
        };

        /* el MP4 fragmentado de MediaRecorder guarda la duración en 0:
           se reescribe con la duración real antes de ofrecer la descarga */
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

    function fechaCorta() {
        var d = new Date();
        return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
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
            /* captura manual: se envía un fotograma por cada pintado del bucle.
               Así el tiempo del vídeo sigue al reloj real y no se adelanta el
               contenido cuando el codificador tarda en arrancar. */
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
        btnGrabar.disabled = true;
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
        /* el tiempo sale del reloj real: lo que se ve en pantalla y lo que
           queda grabado avanzan a la vez, aunque el navegador pierda algún
           fotograma al empezar */
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
            if (proximoEnvio <= ts) {
                proximoEnvio = ts + paso;
            }
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
        if (estadoGrab) estadoGrab.textContent = 'Grabando… ' + t.toFixed(1).replace('.', ',') + ' / ' + D.toFixed(1).replace('.', ',') + ' s';
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
    btnPlay.addEventListener('click', reproducir);
    btnReiniciar.addEventListener('click', function () {
        if (grabando) return;
        pausar();
        tActual = 0;
        pintar(0);
    });
    rangoTiempo.addEventListener('input', function () {
        if (grabando) return;
        if (reproduciendo) pausar();
        tActual = parseFloat(rangoTiempo.value) || 0;
        pintar(tActual);
    });

    inpCabecera.addEventListener('input', function () { ajustes.cabecera = inpCabecera.value; pintar(tActual); });
    inpFirma.addEventListener('input', function () { ajustes.firma = inpFirma.value; pintar(tActual); });
    inpSeccion.addEventListener('input', function () { ajustes.seccion = inpSeccion.value; pintar(tActual); });

    selFormato.addEventListener('change', function () {
        if (grabando) { selFormato.value = ajustes.formato.w + 'x' + ajustes.formato.h; return; }
        aplicaFormato();
    });
    selColumnas.addEventListener('change', function () {
        ajustes.columnas = parseInt(selColumnas.value, 10) || 3;
        pintar(tActual);
    });
    selVideo.addEventListener('change', function () {
        ajustes.usarVideo = selVideo.value !== '0';
        pintar(tActual);
    });

    inpDuracion.addEventListener('input', function () {
        ajustes.hold = parseFloat(inpDuracion.value) || 2.8;
        valDuracion.textContent = seg(ajustes.hold);
        actualizaDuracion();
        pintar(tActual);
    });
    inpTransicion.addEventListener('input', function () {
        ajustes.trans = parseFloat(inpTransicion.value) || 0.65;
        valTransicion.textContent = seg(ajustes.trans);
        actualizaDuracion();
        pintar(tActual);
    });
    inpEntrada.addEventListener('input', function () {
        ajustes.intro = parseFloat(inpEntrada.value);
        if (isNaN(ajustes.intro)) ajustes.intro = 0.9;
        valEntrada.textContent = seg(ajustes.intro);
        actualizaDuracion();
        pintar(tActual);
    });
    inpSalida.addEventListener('input', function () {
        ajustes.outro = parseFloat(inpSalida.value);
        if (isNaN(ajustes.outro)) ajustes.outro = 1.2;
        valSalida.textContent = seg(ajustes.outro);
        actualizaDuracion();
        pintar(tActual);
    });

    [inpAcento, inpFondo, inpPanel, inpTexto, inpSuave].forEach(function (inp, i) {
        inp.addEventListener('input', function () {
            ajustes[['acento', 'fondo', 'panel', 'texto', 'suave'][i]] = inp.value;
            pintar(tActual);
        });
    });

    btnAgregar.addEventListener('click', function () {
        if (cuadros.length >= MAX_CUADROS) {
            aviso('Máximo ' + MAX_CUADROS + ' cuadros', 'warning');
            return;
        }
        cuadros.push(cuadroVacio('', ''));
        pintaLista();
        actualizaDuracion();
        pintar(tActual);
        var ultima = lista.querySelector('.reel-ficha:last-child input[data-campo="titulo"]');
        if (ultima) ultima.focus();
    });

    lista.addEventListener('input', function (e) {
        var el = e.target;
        var i = parseInt(el.dataset.i, 10);
        var campo = el.dataset.campo;
        if (isNaN(i) || !campo || !cuadros[i]) return;
        cuadros[i][campo] = el.value;
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
        var btn = e.target.closest('button[data-accion]');
        if (!btn) return;
        var i = parseInt(btn.dataset.i, 10);
        if (isNaN(i)) return;
        var accion = btn.dataset.accion;
        if (accion === 'subir') mueveCuadro(i, -1);
        else if (accion === 'bajar') mueveCuadro(i, 1);
        else if (accion === 'quitar') borraCuadro(i);
        else if (accion === 'quitar-video') quitaVideo(i);
    });

    inpMusica.addEventListener('change', function () {
        cargaMusica(inpMusica.files && inpMusica.files[0]);
        inpMusica.value = '';
    });
    btnQuitarMusica.addEventListener('click', quitaMusica);
    volMusica.addEventListener('input', function () {
        var v = parseFloat(volMusica.value) || 0;
        valVolMusica.textContent = Math.round(v * 100) + ' %';
        if (ganMusica) ganMusica.gain.value = v;
    });

    btnGrabar.addEventListener('click', empiezaGrabacion);
    btnCancelar.addEventListener('click', function () {
        cancelado = true;
        detieneGrabacion();
    });
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
    btnCompartir.addEventListener('click', function () {
        if (!archivoResultado) return;
        if (navigator.canShare && navigator.canShare({ files: [archivoResultado] })) {
            navigator.share({ files: [archivoResultado], title: 'Reel de cuadros' }).catch(function () { });
        }
    });

    /* al cambiar de pestaña, repintar por si el navegador perdió el frame */
    var pestanas = document.getElementById('reel-pestanas');
    if (pestanas) {
        pestanas.addEventListener('shown.bs.tab', function () { pintar(tActual); });
    }

    /* al volver a la página, el canvas sigue vivo; nada que reanudar */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden && reproduciendo) pausar();
    });

    /* ---------- arranque ---------- */
    sincronizaControles();
    pintaLista();
    aplicaFormato();
    pintar(0);

    /* gancho de depuración: permite comprobar desde la consola qué fotograma
       se está pintando y saltar a un instante sin tocar el resto */
    window.tetReel = {
        pintar: pintar,
        ir: function (t) { pausar(); tActual = clamp(t, 0, duracionTotal()); pintar(tActual); },
        estado: function () { return { t: tActual, total: duracionTotal(), estado: estadoEn(tActual) }; },
        cuadros: function () { return cuadros; }
    };
})();
