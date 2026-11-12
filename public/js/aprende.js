/* aprende.js — motor de mini clases animadas para tet 2 (clases) y tet 3
   (diccionario). Dibuja todo en un canvas 2D: portada del término, definición
   y ejemplo/contexto, con entrada y salida animadas. La grabación es local con
   canvas.captureStream + MediaRecorder (MP4/WebM) y la música se mezcla con
   Web Audio, igual que en reelnoticias.js.

   La página define window.TET_APRENDE_CONFIG antes de cargar este archivo. */
(function () {
    'use strict';

    var FPS = 30;
    var CFG = window.TET_APRENDE_CONFIG || {};

    /* ---------- valores por defecto de la configuración ---------- */
    var ETIQUETAS = {
        termino: 'Término',
        definicion: 'Definición',
        ejemplo: 'Ejemplo',
        resultado: 'Resultado',
        imagen: 'Imagen (opcional)'
    };
    var etiquetas = CFG.etiquetas || {};
    for (var ek in ETIQUETAS) {
        if (etiquetas.hasOwnProperty(ek)) ETIQUETAS[ek] = etiquetas[ek];
    }

    var TEMA_BASE = {
        id: 'base', nombre: 'tet', estilo: 'poster',
        fondo: '#10243a', fondo2: '#050d18', texto: '#ffffff', acento: '#4dabf7',
        logo: null, logoAlto: 0,
        fuente: 'Arial, sans-serif', fuenteCodigo: 'Consolas, "Courier New", monospace',
        codigoFondo: '#0b1220', codigoTexto: '#e8edf5', codigoAcento: '#4dabf7',
        codigoCadena: '#ffd479', codigoComentario: '#7b8798', codigoAtributo: '#8fd3ff',
        lenguaje: 'text'
    };

    var TEMAS = CFG.temas && CFG.temas.length ? CFG.temas : [TEMA_BASE];

    /* ---------- estado ---------- */
    var conceptos = (CFG.ejemplos || []).map(function (c) {
        return {
            termino: c.termino || '',
            definicion: c.definicion || '',
            ejemplo: c.ejemplo || '',
            resultado: c.resultado || '',
            imagen: c.imagen || ''
        };
    });

    var ajustes = {
        tema: CFG.tema || TEMAS[0].id,
        formato: CFG.formato || '1080x1080',
        fondo: '',
        texto: '',
        acento: '',
        mostrarLogo: true,
        mostrarMarca: true,
        progreso: true,
        zonaSegura: false,
        tarjetaFinal: true,
        escalaTexto: 1,
        tDef: 3.2,
        tEj: 3.8,
        trans: 0.4,
        cierre: 1.8,
        animEntrada: 'pop',
        animSalida: 'fundido'
    };

    var tema = null;
    var cacheImgs = {};
    var cacheLayout = {};
    var tActual = 0;
    var reproduciendo = false;
    var ultimoTs = 0;
    var rafPreview = null;

    /* ---------- música ---------- */
    var musicaEl = null;
    var musicaUrl = null;
    var musicaNombre = '';
    var audioCtx = null;
    var fuenteMusica = null;
    var ganMusica = null;
    var destAudio = null;

    /* ---------- grabación ---------- */
    var grabando = false;
    var rec = null;
    var trozos = [];
    var rafGrab = null;
    var grabInicio = 0;
    var grabDur = 0;
    var pistaVideo = null;
    var proximoEnvio = 0;
    var cancelado = false;
    var urlResultado = null;
    var blobResultado = null;
    var archivoResultado = null;
    var nombreResultado = 'aprende.mp4';

    /* ---------- atajos ---------- */
    function q(id) { return document.getElementById(id); }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
    function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function easeOutBack(t) {
        t = clamp(t, 0, 1);
        var c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    function seg(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',') + ' s'; }
    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function copia(o) {
        var r = {};
        for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k];
        return r;
    }

    function rgba(hex, a) {
        var h = String(hex || '#000').replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (isNaN(n)) return 'rgba(0,0,0,' + a + ')';
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    function rectRedondeado(c, x, y, w, h, r) {
        r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        c.beginPath();
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
        var cont = q('tet-toast-container');
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
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>';
        el.querySelector('.toast-body').textContent = msg;
        cont.appendChild(el);
        setTimeout(function () {
            try { el.remove(); } catch (e) { }
        }, 4200);
    }

    /* ---------- lienzo ---------- */
    var lienzo = q('ap-lienzo');
    var ctx = lienzo ? lienzo.getContext('2d') : null;

    function dimensiones() {
        var p = String(ajustes.formato || '1080x1080').split('x');
        return {
            w: parseInt(p[0], 10) || 1080,
            h: parseInt(p[1], 10) || 1080
        };
    }

    /* ---------- temas ---------- */
    function temaPorId(id) {
        for (var i = 0; i < TEMAS.length; i++) {
            if (TEMAS[i].id === id) return TEMAS[i];
        }
        return TEMAS[0] || TEMA_BASE;
    }

    function aplicaTema() {
        var base = temaPorId(ajustes.tema);
        tema = copia(base);
        if (ajustes.fondo) tema.fondo = ajustes.fondo;
        if (ajustes.texto) tema.texto = ajustes.texto;
        if (ajustes.acento) tema.acento = ajustes.acento;
        if (!tema.fondo2) tema.fondo2 = tema.fondo;
        if (!tema.fuente) tema.fuente = TEMA_BASE.fuente;
        if (!tema.fuenteCodigo) tema.fuenteCodigo = TEMA_BASE.fuenteCodigo;
        if (!tema.lenguaje) tema.lenguaje = CFG.campoEjemplo === 'codigo' ? 'html' : 'text';
    }

    /* ---------- carga de imágenes ---------- */
    function cargaImagen(url, cb) {
        if (!url) { if (cb) cb(null); return; }
        if (cacheImgs[url]) { if (cb) cb(cacheImgs[url]); return; }
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            cacheImgs[url] = img;
            if (cb) cb(img);
            pintar(tActual, true);
        };
        img.onerror = function () {
            cacheImgs[url] = null;
            if (cb) cb(null);
        };
        img.src = url;
    }

    /* ---------- geometría ---------- */
    function geom(W, H) {
        var u = Math.min(W, H);
        var barH = tema.estilo === 'barra' ? u * 0.095 : 0;
        var top = u * 0.05 + barH;
        var bottom = H - u * 0.05 - barH;
        if (tema.estilo === 'tarjeta') {
            var m = u * 0.055;
            top = m + u * 0.16;
            bottom = H - m - u * 0.05;
        }
        var p = u * (tema.estilo === 'tarjeta' ? 0.06 : 0.05);
        var headerH;
        if (tema.estilo === 'poster') {
            headerH = u * (tema.logoAlto || 0.16) + u * 0.05;
        } else if (tema.estilo === 'barra') {
            headerH = u * (tema.logoAlto || 0.10) + u * 0.04;
        } else {
            headerH = u * 0.04;
        }
        return {
            u: u, W: W, H: H, p: p, top: top, bottom: bottom,
            barH: barH, headerH: headerH,
            area: {
                x: p,
                y: top + headerH,
                w: W - 2 * p,
                h: Math.max(u * 0.2, bottom - (top + headerH))
            }
        };
    }

    /* ---------- texto ---------- */
    function fuenteActual() { return tema.fuente || TEMA_BASE.fuente; }
    function fuenteCodigoActual() { return tema.fuenteCodigo || TEMA_BASE.fuenteCodigo; }

    function parteTexto(texto, maxW) {
        var palabras = String(texto || '').replace(/\s+/g, ' ').trim().split(' ');
        var lineas = [];
        var actual = '';
        function mete(palabra) {
            var prueba = actual ? actual + ' ' + palabra : palabra;
            if (ctx.measureText(prueba).width <= maxW) { actual = prueba; return; }
            if (actual) { lineas.push(actual); actual = ''; }
            if (ctx.measureText(palabra).width <= maxW) { actual = palabra; return; }
            var trozo = '';
            for (var j = 0; j < palabra.length; j++) {
                if (ctx.measureText(trozo + palabra[j]).width > maxW && trozo) {
                    lineas.push(trozo);
                    trozo = palabra[j];
                } else {
                    trozo += palabra[j];
                }
            }
            actual = trozo;
        }
        for (var i = 0; i < palabras.length; i++) {
            if (palabras[i]) mete(palabras[i]);
        }
        if (actual) lineas.push(actual);
        return lineas.length ? lineas : [''];
    }

    function esCodigo(s) {
        s = String(s || '');
        return /[<>{}]/.test(s) || /^[.#][\w-]+$/.test(s) || /^[a-z-]+\(\)$/i.test(s);
    }

    function ajustaTexto(texto, maxW, maxH, peso, tamMax, tamMin, lhF, codigo) {
        var tam = tamMax;
        for (var k = 0; k < 80; k++) {
            ctx.font = peso + ' ' + tam + 'px ' + (codigo ? fuenteCodigoActual() : fuenteActual());
            var lineas = parteTexto(texto, maxW);
            var lh = tam * lhF;
            if (lineas.length * lh <= maxH || tam <= tamMin) {
                return { lineas: lineas, tam: tam, lh: lh, alto: lineas.length * lh, codigo: !!codigo };
            }
            tam = Math.max(tamMin, tam - Math.max(0.5, tam * 0.06));
        }
    }

    function ajustaCodigo(texto, maxW, maxH, tamMax, tamMin) {
        var tam = tamMax;
        for (var k = 0; k < 50; k++) {
            ctx.font = '400 ' + tam + 'px ' + fuenteCodigoActual();
            var lineas = [];
            String(texto || '').split('\n').forEach(function (linea) {
                var trozos = parteTexto(linea, maxW);
                trozos.forEach(function (t, j) {
                    lineas.push(j === 0 ? t : '  ' + t);
                });
            });
            var lh = tam * 1.5;
            if (lineas.length * lh <= maxH || tam <= tamMin) {
                return { lineas: lineas, tam: tam, lh: lh, alto: lineas.length * lh };
            }
            tam = Math.max(tamMin, tam - Math.max(0.5, tam * 0.06));
        }
    }

    /* ---------- caché de composición ---------- */
    function claveCache(i, W, H, tipo) {
        var c = conceptos[i] || {};
        return tipo + '|' + i + '|' + W + 'x' + H + '|' + ajustes.tema + '|' +
            ajustes.escalaTexto + '|' + (c.termino || '') + '|' + (c.definicion || '') + '|' +
            (c.ejemplo || '') + '|' + (c.resultado || '');
    }

    function invalida() { cacheLayout = {}; }

    /* ---------- composición de la portada (término + definición) ---------- */
    function layoutDef(i, W, H) {
        var key = claveCache(i, W, H, 'def');
        if (cacheLayout[key]) return cacheLayout[key];
        var g = geom(W, H);
        var area = g.area;
        var u = g.u;
        var c = conceptos[i] || {};
        var esc2 = ajustes.escalaTexto || 1;

        var term = ajustaTexto(c.termino || 'Sin título', area.w * 0.94, area.h * 0.40,
            '700', u * 0.135 * esc2, u * 0.032, 1.04, esCodigo(c.termino));
        var def = ajustaTexto(c.definicion || '', area.w * 0.86, area.h * 0.52,
            '400', u * 0.050 * esc2, u * 0.020, 1.38, false);

        var gap = u * 0.045;
        var total = term.alto + gap + def.alto + u * 0.02;
        var y = area.y + Math.max(0, (area.h - total) * 0.46);

        var L = { term: term, def: def, gap: gap, total: total, y: y };
        cacheLayout[key] = L;
        return L;
    }

    /* ---------- composición del ejemplo / contexto ---------- */
    function infoDemo(codigo) {
        var m = String(codigo || '').match(/<\s*(input|button|textarea|select|a|img|h1|h2|p|div)\b([^>]*)>/i);
        if (!m) return null;
        var attrs = m[2] || '';
        var resto = String(codigo).slice(m.index + m[0].length);
        var cierre = resto.match(/^([^<]*)/);
        return {
            tag: m[1].toLowerCase(),
            placeholder: (attrs.match(/placeholder\s*=\s*["']([^"']*)["']/i) || [])[1] || '',
            value: (attrs.match(/value\s*=\s*["']([^"']*)["']/i) || [])[1] || '',
            type: (attrs.match(/type\s*=\s*["']([^"']*)["']/i) || [])[1] || '',
            texto: cierre ? cierre[1].trim() : ''
        };
    }

    function layoutEj(i, W, H) {
        var key = claveCache(i, W, H, 'ej');
        if (cacheLayout[key]) return cacheLayout[key];
        var g = geom(W, H);
        var area = g.area;
        var u = g.u;
        var c = conceptos[i] || {};
        var esc2 = ajustes.escalaTexto || 1;

        var etiqueta = CFG.campoEjemplo === 'codigo' ? 'EJEMPLO DE CÓDIGO' : 'CONTEXTO DE USO';
        var labelTam = u * 0.026 * esc2;
        var labelH = labelTam * 2.4;
        var dispH = Math.max(u * 0.2, area.h - labelH);
        var demo = CFG.campoEjemplo === 'codigo' ? infoDemo(c.ejemplo) : null;
        var nota = CFG.mostrarResultado === false ? '' : (c.resultado || '');
        var tieneMedia = !!(c.imagen || nota || demo);
        var gap = u * 0.05;
        var esCod = CFG.campoEjemplo === 'codigo' && !!c.ejemplo;

        var provisional = dispH * (tieneMedia ? 0.42 : 1);
        var main;
        if (esCod) {
            main = ajustaCodigo(c.ejemplo, area.w * 0.90, provisional * 0.92,
                u * 0.034 * esc2, u * 0.016);
        } else {
            main = ajustaTexto(c.ejemplo || '', area.w * 0.78, provisional * 0.92,
                '400', u * 0.048 * esc2, u * 0.020, 1.42, false);
        }

        var media = null;
        var mediaNeed = 0;
        var mediaCap = 0;
        if (tieneMedia) {
            if (c.imagen) {
                media = { tipo: 'imagen' };
                mediaNeed = dispH * 0.40;
                mediaCap = dispH * 0.50;
            } else if (demo) {
                media = { tipo: 'demo', demo: demo };
                mediaNeed = u * 0.20;
                mediaCap = u * 0.30;
            } else if (nota) {
                media = { tipo: 'texto' };
                mediaNeed = u * 0.16;
                mediaCap = dispH * 0.30;
            }
        }

        var pad = u * 0.035;
        var mainNeed = esCod ? (main.alto + pad * 2 + u * 0.035) : (main.alto + u * 0.08);
        var mainH = tieneMedia ? clamp(mainNeed, u * 0.10, dispH * 0.62) : clamp(mainNeed, u * 0.12, dispH);
        var mediaH = tieneMedia ? clamp(mediaNeed, u * 0.14, mediaCap) : 0;

        if (esCod) {
            main = ajustaCodigo(c.ejemplo, area.w * 0.90, mainH * 0.92,
                u * 0.034 * esc2, u * 0.016);
        } else {
            main = ajustaTexto(c.ejemplo || '', area.w * 0.78, mainH * 0.92,
                '400', u * 0.048 * esc2, u * 0.020, 1.42, false);
        }

        if (media && media.tipo === 'texto') {
            media.layout = ajustaTexto(nota, area.w * 0.74, mediaH * 0.64,
                '600', u * 0.040 * esc2, u * 0.018, 1.35, false);
        }

        var stackH = labelH + mainH + (tieneMedia ? gap + mediaH : 0);
        var top0 = area.y + Math.max(0, (area.h - stackH) / 2);
        var top = top0 + labelH;
        var bottom = area.y + area.h;

        var L = {
            etiqueta: etiqueta, labelTam: labelTam, labelY: top0, top: top, bottom: bottom,
            mainH: mainH, mediaH: mediaH, gap: gap, main: main,
            esCod: esCod, media: media, tieneMedia: tieneMedia
        };
        cacheLayout[key] = L;
        return L;
    }

    /* ---------- resaltado de código ---------- */
    function reglasCodigo(lenguaje) {
        var ac = tema.codigoAcento || tema.acento;
        var ca = tema.codigoCadena || '#ffd479';
        var co = tema.codigoComentario || '#7b8798';
        var at = tema.codigoAtributo || ac;
        if (lenguaje === 'html') {
            return [
                { re: /<!--[\s\S]*?-->/g, c: co },
                { re: /<\/?[\w-]+/g, c: ac },
                { re: /\/?>/g, c: ac },
                { re: /"[^"]*"|'[^']*'/g, c: ca },
                { re: /\b[\w-]+(?=\s*=)/g, c: at }
            ];
        }
        if (lenguaje === 'css') {
            return [
                { re: /\/\*[\s\S]*?\*\//g, c: co },
                { re: /"[^"]*"|'[^']*'/g, c: ca },
                { re: /[.#]?[\w-]+(?=\s*\{)/g, c: ac },
                { re: /[\w-]+(?=\s*:)/g, c: at },
                { re: /#[0-9a-fA-F]{3,8}\b/g, c: ca }
            ];
        }
        if (lenguaje === 'js') {
            return [
                { re: /\/\/.*$/g, c: co },
                { re: /\/\*[\s\S]*?\*\//g, c: co },
                { re: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, c: ca },
                { re: /\b(?:const|let|var|function|return|if|else|for|while|new|class|import|export|from|async|await|true|false|null|undefined|this)\b/g, c: ac },
                { re: /\b\d+(?:\.\d+)?\b/g, c: ca }
            ];
        }
        if (lenguaje === 'shell') {
            return [
                { re: /#.*$/g, c: co },
                { re: /"[^"]*"|'[^']*'/g, c: ca },
                { re: /--?[\w-]+/g, c: ca },
                { re: /^[\w./-]+/g, c: ac }
            ];
        }
        return [];
    }

    function segmentosCodigo(linea, lenguaje) {
        var reglas = reglasCodigo(lenguaje);
        var base = tema.codigoTexto || '#e8edf5';
        var out = [];
        var pos = 0;
        while (pos < linea.length) {
            var mejor = null;
            for (var r = 0; r < reglas.length; r++) {
                reglas[r].re.lastIndex = pos;
                var m = reglas[r].re.exec(linea);
                if (m && m.index === pos && (!mejor || m[0].length > mejor.txt.length)) {
                    mejor = { txt: m[0], c: reglas[r].c };
                }
            }
            if (mejor && mejor.txt.length) {
                out.push(mejor);
                pos += mejor.txt.length;
            } else {
                var siguiente = linea.length;
                for (var r2 = 0; r2 < reglas.length; r2++) {
                    reglas[r2].re.lastIndex = pos;
                    var m2 = reglas[r2].re.exec(linea);
                    if (m2 && m2.index > pos) siguiente = Math.min(siguiente, m2.index);
                }
                if (siguiente <= pos) siguiente = pos + 1;
                out.push({ txt: linea.slice(pos, siguiente), c: base });
                pos = siguiente;
            }
        }
        return out;
    }

    function pintaLineaCodigo(linea, x, y) {
        var segs = segmentosCodigo(linea, tema.lenguaje || 'text');
        for (var i = 0; i < segs.length; i++) {
            ctx.fillStyle = segs[i].c;
            ctx.fillText(segs[i].txt, x, y);
            x += ctx.measureText(segs[i].txt).width;
        }
    }

    /* ---------- fondo ---------- */
    function dibujaDecoracion(W, H, t) {
        var u = Math.min(W, H);
        ctx.save();
        ctx.globalAlpha = tema.estilo === 'poster' ? 0.035 : 0.05;
        ctx.strokeStyle = tema.acento;
        ctx.lineWidth = Math.max(1, u * 0.002);
        var paso = u * 0.12;
        var off = (t * u * 0.012) % paso;
        for (var x = -H; x < W + H; x += paso) {
            ctx.beginPath();
            ctx.moveTo(x + off, 0);
            ctx.lineTo(x + off - H, H);
            ctx.stroke();
        }
        ctx.restore();

        var rg = ctx.createRadialGradient(W * 0.8, H * 0.14, 0, W * 0.8, H * 0.14, Math.max(W, H) * 0.72);
        rg.addColorStop(0, rgba(tema.acento, 0.09));
        rg.addColorStop(1, rgba(tema.acento, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);

        if (tema.estilo === 'poster') return;

        var vg = ctx.createRadialGradient(W / 2, H / 2, u * 0.2, W / 2, H / 2, Math.max(W, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, tema.estilo === 'tarjeta' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.16)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    }

    function dibujaFondo(W, H, t) {
        var u = Math.min(W, H);
        ctx.fillStyle = tema.fondo;
        ctx.fillRect(0, 0, W, H);
        if (tema.estilo !== 'poster') {
            var g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, tema.fondo);
            g.addColorStop(1, tema.fondo2 || tema.fondo);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
        dibujaDecoracion(W, H, t);

        if (tema.estilo === 'tarjeta') {
            var m = u * 0.055;
            var x = m, y = m, w = W - 2 * m, h = H - 2 * m;
            var r = u * 0.025;
            ctx.fillStyle = 'rgba(0,0,0,.22)';
            rectRedondeado(ctx, x + u * 0.008, y + u * 0.008, w, h, r);
            ctx.fill();
            ctx.fillStyle = tema.tarjeta || '#222a2f';
            rectRedondeado(ctx, x, y, w, h, r);
            ctx.fill();
            var cg = ctx.createLinearGradient(x, y, x + w, y + h);
            cg.addColorStop(0, 'rgba(255,255,255,.035)');
            cg.addColorStop(1, 'rgba(0,0,0,.10)');
            ctx.fillStyle = cg;
            rectRedondeado(ctx, x, y, w, h, r);
            ctx.fill();
            return;
        }

        if (tema.estilo === 'barra') {
            var barH = u * 0.095;
            ctx.fillStyle = tema.barra || '#1b1b1b';
            ctx.fillRect(0, 0, W, barH);
            ctx.fillRect(0, H - barH, W, barH);

            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            ctx.font = '700 ' + (barH * 0.32) + 'px ' + fuenteActual();
            ctx.textAlign = 'left';
            ctx.fillText('somostet.com', u * 0.045, barH / 2);
            ctx.textAlign = 'right';
            ctx.fillText('tu espacio tecnológico', W - u * 0.045, barH / 2);

            ctx.textAlign = 'center';
            ctx.font = '700 ' + (barH * 0.38) + 'px ' + fuenteActual();
            ctx.fillText(tema.pie || 'Diccionario Tecnológico', W / 2, H - barH / 2);
            return;
        }
    }

    /* ---------- cabecera ---------- */
    function dibujaCabecera(W, H, t) {
        var g = geom(W, H);
        var u = g.u;

        if (tema.estilo === 'tarjeta') {
            ctx.save();
            ctx.fillStyle = tema.acento;
            ctx.font = '700 ' + (u * 0.034) + 'px ' + fuenteActual();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(tema.tituloPlantilla || tema.nombre || '', g.p + u * 0.01, g.top - u * 0.055);
            ctx.restore();
            return;
        }

        if (!ajustes.mostrarLogo) return;

        var alto = u * (tema.logoAlto || 0.16);
        var y = g.top + Math.sin(t * 1.6) * u * 0.004;
        var img = tema.logo ? cacheImgs[tema.logo] : null;

        if (img) {
            var ancho = alto * (img.width / img.height);
            var rg = ctx.createRadialGradient(W / 2, y + alto / 2, 0, W / 2, y + alto / 2, Math.max(ancho, alto));
            rg.addColorStop(0, rgba(tema.acento, 0.18));
            rg.addColorStop(1, rgba(tema.acento, 0));
            ctx.fillStyle = rg;
            ctx.fillRect(W / 2 - ancho, y - alto * 0.2, ancho * 2, alto * 1.4);
            ctx.drawImage(img, W / 2 - ancho / 2, y, ancho, alto);
            return;
        }

        var txt = tema.nombre || '';
        var tam = u * 0.040;
        ctx.font = '700 ' + tam + 'px ' + fuenteActual();
        var w = ctx.measureText(txt).width + u * 0.06;
        var h = tam * 1.9;
        ctx.fillStyle = rgba(tema.acento, 0.18);
        rectRedondeado(ctx, W / 2 - w / 2, y, w, h, h / 2);
        ctx.fill();
        ctx.strokeStyle = rgba(tema.acento, 0.6);
        ctx.lineWidth = Math.max(1, u * 0.002);
        rectRedondeado(ctx, W / 2 - w / 2, y, w, h, h / 2);
        ctx.stroke();
        ctx.fillStyle = tema.acento;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, W / 2, y + h / 2);
    }

    /* ---------- portada: término + definición ---------- */
    function dibujaDef(i, est, W, H, t) {
        var g = geom(W, H);
        var L = layoutDef(i, W, H);
        var u = g.u;
        var alfaBase = 1 - est.exit;
        var dy = (1 - est.entry) * u * 0.06 +
            (ajustes.animSalida === 'subir' ? -est.exit * u * 0.06 : 0);
        var cx = W / 2;

        var pop = est.animEntrada === 'pop' ? (0.84 + 0.16 * easeOutBack(est.entryRaw)) : 1;
        var zoom = est.animEntrada === 'zoom' ? (1.10 - 0.10 * easeOut(est.entryRaw)) : 1;
        var escala = pop * zoom * (ajustes.animSalida === 'zoom' ? (1 - est.exit * 0.06) : 1);

        ctx.save();
        ctx.globalAlpha = alfaBase * est.entry;
        ctx.translate(cx, L.y + L.term.alto / 2 + dy);
        ctx.scale(escala, escala);
        ctx.fillStyle = tema.estilo === 'tarjeta' ? tema.acento : tema.texto;
        ctx.font = '700 ' + L.term.tam + 'px ' + (L.term.codigo ? fuenteCodigoActual() : fuenteActual());
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        L.term.lineas.forEach(function (linea, li) {
            ctx.fillText(linea, 0, (li - (L.term.lineas.length - 1) / 2) * L.term.lh);
        });
        ctx.restore();

        var crece = easeOut(est.entryRaw);
        var ly = L.y + L.term.alto + L.gap * 0.35 + dy;
        ctx.save();
        ctx.globalAlpha = alfaBase * est.entry * 0.9;
        ctx.fillStyle = tema.acento;
        rectRedondeado(ctx, cx - u * 0.09 * crece, ly, u * 0.18 * crece, Math.max(2, u * 0.006), u * 0.003);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = tema.estilo === 'tarjeta' ? 'rgba(255,255,255,.88)' : rgba(tema.texto, 0.86);
        ctx.font = '400 ' + L.def.tam + 'px ' + fuenteActual();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        L.def.lineas.forEach(function (linea, li) {
            var la = clamp((est.entryRaw * (L.def.lineas.length + 2) - li) / 1.5, 0, 1);
            ctx.globalAlpha = alfaBase * la;
            ctx.fillText(linea, cx, L.y + L.term.alto + L.gap + li * L.def.lh + dy);
        });
        ctx.restore();
    }

    /* ---------- ejemplo ---------- */
    function dibujaPanelCodigo(L, x, y, w, hMax, alpha, est) {
        var u = geom(lienzo.width, lienzo.height).u;
        var pad = u * 0.035;
        var h = Math.min(hMax, L.alto + pad * 2 + u * 0.035);
        var py = y + Math.max(0, (hMax - h) / 2);

        ctx.save();
        ctx.globalAlpha = alpha * est.entry;
        ctx.fillStyle = tema.codigoFondo || '#1e2430';
        rectRedondeado(ctx, x, py, w, h, u * 0.02);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.lineWidth = Math.max(1, u * 0.0015);
        rectRedondeado(ctx, x, py, w, h, u * 0.02);
        ctx.stroke();

        var dr = u * 0.008;
        ['#ff5f57', '#febc2e', '#28c840'].forEach(function (col, k) {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(x + pad + dr + k * (dr * 2.8), py + pad * 0.75, dr, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.font = '400 ' + L.tam + 'px ' + fuenteCodigoActual();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        var codeY = py + pad + u * 0.022;
        L.lineas.forEach(function (linea, li) {
            var la = clamp((est.entryRaw * (L.lineas.length + 2) - li) / 1.5, 0, 1);
            ctx.globalAlpha = alpha * la;
            pintaLineaCodigo(linea, x + pad, codeY + li * L.lh);
        });
        ctx.restore();
    }

    function dibujaPanelContexto(L, x, y, w, hMax, alpha, est) {
        var u = geom(lienzo.width, lienzo.height).u;
        var pad = u * 0.04;
        var h = Math.min(hMax, L.alto + pad * 2);
        var py = y + Math.max(0, (hMax - h) / 2);

        ctx.save();
        ctx.globalAlpha = alpha * est.entry;
        ctx.fillStyle = tema.estilo === 'tarjeta' ? 'rgba(255,255,255,.06)' : rgba(tema.texto, 0.07);
        rectRedondeado(ctx, x, py, w, h, u * 0.02);
        ctx.fill();

        // Barra de acento interior: separada del borde para no comerse la
        // esquina redondeada del panel.
        var bx = x + u * 0.022;
        var bw = Math.max(4, u * 0.009);
        var by = py + u * 0.024;
        var bh = Math.max(bw, h - u * 0.048);
        ctx.fillStyle = tema.acento;
        rectRedondeado(ctx, bx, by, bw, bh, bw / 2);
        ctx.fill();

        // Comilla en el margen izquierdo, con su propio hueco antes del texto.
        ctx.fillStyle = rgba(tema.acento, 0.85);
        ctx.font = '700 ' + (u * 0.062) + 'px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('“', x + u * 0.048, py + u * 0.028);

        ctx.fillStyle = tema.estilo === 'tarjeta' ? 'rgba(255,255,255,.9)' : rgba(tema.texto, 0.9);
        ctx.font = '400 ' + L.tam + 'px ' + fuenteActual();
        var tx = x + u * 0.10;
        L.lineas.forEach(function (linea, li) {
            var la = clamp((est.entryRaw * (L.lineas.length + 2) - li) / 1.5, 0, 1);
            ctx.globalAlpha = alpha * la;
            ctx.fillText(linea, tx, py + pad + li * L.lh);
        });
        ctx.restore();
    }

    function dibujaImagenContenida(img, x, y, w, h, r) {
        var esc2 = Math.min(w / img.width, h / img.height);
        var dw = img.width * esc2, dh = img.height * esc2;
        var dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
        ctx.save();
        rectRedondeado(ctx, dx, dy, dw, dh, r);
        ctx.clip();
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.2)';
        ctx.lineWidth = Math.max(1, r * 0.08);
        rectRedondeado(ctx, dx, dy, dw, dh, r);
        ctx.stroke();
    }

    function dibujaDemo(info, x, y, w, h, alpha, t) {
        var u = geom(lienzo.width, lienzo.height).u;
        var cx = x + w / 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (info.tag === 'input' || info.tag === 'textarea') {
            var iw = Math.min(w, u * 0.56);
            var ih = Math.min(h * 0.5, u * 0.075);
            if (info.tag === 'textarea') ih = Math.min(h * 0.8, u * 0.20);
            var ix = cx - iw / 2, iy = y + (h - ih) / 2;
            ctx.fillStyle = '#ffffff';
            rectRedondeado(ctx, ix, iy, iw, ih, Math.min(ih * 0.22, u * 0.012));
            ctx.fill();
            ctx.strokeStyle = '#b9c4d4';
            ctx.lineWidth = Math.max(1, u * 0.002);
            rectRedondeado(ctx, ix, iy, iw, ih, Math.min(ih * 0.22, u * 0.012));
            ctx.stroke();
            var ph = info.placeholder || info.value || 'Escribe aquí…';
            ctx.fillStyle = '#7b8798';
            ctx.font = '400 ' + (ih * 0.32) + 'px ' + fuenteActual();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(ph, ix + ih * 0.35, iy + (info.tag === 'textarea' ? ih * 0.22 : ih / 2));
            if (Math.floor(t * 2) % 2 === 0) {
                var tw = ctx.measureText(ph).width;
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(ix + ih * 0.35 + tw + 2, iy + ih * (info.tag === 'textarea' ? 0.08 : 0.25),
                    Math.max(1, u * 0.002), ih * (info.tag === 'textarea' ? 0.14 : 0.5));
            }
        } else if (info.tag === 'button') {
            var bw = Math.min(w * 0.62, u * 0.36);
            var bh = Math.min(h * 0.5, u * 0.075);
            ctx.fillStyle = tema.acento;
            rectRedondeado(ctx, cx - bw / 2, y + (h - bh) / 2, bw, bh, bh * 0.22);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 ' + (bh * 0.36) + 'px ' + fuenteActual();
            ctx.fillText(info.texto || info.value || 'Enviar', cx, y + h / 2);
        } else if (info.tag === 'select') {
            var sw = Math.min(w * 0.62, u * 0.40);
            var sh = Math.min(h * 0.5, u * 0.075);
            ctx.fillStyle = '#ffffff';
            rectRedondeado(ctx, cx - sw / 2, y + (h - sh) / 2, sw, sh, sh * 0.22);
            ctx.fill();
            ctx.strokeStyle = '#b9c4d4';
            ctx.lineWidth = Math.max(1, u * 0.002);
            rectRedondeado(ctx, cx - sw / 2, y + (h - sh) / 2, sw, sh, sh * 0.22);
            ctx.stroke();
            ctx.fillStyle = '#334155';
            ctx.font = '400 ' + (sh * 0.34) + 'px ' + fuenteActual();
            ctx.textAlign = 'left';
            ctx.fillText(info.texto || 'Elige una opción', cx - sw / 2 + sh * 0.35, y + h / 2);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#64748b';
            ctx.fillText('▾', cx + sw / 2 - sh * 0.35, y + h / 2);
        } else if (info.tag === 'a') {
            ctx.fillStyle = tema.acento;
            ctx.font = '600 ' + (Math.min(h * 0.4, u * 0.05)) + 'px ' + fuenteActual();
            var txtA = info.texto || 'Enlace';
            ctx.fillText(txtA, cx, y + h / 2);
            var aw = ctx.measureText(txtA).width;
            ctx.fillRect(cx - aw / 2, y + h / 2 + u * 0.025, aw, Math.max(1, u * 0.002));
        } else if (info.tag === 'img') {
            var mw = Math.min(w * 0.6, u * 0.4);
            var mh = Math.min(h * 0.7, u * 0.3);
            var mx = cx - mw / 2, my = y + (h - mh) / 2;
            var gr = ctx.createLinearGradient(mx, my, mx, my + mh);
            gr.addColorStop(0, '#dbe4ef');
            gr.addColorStop(1, '#aebccd');
            ctx.fillStyle = gr;
            rectRedondeado(ctx, mx, my, mw, mh, u * 0.015);
            ctx.fill();
            ctx.strokeStyle = '#8fa0b5';
            ctx.lineWidth = Math.max(1, u * 0.002);
            ctx.beginPath();
            ctx.arc(mx + mw * 0.72, my + mh * 0.30, mh * 0.10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(mx + mw * 0.12, my + mh * 0.82);
            ctx.lineTo(mx + mw * 0.40, my + mh * 0.45);
            ctx.lineTo(mx + mw * 0.62, my + mh * 0.70);
            ctx.lineTo(mx + mw * 0.78, my + mh * 0.55);
            ctx.lineTo(mx + mw * 0.90, my + mh * 0.82);
            ctx.stroke();
        } else {
            ctx.fillStyle = tema.estilo === 'tarjeta' ? '#ffffff' : tema.texto;
            ctx.font = (info.tag === 'h1' || info.tag === 'h2' ? '700 ' : '400 ') +
                (Math.min(h * 0.38, u * 0.05)) + 'px ' + fuenteActual();
            ctx.fillText(info.texto || info.value || info.tag, cx, y + h / 2);
        }
        ctx.restore();
    }

    function dibujaMedia(media, c, x, y, w, h, alpha, est, t) {
        var u = geom(lienzo.width, lienzo.height).u;
        var labelTam = u * 0.022;
        ctx.save();
        ctx.globalAlpha = alpha * est.entry;
        ctx.fillStyle = rgba(tema.texto, 0.55);
        ctx.font = '700 ' + labelTam + 'px ' + fuenteActual();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(media.tipo === 'imagen' ? 'IMAGEN' : 'RESULTADO', x + w / 2, y);
        ctx.restore();

        var py = y + labelTam * 2;
        var ph = h - labelTam * 2;

        if (media.tipo === 'imagen') {
            var img = cacheImgs[c.imagen];
            if (img) {
                ctx.save();
                ctx.globalAlpha = alpha * est.entry;
                dibujaImagenContenida(img, x, py, w, ph, u * 0.02);
                ctx.restore();
            } else {
                ctx.save();
                ctx.globalAlpha = alpha * est.entry;
                ctx.strokeStyle = rgba(tema.texto, 0.3);
                ctx.setLineDash([u * 0.015, u * 0.01]);
                rectRedondeado(ctx, x, py, w, ph, u * 0.02);
                ctx.stroke();
                ctx.restore();
            }
            return;
        }

        if (media.tipo === 'demo') {
            dibujaDemo(media.demo, x + w * 0.15, py + ph * 0.05, w * 0.7, ph * 0.9, alpha * est.entry, t);
            return;
        }

        var pad = u * 0.03;
        var panelH = Math.min(ph, media.layout.alto + pad * 2);
        var py2 = py + (ph - panelH) / 2;
        ctx.save();
        ctx.globalAlpha = alpha * est.entry;
        ctx.fillStyle = rgba(tema.texto, 0.07);
        rectRedondeado(ctx, x + w * 0.08, py2, w * 0.84, panelH, u * 0.02);
        ctx.fill();
        ctx.strokeStyle = rgba(tema.texto, 0.15);
        ctx.lineWidth = Math.max(1, u * 0.0015);
        rectRedondeado(ctx, x + w * 0.08, py2, w * 0.84, panelH, u * 0.02);
        ctx.stroke();
        ctx.fillStyle = tema.estilo === 'tarjeta' ? 'rgba(255,255,255,.9)' : rgba(tema.texto, 0.86);
        ctx.font = '600 ' + media.layout.tam + 'px ' + fuenteActual();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        media.layout.lineas.forEach(function (linea, li) {
            ctx.fillText(linea, x + w / 2, py2 + pad + li * media.layout.lh);
        });
        ctx.restore();
    }

    function dibujaEj(i, est, W, H, t) {
        var g = geom(W, H);
        var L = layoutEj(i, W, H);
        var c = conceptos[i] || {};
        var alpha = 1 - est.exit;

        ctx.save();
        if (ajustes.animSalida === 'subir') ctx.translate(0, -est.exit * g.u * 0.06);
        else if (ajustes.animSalida === 'zoom') {
            ctx.translate(W / 2, H / 2);
            ctx.scale(1 - est.exit * 0.05, 1 - est.exit * 0.05);
            ctx.translate(-W / 2, -H / 2);
        }

        ctx.save();
        ctx.globalAlpha = alpha * est.entry;
        ctx.fillStyle = tema.acento;
        ctx.font = '700 ' + L.labelTam + 'px ' + fuenteActual();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        try { ctx.letterSpacing = (g.u * 0.003) + 'px'; } catch (e) { }
        ctx.fillText(L.etiqueta, W / 2, L.labelY);
        try { ctx.letterSpacing = '0px'; } catch (e) { }
        ctx.restore();

        if (L.esCod) {
            dibujaPanelCodigo(L.main, g.area.x, L.top, g.area.w, L.mainH, alpha, est);
        } else {
            dibujaPanelContexto(L.main, g.area.x, L.top, g.area.w, L.mainH, alpha, est);
        }

        if (L.tieneMedia) {
            dibujaMedia(L.media, c, g.area.x, L.top + L.mainH + L.gap, g.area.w, L.mediaH, alpha, est, t);
        }
        ctx.restore();
    }

    /* ---------- marca, progreso, cierre ---------- */
    function dibujaMarca(W, H) {
        if (!ajustes.mostrarMarca || tema.estilo === 'barra') return;
        var u = Math.min(W, H);
        ctx.save();
        var logo = tema.marcaLogo ? cacheImgs[tema.marcaLogo] : null;
        if (logo) {
            var alto = u * (tema.marcaAlto || 0.04);
            var ancho = alto * (logo.width / logo.height);
            var mx = tema.estilo === 'tarjeta' ? W / 2 : W - u * 0.07 - ancho / 2;
            var my = tema.estilo === 'tarjeta' ? H - u * 0.036 : H - u * 0.075 - alto / 2;
            ctx.globalAlpha = 0.95;
            ctx.drawImage(logo, mx - ancho / 2, my - alto / 2, ancho, alto);
            ctx.restore();
            return;
        }
        ctx.fillStyle = tema.marcaColor || rgba(tema.texto, tema.estilo === 'tarjeta' ? 0.55 : 0.9);
        ctx.font = '700 ' + (u * 0.045) + 'px ' + fuenteActual();
        ctx.textAlign = tema.estilo === 'tarjeta' ? 'center' : 'right';
        ctx.textBaseline = 'bottom';
        if (tema.estilo === 'tarjeta') {
            ctx.fillText('tet', W / 2, H - u * 0.03);
        } else {
            ctx.fillText('tet', W - u * 0.07, H - u * 0.075);
        }
        ctx.restore();
    }

    function dibujaProgreso(W, H, t) {
        if (!ajustes.progreso) return;
        var u = Math.min(W, H);
        var D = duracionTotal();
        var p = D > 0 ? clamp(t / D, 0, 1) : 0;
        var y = H - u * 0.012;
        if (tema.estilo === 'barra') y = H - u * 0.095 - u * 0.012;
        ctx.save();
        ctx.fillStyle = rgba(tema.texto, 0.18);
        ctx.fillRect(0, y, W, Math.max(2, u * 0.006));
        ctx.fillStyle = tema.acento;
        ctx.fillRect(0, y, W * p, Math.max(2, u * 0.006));
        ctx.restore();
    }

    function dibujaFin(W, H, endP) {
        var u = Math.min(W, H);
        var a = easeOut(endP);
        ctx.save();
        ctx.globalAlpha = a;
        var logo = cacheImgs['./public/img/Logotet.png'];
        var cy = H * 0.40;
        if (logo) {
            var lado = u * 0.26;
            var esc2 = Math.min(lado / logo.width, lado / logo.height);
            var dw = logo.width * esc2, dh = logo.height * esc2;
            ctx.drawImage(logo, W / 2 - dw / 2, cy - dh / 2, dw, dh);
        }
        ctx.fillStyle = tema.estilo === 'tarjeta' ? '#ffffff' : tema.texto;
        ctx.font = '700 ' + (u * 0.06) + 'px ' + fuenteActual();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(CFG.cierreTitulo || 'Aprende con tet', W / 2, cy + u * 0.18);
        ctx.fillStyle = rgba(tema.texto, 0.7);
        ctx.font = '400 ' + (u * 0.032) + 'px ' + fuenteActual();
        ctx.fillText('somostet.com', W / 2, cy + u * 0.27);
        ctx.restore();
    }

    function dibujaVacio(W, H) {
        var u = Math.min(W, H);
        ctx.save();
        ctx.fillStyle = rgba(tema.texto, 0.7);
        ctx.font = '400 ' + (u * 0.038) + 'px ' + fuenteActual();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Añade un concepto para empezar', W / 2, H / 2);
        ctx.restore();
    }

    function dibujaZonaSegura(W, H) {
        var u = Math.min(W, H);
        var y = H - u * 0.14;
        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,.08)';
        ctx.fillRect(0, y, W, H - y);
        ctx.strokeStyle = 'rgba(255,80,80,.8)';
        ctx.lineWidth = Math.max(1, u * 0.002);
        ctx.setLineDash([u * 0.02, u * 0.015]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.restore();
    }

    /* ---------- línea de tiempo ---------- */
    function duracionConcepto() { return ajustes.tDef + ajustes.tEj + 2 * ajustes.trans; }

    function duracionTotal() {
        var n = conceptos.length;
        return n * duracionConcepto() + (ajustes.tarjetaFinal ? ajustes.cierre : 0);
    }

    function estadoEn(t) {
        var n = conceptos.length;
        var D = duracionTotal();
        t = clamp(t, 0, D);
        if (!n) return { vacio: true };
        var bloque = duracionConcepto();
        var i = Math.floor(t / bloque);
        if (i >= n) {
            if (!ajustes.tarjetaFinal) return { fin: true, sinTarjeta: true };
            var ep = ajustes.cierre > 0 ? clamp((t - n * bloque) / ajustes.cierre, 0, 1) : 1;
            return { fin: true, endP: easeOut(ep) };
        }
        var local = t - i * bloque;
        var fase = local < ajustes.tDef ? 'def' : 'ej';
        var localFase = fase === 'def' ? local : local - ajustes.tDef;
        var durFase = fase === 'def' ? ajustes.tDef : ajustes.tEj;
        var entryRaw = clamp(localFase / 0.5, 0, 1);
        var exit = clamp((localFase - (durFase - ajustes.trans)) / ajustes.trans, 0, 1);
        return {
            i: i, fase: fase, local: localFase, dur: durFase,
            entry: easeOut(entryRaw), entryRaw: entryRaw,
            exit: easeInOut(exit),
            animEntrada: ajustes.animEntrada,
            animSalida: ajustes.animSalida
        };
    }

    /* ---------- pintado ---------- */
    function pintar(t, esPreview) {
        if (!ctx) return;
        if (!tema) aplicaTema();
        var W = lienzo.width, H = lienzo.height;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, W, H);

        dibujaFondo(W, H, t);
        var est = estadoEn(t);
        if (est.vacio) {
            dibujaCabecera(W, H, t);
            dibujaVacio(W, H);
        } else if (est.fin) {
            if (!est.sinTarjeta) dibujaFin(W, H, est.endP);
            else dibujaCabecera(W, H, t);
        } else {
            dibujaCabecera(W, H, t);
            if (est.fase === 'def') dibujaDef(est.i, est, W, H, t);
            else dibujaEj(est.i, est, W, H, t);
        }
        dibujaMarca(W, H);
        dibujaProgreso(W, H, t);
        if (esPreview && ajustes.zonaSegura) dibujaZonaSegura(W, H);
    }

    /* ---------- vista previa ---------- */
    var btnPlay = q('ap-play');
    var btnReiniciar = q('ap-reiniciar');
    var rangoTiempo = q('ap-tiempo');
    var reloj = q('ap-reloj');

    function actualizaReloj() {
        if (!reloj) return;
        var D = duracionTotal();
        reloj.textContent = seg(tActual) + ' / ' + seg(D);
        if (rangoTiempo) rangoTiempo.value = String(tActual);
    }

    function ponBotonPlay(activo) {
        if (!btnPlay) return;
        btnPlay.innerHTML = activo
            ? '<i class="fas fa-pause" aria-hidden="true"></i> <span>Pausa</span>'
            : '<i class="fas fa-play" aria-hidden="true"></i> <span>Reproducir</span>';
        btnPlay.setAttribute('aria-label', activo ? 'Pausar' : 'Reproducir');
    }

    function pausar() {
        reproduciendo = false;
        if (rafPreview) { cancelAnimationFrame(rafPreview); rafPreview = null; }
        ponBotonPlay(false);
    }

    function reproducir() {
        if (grabando) return;
        if (reproduciendo) { pausar(); return; }
        if (tActual >= duracionTotal()) tActual = 0;
        reproduciendo = true;
        ultimoTs = 0;
        ponBotonPlay(true);
        rafPreview = requestAnimationFrame(buclePreview);
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
            tActual = D;
            pintar(tActual, true);
            actualizaReloj();
            pausar();
            return;
        }
        pintar(tActual, true);
        actualizaReloj();
        rafPreview = requestAnimationFrame(buclePreview);
    }

    /* ---------- controles ---------- */
    var lista = q('ap-lista');
    var selTema = q('ap-tema');
    var selFormato = q('ap-formato');
    var inpFondo = q('ap-fondo');
    var inpTexto = q('ap-texto');
    var inpAcento = q('ap-acento');
    var btnColoresTema = q('ap-colores-tema');
    var inpMostrarLogo = q('ap-mostrar-logo');
    var inpMostrarMarca = q('ap-mostrar-marca');
    var inpProgreso = q('ap-progreso');
    var inpZonaSegura = q('ap-zona-segura');
    var inpTarjetaFinal = q('ap-tarjeta-final');
    var inpEscala = q('ap-escala-texto');
    var valEscala = q('ap-escala-texto-val');
    var inpTDef = q('ap-t-def');
    var valTDef = q('ap-t-def-val');
    var inpTEj = q('ap-t-ej');
    var valTEj = q('ap-t-ej-val');
    var inpTrans = q('ap-trans');
    var valTrans = q('ap-trans-val');
    var inpCierre = q('ap-cierre');
    var valCierre = q('ap-cierre-val');
    var selAnimEntrada = q('ap-anim-entrada');
    var selAnimSalida = q('ap-anim-salida');
    var infoSalida = q('ap-info-salida');
    var btnAgregar = q('ap-agregar');
    var btnVaciar = q('ap-vaciar');
    var btnRestablecer = q('ap-restablecer');
    var btnPng = q('ap-descargar-png');

    function pintaSelectTemas() {
        if (!selTema) return;
        var html = '';
        TEMAS.forEach(function (t) {
            html += '<option value="' + esc(t.id) + '">' + esc(t.nombre || t.id) + '</option>';
        });
        selTema.innerHTML = html;
    }

    function sincronizaColores() {
        if (inpFondo) inpFondo.value = ajustes.fondo || tema.fondo || '#000000';
        if (inpTexto) inpTexto.value = ajustes.texto || tema.texto || '#ffffff';
        if (inpAcento) inpAcento.value = ajustes.acento || tema.acento || '#4dabf7';
    }

    function sincronizaControles() {
        if (selTema) selTema.value = ajustes.tema;
        if (selFormato) selFormato.value = ajustes.formato;
        sincronizaColores();
        if (inpMostrarLogo) inpMostrarLogo.checked = !!ajustes.mostrarLogo;
        if (inpMostrarMarca) inpMostrarMarca.checked = !!ajustes.mostrarMarca;
        if (inpProgreso) inpProgreso.checked = !!ajustes.progreso;
        if (inpZonaSegura) inpZonaSegura.checked = !!ajustes.zonaSegura;
        if (inpTarjetaFinal) inpTarjetaFinal.checked = !!ajustes.tarjetaFinal;
        if (inpEscala) inpEscala.value = ajustes.escalaTexto;
        if (valEscala) valEscala.textContent = Math.round(ajustes.escalaTexto * 100) + ' %';
        if (inpTDef) inpTDef.value = ajustes.tDef;
        if (valTDef) valTDef.textContent = seg(ajustes.tDef);
        if (inpTEj) inpTEj.value = ajustes.tEj;
        if (valTEj) valTEj.textContent = seg(ajustes.tEj);
        if (inpTrans) inpTrans.value = ajustes.trans;
        if (valTrans) valTrans.textContent = seg(ajustes.trans);
        if (inpCierre) inpCierre.value = ajustes.cierre;
        if (valCierre) valCierre.textContent = seg(ajustes.cierre);
        if (selAnimEntrada) selAnimEntrada.value = ajustes.animEntrada;
        if (selAnimSalida) selAnimSalida.value = ajustes.animSalida;
    }

    function actualizaDuracion() {
        var D = duracionTotal();
        var d = dimensiones();
        if (infoSalida) {
            infoSalida.textContent = d.w + ' × ' + d.h + ' · 30 fps · ' + seg(D) +
                ' · ' + conceptos.length + (conceptos.length === 1 ? ' concepto' : ' conceptos');
        }
        if (rangoTiempo) {
            rangoTiempo.max = String(Math.max(0.01, D));
            if (tActual > D) tActual = D;
            rangoTiempo.value = String(tActual);
        }
        if (btnGrabar) btnGrabar.disabled = !conceptos.length || grabando;
        actualizaReloj();
    }

    function aplicaFormato() {
        var d = dimensiones();
        if (!lienzo) return;
        lienzo.width = d.w;
        lienzo.height = d.h;
        invalida();
        actualizaDuracion();
        pintar(tActual, true);
    }

    /* ---------- lista de conceptos ---------- */
    function pintaLista() {
        if (!lista) return;
        if (!conceptos.length) {
            lista.innerHTML = '<div class="ap-vacio">Todavía no hay conceptos. Pulsa «Añadir concepto» para crear el primero.</div>';
            return;
        }
        var html = '';
        conceptos.forEach(function (c, i) {
            var titulo = c.termino || 'Sin título';
            html += '<div class="ap-ficha" data-i="' + i + '">' +
                '<div class="ap-ficha-cab">' +
                '<span class="ap-ficha-num">' + pad2(i + 1) + '</span>' +
                '<p class="ap-ficha-titulo">' + esc(titulo) + '</p>' +
                '<div class="ap-ficha-acciones">' +
                '<button type="button" data-accion="subir" title="Subir" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '><i class="fas fa-arrow-up" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="bajar" title="Bajar" aria-label="Bajar"' + (i === conceptos.length - 1 ? ' disabled' : '') + '><i class="fas fa-arrow-down" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="duplicar" title="Duplicar" aria-label="Duplicar"><i class="fas fa-copy" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="quitar" title="Quitar" aria-label="Quitar"><i class="fas fa-trash-alt" aria-hidden="true"></i></button>' +
                '</div></div>' +
                '<label class="form-label" for="ap-term-' + i + '">' + esc(ETIQUETAS.termino) + '</label>' +
                '<input class="form-control" id="ap-term-' + i + '" data-campo="termino" value="' + esc(c.termino) + '" maxlength="90">' +
                '<label class="form-label" for="ap-def-' + i + '">' + esc(ETIQUETAS.definicion) + '</label>' +
                '<textarea class="form-control" id="ap-def-' + i + '" data-campo="definicion" rows="3">' + esc(c.definicion) + '</textarea>' +
                '<label class="form-label" for="ap-ej-' + i + '">' + esc(ETIQUETAS.ejemplo) + '</label>' +
                '<textarea class="form-control' + (CFG.campoEjemplo === 'codigo' ? ' ap-code' : '') + '" id="ap-ej-' + i + '" data-campo="ejemplo" rows="3">' + esc(c.ejemplo) + '</textarea>' +
                (CFG.mostrarResultado === false ? '' :
                    '<label class="form-label" for="ap-res-' + i + '">' + esc(ETIQUETAS.resultado) + '</label>' +
                    '<input class="form-control" id="ap-res-' + i + '" data-campo="resultado" value="' + esc(c.resultado) + '">') +
                (CFG.mostrarImagen === false ? '' :
                    '<label class="form-label">' + esc(ETIQUETAS.imagen) + '</label>' +
                    '<div class="ap-ficha-media">' +
                    '<div class="ap-mini">' + (c.imagen ? '<img src="' + c.imagen + '" alt="">' : '') + '</div>' +
                    '<label class="btn btn-outline-secondary btn-sm" for="ap-img-' + i + '"><i class="fas fa-image" aria-hidden="true"></i> ' + (c.imagen ? 'Cambiar' : 'Añadir') + '</label>' +
                    '<input type="file" class="d-none" id="ap-img-' + i + '" data-imagen="' + i + '" accept="image/*">' +
                    (c.imagen ? '<button type="button" class="btn btn-outline-secondary btn-sm" data-accion="quitar-imagen"><i class="fas fa-times" aria-hidden="true"></i> Quitar</button>' : '') +
                    '</div>') +
                '</div>';
        });
        lista.innerHTML = html;
    }

    var tmrPintar = null;
    function pintaLuego() {
        if (tmrPintar) clearTimeout(tmrPintar);
        tmrPintar = setTimeout(function () { pintar(tActual, true); }, 110);
    }

    function mueveConcepto(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= conceptos.length) return;
        var tmp = conceptos[i];
        conceptos[i] = conceptos[j];
        conceptos[j] = tmp;
        pintaLista();
        invalida();
        actualizaDuracion();
        pintar(tActual, true);
        guarda();
    }

    function anadeConcepto() {
        conceptos.push({ termino: '', definicion: '', ejemplo: '', resultado: '', imagen: '' });
        pintaLista();
        invalida();
        actualizaDuracion();
        pintar(tActual, true);
        guarda();
        var inp = q('ap-term-' + (conceptos.length - 1));
        if (inp) inp.focus();
    }

    if (lista) {
        lista.addEventListener('input', function (e) {
            var t = e.target;
            var campo = t.getAttribute('data-campo');
            if (!campo) return;
            var ficha = t.closest ? t.closest('.ap-ficha') : null;
            if (!ficha) return;
            var i = parseInt(ficha.getAttribute('data-i'), 10);
            if (!conceptos[i]) return;
            conceptos[i][campo] = t.value;
            if (campo === 'termino') {
                var tit = ficha.querySelector('.ap-ficha-titulo');
                if (tit) tit.textContent = t.value || 'Sin título';
            }
            invalida();
            pintaLuego();
            guarda();
        });

        lista.addEventListener('change', function (e) {
            var inp = e.target;
            if (!inp || inp.type !== 'file' || !inp.getAttribute('data-imagen')) return;
            var i = parseInt(inp.getAttribute('data-imagen'), 10);
            var file = inp.files && inp.files[0];
            if (!file || !conceptos[i]) return;
            if (!/^image\//.test(file.type)) { aviso('Ese archivo no es una imagen', 'warning'); return; }
            var fr = new FileReader();
            fr.onload = function () {
                conceptos[i].imagen = fr.result;
                invalida();
                var sc = lista.scrollTop;
                pintaLista();
                lista.scrollTop = sc;
                cargaImagen(fr.result);
                pintar(tActual, true);
                guarda();
            };
            fr.readAsDataURL(file);
        });

        lista.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('button[data-accion]') : null;
            if (!b) return;
            var ficha = b.closest('.ap-ficha');
            if (!ficha) return;
            var i = parseInt(ficha.getAttribute('data-i'), 10);
            var accion = b.getAttribute('data-accion');
            if (accion === 'subir') mueveConcepto(i, -1);
            else if (accion === 'bajar') mueveConcepto(i, 1);
            else if (accion === 'duplicar') {
                conceptos.splice(i + 1, 0, copia(conceptos[i]));
                pintaLista();
                invalida();
                actualizaDuracion();
                pintar(tActual, true);
                guarda();
            } else if (accion === 'quitar') {
                if (conceptos.length === 1) {
                    conceptos = [];
                } else {
                    conceptos.splice(i, 1);
                }
                pintaLista();
                invalida();
                actualizaDuracion();
                pintar(tActual, true);
                guarda();
            } else if (accion === 'quitar-imagen') {
                conceptos[i].imagen = '';
                pintaLista();
                invalida();
                pintar(tActual, true);
                guarda();
            }
        });
    }

    if (btnAgregar) btnAgregar.addEventListener('click', anadeConcepto);
    if (btnVaciar) {
        btnVaciar.addEventListener('click', function () {
            if (!conceptos.length) return;
            if (!confirm('¿Vaciar todos los conceptos?')) return;
            conceptos = [];
            pintaLista();
            invalida();
            actualizaDuracion();
            pintar(tActual, true);
            guarda();
        });
    }
    if (btnRestablecer) {
        btnRestablecer.addEventListener('click', function () {
            if (!confirm('¿Recuperar los ejemplos iniciales y los ajustes de fábrica?')) return;
            try { localStorage.removeItem('aprende-' + (CFG.clave || 'aprende')); } catch (e) { }
            location.reload();
        });
    }

    /* ---------- estilo y animación ---------- */
    if (selTema) {
        selTema.addEventListener('change', function () {
            ajustes.tema = selTema.value;
            ajustes.fondo = '';
            ajustes.texto = '';
            ajustes.acento = '';
            aplicaTema();
            sincronizaColores();
            if (tema.logo) cargaImagen(tema.logo);
            if (tema.marcaLogo) cargaImagen(tema.marcaLogo);
            invalida();
            pintar(tActual, true);
            guarda();
        });
    }

    if (selFormato) {
        selFormato.addEventListener('change', function () {
            if (grabando) {
                selFormato.value = ajustes.formato;
                return;
            }
            ajustes.formato = selFormato.value;
            aplicaFormato();
            guarda();
        });
    }

    [
        [inpFondo, 'fondo'],
        [inpTexto, 'texto'],
        [inpAcento, 'acento']
    ].forEach(function (par) {
        if (!par[0]) return;
        par[0].addEventListener('input', function () {
            ajustes[par[1]] = par[0].value;
            aplicaTema();
            invalida();
            pintar(tActual, true);
            guarda();
        });
    });

    if (btnColoresTema) {
        btnColoresTema.addEventListener('click', function () {
            ajustes.fondo = '';
            ajustes.texto = '';
            ajustes.acento = '';
            aplicaTema();
            sincronizaColores();
            invalida();
            pintar(tActual, true);
            guarda();
        });
    }

    function enlazaCheck(inp, clave) {
        if (!inp) return;
        inp.addEventListener('change', function () {
            ajustes[clave] = inp.checked;
            pintar(tActual, true);
            guarda();
        });
    }

    enlazaCheck(inpMostrarLogo, 'mostrarLogo');
    enlazaCheck(inpMostrarMarca, 'mostrarMarca');
    enlazaCheck(inpProgreso, 'progreso');
    enlazaCheck(inpZonaSegura, 'zonaSegura');
    enlazaCheck(inpTarjetaFinal, 'tarjetaFinal');

    function enlazaRango(inp, clave, val, fmt) {
        if (!inp) return;
        inp.addEventListener('input', function () {
            var v = parseFloat(inp.value);
            if (isNaN(v)) v = 0;
            ajustes[clave] = v;
            if (val) val.textContent = fmt(v);
            if (clave === 'escalaTexto') invalida();
            actualizaDuracion();
            pintar(tActual, true);
            guarda();
        });
    }

    enlazaRango(inpEscala, 'escalaTexto', valEscala, function (v) { return Math.round(v * 100) + ' %'; });
    enlazaRango(inpTDef, 'tDef', valTDef, seg);
    enlazaRango(inpTEj, 'tEj', valTEj, seg);
    enlazaRango(inpTrans, 'trans', valTrans, seg);
    enlazaRango(inpCierre, 'cierre', valCierre, seg);

    function enlazaSelect(sel, clave) {
        if (!sel) return;
        sel.addEventListener('change', function () {
            ajustes[clave] = sel.value;
            pintar(tActual, true);
            guarda();
        });
    }

    enlazaSelect(selAnimEntrada, 'animEntrada');
    enlazaSelect(selAnimSalida, 'animSalida');

    if (btnPlay) btnPlay.addEventListener('click', reproducir);
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', function () {
            if (grabando) return;
            pausar();
            tActual = 0;
            pintar(tActual, true);
            actualizaReloj();
        });
    }
    if (rangoTiempo) {
        rangoTiempo.addEventListener('input', function () {
            if (grabando) return;
            if (reproduciendo) pausar();
            tActual = parseFloat(rangoTiempo.value) || 0;
            pintar(tActual, true);
            actualizaReloj();
        });
    }

    /* ---------- música ---------- */
    var inpMusica = q('ap-musica-archivo');
    var listaMusica = q('ap-musica-lista');
    var nombreMusica = q('ap-musica-nombre');
    var btnQuitarMusica = q('ap-musica-quitar');
    var volMusica = q('ap-musica-vol');
    var valVolMusica = q('ap-musica-vol-val');

    var PISTAS = window.TET_LISTA_MUSICA || [];
    var listaPintada = false;

    function formatoAudio(s) {
        var m = Math.floor(s / 60);
        var r = Math.round(s % 60);
        if (r >= 60) { m += 1; r = 0; }
        return m + ':' + (r < 10 ? '0' : '') + r;
    }

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

    function pintaListaMusica() {
        if (!listaMusica || listaPintada) return;
        listaPintada = true;
        PISTAS.forEach(function (p, i) {
            var item = document.createElement('div');
            item.className = 'reel-pista-item';
            item.innerHTML =
                '<input type="radio" class="btn-check" name="ap-musica-pista" data-idx="' + i + '"' +
                ' id="ap-pista-' + i + '" value="' + esc(p.titulo) + '" autocomplete="off">' +
                '<label class="btn btn-outline-primary reel-pista-nombre" for="ap-pista-' + i + '">' +
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
        sc.src = './public/js/audio-data.js?v=ap1';
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
        var radios = listaMusica.querySelectorAll('input[name="ap-musica-pista"]');
        for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === musicaNombre);
    }

    if (listaMusica) {
        listaMusica.addEventListener('change', function (e) {
            var t = e.target;
            if (!t || t.name !== 'ap-musica-pista') return;
            var p = PISTAS[parseInt(t.getAttribute('data-idx'), 10)];
            if (p) eligeMusicaLista(p);
        });
    }

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

    if (listaMusica) {
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

    /* ---------- persistencia ---------- */
    var tmrGuarda = null;
    var avisoCuota = false;

    function guarda() {
        if (tmrGuarda) clearTimeout(tmrGuarda);
        tmrGuarda = setTimeout(function () {
            var clave = 'aprende-' + (CFG.clave || 'aprende');
            var datos = { ajustes: ajustes, conceptos: conceptos };
            try {
                localStorage.setItem(clave, JSON.stringify(datos));
            } catch (e) {
                try {
                    var sinImgs = {
                        ajustes: ajustes,
                        conceptos: conceptos.map(function (c) {
                            var d = copia(c);
                            d.imagen = '';
                            return d;
                        })
                    };
                    localStorage.setItem(clave, JSON.stringify(sinImgs));
                    if (!avisoCuota) {
                        avisoCuota = true;
                        aviso('No hay espacio para guardar las imágenes; se guardará el resto.', 'warning');
                    }
                } catch (e2) { }
            }
        }, 350);
    }

    function recupera() {
        var clave = 'aprende-' + (CFG.clave || 'aprende');
        var txt;
        try { txt = localStorage.getItem(clave); } catch (e) { return; }
        if (!txt) return;
        var datos;
        try { datos = JSON.parse(txt); } catch (e) { return; }
        if (datos && datos.ajustes) {
            for (var k in ajustes) {
                if (ajustes.hasOwnProperty(k) && datos.ajustes.hasOwnProperty(k)) {
                    ajustes[k] = datos.ajustes[k];
                }
            }
        }
        if (datos && datos.conceptos && datos.conceptos.length) {
            conceptos = datos.conceptos.map(function (c) {
                return {
                    termino: c.termino || '',
                    definicion: c.definicion || '',
                    ejemplo: c.ejemplo || '',
                    resultado: c.resultado || '',
                    imagen: c.imagen || ''
                };
            });
        }
        if (ajustes.tema && !temaPorId(ajustes.tema)) ajustes.tema = TEMAS[0].id;
    }

    /* ---------- descarga PNG ---------- */
    function descargaPng() {
        if (!lienzo) return;
        if (grabando) return;
        pintar(tActual, false);
        var nombre = (CFG.archivo || 'aprende') + '-' + lienzo.width + 'x' + lienzo.height +
            '-' + fechaCorta() + '.png';
        var termina = function (url, libera) {
            var a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            a.remove();
            if (libera) setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
            pintar(tActual, true);
        };
        try {
            lienzo.toBlob(function (blob) {
                if (!blob) { aviso('No se pudo generar la imagen', 'danger'); pintar(tActual, true); return; }
                termina(URL.createObjectURL(blob), true);
            }, 'image/png');
        } catch (e) {
            try { termina(lienzo.toDataURL('image/png'), false); }
            catch (e2) { aviso('No se pudo generar la imagen', 'danger'); pintar(tActual, true); }
        }
    }

    /* ---------- grabación ---------- */
    var btnGrabar = q('ap-grabar');
    var btnCancelar = q('ap-cancelar');
    var estadoGrab = q('ap-estado');
    var progWrap = q('ap-export-progreso');
    var barraProg = q('ap-barra-prog');
    var progBar = q('ap-export-progreso');
    var resWrap = q('ap-resultado');
    var videoRes = q('ap-video-resultado');
    var btnDescargar = q('ap-descargar');
    var btnCompartir = q('ap-compartir');
    var pesoRes = q('ap-peso');
    var btnDescartar = q('ap-descartar');
    var pestanas = q('ap-pestanas');

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
        nombreResultado = (CFG.archivo || 'aprende') + '-' + lienzo.width + 'x' + lienzo.height +
            '-' + fechaCorta() + '.' + ext;

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
        if (!conceptos.length) {
            aviso('Añade al menos un concepto para grabar', 'warning');
            return;
        }
        if (!window.MediaRecorder || !lienzo.captureStream) {
            aviso('Tu navegador no permite grabar vídeo (MediaRecorder). Prueba con Chrome, Edge o Safari actualizado.', 'danger');
            return;
        }
        pausar();
        detenPreviewMusica();
        tActual = 0;
        pintar(0, false);

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
            pintar(D, false);
            if (pistaVideo) { try { pistaVideo.requestFrame(); } catch (e) { } }
            actualizaProgreso(D);
            detieneGrabacion();
            return;
        }

        if (ts + 0.5 >= proximoEnvio) {
            proximoEnvio += paso;
            if (proximoEnvio <= ts) proximoEnvio = ts + paso;
            pintar(t, false);
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

    /* ---------- eventos de música y exportación ---------- */
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
                navigator.share({
                    files: [archivoResultado],
                    title: CFG.compartirTitulo || 'Aprende con tet'
                }).catch(function () { });
            }
        });
    }

    if (btnPng) btnPng.addEventListener('click', descargaPng);

    if (pestanas) {
        pestanas.addEventListener('shown.bs.tab', function () { pintar(tActual, true); });
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && reproduciendo) pausar();
    });

    /* ---------- arranque ---------- */
    function arranca() {
        recupera();
        aplicaTema();
        pintaSelectTemas();
        sincronizaControles();
        pintaLista();
        pintaListaMusica();
        aplicaFormato();
        if (tema.logo) cargaImagen(tema.logo);
        cargaImagen('./public/img/Logotet.png');
        conceptos.forEach(function (c) { if (c.imagen) cargaImagen(c.imagen); });
        var D = duracionTotal();
        tActual = Math.min(0.6, D);
        pintar(tActual, true);
        actualizaReloj();
    }

    arranca();

    window.TetAprende = {
        pintar: function (t) { pintar(t, true); },
        ir: function (t) {
            pausar();
            tActual = clamp(t, 0, duracionTotal());
            pintar(tActual, true);
            actualizaReloj();
        },
        estado: function () { return { t: tActual, total: duracionTotal(), estado: estadoEn(tActual) }; },
        conceptos: function () { return conceptos; },
        ajustes: function () { return ajustes; },
        grabar: empiezaGrabacion
    };


})();
