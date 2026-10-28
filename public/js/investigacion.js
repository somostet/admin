/* ============================================================
   investigacion.js — pestaña «Investigar» del dock (tet1)

   El problema: para documentar una noticia había que abrir otra pestaña,
   escribir la búsqueda a mano, volver, copiar el titular, buscar imágenes,
   inventar un prompt… y repetirlo en cada tarjeta. Aquí el tema se escribe
   una vez (o sale solo del título del lienzo) y todo lo demás va detrás.

   Por qué son enlaces y no una API de IA
   --------------------------------------
   La CSP del proyecto es `connect-src 'self'` y `img-src 'self' data: blob:`:
   una llamada a Gemini, OpenAI o Google desde esta página la bloquearía el
   navegador, y además haría falta una clave que no puede vivir en un sitio
   estático (cualquiera la leería). Los enlaces no necesitan nada de eso:
   abren el servicio en una pestaña nueva con la sesión que ya tengas, sin
   claves, sin cuentas y sin que el editor envíe el trabajo a ningún sitio.
   Los prompts se copian al portapapeles, que es el «pegamento» entre el
   editor y la IA que elijas.

   Requiere: shell.js ya montado (dock) y, opcionalmente, los campos
   #titular / #detalles / #color del formulario de tet1.
   ============================================================ */
(function () {
    'use strict';

    var tabs = document.querySelector('.dock-tabs');
    var panes = document.querySelector('.dock-panes');
    if (!tabs || !panes) return;
    /* si se cargara dos veces, el dock tendría dos pestañas iguales */
    if (document.querySelector('.dock-tab[data-pane="inv"]')) return;

    var CLAVE = 'tetInv:' + (location.pathname || 'tet');

    function el(tag, cls, html) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (html != null) d.innerHTML = html;
        return d;
    }
    function avisar(msg, tipo) {
        if (window.mostrarAviso) window.mostrarAviso(msg, tipo);
        else console.info(msg);
    }
    function enc(q) { return encodeURIComponent(q || '').replace(/%20/g, '+'); }
    function encRuta(q) { return encodeURIComponent(q || ''); }
    function campo(id) { return document.getElementById(id); }

    /* ---------- pestaña y panel ---------- */
    var tab = el('button', 'dock-tab',
        '<i class="fas fa-search" aria-hidden="true"></i> Investigar');
    tab.type = 'button';
    tab.dataset.pane = 'inv';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.title = 'Buscar información e imágenes, y generar prompts, sin salir del editor';

    var pane = el('div', 'dock-pane');
    pane.dataset.pane = 'inv';
    pane.setAttribute('role', 'tabpanel');
    pane.innerHTML = [
        '<div class="inv-caja">',
        '  <p class="inv-intro">Escribe el tema una vez. Las búsquedas se abren en una ',
        '     pestaña nueva con tu sesión de siempre; los prompts se copian solos.</p>',

        '  <label class="inv-et" for="inv-q">Tema de la noticia</label>',
        '  <div class="inv-campo">',
        '    <input class="form-control" id="inv-q" type="search" autocomplete="off" ',
        '           placeholder="Ej.: nuevo iPhone, estreno de…" aria-label="Tema que quieres buscar">',
        '    <button type="button" class="inv-mini" id="inv-titulo" ',
        '            title="Traer el título del lienzo" aria-label="Traer el título del lienzo">',
        '      <i class="fas fa-heading" aria-hidden="true"></i></button>',
        '  </div>',
        '  <p class="inv-pista" id="inv-claves"></p>',

        '  <section class="inv-sec">',
        '    <h3 class="inv-sec-tit"><i class="fas fa-info-circle" aria-hidden="true"></i> Información y contexto</h3>',
        '    <div class="inv-grid" id="inv-info"></div>',
        '    <p class="inv-pista">Google IA, Perplexity y Copilot responden con enlaces: úsalos ',
        '       para contrastar el dato antes de escribirlo.</p>',
        '  </section>',

        '  <section class="inv-sec">',
        '    <h3 class="inv-sec-tit"><i class="fas fa-images" aria-hidden="true"></i> Imágenes libres</h3>',
        '    <div class="inv-grid" id="inv-img"></div>',
        '    <p class="inv-pista">Buscan con las palabras clave (sin artículos ni conectores). ',
        '       Google va filtrado a licencias libres; comprueba siempre la licencia y cita la fuente.</p>',
        '  </section>',

        '  <section class="inv-sec">',
        '    <h3 class="inv-sec-tit"><i class="fas fa-robot" aria-hidden="true"></i> Imagen con IA (gratis)</h3>',
        '    <div class="inv-fila">',
        '      <label class="inv-lbl" for="inv-estilo">Estilo</label>',
        '      <select class="form-select inv-select" id="inv-estilo"></select>',
        '    </div>',
        '    <div class="inv-fila inv-fila-prompt">',
        '      <label class="inv-et" for="inv-prompt">Prompt</label>',
        '      <button type="button" class="inv-mini" id="inv-rehacer" ',
        '              title="Volver a componerlo con el título, el estilo y los colores del lienzo">',
        '        <i class="fas fa-redo" aria-hidden="true"></i> Recomponer</button>',
        '    </div>',
        '    <textarea class="form-control inv-prompt" id="inv-prompt" rows="6" spellcheck="false" ',
        '              aria-label="Prompt para generar la imagen"></textarea>',
        '    <div class="inv-acciones">',
        '      <button type="button" class="inv-boton primario" id="inv-generar">',
        '        <i class="fas fa-magic" aria-hidden="true"></i> Generar e insertar</button>',
        '      <button type="button" class="inv-boton" id="inv-copiar-prompt">',
        '        <i class="far fa-copy" aria-hidden="true"></i> Copiar prompt</button>',
        '    </div>',
        '    <label class="inv-et" for="inv-url">…o pega la URL de una imagen</label>',
        '    <div class="inv-campo">',
        '      <input class="form-control" id="inv-url" type="url" inputmode="url" autocomplete="off" ',
        '             placeholder="https://…/imagen.jpg" ',
        '             aria-label="URL de la imagen que quieres insertar en el lienzo">',
        '      <button type="button" class="inv-boton" id="inv-insertar-url" ',
        '              title="Traer la imagen y colocarla en el lienzo">',
        '        <i class="fas fa-arrow-down" aria-hidden="true"></i> Insertar</button>',
        '      <button type="button" class="inv-mini" id="inv-abrir-url" ',
        '              title="Abrir la imagen en una pestaña" aria-label="Abrir la imagen en una pestaña">',
        '        <i class="fas fa-external-link-alt" aria-hidden="true"></i></button>',
        '    </div>',
        '    <div class="inv-grid" id="inv-ia-img"></div>',
        '    <p class="inv-pista">«Generar e insertar» pide la imagen a Pollinations (gratis, sin ',
        '       cuenta ni clave) y la coloca centrada en el lienzo. También vale la URL de ',
        '       cualquier imagen que permita CORS; si no, el aviso lo dice y hay que guardarla y ',
        '       usar «Cargar una imagen…».</p>',
        '  </section>',

        '  <details class="inv-detalles">',
        '    <summary><i class="fas fa-lightbulb" aria-hidden="true"></i> Prompt para preguntar a una IA</summary>',
        '    <textarea class="form-control inv-prompt" id="inv-prompt-info" rows="9" ',
        '              aria-label="Prompt de investigación"></textarea>',
        '    <div class="inv-acciones">',
        '      <button type="button" class="inv-boton" id="inv-copiar-info">',
        '        <i class="far fa-copy" aria-hidden="true"></i> Copiar</button>',
        '      <button type="button" class="inv-boton" id="inv-abrir-info">',
        '        <i class="fas fa-external-link-alt" aria-hidden="true"></i> Copiar y abrir Gemini</button>',
        '    </div>',
        '  </details>',

        '  <p class="inv-pista inv-pie">El editor no envía nada a ningún servidor: todo esto son ',
        '     enlaces y texto en el portapapeles.</p>',
        '</div>'
    ].join('');

    tabs.appendChild(tab);
    panes.appendChild(pane);

    var inQ = pane.querySelector('#inv-q');
    var btnTitulo = pane.querySelector('#inv-titulo');
    var pClaves = pane.querySelector('#inv-claves');
    var cajaInfo = pane.querySelector('#inv-info');
    var cajaImg = pane.querySelector('#inv-img');
    var cajaIa = pane.querySelector('#inv-ia-img');
    var selEstilo = pane.querySelector('#inv-estilo');
    var inPrompt = pane.querySelector('#inv-prompt');
    var btnGenerar = pane.querySelector('#inv-generar');
    var btnCopiarPrompt = pane.querySelector('#inv-copiar-prompt');
    var btnRehacer = pane.querySelector('#inv-rehacer');
    var inUrl = pane.querySelector('#inv-url');
    var btnInsertarUrl = pane.querySelector('#inv-insertar-url');
    var btnAbrirUrl = pane.querySelector('#inv-abrir-url');
    var inPromptInfo = pane.querySelector('#inv-prompt-info');
    var btnCopiarInfo = pane.querySelector('#inv-copiar-info');
    var btnAbrirInfo = pane.querySelector('#inv-abrir-info');


    /* ============================================================
       1 · TEMA Y PALABRAS CLAVE
       ============================================================ */
    var VACIAS = ('el la los las un una unos unas de del al a y o u en con por para que se su sus lo ' +
        'como mas más este esta estos estas ese esa esos esas mi tu sus te me nos le les es son fue ' +
        'the of and to in on for with a an is are').split(' ');

    /* «Apple presenta el nuevo iPhone 17» → «Apple presenta nuevo iPhone 17»:
       para imágenes conviene quitar artículos y conectores, y quedarse con lo
       que de verdad describe el tema. */
    function palabrasClave(t) {
        var limpio = (t || '')
            .replace(/[«»"'“”`.,;:!?¡¿()\[\]{}<>/\\|@#$%^&*+=~]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        var out = limpio.split(' ').filter(function (w) {
            return w && VACIAS.indexOf(w.toLowerCase()) === -1;
        });
        return out.slice(0, 6).join(' ');
    }


    /* ============================================================
       2 · DESTINOS
       ============================================================ */

    /* Información. `copiar` = el servicio no acepta la pregunta por URL
       (Gemini): se copia el prompt de investigación y se abre la página. */
    var INFO = [
        {
            n: 'Google IA', i: 'fa-magic',
            t: 'Modo IA de Google: respuesta larga con fuentes',
            base: 'https://www.google.com/search?udm=50',
            url: function (q) { return 'https://www.google.com/search?udm=50&q=' + enc(q); }
        },
        {
            n: 'Perplexity', i: 'fa-search',
            t: 'Perplexity: respuestas con enlaces a la fuente',
            base: 'https://www.perplexity.ai/',
            url: function (q) { return 'https://www.perplexity.ai/search?q=' + enc(q); }
        },
        {
            n: 'Copilot', i: 'fa-robot',
            t: 'Copilot de Microsoft (Bing)',
            base: 'https://copilot.microsoft.com/',
            url: function (q) { return 'https://copilot.microsoft.com/?q=' + enc(q); }
        },
        {
            n: 'Gemini', i: 'fa-star', copiar: true,
            t: 'Gemini: abre la página y deja el prompt copiado',
            base: 'https://gemini.google.com/app',
            url: function () { return 'https://gemini.google.com/app'; }
        },
        {
            n: 'ChatGPT', i: 'fa-comment-dots',
            t: 'ChatGPT con la pregunta ya escrita',
            base: 'https://chatgpt.com/',
            url: function (q) { return 'https://chatgpt.com/?q=' + enc(q); }
        },
        {
            n: 'Wikipedia', i: 'fa-book',
            t: 'Wikipedia en español',
            base: 'https://es.wikipedia.org/',
            url: function (q) { return 'https://es.wikipedia.org/w/index.php?search=' + enc(q); }
        }
    ];

    /* Imágenes libres. Todas usan palabras clave, no la frase entera. */
    var IMG = [
        {
            n: 'Google · libre', i: 'fa-google', f: 'fab',
            t: 'Google Imágenes filtrado por licencia de uso libre (Creative Commons)',
            base: 'https://www.google.com/search?tbm=isch',
            url: function (q) { return 'https://www.google.com/search?tbm=isch&q=' + enc(q) + '&tbs=il:cl'; }
        },
        {
            n: 'Openverse', i: 'fa-creative-commons', f: 'fab',
            t: 'Openverse: imágenes y audio con licencia abierta',
            base: 'https://openverse.org/search/image',
            url: function (q) { return 'https://openverse.org/search/image?q=' + enc(q); }
        },
        {
            n: 'Unsplash', i: 'fa-camera',
            t: 'Unsplash: fotografía gratuita',
            base: 'https://unsplash.com/',
            url: function (q) { return 'https://unsplash.com/s/photos/' + encRuta(q); }
        },
        {
            n: 'Pexels', i: 'fa-camera-retro',
            t: 'Pexels: fotos y vídeos gratuitos',
            base: 'https://www.pexels.com/',
            url: function (q) { return 'https://www.pexels.com/search/' + encRuta(q) + '/'; }
        },
        {
            n: 'Pixabay', i: 'fa-palette',
            t: 'Pixabay: fotos e ilustraciones gratuitas',
            base: 'https://pixabay.com/images/search/',
            url: function (q) { return 'https://pixabay.com/images/search/' + encRuta(q) + '/'; }
        },
        {
            n: 'Wikimedia', i: 'fa-landmark',
            t: 'Wikimedia Commons: material libre y documental',
            base: 'https://commons.wikimedia.org/',
            url: function (q) {
                return 'https://commons.wikimedia.org/w/index.php?search=' + enc(q) +
                    '&title=Special:MediaSearch&type=image';
            }
        }
    ];

    /* Generadores de imagen. Sin clave: Pollinations (directo) y Bing
       (cuenta de Microsoft, gratis). El resto recibe el prompt copiado. */
    var IA_IMG = [
        {
            n: 'Bing Image Creator', i: 'fa-bolt',
            t: 'Bing Image Creator (gratis con cuenta de Microsoft)',
            url: function (p) { return 'https://www.bing.com/images/create?q=' + enc(p); }
        },
        {
            n: 'Ideogram', i: 'fa-pen-nib', copiar: 'imagen',
            t: 'Ideogram',
            url: function () { return 'https://ideogram.ai/'; }
        },
        {
            n: 'Leonardo', i: 'fa-dragon', copiar: 'imagen',
            t: 'Leonardo AI',
            url: function () { return 'https://app.leonardo.ai/'; }
        }
    ];


    /* ============================================================
       3 · ENLACES
       ============================================================ */
    function crearEnlaces(caja, lista, clase) {
        return lista.map(function (s) {
            var a = el('a', 'inv-link' + (clase ? ' ' + clase : ''),
                '<i class="' + (s.f || 'fas') + ' ' + s.i + '" aria-hidden="true"></i> ' + s.n);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.title = s.t || s.n;
            a.href = s.base;
            a.dataset.servicio = s.n;
            if (s.copiar) {
                a.addEventListener('click', function () {
                    /* los generadores de imagen reciben el prompt de imagen;
                       los asistentes, el de investigación */
                    var texto = s.copiar === 'imagen'
                        ? inPrompt.value
                        : textoPromptInfo();
                    copiar(texto, s.copiar === 'imagen'
                        ? 'Prompt de imagen copiado: pégalo en «' + s.n + '»'
                        : 'Prompt de investigación copiado: pégalo al abrir');
                });
            }
            caja.appendChild(a);
            return { s: s, a: a };
        });
    }

    var enlacesInfo = crearEnlaces(cajaInfo, INFO);
    var enlacesImg = crearEnlaces(cajaImg, IMG);
    var enlacesIa = crearEnlaces(cajaIa, IA_IMG, 'inv-link-ia');


    /* ============================================================
       4 · PROMPTS
       ============================================================ */
    var ESTILOS = [
        {
            v: 'foto', n: 'Foto editorial',
            p: 'editorial photograph, natural window light, shallow depth of field, ' +
                'realistic textures, magazine quality'
        },
        {
            v: '3d', n: 'Render 3D',
            p: 'clean 3D render, soft studio lighting, glossy materials, high detail, ' +
                'octane render look'
        },
        {
            v: 'ilustracion', n: 'Ilustración',
            p: 'modern flat vector illustration, bold shapes, subtle grain, ' +
                'editorial illustration'
        },
        {
            v: 'tech', n: 'Tecnología / neón',
            p: 'futuristic technology scene, neon rim light, dark background with ' +
                'glowing accents, cinematic'
        },
        {
            v: 'abstracto', n: 'Abstracto',
            p: 'abstract geometric composition, gradient shapes, generous negative ' +
                'space, minimal'
        },
        {
            v: 'comic', n: 'Cómic',
            p: 'comic book style illustration, halftone dots, strong ink outlines, dynamic'
        },
        {
            v: 'producto', n: 'Producto',
            p: 'product photography on a seamless background, soft shadows, high detail'
        }
    ];

    ESTILOS.forEach(function (e) {
        var o = el('option', null, e.n);
        o.value = e.v;
        selEstilo.appendChild(o);
    });

    function estiloActual() {
        var v = selEstilo.value;
        for (var i = 0; i < ESTILOS.length; i++) {
            if (ESTILOS[i].v === v) return ESTILOS[i];
        }
        return ESTILOS[0];
    }
    function colorDe(id, porDefecto) {
        var inp = campo(id);
        return (inp && inp.value ? inp.value : porDefecto).toUpperCase();
    }
    /* El prompt hereda el tamaño del lienzo: así la foto nace con el formato
       de la plantilla y no hay que recortarla luego. */
    function medidas() {
        var w = 1200, h = 1200;
        if (typeof canvas !== 'undefined' && canvas && canvas.getWidth) {
            w = Math.round(canvas.getWidth()) || w;
            h = Math.round(canvas.getHeight()) || h;
        }
        return { w: w, h: h };
    }
    function detalleCorto() {
        var d = campo('detalles');
        return (d && d.value ? d.value : '').replace(/\s+/g, ' ').trim().slice(0, 260);
    }
    function tema() {
        return (inQ.value || '').trim() ||
            (campo('titular') && campo('titular').value ? campo('titular').value.trim() : '');
    }

    /* Prompt en inglés: los generadores de imagen entienden mejor las
       etiquetas de estilo en inglés, pero el tema viaja tal cual se escribe. */
    function componerPrompt() {
        var t = tema() || 'tecnología';
        var det = detalleCorto();
        var m = medidas();
        var partes = [
            'Editorial image for a technology news card about "' + t + '".'
        ];
        if (det) partes.push('Context: ' + det + '.');
        partes.push('Style: ' + estiloActual().p + '.');
        partes.push('Composition: one clear subject, centred, generous empty space at the ' +
            'top and bottom, soft even lighting.');
        partes.push('Colour palette: ' + colorDe('color', '#ffffff') + ' background with ' +
            colorDe('colorT', '#000000') + ' accents.');
        partes.push('No text, no letters, no numbers, no logos, no watermark, no interface.');
        partes.push('Aspect ratio ' + m.w + ':' + m.h + '.');
        return partes.join(' ');
    }

    /* Prompt de investigación: pide datos con fuente y descarta el invento,
       que es justo lo que hay que vigilar al documentar una noticia. */
    function textoPromptInfo() {
        var t = tema();
        var det = detalleCorto();
        var lineas = [
            'Actúa como documentalista del proyecto tet: divulgación de tecnología en ' +
                'español, tono cercano y riguroso.',
            t ? 'Tema: «' + t + '».' : 'Tema: (escríbelo aquí).',
            det ? 'Contexto que ya tengo: ' + det : '',
            '',
            'Necesito, para una tarjeta de noticias:',
            '1. Cinco datos clave y verificables, cada uno con su fecha y un enlace a la fuente original.',
            '2. Contexto en tres frases: qué ha pasado, por qué importa ahora y a quién afecta.',
            '3. Tres titulares posibles, claros y sin clickbait.',
            '4. Cinco palabras clave en inglés para buscar imágenes con licencia libre.',
            '5. Qué dato conviene comprobar antes de publicar y qué riesgo hay si es falso.',
            '',
            'Si no estás seguro de un dato o de una fuente, dilo en vez de inventarlo. ' +
                'Responde en español.'
        ];
        return lineas.filter(function (l) { return l !== ''; }).join('\n');
    }

    /* Se respeta lo que el usuario haya escrito: solo se recompone solo
       mientras no haya tocado el textarea. */
    var promptTocado = false;
    var infoTocado = false;

    function pintarPrompt(forzar) {
        if (forzar) promptTocado = false;
        if (!promptTocado) inPrompt.value = componerPrompt();
    }
    function pintarInfo(forzar) {
        if (forzar) infoTocado = false;
        if (!infoTocado) inPromptInfo.value = textoPromptInfo();
    }

    /* Pollinations pinta la imagen al abrir la URL: sin clave, sin cuenta y
       sin registro. Cada clic cambia la semilla, así que da versiones
       distintas del mismo prompt. */
    function urlPollinations(prompt) {
        var m = medidas();
        var semilla = Math.floor(Math.random() * 1000000);
        return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
            '?width=' + m.w + '&height=' + m.h + '&nologo=true&seed=' + semilla;
    }


    /* ============================================================
       4b · TRAER UNA IMAGEN AL LIENZO DESDE SU URL
       ------------------------------------------------------------
       Se carga con crossOrigin="anonymous" (Pollinations manda
       Access-Control-Allow-Origin: *) y antes de añadirla se prueba en un
       canvas de 1×1. Si el servidor no permite CORS, el navegador deja la
       imagen «tainted»: el lienzo se vería bien, pero Descargar y Compartir
       fallarían con un error opaco. Mejor detectarlo aquí y no añadirla.
       ============================================================ */
    var insertando = false;

    function imagenLimpia(el) {
        try {
            var c = document.createElement('canvas');
            c.width = 1;
            c.height = 1;
            c.getContext('2d').drawImage(el, 0, 0, 1, 1);
            c.toDataURL();
            return true;
        } catch (e) {
            return false;
        }
    }

    function botonesOcupados(ocupado) {
        btnGenerar.disabled = ocupado;
        btnInsertarUrl.disabled = ocupado;
    }

    function insertarImagen(url, mensaje) {
        var limpia = (url || '').trim();
        if (!/^https?:\/\/\S+$/i.test(limpia)) {
            avisar('Pega una URL de imagen que empiece por http:// o https://', 'warning');
            return;
        }
        if (typeof canvas === 'undefined' || !canvas || typeof fabric === 'undefined') {
            avisar('El lienzo todavía no está listo', 'danger');
            return;
        }
        if (insertando) {
            avisar('Ya hay una imagen en camino: espera a que termine', 'info');
            return;
        }

        insertando = true;
        botonesOcupados(true);
        inUrl.value = limpia;
        avisar(mensaje || 'Trayendo la imagen…', 'info');

        /* Pollinations puede tardar: sin este reloj, un fallo silencioso
           dejaba los botones bloqueados para siempre. */
        var terminado = false;
        var reloj = setTimeout(function () {
            if (terminado) return;
            terminado = true;
            insertando = false;
            botonesOcupados(false);
            avisar('La imagen está tardando demasiado. Prueba a abrirla en una pestaña y cárgala a mano', 'warning');
        }, 90000);

        var el = new Image();
        el.crossOrigin = 'anonymous';
        el.decoding = 'async';

        el.onload = function () {
            if (terminado) return;
            terminado = true;
            clearTimeout(reloj);
            insertando = false;
            botonesOcupados(false);

            if (!el.naturalWidth) {
                avisar('La URL no devuelve una imagen válida', 'danger');
                return;
            }
            if (!imagenLimpia(el)) {
                avisar('Esa imagen no permite CORS: al descargar el lienzo saldría bloqueado. ' +
                    'Guárdala y usa «Cargar una imagen…»', 'warning');
                return;
            }

            var foto = new fabric.Image(el);
            /* como en Galería: sin foco de selección dentro de la captura y,
               si existe, el colocador común (centra, escala y adapta el fondo) */
            canvas.discardActiveObject();
            if (typeof window.colocarImagenNueva === 'function') {
                window.colocarImagenNueva(foto);
            } else {
                canvas.add(foto);
                canvas.setActiveObject(foto);
                canvas.renderAll();
            }
            if (window.tetGuardarEstado) window.tetGuardarEstado();
            avisar('Imagen insertada · muévela o escálala con las asas', 'success');
        };

        el.onerror = function () {
            if (terminado) return;
            terminado = true;
            clearTimeout(reloj);
            insertando = false;
            botonesOcupados(false);
            avisar('No se pudo cargar la imagen (URL rota, sin permiso CORS o dominio no ' +
                'permitido por la CSP). Ábrela en una pestaña y guárdala', 'danger');
        };

        el.src = limpia;
    }


    /* ============================================================
       5 · ESTADO Y REFRESCO
       ============================================================ */
    var qManual = false;

    function refrescar() {
        var q = (inQ.value || '').trim();
        var k = palabrasClave(q) || q;

        /* los prompts primero: los enlaces de IA usan el texto ya compuesto */
        pintarPrompt(false);
        pintarInfo(false);

        enlacesInfo.forEach(function (o) {
            o.a.href = q ? o.s.url(q) : o.s.base;
        });
        enlacesImg.forEach(function (o) {
            o.a.href = k ? o.s.url(k) : o.s.base;
        });
        enlacesIa.forEach(function (o) {
            o.a.href = o.s.url(inPrompt.value);
        });

        pClaves.textContent = k
            ? 'Imágenes buscarán: «' + k + '»'
            : 'Escribe el tema o trae el título del lienzo para activar las búsquedas.';
    }

    function guardar() {
        try { localStorage.setItem(CLAVE, inQ.value); }
        catch (e) { /* modo privado: se pierde al recargar, nada más */ }
    }
    function cargar() {
        try {
            var guardado = localStorage.getItem(CLAVE);
            if (guardado) inQ.value = guardado;
        } catch (e) { /* dato corrupto: se empieza vacío */ }
    }

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
        return ok;
    }
    function copiar(txt, exito) {
        if (!txt) { avisar('No hay nada que copiar todavía', 'warning'); return; }
        var listo = function () { avisar(exito || 'Copiado al portapapeles', 'success'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(listo).catch(function () { copiarLegado(txt); });
        } else {
            copiarLegado(txt);
        }
    }


    /* ============================================================
       6 · EVENTOS
       ============================================================ */
    inQ.addEventListener('input', function () {
        qManual = true;
        refrescar();
        guardar();
    });

    btnTitulo.addEventListener('click', function () {
        var t = campo('titular');
        if (!t || !t.value.trim()) {
            avisar('El título del lienzo está vacío', 'warning');
            return;
        }
        inQ.value = t.value.trim();
        qManual = false;
        refrescar();
        guardar();
        avisar('Título traído al buscador', 'info');
    });

    selEstilo.addEventListener('change', function () { pintarPrompt(false); });

    inPrompt.addEventListener('input', function () {
        promptTocado = true;
        enlacesIa.forEach(function (o) { o.a.href = o.s.url(inPrompt.value); });
    });

    btnRehacer.addEventListener('click', function () {
        pintarPrompt(true);
        enlacesIa.forEach(function (o) { o.a.href = o.s.url(inPrompt.value); });
        avisar('Prompt recompuesto con el título y el estilo actuales', 'info');
    });

    btnCopiarPrompt.addEventListener('click', function () {
        copiar(inPrompt.value.trim(), 'Prompt copiado: pégalo en la IA que uses');
    });

    btnGenerar.addEventListener('click', function () {
        var p = inPrompt.value.trim();
        if (!p) {
            pintarPrompt(true);
            p = inPrompt.value.trim();
        }
        var url = urlPollinations(p);
        var v = window.open(url, '_blank', 'noopener');
        if (!v) {
            avisar('El navegador bloqueó la pestaña: permite las ventanas emergentes', 'warning');
            return;
        }
        avisar('Generando la imagen… puede tardar unos segundos en abrirse', 'info');
    });

    inPromptInfo.addEventListener('input', function () { infoTocado = true; });

    btnCopiarInfo.addEventListener('click', function () {
        if (!inPromptInfo.value.trim()) pintarInfo(true);
        copiar(inPromptInfo.value.trim(), 'Prompt de investigación copiado');
    });

    btnAbrirInfo.addEventListener('click', function () {
        if (!inPromptInfo.value.trim()) pintarInfo(true);
        /* el enlace se abre igualmente: el portapapeles es una ayuda, no un
           requisito (en file:// algunos navegadores lo niegan) */
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inPromptInfo.value).then(function () {
                avisar('Copiado: pégalo con Ctrl+V en Gemini', 'success');
            }).catch(function () { copiarLegado(inPromptInfo.value); });
        } else {
            copiarLegado(inPromptInfo.value);
        }
        window.open('https://gemini.google.com/app', '_blank', 'noopener');
    });

    /* El título y el detalle del lienzo alimentan las búsquedas en vivo
       mientras no se haya escrito un tema a mano. */
    var inTitular = campo('titular');
    if (inTitular) {
        inTitular.addEventListener('input', function () {
            if (qManual) return;
            inQ.value = inTitular.value;
            refrescar();
            guardar();
        });
    }
    var inDetalles = campo('detalles');
    if (inDetalles) {
        inDetalles.addEventListener('input', function () {
            pintarPrompt(false);
            pintarInfo(false);
        });
    }
    ['color', 'colorT'].forEach(function (id) {
        var inp = campo(id);
        if (inp) inp.addEventListener('input', function () { pintarPrompt(false); });
    });

    cargar();
    if (!inQ.value.trim() && inTitular) inQ.value = inTitular.value.trim();
    refrescar();
})();
