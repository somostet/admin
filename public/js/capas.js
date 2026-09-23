/* Panel de capas compartido por todos los editores (tet1, tet2, dictet, art, miniatura, modcre)
   Requiere que la página haya creado la variable global `canvas` de Fabric.js
   antes de cargar este script. El panel se inserta solo bajo el contenedor del lienzo. */
(function () {
    if (typeof canvas === 'undefined' || !canvas) {
        return;
    }

    // Botones de capa globales para paginas que no los definan (tet1, tet2, dictet)
    if (typeof window.toFullBack !== 'function') {
        window.toFullBack = function () {
            var o = canvas.getActiveObject();
            if (o) { canvas.sendToBack(o); canvas.renderAll(); }
        };
        window.toBackward = function () {
            var o = canvas.getActiveObject();
            if (o) { canvas.sendBackwards(o); canvas.renderAll(); }
        };
        window.toForward = function () {
            var o = canvas.getActiveObject();
            if (o) { canvas.bringForward(o); canvas.renderAll(); }
        };
        window.toFront = function () {
            var o = canvas.getActiveObject();
            if (o) { canvas.bringToFront(o); canvas.renderAll(); }
        };
    }

    /* ---------- construcción del panel ---------- */
    var puedeCompartir = !!(navigator.share);
    var panel = document.createElement('div');
    panel.className = 'capas-panel';
    panel.innerHTML =
        '<button type="button" class="capas-header" aria-expanded="true" aria-controls="capas-list">' +
            '<i class="fas fa-layer-group" aria-hidden="true"></i>' +
            '<strong>Capas</strong>' +
            '<span class="badge bg-light text-dark" id="capas-count">0</span>' +
            '<i class="fas fa-chevron-down capas-caret" aria-hidden="true"></i>' +
        '</button>' +
        '<div class="capas-toolbar" id="capas-toolbar">' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><i class="fas fa-undo" aria-hidden="true"></i><span class="solo-movil ms-1">Deshacer</span></button>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="redo" title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer"><i class="fas fa-redo" aria-hidden="true"></i><span class="solo-movil ms-1">Rehacer</span></button>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="dup" title="Duplicar capa seleccionada" aria-label="Duplicar capa"><i class="fas fa-clone" aria-hidden="true"></i><span class="solo-movil ms-1">Duplicar</span></button>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="save" title="Guardar proyecto (.json)" aria-label="Guardar proyecto"><i class="fas fa-save" aria-hidden="true"></i><span class="solo-movil ms-1">Guardar</span></button>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="load" title="Cargar proyecto (.json)" aria-label="Cargar proyecto"><i class="fas fa-folder-open" aria-hidden="true"></i><span class="solo-movil ms-1">Cargar</span></button>' +
            (puedeCompartir
                ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="share" title="Compartir imagen" aria-label="Compartir imagen"><i class="fas fa-share-alt" aria-hidden="true"></i><span class="solo-movil ms-1">Compartir</span></button>'
                : '') +
        '</div>' +
        '<input type="file" id="capas-cargar" accept="application/json,.json" hidden>' +
        '<div class="capas-list" id="capas-list"></div>';

    var anchor = document.getElementById('img');
    if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    } else if (canvas.wrapperEl && canvas.wrapperEl.parentNode) {
        canvas.wrapperEl.parentNode.insertBefore(panel, canvas.wrapperEl.nextSibling);
    } else {
        document.body.appendChild(panel);
    }

    var list = panel.querySelector('#capas-list');
    var count = panel.querySelector('#capas-count');
    var header = panel.querySelector('.capas-header');
    var toolbar = panel.querySelector('#capas-toolbar');
    var inputCargar = panel.querySelector('#capas-cargar');

    // Cabecera plegable: evita que el panel tape el lienzo o quede recortado
    header.addEventListener('click', function () {
        var collapsed = panel.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });

    // Aviso flotante (toasts de Bootstrap 5) para mensajes de los editores
    // tipo: 'success' | 'warning' | 'danger' | 'info' (por defecto warning)
    window.mostrarAviso = function (msg, tipo) {
        var container = document.getElementById('tet-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tet-toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1100';
            document.body.appendChild(container);
        }
        var bg = 'text-bg-' + (tipo || 'warning');
        var el = document.createElement('div');
        el.className = 'toast align-items-center ' + bg + ' border-0 show';
        el.setAttribute('role', 'alert');
        el.innerHTML = '<div class="d-flex"><div class="toast-body"></div>' +
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>';
        el.querySelector('.toast-body').textContent = msg;
        container.appendChild(el);
        if (window.bootstrap && bootstrap.Toast) {
            var toast = new bootstrap.Toast(el, { delay: 3500 });
            toast.show();
            el.addEventListener('hidden.bs.toast', function () { el.remove(); });
        } else {
            setTimeout(function () { el.remove(); }, 3500);
        }
    };

    function aviso(msg, tipo) {
        if (typeof window.mostrarAviso === 'function') {
            window.mostrarAviso(msg, tipo);
        } else {
            console.warn(msg);
        }
    }

    function iconFor(obj) {
        switch (obj.type) {
            case 'image': return 'far fa-image';
            case 'i-text':
            case 'textbox':
            case 'text': return 'fas fa-font';
            case 'group': return 'fas fa-object-group';
            case 'rect':
            case 'circle':
            case 'triangle':
            case 'polygon':
            case 'line': return 'fas fa-shapes';
            default: return 'fas fa-square';
        }
    }

    function nameFor(obj) {
        if (typeof obj.text === 'string' && obj.text.length) {
            return obj.text.substring(0, 24) + (obj.text.length > 24 ? '…' : '');
        }
        if (obj.type === 'image') return 'Imagen';
        if (obj.type === 'group') return 'Grupo';
        return 'Forma';
    }

    function render() {
        var objs = canvas.getObjects();
        var active = canvas.getActiveObject();
        count.textContent = objs.length;
        list.innerHTML = '';

        if (!objs.length) {
            var empty = document.createElement('div');
            empty.className = 'capas-empty';
            empty.textContent = 'Sin capas: inserta un título o una imagen.';
            list.appendChild(empty);
            return;
        }

        // La capa superior se muestra primero
        for (var i = objs.length - 1; i >= 0; i--) {
            buildRow(objs[i], i, active);
        }
    }

    function buildRow(obj, idx, active) {
        var row = document.createElement('div');
        row.className = 'capa-row';
        row.dataset.idx = idx;
        if (obj === active) row.classList.add('active');
        if (obj.visible === false) row.classList.add('oculta');

        var select = document.createElement('button');
        select.type = 'button';
        select.className = 'capa-select';
        select.dataset.action = 'select';
        select.title = 'Seleccionar en el lienzo';
        select.setAttribute('aria-label', 'Seleccionar capa ' + nameFor(obj));
        select.innerHTML = '<i class="' + iconFor(obj) + '" aria-hidden="true"></i>' +
            '<span class="capa-name"></span>';
        select.querySelector('.capa-name').textContent = nameFor(obj);

        var actions = document.createElement('div');
        actions.className = 'capa-actions';
        actions.appendChild(actionBtn('up', 'fas fa-angle-up', 'Subir una capa'));
        actions.appendChild(actionBtn('down', 'fas fa-angle-down', 'Bajar una capa'));
        actions.appendChild(actionBtn('eye', obj.visible === false ? 'fas fa-eye-slash' : 'fas fa-eye',
            obj.visible === false ? 'Mostrar capa' : 'Ocultar capa'));
        actions.appendChild(actionBtn('remove', 'fas fa-trash-alt', 'Eliminar capa'));

        row.appendChild(select);
        row.appendChild(actions);
        list.appendChild(row);
    }

    function actionBtn(action, icon, label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'capa-btn';
        b.dataset.action = action;
        b.title = label;
        b.setAttribute('aria-label', label);
        b.innerHTML = '<i class="' + icon + '" aria-hidden="true"></i>';
        return b;
    }

    /* ---------- interacción ---------- */
    list.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var row = btn.closest('.capa-row');
        if (!row) return;

        var idx = parseInt(row.dataset.idx, 10);
        var objs = canvas.getObjects();
        var obj = objs[idx];
        if (!obj) return;

        switch (btn.dataset.action) {
            case 'select':
                canvas.setActiveObject(obj);
                canvas.renderAll();
                break;
            case 'up':
                canvas.bringForward(obj);
                canvas.renderAll();
                break;
            case 'down':
                canvas.sendBackwards(obj);
                canvas.renderAll();
                break;
            case 'eye':
                obj.visible = !(obj.visible === false);
                if (obj.visible === false && obj === canvas.getActiveObject()) {
                    canvas.discardActiveObject();
                }
                canvas.renderAll();
                break;
            case 'remove':
                canvas.remove(obj);
                canvas.renderAll();
                break;
        }
        render();
    });

    // Evita que los botones del panel quiten el foco del lienzo
    list.addEventListener('mousedown', function (e) {
        e.preventDefault();
    });

    /* ---------- historial (deshacer / rehacer) ---------- */
    var historial = [];
    var histIdx = -1;
    var restaurando = false;
    var HIST_MAX = 40;

    function guardarEstado() {
        if (restaurando) return;
        try {
            var estado = JSON.stringify(canvas.toJSON());
        } catch (err) {
            return; // lienzo no serializable: no se guarda historial
        }
        if (histIdx >= 0 && historial[histIdx] === estado) return;
        historial = historial.slice(0, histIdx + 1);
        historial.push(estado);
        if (historial.length > HIST_MAX) historial.shift();
        histIdx = historial.length - 1;
        actualizarToolbar();
    }

    function restaurar(idx) {
        if (idx < 0 || idx >= historial.length) return;
        restaurando = true;
        canvas.loadFromJSON(historial[idx], function () {
            canvas.renderAll();
            restaurando = false;
            histIdx = idx;
            actualizarToolbar();
            render();
        });
    }

    function deshacer() {
        if (histIdx > 0) restaurar(histIdx - 1);
    }

    function rehacer() {
        if (histIdx < historial.length - 1) restaurar(histIdx + 1);
    }

    function actualizarToolbar() {
        if (!toolbar) return;
        var u = toolbar.querySelector('[data-act="undo"]');
        var r = toolbar.querySelector('[data-act="redo"]');
        if (u) u.disabled = histIdx <= 0;
        if (r) r.disabled = histIdx >= historial.length - 1;
    }

    /* ---------- duplicar ---------- */
    function duplicar() {
        var obj = canvas.getActiveObject();
        if (!obj) {
            aviso('Selecciona una capa para duplicarla');
            return;
        }
        obj.clone(function (clon) {
            clon.set({
                left: (obj.left || 0) + 20,
                top: (obj.top || 0) + 20
            });
            canvas.add(clon).setActiveObject(clon);
            canvas.renderAll();
        });
    }

    /* ---------- guardar / cargar proyecto (.json) ---------- */
    function guardarProyecto() {
        var datos = JSON.stringify(canvas.toJSON());
        var blob = new Blob([datos], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'tet-proyecto.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        aviso('Proyecto guardado (.json)', 'success');
    }

    if (inputCargar) {
        inputCargar.addEventListener('change', function () {
            var file = inputCargar.files && inputCargar.files[0];
            if (!file) return;
            var lector = new FileReader();
            lector.onload = function () {
                try {
                    var datos = JSON.parse(lector.result);
                } catch (err) {
                    aviso('El archivo no es un proyecto válido', 'danger');
                    inputCargar.value = '';
                    return;
                }
                restaurando = true;
                canvas.loadFromJSON(datos, function () {
                    canvas.renderAll();
                    restaurando = false;
                    guardarEstado();
                    render();
                    aviso('Proyecto cargado', 'success');
                });
                inputCargar.value = '';
            };
            lector.readAsText(file);
        });
    }

    /* ---------- compartir (Web Share API) ---------- */
    function dataUrlABlob(dataUrl) {
        var partes = dataUrl.split(',');
        var mime = (partes[0].match(/:(.*?);/) || [])[1] || 'image/png';
        var binario = atob(partes[1]);
        var bytes = new Uint8Array(binario.length);
        for (var i = 0; i < binario.length; i++) {
            bytes[i] = binario.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    }

    function compartir() {
        canvas.discardActiveObject();
        canvas.renderAll();
        try {
            var blob = dataUrlABlob(canvas.toDataURL({ format: 'png' }));
        } catch (err) {
            aviso('No se pudo generar la imagen', 'danger');
            return;
        }
        var archivo = new File([blob], 'tet.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
            navigator.share({ files: [archivo], title: 'tet admin' }).catch(function () {
                // cancelado por el usuario: sin aviso
            });
        } else {
            aviso('Tu navegador no admite compartir archivos; usa Descargar', 'warning');
        }
    }

    if (toolbar) {
        toolbar.addEventListener('mousedown', function (e) {
            e.preventDefault();
        });
        toolbar.addEventListener('click', function (e) {
            var btn = e.target.closest('button[data-act]');
            if (!btn) return;
            switch (btn.dataset.act) {
                case 'undo': deshacer(); break;
                case 'redo': rehacer(); break;
                case 'dup': duplicar(); break;
                case 'save': guardarProyecto(); break;
                case 'load': if (inputCargar) inputCargar.click(); break;
                case 'share': compartir(); break;
            }
        });
    }

    // Atajos de teclado: Ctrl+Z deshacer, Ctrl+Shift+Z / Ctrl+Y rehacer
    document.addEventListener('keydown', function (e) {
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (!(e.ctrlKey || e.metaKey)) return;
        var k = (e.key || '').toLowerCase();
        if (k === 'z' && e.shiftKey) { e.preventDefault(); rehacer(); }
        else if (k === 'z') { e.preventDefault(); deshacer(); }
        else if (k === 'y') { e.preventDefault(); rehacer(); }
    });

    // Estado inicial del historial
    guardarEstado();

    /* ---------- sincronización con Fabric ---------- */
    ['object:added', 'object:removed', 'object:modified',
     'selection:created', 'selection:updated', 'selection:clear',
     'text:changed'].forEach(function (evt) {
        canvas.on(evt, render);
    });

    // Guarda estado para deshacer solo en cambios de contenido
    ['object:added', 'object:removed', 'object:modified', 'text:changed']
        .forEach(function (evt) {
            canvas.on(evt, guardarEstado);
        });

    actualizarToolbar();
    render();
})();
