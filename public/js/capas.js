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
    var panel = document.createElement('div');
    panel.className = 'capas-panel';
    panel.innerHTML =
        '<div class="capas-header">' +
            '<i class="fas fa-layer-group" aria-hidden="true"></i>' +
            '<strong>Capas</strong>' +
            '<span class="badge bg-light text-dark" id="capas-count">0</span>' +
        '</div>' +
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

    /* ---------- sincronización con Fabric ---------- */
    ['object:added', 'object:removed', 'object:modified',
     'selection:created', 'selection:updated', 'selection:clear',
     'text:changed'].forEach(function (evt) {
        canvas.on(evt, render);
    });

    render();
})();
