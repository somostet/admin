    /* ---------- texto ---------- */
    function parteTexto(texto, maxW, maxLineas) {
        var limpio = String(texto || '').replace(/\s+/g, ' ').trim();
        if (!limpio) return [];
        var palabras = limpio.split(' ');
        var lineas = [];
        var actual = '';
        for (var i = 0; i < palabras.length; i++) {
            var prueba = actual ? actual + ' ' + palabras[i] : palabras[i];
            if (!actual || ctx.measureText(prueba).width <= maxW) {
                actual = prueba;
            } else {
                lineas.push(actual);
                actual = palabras[i];
            }
        }
        if (actual) lineas.push(actual);
        if (maxLineas && lineas.length > maxLineas) {
            lineas = lineas.slice(0, maxLineas);
            var ultima = lineas[maxLineas - 1];
            while (ultima.length > 1 && ctx.measureText(ultima + '…').width > maxW) {
                ultima = ultima.slice(0, -1);
            }
            lineas[maxLineas - 1] = ultima.replace(/[\s,;:.\-]+$/, '') + '…';
        }
        return lineas;
    }

    function parteTextoPalabras(texto, maxW, maxLineas) {
        var limpio = String(texto || '').replace(/\s+/g, ' ').trim();
        if (!limpio) return [];
        var palabras = limpio.split(' ');
        var espacio = ctx.measureText(' ').width;
        var lineas = [];
        var actual = [];
        var ancho = 0;
        for (var i = 0; i < palabras.length; i++) {
            var w = ctx.measureText(palabras[i]).width;
            if (actual.length && ancho + espacio + w > maxW) {
                lineas.push(actual);
                actual = [];
                ancho = 0;
            }
            actual.push({ t: palabras[i], w: w });
            ancho += (actual.length > 1 ? espacio : 0) + w;
        }
        if (actual.length) lineas.push(actual);
        if (maxLineas && lineas.length > maxLineas) {
            lineas = lineas.slice(0, maxLineas);
            lineas[maxLineas - 1].push({ t: '…', w: ctx.measureText('…').width });
        }
        return lineas.map(function (linea) {
            var x = 0;
            linea.forEach(function (p) {
                p.x = x;
                x += p.w + espacio;
            });
            return { palabras: linea };
        });
    }

    function ajustaTitulo(texto, maxW, maxH, peso, tamMax, tamMin) {
        var tam = tamMax;
        var lineas = [];
        var lh = 0;
        var maxLineas = 5;
        for (var k = 0; k < 80; k++) {
            ctx.font = peso + ' ' + tam + 'px ' + FUENTE;
            lineas = parteTexto(texto, maxW, maxLineas);
            lh = tam * 1.08;
            if (lineas.length * lh <= maxH || tam <= tamMin) break;
            tam = Math.max(tamMin, tam - Math.max(1, tam * 0.055));
        }
        ctx.font = peso + ' ' + tam + 'px ' + FUENTE;
        lineas = parteTexto(texto, maxW, maxLineas);
        lh = tam * 1.08;
        var cabe = Math.max(1, Math.floor(maxH / lh));
        if (lineas.length > cabe) {
            lineas = lineas.slice(0, cabe);
            var ultima = lineas[cabe - 1];
            while (ultima.length > 1 && ctx.measureText(ultima + '…').width > maxW) {
                ultima = ultima.slice(0, -1);
            }
            lineas[cabe - 1] = ultima.replace(/[\s,;:.\-]+$/, '') + '…';
        }
        return { lineas: lineas, tam: tam, lh: lh, alto: lineas.length * lh };
    }

    function layoutTexto(c, i, geo, W, H) {
        var u = geo.u;
        var t = geo.txt;
        var vertical = geo.vertical;
        var ratio = H / W;
        var labelTam = u * (vertical ? 0.026 : 0.022);
        var labelH = labelTam * 1.2;
        var gap = u * 0.018;
        var footerTam = u * 0.019;
        var footerH = footerTam * 1.4;
        var detTam = u * (vertical ? 0.030 : 0.024);
        var detLh = detTam * 1.45;
        var detMax = vertical ? (ratio > 1.6 ? 5 : (ratio > 1.15 ? 4 : 3)) : 6;

        ctx.font = '400 ' + detTam + 'px ' + FUENTE;
        var detLineas = c.detalle ? parteTexto(c.detalle, t.w, detMax) : [];
        var detAlto = detLineas.length * detLh;

        var boxPad = ajustes.cajaTitulo ? u * 0.028 : 0;
        var titleMaxW = Math.max(u * 0.1, t.w - 2 * boxPad);
        var titleMaxH = t.h - labelH - gap - (detAlto ? gap + detAlto : 0) - footerH - u * 0.05;
        titleMaxH = Math.max(u * 0.09, titleMaxH);

        var titMax = u * (vertical ? 0.088 : 0.066);
        var titMin = u * 0.036;
        var tit = ajustaTitulo(c.titulo || ('Noticia ' + (i + 1)),
            titleMaxW, Math.max(u * 0.06, titleMaxH - 2 * boxPad), '800', titMax, titMin);
        var titAlto = tit.alto + 2 * boxPad;

        var labelY = t.y;
        var lineY = labelY + labelH + u * 0.006;
        var titleY = lineY + u * 0.022;
        var titleTextY = titleY + boxPad;
        var detailY = titleY + titAlto + u * 0.03;
        var footerY = t.y + t.h - footerH;

        return {
            labelTam: labelTam, labelH: labelH, gap: gap,
            footerTam: footerTam, footerH: footerH,
            detTam: detTam, detLh: detLh, detLineas: detLineas, detAlto: detAlto,
            boxPad: boxPad, titleMaxW: titleMaxW, titleMaxH: titleMaxH,
            tit: tit, titAlto: titAlto,
            labelY: labelY, lineY: lineY, titleY: titleY,
            titleTextY: titleTextY, detailY: detailY, footerY: footerY
        };
    }

    /* ---------- imágenes ---------- */
    function dibujaMedioAjustado(obj, r, modo, zoom, alpha) {
        var iw = obj.videoWidth || obj.naturalWidth || obj.width || 0;
        var ih = obj.videoHeight || obj.naturalHeight || obj.height || 0;
        if (!iw || !ih) return;
        ctx.save();
        ctx.globalAlpha = ctx.globalAlpha * (alpha == null ? 1 : alpha);
        var s;
        if (modo === 'contain') {
            s = Math.min(r.w / iw, r.h / ih);
        } else {
            s = Math.max(r.w / iw, r.h / ih) * (zoom || 1);
        }
        var dw = iw * s;
        var dh = ih * s;
        ctx.drawImage(obj, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
        ctx.restore();
    }

    function portadaVacia(i, r) {
        var tonos = [214, 278, 196, 28, 338, 122, 250, 42];
        var h = tonos[i % tonos.length];
        var g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        g.addColorStop(0, 'hsl(' + h + ', 46%, 30%)');
        g.addColorStop(0.6, 'hsl(' + ((h + 24) % 360) + ', 44%, 20%)');
        g.addColorStop(1, 'hsl(' + ((h + 48) % 360) + ', 40%, 13%)');
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.save();
        ctx.globalAlpha *= 0.18;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, r.w * 0.006);
        for (var k = -1; k < 5; k++) {
            ctx.beginPath();
            ctx.moveTo(r.x + k * r.w * 0.34, r.y + r.h);
            ctx.lineTo(r.x + k * r.w * 0.34 + r.h, r.y);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.font = '800 ' + (r.w * 0.20) + 'px ' + FUENTE;
        ctx.fillText(pad2(i + 1), r.x + r.w / 2, r.y + r.h * 0.46);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '600 ' + (r.w * 0.052) + 'px ' + FUENTE;
        ctx.fillText('SIN IMAGEN', r.x + r.w / 2, r.y + r.h * 0.70);
        ctx.restore();
    }

    function dibujaMarcoImagen(c, i, r, u, escala, dy, alpha, zoomCont, entryP) {
        var modo = c.ajuste || ajustes.ajuste;
        var pad = modo === 'marco' ? u * 0.018 : 0;
        var radio = modo === 'marco' ? u * 0.032 : u * 0.02;
        var rMedio = {
            x: r.x + pad,
            y: r.y + pad,
            w: Math.max(1, r.w - 2 * pad),
            h: Math.max(1, r.h - 2 * pad)
        };
        var cx = r.x + r.w / 2;
        var cy = r.y + r.h / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy + dy);
        ctx.scale(escala, escala);
        ctx.translate(-cx, -cy);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = u * 0.03;
        ctx.shadowOffsetY = u * 0.01;
        ctx.fillStyle = ajustes.caja;
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.fill();
        ctx.restore();

        ctx.save();
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.clip();

        var main = c.img || (c.video && c.video.readyState >= 2 ? c.video : null);

        if (modo === 'contain') {
            ctx.fillStyle = rgba(ajustes.caja, 0.75);
            ctx.fillRect(r.x, r.y, r.w, r.h);
            if (main) {
                ctx.save();
                ctx.globalAlpha *= 0.20;
                dibujaMedioAjustado(main, r, 'cover', 1, 1);
                ctx.restore();
            }
        }

        if (modo === 'marco') {
            ctx.save();
            rectRedondeado(ctx, rMedio.x, rMedio.y, rMedio.w, rMedio.h, radio * 0.8);
            ctx.clip();
            if (main) dibujaMedioAjustado(main, rMedio, 'cover', zoomCont, 1);
            else portadaVacia(i, rMedio);
            if (c.img && c.video && c.video.readyState >= 2) {
                var va = suave((entryP - 0.3) / 0.5);
                if (va > 0.01) dibujaMedioAjustado(c.video, rMedio, 'cover', zoomCont, va);
            }
            ctx.restore();
        } else {
            if (main) dibujaMedioAjustado(main, r, modo, zoomCont, 1);
            else portadaVacia(i, r);
            if (c.img && c.video && c.video.readyState >= 2) {
                var va2 = suave((entryP - 0.3) / 0.5);
                if (va2 > 0.01) dibujaMedioAjustado(c.video, r, modo, zoomCont, va2);
            }
        }

        ctx.restore();

        ctx.strokeStyle = modo === 'marco' ? rgba(ajustes.acento, 0.7) : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = Math.max(1.5, u * 0.0025);
        rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
        ctx.stroke();
        ctx.restore();
    }

    /* ---------- dibujo de una noticia ---------- */
    function dibujaTexto(c, i, a, geo, entry, entryRaw, exitA, ex) {
        var L = layoutTexto(c, i, geo, lienzo.width, lienzo.height);
        var u = geo.u;
        var t = geo.txt;
        var animT = ajustes.animTitulo;
        var animD = ajustes.animDetalle;

        var exitDy = 0;
        var exitScale = 1;
        if (ajustes.salidaTexto === 'subir') exitDy = -ex * u * 0.07;
        else if (ajustes.salidaTexto === 'escala') exitScale = 1 + ex * 0.09;

        /* índice y regla */
        ctx.save();
        ctx.globalAlpha = exitA * entry;
        ctx.fillStyle = ajustes.acento;
        ctx.font = '700 ' + L.labelTam + 'px ' + FUENTE;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('NOTICIA ' + pad2(i + 1) + ' / ' + pad2(noticias.length), t.x, L.labelY);
        ctx.fillStyle = rgba(ajustes.acento, 0.9);
        ctx.fillRect(t.x, L.lineY, u * 0.07, Math.max(2, u * 0.004));
        ctx.restore();

        /* titular */
        var tA = (animT === 'subir' || animT === 'pop') ? entry : 1;
        var tDy = animT === 'subir' ? (1 - entry) * u * 0.07 : 0;
        var tSc = animT === 'pop' ? (0.84 + 0.16 * easeOutBack(entryRaw)) : 1;
        ctx.save();
        ctx.globalAlpha = exitA * (animT === 'palabra' ? entry : tA);
        var tcx = t.x + t.w / 2;
        var tcy = L.titleY + L.titAlto / 2;
        ctx.translate(tcx, tcy + tDy + exitDy);
        ctx.scale(tSc * exitScale, tSc * exitScale);
        ctx.translate(-tcx, -tcy);

        if (ajustes.cajaTitulo) {
            ctx.fillStyle = rgba(ajustes.caja, 0.92);
            rectRedondeado(ctx, t.x, L.titleY, t.w, L.titAlto, u * 0.018);
            ctx.fill();
            ctx.fillStyle = ajustes.acento;
            rectRedondeado(ctx, t.x, L.titleY, u * 0.012, L.titAlto, u * 0.006);
            ctx.fill();
        }

        ctx.fillStyle = ajustes.texto;
        ctx.font = '800 ' + L.tit.tam + 'px ' + FUENTE;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        var tx = t.x + L.boxPad;
        var ty = L.titleTextY;

        if (animT === 'palabra') {
            var lineasP = parteTextoPalabras(c.titulo || ('Noticia ' + (i + 1)), L.titleMaxW, 5);
            var total = 0;
            lineasP.forEach(function (l) { total += l.palabras.length; });
            var wi = 0;
            lineasP.forEach(function (l, li) {
                l.palabras.forEach(function (p) {
                    var ap = clamp((entryRaw * (total + 3) - wi) / 3, 0, 1);
                    ctx.globalAlpha = exitA * ap;
                    ctx.fillText(p.t, tx + p.x, ty + li * L.tit.lh);
                    wi++;
                });
            });
        } else {
            L.tit.lineas.forEach(function (linea, li) {
                ctx.fillText(linea, tx, ty + li * L.tit.lh);
            });
        }
        ctx.restore();

        /* entradilla */
        if (L.detLineas.length) {
            var dA = (animD === 'subir' || animD === 'fundido') ? entry : 1;
            var dDy = animD === 'subir' ? (1 - entry) * u * 0.05 : 0;
            ctx.save();
            ctx.globalAlpha = exitA * dA;
            var dcx = t.x + t.w / 2;
            var dcy = L.detailY + L.detAlto / 2;
            ctx.translate(dcx, dcy + dDy + exitDy);
            ctx.scale(exitScale, exitScale);
            ctx.translate(-dcx, -dcy);
            ctx.fillStyle = rgba(ajustes.texto, 0.78);
            ctx.font = '400 ' + L.detTam + 'px ' + FUENTE;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            if (animD === 'linea') {
                L.detLineas.forEach(function (linea, li) {
                    var al = clamp((entryRaw * (L.detLineas.length + 2) - li) / 1.5, 0, 1);
                    ctx.globalAlpha = exitA * al;
                    ctx.fillText(linea, t.x, L.detailY + li * L.detLh + (1 - al) * u * 0.008);
                });
            } else {
                L.detLineas.forEach(function (linea, li) {
                    ctx.fillText(linea, t.x, L.detailY + li * L.detLh);
                });
            }
            ctx.restore();
        }

        /* pie */
        ctx.save();
        ctx.globalAlpha = exitA * 0.5;
        ctx.fillStyle = ajustes.texto;
        ctx.font = '500 ' + L.footerTam + 'px ' + FUENTE;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('somostet.com', t.x + t.w, L.footerY);
        ctx.restore();
    }

    function dibujaSlide(a, geo, W, H) {
        var c = noticias[a.i];
        if (!c) return;
        var u = geo.u;
        var entryRaw = a.entryP;

        /* Al cambiar de noticia, la nueva pinta su propio fondo encima de la
           anterior: tapa el texto viejo antes de que aparezca el nuevo y evita
           el efecto de doble exposición. */
        if (a.i > 0) {
            var tapa = suave(clamp(entryRaw / 0.25, 0, 1));
            if (tapa > 0.001) {
                ctx.save();
                ctx.globalAlpha = tapa;
                dibujaFondo(W, H);
                ctx.restore();
            }
            entryRaw = clamp((entryRaw - 0.25) / 0.75, 0, 1);
        }

        var entry = easeOut(entryRaw);
        var exitA = easeInOut(a.exitP);
        var ex = 1 - exitA;

        var escala = 1;
        var dy = 0;
        if (ajustes.animImg === 'zoom') {
            escala = 1.08 - 0.08 * entry;
        } else if (ajustes.animImg === 'pop') {
            escala = 0.82 + 0.18 * easeOutBack(entryRaw);
        } else if (ajustes.animImg === 'deslizar') {
            dy = (1 - entry) * u * 0.09;
        }
        escala *= 1 + ex * 0.03;
        dy -= ex * u * 0.02;

        var imgA = entry * exitA;
        var zoomCont = 1 + ajustes.zoom * clamp(a.local / Math.max(0.001, ajustes.hold), 0, 1);
        dibujaMarcoImagen(c, a.i, geo.img, u, escala, dy, imgA, zoomCont, entryRaw);
        dibujaTexto(c, a.i, a, geo, entry, entryRaw, exitA, ex);
    }
