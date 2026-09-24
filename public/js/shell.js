/* ============================================================
   shell.js — barra de estilo Inkscape para tet1 (piloto)
   Reorganiza el DOM existente SIN tocar la lógica:
   - Barra superior: plantilla + cargar, deshacer/rehacer, zoom,
     compartir, descargar, tema.
   - Rail izquierdo: herramientas (título, detalles, imagen,
     galería, centrar, borrar, orden).
   - Escenario: reglas (rulers) con coordenadas + lienzo.
   - Dock derecho con pestañas: Propiedades (formulario) /
     Capas / Formato de salida.
   - Paleta de colores + barra de estado abajo.
   Requiere: canvas (Fabric), capas.js y formatos.js ya cargados.
   ============================================================ */
(function () {
    'use strict';

    if (typeof canvas === 'undefined' || !canvas) return;

    var panel = document.querySelector('.editor-panel');
    var lienzo = document.querySelector('.editor-lienzo');
    if (!panel || !lienzo) return;

    /* ancestros del árbol original: hay que capturarlos ANTES de mover nada */
    var formEl = panel.closest('form');
    if (!formEl || !formEl.parentNode || !formEl.parentNode.parentNode) return;
    var filaTop = formEl.parentNode.parentNode; // .row.mt-3
    var fluidExt = filaTop.parentNode;          // .container-fluid exterior

    /* ---------------- helpers ---------------- */
    function el(tag, cls, html) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (html != null) d.innerHTML = html;
        return d;
    }

    function q(sel, root) { return (root || document).querySelector(sel); }

    function sep() { return el('span', 'top-sep'); }

    function mkBtn(icono, titulo, textoVisible) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-ghost';
        b.setAttribute('aria-label', titulo);
        b.setAttribute('data-bs-toggle', 'tooltip');
        b.setAttribute('title', titulo);
        b.innerHTML = '<i class="fas ' + icono + '" aria-hidden="true"></i>' +
            (textoVisible ? '<span class="ms-1">' + textoVisible + '</span>' : '');
        return b;
    }

    /* Mueve un botón del formulario a otro sitio conservando sus handlers */
    function moverBoton(etiqueta, contenedor) {
        var b = panel.querySelector('[aria-label="' + etiqueta + '"]');
        if (!b) return null;
        b.classList.add('btn-ghost');
        contenedor.appendChild(b);
        return b;
    }

    function hacerIcono(b) {
        // deja solo el icono: el texto pasa a .solo-movil (oculto en el rail)
        if (!b) return;
        var span = b.querySelector('span');
        if (span) span.classList.add('solo-movil');
    }

    /* ---------------- estructura ---------------- */
    var shell = el('div', 'shell');
    var top = el('header', 'shell-top');
    var mid = el('div', 'shell-mid');
    var rail = el('nav', 'shell-rail');
    rail.setAttribute('aria-label', 'Herramientas');
    var stage = el('div', 'shell-stage');
    var rulH = el('canvas', 'ruler ruler-h');
    var rulV = el('canvas', 'ruler ruler-v');
    var work = el('div', 'shell-work');
    var dock = el('aside', 'shell-dock');
    dock.setAttribute('aria-label', 'Paneles del editor');
    var bottom = el('footer', 'shell-bottom');

    stage.appendChild(el('div', 'ruler-corner'));
    stage.appendChild(rulH);
    stage.appendChild(rulV);
    stage.appendChild(work);

    /* ---------------- barra superior ---------------- */
    top.appendChild(el('span', 'shell-doc',
        '<i class="fas fa-newspaper" aria-hidden="true"></i> Tet news'));

    top.appendChild(sep());

    var selectPlantilla = q('#plantilla');
    if (selectPlantilla) top.appendChild(selectPlantilla);
    moverBoton('Cargar plantilla', top);

    top.appendChild(sep());

    /* deshacer / rehacer → reenvían el clic a la toolbar de capas */
    var btnUndo = mkBtn('fa-undo', 'Deshacer (Ctrl+Z)');
    var btnRedo = mkBtn('fa-redo', 'Rehacer (Ctrl+Shift+Z)');
    function reenviar(act) {
        var b = q('#capas-toolbar [data-act="' + act + '"]');
        if (b && !b.disabled) b.click();
    }
    btnUndo.addEventListener('click', function () { reenviar('undo'); });
    btnRedo.addEventListener('click', function () { reenviar('redo'); });
    top.appendChild(btnUndo);
    top.appendChild(btnRedo);

    top.appendChild(sep());

    /* zoom (transform sobre #img; Fabric recalcula el puntero por evento) */
    var NIVELES = [0.5, 0.75, 1, 1.25, 1.5, 2];
    var zoom = 1;
    var btnZoomOut = mkBtn('fa-search-minus', 'Alejar');
    var btnZoomLbl = mkBtn('fa-expand', 'Zoom al 100%');
    btnZoomLbl.id = 'sh-zoom-label';
    var btnZoomIn = mkBtn('fa-search-plus', 'Acercar');

    function aplicarZoom(z) {
        var mejor = NIVELES[0];
        for (var i = 0; i < NIVELES.length; i++) {
            if (Math.abs(NIVELES[i] - z) < Math.abs(mejor - z)) mejor = NIVELES[i];
        }
        zoom = mejor;
        var img = document.getElementById('img');
        if (img) img.style.transform = zoom === 1 ? '' : 'scale(' + zoom + ')';
        btnZoomLbl.innerHTML = '<span>' + Math.round(zoom * 100) + '%</span>';
        if (typeof zoomEstado !== 'undefined' && zoomEstado) {
            zoomEstado.textContent = Math.round(zoom * 100) + '%';
        }
        pintarReglas();
    }
    function pasoZoom(dir) {
        var idx = NIVELES.indexOf(zoom);
        if (idx < 0) idx = 2;
        idx = Math.min(NIVELES.length - 1, Math.max(0, idx + dir));
        aplicarZoom(NIVELES[idx]);
    }
    btnZoomOut.addEventListener('click', function () { pasoZoom(-1); });
    btnZoomIn.addEventListener('click', function () { pasoZoom(1); });
    btnZoomLbl.addEventListener('click', function () { aplicarZoom(1); });
    top.appendChild(btnZoomOut);
    top.appendChild(btnZoomLbl);
    top.appendChild(btnZoomIn);

    top.appendChild(el('span', 'top-spacer'));

    /* compartir (reenvía al botón de la toolbar de capas) */
    var capasShare = q('#capas-toolbar [data-act="share"]');
    if (navigator.share && capasShare) {
        var btnShare = mkBtn('fa-share-alt', 'Compartir imagen', 'Compartir');
        btnShare.classList.remove('btn-ghost');
        btnShare.classList.add('btn-primary');
        btnShare.addEventListener('click', function () { reenviar('share'); });
        top.appendChild(btnShare);
    }

    /* descargar (movido del formulario, conserva su onclick) */
    var btnDesc = moverBoton('Descargar', top);
    if (btnDesc) {
        btnDesc.classList.remove('btn-ghost');
        var spanDesc = btnDesc.querySelector('span');
        if (spanDesc) { spanDesc.className = 'ms-1'; } // texto visible siempre
    }

    /* tema oscuro / claro */
    var btnTema = mkBtn('fa-moon', 'Cambiar tema');
    function pintarTemaBtn() {
        var oscuro = document.documentElement.getAttribute('data-theme') !== 'light';
        btnTema.innerHTML = '<i class="fas ' + (oscuro ? 'fa-moon' : 'fa-sun') + '" aria-hidden="true"></i>';
        btnTema.setAttribute('aria-label',
            oscuro ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro');
        btnTema.setAttribute('title', btnTema.getAttribute('aria-label'));
    }
    btnTema.addEventListener('click', function () {
        var actual = document.documentElement.getAttribute('data-theme');
        var nuevo = actual === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nuevo);
        try { localStorage.setItem('tetTema', nuevo); } catch (e) { /* modo privado */ }
        pintarTemaBtn();
        pintarReglas();
    });
    pintarTemaBtn();
    top.appendChild(btnTema);

    /* ---------------- rail de herramientas ---------------- */
    var t1 = moverBoton('Insertar título', rail);   if (t1) hacerIcono(t1);
    var t2 = moverBoton('Insertar detalles', rail);  if (t2) hacerIcono(t2);
    var t3 = moverBoton('Insertar imagen', rail);    if (t3) hacerIcono(t3);

    var btnGaleria = q('button[data-bs-target=".bd-example-modal-lg"]');
    if (btnGaleria) {
        // NO tocar data-bs-toggle: es "modal" y abriría el tooltip en su lugar
        btnGaleria.classList.add('btn-ghost');
        btnGaleria.setAttribute('title', 'Galería de imágenes');
        btnGaleria.setAttribute('aria-label', 'Galería de imágenes');
        btnGaleria.innerHTML = '<i class="fas fa-images" aria-hidden="true"></i>' +
            '<span class="solo-movil ms-1">Galería</span>';
        rail.appendChild(btnGaleria);
    }

    /* pegar desde el portapapeles (la lógica vive en capas.js) */
    var btnPegar = mkBtn('fa-clipboard', 'Pegar imagen (Ctrl+V)');
    btnPegar.addEventListener('click', function () {
        function av(msg, tipo) { if (window.mostrarAviso) window.mostrarAviso(msg, tipo); }
        if (navigator.clipboard && navigator.clipboard.read) {
            navigator.clipboard.read().then(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var tipos = (entries[i].types || []).filter(function (t) {
                        return t.indexOf('image/') === 0;
                    });
                    if (tipos.length) {
                        entries[i].getType(tipos[0]).then(function (blob) {
                            window.pegarImagenBlob(blob);
                        });
                        return;
                    }
                }
                av('El portapapeles no contiene imágenes', 'warning');
            }).catch(function () {
                av('Pulsa Ctrl+V para pegar la imagen', 'warning');
            });
        } else {
            av('Pulsa Ctrl+V para pegar la imagen', 'warning');
        }
    });
    rail.appendChild(btnPegar);

    rail.appendChild(el('span', 'shell-rail-sep'));

    var t4 = moverBoton('Centrar elemento', rail);   if (t4) hacerIcono(t4);
    var t5 = moverBoton('Remover seleccionado', rail); if (t5) hacerIcono(t5);

    rail.appendChild(el('span', 'shell-rail-sep'));

    var btnAtras = mkBtn('fa-arrow-down', 'Enviar hacia atrás');
    btnAtras.addEventListener('click', function () {
        if (typeof window.toBackward === 'function') window.toBackward();
    });
    var btnAdelante = mkBtn('fa-arrow-up', 'Traer hacia delante');
    btnAdelante.addEventListener('click', function () {
        if (typeof window.toForward === 'function') window.toForward();
    });
    rail.appendChild(btnAtras);
    rail.appendChild(btnAdelante);

    /* ---------------- dock con pestañas ---------------- */
    var tabs = el('div', 'dock-tabs');
    tabs.setAttribute('role', 'tablist');
    var panes = el('div', 'dock-panes');

    var PESTANAS = [
        { id: 'props',    icono: 'fa-pen',            texto: 'Propiedades' },
        { id: 'capas',    icono: 'fa-layer-group',    texto: 'Capas' },
        { id: 'formato',  icono: 'fa-crop-alt',       texto: 'Formato' }
    ];
    PESTANAS.forEach(function (p) {
        var b = el('button', 'dock-tab' + (p.id === 'props' ? ' is-active' : ''),
            '<i class="fas ' + p.icono + '" aria-hidden="true"></i> ' + p.texto);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', p.id === 'props' ? 'true' : 'false');
        b.dataset.pane = p.id;
        tabs.appendChild(b);

        var pane = el('div', 'dock-pane' + (p.id === 'props' ? ' is-active' : ''));
        pane.dataset.pane = p.id;
        pane.setAttribute('role', 'tabpanel');
        panes.appendChild(pane);
    });

    tabs.addEventListener('click', function (e) {
        var t = e.target.closest('.dock-tab');
        if (!t) return;
        tabs.querySelectorAll('.dock-tab').forEach(function (x) {
            var activo = x === t;
            x.classList.toggle('is-active', activo);
            x.setAttribute('aria-selected', activo ? 'true' : 'false');
        });
        panes.querySelectorAll('.dock-pane').forEach(function (p) {
            p.classList.toggle('is-active', p.dataset.pane === t.dataset.pane);
        });
        if (t.dataset.pane === 'formato') {
            // la guía de recorte necesita rehacer sus cálculos al volver
            setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
        }
    });

    dock.appendChild(tabs);
    dock.appendChild(panes);

    /* ---------------- paleta + estado ---------------- */
    var COLORES = [
        '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff',
        '#ff0000', '#ff6060', '#ffc0c0',
        '#ff8000', '#ffb000', '#ffd43b',
        '#ffff00', '#c8d800', '#80a000',
        '#00c000', '#00ff40', '#a0ffc0',
        '#00ffff', '#00a0c0',
        '#0040ff', '#4080ff', '#b0c8ff',
        '#8000c0', '#c060ff',
        '#ff00c0', '#ff6090',
        '#804020', '#c08050', '#e0b080',
        '#7a5cd0', '#f0f0d0'
    ];
    var palette = el('div', 'shell-palette');
    palette.setAttribute('aria-label', 'Paleta de colores');
    COLORES.forEach(function (c) {
        var s = el('button', 'swatch');
        s.type = 'button';
        s.style.background = c;
        s.dataset.color = c;
        s.title = c;
        s.setAttribute('aria-label', 'Color ' + c);
        palette.appendChild(s);
    });

    var estado = el('span', null, '1200 × 1200 px');
    estado.id = 'sh-estado';
    var coords = el('span', null, '—, —');
    coords.id = 'sh-coords';
    var zoomEstado = el('span', null, '100%');
    zoomEstado.id = 'sh-zoom-estado';

    var status = el('div', 'shell-status');
    status.appendChild(coords);
    status.appendChild(estado);
    status.appendChild(zoomEstado);

    bottom.appendChild(palette);
    bottom.appendChild(status);

    palette.addEventListener('click', function (e) {
        var sw = e.target.closest('.swatch');
        if (!sw) return;
        aplicarColor(sw.dataset.color);
    });

    function aplicarColor(hex) {
        var obj = canvas.getActiveObject();
        if (obj) {
            var objetos = obj.type === 'activeSelection' ? obj.getObjects() : [obj];
            var n = 0;
            objetos.forEach(function (o) {
                if (o.type === 'image') return;
                if ('fill' in o) { o.set('fill', hex); n++; }
            });
            if (n > 0) {
                canvas.renderAll();
                canvas.fire('object:modified', { target: obj }); // guarda en el historial
                estado.textContent = 'Color ' + hex;
                if (window.mostrarAviso) window.mostrarAviso('Color aplicado: ' + hex, 'success');
            } else {
                if (window.mostrarAviso) window.mostrarAviso('Las imágenes no cambian de color', 'warning');
            }
        } else {
            // sin selección: será el color del próximo texto insertado
            var ct = document.getElementById('colorT');
            if (ct) ct.value = hex;
            estado.textContent = 'Próximo texto ' + hex;
            if (window.mostrarAviso) window.mostrarAviso('Color de texto: ' + hex, 'success');
        }
    }

    /* ---------------- coordenadas del puntero ---------------- */
    var puntero = { dentro: false, x: 0, y: 0 };
    var pendiente = false;

    function pintarReglasDebounced() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(function () { pendiente = false; pintarReglas(); });
    }

    work.addEventListener('mousemove', function (e) {
        var r = canvas.lowerCanvasEl.getBoundingClientRect();
        var bw = canvas.getWidth(), bh = canvas.getHeight();
        var bx = (e.clientX - r.left) / r.width * bw;
        var by = (e.clientY - r.top) / r.height * bh;
        var dentro = bx >= 0 && by >= 0 && bx <= bw && by <= bh;
        puntero.dentro = dentro;
        if (dentro) {
            puntero.x = bx;
            puntero.y = by;
            coords.textContent = Math.round(bx) + ', ' + Math.round(by);
        } else {
            coords.textContent = bw + ' × ' + bh;
        }
        pintarReglasDebounced();
    });

    work.addEventListener('mouseleave', function () {
        puntero.dentro = false;
        coords.textContent = canvas.getWidth() + ' × ' + canvas.getHeight();
        pintarReglas();
    });

    /* ---------------- reglas (rulers) ---------------- */
    function pasoPara(k) {
        var candidatos = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
        var eleccion = candidatos[candidatos.length - 1];
        for (var i = 0; i < candidatos.length; i++) {
            if (candidatos[i] * k >= 48) { eleccion = candidatos[i]; break; }
        }
        return eleccion;
    }

    function pintarReglas() {
        if (window.matchMedia('(max-width: 991.98px)').matches) return; // ocultas
        var el0 = document.getElementById('img');
        if (!el0 || !rulH.clientWidth || !rulV.clientHeight) return;

        var dpr = window.devicePixelRatio || 1;
        var r = canvas.lowerCanvasEl.getBoundingClientRect();
        var wr = work.getBoundingClientRect();
        var bw = canvas.getWidth(), bh = canvas.getHeight();
        var kx = r.width / bw;
        var ky = r.height / bh;
        var ox = r.left - wr.left;
        var oy = r.top - wr.top;

        var oscuro = document.documentElement.getAttribute('data-theme') !== 'light';
        var fondo = oscuro ? '#2d2d2d' : '#ffffff';
        var linea = oscuro ? '#5a5a5a' : '#b5b5b5';
        var texto = oscuro ? '#9a9a9a' : '#666666';
        var marca = oscuro ? '#ffd43b' : '#0d6efd';

        /* ---- horizontal ---- */
        var wCss = rulH.clientWidth, hCss = 22;
        rulH.width = Math.round(wCss * dpr);
        rulH.height = Math.round(hCss * dpr);
        var g = rulH.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = fondo;
        g.fillRect(0, 0, wCss, hCss);
        g.font = '9px sans-serif';
        g.textBaseline = 'top';
        g.strokeStyle = linea;

        var pasoMay = pasoPara(kx);
        var pasoMen = pasoMay / 5;
        var p, x;

        g.beginPath();
        for (p = 0; p <= bw + pasoMen; p += pasoMen) {
            x = Math.round(ox + p * kx) + 0.5;
            if (x < 0 || x > wCss) continue;
            g.moveTo(x, hCss);
            g.lineTo(x, hCss - 4);
        }
        g.stroke();

        g.fillStyle = texto;
        g.beginPath();
        for (p = 0; p <= bw + pasoMay; p += pasoMay) {
            x = Math.round(ox + p * kx) + 0.5;
            if (x < 0) continue;
            if (x > wCss) break;
            g.moveTo(x, hCss);
            g.lineTo(x, hCss - 9);
            if (p > 0) g.fillText(String(p), x + 2, 2);
        }
        g.stroke();

        if (puntero.dentro) {
            var xm = Math.round(ox + puntero.x * kx) + 0.5;
            g.strokeStyle = marca;
            g.beginPath();
            g.moveTo(xm, 0);
            g.lineTo(xm, hCss);
            g.stroke();
        }

        /* ---- vertical ---- */
        var hV = rulV.clientHeight, wV = 22;
        rulV.width = Math.round(wV * dpr);
        rulV.height = Math.round(hV * dpr);
        var gv = rulV.getContext('2d');
        gv.setTransform(dpr, 0, 0, dpr, 0, 0);
        gv.fillStyle = fondo;
        gv.fillRect(0, 0, wV, hV);
        gv.font = '9px sans-serif';
        gv.textBaseline = 'top';
        gv.strokeStyle = linea;

        var pasoMayV = pasoPara(ky);
        var pasoMenV = pasoMayV / 5;
        var y;

        gv.beginPath();
        for (p = 0; p <= bh + pasoMenV; p += pasoMenV) {
            y = Math.round(oy + p * ky) + 0.5;
            if (y < 0 || y > hV) continue;
            gv.moveTo(wV, y);
            gv.lineTo(wV - 4, y);
        }
        gv.stroke();

        gv.fillStyle = texto;
        gv.beginPath();
        for (p = 0; p <= bh + pasoMayV; p += pasoMayV) {
            y = Math.round(oy + p * ky) + 0.5;
            if (y < 0) continue;
            if (y > hV) break;
            gv.moveTo(wV, y);
            gv.lineTo(wV - 9, y);
        }
        gv.stroke();
        for (p = pasoMayV; p <= bh; p += pasoMayV) {
            y = Math.round(oy + p * ky);
            if (y < 14 || y > hV) continue;
            gv.save();
            gv.translate(wV - 12, y - 2);
            gv.rotate(-Math.PI / 2);
            gv.fillText(String(p), 0, 0);
            gv.restore();
        }

        if (puntero.dentro) {
            var ym = Math.round(oy + puntero.y * ky) + 0.5;
            gv.strokeStyle = marca;
            gv.beginPath();
            gv.moveTo(0, ym);
            gv.lineTo(wV, ym);
            gv.stroke();
        }
    }

    window.addEventListener('resize', pintarReglas);

    /* ---------------- montaje del DOM ---------------- */
    shell.appendChild(top);
    shell.appendChild(mid);
    shell.appendChild(bottom);
    mid.appendChild(rail);
    mid.appendChild(stage);
    mid.appendChild(dock);
    work.appendChild(lienzo);

    var paneProps = panes.querySelector('[data-pane="props"]');
    var paneCapas = panes.querySelector('[data-pane="capas"]');
    var paneForm = panes.querySelector('[data-pane="formato"]');
    paneProps.appendChild(panel);

    var capasPanel = document.querySelector('.capas-panel');
    if (capasPanel) paneCapas.appendChild(capasPanel);
    var formatosPanel = document.querySelector('.formatos-panel');
    if (formatosPanel) paneForm.appendChild(formatosPanel);
    else {
        var tabForm = tabs.querySelector('[data-pane="formato"]');
        if (tabForm) tabForm.style.display = 'none';
    }

    /* sustituye el antiguo row > col > form por el shell */
    fluidExt.appendChild(shell);
    filaTop.remove();

    /* ---------------- sincronía historial (capas.js) ---------------- */
    window.tetSyncHistorial = function (puedeDeshacer, puedeRehacer) {
        btnUndo.disabled = !puedeDeshacer;
        btnRedo.disabled = !puedeRehacer;
    };
    var cu = q('#capas-toolbar [data-act="undo"]');
    var cr = q('#capas-toolbar [data-act="redo"]');
    btnUndo.disabled = cu ? cu.disabled : true;
    btnRedo.disabled = cr ? cr.disabled : true;

    /* ---------------- estado inicial ---------------- */
    aplicarZoom(1);

    // las reglas necesitan las medidas finales del layout
    setTimeout(pintarReglas, 60);
    setTimeout(pintarReglas, 400);
})();
