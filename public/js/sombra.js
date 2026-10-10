/* ============================================================
   sombra.js — sombra de texto (y de imagen)

   El único control que había era un deslizador de «Sombra» con el color y el
   desplazamiento clavados en negro/abajo, y solo actuaba sobre lo que
   estuviera seleccionado. Aquí hay un control completo: activar, color,
   desenfoque y desplazamiento en X e Y.

   Además, el texto nuevo nace ya con la sombra puesta. Para eso se envuelve
   canvas.add: al deshacer y al cargar proyecto Fabric llama a loadFromJSON,
   que NO pasa por add, así que los estados guardados recuperan su sombra tal
   cual se guardó y no se les encima la del momento.

   Requiere: fabric.js y la variable global `canvas` ya creados.
   ============================================================ */
(function () {
    'use strict';

    if (typeof canvas === 'undefined' || !canvas || typeof fabric === 'undefined') return;

    var panel = document.querySelector('.editor-panel');
    if (!panel) return;

    var CLAVE = 'tetSombra';

    /* estado por defecto: sombra suave hacia abajo, que es la que se lee bien
       sobre foto y sobre fondo de color */
    var def = { on: false, color: '#000000', blur: 14, x: 0, y: 6 };

    var est = {};
    try {
        var g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
        est = g && typeof g === 'object' ? g : {};
    } catch (e) { est = {}; }
    def.on = !!est.on;
    def.color = typeof est.color === 'string' ? est.color : def.color;
    def.blur = Number(est.blur) >= 0 ? Number(est.blur) : def.blur;
    def.x = Number.isFinite(Number(est.x)) ? Number(est.x) : def.x;
    def.y = Number.isFinite(Number(est.y)) ? Number(est.y) : def.y;

    window.tetSombra = def;

    function guardar() {
        try { localStorage.setItem(CLAVE, JSON.stringify(def)); } catch (e) { /* modo privado */ }
    }
    function sombra() {
        return def.on
            ? { color: def.color, blur: def.blur, offsetX: def.x, offsetY: def.y }
            : null;
    }

    /* ---------------- interfaz ---------------- */
    var fila = document.createElement('div');
    fila.className = 'row sh-sombra-fila';
    fila.id = 'fila-sombra';
    fila.innerHTML =
        '<div class="col-12">' +
            '<div class="sh-sombra-cab">' +
                '<label class="sh-switch">' +
                    '<input type="checkbox" id="sombra-on"' + (def.on ? ' checked' : '') + '>' +
                    '<span>Sombra</span>' +
                '</label>' +
            '</div>' +
            '<div class="sh-sombra-cuerpo"' + (def.on ? '' : ' hidden') + ' id="sombra-cuerpo">' +
                '<div class="sh-sombra-col">' +
                    '<label for="sombra-color">Color</label>' +
                    '<div class="input-color-container">' +
                        '<input type="color" id="sombra-color" class="input-color" value="' + def.color + '">' +
                    '</div>' +
                '</div>' +
                '<div class="sh-sombra-col">' +
                    '<label for="sombra-blur">Desenfoque <b id="sombra-blur-val">' + def.blur + '</b></label>' +
                    '<input type="range" class="form-range" id="sombra-blur" min="0" max="60" step="1" value="' + def.blur + '">' +
                '</div>' +
                '<div class="sh-sombra-col">' +
                    '<label for="sombra-x">Desplazamiento X <b id="sombra-x-val">' + def.x + '</b></label>' +
                    '<input type="range" class="form-range" id="sombra-x" min="-60" max="60" step="1" value="' + def.x + '">' +
                '</div>' +
                '<div class="sh-sombra-col">' +
                    '<label for="sombra-y">Desplazamiento Y <b id="sombra-y-val">' + def.y + '</b></label>' +
                    '<input type="range" class="form-range" id="sombra-y" min="-60" max="60" step="1" value="' + def.y + '">' +
                '</div>' +
            '</div>' +
            '<p class="sh-sombra-ayuda">Se aplica al texto nuevo y, si hay algo ' +
                'seleccionado, también a lo seleccionado.</p>' +
        '</div>';

    /* se coloca justo debajo de los colores de fondo y texto */
    var ancla = document.getElementById('fila-colores') || panel.firstElementChild;
    if (ancla && ancla.parentNode === panel) panel.insertBefore(fila, ancla.nextSibling);
    else panel.appendChild(fila);

    var chk = fila.querySelector('#sombra-on');
    var cuerpo = fila.querySelector('#sombra-cuerpo');
    var inColor = fila.querySelector('#sombra-color');
    var inBlur = fila.querySelector('#sombra-blur');
    var inX = fila.querySelector('#sombra-x');
    var inY = fila.querySelector('#sombra-y');

    function aviso(msg) {
        if (window.mostrarAviso) window.mostrarAviso(msg, 'success');
    }

    function refrescar() {
        cuerpo.hidden = !def.on;
        fila.querySelector('#sombra-blur-val').textContent = def.blur;
        fila.querySelector('#sombra-x-val').textContent = def.x;
        fila.querySelector('#sombra-y-val').textContent = def.y;
        guardar();
    }

    /* aplica sobre la selección actual, si la hay */
    function aplicarSeleccion() {
        var o = canvas.getActiveObject();
        if (!o) return;
        var objetos = o.type === 'activeSelection' ? o.getObjects() : [o];
        var n = 0;
        objetos.forEach(function (x) {
            x.setShadow(sombra());
            n++;
        });
        if (n) {
            canvas.renderAll();
            canvas.fire('object:modified', { target: o });
        }
    }

    chk.addEventListener('change', function () {
        def.on = chk.checked;
        refrescar();
        aplicarSeleccion();
    });
    inColor.addEventListener('input', function () {
        def.color = inColor.value;
        guardar();
        aplicarSeleccion();
    });
    inBlur.addEventListener('input', function () {
        def.blur = Number(inBlur.value);
        refrescar();
        aplicarSeleccion();
    });
    inX.addEventListener('input', function () {
        def.x = Number(inX.value);
        refrescar();
        aplicarSeleccion();
    });
    inY.addEventListener('input', function () {
        def.y = Number(inY.value);
        refrescar();
        aplicarSeleccion();
    });

    /* ---------------- el texto nuevo nace con la sombra ----------------
       Se envuelve canvas.add. Verificado: loadFromJSON (deshacer / abrir
       proyecto) NO pasa por aquí, así que los estados guardados no se
       sobreescriben. */
    var add0 = canvas.add;
    var aplicando = false;
    canvas.add = function () {
        var res = add0.apply(this, arguments);
        if (!aplicando && def.on) {
            for (var i = 0; i < arguments.length; i++) {
                var o = arguments[i];
                if (o && typeof o.type === 'string' && /^(i-text|text|textbox)$/.test(o.type)) {
                    o.setShadow(sombra());
                    o.dirty = true;
                }
            }
        }
        canvas.renderAll();
        return res;
    };

    /* al seleccionar algo, los controles reflejan su sombra real */
    function sincronizar() {
        var o = canvas.getActiveObject();
        if (!o || !o.shadow) return;
        def.on = true;
        def.color = o.shadow.color || def.color;
        def.blur = o.shadow.blur != null ? Math.round(o.shadow.blur) : def.blur;
        def.x = o.shadow.offsetX != null ? Math.round(o.shadow.offsetX) : def.x;
        def.y = o.shadow.offsetY != null ? Math.round(o.shadow.offsetY) : def.y;
        chk.checked = true;
        inColor.value = def.color;
        inBlur.value = def.blur;
        inX.value = def.x;
        inY.value = def.y;
        refrescar();
    }
    canvas.on('selection:created', sincronizar);
    canvas.on('selection:updated', sincronizar);

    /* el deslizador antiguo de «Sombra» sigue existiendo en varias páginas y
       hacia lo mismo: se apunta al mismo estado para que no peleen entre sí */
    var viejo = document.getElementById('sombra');
    if (viejo) {
        viejo.addEventListener('input', function () {
            def.blur = Number(viejo.value);
            def.on = true;
            chk.checked = true;
            inBlur.value = def.blur;
            refrescar();
            aplicarSeleccion();
        });
        /* y se oculta: sus funciones las cubre el panel nuevo */
        var filaVieja = viejo.closest('.row');
        if (filaVieja) filaVieja.hidden = true;
    }

    refrescar();
})();