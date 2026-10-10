/* Panel de formatos para redes sociales (P3)
   - Selector de preset (Instagram, Facebook, X, YouTube, TikTok, LinkedIn, Pinterest)
   - Guía de recorte sobre el lienzo + zona segura cuando el preset la define
   - Exporta PNG en píxeles exactos del preset con recorte "cover" centrado
   Requiere la variable global `canvas` de Fabric.js creada antes de cargar este script. */
(function () {
    /* Lista de presets accesible también sin lienzo (gif.html la usa para su
       selector de tamaño); el resto del módulo necesita el canvas de fabric. */
    var FORMATOS = [
        {
            grupo: 'Origen', items: [
                { n: 'Tamaño original', orig: true }
            ]
        },
        {
            grupo: 'Instagram', items: [
                { n: 'Instagram cuadrado', w: 1080, h: 1080 },
                { n: 'Instagram vertical (4:5)', w: 1080, h: 1350 },
                { n: 'Instagram story / Reel', w: 1080, h: 1920 }
            ]
        },
        {
            grupo: 'Facebook', items: [
                { n: 'Facebook post', w: 1200, h: 630 },
                { n: 'Facebook cover', w: 820, h: 312 },
                { n: 'Facebook evento', w: 1920, h: 1005 }
            ]
        },
        {
            grupo: 'X (Twitter)', items: [
                { n: 'X post', w: 1600, h: 900 },
                { n: 'X banner', w: 1500, h: 500 }
            ]
        },
        {
            grupo: 'YouTube', items: [
                { n: 'YouTube miniatura', w: 1280, h: 720 },
                { n: 'YouTube miniatura 2K (con zona segura)', w: 2560, h: 1440, safe: { w: 1546, h: 423 } },
                { n: 'YouTube banner (con zona segura)', w: 2048, h: 1152, safe: { w: 1546, h: 423 } }
            ]
        },
        {
            grupo: 'TikTok', items: [
                { n: 'TikTok / story', w: 1080, h: 1920 }
            ]
        },
        {
            grupo: 'LinkedIn', items: [
                { n: 'LinkedIn post', w: 1200, h: 627 }
            ]
        },
        {
            grupo: 'Pinterest', items: [
                { n: 'Pinterest', w: 1000, h: 1500 }
            ]
        }
    ];

    window.TET_FORMATOS = FORMATOS; // presets también sin lienzo (gif.html)

    if (typeof canvas === 'undefined' || !canvas) {
        return;
    }

    /* ---------- panel ---------- */
    var panel = document.createElement('div');
    panel.className = 'formatos-panel';

    var opciones = FORMATOS.map(function (g) {
        var items = g.items.map(function (f, i) {
            var valor = g.grupo + '|' + f.n;
            return '<option value="' + valor + '">' + f.n + (f.orig ? '' : ' — ' + f.w + '×' + f.h) + '</option>';
        }).join('');
        return '<optgroup label="' + g.grupo + '">' + items + '</optgroup>';
    }).join('');

    panel.innerHTML =
        '<div class="formatos-header">' +
            '<i class="fas fa-crop-alt" aria-hidden="true"></i>' +
            '<strong>Formato de salida</strong>' +
        '</div>' +
        '<div class="formatos-body">' +
            '<label class="form-label" for="formato-salida">Red / tamaño</label>' +
            '<select class="form-select" id="formato-salida">' + opciones + '</select>' +
            '<div class="form-text" id="formato-info">1080 × 1080 px</div>' +
            '<div class="form-check mt-2">' +
                '<input class="form-check-input" type="checkbox" id="formato-guia" checked>' +
                '<label class="form-check-label" for="formato-guia">Mostrar guía de recorte</label>' +
            '</div>' +
            '<button type="button" class="btn btn-success mt-3" id="formato-descargar">' +
                '<i class="fas fa-download" aria-hidden="true"></i> <span id="formato-descargar-texto">Descargar PNG</span>' +
            '</button>' +
        '</div>';

    // Se inserta tras el panel de capas (o tras #img si no existe)
    var capasPanel = document.querySelector('.capas-panel');
    var anchor = document.getElementById('img');
    if (capasPanel && capasPanel.parentNode) {
        capasPanel.parentNode.insertBefore(panel, capasPanel.nextSibling);
    } else if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    } else {
        document.body.appendChild(panel);
    }

    /* ---------- guía superpuesta al lienzo ---------- */
    var padreGuia = document.getElementById('img') || (canvas.lowerCanvasEl && canvas.lowerCanvasEl.parentNode);
    var guia = document.createElement('div');
    guia.className = 'formatos-guia';
    guia.setAttribute('aria-hidden', 'true');
    guia.innerHTML =
        '<div class="formatos-guia-recorte"><span class="formatos-guia-etiqueta"></span></div>' +
        '<div class="formatos-guia-safe"></div>';
    if (padreGuia) {
        padreGuia.appendChild(guia);
    }
    var capaRecorte = guia.querySelector('.formatos-guia-recorte');
    var capaSafe = guia.querySelector('.formatos-guia-safe');
    var etiqueta = guia.querySelector('.formatos-guia-etiqueta');

    /* Desplazamiento de un nodo respecto a un ancestro, en px de maquetación.
       La guía vive DENTRO de #img, que es lo que lleva el transform del zoom:
       medir con getBoundingClientRect() devolvía píxeles ya escalados y la
       guía se volvía a escalar con ellos — con el encaje automático del móvil
       (siempre < 100 %) quedaba desplazada y con el tamaño equivocado. */
    function offsetDentro(nodo, raiz) {
        var x = 0, y = 0, n = nodo;
        while (n && n !== raiz) {
            x += n.offsetLeft || 0;
            y += n.offsetTop || 0;
            n = n.offsetParent;
        }
        return { x: x, y: y };
    }

    var select = panel.querySelector('#formato-salida');
    var info = panel.querySelector('#formato-info');
    var chkGuia = panel.querySelector('#formato-guia');
    var btnDescargar = panel.querySelector('#formato-descargar');
    var textoDescargar = panel.querySelector('#formato-descargar-texto');

    function formatoActual() {
        var partes = select.value.split('|');
        var grupo = null;
        FORMATOS.some(function (g) {
            if (g.grupo === partes[0]) { grupo = g; return true; }
            return false;
        });
        if (!grupo) return null;
        var found = null;
        grupo.items.some(function (f) {
            if (f.n === partes[1]) { found = f; return true; }
            return false;
        });
        return found;
    }

    /* dimensiones reales de exportación (el preset "Origen" lee el lienzo actual)
       OJO: canvas.width es el tamaño LÓGICO; lowerCanvasEl es el backing store y
       lleva el devicePixelRatio aplicado. Con dpr 3 un diseño de 1280×720 se
       leía como 3840×2160: se exportaba al triple y el "cover" recortaba el
       tercio central. El botón llegaba a poner «Descargar 3840×2160». */
    function dims(fmt) {
        if (!fmt) return null;
        if (fmt.orig) {
            return { w: canvas.width, h: canvas.height, safe: null };
        }
        return { w: fmt.w, h: fmt.h, safe: fmt.safe };
    }

    /* color de fondo del PNG exportado. Sin esto el lienzo temporal nace
       transparente y el PNG sale con canal alfa: se ve negro en Fotos de
       Windows, en Instagram, en WhatsApp y en cualquier visor que componga
       sobre negro. */
    function fondoLienzo() {
        var c = canvas.backgroundColor;
        if (typeof c === 'string' && c) return c;
        if (c && typeof c === 'object' && typeof c.source === 'string') return c.source;
        return '#ffffff';
    }

    /* ---------- geometría del recorte "cover" centrado ---------- */
    function recorte(sw, sh, W, H) {
        var m = Math.max(W / sw, H / sh);      // escala uniforme para cubrir
        var cw = W / m;                         // ancho de origen recortado
        var ch = H / m;                         // alto de origen recortado
        return {
            sx: (sw - cw) / 2,
            sy: (sh - ch) / 2,
            cw: cw,
            ch: ch
        };
    }

    function actualizarGuia() {
        var fmt = formatoActual();
        if (!fmt || !padreGuia) return;

        var mostrar = chkGuia.checked;
        guia.style.display = mostrar ? 'block' : 'none';
        if (!mostrar) return;

        var el = canvas.lowerCanvasEl;
        if (!el) return;
        /* todo en px de maquetación: el lienzo puede llevar un transform de
           zoom y la guía, al vivir dentro del mismo contenedor, lo hereda */
        var sw = canvas.width;    /* px lógicos del lienzo (origen del recorte) */
        var sh = canvas.height;
        var po = offsetDentro(el, padreGuia);

        guia.style.left = po.x + 'px';
        guia.style.top = po.y + 'px';
        guia.style.width = el.offsetWidth + 'px';
        guia.style.height = el.offsetHeight + 'px';

        var d = dims(fmt);
        if (!d) return;
        var c = recorte(sw, sh, d.w, d.h);
        var ex = el.offsetWidth / sw;
        var ey = el.offsetHeight / sh;

        capaRecorte.style.left = (c.sx * ex) + 'px';
        capaRecorte.style.top = (c.sy * ey) + 'px';
        capaRecorte.style.width = (c.cw * ex) + 'px';
        capaRecorte.style.height = (c.ch * ey) + 'px';
        etiqueta.textContent = d.w + ' × ' + d.h;

        if (d.safe) {
            var fw = d.safe.w / d.w;
            var fh = d.safe.h / d.h;
            var fx = (1 - fw) / 2;
            var fy = (1 - fh) / 2;
            capaSafe.style.display = 'block';
            capaSafe.style.left = ((c.sx + fx * c.cw) * ex) + 'px';
            capaSafe.style.top = ((c.sy + fy * c.ch) * ey) + 'px';
            capaSafe.style.width = (fw * c.cw * ex) + 'px';
            capaSafe.style.height = (fh * c.ch * ey) + 'px';
        } else {
            capaSafe.style.display = 'none';
        }
    }

    function actualizarInfo() {
        var fmt = formatoActual();
        var d = dims(fmt);
        if (!fmt || !d) return;
        info.textContent = d.w + ' × ' + d.h + ' px' + (d.safe ? ' · zona segura ' + d.safe.w + '×' + d.safe.h : '');
        textoDescargar.textContent = 'Descargar ' + d.w + '×' + d.h;
        actualizarGuia();
    }

    /* ---------- exportación en píxeles exactos (con sobremuestreo) ---------- */

    /* Presupuesto de píxeles del lienzo temporal. Por encima de ~16 Mpx (el
       límite de iOS Safari) el contexto se queda en negro o se pierde: era lo
       que pasaba en móvil al sumar el intermediate ×devicePixelRatio y el
       lienzo final. */
    var MAX_PX = 16e6;

    function descargar() {
        var d = dims(formatoActual());
        if (!d) return;

        canvas.discardActiveObject();

        /* recorte cover centrado en coordenadas lógicas del lienzo */
        var c = recorte(canvas.width, canvas.height, d.w, d.h);

        /* el respaldo lógico son solo 1200px y los presets llegan a 2560:
           antes se estiraba ese raster (texto suave). Ahora se pinta la
           escena ×k —texto y figuras siguen siendo vectores, salen nítidos—
           y se reduce a los píxeles exactos del preset.

           k tiene tres topes: el que pide el preset, 3× como máximo (a partir
           de ahí no se gana nada visible) y el presupuesto de píxeles, que es
           el que evita el lientero gigante en móvil. */
        var ideal = Math.max(d.w / c.cw, d.h / c.ch);
        var k = Math.min(3, Math.max(1, Math.ceil(ideal)));
        var cupote = (MAX_PX * 0.8) / Math.max(1, c.cw * c.ch);
        if (k * k > cupote) k = Math.max(1, Math.floor(Math.sqrt(cupote)));

        var w0 = canvas.width, h0 = canvas.height;
        var vpt0 = canvas.viewportTransform;
        var off0 = canvas.skipOffscreen;
        var retina0 = canvas.enableRetinaScaling;
        var objs = canvas.getObjects();
        var cache0 = objs.map(function (o) { return o.objectCaching; });
        var bg = canvas.backgroundImage;
        var bgCache0 = bg ? bg.objectCaching : null;
        var bgL = bg ? bg.left : 0, bgT = bg ? bg.top : 0;
        var bgSX = bg ? bg.scaleX : 1, bgSY = bg ? bg.scaleY : 1;

        var url = null, fallo = null;
        try {
            /* el retina se apaga SOLO durante el render. Con dpr 3 el respaldo
               salía a c.cw*k*3 × c.ch*k*3 (×9 de memoria) sin ganar nada:
               era el primer paso del negro en móvil. */
            canvas.set({ enableRetinaScaling: false });

            /* la imagen de fondo se renderiza FUERA del viewportTransform
               (renderCanvas la pinta antes del transform): hay que escalarla
               y desplazarla a mano para que cubra el recorte ×k */
            if (bg) {
                bg.set({
                    left: (bgL - c.sx) * k,
                    top: (bgT - c.sy) * k,
                    scaleX: bgSX * k,
                    scaleY: bgSY * k,
                    objectCaching: false
                });
            }
            /* sin cachés de objeto: se crearon a escala 1 y saldrían
               pixeladas al pintar ×k */
            objs.forEach(function (o) { o.objectCaching = false; });

            canvas.setDimensions({
                width: Math.round(c.cw * k),
                height: Math.round(c.ch * k)
            }, { backstoreOnly: true });
            canvas.viewportTransform = [k, 0, 0, k, -c.sx * k, -c.sy * k];
            canvas.skipOffscreen = false; /* fuera de vista = fuera del recorte */
            canvas.renderAll();

            var hi = canvas.lowerCanvasEl;
            var off = document.createElement('canvas');
            off.width = d.w;
            off.height = d.h;
            var ctx = off.getContext('2d');
            if (!ctx) throw new Error('El navegador no ha podido reservar ' + d.w + '×' + d.h + ' px');
            /* fondo opaco ANTES de dibujar: sin esto el PNG lleva canal alfa
               y se ve negro fuera del navegador */
            ctx.fillStyle = fondoLienzo();
            ctx.fillRect(0, 0, d.w, d.h);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(hi, 0, 0, hi.width, hi.height, 0, 0, d.w, d.h);
            url = off.toDataURL('image/png');
        } catch (err) {
            fallo = err;
        } finally {
            canvas.viewportTransform = vpt0;
            canvas.skipOffscreen = off0;
            objs.forEach(function (o, i) { o.objectCaching = cache0[i]; });
            if (bg) {
                bg.set({
                    left: bgL, top: bgT, scaleX: bgSX, scaleY: bgSY,
                    objectCaching: bgCache0
                });
            }
            /* con el retina ya en su valor original, setDimensions devuelve el
               respaldo exacto al estado de entrada (lógico × dpr) */
            canvas.set({ enableRetinaScaling: retina0 });
            canvas.setDimensions({ width: w0, height: h0 }, { backstoreOnly: true });
            canvas.renderAll();
        }

        if (!url) {
            // canvas "tainted" (p.ej. abierto como file://): aviso claro en vez de fallar a ciegas
            if (window.avisoExportacion) window.avisoExportacion(fallo);
            else if (window.mostrarAviso) window.mostrarAviso('No se pudo exportar la imagen', 'danger');
            return;
        }

        var nombre = 'tet_' + d.w + 'x' + d.h + '.png';
        var a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();

        if (window.mostrarAviso) {
            window.mostrarAviso('Descargado ' + nombre, 'success');
        }
        actualizarGuia();
    }

    select.addEventListener('change', actualizarInfo);
    chkGuia.addEventListener('change', actualizarGuia);
    btnDescargar.addEventListener('click', descargar);
    window.addEventListener('resize', actualizarGuia);

    /* ---------- PNG opaco del lienzo, para Compartir / portapapeles ----------
       canvas.toDataURL() respeta el fondo del lienzo; si no lo hay, el PNG
       sale transparente y se ve negro en cualquier app que compone sobre
       negro. Además va sin retina: compartir un 1080×1080 no necesita ×3, y
       en el móvil ese triplicado era justo lo que reventaba la memoria. */
    window.tetLienzoPng = function () {
        var bg0 = canvas.backgroundColor;
        try {
            if (!bg0) canvas.backgroundColor = fondoLienzo();
            canvas.renderAll();
            return canvas.toDataURL({ format: 'png', enableRetinaScaling: false });
        } finally {
            canvas.backgroundColor = bg0;
            canvas.renderAll();
        }
    };

    // La shell (shell.js) lo usa al redimensionar / vaciar el lienzo
    window.formatosActualizar = actualizarInfo;
    window.formatosDims = function () { return dims(formatoActual()); };

    actualizarInfo();
    // La guía necesita las medidas finales del lienzo
    setTimeout(actualizarGuia, 300);
})();
