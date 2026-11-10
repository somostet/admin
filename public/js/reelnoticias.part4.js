    /* ---------- cabecera y ajustes ---------- */
    function indiceBarra(url) {
        for (var i = 0; i < BARRAS.length; i++) {
            if (BARRAS[i].url === url) return i;
        }
        return 0;
    }

    function pintaSelectBarras() {
        if (!inpBarra) return;
        var html = '';
        BARRAS.forEach(function (b, i) {
            html += '<option value="' + i + '">' + esc(b.nombre) + '</option>';
        });
        inpBarra.innerHTML = html;
        inpBarra.value = String(indiceBarra(ajustes.barra));
    }

    function aplicaPaleta(b) {
        if (!b) return;
        ajustes.fondo = b.fondo;
        ajustes.fondo2 = b.fondo2;
        ajustes.acento = b.acento;
        ajustes.texto = b.texto;
        ajustes.caja = b.caja;
        if (inpFondo) inpFondo.value = b.fondo;
        if (inpFondo2) inpFondo2.value = b.fondo2;
        if (inpAcento) inpAcento.value = b.acento;
        if (inpTexto) inpTexto.value = b.texto;
        if (inpCaja) inpCaja.value = b.caja;
        pintar(tActual);
    }

    function cargaBarra(url) {
        if (cacheImgs[url]) {
            barraImg = cacheImgs[url];
            pintar(tActual);
            return;
        }
        var img = new Image();
        img.onload = function () {
            cacheImgs[url] = img;
            barraImg = img;
            pintar(tActual);
        };
        img.onerror = function () {
            barraImg = null;
            pintar(tActual);
        };
        img.src = urlCanvas(url);
    }

    function aplicaFormato() {
        var partes = selFormato.value.split('x');
        var w = parseInt(partes[0], 10) || 1080;
        var h = parseInt(partes[1], 10) || 1920;
        ajustes.formato = { w: w, h: h };
        lienzo.width = w;
        lienzo.height = h;
        if (infoSalida) infoSalida.textContent = w + ' × ' + h + ' · 30 fps';
        if (tActual > duracionTotal()) tActual = 0;
        pintar(tActual);
    }

    function sincronizaControles() {
        if (inpBarra) inpBarra.value = String(indiceBarra(ajustes.barra));
        if (inpColoresAuto) inpColoresAuto.checked = ajustes.coloresAuto;
        if (selAjuste) selAjuste.value = ajustes.ajuste;
        if (selCajaTitulo) selCajaTitulo.value = ajustes.cajaTitulo ? '1' : '0';
        if (inpFondo) inpFondo.value = ajustes.fondo;
        if (inpFondo2) inpFondo2.value = ajustes.fondo2;
        if (inpTexto) inpTexto.value = ajustes.texto;
        if (inpAcento) inpAcento.value = ajustes.acento;
        if (inpCaja) inpCaja.value = ajustes.caja;
        if (inpDegradado) inpDegradado.checked = ajustes.degradado;
        if (inpProgreso) inpProgreso.checked = ajustes.progreso;
        if (inpTarjetaFinal) inpTarjetaFinal.checked = ajustes.tarjetaFinal;
        if (inpZonaSegura) inpZonaSegura.checked = ajustes.zonaSegura;
        if (inpDuracion) inpDuracion.value = ajustes.hold;
        if (inpEntrada) inpEntrada.value = ajustes.entrada;
        if (inpSalida) inpSalida.value = ajustes.salida;
        if (inpCierre) inpCierre.value = ajustes.cierre;
        if (inpZoom) inpZoom.value = ajustes.zoom;
        if (valDuracion) valDuracion.textContent = seg(ajustes.hold);
        if (valEntrada) valEntrada.textContent = seg(ajustes.entrada);
        if (valSalida) valSalida.textContent = seg(ajustes.salida);
        if (valCierre) valCierre.textContent = seg(ajustes.cierre);
        if (valZoom) valZoom.textContent = Math.round(ajustes.zoom * 100) + ' %';
        if (selAnimImg) selAnimImg.value = ajustes.animImg;
        if (selAnimTitulo) selAnimTitulo.value = ajustes.animTitulo;
        if (selAnimDetalle) selAnimDetalle.value = ajustes.animDetalle;
        if (selSalidaTexto) selSalidaTexto.value = ajustes.salidaTexto;
        if (volMusica) volMusica.value = 0.7;
        if (valVolMusica) valVolMusica.textContent = '70 %';
        actualizaDuracion();
    }

    /* ---------- música ---------- */
    function cargaMusica(file) {
        if (!file || !/^audio\//.test(file.type)) {
            aviso('Ese archivo no es audio', 'warning');
            return;
        }
        if (musicaUrl) URL.revokeObjectURL(musicaUrl);
        musicaUrl = URL.createObjectURL(file);
        musicaNombre = file.name;
        if (!musicaEl) {
            musicaEl = document.createElement('audio');
            musicaEl.loop = true;
            musicaEl.preload = 'auto';
        }
        musicaEl.src = musicaUrl;
        if (nombreMusica) {
            nombreMusica.textContent = musicaNombre;
            nombreMusica.title = musicaNombre;
        }
        if (btnQuitarMusica) btnQuitarMusica.hidden = false;
        if (audioCtx) {
            try { musicaEl.load(); } catch (e) { }
        }
        sincListaMusica();
    }

    function quitaMusica() {
        if (musicaEl) {
            try { musicaEl.pause(); } catch (e) { }
            musicaEl.removeAttribute('src');
            try { musicaEl.load(); } catch (e) { }
        }
        if (musicaUrl) URL.revokeObjectURL(musicaUrl);
        musicaUrl = null;
        musicaNombre = '';
        if (inpMusica) inpMusica.value = '';
        if (nombreMusica) { nombreMusica.textContent = 'Sin música'; nombreMusica.title = ''; }
        if (btnQuitarMusica) btnQuitarMusica.hidden = true;
        sincListaMusica();
    }

    var PISTAS = window.TET_LISTA_MUSICA || [];
    var listaPintada = false;

    function formatoAudio(seg2) {
        var m = Math.floor(seg2 / 60);
        var s = Math.round(seg2 % 60);
        if (s >= 60) { m += 1; s = 0; }
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function pintaListaMusica() {
        if (!listaMusica || listaPintada) return;
        listaPintada = true;
        PISTAS.forEach(function (p, i) {
            var item = document.createElement('div');
            item.className = 'reel-pista-item';
            item.innerHTML =
                '<input type="radio" class="btn-check" name="rn-musica-pista" data-idx="' + i + '"' +
                ' id="rn-pista-' + i + '" value="' + esc(p.titulo) + '" autocomplete="off">' +
                '<label class="btn btn-outline-primary reel-pista-nombre" for="rn-pista-' + i + '">' +
                '<span>' + esc(p.titulo) + '</span>' +
                '<span class="reel-pista-meta">' +
                (p.grupo ? esc(p.grupo) + ' · ' : '') + esc(p.autor) + ' · ' + formatoAudio(p.dur) +
                '</span></label>' +
                '<button type="button" class="btn btn-outline-secondary reel-pista-play" data-idx="' + i + '"' +
                ' aria-pressed="false" aria-label="Escuchar ' + esc(p.titulo) + '">' +
                '<i class="fas fa-play" aria-hidden="true"></i></button>';
            listaMusica.appendChild(item);
        });
    }

    var audioPend = [];
    var audioCargando = false;

    function pideAudioData(fn) {
        if (window.TET_AUDIO) { fn(true); return; }
        audioPend.push(fn);
        if (audioCargando) return;
        audioCargando = true;
        var sc = document.createElement('script');
        sc.src = './public/js/audio-data.js?v=q5';
        sc.async = true;
        sc.onload = function () {
            audioCargando = false;
            var ok = !!window.TET_AUDIO;
            audioPend.splice(0).forEach(function (f) { f(ok); });
        };
        sc.onerror = function () {
            audioCargando = false;
            audioPend.splice(0).forEach(function (f) { f(false); });
        };
        document.head.appendChild(sc);
    }

    function dataURLaBlob(du) {
        var sep = du.indexOf(',');
        var mime = du.slice(du.indexOf(':') + 1, du.indexOf(';'));
        var bin = atob(du.slice(sep + 1));
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Blob([u8], { type: mime });
    }

    function eligeMusicaLista(p) {
        detenPreviewMusica();
        pideAudioData(function (ok) {
            if (!ok || !window.TET_AUDIO || !window.TET_AUDIO[p.id]) {
                aviso('No se pudo cargar «' + p.titulo + '»', 'danger');
                sincListaMusica();
                return;
            }
            var dt = new DataTransfer();
            dt.items.add(new File([dataURLaBlob(window.TET_AUDIO[p.id])], p.titulo, { type: 'audio/mpeg' }));
            inpMusica.files = dt.files;
            inpMusica.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function sincListaMusica() {
        if (!listaMusica) return;
        var radios = listaMusica.querySelectorAll('input[name="rn-musica-pista"]');
        for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === musicaNombre);
    }

    listaMusica.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || t.name !== 'rn-musica-pista') return;
        var p = PISTAS[parseInt(t.getAttribute('data-idx'), 10)];
        if (p) eligeMusicaLista(p);
    });

    var prevAudio = null;
    var prevIdx = -1;
    var prevCarga = 0;

    function detenPreviewMusica() {
        prevCarga++;
        if (prevAudio) {
            try { prevAudio.pause(); } catch (e) { }
            var src = prevAudio.src;
            prevAudio.removeAttribute('src');
            if (src.indexOf('blob:') === 0) {
                try { URL.revokeObjectURL(src); } catch (e) { }
            }
            try { prevAudio.remove(); } catch (e) { }
        }
        prevAudio = null;
        prevIdx = -1;
        pintaPreviewMusica();
    }

    function pintaPreviewMusica() {
        if (!listaMusica) return;
        var bs = listaMusica.querySelectorAll('.reel-pista-play');
        for (var i = 0; i < bs.length; i++) {
            var on = !!(prevAudio && prevIdx === i);
            bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
            bs[i].setAttribute('aria-label', (on ? 'Pausar ' : 'Escuchar ') + PISTAS[i].titulo);
            var ic = bs[i].querySelector('i');
            if (ic) ic.className = on ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    listaMusica.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.reel-pista-play') : null;
        if (!b) return;
        var i = parseInt(b.getAttribute('data-idx'), 10);
        if (prevAudio && prevIdx === i) { detenPreviewMusica(); return; }
        detenPreviewMusica();
        var yo = prevCarga;
        pideAudioData(function (ok) {
            if (yo !== prevCarga) return;
            if (!ok || !window.TET_AUDIO || !window.TET_AUDIO[PISTAS[i].id]) {
                aviso('No se pudo reproducir «' + PISTAS[i].titulo + '»', 'danger');
                return;
            }
            var a = new Audio(URL.createObjectURL(dataURLaBlob(window.TET_AUDIO[PISTAS[i].id])));
            a.volume = parseFloat(volMusica.value) || 0.7;
            a.addEventListener('ended', function () {
                if (prevAudio === a) detenPreviewMusica();
            });
            prevAudio = a;
            prevIdx = i;
            a.style.display = 'none';
            document.body.appendChild(a);
            pintaPreviewMusica();
            var prom = a.play();
            if (prom && prom.catch) prom.catch(function () {
                if (prevAudio === a) detenPreviewMusica();
            });
        });
    });

    function conectaAudio() {
        if (!musicaEl || !musicaUrl) return false;
        try {
            if (!audioCtx) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return false;
                audioCtx = new AC();
                fuenteMusica = audioCtx.createMediaElementSource(musicaEl);
                ganMusica = audioCtx.createGain();
                destAudio = audioCtx.createMediaStreamDestination();
                fuenteMusica.connect(ganMusica);
                ganMusica.connect(destAudio);
                ganMusica.connect(audioCtx.destination);
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            ganMusica.gain.value = parseFloat(volMusica.value) || 0.7;
            return true;
        } catch (e) {
            aviso('No se pudo preparar la música para grabar', 'warning');
            return false;
        }
    }
