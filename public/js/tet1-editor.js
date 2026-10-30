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
        actualizarFondosTexto();
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
        '    <button type="button" class="tet-toggle" id="tet-italica" title="Cursiva" aria-label="Cursiva" aria-pressed="false"><i class="fas fa-italic" aria-hidden="true"></i></button>',
        '    <button type="button" class="tet-toggle" id="tet-autocentro" title="Mantener el texto centrado (se puede quitar)" aria-label="Centrado automático" aria-pressed="false"><i class="fas fa-arrows-alt-h" aria-hidden="true"></i></button>',
        '  </div>',
        '  <div class="tet-fila">',
        '    <label class="tet-lbl" for="tet-inter">Interlineado</label>',
        '    <input type="range" class="tet-range" id="tet-inter" min="0.8" max="2.4" step="0.05" value="1.16">',
        '    <output class="tet-out" id="tet-inter-n">1.16</output>',
        '  </div>',
        '  <div class="tet-fila">',
        '    <span class="tet-lbl">Fondo</span>',
        '    <div class="tet-seg tet-seg-ancho" id="tet-fondo-texto" role="group" aria-label="Fondo del texto">',
        '      <button type="button" class="tet-seg-btn is-on" data-fondo-texto="ninguno" title="Sin fondo">Ninguno</button>',
        '      <button type="button" class="tet-seg-btn" data-fondo-texto="cuadro" title="Cuadro rectangular">Cuadro</button>',
        '      <button type="button" class="tet-seg-btn" data-fondo-texto="redondeado" title="Cuadro con esquinas redondeadas">Redondeado</button>',
        '      <button type="button" class="tet-seg-btn" data-fondo-texto="pildora" title="Forma de píldora">Píldora</button>',
        '    </div>',
        '  </div>',
        '  <div class="tet-fila" id="tet-fila-fondo-texto" hidden>',
        '    <label class="tet-color-parada" for="tet-fondo-color"><span>Color</span>',
        '      <input type="color" id="tet-fondo-color" class="tet-color" value="#ffd43b" aria-label="Color del fondo del texto">',
        '    </label>',
        '    <label class="tet-lbl" for="tet-fondo-opacidad">Opacidad</label>',
        '    <input type="range" class="tet-range" id="tet-fondo-opacidad" min="20" max="100" step="5" value="100">',
        '    <output class="tet-out" id="tet-fondo-opacidad-n">100%</output>',
        '  </div>',
        '  <p class="tet-pista">Doble clic en el lienzo para editar el texto. El botón de centrado mantiene el texto en el medio y se puede quitar. Ctrl+Z deshace.</p>',
        '</div>'
    ].join(''));

    var inTam = panelTexto.querySelector('#tet-tam');
    var inTamN = panelTexto.querySelector('#tet-tam-n');
    var inInter = panelTexto.querySelector('#tet-inter');
    var outInter = panelTexto.querySelector('#tet-inter-n');
    var btnNeg = panelTexto.querySelector('#tet-negrita');
    var btnItalica = panelTexto.querySelector('#tet-italica');
    var btnAutoCentro = panelTexto.querySelector('#tet-autocentro');
    var segAlinear = panelTexto.querySelector('#tet-alinear');
    var segFondoTexto = panelTexto.querySelector('#tet-fondo-texto');
    var filaFondoTexto = panelTexto.querySelector('#tet-fila-fondo-texto');
    var inFondoColor = panelTexto.querySelector('#tet-fondo-color');
    var inFondoOpacidad = panelTexto.querySelector('#tet-fondo-opacidad');
    var outFondoOpacidad = panelTexto.querySelector('#tet-fondo-opacidad-n');

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

    /* ---------- cuadro / rectángulo / píldora detrás del texto ----------
       Se usa un rectángulo aparte (no `backgroundColor` de Fabric) porque así
       se pueden redondear las esquinas y cambiar la forma sin tocar el texto.
       El rectángulo va justo debajo del texto y se actualiza cuando el texto
       se mueve, se escala o se edita. */
    function idDeTexto(t) {
        if (!t.tetId) {
            t.tetId = 'txt-' + Date.now().toString(36) + '-' +
                Math.random().toString(36).slice(2, 7);
        }
        return t.tetId;
    }

    function geometriaFondo(t) {
        var r = t.getBoundingRect();
        var pad = Math.max(6, Math.round((t.fontSize || 48) * 0.34));
        return {
            left: r.left - pad,
            top: r.top - pad,
            width: Math.max(1, r.width + pad * 2),
            height: Math.max(1, r.height + pad * 2)
        };
    }

    function radioFondo(forma, alto) {
        if (forma === 'pildora') return alto / 2;
        if (forma === 'redondeado') return Math.min(28, alto * 0.22);
        return 0;
    }

    function pintarFondoTexto(t) {
        if (!t || !t._tetFondo) return;
        var rect = t._tetFondo;
        var g = geometriaFondo(t);
        var radio = radioFondo(rect.tetFondoForma, g.height);
        rect.set({
            left: g.left,
            top: g.top,
            width: g.width,
            height: g.height,
            rx: radio,
            ry: radio
        });
        rect.setCoords();
    }

    /* Vuelve a enlazar los cuadros con sus textos después de deshacer, rehacer
       o abrir un proyecto: la referencia directa no viaja en el JSON. */
    window.tetVincularFondosTexto = function () {
        var porId = {};
        canvas.getObjects().forEach(function (o) {
            if (o.tetId) porId[o.tetId] = o;
        });
        canvas.getObjects().forEach(function (o) {
            if (!o.tetFondoTexto) return;
            var t = o.tetFondoDe ? porId[o.tetFondoDe] : null;
            o._tetTexto = t || null;
            if (t) t._tetFondo = o;
        });
    };

    /* Deja cada cuadro justo debajo de su texto. Al recomponer, la foto se
       vuelve a añadir al final de la pila y podía quedar por delante del
       cuadro, ocultándolo. */
    window.tetReordenarFondosTexto = function () {
        var objs = canvas.getObjects();
        objs.forEach(function (t) {
            if (!t._tetFondo || !t._tetFondo.canvas) return;
            var idx = canvas.getObjects().indexOf(t);
            if (idx < 0) return;
            canvas.moveTo(t._tetFondo, Math.max(0, idx - 1));
        });
    };

    function quitarFondoTexto(t) {
        if (!t || !t._tetFondo) return;
        var rect = t._tetFondo;
        t._tetFondo = null;
        if (rect) {
            /* la sombra del cuadro pasa al texto para no perderla */
            if (rect.shadow) copiarSombra(rect, t);
            rect._tetTexto = null;
            if (rect.canvas) canvas.remove(rect);
        }
    }

    function aplicarFondoTexto(forma) {
        var ts = textosSeleccionados();
        if (!ts.length) { aviso('Selecciona un texto primero', 'warning'); return; }
        var color = inFondoColor.value || '#ffd43b';
        var opacidad = Math.max(0.2, Math.min(1, (+inFondoOpacidad.value || 100) / 100));

        ts.forEach(function (t) {
            if (forma === 'ninguno') {
                quitarFondoTexto(t);
                return;
            }
            idDeTexto(t);
            var rect = t._tetFondo;
            if (!rect || !rect.canvas) {
                rect = new fabric.Rect({
                    fill: color,
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockRotation: true,
                    name: 'Fondo de texto',
                    tetFondoTexto: true,
                    tetFondoDe: t.tetId,
                    tetFondoForma: forma
                });
                t._tetFondo = rect;
                rect._tetTexto = t;
                /* si el texto ya tenía sombra, ahora la lleva el cuadro */
                if (t.shadow) {
                    copiarSombra(t, rect);
                    t.set('shadow', null);
                    t.tetSombraColor = null;
                    t.tetSombraOpacidad = null;
                    t.tetSombraBlur = null;
                    t.tetSombraX = null;
                    t.tetSombraY = null;
                }
                var idx = canvas.getObjects().indexOf(t);
                if (idx >= 0) canvas.insertAt(rect, idx);
                else canvas.add(rect);
            }
            rect._tetTexto = t;
            rect.set({
                fill: color,
                opacity: opacidad,
                tetFondoForma: forma,
                tetFondoDe: t.tetId
            });
            pintarFondoTexto(t);
        });
        confirmarCambio();
        pintarTexto();
    }

    function actualizarFondosTexto() {
        canvas.getObjects().forEach(function (o) {
            if (o._tetTexto && o.tetFondoTexto) pintarFondoTexto(o._tetTexto);
        });
    }
    window.tetActualizarFondosTexto = actualizarFondosTexto;

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
    btnItalica.addEventListener('click', function () {
        var ts = textosSeleccionados();
        if (!ts.length) { aviso('Selecciona un texto primero', 'warning'); return; }
        var actual = (ts[0].fontStyle || 'normal') === 'italic';
        aplicarA({ fontStyle: actual ? 'normal' : 'italic' });
        pintarTexto();
    });
    btnAutoCentro.addEventListener('click', function () {
        var ts = textosSeleccionados();
        if (!ts.length) { aviso('Selecciona un texto primero', 'warning'); return; }
        /* si alguno está suelto, el botón activa el centrado en todos */
        var activar = !ts.every(function (t) { return t.tetAutoCentro; });
        ts.forEach(function (t) {
            t.tetAutoCentro = activar;
            if (activar) {
                t.centerH();
                t.setCoords();
            }
        });
        pintarTexto();
        confirmarCambio();
        aviso(activar ? 'Centrado automático activado' : 'Centrado automático desactivado', 'info');
    });
    segAlinear.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-align]');
        if (!b) return;
        aplicarA({ textAlign: b.dataset.align });
        pintarTexto();
    });

    segFondoTexto.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-fondo-texto]');
        if (!b) return;
        aplicarFondoTexto(b.dataset.fondoTexto);
    });
    inFondoColor.addEventListener('input', function () {
        var ts = textosSeleccionados();
        if (!ts.length) return;
        ts.forEach(function (t) {
            if (t._tetFondo) {
                t._tetFondo.set('fill', this.value);
                pintarFondoTexto(t);
            }
        }, this);
        confirmarCambio();
    });
    inFondoOpacidad.addEventListener('input', function () {
        var v = Math.max(0.2, Math.min(1, (+this.value || 100) / 100));
        outFondoOpacidad.textContent = this.value + '%';
        var ts = textosSeleccionados();
        if (!ts.length) return;
        ts.forEach(function (t) {
            if (t._tetFondo) t._tetFondo.set('opacity', v);
        });
        confirmarCambio();
    });

    /* El cuadro tiene que seguir al texto cuando se mueve, se escala o se
       edita. Durante el arrastre se pinta en cada frame; al soltar se guarda
       el historial una sola vez. */
    ['object:moving', 'object:scaling'].forEach(function (ev) {
        canvas.on(ev, function () {
            actualizarFondosTexto();
            canvas.requestRenderAll();
        });
    });
    ['object:modified', 'text:changed', 'selection:updated'].forEach(function (ev) {
        canvas.on(ev, function () {
            actualizarFondosTexto();
            canvas.requestRenderAll();
        });
    });
    canvas.on('object:removed', function (e) {
        var o = e && e.target;
        if (!o) return;
        if (o.tetFondoTexto && o._tetTexto && o._tetTexto._tetFondo === o) {
            o._tetTexto._tetFondo = null;
        }
        if (typeof o.text === 'string' && o._tetFondo) {
            var rect = o._tetFondo;
            o._tetFondo = null;
            if (rect && rect.canvas) canvas.remove(rect);
        }
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
        btnItalica.setAttribute('aria-pressed',
            (t.fontStyle || 'normal') === 'italic' ? 'true' : 'false');
        btnAutoCentro.setAttribute('aria-pressed',
            t.tetAutoCentro ? 'true' : 'false');
        btnAutoCentro.classList.toggle('is-on', !!t.tetAutoCentro);
        segAlinear.querySelectorAll('button[data-align]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.align === (t.textAlign || 'left'));
        });
        var forma = t._tetFondo ? (t._tetFondo.tetFondoForma || 'cuadro') : 'ninguno';
        segFondoTexto.querySelectorAll('button[data-fondo-texto]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.fondoTexto === forma);
        });
        filaFondoTexto.hidden = forma === 'ninguno';
        if (t._tetFondo) {
            if (typeof t._tetFondo.fill === 'string') inFondoColor.value = t._tetFondo.fill;
            var op = Math.round((t._tetFondo.opacity == null ? 1 : t._tetFondo.opacity) * 100);
            inFondoOpacidad.value = op;
            outFondoOpacidad.textContent = op + '%';
        }
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
        '    <label class="tet-color-parada" for="tet-color1"><span>Inicio</span>',
        '      <input type="color" id="tet-color1" class="tet-color" value="#ffffff" aria-label="Color inicial del degradado">',
        '    </label>',
        '    <label class="tet-color-parada" for="tet-color2"><span>Final</span>',
        '      <input type="color" id="tet-color2" class="tet-color" value="#1d3f7a" aria-label="Color final del degradado">',
        '    </label>',
        '  </div>',
        '  <div class="tet-presets" id="tet-presets" role="group" aria-label="Degradados rápidos">',
        '    <button type="button" class="tet-seg-btn" data-preset="invertir" title="Invertir los dos colores del degradado">Invertir</button>',
        '    <button type="button" class="tet-seg-btn" data-preset="oscurecer" title="Oscurecer los dos colores">Oscurecer</button>',
        '    <button type="button" class="tet-seg-btn" data-preset="aclarar" title="Aclarar los dos colores">Aclarar</button>',
        '    <button type="button" class="tet-seg-btn" data-preset="azul" title="Degradado azul noche">Azul noche</button>',
        '    <button type="button" class="tet-seg-btn" data-preset="rojo" title="Degradado rojo">Rojo</button>',
        '    <button type="button" class="tet-seg-btn" data-preset="verde" title="Degradado verde">Verde</button>',
        '  </div>',
        '  <div class="tet-gradient-preview" id="tet-gradient-preview" role="img" aria-label="Vista previa del degradado"></div>',
        '  <button type="button" class="tet-sugerir" id="tet-sugerir" title="Analiza la foto del lienzo y propone un degradado que combine con sus colores">',
        '    <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> Sugerir según la foto',
        '  </button>',
        '  <label class="tet-check tet-auto-deg" for="tet-auto-deg" title="Al insertar, componer o pegar una foto, el fondo se adapta a sus colores">',
        '    <input type="checkbox" id="tet-auto-deg"> <span>Automático al colocar la foto</span>',
        '  </label>',
        '  <label class="tet-check tet-auto-deg" for="tet-texto-auto" title="Si el fondo es oscuro el texto pasa a blanco y si es claro pasa a negro">',
        '    <input type="checkbox" id="tet-texto-auto" checked> <span>Texto automático (contraste)</span>',
        '  </label>',
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
    var inColor1 = panelTpl.querySelector('#tet-color1');
    var inColor2 = panelTpl.querySelector('#tet-color2');
    var previewDegradado = panelTpl.querySelector('#tet-gradient-preview');
    var btnSugerir = panelTpl.querySelector('#tet-sugerir');
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
    var segPresets = panelTpl.querySelector('#tet-presets');
    var chkTextoAuto = panelTpl.querySelector('#tet-texto-auto');

    function refrescarPanelTpl() {
        segFondo.querySelectorAll('button[data-fondo]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.fondo === DECO.tipoFondo);
        });
        var esGrad = DECO.tipoFondo === 'degradado';
        filaColor2.hidden = !esGrad;
        filaAngulo.hidden = !esGrad;
        inAngulo.value = DECO.angulo;
        outAngulo.textContent = Math.round(DECO.angulo) + '°';
        inColor1.value = DECO.color1;
        inOpacidad.value = Math.round(DECO.opacidad * 100);
        outOpacidad.textContent = Math.round(DECO.opacidad * 100) + '%';
        var chkOpFondo = document.getElementById('tet-opacidad-fondo');
        if (chkOpFondo) chkOpFondo.checked = !!DECO.opacidadFondo;
        inColor2.value = DECO.color2;
        chkBarra.checked = !!DECO.conBarra;
        if (chkTextoAuto) chkTextoAuto.checked = DECO.textoAuto !== false;
        /* el ángulo de Fabric va de izquierda a derecha con 0; el de CSS
           (linear-gradient) empieza arriba y gira en el sentido del reloj:
           90° de diferencia. Sin esto la vista previa no coincidía con el
           degradado real del lienzo. */
        previewDegradado.style.background =
            'linear-gradient(' + (DECO.angulo + 90) + 'deg, ' + DECO.color1 + ', ' + DECO.color2 + ')';
        previewDegradado.hidden = !esGrad;
    }

    btnSugerir.addEventListener('click', function () {
        if (window.tetSugerirDegradado) window.tetSugerirDegradado();
    });

    /* La opción se recuerda entre sesiones; el estado real lo lee main.js antes
       de cada inserción (window.tetSugerirDegradadoAuto). */
    var chkAutoDeg = panelTpl.querySelector('#tet-auto-deg');
    if (chkAutoDeg) {
        chkAutoDeg.checked = !!(window.tetAutoDegradadoActivo && window.tetAutoDegradadoActivo());
        chkAutoDeg.addEventListener('change', function () {
            try {
                localStorage.setItem('tet-auto-degradado', chkAutoDeg.checked ? '1' : '0');
            } catch (e) { /* modo privado sin almacenamiento: solo dura la sesión */ }
            if (window.mostrarAviso) {
                window.mostrarAviso(chkAutoDeg.checked
                    ? 'Degradado automático activado: se aplicará al colocar una foto'
                    : 'Degradado automático desactivado', 'info');
            }
        });
    }
    document.addEventListener('tet:degradado-sugerido', function () {
        refrescarPanelTpl();
    });
    /* deshacer o abrir un proyecto puede devolver otro fondo: el panel
       refleja los colores restaurados */
    document.addEventListener('tet:deco-restaurada', function () {
        refrescarPanelTpl();
    });

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

    /* Presets rápidos de degradado: invertir, oscurecer, aclarar y tres
       paletas oscuras. Así no hay que empezar siempre desde el blanco. */
    function ajustarLuz(hex, delta) {
        var c = (hex || '#ffffff').replace('#', '');
        if (c.length === 3) c = c.charAt(0) + c.charAt(0) + c.charAt(1) +
            c.charAt(1) + c.charAt(2) + c.charAt(2);
        if (c.length !== 6) return hex;
        var r = parseInt(c.slice(0, 2), 16);
        var g = parseInt(c.slice(2, 4), 16);
        var b = parseInt(c.slice(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
        var hsl = _rgbAHsl(r, g, b);
        return _hslAHex(hsl.h, hsl.s, Math.max(0.04, Math.min(0.96, hsl.l + delta)));
    }

    var PRESETS_DEG = {
        invertir: function () {
            var a = DECO.color1;
            DECO.color1 = DECO.color2;
            DECO.color2 = a;
        },
        oscurecer: function () {
            DECO.color1 = ajustarLuz(DECO.color1, -0.18);
            DECO.color2 = ajustarLuz(DECO.color2, -0.18);
        },
        aclarar: function () {
            DECO.color1 = ajustarLuz(DECO.color1, 0.16);
            DECO.color2 = ajustarLuz(DECO.color2, 0.16);
        },
        azul: function () {
            DECO.color1 = '#061a3a';
            DECO.color2 = '#0d6efd';
            DECO.angulo = 135;
        },
        rojo: function () {
            DECO.color1 = '#3a0606';
            DECO.color2 = '#dc3545';
            DECO.angulo = 135;
        },
        verde: function () {
            DECO.color1 = '#062a1a';
            DECO.color2 = '#198754';
            DECO.angulo = 135;
        }
    };

    if (segPresets) {
        segPresets.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-preset]');
            if (!b) return;
            var fn = PRESETS_DEG[b.dataset.preset];
            if (!fn) return;
            DECO.tipoFondo = 'degradado';
            fn();
            var selectorFondo = document.getElementById('color');
            if (selectorFondo) selectorFondo.value = DECO.color1;
            refrescarPanelTpl();
            pintarDecoracion();
            if (window.tetAutoColorTexto) window.tetAutoColorTexto();
            aviso('Degradado «' + b.textContent + '» aplicado', 'info');
        });
    }

    if (chkTextoAuto) {
        chkTextoAuto.addEventListener('change', function () {
            DECO.textoAuto = this.checked;
            if (this.checked && window.tetAutoColorTexto) {
                window.tetAutoColorTexto(true);
            }
        });
    }

    inColor1.addEventListener('input', function () {
        DECO.color1 = this.value;
        var selectorFondo = document.getElementById('color');
        if (selectorFondo) selectorFondo.value = this.value;
        refrescarPanelTpl();
        if (DECO.tipoFondo === 'degradado') pintarDecoracion();
    });
    inColor2.addEventListener('input', function () {
        DECO.color2 = this.value;
        refrescarPanelTpl();
        if (DECO.tipoFondo === 'degradado') pintarDecoracion();
    });
    inAngulo.addEventListener('input', function () {
        DECO.angulo = +this.value;
        outAngulo.textContent = Math.round(DECO.angulo) + '°';
        refrescarPanelTpl();
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
       3b · PANEL «IMAGEN» (blanco y negro · ajuste · bordes laterales)
       ============================================================ */
    var panelImagen = el('section', 'tet-panel', [
        '<header class="tet-panel-head">',
        '  <i class="fas fa-image" aria-hidden="true"></i><strong>Imagen</strong>',
        '</header>',
        '<div class="tet-panel-body">',
        '  <div class="tet-seg tet-seg-ancho" id="tet-ajuste-img" role="group" aria-label="Ajuste de la imagen">',
        '    <button type="button" class="tet-seg-btn is-on" data-ajuste="auto" title="Rellena el hueco: la foto empieza en la franja y no deja marcos">Auto</button>',
        '    <button type="button" class="tet-seg-btn" data-ajuste="cover" title="Rellena todo el hueco recortando la foto">Rellenar</button>',
        '    <button type="button" class="tet-seg-btn" data-ajuste="contain" title="Muestra la foto entera, sin recortarla">Entera</button>',
        '  </div>',
        '  <div class="tet-fila tet-checks">',
        '    <label class="tet-check"><input type="checkbox" id="tet-img-bn"> <span>Blanco y negro</span></label>',
        '    <label class="tet-check"><input type="checkbox" id="tet-img-lateral"> <span>Relleno lateral</span></label>',
        '  </div>',
        '  <div class="tet-fila tet-colores" id="tet-fila-lateral" hidden>',
        '    <label class="tet-color-parada" for="tet-lateral-color1"><span>Lado</span>',
        '      <input type="color" id="tet-lateral-color1" class="tet-color" value="#1d3f7a" aria-label="Color lateral inicial">',
        '    </label>',
        '    <label class="tet-color-parada" for="tet-lateral-color2"><span>Centro</span>',
        '      <input type="color" id="tet-lateral-color2" class="tet-color" value="#0b1020" aria-label="Color lateral final">',
        '    </label>',
        '  </div>',
        '  <label class="tet-check tet-auto-deg" for="tet-lateral-deg" title="Los laterales usan un degradado entre los dos colores">',
        '    <input type="checkbox" id="tet-lateral-deg" checked> <span>Laterales en degradado</span>',
        '  </label>',
        '  <p class="tet-pista">El relleno lateral ocupa el hueco de la foto: útil cuando la imagen es pequeña o muy vertical.</p>',
        '</div>'
    ].join(''));

    var segAjusteImg = panelImagen.querySelector('#tet-ajuste-img');
    var chkImgBN = panelImagen.querySelector('#tet-img-bn');
    var chkImgLateral = panelImagen.querySelector('#tet-img-lateral');
    var filaLateral = panelImagen.querySelector('#tet-fila-lateral');
    var inLateral1 = panelImagen.querySelector('#tet-lateral-color1');
    var inLateral2 = panelImagen.querySelector('#tet-lateral-color2');
    var chkLateralDeg = panelImagen.querySelector('#tet-lateral-deg');

    function refrescarPanelImagen() {
        segAjusteImg.querySelectorAll('button[data-ajuste]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.ajuste === (DECO.ajusteImagen || 'auto'));
        });
        chkImgBN.checked = !!DECO.imagenBN;
        chkImgLateral.checked = !!DECO.lateralActivo;
        filaLateral.hidden = !DECO.lateralActivo;
        inLateral1.value = DECO.lateralColor1;
        inLateral2.value = DECO.lateralColor2;
        chkLateralDeg.checked = !!DECO.lateralDegradado;
    }

    function imagenAutoActual() {
        return typeof imagenParaAuto === 'function' ? imagenParaAuto() : null;
    }

    function reencajarAuto() {
        var img = imagenAutoActual();
        if (!img) return false;
        var layout = layoutAuto(img, true);
        if (layout.hueco) encajarImagen(img, layout.hueco);
        aplicarLateralAuto(img, layout.hueco);
        if (window.tetActualizarFondosTexto) window.tetActualizarFondosTexto();
        canvas.renderAll();
        return true;
    }

    segAjusteImg.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-ajuste]');
        if (!b) return;
        DECO.ajusteImagen = b.dataset.ajuste;
        refrescarPanelImagen();
        if (!reencajarAuto()) {
            aviso('Coloca una imagen para aplicar el ajuste', 'info');
        }
        if (window.tetGuardarEstado) window.tetGuardarEstado();
    });

    chkImgBN.addEventListener('change', function () {
        DECO.imagenBN = this.checked;
        var img = typeof imagenObjetivo === 'function' ? imagenObjetivo() : null;
        if (img) window.tetBlancoNegro(this.checked, img);
        else if (this.checked) aviso('Selecciona una imagen para aplicarle blanco y negro', 'info');
    });

    chkImgLateral.addEventListener('change', function () {
        DECO.lateralActivo = this.checked;
        filaLateral.hidden = !this.checked;
        var img = imagenAutoActual();
        if (img) {
            aplicarLateralAuto(img);
            if (window.tetGuardarEstado) window.tetGuardarEstado();
        } else if (this.checked) {
            aviso('El relleno lateral se aplica a la imagen del botón auto', 'info');
        }
    });

    [inLateral1, inLateral2].forEach(function (inp) {
        inp.addEventListener('input', function () {
            DECO.lateralColor1 = inLateral1.value;
            DECO.lateralColor2 = inLateral2.value;
            var img = imagenAutoActual();
            if (img && DECO.lateralActivo) aplicarLateralAuto(img);
        });
        inp.addEventListener('change', function () {
            if (window.tetGuardarEstado) window.tetGuardarEstado();
        });
    });

    chkLateralDeg.addEventListener('change', function () {
        DECO.lateralDegradado = this.checked;
        var img = imagenAutoActual();
        if (img && DECO.lateralActivo) {
            aplicarLateralAuto(img);
            if (window.tetGuardarEstado) window.tetGuardarEstado();
        }
    });

    canvas.on('selection:created', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'image') {
            chkImgBN.checked = (o.filters || []).some(function (f) {
                return f.type === 'Grayscale';
            });
        }
    });


    /* ============================================================
       3c · PANEL «SOMBRA» (imágenes y textos)
       ============================================================ */
    var panelSombra = el('section', 'tet-panel', [
        '<header class="tet-panel-head">',
        '  <i class="fas fa-clone" aria-hidden="true"></i><strong>Sombra</strong>',
        '</header>',
        '<div class="tet-panel-body">',
        '  <div class="tet-fila tet-checks">',
        '    <label class="tet-check"><input type="checkbox" id="tet-sombra-on"> <span>Sombra</span></label>',
        '    <label class="tet-color-parada" for="tet-sombra-color"><span>Color</span>',
        '      <input type="color" id="tet-sombra-color" class="tet-color" value="#000000" aria-label="Color de la sombra">',
        '    </label>',
        '  </div>',
        '  <div class="tet-fila">',
        '    <label class="tet-lbl" for="tet-sombra-blur">Difuminado</label>',
        '    <input type="range" class="tet-range" id="tet-sombra-blur" min="0" max="80" step="1" value="18">',
        '    <output class="tet-out" id="tet-sombra-blur-n">18</output>',
        '  </div>',
        '  <div class="tet-fila">',
        '    <span class="tet-lbl">Desplazar</span>',
        '    <label class="tet-lbl-mini" for="tet-sombra-x">X</label>',
        '    <input type="number" class="tet-num" id="tet-sombra-x" min="-100" max="100" step="1" value="0" aria-label="Desplazamiento horizontal de la sombra">',
        '    <label class="tet-lbl-mini" for="tet-sombra-y">Y</label>',
        '    <input type="number" class="tet-num" id="tet-sombra-y" min="-100" max="100" step="1" value="12" aria-label="Desplazamiento vertical de la sombra">',
        '  </div>',
        '  <div class="tet-fila">',
        '    <label class="tet-lbl" for="tet-sombra-op">Opacidad</label>',
        '    <input type="range" class="tet-range" id="tet-sombra-op" min="0" max="100" step="5" value="45">',
        '    <output class="tet-out" id="tet-sombra-op-n">45%</output>',
        '  </div>',
        '  <div class="tet-fila tet-presets" id="tet-sombra-presets" role="group" aria-label="Sombras rápidas">',
        '    <button type="button" class="tet-seg-btn" data-sombra="suave" title="Sombra suave">Suave</button>',
        '    <button type="button" class="tet-seg-btn" data-sombra="media" title="Sombra media">Media</button>',
        '    <button type="button" class="tet-seg-btn" data-sombra="fuerte" title="Sombra fuerte">Fuerte</button>',
        '    <button type="button" class="tet-seg-btn" data-sombra="ninguna" title="Quitar la sombra">Ninguna</button>',
        '  </div>',
        '  <p class="tet-pista">Se aplica a la imagen o al texto seleccionado. Si el texto tiene cuadro, la sombra va al cuadro.</p>',
        '</div>'
    ].join(''));

    var chkSombra = panelSombra.querySelector('#tet-sombra-on');
    var inSombraColor = panelSombra.querySelector('#tet-sombra-color');
    var inSombraBlur = panelSombra.querySelector('#tet-sombra-blur');
    var outSombraBlur = panelSombra.querySelector('#tet-sombra-blur-n');
    var inSombraX = panelSombra.querySelector('#tet-sombra-x');
    var inSombraY = panelSombra.querySelector('#tet-sombra-y');
    var inSombraOp = panelSombra.querySelector('#tet-sombra-op');
    var outSombraOp = panelSombra.querySelector('#tet-sombra-op-n');
    var segSombraPresets = panelSombra.querySelector('#tet-sombra-presets');

    function objetosSombra() {
        var o = canvas.getActiveObject();
        if (!o) return [];
        var lista = (o.type === 'activeSelection') ? o.getObjects() : [o];
        return lista.filter(function (x) {
            return x && (x.type === 'image' || typeof x.text === 'string');
        });
    }

    /* En un texto con cuadro la sombra va al cuadro (es la forma que se ve). */
    function destinoSombra(o) {
        if (typeof o.text === 'string' && o._tetFondo) return o._tetFondo;
        return o;
    }

    /* Pasa la sombra de un objeto a otro (texto ↔ cuadro de fondo). */
    function copiarSombra(origen, destino) {
        if (!origen || !origen.shadow || !destino) return false;
        var s = origen.shadow;
        destino.set('shadow', new fabric.Shadow({
            color: s.color,
            blur: s.blur,
            offsetX: s.offsetX,
            offsetY: s.offsetY
        }));
        destino.tetSombraColor = origen.tetSombraColor;
        destino.tetSombraOpacidad = origen.tetSombraOpacidad;
        destino.tetSombraBlur = origen.tetSombraBlur;
        destino.tetSombraX = origen.tetSombraX;
        destino.tetSombraY = origen.tetSombraY;
        return true;
    }

    function colorConAlfa(hex, alfa) {        var h = (hex || '#000000').replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var r = parseInt(h.slice(0, 2), 16) || 0;
        var g = parseInt(h.slice(2, 4), 16) || 0;
        var b = parseInt(h.slice(4, 6), 16) || 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alfa + ')';
    }

    function configSombra() {
        return {
            activa: !!chkSombra.checked,
            color: inSombraColor.value || '#000000',
            blur: Math.max(0, +inSombraBlur.value || 0),
            x: +inSombraX.value || 0,
            y: +inSombraY.value || 0,
            op: Math.max(0, Math.min(1, (+inSombraOp.value || 0) / 100))
        };
    }

    function aplicarSombra(cfg) {
        var objs = objetosSombra();
        if (!objs.length) { aviso('Selecciona una imagen o un texto', 'warning'); return; }
        objs.forEach(function (o) {
            var dest = destinoSombra(o);
            if (!cfg.activa || cfg.op <= 0) {
                dest.set('shadow', null);
                dest.tetSombraColor = null;
                dest.tetSombraOpacidad = null;
                dest.tetSombraBlur = null;
                dest.tetSombraX = null;
                dest.tetSombraY = null;
                return;
            }
            dest.set('shadow', new fabric.Shadow({
                color: colorConAlfa(cfg.color, cfg.op),
                blur: cfg.blur,
                offsetX: cfg.x,
                offsetY: cfg.y
            }));
            dest.tetSombraColor = cfg.color;
            dest.tetSombraOpacidad = cfg.op;
            dest.tetSombraBlur = cfg.blur;
            dest.tetSombraX = cfg.x;
            dest.tetSombraY = cfg.y;
        });
        confirmarCambio();
    }

    function refrescarPanelSombra() {
        var objs = objetosSombra();
        panelSombra.hidden = !objs.length;
        panelSombra.classList.toggle('is-on', objs.length > 0);
        if (!objs.length) return;

        var dest = destinoSombra(objs[0]);
        var sh = dest.shadow;
        chkSombra.checked = !!sh;
        var color = dest.tetSombraColor || '#000000';
        var blur = (sh && sh.blur != null) ? sh.blur : 18;
        var x = (sh && sh.offsetX != null) ? sh.offsetX : 0;
        var y = (sh && sh.offsetY != null) ? sh.offsetY : 12;
        var op = (dest.tetSombraOpacidad != null) ? dest.tetSombraOpacidad :
            (sh ? 0.45 : 0.45);
        inSombraColor.value = color;
        inSombraBlur.value = blur;
        outSombraBlur.textContent = blur;
        inSombraX.value = x;
        inSombraY.value = y;
        inSombraOp.value = Math.round(op * 100);
        outSombraOp.textContent = Math.round(op * 100) + '%';
        segSombraPresets.querySelectorAll('button[data-sombra]').forEach(function (b) {
            b.classList.toggle('is-on', false);
        });
    }
    window.tetRefrescarPanelSombra = refrescarPanelSombra;

    chkSombra.addEventListener('change', function () {
        aplicarSombra(configSombra());
    });
    [inSombraColor, inSombraBlur, inSombraX, inSombraY, inSombraOp].forEach(function (inp) {
        inp.addEventListener('input', function () {
            outSombraBlur.textContent = inSombraBlur.value;
            outSombraOp.textContent = inSombraOp.value + '%';
            if (!chkSombra.checked) chkSombra.checked = true;
            aplicarSombra(configSombra());
        });
    });
    segSombraPresets.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-sombra]');
        if (!b) return;
        var presets = {
            suave: { color: '#000000', blur: 14, x: 0, y: 8, op: 0.35 },
            media: { color: '#000000', blur: 26, x: 0, y: 14, op: 0.5 },
            fuerte: { color: '#000000', blur: 40, x: 0, y: 22, op: 0.6 }
        };
        var cfg;
        if (b.dataset.sombra === 'ninguna') {
            chkSombra.checked = false;
            cfg = configSombra();
        } else {
            cfg = presets[b.dataset.sombra];
            if (!cfg) return;
            chkSombra.checked = true;
            inSombraColor.value = cfg.color;
            inSombraBlur.value = cfg.blur;
            inSombraX.value = cfg.x;
            inSombraY.value = cfg.y;
            inSombraOp.value = Math.round(cfg.op * 100);
            outSombraBlur.textContent = cfg.blur;
            outSombraOp.textContent = Math.round(cfg.op * 100) + '%';
            cfg = { activa: true, color: cfg.color, blur: cfg.blur, x: cfg.x, y: cfg.y, op: cfg.op };
        }
        aplicarSombra(cfg);
        segSombraPresets.querySelectorAll('button[data-sombra]').forEach(function (x) {
            x.classList.toggle('is-on', x === b && b.dataset.sombra !== 'ninguna');
        });
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
        paneProps.insertBefore(panelImagen, panelBase);
        paneProps.insertBefore(panelSombra, panelBase);
    } else {
        paneProps.appendChild(panelTexto);
        paneProps.appendChild(panelTpl);
        paneProps.appendChild(panelImagen);
        paneProps.appendChild(panelSombra);
    }

    panelTexto.hidden = true;
    panelSombra.hidden = true;
    ['selection:created', 'selection:updated', 'selection:cleared',
        'object:modified', 'object:removed', 'text:changed'].forEach(function (ev) {
            canvas.on(ev, pintarTexto);
            canvas.on(ev, refrescarPanelSombra);
        });
    pintarTexto();
    refrescarPanelTpl();
    refrescarPanelImagen();
    refrescarPanelSombra();
    window.tetVincularFondosTexto();

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
