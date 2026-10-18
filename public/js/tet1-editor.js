/* ============================================================
   tet1-editor.js — Propiedades del texto, imantado con guías y
   panel de decoración de la plantilla (fondo, degradado, franja).

   Solo para tet1.html (Noticias). Requiere que main.js ya haya
   creado el `canvas` de Fabric y la decoración (DECO), y que
   shell.js ya haya montado el dock con sus pestañas.

   Qué añade
   ----------
   1 · Panel «Texto»: tamaño, negrita, alineación e interlineado de lo que ya
       está insertado. Antes esas cosas solo se podían elegir en el formulario
       antes de insertar: una vez puesto el titular en el lienzo, la única
       manera de cambiarle el tamaño era borrarlo y volver a crearlo.
   2 · Imantado a bordes, centro y tercios del lienzo, con guía visible
       mientras se arrastra.
   3 · Panel «Plantilla»: fondo plano o degradado, opacidad de la decoración y
       visibilidad de la franja superior.
   ============================================================ */
(function () {
    'use strict';

    if (typeof canvas === 'undefined' || !canvas) return;
    if (typeof window.tetAplicarDecoracion !== 'function') return;

    var DECO = window.tetDeco;

    /* ---------- utilidades ---------- */
    function el(tag, cls, html) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (html != null) d.innerHTML = html;
        return d;
    }
    function aviso(msg, tipo) {
        if (window.mostrarAviso) window.mostrarAviso(msg, tipo);
    }
    /* Un cambio hecho desde los paneles tiene que entrar en el historial:
       sin esto el deshacer no lo deshace (y los botones se desincronizan). */
    function confirmarCambio() {
        canvas.renderAll();
        if (window.tetGuardarEstado) window.tetGuardarEstado();
    }
    /* Objetos de texto de la selección actual (uno o varios). */
    function textosSeleccionados() {
        var o = canvas.getActiveObject();
        if (!o) return [];
        var lista = (o.type === 'activeSelection') ? o.getObjects() : [o];
        return lista.filter(function (x) {
            return x && typeof x.text === 'string' &&
                (x.type === 'textbox' || x.type === 'i-text' || x.type === 'text');
        });
    }

    /* ============================================================
       1 · PANEL «TEXTO»
       ============================================================ */
    var alineaciones = [
        { v: 'left', i: 'fa-align-left', t: 'Izquierda' },
        { v: 'center', i: 'fa-align-center', t: 'Centrar' },
        { v: 'right', i: 'fa-align-right', t: 'Derecha' },
        { v: 'justify', i: 'fa-align-justify', t: 'Justificar' }
    ];

    var panelTexto = el('section', 'tet-panel', [
        '<header class="tet-panel-head">',
        '  <i class="fas fa-font" aria-hidden="true"></i><strong>Texto</strong>',
        '</header>',
        '<div class="tet-panel-body">',
        '  <div class="tet-fila">',
        '    <label class="tet-lbl" for="tet-tam">Tamaño</label>',
        '    <input type="range" class="tet-range" id="tet-tam" min="10" max="160" step="1" value="48">',
        '    <input type="number" class="tet-num" id="tet-tam-n" min="8" max="400" step="1" value="48" aria-label="Tamaño del texto en píxeles">',
        '  </div>',
        '  <div class="tet-fila">',
        '    <span class="tet-lbl">Alineación</span>',
        '    <div class="tet-seg" id="tet-alinear" role="group" aria-label="Alineación del texto"></div>',
        '    <button type="button" class="tet-toggle" id="tet-negrita" title="Negrita" aria-label="Negrita" aria-pressed="false"><i class="fas fa-bold" aria-hidden="true"></i></button>',
        '  </div>',
        '  <div class="tet-fila">',
        '    <label class="tet-lbl" for="tet-inter">Interlineado</label>',
        '    <input type="range" class="tet-range" id="tet-inter" min="0.8" max="2.4" step="0.05" value="1.16">',
        '    <output class="tet-out" id="tet-inter-n">1.16</output>',
        '  </div>',
        '  <p class="tet-pista">Doble clic en el lienzo para editar el texto. Ctrl+Z deshace.</p>',
        '</div>'
    ].join(''));

    var inTam = panelTexto.querySelector('#tet-tam');
    var inTamN = panelTexto.querySelector('#tet-tam-n');
    var inInter = panelTexto.querySelector('#tet-inter');
    var outInter = panelTexto.querySelector('#tet-inter-n');
    var btnNeg = panelTexto.querySelector('#tet-negrita');
    var segAlinear = panelTexto.querySelector('#tet-alinear');

    alineaciones.forEach(function (a) {
        var b = el('button', 'tet-seg-btn',
            '<i class="fas ' + a.i + '" aria-hidden="true"></i>');
        b.type = 'button';
        b.title = a.t;
        b.setAttribute('aria-label', a.t);
        b.dataset.align = a.v;
        segAlinear.appendChild(b);
    });

    function aplicarA(campos) {
        var ts = textosSeleccionados();
        if (!ts.length) { aviso('Selecciona un texto primero', 'warning'); return; }
        ts.forEach(function (t) {
            for (var k in campos) {
                if (campos[k] != null) t.set(k, campos[k]);
            }
            t.setCoords();
        });
        confirmarCambio();
    }

    inTam.addEventListener('input', function () { aplicarA({ fontSize: +this.value }); });
    inTamN.addEventListener('input', function () {
        var v = Math.max(8, Math.min(400, +this.value || 0));
        inTam.value = Math.min(160, v);
        aplicarA({ fontSize: v });
    });
    inInter.addEventListener('input', function () {
        var v = +this.value;
        outInter.textContent = v.toFixed(2);
        aplicarA({ lineHeight: v });
    });
    btnNeg.addEventListener('click', function () {
        var ts = textosSeleccionados();
        if (!ts.length) { aviso('Selecciona un texto primero', 'warning'); return; }
        var actual = (ts[0].fontWeight || 'normal') === 'bold';
        aplicarA({ fontWeight: actual ? 'normal' : 'bold' });
        pintarTexto();
    });
    segAlinear.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-align]');
        if (!b) return;
        aplicarA({ textAlign: b.dataset.align });
        pintarTexto();
    });

    /* Refleja el texto seleccionado en los controles. Lo expone main.js para
       que el selector de color del formulario refresque la negrita. */
    function pintarTexto() {
        var ts = textosSeleccionados();
        panelTexto.classList.toggle('is-on', ts.length > 0);
        panelTexto.hidden = !ts.length;
        if (!ts.length) return;
        var t = ts[0];
        if (document.activeElement !== inTamN) {
            inTam.value = Math.min(160, Math.max(10, Math.round(t.fontSize || 48)));
            inTamN.value = Math.round(t.fontSize || 48);
        }
        if (document.activeElement !== inInter) {
            var lh = t.lineHeight || 1.16;
            inInter.value = lh;
            outInter.textContent = (+lh).toFixed(2);
        }
        btnNeg.setAttribute('aria-pressed',
            (t.fontWeight || 'normal') === 'bold' ? 'true' : 'false');
        segAlinear.querySelectorAll('button[data-align]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.align === (t.textAlign || 'left'));
        });
    }
    window.tetRefrescarPanelTexto = pintarTexto;


    /* ============================================================
       2 · IMANTADO Y GUÍAS
       ============================================================ */
    var SNAP = { on: true, umbralPx: 7 };
    var guiCont, guiV, guiH, rejilla;

    /* Escala real a la que se ve el lienzo: la shell aplica un
       transform:scale() sobre #img. El umbral de imantado está en píxeles de
       pantalla, así que hay que pasarlo a unidades del lienzo. */
    function escalaVista() {
        var img = document.getElementById('img');
        if (!img) return 1;
        var t = window.getComputedStyle(img).transform;
        if (!t || t === 'none') return 1;
        var m = t.match(/matrix\(([^)]+)\)/);
        if (!m) return 1;
        return Math.abs(parseFloat(m[1])) || 1;
    }

    /* Desplazamiento de un nodo dentro de #img en px de maquetación (no
       escalados): mismo truco que usa formatos.js para su guía. */
    function offsetDentro(nodo, raiz) {
        var x = 0, y = 0, n = nodo;
        while (n && n !== raiz) {
            x += n.offsetLeft || 0;
            y += n.offsetTop || 0;
            n = n.offsetParent;
        }
        return { x: x, y: y };
    }

    function crearGuias() {
        var padre = document.getElementById('img');
        if (!padre) return;
        guiCont = el('div', 'tet-guias');
        guiCont.setAttribute('aria-hidden', 'true');
        /* la rejilla y las guías arrancan ocultas: los draws se muestran
           mientras se arrastra y la rejilla solo si se pide */
        rejilla = el('div', 'tet-rejilla');
        rejilla.hidden = true;
        guiV = el('div', 'tet-guia tet-guia-v');
        guiH = el('div', 'tet-guia tet-guia-h');
        guiV.style.display = 'none';
        guiH.style.display = 'none';
        guiCont.appendChild(rejilla);
        guiCont.appendChild(guiV);
        guiCont.appendChild(guiH);
        padre.appendChild(guiCont);
    }

    /* Sitúa la capa de guías encima del canvas. */
    function alinearGuias() {
        if (!guiCont || !canvas.lowerCanvasEl) return;
        var padre = document.getElementById('img');
        var el0 = canvas.lowerCanvasEl;
        var po = offsetDentro(el0, padre);
        guiCont.style.left = po.x + 'px';
        guiCont.style.top = po.y + 'px';
        guiCont.style.width = el0.offsetWidth + 'px';
        guiCont.style.height = el0.offsetHeight + 'px';
    }

    function ocultarGuias() {
        if (!guiCont) return;
        guiV.style.display = 'none';
        guiH.style.display = 'none';
    }

    function pintarGuiaV(xLienzo) {
        if (!guiCont) return;
        var ex = canvas.lowerCanvasEl.offsetWidth / canvas.getWidth();
        guiV.style.display = 'block';
        guiV.style.left = (xLienzo * ex) + 'px';
    }
    function pintarGuiaH(yLienzo) {
        if (!guiCont) return;
        var ey = canvas.lowerCanvasEl.offsetHeight / canvas.getHeight();
        guiH.style.display = 'block';
        guiH.style.top = (yLienzo * ey) + 'px';
    }

    /* Candidatos de empuje: bordes y centro del lienzo, tercios, y los
       bordes/centros del resto de capas.
       `excepto` es el objeto que se está moviendo y hay que EXCLUIR: si se
       incluye, su propio borde queda a distancia 0 de sí mismo y siempre gana
       el ajuste, así que el objeto nunca se movía de verdad (el imantado
       quedaba muerto salvo para mover una capa hasta otra). */
    function objetivosX(excepto) {
        var W = canvas.getWidth();
        var v = [0, W / 2, W];
        if (rejilla && !rejilla.hidden) {
            v.push(W / 3, (W * 2) / 3);
        }
        canvas.getObjects().forEach(function (o) {
            if (o === excepto || !o.visible || o.excludeFromExport) return;
            var r = o.getBoundingRect();
            v.push(r.left, r.left + r.width / 2, r.left + r.width);
        });
        return v;
    }
    function objetivosY(excepto) {
        var H = canvas.getHeight();
        var v = [0, H / 2, H];
        if (rejilla && !rejilla.hidden) {
            v.push(H / 3, (H * 2) / 3);
        }
        canvas.getObjects().forEach(function (o) {
            if (o === excepto || !o.visible || o.excludeFromExport) return;
            var r = o.getBoundingRect();
            v.push(r.top, r.top + r.height / 2, r.top + r.height);
        });
        return v;
    }

    /* Busca el ajuste más cercano por eje y devuelve el desplazamiento. */
    function mejorAjuste(mios, objetivos, umbral) {
        var mejor = null;
        for (var i = 0; i < mios.length; i++) {
            for (var j = 0; j < objetivos.length; j++) {
                var d = objetivos[j] - mios[i];
                if (Math.abs(d) <= umbral && (!mejor || Math.abs(d) < Math.abs(mejor.d))) {
                    mejor = { d: d, guia: objetivos[j] };
                }
            }
        }
        return mejor;
    }

    canvas.on('object:moving', function (e) {
        if (!SNAP.on || window.tetModoRecorte) return;
        var obj = e.target;
        if (!obj || obj.excludeFromExport) return;
        /* con selección múltiple manda el conjunto */
        if (obj.type === 'activeSelection') {
            obj = obj.getObjects().filter(function (o) { return !o.excludeFromExport; })[0];
            if (!obj) return;
        }

        /* OJO: getBoundingRect() devuelve las aCoords que Fabric tiene en
           caché, y durante el arrastre van un paso por detrás (solo se
           recalculan al soltar). Medir así daba la posición anterior y el
           ajuste no se veía nunca. setCoords() las refresca antes de medir. */
        obj.setCoords();
        var r = obj.getBoundingRect();
        var umbral = SNAP.umbralPx / escalaVista();
        var W = canvas.getWidth(), H = canvas.getHeight();

        var dx = 0, dy = 0, gx = null, gy = null;

        if (!obj.lockMovementX) {
            var ax = mejorAjuste(
                [r.left, r.left + r.width / 2, r.left + r.width], objetivosX(obj), umbral);
            if (ax) { dx = ax.d; gx = ax.guia; }
        }
        if (!obj.lockMovementY) {
            var ay = mejorAjuste(
                [r.top, r.top + r.height / 2, r.top + r.height], objetivosY(obj), umbral);
            if (ay) { dy = ay.d; gy = ay.guia; }
        }

        if (dx || dy) {
            /* se mueve por el centro, que ya descuenta la rotación: con
               left/top el ajuste se desviaba en los objetos girados */
            var c = obj.getCenterPoint();
            obj.setPositionByOrigin(new fabric.Point(c.x + dx, c.y + dy), 'center', 'center');
            obj.setCoords();
            canvas.requestRenderAll();
            if (gx != null) pintarGuiaV(gx);
            else guiV.style.display = 'none';
            if (gy != null) pintarGuiaH(gy);
            else guiH.style.display = 'none';
        } else {
            ocultarGuias();
        }
        alinearGuias();
    });

    ['object:modified', 'selection:created', 'selection:updated', 'selection:cleared',
        'object:removed', 'text:changed'].forEach(function (ev) {
            canvas.on(ev, function () { ocultarGuias(); alinearGuias(); });
        });

    window.addEventListener('resize', function () { alinearGuias(); ocultarGuias(); });

    crearGuias();
    alinearGuias();
    /* shell.js lo llama tras cambiar el tamaño del lienzo («Lienzo en
       blanco»): la capa de guías tiene que volver a encajar en el lienzo nuevo */
    window.tetAjustarGuias = function () { alinearGuias(); };


    /* ============================================================
       3 · PANEL «PLANTILLA» (fondo, degradado, franja)
       ============================================================ */
    var panelTpl = el('section', 'tet-panel tet-panel-fija', [
        '<header class="tet-panel-head">',
        '  <i class="fas fa-palette" aria-hidden="true"></i><strong>Plantilla</strong>',
        '</header>',
        '<div class="tet-panel-body">',
        '  <div class="tet-seg tet-seg-ancho" id="tet-tipo-fondo" role="group" aria-label="Tipo de fondo">',
        '    <button type="button" class="tet-seg-btn is-on" data-fondo="solido" title="Color plano">Plano</button>',
        '    <button type="button" class="tet-seg-btn" data-fondo="degradado" title="Degradado"><i class="fas fa-fill-drip" aria-hidden="true"></i> Degradado</button>',
        '  </div>',
        '  <div class="tet-fila tet-colores" id="tet-fila-degradado" hidden>',
        '    <label class="tet-lbl" for="tet-color2">Color 2</label>',
        '    <input type="color" id="tet-color2" class="tet-color" value="#1d3f7a" aria-label="Segundo color del degradado">',
        '  </div>',
        '  <div class="tet-fila" id="tet-fila-angulo" hidden>',
        '    <label class="tet-lbl" for="tet-angulo">Ángulo</label>',
        '    <input type="range" class="tet-range" id="tet-angulo" min="0" max="360" step="5" value="150">',
        '    <output class="tet-out" id="tet-angulo-n">150°</output>',
        '  </div>',
        '  <div class="tet-fila">',
        '    <label class="tet-lbl" for="tet-opacidad">Opacidad</label>',
        '    <input type="range" class="tet-range" id="tet-opacidad" min="10" max="100" step="1" value="100">',
        '    <output class="tet-out" id="tet-opacidad-n">100%</output>',
        '  </div>',
        '  <div class="tet-fila tet-checks">',
        '    <label class="tet-check"><input type="checkbox" id="tet-barra" checked> <span>Franja superior</span></label>',
        '    <label class="tet-check"><input type="checkbox" id="tet-snap" checked> <span>Imantar</span></label>',
        '    <label class="tet-check"><input type="checkbox" id="tet-tercios"> <span>Tercios</span></label>',
        '  </div>',
        '</div>'
    ].join(''));

    var segFondo = panelTpl.querySelector('#tet-tipo-fondo');
    var inColor2 = panelTpl.querySelector('#tet-color2');
    var inAngulo = panelTpl.querySelector('#tet-angulo');
    var outAngulo = panelTpl.querySelector('#tet-angulo-n');
    var inOpacidad = panelTpl.querySelector('#tet-opacidad');
    var outOpacidad = panelTpl.querySelector('#tet-opacidad-n');
    /* La franja superior mantiene su opacidad; el deslizador solo afecta al
       fondo si se activa esta opción. */
    var chkOpacidad = el('input', 'form-check-input');
    chkOpacidad.type = 'checkbox';
    chkOpacidad.id = 'tet-opacidad-fondo';
    chkOpacidad.setAttribute('aria-label', 'Aplicar opacidad también al fondo');
    if (inOpacidad && inOpacidad.parentElement) {
        var lbl = inOpacidad.parentElement.querySelector('label[for="tet-opacidad"]');
        if (lbl) lbl.after(chkOpacidad);
        else inOpacidad.parentElement.insertBefore(chkOpacidad, inOpacidad);
    }
    chkOpacidad.addEventListener('change', function () {
        DECO.opacidadFondo = chkOpacidad.checked;
        pintarDecoracion();
    });
    var chkBarra = panelTpl.querySelector('#tet-barra');
    var chkSnap = panelTpl.querySelector('#tet-snap');
    var chkTercios = panelTpl.querySelector('#tet-tercios');
    var filaColor2 = panelTpl.querySelector('#tet-fila-degradado');
    var filaAngulo = panelTpl.querySelector('#tet-fila-angulo');

    function refrescarPanelTpl() {
        segFondo.querySelectorAll('button[data-fondo]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.fondo === DECO.tipoFondo);
        });
        var esGrad = DECO.tipoFondo === 'degradado';
        filaColor2.hidden = !esGrad;
        filaAngulo.hidden = !esGrad;
        inAngulo.value = DECO.angulo;
        outAngulo.textContent = Math.round(DECO.angulo) + '°';
        inOpacidad.value = Math.round(DECO.opacidad * 100);
        outOpacidad.textContent = Math.round(DECO.opacidad * 100) + '%';
        var chkOpFondo = document.getElementById('tet-opacidad-fondo');
        if (chkOpFondo) chkOpFondo.checked = !!DECO.opacidadFondo;
        inColor2.value = DECO.color2;
        chkBarra.checked = !!DECO.conBarra;
    }

    /* Cada ajuste repinta la decoración; el historial se guarda una vez al
       soltar, no en cada pixel del deslizador. */
    var temporizadorGuardado = null;
    function guardarDecoracion() {
        if (temporizadorGuardado) clearTimeout(temporizadorGuardado);
        temporizadorGuardado = setTimeout(function () {
            temporizadorGuardado = null;
            if (window.tetGuardarEstado) window.tetGuardarEstado();
        }, 350);
    }
    function pintarDecoracion() {
        window.tetAplicarDecoracion();
        guardarDecoracion();
    }

    segFondo.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-fondo]');
        if (!b) return;
        DECO.tipoFondo = b.dataset.fondo;
        if (DECO.tipoFondo === 'degradado') {
            /* el color plano pasa a ser el primer color del degradado, para
               que no cambie el aspecto al pasar de uno a otro */
            var inp = document.getElementById('color');
            if (inp) DECO.color1 = inp.value;
        }
        refrescarPanelTpl();
        pintarDecoracion();
    });

    inColor2.addEventListener('input', function () {
        DECO.color2 = this.value;
        if (DECO.tipoFondo === 'degradado') pintarDecoracion();
    });
    inAngulo.addEventListener('input', function () {
        DECO.angulo = +this.value;
        outAngulo.textContent = Math.round(DECO.angulo) + '°';
        if (DECO.tipoFondo === 'degradado') pintarDecoracion();
    });
    inOpacidad.addEventListener('input', function () {
        DECO.opacidad = (+this.value) / 100;
        outOpacidad.textContent = this.value + '%';
        pintarDecoracion();
    });
    chkBarra.addEventListener('change', function () {
        DECO.conBarra = this.checked;
        pintarDecoracion();
    });
    chkSnap.addEventListener('change', function () {
        SNAP.on = this.checked;
        if (!SNAP.on) ocultarGuias();
    });
    chkTercios.addEventListener('change', function () {
        if (rejilla) rejilla.hidden = !this.checked;
        if (!this.checked) ocultarGuias();
    });


    /* ============================================================
       4 · MONTAJE EN EL DOCK
       ============================================================ */

    /* Al elegir un formato, el lienzo se adapta a ese tamaño en vez de
       recortar un lienzo cuadrado: si no, al pasar a un 1080 × 1350 el
       recorte se comía 240 px a cada lado —justo donde está «somostet.com»—
       y la franja salía cortada. El contenido se conserva; el titular y el
       detalle vuelven a su zona (main.js). El enlace al historial y el aviso
       dejan volver atrás con Ctrl+Z o eligiendo «Tamaño original». */
    (function conectarFormato() {
        var sel = document.getElementById('formato-salida');
        if (!sel || typeof window.tetAdaptarAlFormato !== 'function') return;
        var adaptando = false;
        sel.addEventListener('change', function () {
            if (adaptando) return;
            adaptando = true;
            try { window.tetAdaptarAlFormato(); }
            finally { adaptando = false; }
        });
    })();

    var paneProps = document.querySelector('.dock-pane[data-pane="props"]');
    if (!paneProps) return;
    var panelBase = paneProps.querySelector('.editor-panel');
    if (panelBase) {
        paneProps.insertBefore(panelTexto, panelBase);
        paneProps.insertBefore(panelTpl, panelBase);
    } else {
        paneProps.appendChild(panelTexto);
        paneProps.appendChild(panelTpl);
    }

    panelTexto.hidden = true;
    ['selection:created', 'selection:updated', 'selection:cleared',
        'object:modified', 'object:removed', 'text:changed'].forEach(function (ev) {
            canvas.on(ev, pintarTexto);
        });
    pintarTexto();
    refrescarPanelTpl();

    /* El fondo con degradado no es un color plano: formatos.js elegía el
       color del lienzo para pintar de opaco el lienzo de exportación y, al
       toparse con un Gradient, caía siempre en blanco. Se le da un color
       representativo. */
    window.tetColorFondoPlano = function () {
        if (DECO.tipoFondo === 'degradado') return DECO.color1;
        return colorFondo();
    };

    aviso('Panel de texto, imantado y degradado listos', 'info');
})();
