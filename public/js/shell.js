/* ============================================================
   shell.js — barra de estilo Inkscape para tet1 (piloto)
   Reorganiza el DOM existente SIN tocar la lógica:
   - Barra superior: plantilla + cargar, deshacer/rehacer, zoom,
     formato de salida + guía, compartir, descargar, tema.
   - Rail izquierdo: herramientas (título, detalles, imagen,
     galería, pegar, centrar, borrar, orden).
   - Escenario: reglas (rulers) con coordenadas + lienzo.
   - Dock derecho con pestañas: Propiedades (formulario) / Capas.
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

    /* Mueve un botón del formulario a otro sitio conservando sus handlers.
       Se busca en todo el documento y no solo en .editor-panel: en tet2,
       dictet, art, miniatura y modcre la fila de botones de acción está en la
       columna del lienzo, así que no se encontraba nunca y el botón se quedaba
       apilado encima del lienzo —en el móvil, media pantalla de botones antes
       de ver el diseño. */
    function moverBoton(etiqueta, contenedor) {
        var sel = '[aria-label="' + etiqueta + '"]';
        var b = (panel && panel.querySelector(sel)) || document.querySelector(sel);
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
        /* w-100 es width:100% !important de Bootstrap: en el rail (y en la
           rejilla del móvil) esos botones se comían la fila entera */
        b.classList.remove('w-100');
    }

    /* quita columnas/filas que quedaron vacías tras mover los botones.
       Se mira también la columna del lienzo: allí viven, en tet2, dictet, art,
       miniatura y modcre, la fila de acciones y las de orden de capas, que se
       vacían al subir las herramientas al rail y a la barra. */
    function limpiarVacios() {
        var esCol = /(^|\s)col(-[a-z0-9]+)*(\s|$)/i;
        var raices = [panel, lienzo];
        for (var p = 0; p < 5; p++) {
            var quitados = 0;
            raices.forEach(function (raiz) {
                if (!raiz) return;
                raiz.querySelectorAll('.row > div').forEach(function (d) {
                    if (!esCol.test(d.className || '')) return;
                    if (d.classList.contains('sh-guardado')) return;
                    if (d.querySelector('input, select, textarea, button, label, img, canvas, kbd, h6, p')) return;
                    if (!d.textContent.trim()) { d.remove(); quitados++; }
                });
                raiz.querySelectorAll('.row').forEach(function (r) {
                    if (!r.textContent.trim() &&
                        !r.querySelector('input, select, textarea, button, label, img, canvas')) {
                        r.remove();
                        quitados++;
                    }
                });
            });
            if (!quitados) break;
        }
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
    /* rótulo con el nombre del editor activo (Noticias, Textos, Diccionario…) */
    var actNav = document.querySelector('.navbar a[aria-current="page"]');
    var nombreEdit = actNav && actNav.firstChild
        ? String(actNav.firstChild.nodeValue || '').trim() : '';
    top.appendChild(el('span', 'shell-doc',
        '<i class="fas fa-pen" aria-hidden="true"></i> ' + (nombreEdit || 'Editor')));

    /* selector de plantilla en el navbar (el avance automático ▶ se quitó:
       cambiaba la plantilla solo, cada 1,4 s, sin avisar) */
    var navPrin = document.querySelector('nav.navbar');
    var socialNav = document.querySelector('.navbar-social');
    var grupoTpl = el('div', 'navbar-tpl');
    var selTpl = q('#plantilla');
    if (selTpl) grupoTpl.appendChild(selTpl);
    moverBoton('Cargar plantilla', grupoTpl);
    if (selTpl && navPrin) {
        if (socialNav) navPrin.insertBefore(grupoTpl, socialNav);
        else navPrin.appendChild(grupoTpl);
    }

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

    /* zoom (transform sobre #img; Fabric recalcula el puntero por evento).
       Acepta valores libres (pellizco y "ajustar a pantalla"); los botones
       +/- siguen saltando por NIVELES */
    var NIVELES = [0.5, 0.75, 1, 1.25, 1.5, 2];
    var zoom = 1;
    /* a partir de aquí el usuario manda: auto-encajar deja de tocar el zoom */
    var zoomManual = false;
    var btnZoomOut = mkBtn('fa-search-minus', 'Alejar');
    var btnZoomLbl = mkBtn('fa-expand', 'Zoom al 100%');
    btnZoomLbl.id = 'sh-zoom-label';
    var btnZoomIn = mkBtn('fa-search-plus', 'Acercar');
    var btnZoomFit = mkBtn('fa-compress-arrows-alt', 'Ajustar a pantalla');
    btnZoomFit.classList.add('sh-zoom-fit');   /* en el teléfono se oculta */

    /* estos seis son la primera fila de la barra en el teléfono (ver el CSS
       de .sh-ctl); la casilla de la guía también cabe ahí, y los dos selectores
       se quedan en la segunda */
    [btnUndo, btnRedo, btnZoomOut, btnZoomLbl, btnZoomIn].forEach(function (b) {
        if (b) b.classList.add('sh-ctl');
    });

    function aplicarZoom(z) {
        zoom = Math.min(4, Math.max(0.25, z)); /* valor libre, sin engancharse a NIVELES */
        var img = document.getElementById('img');
        if (img) {
            /* el transform no ocupa espacio: sin reajustar #img al tamaño ya
               escalado, el escenario seguía reservando el ancho sin escalar y
               salía una barra de scroll horizontal en el móvil */
            img.style.transformOrigin = 'top left';
            img.style.transform = zoom === 1 ? '' : 'scale(' + zoom + ')';
            var env = lienzoActual();
            if (env) {
                img.style.width = Math.round(env.w * zoom) + 'px';
                img.style.height = Math.round(env.h * zoom) + 'px';
            }
        }
        btnZoomLbl.innerHTML = '<span>' + Math.round(zoom * 100) + '%</span>';
        if (typeof zoomEstado !== 'undefined' && zoomEstado) {
            zoomEstado.textContent = Math.round(zoom * 100) + '%';
        }
        pintarReglas();
        /* la guía de recorte va dentro de #img: hay que recalcularla con cada
           zoom o se queda desalineada */
        if (window.formatosActualizar) window.formatosActualizar();
    }
    /* caja real del lienzo (sin contar el zoom): se mide el contenedor del
       canvas y no #img, que se dimensiona al tamaño escalado y realimentaría
       el propio encaje */
    function lienzoActual() {
        var img = document.getElementById('img');
        if (!img) return null;
        var env = q('.canvas-container', img) || document.querySelector('.canvas-container');
        if (!env) return null;
        return { w: env.offsetWidth || 0, h: env.offsetHeight || 0 };
    }
    function pasoZoom(dir) {
        zoomManual = true;
        var idx = NIVELES.indexOf(zoom);
        if (idx < 0) {
            /* zoom libre (pellizco/ajuste): parte del nivel más cercano */
            idx = 0;
            for (var i = 0; i < NIVELES.length; i++) {
                if (Math.abs(NIVELES[i] - zoom) < Math.abs(NIVELES[idx] - zoom)) idx = i;
            }
        }
        idx = Math.min(NIVELES.length - 1, Math.max(0, idx + dir));
        aplicarZoom(NIVELES[idx]);
    }
    /* margen disponible una vez descontados los bordes del área de trabajo */
    function huecoDisponible() {
        var disp = document.querySelector('.shell-work');
        if (!disp) return null;
        var w = Math.max(80, disp.clientWidth - 12);
        /* en móvil el escenario va en el flujo normal: el alto útil es el de
           .shell-work, no media ventana */
        var alto = disp.clientHeight;
        if (!alto) alto = Math.max(200, window.innerHeight - 190);
        var h = Math.max(80, Math.min(alto, window.innerHeight - 170) - 12);
        return { w: w, h: h, disp: disp };
    }
    /* encaja el lienzo completo en el área de trabajo (encajar = agranda) */
    function zoomAjustar() {
        var base = lienzoActual();
        var hueco = huecoDisponible();
        if (!base || !(base.w > 0) || !hueco) return;
        zoomManual = true;
        aplicarZoom(Math.min(hueco.w / base.w, hueco.h / base.w));
    }
    /* encaje automático: solo mientras el usuario no haya tocado el zoom y
       nunca por encima del 100 % (no hace falta agrandar un diseño pequeño) */
    function autoAjustar() {
        if (zoomManual) return;
        encajarBaseLienzo();
        var base = lienzoActual();
        var hueco = huecoDisponible();
        if (!base || !(base.w > 0) || !hueco) return;
        aplicarZoom(Math.max(0.05, Math.min(hueco.w / base.w, hueco.h / base.w, 1)));
    }

    /* Tamaño de maquetación del lienzo calculado, no el del triángulo fijo que traía el HTML.
       Cada editor nacía con 300 px de lado en pantallas pequeñas y 500 px en las
       demás — valores pensados para un monitor. Como el encaje automático nunca
       pasa del 100 %, en un teléfono el lienzo se quedaba a 300 px con los
       bordes de margen y en una tableta (768 px) quedaba diminuto al lado de la
       pantalla. Aquí se calcula a partir del sitio libre y del tamaño real del
       diseño (canvas.getWidth/getHeight), tocando solo el CSS del contenedor:
       el backing store no se mueve, el 100 % sigue siendo el tamaño real y lo
       que se descarga o se comparte es exactamente igual. */
    function encajarBaseLienzo() {
        var hueco = huecoDisponible();
        if (!hueco) return;
        var c = window.canvas;
        if (!c || typeof c.getWidth !== 'function') return;
        var lw = c.getWidth(), lh = c.getHeight();
        if (!(lw > 0) || !(lh > 0)) return;
        var escala = Math.min(1, hueco.w / lw, (hueco.h > 0 ? hueco.h / lh : 1));
        if (!(escala > 0)) return;
        var w = Math.max(160, Math.round(lw * escala));
        var h = Math.max(160, Math.round(lh * escala));
        var env = q('.canvas-container');
        if (!env || (env.offsetWidth === w && env.offsetHeight === h)) return;

        /* Ojo: setDimensions({...}, {cssOnly:true}) no sirve aquí. En el Fabric
           vendorizado la rama cssOnly pasa el número sin «px»
           (style.width = 400 no es CSS válido) y el tamaño se descarta en
           silencio. Se escriben a mano el contenedor y los dos canvas. */
        env.style.width = w + 'px';
        env.style.height = h + 'px';
        [c.lowerCanvasEl, c.upperCanvasEl].forEach(function (el) {
            if (el) {
                el.style.width = w + 'px';
                el.style.height = h + 'px';
            }
        });
        /* sin esto Fabric sigue creyendo que el lienzo está donde estaba y
           al mover un elemento con el dedo se desplaza */
        if (typeof c.calcOffset === 'function') c.calcOffset();
    }
    btnZoomOut.addEventListener('click', function () { pasoZoom(-1); });
    btnZoomIn.addEventListener('click', function () { pasoZoom(1); });
    btnZoomLbl.addEventListener('click', function () { zoomManual = true; aplicarZoom(1); });
    btnZoomFit.addEventListener('click', zoomAjustar);
    top.appendChild(btnZoomOut);
    top.appendChild(btnZoomLbl);
    top.appendChild(btnZoomIn);
    top.appendChild(btnZoomFit);

    /* el encaje automático se repasa al cambiar el tamaño de la ventana, al
       girar el móvil y cuando la barra del navegador (URL) se recoge: sin
       esto el lienzo conservaba el tamaño CSS con el que se creó la página y
       en un teléfono de 390 px se salía siempre del área de trabajo */
    var autoPendiente = false;
    function autoAjustarPronto() {
        if (autoPendiente) return;
        autoPendiente = true;
        requestAnimationFrame(function () {
            autoPendiente = false;
            autoAjustar();
        });
    }
    window.addEventListener('resize', autoAjustarPronto);
    window.addEventListener('orientationchange', autoAjustarPronto);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', autoAjustarPronto);
    }
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) autoAjustarPronto();
    });

    /* ---------- zoom con dos dedos (móvil) ----------
       Se intercepta en fase de captura sobre el área de trabajo: mientras
       hay dos dedos Fabric no recibe ningún evento (evita que arrastre
       objetos durante el gesto) y el zoom sigue el pellizco en valor libre */
    var pinchVisto = false, pinchBase = 0, pinchZoom0 = 1;

    function dist2(t) {
        var dx = t[0].clientX - t[1].clientX;
        var dy = t[0].clientY - t[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function finPinch() {
        if (!pinchVisto) return;
        pinchVisto = false;
        zoomManual = true;   /* a partir de aquí manda el usuario */
        /* si Fabric tenía un gesto a medias por el primer dedo, se cancela
           aquí para que no haya saltos del objeto al soltar */
        if (canvas._currentTransform) canvas._currentTransform = null;
    }

    work.addEventListener('touchstart', function (e) {
        if (e.touches.length < 2) return;
        e.preventDefault();
        e.stopPropagation();
        if (!pinchVisto && e.touches.length === 2) {
            pinchVisto = true;
            pinchBase = dist2(e.touches);
            pinchZoom0 = zoom;
        }
    }, { passive: false, capture: true });

    work.addEventListener('touchmove', function (e) {
        if (!pinchVisto) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length >= 2 && pinchBase > 0) {
            aplicarZoom(pinchZoom0 * (dist2(e.touches) / pinchBase));
        }
    }, { passive: false, capture: true });

    work.addEventListener('touchend', function (e) {
        if (!pinchVisto) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length === 0) finPinch();
    }, { passive: false, capture: true });

    work.addEventListener('touchcancel', function (e) {
        if (!pinchVisto) return;
        e.preventDefault();
        e.stopPropagation();
        finPinch();
    }, { passive: false, capture: true });

    top.appendChild(sep());

    /* exportación: selector de formato + guía (traídos del panel de formatos) */
    var fmtPanel = document.querySelector('.formatos-panel');
    var btnFmt = null;
    if (fmtPanel) {
        var selFmt = fmtPanel.querySelector('#formato-salida');
        var infoFmt = fmtPanel.querySelector('#formato-info');
        var selAnclaFmt = fmtPanel.querySelector('#formato-ancla');
        var chkWrapFmt = fmtPanel.querySelector('.form-check');
        btnFmt = fmtPanel.querySelector('#formato-descargar');

        if (selFmt) {
            selFmt.setAttribute('title', 'Red / tamaño de exportación');
            top.appendChild(selFmt);
        }
        /* el ancla del recorte también sube a la barra: el panel entero se
           borra más abajo (fmtPanel.remove()), así que si se queda dentro se
           pierde el control */
        if (selAnclaFmt) {
            selAnclaFmt.classList.add('form-select-sm', 'sh-ancla');
            selAnclaFmt.setAttribute('title', 'Por dónde entra el recorte vertical');
            top.appendChild(selAnclaFmt);
        }
        if (infoFmt) {
            // sigue en el DOM para formatos.js; el tamaño lo comunica el botón
            infoFmt.classList.add('visually-hidden');
            top.appendChild(infoFmt);
        }
        if (chkWrapFmt && chkWrapFmt.querySelector('input')) {
            var chkFmt = chkWrapFmt.querySelector('input');
            var chkLblFmt = chkWrapFmt.querySelector('label');
            if (chkLblFmt) chkLblFmt.remove();
            var cajaGuia = el('span', 'sh-guia');
            cajaGuia.setAttribute('title', 'Mostrar guía de recorte');
            var lblGuia = el('label', null, '<i class="fas fa-crop-alt" aria-hidden="true"></i>');
            lblGuia.setAttribute('for', chkFmt.id);
            lblGuia.setAttribute('title', 'Mostrar guía de recorte');
            cajaGuia.appendChild(chkFmt);
            cajaGuia.appendChild(lblGuia);
            top.appendChild(cajaGuia);
        }
        // en la barra el alto lo fija .shell-top .btn; el mt-3 del panel desalineaba
        if (btnFmt) btnFmt.classList.remove('mt-3');
        fmtPanel.remove();
    }

    /* lienzo en blanco ajustado al formato elegido */
    var btnBlanco = mkBtn('fa-file', 'Lienzo en blanco al tamaño del formato');
    /* en el teléfono se oculta: es lo que empujaba la barra a tres filas y
       vacía el lienzo, así que en el móvil sigue estando en el dock */
    btnBlanco.classList.add('sh-limpiar');
    btnBlanco.addEventListener('click', function () {
        var d = window.formatosDims ? window.formatosDims() : null;
        if (!d) return;
        if (!window.confirm('¿Vaciar el lienzo y ajustarlo a ' + d.w + '×' + d.h +
                '? Se perderá el contenido actual.')) {
            return;
        }
        canvas.discardActiveObject();
        /* canvas.getObjects() devuelve una COPIA (en Fabric 2.4.3 es
           _objects.concat()), no el array vivo. Por eso el bucle
           `while (objs.length) canvas.remove(objs[0])` no terminaba nunca:
           quitaba el primer elemento, el siguiente ya no estaba en el lienzo
           y remove() no hacía nada, una y otra vez — colgaba el editor entero
           cada vez que se pulsaba «Lienzo en blanco» con algo puesto. */
        canvas.getObjects().slice().forEach(function (o) { canvas.remove(o); });
        canvas.backgroundImage = null;
        canvas.overlayImage = null;
        canvas.overlayColor = null;
        canvas.backgroundColor = '#ffffff';

        /* con el retina activo el respaldo sale a dpr²: un preset de 2560×1440
           en un móvil pedía 7680×4320 (33 Mpx) y el lienzo se quedaba negro */
        var dpr = fabric.devicePixelRatio || 1;
        var retina0 = canvas.enableRetinaScaling;
        if (d.w * d.h * dpr * dpr > 12e6) canvas.set({ enableRetinaScaling: false });

        /* el redimensionado vive en main.js (tetAjustarLienzoA): lo comparten
           este botón y la adaptación automática al cambiar de formato, y así
           no se duplica —ni se desincroniza— el cálculo del respaldo. */
        if (window.tetAjustarLienzoA) window.tetAjustarLienzoA(d);
        else {
            canvas.setDimensions({ width: d.w, height: d.h }, { backstoreOnly: true });
            canvas.set({ enableRetinaScaling: retina0 });
            canvas.calcOffset();
            canvas.renderAll();
        }

        if (typeof estado !== 'undefined' && estado) {
            estado.textContent = d.w + ' × ' + d.h + ' px';
        }
        if (window.formatosActualizar) window.formatosActualizar();
        window.dispatchEvent(new Event('resize'));
        if (window.tetGuardarEstado) window.tetGuardarEstado();
        if (window.mostrarAviso) window.mostrarAviso('Lienzo en blanco ' + d.w + '×' + d.h, 'success');
    });
    top.appendChild(btnBlanco);

    top.appendChild(el('span', 'top-spacer'));

    /* compartir (reenvía al botón de la toolbar de capas) */
    var capasShare = q('#capas-toolbar [data-act="share"]');
    if (capasShare) {
        var btnShare = mkBtn('fa-share-alt', 'Compartir imagen', 'Compartir');
        btnShare.classList.remove('btn-ghost');
        btnShare.classList.add('btn-primary');
        /* en el teléfono la barra deja los botones en 36 px de ancho y
           «Compartir» quedaba cortado, como si el botón no existiera: con esta
           clase se queda solo con el icono (el nombre sigue en el title y en el
           aria-label) */
        btnShare.classList.add('sh-share');
        btnShare.classList.add('sh-ctl');   /* primera fila de la barra en el móvil */
        btnShare.addEventListener('click', function () { reenviar('share'); });
        top.appendChild(btnShare);
    }

    /* descarga por formato: botón compacto junto a Compartir */
    if (btnFmt) top.appendChild(btnFmt);

    /* el descargador original del formulario se retira:
       el preset "Origen" del selector exporta al tamaño original.
       Documento entero y no solo el panel: en art, miniatura y modcre el botón
       estaba en la columna del lienzo y se quedaba ahí, con un segundo
       «Descargar» redundante (y, de paso, media pantalla de botones en el móvil). */
    var btnDesc = document.querySelector('[aria-label="Descargar"]');
    if (btnDesc) btnDesc.remove();

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
    /* el tema vive en el footer, junto al copyright */
    var copy = q('.tet-copy');
    if (copy) { copy.appendChild(btnTema); } else { top.appendChild(btnTema); }

    /* ---------------- rail de herramientas ----------------
       «Insertar título» y «Insertar detalles» NO se tocan: se quedan junto a su
       campo en Propiedades, que es donde el usuario escribe el texto. */
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

    /* adaptar la imagen seleccionada al lienzo (la lógica vive en capas.js) */
    var btnLlenar = mkBtn('fa-expand-arrows-alt', 'Llenar lienzo', 'Llenar');
    hacerIcono(btnLlenar);
    btnLlenar.addEventListener('click', function () {
        if (window.adaptarImagenSeleccionada) window.adaptarImagenSeleccionada('llenar');
    });
    var btnAjustar = mkBtn('fa-compress-arrows-alt', 'Ajustar al lienzo', 'Ajustar');
    hacerIcono(btnAjustar);
    btnAjustar.addEventListener('click', function () {
        if (window.adaptarImagenSeleccionada) window.adaptarImagenSeleccionada('ajustar');
    });
    rail.appendChild(btnLlenar);
    rail.appendChild(btnAjustar);

    var t5 = moverBoton('Remover seleccionado', rail); if (t5) hacerIcono(t5);

    rail.appendChild(el('span', 'shell-rail-sep'));

    /* Orden de capas. art, miniatura y modcre traen sus propios botones de
       orden en la columna del lienzo y se quedaban apilados encima del
       lienzo (cuatro botones y sus dos filas, justo donde tiene que estar el
       diseño). Si la página los trae, se suben al rail y no se crean los dos
       de siempre, que harían el mismo trabajo: los de la página ya llaman a
       toBackward/toForward. */
    var ordenPagina = ['Enviar al fondo', 'Enviar atrás', 'Traer adelante', 'Traer al frente']
        .map(function (nombre) {
            return document.querySelector('[aria-label="' + nombre + '"]');
        })
        .filter(Boolean);

    if (ordenPagina.length) {
        ordenPagina.forEach(function (b) {
            b.classList.add('btn-ghost');
            hacerIcono(b);
            rail.appendChild(b);
        });
    } else {
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
    }

    /* ---------------- dock con pestañas ---------------- */
    var tabs = el('div', 'dock-tabs');
    tabs.setAttribute('role', 'tablist');
    var panes = el('div', 'dock-panes');

    var PESTANAS = [
        { id: 'props',    icono: 'fa-pen',            texto: 'Propiedades' },
        { id: 'capas',    icono: 'fa-layer-group',    texto: 'Capas' }
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
        if (t.dataset.pane === 'capas') montarCapas(); // si el panel volvió al lienzo, se reclama
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

    var estado = el('span', null, canvas.width + ' × ' + canvas.height + ' px');
    estado.id = 'sh-estado';
    var coords = el('span', null, '—, —');
    coords.id = 'sh-coords';
    var zoomEstado = el('span', null, '100%');
    zoomEstado.id = 'sh-zoom-estado';

    var status = el('div', 'shell-status');
    status.appendChild(coords);
    status.appendChild(estado);
    status.appendChild(zoomEstado);

    dock.insertBefore(palette, panes); // en el dock, bajo las pestañas: arriba y siempre visible
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

    /* ---------------- chip de resolución (aviso de ampliación) ---------------- */
    var chipRes = el('div', 'sh-res');
    chipRes.setAttribute('role', 'status');
    work.appendChild(chipRes);

    function revisarRes() {
        var o = canvas.getActiveObject();
        var x = (o && o.type === 'image' && o.width)
            ? Math.max(o.scaleX || 1, o.scaleY || 1) : 0;
        if (x > 1.15) {
            chipRes.textContent = 'Origen ' + Math.round(o.width) + '×' +
                Math.round(o.height) + ' px · ×' + x.toFixed(1) +
                ' se verá borrosa';
            chipRes.classList.add('is-on');
        } else {
            chipRes.classList.remove('is-on');
        }
    }
    canvas.on('selection:created', revisarRes);
    canvas.on('selection:updated', revisarRes);
    canvas.on('selection:cleared', revisarRes);
    canvas.on('object:modified', revisarRes);

    /* ---------------- barra flotante de acciones ---------------- */
    /* Aparece con la selección, anclada al escenario (fuera del área que
       hace scroll, así no se va con el lienzo) y con asas de 44 px: en
       móvil las acciones sobre el objeto estaban repartidas por capas,
       el rail y el panel de propiedades. */
    var barra = el('div', 'sh-barra');
    barra.setAttribute('role', 'toolbar');
    barra.setAttribute('aria-label', 'Acciones sobre la selección');
    stage.appendChild(barra);

    /* dos grupos: acciones normales / acciones del modo recorte */
    var grupoAcciones = el('div', 'sh-barra-grupo');
    var grupoRecorte = el('div', 'sh-barra-grupo');
    grupoRecorte.hidden = true;
    barra.appendChild(grupoAcciones);
    barra.appendChild(grupoRecorte);

    function btnBar(cont, icono, titulo, fn) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sh-barra-btn';
        b.title = titulo;
        b.setAttribute('aria-label', titulo);
        b.innerHTML = '<i class="fas ' + icono + '" aria-hidden="true"></i>';
        b.addEventListener('click', fn);
        cont.appendChild(b);
        return b;
    }

    var barSubir = btnBar(grupoAcciones, 'fa-arrow-up', 'Subir capa', function () {
        if (window.toForward) window.toForward();
    });
    var barBajar = btnBar(grupoAcciones, 'fa-arrow-down', 'Bajar capa', function () {
        if (window.toBackward) window.toBackward();
    });
    var barDup = btnBar(grupoAcciones, 'fa-clone', 'Duplicar', function () {
        if (window.duplicarSeleccion) window.duplicarSeleccion();
    });
    var barMenos = btnBar(grupoAcciones, 'fa-minus', 'Reducir un poco', function () {
        escalarSeleccion(0.95);
    });
    var barMas = btnBar(grupoAcciones, 'fa-plus', 'Agrandar un poco', function () {
        escalarSeleccion(1.05);
    });
    var barRecortar = btnBar(grupoAcciones, 'fa-crop-alt', 'Recortar la imagen', function () {
        iniciarRecorte();
    });
    var barLlenar = btnBar(grupoAcciones, 'fa-expand-arrows-alt', 'Llenar el lienzo', function () {
        if (window.adaptarImagenSeleccionada) window.adaptarImagenSeleccionada('llenar');
    });
    var barAjustar = btnBar(grupoAcciones, 'fa-compress-arrows-alt', 'Ajustar al lienzo', function () {
        if (window.adaptarImagenSeleccionada) window.adaptarImagenSeleccionada('ajustar');
    });
    var barBorrar = btnBar(grupoAcciones, 'fa-trash-alt', 'Eliminar', function () {
        if (window.eliminarSeleccion) window.eliminarSeleccion();
    });
    btnBar(grupoRecorte, 'fa-times', 'Cancelar el recorte', function () {
        cancelarRecorte(true);
    });
    var btnAplicarRecorte = btnBar(grupoRecorte, 'fa-check', 'Aplicar el recorte', function () {
        aplicarRecorte();
    });
    btnAplicarRecorte.classList.add('es-primario');

    function actualizarBarra() {
        var o = canvas.getActiveObject();
        var esImagen = !!(o && o.type === 'image');
        /* recortar/llenar/ajustar solo tienen sentido sobre imágenes */
        barRecortar.style.display = esImagen ? '' : 'none';
        barLlenar.style.display = esImagen ? '' : 'none';
        barAjustar.style.display = esImagen ? '' : 'none';
        barra.classList.toggle('is-on', !!o);
    }
    canvas.on('selection:created', actualizarBarra);
    canvas.on('selection:updated', actualizarBarra);
    canvas.on('selection:cleared', actualizarBarra);
    canvas.on('object:removed', actualizarBarra);

    /* tamaño gradual de la selección: pasos de ±5 % manteniendo
       proporciones y sin mover el centro */
    function escalarSeleccion(paso) {
        var o = canvas.getActiveObject();
        if (!o) return;
        var sx = (o.scaleX || 1) * paso;
        var sy = (o.scaleY || 1) * paso;
        if (sx < 0.05 || sy < 0.05 || sx > 60 || sy > 60) return;
        var c = o.getCenterPoint();
        o.set({ scaleX: sx, scaleY: sy });
        o.setPositionByOrigin(c, 'center', 'center');
        o.setCoords();
        canvas.renderAll();
        canvas.fire('object:modified', { target: o }); /* historial + chip de resolución */
    }

    /* ---------------- recorte libre de imágenes ----------------
       El marco es un objeto Fabric con excludeFromExport: no entra en el
       panel de capas, el historial ni el .json guardado. El recorte se
       aplica desplazando cropX/cropY y ajustando width/height al origen,
       así que no se vuelve a decodificar ni a perder calidad. */
    var modoRecorte = false, entrando = false;
    var marco = null, imgRecorte = null;

    function iniciarRecorte() {
        var img = canvas.getActiveObject();
        if (modoRecorte || !img || img.type !== 'image') return;
        imgRecorte = img;
        modoRecorte = true;
        window.tetModoRecorte = true;
        var r = img.getBoundingRect();
        var tactil = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
            (!window.matchMedia && navigator.maxTouchPoints > 0);
        marco = new fabric.Rect({
            left: r.left, top: r.top, width: r.width, height: r.height,
            fill: 'rgba(13, 110, 253, 0.10)',
            stroke: '#ffffff', strokeWidth: 2, strokeDashArray: [8, 6],
            borderColor: '#0d6efd',
            cornerColor: '#ffffff', cornerStrokeColor: '#0d6efd',
            cornerSize: tactil ? 36 : 22,
            transparentCorners: false,
            lockRotation: true, hasRotatingPoint: false,
            padding: 6,
            objectCaching: false,
            excludeFromExport: true
        });
        /* entrando = los eventos de selección que se disparan a lo largo de
           esta transición no deben cancelar el modo que acaba de abrirse */
        entrando = true;
        canvas.add(marco);
        canvas.setActiveObject(marco);
        entrando = false;
        grupoAcciones.hidden = true;
        grupoRecorte.hidden = false;
        canvas.renderAll();
        if (window.mostrarAviso) {
            window.mostrarAviso('Mueve el marco y escala con las asas; Aplicar deja solo lo que encierres', 'info');
        }
    }

    function aplicarRecorte() {
        if (!modoRecorte || !imgRecorte || !marco) return;
        imgRecorte.setCoords();
        marco.setCoords();
        var ir = imgRecorte.getBoundingRect();
        var fr = marco.getBoundingRect();
        var x0 = Math.max(ir.left, fr.left);
        var y0 = Math.max(ir.top, fr.top);
        var x1 = Math.min(ir.left + ir.width, fr.left + fr.width);
        var y1 = Math.min(ir.top + ir.height, fr.top + fr.height);
        if (x1 - x0 < 4 || y1 - y0 < 4) {
            if (window.mostrarAviso) window.mostrarAviso('El marco debe tocar la imagen', 'warning');
            return; /* sigue en modo recorte */
        }
        var escX = ir.width / imgRecorte.width;
        var escY = ir.height / imgRecorte.height;
        if (!(escX > 0)) escX = imgRecorte.scaleX || 1;
        if (!(escY > 0)) escY = imgRecorte.scaleY || 1;
        var cx = imgRecorte.cropX || 0;
        var cy = imgRecorte.cropY || 0;
        var elem = imgRecorte._element;
        var natW = (elem && elem.width) || imgRecorte.width + cx;
        var natH = (elem && elem.height) || imgRecorte.height + cy;
        var srcX = Math.max(0, Math.min(cx + (x0 - ir.left) / escX, natW - 2));
        var srcY = Math.max(0, Math.min(cy + (y0 - ir.top) / escY, natH - 2));
        var srcW = Math.min((x1 - x0) / escX, natW - srcX);
        var srcH = Math.min((y1 - y0) / escY, natH - srcY);
        if (!(srcW > 1) || !(srcH > 1)) {
            if (window.mostrarAviso) window.mostrarAviso('El recorte queda demasiado pequeño', 'warning');
            return;
        }
        /* normaliza a origen superior izquierdo: la caja visible pasa a ser
           exactamente la intersección con el marco, con la escala intacta */
        imgRecorte.set({
            originX: 'left', originY: 'top',
            left: x0, top: y0,
            cropX: srcX, cropY: srcY,
            width: srcW, height: srcH
        });
        imgRecorte.setCoords();
        var img = imgRecorte;
        cancelarRecorte(false);
        canvas.setActiveObject(img);
        canvas.renderAll();
        canvas.fire('object:modified', { target: img }); /* historial + chip */
        actualizarBarra();
        revisarRes();
    }

    function cancelarRecorte(restaurarSeleccion) {
        if (!modoRecorte) return;
        modoRecorte = false;
        window.tetModoRecorte = false;
        var eraMarco = !!(marco && canvas.getActiveObject() === marco);
        var img = imgRecorte;
        if (marco) { canvas.remove(marco); marco = null; }
        imgRecorte = null;
        grupoAcciones.hidden = false;
        grupoRecorte.hidden = true;
        if (eraMarco) {
            if (restaurarSeleccion && img) canvas.setActiveObject(img);
            else canvas.discardActiveObject();
        }
        canvas.renderAll();
        actualizarBarra();
        revisarRes();
    }

    /* salir del modo si la selección cambia (toque fuera del marco) */
    function vigilarRecorte() {
        if (!modoRecorte || entrando) return;
        if (canvas.getActiveObject() !== marco) cancelarRecorte(false);
    }
    canvas.on('selection:created', vigilarRecorte);
    canvas.on('selection:updated', vigilarRecorte);
    canvas.on('selection:cleared', vigilarRecorte);

    /* cualquier interacción fuera del lienzo y de la barra (descargar,
       formato, capas…) sale del modo recorte antes de ejecutarse */
    document.addEventListener('click', function (e) {
        if (!modoRecorte) return;
        if (barra.contains(e.target) || work.contains(e.target)) return;
        cancelarRecorte(false);
    }, true);

    document.addEventListener('keydown', function (e) {
        if (modoRecorte && (e.key === 'Escape' || e.key === 'Esc')) cancelarRecorte(true);
    });

    /* al arrastrarlo el marco no puede salirse de la imagen */
    canvas.on('object:moving', function (e) {
        if (!modoRecorte || e.target !== marco || !imgRecorte) return;
        var b = imgRecorte.getBoundingRect();
        var w = marco.getScaledWidth(), h = marco.getScaledHeight();
        marco.set({
            left: Math.min(Math.max(marco.left, b.left), Math.max(b.left, b.left + b.width - w)),
            top: Math.min(Math.max(marco.top, b.top), Math.max(b.top, b.top + b.height - h))
        });
        marco.setCoords();
    });

    /* ---------------- montaje del DOM ---------------- */
    limpiarVacios();

    /* referencias ANTES de desenganchar nada: al mover lienzo/panel al shell
       (que todavía no está en el documento), document.* deja de verlos y los
       reclamos de abajo fallaban en silencio: capas fuera de su pestaña y la
       fila de colores sin subir a Propiedades */
    var filaColores = document.getElementById('fila-colores');
    var capasPanel = document.querySelector('.capas-panel');

    shell.appendChild(top);
    shell.appendChild(mid);
    shell.appendChild(bottom);
    mid.appendChild(rail);
    mid.appendChild(stage);
    mid.appendChild(dock);
    work.appendChild(lienzo);

    var paneProps = panes.querySelector('[data-pane="props"]');
    var paneCapas = panes.querySelector('[data-pane="capas"]');
    paneProps.appendChild(panel);

    /* los colores (fondo/texto) suben al inicio de Propiedades */
    if (filaColores && panel.contains(filaColores) && filaColores !== panel.firstElementChild) {
        panel.insertBefore(filaColores, panel.firstElementChild);
    }

    /* el panel de capas vive en la pestaña Capas: se reclama al montar
       (primero en document y, si aún no está enganchado, dentro del árbol
       recién movido), a los 400ms y cada vez que se abre la pestaña, por si
       algún código lo devuelve debajo del lienzo */
    function montarCapas() {
        var cp = document.querySelector('.capas-panel') ||
                 work.querySelector('.capas-panel') || capasPanel;
        if (cp && cp.parentNode !== paneCapas) paneCapas.appendChild(cp);
    }
    montarCapas();
    setTimeout(montarCapas, 400);

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

    /* «Insertar título» junto a su campo, en Propiedades. En tet1 ya estaba
       así; en art, miniatura y modcre vivía en la fila de acciones del
       lienzo y, al subir esa fila al rail, se quedaba solo encima del lienzo:
       un «H» suelto que no explica nada y ocupa sitio. */
    var campoTitulo = document.getElementById('titular');
    var btnTitulo = document.querySelector('[aria-label="Insertar título"]');

    var filaCampo = campoTitulo && campoTitulo.closest('.row');
    if (campoTitulo && btnTitulo && filaCampo &&
        !filaCampo.querySelector('[aria-label="Insertar título"]')) {
        var ancla = (campoTitulo.closest('.input-group, .form-group') || campoTitulo).parentElement;
        if (ancla && ancla.parentElement) {
            var celda = el('div', 'col-12 col-sm');
            ancla.parentElement.insertBefore(celda, ancla.nextSibling);
            celda.appendChild(btnTitulo);
            btnTitulo.classList.add('w-100');
        }
    }

    /* ---------------- estado inicial ---------------- */
    aplicarZoom(1);
    /* encaje al tamaño de pantalla: hasta ahora solo pasaba si el usuario
       pulsaba «Ajustar a pantalla», así que en un móvil el lienzo salía del
       área de trabajo y había que desplazarse en horizontal para trabajar */
    autoAjustarPronto();
    setTimeout(autoAjustarPronto, 80);
    setTimeout(autoAjustarPronto, 400);

    /* altura real de la navbar: con ella el shell llena exactamente la ventana */
    function medirNav() {
        if (navPrin) {
            document.documentElement.style.setProperty('--tet-nav-h', navPrin.offsetHeight + 'px');
        }
    }
    medirNav();
    window.addEventListener('resize', function () {
        medirNav();
        autoAjustarPronto();
    });

    // las reglas necesitan las medidas finales del layout
    setTimeout(pintarReglas, 60);
    setTimeout(pintarReglas, 400);
})();
