/* Panel de capas compartido por todos los editores (tet1, tet2, dictet, art, miniatura, modcre)
   Requiere que la página haya creado la variable global `canvas` de Fabric.js
   antes de cargar este script. El panel se inserta solo bajo el contenedor del lienzo. */
(function () {
    if (typeof canvas === 'undefined' || !canvas) {
        return;
    }

    /* ---------- controles de objetos: asas visibles y táctiles ----------
       Fabric usa esquinas transparentes de 13 px por defecto: las imágenes
       pegadas/copiadas eran casi imposibles de escalar en móvil. Se unifica
       aquí (este script se carga en los 6 editores); los objetos que ya
       fijan sus propias asas no se ven afectados. */
    var tactil = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        (!window.matchMedia && navigator.maxTouchPoints > 0);
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.cornerColor = '#ffffff';
    fabric.Object.prototype.cornerStrokeColor = '#0d6efd';
    fabric.Object.prototype.borderColor = '#0d6efd';
    fabric.Object.prototype.cornerSize = tactil ? 36 : 22;
    if (tactil) fabric.Object.prototype.padding = 10;

    /* asas más gordas: Fabric dibuja el trazo de los círculos con el
       lineWidth que hereda del contexto (1 px); se fija un grosor mayor
       justo antes de pintarlas y se restaura después */
    var drawControls0 = fabric.Object.prototype.drawControls;
    fabric.Object.prototype.drawControls = function (ctx, estilo) {
        var previo = ctx.lineWidth;
        ctx.lineWidth = tactil ? 3 : 2;
        var r = drawControls0.call(this, ctx, estilo);
        ctx.lineWidth = previo;
        return r;
    };

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
        var todos = canvas.getObjects();
        /* el marco de recorte (excludeFromExport) no es una capa */
        var objs = todos.filter(function (o) { return !o.excludeFromExport; });
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

        // La capa superior se muestra primero (índice real del array)
        for (var i = todos.length - 1; i >= 0; i--) {
            if (todos[i].excludeFromExport) continue;
            buildRow(todos[i], i, active);
        }
    }

    function buildRow(obj, idx, active) {
        var row = document.createElement('div');
        row.className = 'capa-row';
        row.dataset.idx = idx;
        if (obj === active) row.classList.add('active');
        if (obj.visible === false) row.classList.add('oculta');
        var bloq = obj.capaBloqueada === true;   // P3.3
        if (bloq) row.classList.add('bloqueada');
        row.setAttribute('draggable', bloq ? 'false' : 'true');   // P3.3

        var select = document.createElement('button');
        select.type = 'button';
        select.className = 'capa-select';
        select.dataset.action = 'select';
        select.title = 'Seleccionar en el lienzo';
        select.setAttribute('aria-label', 'Seleccionar capa ' + nameFor(obj));
        /* P3.3 · miniatura de preview real de la capa (captura diminuta del
           propio objeto); si falla (lienzo tainted) queda el icono */
        var miniatura = null;
        try {
            var urlMin = obj.toDataURL({ format: 'png', multiplier: 0.08, quality: 0.7 });
            if (typeof urlMin === 'string' && urlMin.length > 24) miniatura = urlMin;
        } catch (e) { miniatura = null; }
        if (miniatura) {
            var imgT = document.createElement('img');
            imgT.className = 'capa-thumb';
            imgT.alt = '';
            imgT.src = miniatura;
            select.appendChild(imgT);
        } else {
            var ic2 = document.createElement('i');
            ic2.className = iconFor(obj);
            ic2.setAttribute('aria-hidden', 'true');
            select.appendChild(ic2);
        }
        var sp2 = document.createElement('span');
        sp2.className = 'capa-name';
        sp2.textContent = nameFor(obj);
        select.appendChild(sp2);

        var actions = document.createElement('div');
        actions.className = 'capa-actions';
        actions.appendChild(actionBtn('up', 'fas fa-angle-up', 'Subir una capa'));
        actions.appendChild(actionBtn('down', 'fas fa-angle-down', 'Bajar una capa'));
        actions.appendChild(actionBtn('eye', obj.visible === false ? 'fas fa-eye-slash' : 'fas fa-eye',
            obj.visible === false ? 'Mostrar capa' : 'Ocultar capa'));
        actions.appendChild(actionBtn('lock', bloq ? 'fas fa-lock' : 'fas fa-lock-open',
            bloq ? 'Desbloquear capa' : 'Bloquear capa'));   // P3.3
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
                if (obj.capaBloqueada) { aviso('La capa está bloqueada: desbloquéala para reordenar'); break; }
                canvas.bringForward(obj);
                canvas.renderAll();
                break;
            case 'down':
                if (obj.capaBloqueada) { aviso('La capa está bloqueada: desbloquéala para reordenar'); break; }
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
                if (obj.capaBloqueada) { aviso('La capa está bloqueada: desbloquéala para eliminarla'); break; }
                canvas.remove(obj);
                canvas.renderAll();
                break;
            case 'lock':   // P3.3
                var eraBloqueada = obj.capaBloqueada === true;
                obj.capaBloqueada = !eraBloqueada;
                obj.set({
                    lockMovementX: !eraBloqueada,
                    lockMovementY: !eraBloqueada,
                    lockScalingX: !eraBloqueada,
                    lockScalingY: !eraBloqueada,
                    lockRotation: !eraBloqueada,
                    editable: eraBloqueada   // si se bloquea deja de ser editable
                });
                obj.setCoords();
                canvas.renderAll();
                aviso(eraBloqueada ? 'Capa desbloqueada' : 'Capa bloqueada', 'info');
                break;
        }
        render();
    });

    // Evita que los botones del panel quiten el foco del lienzo
    list.addEventListener('mousedown', function (e) {
        e.preventDefault();
    });

    /* P3.3 · reordenar ARRASTRANDO las filas: se mueve el objeto real por su
       índice de Fabric (los botones ↑/↓ siguen como alternativa); las
       filas bloqueadas ni se arrastran ni reciben suelta */
    var arrastrandoIdx = -1;
    list.addEventListener('dragstart', function (e) {
        var row = e.target.closest('.capa-row');
        if (!row || row.getAttribute('draggable') === 'false') { e.preventDefault(); return; }
        arrastrandoIdx = parseInt(row.dataset.idx, 10);
        row.classList.add('capa-dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(arrastrandoIdx));
        }
    });
    list.addEventListener('dragover', function (e) {
        var row = e.target.closest('.capa-row');
        if (!row || row.getAttribute('draggable') === 'false') return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        row.classList.add('capa-drop-target');
    });
    list.addEventListener('dragleave', function (e) {
        var row = e.target.closest('.capa-row');
        if (row) row.classList.remove('capa-drop-target');
    });
    list.addEventListener('drop', function (e) {
        var row = e.target.closest('.capa-row');
        e.preventDefault();
        var src = arrastrandoIdx;
        arrastrandoIdx = -1;
        var obj = src >= 0 ? canvas.getObjects()[src] : null;
        var dst = row ? parseInt(row.dataset.idx, 10) : -1;
        if (obj && dst >= 0 && src !== dst) {
            canvas.moveTo(obj, dst);   // API propia de Fabric para reordenar z-índice
            canvas.renderAll();
            guardarEstado();
            render();
        }
        Array.prototype.forEach.call(
            list.querySelectorAll('.capa-drop-target, .capa-dragging'), function (el) {
                el.classList.remove('capa-drop-target', 'capa-dragging');
            });
    });
    list.addEventListener('dragend', function () {
        arrastrandoIdx = -1;
        Array.prototype.forEach.call(
            list.querySelectorAll('.capa-drop-target, .capa-dragging'), function (el) {
                el.classList.remove('capa-drop-target', 'capa-dragging');
            });
    });

    /* ---------- diagnóstico de exportación (canvas "tainted") ---------- */
    window.avisoExportacion = function (err) {
        console.warn('tet: exportación fallida', err);
        if (window.mostrarAviso) {
            window.mostrarAviso('No se pudo exportar la imagen. Recarga la página (Ctrl+F5) e inténtalo otra vez; si persiste, mira la consola (F12).', 'danger');
        }
    };

    /* ---------- historial (deshacer / rehacer) ---------- */
    var historial = [];
    var histIdx = -1;
    var restaurando = false;
    var HIST_MAX = 40;

    function guardarEstado() {
        if (restaurando) return;
        /* Q1b · el overlay de color de tet1 es un patrón con source nulo y su
           toObject() truena leyendo null.src: se despega solo durante la
           serialización (y si el source está bien, se conserva y restaura) */
        var oc = canvas.overlayColor;
        var ocRoto = oc && !oc.source;
        if (ocRoto) canvas.overlayColor = null;
        try {
            var estado = JSON.stringify(canvas.toJSON());
        } catch (err) {
            // p.ej. canvas "tainted" al abrir como file://: sin historial, pero visible en consola
            console.warn('tet: no se pudo guardar el historial', err);
            if (ocRoto) canvas.overlayColor = oc;
            return;
        }
        if (ocRoto) canvas.overlayColor = oc;
        if (histIdx >= 0 && historial[histIdx] === estado) return;
        historial = historial.slice(0, histIdx + 1);
        historial.push(estado);
        if (historial.length > HIST_MAX) historial.shift();
        histIdx = historial.length - 1;
        actualizarToolbar();
    }

    function restaurar(idx) {
        if (window.tetModoRecorte) {
            /* el marco de recorte no está en los estados: se cancela o aplica antes */
            if (window.mostrarAviso) window.mostrarAviso('Aplica o cancela el recorte primero', 'warning');
            return;
        }
        if (idx < 0 || idx >= historial.length) return;
        restaurando = true;
        try {
            canvas.loadFromJSON(historial[idx], function () {
                canvas.renderAll();
                restaurando = false;
                histIdx = idx;
                actualizarToolbar();
                render();
            });
        } catch (err) {
            restaurando = false; // que no se quede el flag colgado
            console.warn('tet: no se pudo restaurar el historial', err);
        }
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
        // sincroniza los botones externos (barra superior estilo Inkscape)
        if (window.tetSyncHistorial) {
            window.tetSyncHistorial(u ? !u.disabled : false, r ? !r.disabled : false);
        }
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

    /* accesos para la barra flotante de la shell (móvil) */
    window.duplicarSeleccion = duplicar;
    window.eliminarSeleccion = function () {
        var o = canvas.getActiveObject();
        if (!o) return;
        if (o.type === 'activeSelection') {
            o.getObjects().forEach(function (x) { canvas.remove(x); });
        } else {
            canvas.remove(o);
        }
        canvas.discardActiveObject();
        canvas.renderAll();
    };

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

    /* validación del .json antes de pasarlo a fabric (S3 del plan de
       seguridad): tamaño, forma básica, lista blanca de types y cierre de
       las dos rutas new Function de fabric (clipTo string y pattern) */
    var TIPOS_OK = {
        image: 1, text: 1, 'i-text': 1, textbox: 1, rect: 1, circle: 1,
        ellipse: 1, line: 1, path: 1, polyline: 1, polygon: 1,
        triangle: 1, group: 1
    };

    function rellenoSeguro(f) {
        if (!f || typeof f !== 'object' || f.type !== 'pattern') return true;
        if (typeof f.source !== 'string') return true;
        return /^(data:|blob:|https?:)/i.test(f.source);
    }

    function fondoSeguro(v) {
        if (!v || typeof v !== 'object') return true;
        return rellenoSeguro(v);
    }

    function objetoSeguro(o, nivel) {
        if (!o || typeof o !== 'object' || nivel > 40) return false;
        if (TIPOS_OK[o.type] !== 1) return false;
        /* un clipTo serializado como string haría new Function en fabric */
        if (typeof o.clipTo === 'string') delete o.clipTo;
        if (!rellenoSeguro(o.fill)) return false;
        if (o.clipPath && !objetoSeguro(o.clipPath, nivel + 1)) return false;
        if (Array.isArray(o.objects)) {
            for (var i = 0; i < o.objects.length; i++) {
                if (!objetoSeguro(o.objects[i], nivel + 1)) return false;
            }
        }
        return true;
    }

    function proyectoSeguro(datos) {
        if (!datos || typeof datos !== 'object') return false;
        if (!Array.isArray(datos.objects)) return false;
        if (!fondoSeguro(datos.background) || !fondoSeguro(datos.overlay)) return false;
        for (var i = 0; i < datos.objects.length; i++) {
            if (!objetoSeguro(datos.objects[i], 0)) return false;
        }
        return true;
    }

    if (inputCargar) {
        inputCargar.addEventListener('change', function () {
            var file = inputCargar.files && inputCargar.files[0];
            if (!file) return;
            if (file.size > 12 * 1024 * 1024) {
                aviso('El proyecto supera los 12 MB', 'danger');
                inputCargar.value = '';
                return;
            }
            var lector = new FileReader();
            lector.onload = function () {
                try {
                    var datos = JSON.parse(lector.result);
                } catch (err) {
                    aviso('El archivo no es un proyecto válido', 'danger');
                    inputCargar.value = '';
                    return;
                }
                if (!proyectoSeguro(datos)) {
                    aviso('El proyecto contiene datos no admitidos', 'danger');
                    inputCargar.value = '';
                    return;
                }
                restaurando = true;
                try {
                    canvas.loadFromJSON(datos, function () {
                        canvas.renderAll();
                        restaurando = false;
                        guardarEstado();
                        render();
                        aviso('Proyecto cargado', 'success');
                    });
                } catch (err) {
                    restaurando = false;
                    aviso('No se pudo cargar el proyecto', 'danger');
                }
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
        var blob;
        try {
            blob = dataUrlABlob(canvas.toDataURL({ format: 'png', enableRetinaScaling: true }));
        } catch (err) {
            aviso('No se pudo generar la imagen', 'danger');
            return;
        }

        /* en escritorio no siempre hay hoja de compartir: se copia al
           portapapeles (pégala donde quieras) y, si no, se descarga */
        function porPortapapeles() {
            if (navigator.clipboard && window.ClipboardItem) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(function () {
                        aviso('Imagen copiada al portapapeles: pégala donde quieras', 'success');
                    })
                    .catch(porDescarga);
            } else {
                porDescarga();
            }
        }

        function porDescarga() {
            if (typeof download === 'function') {
                download(); // el propio editor avisa "Imagen descargada"
            } else {
                aviso('Tu navegador no admite compartir; usa Descargar', 'warning');
            }
        }

        var archivo = new File([blob], 'tet.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })) {
            navigator.share({ files: [archivo], title: 'tet admin' }).catch(function (err) {
                if (err && err.name === 'AbortError') return; // cancelado por el usuario
                porPortapapeles();
            });
        } else {
            porPortapapeles();
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

    /* ---------- adaptar imágenes subidas al lienzo (sin agrandar) ----------
       Antes cada editor hacía scaleToWidth(1200): las fotos pequeñas salían
       pixeladas al estirarse y las grandes se colgaban del lienzo. Ahora:
       contain con 10% de margen, centrada y nunca por encima del tamaño
       nativo. Compartido por tet1/art/miniatura/modcre. */
    window.ajustarImagenAlLienzo = function (img, margen) {
        if (!img || !img.width || !img.height) return img;
        var W = canvas.getWidth(), H = canvas.getHeight();
        var m = (margen == null ? 0.9 : margen);
        var e = Math.min((W * m) / img.width, (H * m) / img.height, 1);
        img.set({
            scaleX: e,
            scaleY: e,
            left: Math.round((W - img.width * e) / 2),
            top: Math.round((H - img.height * e) / 2)
        });
        return img;
    };

    /* ---------- adaptar la imagen seleccionada al lienzo ----------
       "llenar": cover — cubre todo el lienzo (sobra por los lados);
       "ajustar": contain — la imagen entera, descubriendo donde sobre.
       A diferencia del ajuste automático de inserción, aquí se permite
       agrandar: es una acción explícita del usuario. */
    window.adaptarImagenSeleccionada = function (modo) {
        var o = canvas.getActiveObject();
        if (!o || o.type !== 'image' || !o.width || !o.height) {
            if (window.mostrarAviso) window.mostrarAviso('Selecciona una imagen primero', 'warning');
            return null;
        }
        var W = canvas.getWidth(), H = canvas.getHeight();
        var e = (modo === 'llenar')
            ? Math.max(W / o.width, H / o.height)
            : Math.min(W / o.width, H / o.height);
        o.set({
            scaleX: e,
            scaleY: e,
            left: Math.round((W - o.width * e) / 2),
            top: Math.round((H - o.height * e) / 2)
        });
        o.setCoords();
        canvas.renderAll();
        /* historial + refresco del chip de resolución de la shell */
        canvas.fire('object:modified', { target: o });
        return o;
    };

    /* ---------- pegar imagen del portapapeles sobre el lienzo ---------- */
    // Expuesto para el botón "Pegar" de la shell (shell.js)
    window.pegarImagenBlob = function (blob) {
        if (!blob) return;
        // como data: URL (no blob:) para no contaminar el lienzo al abrir como file://
        var lector = new FileReader();
        lector.onerror = function () {
            if (window.mostrarAviso) window.mostrarAviso('No se pudo leer la imagen del portapapeles', 'danger');
        };
        lector.onload = function (e) {
            fabric.Image.fromURL(e.target.result, function (img) {
                if (!img || !img.width) {
                    if (window.mostrarAviso) window.mostrarAviso('No se pudo leer la imagen del portapapeles', 'danger');
                    return;
                }
                // escala al70% del lienzo y lo centra (antes se pegaba a tamaño real)
                var maxW = canvas.getWidth() * 0.7;
                var maxH = canvas.getHeight() * 0.7;
                var esc = Math.min(maxW / img.width, maxH / img.height, 1);
                img.set({
                    left: Math.round((canvas.getWidth() - img.width * esc) / 2),
                    top: Math.round((canvas.getHeight() - img.height * esc) / 2),
                    scaleX: esc,
                    scaleY: esc
                });
                canvas.add(img);            // object:added → historial + render
                canvas.setActiveObject(img);
                canvas.renderAll();
                if (window.mostrarAviso) window.mostrarAviso('Imagen pegada · Ctrl+Z deshace', 'success');
            });
        };
        lector.readAsDataURL(blob);
    };

    document.addEventListener('paste', function (e) {
        var cb = e.clipboardData;
        if (!cb || !cb.items) return;
        for (var i = 0; i < cb.items.length; i++) {
            var it = cb.items[i];
            if (it.kind === 'file' && it.type.indexOf('image/') === 0) {
                e.preventDefault();     // sólo si hay imagen: el texto sigue normal
                window.pegarImagenBlob(it.getAsFile());
                return;
            }
        }
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
