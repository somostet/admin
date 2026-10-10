/* ============================================================
   publicacion.js — pestaña «Publicación» del dock
   El lienzo pinta la imagen; aquí se escribe lo que va con ella:
   título, descripción y hasta 5 hashtags, con los límites de cada red a
   la vista y un copiado al portapapeles para no teclear dos veces.

   Se engancha al dock que monta shell.js (se carga después): el manejador
   de pestañas ya usa delegación sobre .dock-tab, así que basta con añadir
   el botón y su panel.

   Requiere: shell.js ya cargado y `window.mostrarAviso` (capas.js).
   ============================================================ */
(function () {
    'use strict';

    var tabs = document.querySelector('.dock-tabs');
    var panes = document.querySelector('.dock-panes');
    if (!tabs || !panes) return;

    /* límites reales por red, para no pasarse al publicar */
    var LIMITES = [
        { red: 'Instagram', n: 2200 },
        { red: 'TikTok', n: 2200 },
        { red: 'X', n: 280 },
        { red: 'Facebook', n: 63206 }
    ];
    var MAX_TITULO = 300;
    var MAX_HASHTAGS = 5;

    var CLAVE = 'tetPub:' + (location.pathname || 'tet');

    function el(tag, cls, html) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (html != null) d.innerHTML = html;
        return d;
    }
    function avisar(msg, tipo) {
        if (window.mostrarAviso) window.mostrarAviso(msg, tipo);
    }

    /* ---------------- pestaña ---------------- */
    var tab = el('button', 'dock-tab',
        '<i class="fas fa-hashtag" aria-hidden="true"></i> Publicación');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.dataset.pane = 'pub';

    var pane = el('div', 'dock-pane pub-pane');
    pane.dataset.pane = 'pub';
    pane.setAttribute('role', 'tabpanel');
    pane.innerHTML =
        '<div class="pub-caja">' +
            '<p class="pub-intro">Texto que acompaña a la imagen. Se guarda en ' +
                'este navegador y se copia con un toque.</p>' +

            '<label class="pub-et" for="pub-titulo">Título</label>' +
            '<input class="form-control" id="pub-titulo" maxlength="' + MAX_TITULO + '" ' +
                'placeholder="Título de la publicación">' +
            '<div class="pub-cuenta" id="pub-cuenta-titulo"></div>' +

            '<label class="pub-et" for="pub-descripcion">Descripción</label>' +
            '<textarea class="form-control" id="pub-descripcion" rows="5" ' +
                'placeholder="El texto que explicas en el pie del post"></textarea>' +
            '<div class="pub-cuenta" id="pub-cuenta-desc"></div>' +

            '<label class="pub-et" for="pub-hashtags">Hashtags <span class="pub-hint">hasta ' +
                MAX_HASHTAGS + ', separados por espacios o comas</span></label>' +
            '<input class="form-control" id="pub-hashtags" ' +
                'placeholder="#tecnologia #programacion #tet">' +
            '<div class="pub-tags" id="pub-tags" aria-live="polite"></div>' +

            '<label class="pub-et">Vista previa</label>' +
            '<pre class="pub-preview" id="pub-preview"></pre>' +

            '<div class="pub-acciones">' +
                '<button type="button" class="btn btn-sm btn-outline-light" id="pub-copiar-todo">' +
                    '<i class="far fa-clipboard" aria-hidden="true"></i> Copiar todo</button>' +
                '<button type="button" class="btn btn-sm btn-outline-light" id="pub-copiar-desc">' +
                    '<i class="far fa-copy" aria-hidden="true"></i> Copiar descripción</button>' +
                '<button type="button" class="btn btn-sm btn-outline-light" id="pub-copiar-tags">' +
                    '<i class="fas fa-hashtag" aria-hidden="true"></i> Copiar hashtags</button>' +
                '<button type="button" class="btn btn-sm btn-outline-light" id="pub-txt">' +
                    '<i class="fas fa-file-alt" aria-hidden="true"></i> Descargar .txt</button>' +
                '<button type="button" class="btn btn-sm btn-outline-secondary" id="pub-limpiar">' +
                    '<i class="fas fa-eraser" aria-hidden="true"></i> Limpiar</button>' +
            '</div>' +
        '</div>';

    tabs.appendChild(tab);
    panes.appendChild(pane);

    var inTitulo = pane.querySelector('#pub-titulo');
    var inDesc = pane.querySelector('#pub-descripcion');
    var inTags = pane.querySelector('#pub-hashtags');
    var cuTitulo = pane.querySelector('#pub-cuenta-titulo');
    var cuDesc = pane.querySelector('#pub-cuenta-desc');
    var chips = pane.querySelector('#pub-tags');
    var preview = pane.querySelector('#pub-preview');

    /* ---------------- hashtags ---------------- */
    function listaTags(bruto) {
        var vistos = {}, out = [];
        (bruto || '').split(/[\s,;]+/).forEach(function (t) {
            t = t.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
            if (!t) return;
            var clave = t.toLowerCase();
            if (vistos[clave]) return;      // sin repetir, aunque sea #Tet y #tet
            vistos[clave] = 1;
            out.push('#' + t);
        });
        return out.slice(0, MAX_HASHTAGS);
    }
    function normalizarTags(bruto) { return listaTags(bruto).join(' '); }
    function tagsAviso(bruto) {
        var cuantos = (bruto || '').split(/[\s,;]+/).filter(function (t) {
            return t.replace(/^#+/, '').length;
        }).length;
        return Math.max(0, cuantos - MAX_HASHTAGS);
    }

    function pintarChips() {
        var lista = listaTags(inTags.value);
        chips.innerHTML = '';
        lista.forEach(function (t) {
            var s = el('span', 'pub-chip', t);
            chips.appendChild(s);
        });
        if (!lista.length) {
            chips.appendChild(el('span', 'pub-chip-vacio', 'Sin hashtags todavía'));
        }
        var sobran = tagsAviso(inTags.value);
        if (sobran) {
            chips.appendChild(el('span', 'pub-chip-sobran',
                '+' + sobran + ' fuera (solo se usan ' + MAX_HASHTAGS + ')'));
        }
    }

    /* ---------------- contadores por red ---------------- */
    function pintarCuentas() {
        var t = inTitulo.value.length;
        var d = inDesc.value.length;
        cuTitulo.innerHTML = t + ' / ' + MAX_TITULO;
        cuDesc.innerHTML = d + ' caracteres';
        LIMITES.forEach(function (L) {
            var sobra = d > L.n;
            var s = el('span', 'pub-lim' + (sobra ? ' es-excedido' : ''),
                L.red + ' ' + d + '/' + L.n);
            cuDesc.appendChild(s);
        });
        if (t > MAX_TITULO) cuTitulo.className = 'pub-cuenta es-excedido';
        else cuTitulo.className = 'pub-cuenta';
    }

    /* ---------------- vista previa ---------------- */
    function textoCompleto() {
        var t = inTitulo.value.trim();
        var d = inDesc.value.trim();
        var g = normalizarTags(inTags.value);
        var out = [];
        if (t) out.push(t);
        if (d) out.push(d);
        if (g) out.push(g);
        return out.join('\n\n');
    }
    function pintarPreview() {
        var txt = textoCompleto();
        preview.textContent = txt || 'Aquí aparecerá el texto tal cual se copiará.';
        preview.classList.toggle('es-vacio', !txt);
    }

    /* ---------------- persistencia ---------------- */
    var guardando = false;
    function guardar() {
        if (guardando) return;
        guardando = true;
        try {
            localStorage.setItem(CLAVE, JSON.stringify({
                t: inTitulo.value, d: inDesc.value, g: inTags.value
            }));
        } catch (e) { /* modo privado: se pierde al recargar, nada más */ }
        guardando = false;
    }
    function cargar() {
        try {
            var raw = localStorage.getItem(CLAVE);
            if (!raw) return;
            var o = JSON.parse(raw);
            inTitulo.value = o.t || '';
            inDesc.value = o.d || '';
            inTags.value = o.g || '';
        } catch (e) { /* dato corrupto: se empieza vacío */ }
    }

    /* ---------------- portapapeles ---------------- */
    function copiarLegado(txt) {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
        avisar(ok ? 'Copiado al portapapeles'
            : 'No se pudo copiar: selecciona el texto a mano',
            ok ? 'success' : 'warning');
    }
    function copiar(txt, vacio) {
        if (!txt) { avisar(vacio || 'No hay nada que copiar', 'warning'); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt)
                .then(function () { avisar('Copiado al portapapeles', 'success'); })
                .catch(function () { copiarLegado(txt); });
        } else {
            copiarLegado(txt);
        }
    }

    /* ---------------- eventos ---------------- */
    function refrescar() { pintarChips(); pintarCuentas(); pintarPreview(); guardar(); }

    inTags.addEventListener('input', function () {
        /* se normaliza en caliente: al teclear el 6.º hashtag se sustituye
           por los cinco primeros en vez de dejar un aviso que hay que leer */
        var limpio = normalizarTags(inTags.value);
        if (limpio !== inTags.value) inTags.value = limpio;
        refrescar();
    });
    inTitulo.addEventListener('input', function () {
        refrescar();
        var t = document.getElementById('titular');
        if (t && t.value !== inTitulo.value) t.value = inTitulo.value;
    });
    inDesc.addEventListener('input', refrescar);

    /* el campo del lienzo y el del panel cuentan la misma historia */
    var titularLienzo = document.getElementById('titular');
    if (titularLienzo) {
        titularLienzo.addEventListener('input', function () {
            if (titularLienzo.value === inTitulo.value) return;
            inTitulo.value = titularLienzo.value;
            refrescar();
        });
    }

    pane.querySelector('#pub-copiar-todo').addEventListener('click', function () {
        copiar(textoCompleto(), 'Escribe primero el título o la descripción');
    });
    pane.querySelector('#pub-copiar-desc').addEventListener('click', function () {
        copiar(inDesc.value.trim(), 'La descripción está vacía');
    });
    pane.querySelector('#pub-copiar-tags').addEventListener('click', function () {
        copiar(normalizarTags(inTags.value), 'No hay hashtags');
    });
    pane.querySelector('#pub-txt').addEventListener('click', function () {
        var txt = textoCompleto();
        if (!txt) { avisar('No hay texto que descargar', 'warning'); return; }
        var blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'tet-publicacion.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        avisar('texto tet-publicacion.txt descargado', 'success');
    });
    pane.querySelector('#pub-limpiar').addEventListener('click', function () {
        inTitulo.value = '';
        inDesc.value = '';
        inTags.value = '';
        if (titularLienzo) titularLienzo.value = '';
        refrescar();
        avisar('Texto de la publicación borrado', 'info');
    });

    cargar();
    refrescar();
})();