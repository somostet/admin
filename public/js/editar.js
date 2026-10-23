/* ============================================================
   editar.js — panel «Editar imagen» para los editores Fabric
   (tet1, tet2, dictet, art, miniatura, modcre y collage).

   Se inserta en el dock, en la pestaña Propiedades, y solo se ve
   cuando hay una imagen seleccionada. Todo lo que hace se puede
   deshacer (Ctrl+Z) porque son operaciones normales del lienzo.

     · Girar 90° (izquierda/derecha) y voltear (horizontal/vertical)
     · Brillo, contraste y saturación, con su «↺» de vuelta atrás
     · Borrador: goma de borrar con tamaño y plumón (borde suave)
     · Recortar: marco arrastrable que se aplica como clipPath
       relativo a la foto (al moverla o acercarla, el recorte se
       mueve con ella: ideal para encajar una foto en un hueco)

   Requiere: fabric.js, capas.js y shell.js (el dock) ya cargados.
   ============================================================ */
(function () {
    'use strict';

    if (typeof canvas === 'undefined' || !canvas) return;
    if (typeof fabric === 'undefined') return;

    var pane = document.querySelector('.dock-pane[data-pane="props"]');
    if (!pane) return;

    /* ---------- goma de borrar ----------
       El PencilBrush de Fabric pinta un trazo que luego se convierte en
       un <path> con stroke. Para borrar ese <path> tiene que ir RELLENO
       (fill) y pintar con destination-out: así el trazo se lleva por
       delante lo que hubiera, y es una capa más (deshacer incluido).
       El plumón es la sombra del propio path: borde suave sin
       aplicaciones extra. */
    fabric.Borrador = fabric.util.createClass(fabric.PencilBrush, {
        createPath: function (pathData) {
            var path = this.callSuper('createPath', pathData);
            var plumon = this.plumon || 0;
            path.set({
                fill: 'rgba(0,0,0,1)',
                stroke: 'none',
                strokeWidth: 0,
                selectable: false,
                evented: false,
                hoverCursor: 'default',
                name: 'Borrador',
                globalCompositeOperation: 'destination-out'
            });
            if (plumon > 0) {
                path.setShadow({
                    color: 'rgba(0,0,0,1)',
                    blur: plumon,
                    offsetX: 0,
                    offsetY: 0,
                    affectStroke: false
                });
            }
            return path;
        },
        /* la vista previa del trazo se sustituye por el anillo del cursor */
        _render: function () { }
    });

    var panel = document.createElement('div');
    panel.className = 'ed-panel';
    panel.id = 'ed-panel';
    panel.hidden = true;
    panel.innerHTML =
        '<div class="ed-cab">' +
            '<i class="fas fa-sliders-h" aria-hidden="true"></i>' +
            '<strong>Editar imagen</strong>' +
            '<span class="ed-pista">selecciona una foto del lienzo</span>' +
        '</div>' +

        '<div class="ed-grupo">' +
            '<span class="ed-etiqueta">Girar y voltear</span>' +
            '<div class="ed-fila">' +
                '<button type="button" class="ed-btn" data-ed="rotar-izq" title="Girar 90° a la izquierda" aria-label="Girar 90° a la izquierda"><i class="fas fa-undo" aria-hidden="true"></i><span class="ed-txt">izquierda</span></button>' +
                '<button type="button" class="ed-btn" data-ed="rotar-der" title="Girar 90° a la derecha" aria-label="Girar 90° a la derecha"><i class="fas fa-redo" aria-hidden="true"></i><span class="ed-txt">derecha</span></button>' +
                '<button type="button" class="ed-btn" data-ed="voltear-x" title="Voltear horizontalmente" aria-label="Voltear horizontalmente"><i class="fas fa-arrows-alt-h" aria-hidden="true"></i><span class="ed-txt">horizontal</span></button>' +
                '<button type="button" class="ed-btn" data-ed="voltear-y" title="Voltear verticalmente" aria-label="Voltear verticalmente"><i class="fas fa-arrows-alt-v" aria-hidden="true"></i><span class="ed-txt">vertical</span></button>' +
            '</div>' +
        '</div>' +

        '<div class="ed-grupo ed-filtros">' +
            '<span class="ed-etiqueta">Color de la foto <button type="button" class="ed-reset" data-ed="filtros-reset" title="Quitar brillo, contraste y saturación" aria-label="Quitar brillo, contraste y saturación"><i class="fas fa-history" aria-hidden="true"></i></button></span>' +
            '<label class="ed-rango">' +
                '<span>Brillo</span>' +
                '<input type="range" min="-1" max="1" step="0.05" value="0" data-ed="brillo" aria-label="Brillo">' +
                '<output></output>' +
            '</label>' +
            '<label class="ed-rango">' +
                '<span>Contraste</span>' +
                '<input type="range" min="-1" max="1" step="0.05" value="0" data-ed="contraste" aria-label="Contraste">' +
                '<output></output>' +
            '</label>' +
            '<label class="ed-rango">' +
                '<span>Saturación</span>' +
                '<input type="range" min="-1" max="1" step="0.05" value="0" data-ed="saturacion" aria-label="Saturación">' +
                '<output></output>' +
            '</label>' +
        '</div>' +

        '<div class="ed-grupo ed-borrador">' +
            '<span class="ed-etiqueta">Borrador</span>' +
            '<div class="ed-fila">' +
                '<button type="button" class="ed-btn ed-boton-borrar" data-ed="borrador" aria-pressed="false"><i class="fas fa-eraser" aria-hidden="true"></i><span class="ed-txt">borrar con el dedo</span></button>' +
            '</div>' +
            '<label class="ed-rango">' +
                '<span>Tamaño</span>' +
                '<input type="range" min="4" max="220" step="2" value="40" data-ed="tam-borrar" aria-label="Tamaño">' +
                '<output></output>' +
            '</label>' +
            '<label class="ed-rango">' +
                '<span>Plumón (borde suave)</span>' +
                '<input type="range" min="0" max="80" step="1" value="12" data-ed="plumon" aria-label="Plumón (borde suave)">' +
                '<output></output>' +
            '</label>' +
        '</div>' +

        '<div class="ed-grupo ed-recorte">' +
            '<span class="ed-etiqueta">Recortar</span>' +
            '<div class="ed-fila">' +
                '<button type="button" class="ed-btn" data-ed="recortar"><i class="fas fa-crop-alt" aria-hidden="true"></i><span class="ed-txt">marcar recorte</span></button>' +
                '<button type="button" class="ed-btn ed-ok" data-ed="aplicar-recorte" hidden><i class="fas fa-check" aria-hidden="true"></i><span class="ed-txt">aplicar</span></button>' +
                '<button type="button" class="ed-btn ed-cancelar" data-ed="cancelar-recorte" hidden><i class="fas fa-times" aria-hidden="true"></i><span class="ed-txt">cancelar</span></button>' +
            '</div>' +
            '<p class="ed-pista">Arrastra las asas y mueve el marco sobre la foto. Al aplicarlo, la foto queda recortada a ese rectángulo (sigue entera por dentro: deshacer la devuelve).</p>' +
        '</div>';

    pane.insertBefore(panel, pane.firstChild);

    var FABRIC_IMG = fabric.Image;
    var img = null;              /* foto seleccionada */
    var estadoBorrador = false;
    var recorte = null;          /* { marco } */
    var anillo = null;           /* cursor circular del borrador */

    var $ = function (sel) { return panel.querySelector(sel); };
    var qa = function (sel) { return Array.prototype.slice.call(panel.querySelectorAll(sel)); };

    /* ---------- filtros de color ----------
       Los nombres de las propiedades de Fabric son en inglés (brightness,
       contrast, saturation); el panel los llama brillo/contraste/saturación,
       así que se mapean. */
    var FILTROS = [
        { clave: 'brillo',     tipo: 'Brightness', Clase: fabric.Image.filters.Brightness, prop: 'brightness' },
        { clave: 'contraste',  tipo: 'Contrast',   Clase: fabric.Image.filters.Contrast,   prop: 'contrast' },
        { clave: 'saturacion', tipo: 'Saturation', Clase: fabric.Image.filters.Saturation, prop: 'saturation' }
    ];

    function filtrosDe(foto) {
        var f = {};
        FILTROS.forEach(function (cfg) { f[cfg.clave] = null; });
        if (!foto || typeof foto.filters === 'undefined') return f;
        (foto.filters || []).forEach(function (filtro) {
            FILTROS.forEach(function (cfg) {
                if (filtro.type === cfg.tipo) f[cfg.clave] = filtro;
            });
        });
        return f;
    }

    function leeFiltro(clave) {
        var cfg = FILTROS.filter(function (c) { return c.clave === clave; })[0];
        var actual = filtrosDe(img)[clave];
        return actual ? actual[cfg.prop] : 0;
    }

    function ponFiltro(clave, valor) {
        if (!img) return;
        var cfg = FILTROS.filter(function (c) { return c.clave === clave; })[0];
        var f = filtrosDe(img);
        var fviejo = f[clave];
        if (valor === 0 && !fviejo) return;     /* nada que quitar */
        if (!fviejo) {
            var o = {}; o[cfg.prop] = valor;
            img.filters.push(new cfg.Clase(o));
        } else {
            if (valor === 0) {
                img.filters.splice(img.filters.indexOf(fviejo), 1);
            } else {
                fviejo[cfg.prop] = valor;
            }
        }
        img.applyFilters();
        canvas.renderAll();
        if (window.tetGuardarEstado) window.tetGuardarEstado();
        sincronizaFiltros();
    }

    /* los <output> junto a cada rango: el valor, para no adivinar */
    function sincronizaFiltros() {
        FILTROS.forEach(function (cfg) {
            var input = $('[data-ed="' + cfg.clave + '"]');
            if (!input) return;
            var v = parseFloat(leeFiltro(cfg.clave));
            input.value = String(v);
            var out = input.parentElement.querySelector('output');
            if (out) out.textContent = Math.round(v * 100) + ' %';
        });
    }

    /* ---------- borrador ---------- */
    function pincelBorrador() {
        canvas.isDrawingMode = true;
        var b = new fabric.Borrador(canvas);
        var tam = parseInt(($('[data-ed="tam-borrar"]') || {}).value, 10) || 40;
        var plumon = parseInt(($('[data-ed="plumon"]') || {}).value, 10) || 0;
        b.width = tam;
        b.plumon = plumon;
        canvas.freeDrawingBrush = b;
        canvas.freeDrawingCursor = 'none';
    }

    function quitarPincel() {
        canvas.isDrawingMode = false;
        canvas.freeDrawingCursor = 'crosshair';
        if (anillo) {
            canvas.remove(anillo);
            anillo = null;
        }
        var b = $('[data-ed="borrador"]');
        if (b) {
            b.setAttribute('aria-pressed', 'false');
            b.classList.remove('ed-activo');
        }
    }

    /* anillo que sigue al dedo/ratón: el tamaño del borrador a la vista */
    canvas.on('mouse:move', function (opt) {
        if (!estadoBorrador) return;
        var p = canvas.getPointer(opt.e);
        var r = ((canvas.freeDrawingBrush && canvas.freeDrawingBrush.width) || 40) / 2;
        if (!anillo) {
            anillo = new fabric.Circle({
                radius: r,
                fill: 'rgba(0,0,0,0)',
                stroke: '#4dabf7',
                strokeWidth: 2,
                strokeDashArray: [5, 4],
                selectable: false,
                evented: false,
                originX: 'center',
                originY: 'center'
            });
            canvas.add(anillo);
        }
        anillo.set({ radius: r, left: p.x, top: p.y });
        canvas.bringToFront(anillo);
        canvas.requestRenderAll();
    });

    function alternarBorrador() {
        if (!img) {
            var activo = canvas.getActiveObject();
            if (esFoto(activo)) img = activo;
        }
        if (!img) return;
        if (estadoBorrador) {
            quitarPincel();
            estadoBorrador = false;
            return;
        }
        /* el borrador y el recorte no conviven: uno borra píxeles, otro dibuja
           un marco sobre la foto */
        cancelarRecorte();
        pincelBorrador();
        estadoBorrador = true;
        var b = $('[data-ed="borrador"]');
        if (b) {
            b.setAttribute('aria-pressed', 'true');
            b.classList.add('ed-activo');
        }
    }

    /* ---------- recorte ---------- */
    /* Coordenadas del marco en el sistema LOCAL de la imagen (sin escala):
       así el recorte se mueve y escala con la foto. */
    function clipDe(foto, marco) {
        /* El marco se ajusta con las asas, y eso cambia scaleX/scaleY (no
           width/height): sin multiplicar por la escala, aplicar tras
           redimensionar recortaba el tamaño inicial. */
        var sx = Math.abs(marco.scaleX || 1), sy = Math.abs(marco.scaleY || 1);
        return new fabric.Rect({
            left: (marco.left - foto.left) / (foto.scaleX || 1),
            top: (marco.top - foto.top) / (foto.scaleY || 1),
            width: (marco.width * sx) / (foto.scaleX || 1),
            height: (marco.height * sy) / (foto.scaleY || 1),
            originX: 'left',
            originY: 'top',
            fill: 'rgba(0,0,0,0)',
            stroke: 'none',
            selectable: false,
            evented: false,
            excludeFromExport: true
        });
    }

    function empezarRecorte() {
        if (!img) return;
        quitarPincel();
        cancelarRecorte();
        var w = img.getScaledWidth(), h = img.getScaledHeight();
        /* El marco solo aporta la zona interactiva; el aspecto de recorte
           (velo, rejilla y esquinas) lo pinta tetRecorteClasico. */
        var marco = new fabric.Rect({
            left: img.left + w * 0.12,
            top: img.top + h * 0.12,
            width: w * 0.76,
            height: h * 0.76,
            fill: 'rgba(0,0,0,0)',
            stroke: null,
            strokeWidth: 0,
            name: 'Recorte',
            lockRotation: true,
            excludeFromExport: true
        });
        marco.setControlsVisibility({ mtr: false });
        /* recorte se asigna ANTES de setActiveObject: el evento de selección
           llama a sincronizaPanel() y, si recorte es null, oculta el panel */
        recorte = { marco: marco };
        canvas.add(marco);
        canvas.setActiveObject(marco);
        if (window.tetRecorteClasico) window.tetRecorteClasico.activar(marco, { foto: img });
        $('[data-ed="aplicar-recorte"]').hidden = false;
        $('[data-ed="cancelar-recorte"]').hidden = false;
        $('[data-ed="recortar"]').hidden = true;
    }

    function cancelarRecorte() {
        if (!recorte) return;
        var m = recorte.marco;
        recorte = null;
        canvas.remove(m);
        if (window.tetRecorteClasico) window.tetRecorteClasico.desactivar();
        $('[data-ed="aplicar-recorte"]').hidden = true;
        $('[data-ed="cancelar-recorte"]').hidden = true;
        $('[data-ed="recortar"]').hidden = false;
    }

    function aplicarRecorte() {
        if (!recorte || !img) return;
        /* guarda la foto antes de cancelar: al quitar el marco se dispara
           selection:cleared y el panel pone `img` a null */
        var foto = img;
        foto.clipPath = clipDe(foto, recorte.marco);
        if (window.tetGuardarEstado) window.tetGuardarEstado();
        cancelarRecorte();
        canvas.setActiveObject(foto);
        canvas.renderAll();
    }

    /* ---------- selección ---------- */
    function esFoto(obj) {
        return obj && (obj instanceof FABRIC_IMG || (obj.type === 'image'));
    }

    function sincronizaPanel() {
        var activo = canvas.getActiveObject();
        if (recorte) {
            /* el marco de recorte está seleccionado, pero el panel debe
               seguir abierto para poder aplicar o cancelar */
            panel.hidden = false;
            return;
        }
        if (esFoto(activo)) {
            img = activo;
            panel.hidden = false;
            sincronizaFiltros();
            return;
        }
        img = null;
        panel.hidden = true;
        /* el borrador sigue activo aunque se haya deseleccionado la foto:
           apagarlo aquí obligaría a reactivarlo tras cada trazo */
        if (!estadoBorrador) quitarPincel();
        cancelarRecorte();
    }

    panel.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-ed]');
        if (!b) return;
        var accion = b.dataset.ed;
        if (!img) return;

        switch (accion) {
            case 'rotar-izq': img.rotate(Math.round(img.angle) - 90); break;
            case 'rotar-der': img.rotate(Math.round(img.angle) + 90); break;
            case 'voltear-x': img.set('flipX', !img.flipX); break;
            case 'voltear-y': img.set('flipY', !img.flipY); break;
            case 'borrador': alternarBorrador(); return;
            case 'recortar': empezarRecorte(); return;
            case 'aplicar-recorte': aplicarRecorte(); return;
            case 'cancelar-recorte': cancelarRecorte(); return;
            case 'filtros-reset':
                img.filters = [];
                img.applyFilters();
                canvas.renderAll();
                if (window.tetGuardarEstado) window.tetGuardarEstado();
                sincronizaFiltros();
                return;
            default: return;
        }
        canvas.setActiveObject(img);
        canvas.renderAll();
        if (window.tetGuardarEstado) window.tetGuardarEstado();
    });

    qa('[data-ed]').forEach(function (input) {
        if (input.type !== 'range') return;
        input.addEventListener('input', function () {
            var v = parseFloat(input.value);
            var out = input.parentElement.querySelector('output');
            if (out) out.textContent = Math.round(v * 100) + ' %';
            switch (input.dataset.ed) {
                case 'brillo': ponFiltro('brillo', v); break;
                case 'contraste': ponFiltro('contraste', v); break;
                case 'saturacion': ponFiltro('saturacion', v); break;
                case 'tam-borrar':
                    if (out) out.textContent = Math.round(v) + ' px';
                    if (estadoBorrador && canvas.freeDrawingBrush) {
                        canvas.freeDrawingBrush.width = v;
                        if (anillo) { anillo.radius = v / 2; canvas.requestRenderAll(); }
                    }
                    break;
                case 'plumon':
                    if (out) out.textContent = Math.round(v) + ' px';
                    if (estadoBorrador && canvas.freeDrawingBrush) {
                        canvas.freeDrawingBrush.plumon = v;
                    }
                    break;
            }
        });
    });

    /* la imagen se puede cambiar de sitio con el teclado: el marco del
       recorte se queda donde estaba, así que se cancela solo. Al mover o
       escalar el PROPIO marco no se cancela: eso es justo lo que se hace
       para ajustar el recorte. */
    canvas.on('object:modified', function (e) {
        if (recorte && e.target !== recorte.marco) cancelarRecorte();
    });

    canvas.on('selection:created', sincronizaPanel);
    canvas.on('selection:updated', sincronizaPanel);
    canvas.on('selection:cleared', sincronizaPanel);

    /* si la página define su propio modo de pegar imágenes (collage), el
       borrador no interfiere: se apaga al salir de la selección */
    window.tetEditarListo = true;
})();
