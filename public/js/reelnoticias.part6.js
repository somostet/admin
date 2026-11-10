    /* ---------- eventos de la interfaz ---------- */
    if (btnPlay) btnPlay.addEventListener('click', reproducir);

    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', function () {
            if (grabando) return;
            pausar();
            tActual = 0;
            pintar(0);
        });
    }

    if (rangoTiempo) {
        rangoTiempo.addEventListener('input', function () {
            if (grabando) return;
            if (reproduciendo) pausar();
            tActual = parseFloat(rangoTiempo.value) || 0;
            pintar(tActual);
        });
    }

    if (inpBarra) {
        inpBarra.addEventListener('change', function () {
            var b = BARRAS[parseInt(inpBarra.value, 10) || 0];
            if (!b) return;
            ajustes.barra = b.url;
            if (ajustes.coloresAuto) aplicaPaleta(b);
            cargaBarra(b.url);
            pintar(tActual);
        });
    }

    if (inpColoresAuto) {
        inpColoresAuto.addEventListener('change', function () {
            ajustes.coloresAuto = inpColoresAuto.checked;
            if (ajustes.coloresAuto) {
                aplicaPaleta(BARRAS[indiceBarra(ajustes.barra)] || BARRAS[0]);
            }
        });
    }

    if (selFormato) {
        selFormato.addEventListener('change', function () {
            if (grabando) {
                selFormato.value = ajustes.formato.w + 'x' + ajustes.formato.h;
                return;
            }
            aplicaFormato();
        });
    }

    if (selAjuste) {
        selAjuste.addEventListener('change', function () {
            ajustes.ajuste = selAjuste.value;
            pintar(tActual);
        });
    }

    if (selCajaTitulo) {
        selCajaTitulo.addEventListener('change', function () {
            ajustes.cajaTitulo = selCajaTitulo.value === '1';
            pintar(tActual);
        });
    }

    [
        [inpFondo, 'fondo'],
        [inpFondo2, 'fondo2'],
        [inpTexto, 'texto'],
        [inpAcento, 'acento'],
        [inpCaja, 'caja']
    ].forEach(function (par) {
        if (!par[0]) return;
        par[0].addEventListener('input', function () {
            ajustes[par[1]] = par[0].value;
            pintar(tActual);
        });
    });

    function enlazaCheck(inp, clave) {
        if (!inp) return;
        inp.addEventListener('change', function () {
            ajustes[clave] = inp.checked;
            pintar(tActual);
        });
    }

    enlazaCheck(inpDegradado, 'degradado');
    enlazaCheck(inpProgreso, 'progreso');
    enlazaCheck(inpTarjetaFinal, 'tarjetaFinal');
    enlazaCheck(inpZonaSegura, 'zonaSegura');

    function enlazaRango(inp, clave, val, fmt) {
        if (!inp) return;
        inp.addEventListener('input', function () {
            var v = parseFloat(inp.value);
            if (isNaN(v)) v = 0;
            ajustes[clave] = v;
            if (val) val.textContent = fmt(v);
            actualizaDuracion();
            if (tActual > duracionTotal()) tActual = duracionTotal();
            pintar(tActual);
        });
    }

    enlazaRango(inpDuracion, 'hold', valDuracion, seg);
    enlazaRango(inpEntrada, 'entrada', valEntrada, seg);
    enlazaRango(inpSalida, 'salida', valSalida, seg);
    enlazaRango(inpCierre, 'cierre', valCierre, seg);
    enlazaRango(inpZoom, 'zoom', valZoom, function (v) { return Math.round(v * 100) + ' %'; });

    function enlazaSelect(sel, clave) {
        if (!sel) return;
        sel.addEventListener('change', function () {
            ajustes[clave] = sel.value;
            pintar(tActual);
        });
    }

    enlazaSelect(selAnimImg, 'animImg');
    enlazaSelect(selAnimTitulo, 'animTitulo');
    enlazaSelect(selAnimDetalle, 'animDetalle');
    enlazaSelect(selSalidaTexto, 'salidaTexto');

    if (btnAgregar) {
        btnAgregar.addEventListener('click', function () {
            if (noticias.length >= MAX_NOTICIAS) {
                aviso('Máximo ' + MAX_NOTICIAS + ' noticias', 'warning');
                return;
            }
            noticias.push(noticiaVacia());
            pintaLista();
            actualizaDuracion();
            pintar(tActual);
            var ultima = lista.querySelector('.rn-ficha:last-child input[data-campo="titulo"]');
            if (ultima) ultima.focus();
        });
    }

    if (btnVaciar) btnVaciar.addEventListener('click', vaciaGuion);

    if (lista) {
        lista.addEventListener('input', function (e) {
            var el = e.target;
            var i = parseInt(el.dataset.i, 10);
            var campo = el.dataset.campo;
            if (isNaN(i) || !campo || !noticias[i]) return;
            noticias[i][campo] = el.value;
            if (!grabando) pintar(tActual);
        });

        lista.addEventListener('change', function (e) {
            var el = e.target;
            if (el.dataset.img != null) {
                var i = parseInt(el.dataset.img, 10);
                if (!isNaN(i)) leeImagen(el.files && el.files[0], i);
                el.value = '';
                return;
            }
            if (el.dataset.video != null) {
                var j = parseInt(el.dataset.video, 10);
                if (!isNaN(j)) cargaVideo(el.files && el.files[0], j);
                el.value = '';
            }
        });

        lista.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('button[data-accion]') : null;
            if (!btn) return;
            var i = parseInt(btn.dataset.i, 10);
            if (isNaN(i)) return;
            var accion = btn.dataset.accion;
            if (accion === 'subir') mueveNoticia(i, -1);
            else if (accion === 'bajar') mueveNoticia(i, 1);
            else if (accion === 'quitar') borraNoticia(i);
            else if (accion === 'quitar-video') quitaVideo(i);
        });
    }

    if (inpMusica) {
        inpMusica.addEventListener('change', function () {
            cargaMusica(inpMusica.files && inpMusica.files[0]);
            inpMusica.value = '';
        });
    }

    if (btnQuitarMusica) btnQuitarMusica.addEventListener('click', quitaMusica);

    if (volMusica) {
        volMusica.addEventListener('input', function () {
            var v = parseFloat(volMusica.value) || 0;
            if (valVolMusica) valVolMusica.textContent = Math.round(v * 100) + ' %';
            if (ganMusica) ganMusica.gain.value = v;
        });
    }

    if (btnGrabar) btnGrabar.addEventListener('click', empiezaGrabacion);

    if (btnCancelar) {
        btnCancelar.addEventListener('click', function () {
            cancelado = true;
            detieneGrabacion();
        });
    }

    if (btnDescartar) {
        btnDescartar.addEventListener('click', function () {
            if (videoRes) {
                videoRes.pause();
                videoRes.removeAttribute('src');
                videoRes.load();
            }
            if (urlResultado) URL.revokeObjectURL(urlResultado);
            urlResultado = null;
            blobResultado = null;
            archivoResultado = null;
            if (resWrap) resWrap.hidden = true;
            if (btnDescargar) btnDescargar.href = '#';
            if (estadoGrab) estadoGrab.textContent = '';
        });
    }

    if (btnCompartir) {
        btnCompartir.addEventListener('click', function () {
            if (!archivoResultado) return;
            if (navigator.canShare && navigator.canShare({ files: [archivoResultado] })) {
                navigator.share({ files: [archivoResultado], title: 'Reel de noticias' }).catch(function () { });
            }
        });
    }

    var pestanas = document.getElementById('rn-pestanas');
    if (pestanas) {
        pestanas.addEventListener('shown.bs.tab', function () { pintar(tActual); });
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && reproduciendo) pausar();
    });

    /* ---------- arranque ---------- */
    function arranca() {
        pintaSelectBarras();
        sincronizaControles();
        pintaLista();
        pintaListaMusica();
        aplicaFormato();
        cargaBarra(ajustes.barra);
        cargaImagen('./public/img/Logotet.png', function (img) {
            logoImg = img;
            pintar(tActual);
        });
        /* la primera vista muestra la noticia ya entrada, no el lienzo vacío */
        tActual = entEfectiva();
        pintar(tActual);
    }

    cargarPlantillasData(function () {
        arranca();
        if (location.protocol === 'file:' && !window.TET_PLANTILLAS) {
            aviso('No se pudieron cargar las imágenes embebidas. En modo archivo la grabación puede fallar; abre la página desde el servidor local.', 'warning');
        }
    });

    window.tetReelNoticias = {
        pintar: pintar,
        ir: function (t) { pausar(); tActual = clamp(t, 0, duracionTotal()); pintar(tActual); },
        estado: function () { return { t: tActual, total: duracionTotal(), estado: estadoEn(tActual) }; },
        noticias: function () { return noticias; }
    };
})();
