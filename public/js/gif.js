/* Creador de GIF — modo "varías imágenes → GIF" (lote D1)
   Motor: gifenc (vendor local, window.GIFEnc) — síncrono y sin Web Workers,
   así funciona igual en doble clic (file://) y en GitHub Pages.
   La codificación avanza fotograma a fotograma con setTimeout para no
   congelar la interfaz (sobre todo en el móvil). */
(function () {
    'use strict';

    var MAX_FOTOS = 60;
    var MAX_LADO = 2048; // tope de píxeles (los presets más grandes se reducen con aviso)

    var fotos = [];      // { url, img, nombre }
    var usosUrl = {};    // objectURL -> veces usada (al duplicar)
    var sel = -1;        // índice del fotograma seleccionado
    var urlGif = null;   // objectURL del último GIF
    var preview = null;  // temporizador de la vista previa
    var creando = false;

    var input = document.getElementById('gif-archivos');
    var tiraWrap = document.getElementById('gif-tira-wrap');
    var tira = document.getElementById('gif-tira');
    var barraAcc = document.getElementById('gif-acciones');
    var btnSubir = document.getElementById('gif-subir');
    var btnBajar = document.getElementById('gif-bajar');
    var btnDuplicar = document.getElementById('gif-duplicar');
    var btnQuitar = document.getElementById('gif-quitar');
    var conteo = document.getElementById('gif-conteo');
    var selTam = document.getElementById('gif-tamano');
    var inpDelay = document.getElementById('gif-delay');
    var selAjuste = document.getElementById('gif-ajuste');
    var inpFondo = document.getElementById('gif-fondo');
    var chkBucle = document.getElementById('gif-bucle');
    var lienzo = document.getElementById('gif-lienzo');
    // willReadFrequently: se lee en cada codificación (y quita el aviso de consola)
    var ctx = lienzo.getContext('2d', { willReadFrequently: true });
    var vacio = document.getElementById('gif-vacio');
    var progWrap = document.getElementById('gif-progreso');
    var barra = document.getElementById('gif-barra');
    var estado = document.getElementById('gif-estado');
    var btnCrear = document.getElementById('gif-crear');
    var aDesc = document.getElementById('gif-descargar');
    var txtDesc = document.getElementById('gif-descargar-texto');
    var resWrap = document.getElementById('gif-resultado');

    /* ---------- avisos (mismo patrón que mostrarAviso de capas.js) ---------- */
    function aviso(msg, tipo) {
        var cont = document.getElementById('tet-toast-container');
        if (!cont) {
            cont = document.createElement('div');
            cont.id = 'tet-toast-container';
            cont.className = 'toast-container position-fixed top-0 end-0 p-3';
            cont.style.zIndex = '1100';
            document.body.appendChild(cont);
        }
        var el = document.createElement('div');
        el.className = 'toast align-items-center text-bg-' + (tipo || 'warning') + ' border-0 show';
        el.setAttribute('role', 'alert');
        el.innerHTML = '<div class="d-flex"><div class="toast-body"></div>' +
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Cerrar"></button></div>';
        el.querySelector('.toast-body').textContent = msg;
        cont.appendChild(el);
        el.querySelector('.btn-close').addEventListener('click', function () { el.remove(); });
        setTimeout(function () { el.remove(); }, 4500);
    }

    /* ---------- selector de tamaño desde TET_FORMATOS (formatos.js) ---------- */
    (function poblarTamano() {
        var html = '<option value="orig">Tamaño de la primera imagen</option>';
        (window.TET_FORMATOS || []).forEach(function (g) {
            var items = g.items.filter(function (f) { return !f.orig && f.w && f.h; }).map(function (f) {
                return '<option value="' + f.w + 'x' + f.h + '">' + f.n + ' — ' + f.w + '×' + f.h + '</option>';
            }).join('');
            if (items) html += '<optgroup label="' + g.grupo + '">' + items + '</optgroup>';
        });
        selTam.innerHTML = html;
    })();

    /* ---------- carga de archivos (en cadena para respetar el orden) ---------- */
    input.addEventListener('change', function () {
        var lista = Array.prototype.slice.call(input.files || []);
        input.value = ''; // permite volver a elegir los mismos archivos
        if (!lista.length) return;
        var cola = Promise.resolve();
        lista.forEach(function (f) {
            cola = cola.then(function () { return cargarFoto(f); });
        });
    });

    function cargarFoto(f) {
        return new Promise(function (resolver) {
            if (!/^image\//.test(f.type)) {
                aviso('«' + f.name + '» no es una imagen', 'warning');
                return resolver();
            }
            if (creando) {
                aviso('Espera a que termine el GIF actual', 'info');
                return resolver();
            }
            if (fotos.length >= MAX_FOTOS) {
                aviso('Máximo ' + MAX_FOTOS + ' fotos por GIF', 'warning');
                return resolver();
            }
            var url = URL.createObjectURL(f);
            var img = new Image();
            img.onload = function () {
                fotos.push({ url: url, img: img, nombre: f.name });
                usosUrl[url] = (usosUrl[url] || 0) + 1;
                pintarTira();
                resolver();
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                aviso('No se pudo leer «' + f.name + '»', 'danger');
                resolver();
            };
            img.src = url;
        });
    }

    function soltarUrl(url) {
        usosUrl[url] = (usosUrl[url] || 1) - 1;
        if (usosUrl[url] <= 0) {
            delete usosUrl[url];
            URL.revokeObjectURL(url);
        }
    }

    /* ---------- tira de fotogramas ---------- */
    function pintarTira() {
        tira.textContent = '';
        fotos.forEach(function (f, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'gif-foto';
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
            b.title = f.nombre;
            var img = document.createElement('img');
            img.src = f.url;
            img.alt = 'Fotograma ' + (i + 1);
            img.className = 'gif-foto-img';
            var n = document.createElement('span');
            n.className = 'gif-foto-num';
            n.textContent = String(i + 1);
            b.appendChild(img);
            b.appendChild(n);
            b.addEventListener('click', function () { seleccionar(i); });
            tira.appendChild(b);
        });

        var hay = fotos.length > 0;
        tiraWrap.hidden = !hay;
        conteo.textContent = fotos.length + (fotos.length === 1 ? ' fotograma' : ' fotogramas') +
            ' · toca uno para reordenarlo o quitarlo' +
            (fotos.length >= MAX_FOTOS ? ' (máximo alcanzado)' : '');
        btnCrear.disabled = !hay || creando;
        if (!hay) sel = -1;
        else if (sel < 0 || sel >= fotos.length) sel = 0; // barra ↑↓ visible de entrada
        actualizarBarra();
        reiniciarPreview();
    }

    function seleccionar(i) {
        sel = (sel === i) ? -1 : i;
        actualizarBarra();
    }

    function actualizarBarra() {
        Array.prototype.forEach.call(tira.children, function (b, i) {
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
        });
        barraAcc.classList.toggle('is-on', sel !== -1 && !creando);
        btnSubir.disabled = sel <= 0;
        btnBajar.disabled = sel < 0 || sel >= fotos.length - 1;
        btnDuplicar.disabled = sel < 0 || fotos.length >= MAX_FOTOS;
        btnQuitar.disabled = sel < 0;
        actualizaExtraer();   // D2: el botón de extraer sigue el mismo ritmo
        actualizaGrabar();    // D3: idem con «Grabar lienzo»
    }

    function mover(desde, hasta) {
        if (desde < 0 || hasta < 0 || desde >= fotos.length || hasta >= fotos.length) return;
        var f = fotos.splice(desde, 1)[0];
        fotos.splice(hasta, 0, f);
        sel = hasta;
        pintarTira();
    }

    btnSubir.addEventListener('click', function () { mover(sel, sel - 1); });
    btnBajar.addEventListener('click', function () { mover(sel, sel + 1); });

    btnDuplicar.addEventListener('click', function () {
        if (sel < 0 || fotos.length >= MAX_FOTOS) return;
        var f = fotos[sel];
        usosUrl[f.url] = (usosUrl[f.url] || 1) + 1;
        fotos.splice(sel + 1, 0, f);
        sel = sel + 1;
        pintarTira();
    });

    btnQuitar.addEventListener('click', function () {
        if (sel < 0) return;
        var f = fotos.splice(sel, 1)[0];
        soltarUrl(f.url);
        if (sel >= fotos.length) sel = fotos.length - 1;
        pintarTira();
    });

    /* ---------- tamaño de salida (con tope de píxeles) ---------- */
    function dimsSalida() {
        var w, h;
        if (selTam.value === 'orig') {
            var img = fotos[0] && fotos[0].img;
            w = img ? img.naturalWidth : 800;
            h = img ? img.naturalHeight : 800;
        } else {
            var p = selTam.value.split('x');
            w = parseInt(p[0], 10);
            h = parseInt(p[1], 10);
        }
        var lado = Math.max(w, h);
        if (lado > MAX_LADO) {
            var esc = MAX_LADO / lado;
            return { w: Math.round(w * esc), h: Math.round(h * esc), reducido: true };
        }
        return { w: w, h: h, reducido: false };
    }

    /* ---------- dibujo (cover/contain sobre fondo) ---------- */
    function dibujar(img) {
        var w = lienzo.width;
        var h = lienzo.height;
        ctx.fillStyle = inpFondo.value;
        ctx.fillRect(0, 0, w, h);
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;
        var esc = (selAjuste.value === 'contain')
            ? Math.min(w / iw, h / ih)
            : Math.max(w / iw, h / ih);
        var dw = iw * esc;
        var dh = ih * esc;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }

    /* ---------- vista previa ciclando ---------- */
    function reiniciarPreview() {
        if (preview) {
            clearInterval(preview);
            preview = null;
        }
        if (!fotos.length) {
            lienzo.style.display = 'none';
            vacio.hidden = false;
            return;
        }
        vacio.hidden = true;
        lienzo.style.display = 'block';
        var d = dimsSalida();
        if (lienzo.width !== d.w || lienzo.height !== d.h) {
            lienzo.width = d.w;
            lienzo.height = d.h;
        }
        var i = 0;
        dibujar(fotos[0].img);
        if (fotos.length < 2) return;
        var ms = Math.max(20, Math.min(10000, parseInt(inpDelay.value, 10) || 500));
        preview = setInterval(function () {
            i = (i + 1) % fotos.length;
            dibujar(fotos[i].img);
        }, ms);
    }

    [selTam, inpDelay, selAjuste, inpFondo].forEach(function (el) {
        el.addEventListener('change', function () {
            if (!creando) reiniciarPreview();
        });
    });

    /* ---------- codificación ---------- */
    btnCrear.addEventListener('click', function () {
        if (!fotos.length || creando) return;
        if (typeof window.GIFEnc === 'undefined') {
            aviso('El motor GIF no está disponible: recarga la página', 'danger');
            return;
        }
        crearGif();
    });

    function crearGif() {
        creando = true;
        btnCrear.disabled = true;
        resWrap.hidden = true;
        actualizarBarra();
        if (preview) {
            clearInterval(preview);
            preview = null;
        }
        progWrap.hidden = false;
        barra.style.width = '0%';
        barra.textContent = '0%';

        var d = dimsSalida();
        if (d.reducido && selTam.value !== 'orig') {
            // el preset más grande se reduce al tope del GIF
            aviso('Salida reducida a ' + d.w + '×' + d.h + ' px para que el GIF no sea gigante', 'info');
        }
        lienzo.width = d.w;
        lienzo.height = d.h;

        var delay = Math.max(20, Math.min(10000, parseInt(inpDelay.value, 10) || 500));
        var bucle = chkBucle.checked;
        var total = fotos.length;
        var gif = window.GIFEnc.GIFEncoder();
        var i = 0;

        function paso() {
            if (i >= total) return terminar();
            var datos;
            try {
                dibujar(fotos[i].img);
                datos = ctx.getImageData(0, 0, d.w, d.h).data;
            } catch (e) {
                // navegador bloqueando el lienzo (típico en file://): aviso claro
                return fallo(e);
            }
            var paleta = window.GIFEnc.quantize(datos, 256);
            var indice = window.GIFEnc.applyPalette(datos, paleta);
            gif.writeFrame(indice, d.w, d.h, {
                palette: paleta,
                delay: delay,
                repeat: (i === 0) ? (bucle ? 0 : -1) : undefined
            });
            i++;
            var pct = Math.round(i / total * 100);
            barra.style.width = pct + '%';
            barra.textContent = pct + '%';
            estado.textContent = 'Codificando fotograma ' + i + ' de ' + total + '…';
            setTimeout(paso, 0); // deja pintar la interfaz antes del siguiente
        }

        function limpiar() {
            progWrap.hidden = true;
            creando = false;
            btnCrear.disabled = fotos.length === 0;
            actualizarBarra();
            reiniciarPreview();
        }

        function fallo(e) {
            console.warn('gif: no se pudo codificar', e);
            aviso('El navegador bloqueó la exportación (común en modo doble-clic). ' +
                'Abre la página desde GitHub Pages o un servidor local.', 'danger');
            limpiar();
        }

        function terminar() {
            gif.finish();
            var blob = new Blob([gif.bytes()], { type: 'image/gif' });
            if (urlGif) URL.revokeObjectURL(urlGif);
            urlGif = URL.createObjectURL(blob);
            aDesc.href = urlGif;
            txtDesc.textContent = 'Descargar GIF (' + Math.round(blob.size / 1024) + ' KB)';
            resWrap.hidden = false;
            aviso('GIF listo: ' + total + (total === 1 ? ' foto' : ' fotos') + ' · ' +
                Math.round(blob.size / 1024) + ' KB', 'success');
            limpiar();
            resWrap.scrollIntoView({ block: 'nearest' });
        }

        estado.textContent = 'Codificando…';
        setTimeout(paso, 0);
    }

    /* ---------- D2 · vídeo existente → fotogramas ----------
       El vídeo se recorre con currentTime + «seeked» y cada fotograma se
       dibuja en un lienzo auxiliar, se convierte en Image (data: URL
       JPEG) y entra en fotos[]: a partir de ahí manda la MISMA tubería
       que las imágenes —tira, reordenar, tamaño, codificación—.
       Todo con blob: y canvas propio, así funciona igual en doble clic
       (file://) que en GitHub Pages. */
    var inVideo = document.getElementById('gif-video');
    var wrapVideo = document.getElementById('gif-video-wrap');
    var vEl = document.getElementById('gif-video-el');
    var inInicio = document.getElementById('gif-inicio');
    var inFin = document.getElementById('gif-fin');
    var selFps = document.getElementById('gif-fps');
    var btnExtraer = document.getElementById('gif-extraer');
    var estVideo = document.getElementById('gif-video-estado');
    var progExtr = document.getElementById('gif-extraer-progreso');
    var barraExtr = document.getElementById('gif-extraer-barra');
    var estExtr = document.getElementById('gif-extraer-estado');
    var urlVideo = null;
    var durVideo = 0;
    var MAX_EXTRAE_LADO = 1080;   // tope de píxeles: un GIF no usa más y el móvil lo agradece

    inVideo.addEventListener('change', function () {
        var f = inVideo.files && inVideo.files[0];
        inVideo.value = ''; // permite volver a elegir el mismo archivo
        if (!f) return;
        if (creando) {
            aviso('Espera a que termine el trabajo actual', 'info');
            return;
        }
        if (!/^video\//.test(f.type) && !/\.(mp4|webm|mov|m4v)$/i.test(f.name)) {
            aviso('«' + f.name + '» no es un vídeo', 'warning');
            return;
        }
        if (urlVideo) URL.revokeObjectURL(urlVideo);
        urlVideo = URL.createObjectURL(f);
        vEl.onerror = function () {
            wrapVideo.hidden = true;
            aviso('No se pudo leer «' + f.name + '»', 'danger');
        };
        vEl.src = urlVideo;
        wrapVideo.hidden = false;
        estVideo.className = 'form-text gif-video-estado';
        estVideo.textContent = 'Leyendo el vídeo…';
        var alCargar = function () {
            conDuracion(vEl).then(function () {
                durVideo = (isFinite(vEl.duration) && vEl.duration > 0) ? vEl.duration : 0;
                if (!durVideo) {
                    wrapVideo.hidden = true;
                    aviso('No se pudo leer la duración de «' + f.name + '»', 'danger');
                    return;
                }
                // rango por defecto: lo que quepa en MAX_FOTOS al fps por defecto
                var fps0 = parseInt(selFps.value, 10) || 10;
                inInicio.value = '0';
                inFin.value = Math.min(durVideo, (MAX_FOTOS - 1) / fps0).toFixed(1);
                try { vEl.currentTime = 0; } catch (e) { }
                recalcRango();
                actualizarBarra();
            });
        };
        if (vEl.readyState >= 1) alCargar();
        else vEl.addEventListener('loadedmetadata', alCargar, { once: true });
    });

    /* Duración fiable: los webm de MediaRecorder (grabaciones de
       pantalla) traen «Infinity» en la cabecera hasta que se salta al
       final — el mismo truco que E3 de video.html. */
    function conDuracion(v) {
        return new Promise(function (ok) {
            if (isFinite(v.duration) && v.duration > 0) return ok();
            var hecho = false;
            var fin = function () {
                if (hecho) return;
                hecho = true;
                v.removeEventListener('timeupdate', mira);
                clearTimeout(to);
                ok();
            };
            var mira = function () {
                if (isFinite(v.duration) && v.duration > 0) fin();
            };
            v.addEventListener('timeupdate', mira);
            var to = setTimeout(fin, 4000);
            try { v.currentTime = 1e6; } catch (e) { fin(); }
        });
    }

    /* Salta a un instante y espera a que el fotograma esté pintado.
       Si ya se está en ese instante (y hay dato), no hay nada que
       esperar: sin esto, el primer fotograma se quedaría colgado. */
    function buscarFotograma(v, t) {
        return new Promise(function (ok) {
            var limite = (isFinite(v.duration) && v.duration > 0) ? v.duration : t;
            var obj = Math.max(0, Math.min(t, limite - 0.001));
            var yaEsta = Math.abs(v.currentTime - obj) < 0.001;
            if (yaEsta && v.readyState >= 2) return ok();
            var hecho = false;
            var fin = function () {
                if (hecho) return;
                hecho = true;
                v.removeEventListener('seeked', fin);
                v.removeEventListener('loadeddata', fin);
                clearTimeout(to);
                ok();
            };
            var to = setTimeout(fin, 3000); // no colgarse ante un archivo raro
            v.addEventListener('seeked', fin);
            if (yaEsta) {
                v.addEventListener('loadeddata', fin);
            } else {
                try { v.currentTime = obj; } catch (e) { fin(); }
            }
        });
    }

    /* Rango elegido → fotogramas, con recorte honrado a MAX_FOTOS */
    function rangoFotos() {
        var fps = parseInt(selFps.value, 10) || 10;
        var ini = Math.max(0, parseFloat(inInicio.value) || 0);
        if (ini > durVideo - 0.1) ini = Math.max(0, durVideo - 0.1);
        var fin = parseFloat(inFin.value);
        if (!isFinite(fin)) fin = durVideo;
        if (fin > durVideo) fin = durVideo;
        if (fin <= ini) fin = Math.min(durVideo, ini + 0.1);
        // 1e-6 de margen: 1.2−0.4 da 7,999… y sin él se comería el último fotograma
        var n = Math.floor((fin - ini) * fps + 1e-6) + 1;
        var corto = false;
        if (n > MAX_FOTOS) {
            n = MAX_FOTOS;
            fin = ini + (MAX_FOTOS - 1) / fps;
            corto = true;
        }
        return { ini: ini, fin: fin, fps: fps, n: n, corto: corto };
    }

    function recalcRango() {
        if (!durVideo) return;
        var g = rangoFotos();
        inInicio.value = g.ini.toFixed(1);
        inFin.value = g.fin.toFixed(1);
        actualizarEstadoVideo();
    }

    function actualizarEstadoVideo() {
        if (!durVideo) {
            estVideo.textContent = '';
            actualizaExtraer();
            return;
        }
        var g = rangoFotos();
        var txt = 'De ' + g.ini.toFixed(1) + ' a ' + g.fin.toFixed(1) + ' s → ' +
            g.n + (g.n === 1 ? ' fotograma' : ' fotogramas') + ' a ' + g.fps + ' fps';
        estVideo.classList.toggle('text-warning', g.corto);
        estVideo.textContent = g.corto
            ? txt + ' (máximo ' + MAX_FOTOS + ': se recorta el rango)'
            : txt;
        actualizaExtraer();
    }

    function actualizaExtraer() {
        if (!btnExtraer) return;
        btnExtraer.disabled = creando || !urlVideo || !durVideo || rangoFotos().n < 2;
    }

    [inInicio, inFin, selFps].forEach(function (el) {
        el.addEventListener('change', recalcRango);
    });

    document.getElementById('gif-inicio-pos').addEventListener('click', function () {
        if (!durVideo) return;
        inInicio.value = Math.max(0, vEl.currentTime).toFixed(1);
        recalcRango();
    });

    document.getElementById('gif-fin-pos').addEventListener('click', function () {
        if (!durVideo) return;
        inFin.value = Math.max(0, vEl.currentTime).toFixed(1);
        recalcRango();
    });

    btnExtraer.addEventListener('click', function () {
        if (creando || !urlVideo || !durVideo) return;
        var g = rangoFotos();
        if (g.n < 2) {
            aviso('El rango es demasiado corto: amplía «Desde» o «Hasta»', 'warning');
            return;
        }
        creando = true;
        resWrap.hidden = true;
        vEl.pause();
        vEl.controls = false;   // que nadie mueva el cabezal mientras se extrae
        actualizarBarra();
        progExtr.hidden = false;
        barraExtr.style.width = '0%';
        barraExtr.textContent = '0%';
        estExtr.textContent = 'Extrayendo…';
        extraerFotos(g);
    });

    function extraerFotos(g) {
        var w = vEl.videoWidth;
        var h = vEl.videoHeight;
        if (!w || !h) return falloExtraccion(new Error('sin dimensiones'));
        var esc = Math.min(1, MAX_EXTRAE_LADO / Math.max(w, h));
        w = Math.max(1, Math.round(w * esc));
        h = Math.max(1, Math.round(h * esc));
        var tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        var tctx = tmp.getContext('2d');
        var nuevas = [];
        var i = 0;

        function paso() {
            if (i >= g.n) return terminar();
            buscarFotograma(vEl, g.ini + i / g.fps).then(function () {
                var data;
                try {
                    tctx.drawImage(vEl, 0, 0, w, h);
                    data = tmp.toDataURL('image/jpeg', 0.9);
                } catch (e) { return falloExtraccion(e); }
                var img = new Image();
                img.onload = function () {
                    nuevas.push({ url: data, img: img, nombre: 'vídeo ' + (i + 1) });
                    i++;
                    var pct = Math.round(i / g.n * 100);
                    barraExtr.style.width = pct + '%';
                    barraExtr.textContent = pct + '%';
                    estExtr.textContent = 'Extrayendo fotograma ' + i + ' de ' + g.n + '…';
                    setTimeout(paso, 0);
                };
                img.onerror = function () { falloExtraccion(new Error('fotograma ilegible')); };
                img.src = data;
            }, falloExtraccion);
        }

        function limpiar() {
            progExtr.hidden = true;
            vEl.controls = true;
            creando = false;
            actualizaExtraer();
        }

        function falloExtraccion(e) {
            console.warn('gif: no se pudo extraer el vídeo', e);
            aviso('No se pudieron extraer los fotogramas del vídeo', 'danger');
            limpiar();
            actualizarBarra();
        }

        function terminar() {
            limpiar();
            instalaFotogramas(nuevas, g.fps,
                g.n + ' fotogramas extraídos' +
                (g.corto ? ' (rango recortado a ' + MAX_FOTOS + ')' : '') +
                ' · ' + w + '×' + h + ' px');
        }

        setTimeout(paso, 0);
    }

    /* Fotogramas ya convertidos en Image → sustituyen la tira, dejan el
       delay a la velocidad pedida y lo cuentan (compartido por D2 vídeo y
       D3 lienzo; los blob: de las imágenes sueltas se revocan). */
    function instalaFotogramas(nuevas, fps, mensaje) {
        fotos.forEach(function (f) {
            if (f.url.indexOf('blob:') === 0) soltarUrl(f.url);
        });
        fotos = nuevas;
        sel = -1;
        inpDelay.value = String(Math.max(20, Math.round(1000 / fps)));
        pintarTira();
        aviso(mensaje, 'success');
        tiraWrap.scrollIntoView({ block: 'nearest' });
    }

    /* ---------- D3 · grabar el lienzo → fotogramas ----------
       Lienzo de Fabric en la propia página con el selector de plantillas y
       la rotación automática de la shell (▶ cada 1400 ms). Se graba lo que
       se ve a la fps y duración pedidas: cada fotograma pasa por
       toDataURL('jpeg') → Image → fotos[] y manda la MISMA tubería que
       D1/D2. Todo con canvas propio, así funciona en file:// y Pages (en
       doble clic se carga plantillas-data.js, como en video.html, para no
       teñir el lienzo). */
    var PLANTILLAS_GIF = [
        // completas (1200×1200 con contenido). Fuera Plantilla3 y
        // miniaturaYouTube: PNGs planos de un solo color, solo sirven de
        // fondo en sus editores y en el GIF darían fotogramas vacíos.
        ['./public/img/Plantillas/mh.png', 'acontecimientos históricos'],
        ['./public/img/Plantillas/tet2/P_GNU_LINUX.png', 'comandos Linux'],
        ['./public/img/Plantillas/tet2/P_html.png', 'HTML 5'],
        ['./public/img/Plantillas/tet2/P_css.png', 'CSS'],
        ['./public/img/Plantillas/tet2/P_js.png', 'JS'],
        ['./public/img/dictec/code.png', 'Code'],
        ['./public/img/dictec/tech.png', 'Tech'],
        ['./public/img/dictec/game.png', 'Game'],
        ['./public/img/Plantillas/tet1/TBtet.png', 'TBtet 1'],
        ['./public/img/Plantillas/tet1/TBtet2.png', 'TBtet 2'],
        ['./public/img/Plantillas/tet1/creadores.png', 'creadores tet'],
        // barras (finas, 1200×93): se ven como tira
        ['./public/img/bars/tetnews.png', 'tet news (barras)'],
        ['./public/img/bars/somostetCuri.png', 'curiosidades'],
        ['./public/img/bars/somostetR.png', 'reseñas'],
        ['./public/img/bars/somostetMB.png', 'mentes brillantes'],
        ['./public/img/bars/somostetTT.png', 'tecnología a través del tiempo'],
        ['./public/img/bars/somostetTF2079.png', '2079: tecnología del futuro'],
        ['./public/img/bars/somostetArt.png', 'artículo'],
        ['./public/img/bars/somostetBlanco.png', 'blanco']
    ];
    var selTplGif = document.getElementById('gif-lienzo-plantilla');
    var btnRotar = document.getElementById('gif-lienzo-rotar');
    var inpDur = document.getElementById('gif-lienzo-duracion');
    var selFpsLi = document.getElementById('gif-lienzo-fps');
    var btnGrabar = document.getElementById('gif-grabar');
    var estLi = document.getElementById('gif-lienzo-estado');
    var progLi = document.getElementById('gif-grabar-progreso');
    var barraLi = document.getElementById('gif-grabar-barra');
    var estGrab = document.getElementById('gif-grabar-estado');
    var wrapLi = document.getElementById('gif-lienzo-wrap');
    var lienzoFab = null;
    var lienzoListo = false;
    var timerRot = null;
    var pintaToken = 0;

    function actualizaGrabar() {
        if (!btnGrabar) return;
        btnGrabar.disabled = creando || !lienzoListo;
    }

    function rangoGrabado() {
        var fps = parseInt(selFpsLi.value, 10) || 10;
        var dur = Math.max(1, parseFloat(inpDur.value) || 1);
        var n = Math.round(dur * fps);
        var corto = false;
        if (n > MAX_FOTOS) {
            n = MAX_FOTOS;
            dur = MAX_FOTOS / fps;
            corto = true;
        }
        if (n < 2) { n = 2; dur = 2 / fps; }
        return { dur: dur, fps: fps, n: n, corto: corto };
    }

    function actualizaEstadoLi() {
        var g = rangoGrabado();
        var txt = g.dur.toFixed(1) + ' s a ' + g.fps + ' fps → ' +
            g.n + (g.n === 1 ? ' fotograma' : ' fotogramas');
        estLi.classList.toggle('text-warning', g.corto);
        estLi.textContent = (g.corto ? txt + ' (máximo ' + MAX_FOTOS + ': se recorta)' : txt) +
            ' · pulsa ▶ para que las plantillas roten mientras graba';
        actualizaGrabar();
    }

    function pararRot() {
        if (timerRot) { clearInterval(timerRot); timerRot = null; }
        btnRotar.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i> Rotar';
        btnRotar.setAttribute('aria-label', 'Rotar plantillas automáticamente');
        btnRotar.setAttribute('title', 'Rotar plantillas automáticamente');
    }

    [inpDur, selFpsLi].forEach(function (el) {
        el.addEventListener('change', actualizaEstadoLi);
    });

    if (typeof fabric === 'undefined') {
        estLi.textContent = 'El lienzo no está disponible: no se cargó Fabric';
        aviso('El lienzo no está disponible: no se cargó Fabric', 'warning');
    } else {
        if (location.protocol === 'file:' && !window.TET_PLANTILLAS) {
            var scPl = document.createElement('script');
            scPl.src = './public/js/plantillas-data.js?v=d3';
            scPl.async = true;
            document.head.appendChild(scPl);
        }

        PLANTILLAS_GIF.forEach(function (p, i) {
            var o = document.createElement('option');
            o.value = String(i);
            o.textContent = p[1];
            selTplGif.appendChild(o);
        });

        lienzoFab = new fabric.Canvas('gif-lienzo-fab', {
            selection: false,
            backgroundColor: '#ffffff'
        });

        function rutaPlantilla() {
            var ruta = PLANTILLAS_GIF[parseInt(selTplGif.value, 10) || 0][0];
            return (location.protocol === 'file:' && window.TET_PLANTILLAS && window.TET_PLANTILLAS[ruta]) || ruta;
        }

        function pintaPlantilla() {
            var token = ++pintaToken;   // si cambia antes de cargar, se descarta
            var ruta = rutaPlantilla();
            var nombre = PLANTILLAS_GIF[parseInt(selTplGif.value, 10) || 0][1];
            var img = new Image();
            img.onload = function () {
                if (token !== pintaToken) return;
                var maxW = Math.max(200, wrapLi.clientWidth - 14);
                var maxH = 520;
                var esc = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
                var w = Math.max(1, Math.round(img.naturalWidth * esc));
                var h = Math.max(1, Math.round(img.naturalHeight * esc));
                lienzoFab.setDimensions({ width: w, height: h });
                lienzoFab.backgroundColor = '#ffffff';
                lienzoFab.setBackgroundImage(ruta, lienzoFab.renderAll.bind(lienzoFab), {
                    originX: 'left', originY: 'top', width: w, height: h
                });
                lienzoListo = true;
                actualizaGrabar();
            };
            img.onerror = function () {
                if (token !== pintaToken) return;
                lienzoListo = false;
                actualizaGrabar();
                aviso('No se pudo cargar la plantilla «' + nombre + '»', 'danger');
            };
            img.src = ruta;
        }

        btnRotar.addEventListener('click', function () {
            if (timerRot) { pararRot(); return; }
            btnRotar.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i> Parar';
            btnRotar.setAttribute('aria-label', 'Detener rotación de plantillas');
            btnRotar.setAttribute('title', 'Detener rotación de plantillas');
            timerRot = setInterval(function () {
                var n = selTplGif.options.length;
                selTplGif.value = String((parseInt(selTplGif.value, 10) + 1) % n);
                pintaPlantilla();
            }, 1400);
        });
        // una elección manual detiene la rotación y repinta (como en la shell)
        selTplGif.addEventListener('change', function () {
            pararRot();
            pintaPlantilla();
        });

        pintaPlantilla();
    }

    btnGrabar.addEventListener('click', function () {
        if (creando || !lienzoListo) return;
        var g = rangoGrabado();
        creando = true;
        resWrap.hidden = true;
        actualizarBarra();
        progLi.hidden = false;
        barraLi.style.width = '0%';
        barraLi.textContent = '0%';
        estGrab.textContent = 'Grabando…';
        var nuevas = [];
        var capturas = 0;
        var cerrado = false;
        var iv = null;

        function terminar() {
            if (cerrado) return;
            cerrado = true;
            if (iv) clearInterval(iv);
            progLi.hidden = true;
            creando = false;
            instalaFotogramas(nuevas, g.fps,
                g.n + ' fotogramas del lienzo · ' + lienzoFab.width + '×' + lienzoFab.height + ' px');
        }

        function falloGrab(e) {
            if (cerrado) return;
            cerrado = true;
            if (iv) clearInterval(iv);
            console.warn('gif: no se pudo grabar el lienzo', e);
            aviso('No se pudo grabar el lienzo', 'danger');
            progLi.hidden = true;
            creando = false;
            actualizarBarra();
        }

        function paso() {
            if (capturas >= g.n || cerrado) return;
            capturas++;
            var data;
            try {
                data = lienzoFab.toDataURL({ format: 'jpeg', quality: 0.92 });
            } catch (e) { return falloGrab(e); }
            var img = new Image();
            img.onload = function () {
                nuevas.push({ url: data, img: img, nombre: 'lienzo ' + nuevas.length });
                var pct = Math.round(nuevas.length / g.n * 100);
                barraLi.style.width = pct + '%';
                barraLi.textContent = pct + '%';
                estGrab.textContent = 'Grabando ' + nuevas.length + ' de ' + g.n + '…';
                if (nuevas.length >= g.n) terminar();
            };
            img.onerror = function () { falloGrab(new Error('fotograma ilegible')); };
            img.src = data;
        }

        iv = setInterval(paso, Math.max(20, Math.round(1000 / g.fps)));
        paso();
    });

    actualizaEstadoLi();
})();
