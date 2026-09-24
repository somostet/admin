/* Panel de formatos para redes sociales (P3)
   - Selector de preset (Instagram, Facebook, X, YouTube, TikTok, LinkedIn, Pinterest)
   - Guía de recorte sobre el lienzo + zona segura cuando el preset la define
   - Exporta PNG en píxeles exactos del preset con recorte "cover" centrado
   Requiere la variable global `canvas` de Fabric.js creada antes de cargar este script. */
(function () {
    if (typeof canvas === 'undefined' || !canvas) {
        return;
    }

    var FORMATOS = [
        {
            grupo: 'Origen', items: [
                { n: 'Tamaño original del lienzo', orig: true }
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

    /* dimensiones reales de exportación (el preset "Origen" lee el lienzo actual) */
    function dims(fmt) {
        if (!fmt) return null;
        if (fmt.orig) {
            return { w: canvas.lowerCanvasEl.width, h: canvas.lowerCanvasEl.height, safe: null };
        }
        return { w: fmt.w, h: fmt.h, safe: fmt.safe };
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
        var r = el.getBoundingClientRect();
        var pr = padreGuia.getBoundingClientRect();
        var sw = el.width;   // píxeles de respaldo (export real)
        var sh = el.height;

        guia.style.left = (r.left - pr.left) + 'px';
        guia.style.top = (r.top - pr.top) + 'px';
        guia.style.width = r.width + 'px';
        guia.style.height = r.height + 'px';

        var d = dims(fmt);
        if (!d) return;
        var c = recorte(sw, sh, d.w, d.h);
        var ex = r.width / sw;
        var ey = r.height / sh;

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

    /* ---------- exportación en píxeles exactos ---------- */
    function descargar() {
        var d = dims(formatoActual());
        if (!d) return;

        canvas.discardActiveObject();
        canvas.renderAll();

        var src = canvas.lowerCanvasEl;
        var sw = src.width;
        var sh = src.height;
        var c = recorte(sw, sh, d.w, d.h);

        var off = document.createElement('canvas');
        off.width = d.w;
        off.height = d.h;
        var ctx = off.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, c.sx, c.sy, c.cw, c.ch, 0, 0, d.w, d.h);

        var nombre = 'tet_' + d.w + 'x' + d.h + '.png';
        var a = document.createElement('a');
        a.href = off.toDataURL('image/png');
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

    // La shell (shell.js) lo usa al redimensionar / vaciar el lienzo
    window.formatosActualizar = actualizarInfo;
    window.formatosDims = function () { return dims(formatoActual()); };

    actualizarInfo();
    // La guía necesita las medidas finales del lienzo
    setTimeout(actualizarGuia, 300);
})();
