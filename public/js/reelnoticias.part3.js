    /* ---------- fondo, cabecera y cierre ---------- */
    function dibujaFondo(W, H) {
        var u = Math.min(W, H);
        ctx.fillStyle = ajustes.fondo;
        ctx.fillRect(0, 0, W, H);

        if (ajustes.degradado) {
            var g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, ajustes.fondo);
            g.addColorStop(1, ajustes.fondo2);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        var rg = ctx.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, Math.max(W, H) * 0.75);
        rg.addColorStop(0, rgba(ajustes.acento, 0.16));
        rg.addColorStop(0.6, rgba(ajustes.acento, 0.03));
        rg.addColorStop(1, rgba(ajustes.acento, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);

        var vg = ctx.createRadialGradient(W / 2, H / 2, u * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    }

    function dibujaBarra(W, H) {
        if (!barraImg) return;
        var u = Math.min(W, H);
        var h = W * BARRA_ALTO_NAT / BARRA_ANCHO_NAT;
        ctx.save();
        ctx.drawImage(barraImg, 0, 0, W, h);
        var g = ctx.createLinearGradient(0, h, 0, h + u * 0.022);
        g.addColorStop(0, 'rgba(0,0,0,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h, W, u * 0.022);
        ctx.restore();
    }

    function dibujaFin(W, H, endP) {
        var u = Math.min(W, H);
        var a = easeOut(endP);
        if (a <= 0.001) return;
        ctx.save();
        ctx.globalAlpha = a;
        var cx = W / 2;
        var cy = H * 0.46;

        if (logoImg) {
            var lado = u * 0.24;
            var escL = Math.min(lado / logoImg.width, lado / logoImg.height);
            var dw = logoImg.width * escL;
            var dh = logoImg.height * escL;
            ctx.drawImage(logoImg, cx - dw / 2, cy - dh / 2, dw, dh);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = ajustes.texto;
        ctx.font = '800 ' + (u * 0.075) + 'px ' + FUENTE;
        ctx.fillText('tet', cx, cy + u * 0.16);

        ctx.fillStyle = rgba(ajustes.texto, 0.75);
        ctx.font = '400 ' + (u * 0.028) + 'px ' + FUENTE;
        ctx.fillText('La tecnología tiene su espacio', cx, cy + u * 0.27);

        ctx.fillStyle = ajustes.acento;
        ctx.font = '700 ' + (u * 0.026) + 'px ' + FUENTE;
        ctx.fillText('somostet.com', cx, cy + u * 0.34);
        ctx.restore();
    }

    function dibujaProgreso(W, H) {
        if (!ajustes.progreso) return;
        var u = Math.min(W, H);
        var h = Math.max(2, u * 0.004);
        var y = H - Math.max(u * 0.022, h);
        var D = duracionTotal();
        var p = D > 0 ? clamp(tActual / D, 0, 1) : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(0, y, W, h);
        ctx.fillStyle = rgba(ajustes.acento, 0.9);
        ctx.fillRect(0, y, W * p, h);
        ctx.restore();
    }

    /* ---------- vídeos ---------- */
    function sincronizaVideos(est, tocando) {
        var activos = {};
        est.activos.forEach(function (a) {
            if (a.entryP > 0.15 && a.exitP > 0.1) activos[a.i] = a;
        });
        for (var i = 0; i < noticias.length; i++) {
            var c = noticias[i];
            if (!c.video) continue;
            var a = activos[i];
            if (!a || est.fin) {
                if (!c.video.paused) c.video.pause();
                if (c.video.currentTime > 0.04) {
                    try { c.video.currentTime = 0; } catch (e) { }
                }
                continue;
            }
            if (tocando) {
                if (c.video.paused) {
                    try {
                        var pr = c.video.play();
                        if (pr && pr.catch) pr.catch(function () { });
                    } catch (e) { }
                }
            } else {
                if (!c.video.paused) c.video.pause();
                var durV = Math.max(0.1, c.video.duration || 1);
                var objetivo = a.local % durV;
                if (Math.abs(c.video.currentTime - objetivo) > 0.08) {
                    try { c.video.currentTime = objetivo; } catch (e) { }
                }
            }
        }
    }

    /* ---------- pintado ---------- */
    function pintar(t) {
        var W = lienzo.width;
        var H = lienzo.height;
        var D = duracionTotal();
        t = clamp(t, 0, D);
        tActual = t;
        var est = estadoEn(t);

        sincronizaVideos(est, reproduciendo || grabando);

        ctx.clearRect(0, 0, W, H);
        dibujaFondo(W, H);

        var geo = geom(W, H);
        est.activos.forEach(function (a) {
            dibujaSlide(a, geo, W, H);
        });
        if (est.fin) {
            var tapaFin = suave(clamp(est.endP / 0.25, 0, 1));
            if (tapaFin > 0.001) {
                ctx.save();
                ctx.globalAlpha = tapaFin;
                dibujaFondo(W, H);
                ctx.restore();
            }
            dibujaFin(W, H, clamp((est.endP - 0.25) / 0.75, 0, 1));
        }

        dibujaBarra(W, H);
        dibujaProgreso(W, H);
        actualizaReloj();
    }

    /* ---------- reloj y reproducción ---------- */
    function actualizaReloj() {
        var D = duracionTotal();
        if (reloj) reloj.textContent = tActual.toFixed(1).replace('.', ',') + ' / ' + D.toFixed(1).replace('.', ',') + ' s';
        if (rangoTiempo) {
            rangoTiempo.max = D.toFixed(2);
            rangoTiempo.value = tActual.toFixed(2);
        }
    }

    function actualizaDuracion() {
        var D = duracionTotal();
        if (rangoTiempo) rangoTiempo.max = D.toFixed(2);
        if (tActual > D) tActual = D;
        actualizaReloj();
    }

    function ponBotonPlay(activo) {
        if (!btnPlay) return;
        btnPlay.innerHTML = activo
            ? '<i class="fas fa-pause" aria-hidden="true"></i> <span>Pausa</span>'
            : '<i class="fas fa-play" aria-hidden="true"></i> <span>Reproducir</span>';
        btnPlay.setAttribute('aria-label', activo ? 'Pausar' : 'Reproducir');
    }

    function reproducir() {
        if (grabando) return;
        if (reproduciendo) { pausar(); return; }
        if (tActual >= duracionTotal() - 0.02) tActual = 0;
        /* si estamos en la vista inicial (primera noticia ya entrada), al dar
           a reproducir se ve también su animación desde el principio */
        if (tActual > 0 && tActual <= entEfectiva() + 0.01) tActual = 0;
        reproduciendo = true;
        ultimoTs = 0;
        ponBotonPlay(true);
        rafPreview = requestAnimationFrame(buclePreview);
    }

    function pausar() {
        reproduciendo = false;
        if (rafPreview) { cancelAnimationFrame(rafPreview); rafPreview = null; }
        ponBotonPlay(false);
        pintar(tActual);
    }

    function buclePreview(ts) {
        if (!reproduciendo) return;
        if (!ultimoTs) ultimoTs = ts;
        var dt = (ts - ultimoTs) / 1000;
        ultimoTs = ts;
        dt = Math.min(dt, 0.1);
        tActual += dt;
        if (tActual >= duracionTotal()) tActual = 0;
        pintar(tActual);
        rafPreview = requestAnimationFrame(buclePreview);
    }

    /* ---------- lista de noticias ---------- */
    function pintaLista() {
        if (!lista) return;
        var html = '';
        noticias.forEach(function (c, i) {
            var tieneImg = !!c.imgUrl;
            var videoTxt = c.video ? c.videoNombre : 'Sin vídeo';
            html += '<div class="reel-ficha rn-ficha" data-i="' + i + '">' +
                '<div class="reel-ficha-num">' + pad2(i + 1) + '</div>' +
                '<label class="reel-ficha-thumb" for="rn-img-' + i + '" title="Elegir la imagen de la noticia ' + (i + 1) + '">' +
                (tieneImg
                    ? '<img src="' + esc(c.imgUrl) + '" alt="Imagen de la noticia ' + (i + 1) + '">'
                    : '<span><i class="fas fa-image" aria-hidden="true"></i>Portada</span>') +
                '</label>' +
                '<input type="file" class="d-none" id="rn-img-' + i + '" accept="image/*" data-img="' + i + '">' +
                '<div class="reel-ficha-campos">' +
                '<input type="text" class="form-control" data-campo="titulo" data-i="' + i + '" maxlength="90" value="' + esc(c.titulo) + '" placeholder="Titular de la noticia" aria-label="Título de la noticia ' + (i + 1) + '">' +
                '<textarea class="form-control" data-campo="detalle" data-i="' + i + '" rows="2" maxlength="320" placeholder="Entradilla o detalle (opcional)" aria-label="Detalle de la noticia ' + (i + 1) + '">' + esc(c.detalle) + '</textarea>' +
                '<div class="rn-ficha-ajuste">' +
                '<label for="rn-ajuste-' + i + '">Imagen</label>' +
                '<select class="form-select" id="rn-ajuste-' + i + '" data-campo="ajuste" data-i="' + i + '" aria-label="Ajuste de imagen de la noticia ' + (i + 1) + '">' +
                '<option value=""' + (!c.ajuste ? ' selected' : '') + '>Como el global</option>' +
                '<option value="cover"' + (c.ajuste === 'cover' ? ' selected' : '') + '>Rellenar</option>' +
                '<option value="contain"' + (c.ajuste === 'contain' ? ' selected' : '') + '>Entera</option>' +
                '<option value="marco"' + (c.ajuste === 'marco' ? ' selected' : '') + '>Marco redondeado</option>' +
                '</select></div>' +
                '<div class="reel-ficha-media">' +
                '<label class="btn btn-sm btn-outline-secondary" for="rn-video-' + i + '"><i class="fas fa-film" aria-hidden="true"></i> Vídeo</label>' +
                '<input type="file" class="d-none" id="rn-video-' + i + '" accept="video/*" data-video="' + i + '">' +
                '<span class="reel-ficha-video' + (c.video ? ' is-activo' : '') + '" data-video-nombre="' + i + '" title="' + esc(videoTxt) + '">' + esc(videoTxt) + '</span>' +
                (c.video ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-accion="quitar-video" data-i="' + i + '" title="Quitar el vídeo" aria-label="Quitar el vídeo de la noticia ' + (i + 1) + '"><i class="fas fa-times" aria-hidden="true"></i></button>' : '') +
                '</div>' +
                '</div>' +
                '<div class="reel-ficha-acciones">' +
                '<button type="button" data-accion="subir" data-i="' + i + '" title="Subir" aria-label="Subir la noticia ' + (i + 1) + '"' + (i === 0 ? ' disabled' : '') + '><i class="fas fa-arrow-up" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="bajar" data-i="' + i + '" title="Bajar" aria-label="Bajar la noticia ' + (i + 1) + '"' + (i === noticias.length - 1 ? ' disabled' : '') + '><i class="fas fa-arrow-down" aria-hidden="true"></i></button>' +
                '<button type="button" data-accion="quitar" data-i="' + i + '" title="Quitar" aria-label="Quitar la noticia ' + (i + 1) + '"><i class="fas fa-trash" aria-hidden="true"></i></button>' +
                '</div>' +
                '</div>';
        });
        lista.innerHTML = html;
    }

    function pintaMiniatura(i) {
        var c = noticias[i];
        var label = lista.querySelector('.rn-ficha[data-i="' + i + '"] .reel-ficha-thumb');
        if (!label) return;
        if (c.imgUrl) {
            label.innerHTML = '<img src="' + esc(c.imgUrl) + '" alt="Imagen de la noticia ' + (i + 1) + '">';
        } else {
            label.innerHTML = '<span><i class="fas fa-image" aria-hidden="true"></i>Portada</span>';
        }
    }

    function actualizaNombreVideo(i) {
        var c = noticias[i];
        var el = lista.querySelector('[data-video-nombre="' + i + '"]');
        if (!el) return;
        el.textContent = c.video ? c.videoNombre : 'Sin vídeo';
        el.title = el.textContent;
        el.classList.toggle('is-activo', !!c.video);
        var ficha = lista.querySelector('.rn-ficha[data-i="' + i + '"]');
        if (!ficha) return;
        var boton = ficha.querySelector('[data-accion="quitar-video"]');
        if (c.video && !boton) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-sm btn-outline-secondary';
            b.dataset.accion = 'quitar-video';
            b.dataset.i = i;
            b.title = 'Quitar el vídeo';
            b.setAttribute('aria-label', 'Quitar el vídeo de la noticia ' + (i + 1));
            b.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            el.parentNode.appendChild(b);
        } else if (!c.video && boton) {
            boton.remove();
        }
    }

    function leeImagen(file, i) {
        if (!file || !/^image\//.test(file.type)) {
            aviso('Ese archivo no es una imagen', 'warning');
            return;
        }
        var lector = new FileReader();
        lector.onload = function () {
            var img = new Image();
            img.onload = function () {
                noticias[i].img = img;
                noticias[i].imgUrl = lector.result;
                pintaMiniatura(i);
                pintar(tActual);
            };
            img.onerror = function () { aviso('No se pudo abrir la imagen', 'danger'); };
            img.src = lector.result;
        };
        lector.onerror = function () { aviso('No se pudo leer la imagen', 'danger'); };
        lector.readAsDataURL(file);
    }

    function cargaVideo(file, i) {
        if (!file || !/^video\//.test(file.type)) {
            aviso('Ese archivo no es un vídeo', 'warning');
            return;
        }
        var c = noticias[i];
        if (c.video) {
            try { c.video.pause(); } catch (e) { }
            c.video.removeAttribute('src');
            try { c.video.load(); } catch (e) { }
        }
        if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        c.videoUrl = URL.createObjectURL(file);
        c.videoNombre = file.name;
        var v = document.createElement('video');
        v.src = c.videoUrl;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.preload = 'auto';
        v.addEventListener('loadeddata', function () { pintar(tActual); });
        v.addEventListener('seeked', function () {
            if (!reproduciendo && !grabando) pintar(tActual);
        });
        v.addEventListener('error', function () {
            aviso('No se pudo abrir el vídeo «' + file.name + '»', 'danger');
        });
        c.video = v;
        actualizaNombreVideo(i);
        pintar(tActual);
    }

    function quitaVideo(i) {
        var c = noticias[i];
        if (!c.video) return;
        try { c.video.pause(); } catch (e) { }
        c.video.removeAttribute('src');
        try { c.video.load(); } catch (e) { }
        if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        c.video = null;
        c.videoUrl = null;
        c.videoNombre = '';
        actualizaNombreVideo(i);
        pintar(tActual);
    }

    function borraNoticia(i) {
        if (noticias.length <= 1) {
            aviso('Deja al menos una noticia', 'warning');
            return;
        }
        var c = noticias[i];
        if (c.video) {
            try { c.video.pause(); } catch (e) { }
            if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
        }
        noticias.splice(i, 1);
        pintaLista();
        actualizaDuracion();
        pintar(Math.min(tActual, duracionTotal()));
    }

    function mueveNoticia(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= noticias.length) return;
        var aux = noticias[i];
        noticias[i] = noticias[j];
        noticias[j] = aux;
        pintaLista();
        pintar(tActual);
    }

    function vaciaGuion() {
        if (!confirm('¿Vaciar todas las noticias del guion?')) return;
        noticias.forEach(function (c) {
            if (c.video) {
                try { c.video.pause(); } catch (e) { }
                if (c.videoUrl) URL.revokeObjectURL(c.videoUrl);
            }
        });
        noticias = [noticiaVacia()];
        pintaLista();
        actualizaDuracion();
        tActual = 0;
        pintar(0);
    }
