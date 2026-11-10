    /* ---------- grabación ---------- */
    function eligeMime(conAudio) {
        var video = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        var audio = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus'
        ];
        var lista2 = conAudio ? audio.concat(video) : video;
        for (var i = 0; i < lista2.length; i++) {
            if (window.MediaRecorder && MediaRecorder.isTypeSupported(lista2[i])) return lista2[i];
        }
        return '';
    }

    function bitrate() {
        var W = lienzo.width;
        var H = lienzo.height;
        return Math.max(1500000, Math.min(24000000, Math.round(W * H * FPS * 0.10)));
    }

    function fechaCorta() {
        var d = new Date();
        return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' +
            pad2(d.getHours()) + pad2(d.getMinutes());
    }

    function preparaResultado(blob, dur) {
        if (!blob || !blob.size) {
            aviso('La grabación salió vacía. Prueba otra vez con la pestaña visible.', 'danger');
            if (estadoGrab) estadoGrab.textContent = 'La grabación salió vacía.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
            return;
        }
        var tipo = blob.type || 'video/webm';
        var ext = /mp4/.test(tipo) ? 'mp4' : 'webm';
        nombreResultado = 'reel-noticias-' + lienzo.width + 'x' + lienzo.height + '-' + fechaCorta() + '.' + ext;

        var listo = function (b) {
            if (urlResultado) URL.revokeObjectURL(urlResultado);
            urlResultado = URL.createObjectURL(b);
            blobResultado = b;
            archivoResultado = (typeof File === 'function')
                ? new File([b], nombreResultado, { type: tipo })
                : null;
            if (videoRes) {
                videoRes.src = urlResultado;
                videoRes.load();
            }
            if (btnDescargar) {
                btnDescargar.href = urlResultado;
                btnDescargar.download = nombreResultado;
            }
            if (btnCompartir) {
                var puede = !!(archivoResultado && navigator.canShare && navigator.canShare({ files: [archivoResultado] }));
                btnCompartir.hidden = !puede;
            }
            if (pesoRes) {
                pesoRes.textContent = 'Archivo: ' + nombreResultado + ' · ' +
                    (b.size / 1048576).toFixed(1).replace('.', ',') + ' MB' +
                    (dur > 0 ? ' · ' + seg(dur) : '');
            }
            if (resWrap) resWrap.hidden = false;
            if (estadoGrab) estadoGrab.textContent = 'Vídeo listo.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
        };

        if (/mp4/.test(tipo) && dur > 0) {
            blob.arrayBuffer().then(function (buf) {
                var parcheado = escribeDuracionMp4(buf, dur);
                if (parcheado) listo(new Blob([parcheado], { type: tipo }));
                else listo(blob);
            }).catch(function () { listo(blob); });
        } else {
            listo(blob);
        }
    }

    function escribeDuracionMp4(buf, segs) {
        try {
            var b = new Uint8Array(buf);
            var dv = new DataView(buf);
            var nom = function (i) { return String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]); };
            var leer = function (desde, hasta) {
                var out = [], off = desde;
                while (off + 8 <= hasta) {
                    var size = dv.getUint32(off);
                    var type = nom(off + 4);
                    var hdr = 8;
                    if (size === 1) { size = Number(dv.getBigUint64(off + 8)); hdr = 16; }
                    if (size < 8 || off + size > hasta) break;
                    out.push({ type: type, off: off, size: size, hdr: hdr });
                    off += size;
                }
                return out;
            };
            var moov = leer(0, b.length).filter(function (x) { return x.type === 'moov'; })[0];
            if (!moov) return null;
            var partes = leer(moov.off + moov.hdr, moov.off + moov.size);
            var tsPelicula = 0;
            partes.forEach(function (h) {
                if (h.type !== 'mvhd') return;
                var i = h.off + 4;
                tsPelicula = dv.getUint32(i + (b[i + 4] === 1 ? 24 : 16));
            });
            if (!tsPelicula) return null;
            var tocado = false;
            var pon = function (i, v1, posV1, posV0, segundos, ts) {
                var n = Math.round(segundos * ts);
                if (v1) {
                    if (Number(dv.getBigUint64(posV1)) !== n) {
                        dv.setBigUint64(posV1, BigInt(n));
                        tocado = true;
                    }
                } else {
                    var m = Math.min(4294967295, n);
                    if (dv.getUint32(posV0) !== m) { dv.setUint32(posV0, m); tocado = true; }
                }
            };
            partes.forEach(function (h) {
                var i = h.off + 4;
                if (h.type === 'mvhd') pon(i, b[i + 4] === 1, i + 28, i + 20, segs, tsPelicula);
                if (h.type !== 'trak') return;
                leer(h.off + h.hdr, h.off + h.size).forEach(function (t) {
                    var j = t.off + 4;
                    if (t.type === 'tkhd') pon(j, b[j + 4] === 1, j + 32, j + 24, segs, tsPelicula);
                    if (t.type !== 'mdia') return;
                    leer(t.off + t.hdr, t.off + t.size).forEach(function (m) {
                        var k = m.off + 4;
                        if (m.type !== 'mdhd') return;
                        var v = b[k + 4];
                        var ts = dv.getUint32(k + (v === 1 ? 24 : 16));
                        if (ts) pon(k, v === 1, k + 28, k + 20, segs, ts);
                    });
                });
            });
            return tocado ? b : null;
        } catch (e) { return null; }
    }

    function empiezaGrabacion() {
        if (grabando) return;
        if (!window.MediaRecorder || !lienzo.captureStream) {
            aviso('Tu navegador no permite grabar vídeo (MediaRecorder). Prueba con Chrome, Edge o Safari actualizado.', 'danger');
            return;
        }
        pausar();
        tActual = 0;
        pintar(0);

        var conMusica = !!(musicaEl && musicaUrl && conectaAudio());
        var mime = eligeMime(conMusica);
        if (!mime) {
            aviso('Tu navegador no admite ningún formato de vídeo para grabar.', 'danger');
            return;
        }
        var conAudio = conMusica && /(mp4a|opus)/.test(mime);
        if (conMusica && !conAudio) {
            aviso('Este navegador graba el vídeo sin pista de audio: la música no entrará.', 'warning');
        }
        var tipo = mime.indexOf('mp4') !== -1 ? 'video/mp4' : 'video/webm';
        var stream;
        pistaVideo = null;
        try {
            stream = lienzo.captureStream(0);
            pistaVideo = stream.getVideoTracks()[0];
            if (!pistaVideo || typeof pistaVideo.requestFrame !== 'function') {
                pistaVideo = null;
                stream = lienzo.captureStream(FPS);
            }
        } catch (e) {
            aviso('No se pudo capturar el lienzo: ' + e.message, 'danger');
            return;
        }
        if (conAudio && destAudio) {
            var pistaAudio = destAudio.stream.getAudioTracks()[0];
            if (pistaAudio) stream.addTrack(pistaAudio);
        }

        try {
            rec = new MediaRecorder(stream, {
                mimeType: mime,
                videoBitsPerSecond: bitrate(),
                audioBitsPerSecond: 128000
            });
        } catch (e) {
            try {
                rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate() });
            } catch (e2) {
                aviso('No se pudo iniciar la grabación: ' + e2.message, 'danger');
                return;
            }
        }

        trozos = [];
        cancelado = false;
        grabando = true;
        grabDur = duracionTotal();
        if (btnGrabar) btnGrabar.disabled = true;
        if (btnCancelar) btnCancelar.hidden = false;
        if (resWrap) resWrap.hidden = true;
        if (progWrap) progWrap.hidden = false;
        if (barraProg) barraProg.style.width = '0%';
        if (progBar) progBar.setAttribute('aria-valuenow', '0');
        if (estadoGrab) estadoGrab.textContent = 'Grabando… no cambies de pestaña.';

        if (conAudio && musicaEl) {
            try {
                musicaEl.currentTime = 0;
                var pm = musicaEl.play();
                if (pm && pm.catch) pm.catch(function () { });
            } catch (e) { }
        }

        rec.ondataavailable = function (ev) {
            if (ev.data && ev.data.size) trozos.push(ev.data);
        };

        rec.onerror = function () {
            grabando = false;
            if (rafGrab) { cancelAnimationFrame(rafGrab); rafGrab = null; }
            if (musicaEl) {
                try { musicaEl.pause(); musicaEl.currentTime = 0; } catch (e) { }
            }
            if (estadoGrab) estadoGrab.textContent = 'La grabación falló.';
            if (btnGrabar) btnGrabar.disabled = false;
            if (btnCancelar) btnCancelar.hidden = true;
            if (progWrap) progWrap.hidden = true;
            aviso('La grabación falló. Prueba a bajar el formato o usa otro navegador.', 'danger');
        };

        rec.onstop = function () {
            grabando = false;
            if (rafGrab) { cancelAnimationFrame(rafGrab); rafGrab = null; }
            if (musicaEl) {
                try { musicaEl.pause(); musicaEl.currentTime = 0; } catch (e) { }
            }
            var dur = Math.max(0, Math.min(grabDur, tActual));
            var blob = new Blob(trozos, { type: tipo });
            if (cancelado) {
                if (estadoGrab) estadoGrab.textContent = 'Grabación cancelada.';
                if (btnGrabar) btnGrabar.disabled = false;
                if (btnCancelar) btnCancelar.hidden = true;
                if (progWrap) progWrap.hidden = true;
                return;
            }
            preparaResultado(blob, dur);
        };

        rec.start(200);
        grabInicio = 0;
        proximoEnvio = 0;
        rafGrab = requestAnimationFrame(bucleGrabacion);
    }

    function bucleGrabacion(ts) {
        if (!grabando) return;
        if (!grabInicio) {
            grabInicio = ts;
            proximoEnvio = ts;
        }
        var D = duracionTotal();
        var t = Math.min(D, (ts - grabInicio) / 1000);
        var paso = 1000 / FPS;

        if (t >= D) {
            pintar(D);
            if (pistaVideo) { try { pistaVideo.requestFrame(); } catch (e) { } }
            actualizaProgreso(D);
            detieneGrabacion();
            return;
        }

        if (ts + 0.5 >= proximoEnvio) {
            proximoEnvio += paso;
            if (proximoEnvio <= ts) proximoEnvio = ts + paso;
            pintar(t);
            if (pistaVideo) { try { pistaVideo.requestFrame(); } catch (e) { } }
            actualizaProgreso(t);
        }
        rafGrab = requestAnimationFrame(bucleGrabacion);
    }

    function actualizaProgreso(t) {
        var D = duracionTotal();
        var pct = D > 0 ? clamp(t / D, 0, 1) * 100 : 0;
        if (barraProg) barraProg.style.width = pct.toFixed(1) + '%';
        if (progBar) progBar.setAttribute('aria-valuenow', Math.round(pct));
        if (estadoGrab) {
            estadoGrab.textContent = 'Grabando… ' + t.toFixed(1).replace('.', ',') + ' / ' +
                D.toFixed(1).replace('.', ',') + ' s';
        }
    }

    function detieneGrabacion() {
        if (!grabando || !rec) return;
        if (rafGrab) { cancelAnimationFrame(rafGrab); rafGrab = null; }
        try { rec.stop(); } catch (e) {
            grabando = false;
            aviso('No se pudo cerrar la grabación', 'danger');
        }
    }
