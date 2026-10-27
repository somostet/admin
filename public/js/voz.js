/* ============================================================
   voz.js — pestaña «Voz» del editor de vídeo (video.html)
   Escribe un texto y el navegador lo lee en voz alta con las voces del
   sistema (Web Speech API): gratis, sin servidor y sin descargar nada.
   Las frases se trocean para que Chrome no corte las locuciones largas.

   La voz del sistema NO se puede exportar a archivo (no pasa por Web
   Audio), así que aquí sirve para ensayar la narración y medir cuánto
   dura. El bloque Piper de esta misma pestaña genera e importa el WAV
   para la exportación.

   El marcado de la pestaña está en video.html; este archivo solo rellena
   el contenedor #voz-caja.
   ============================================================ */
(function () {
    'use strict';

    var caja = document.getElementById('voz-caja');
    if (!caja) return;

    var synth = window.speechSynthesis;
    var SOPORTADO = !!(synth && window.SpeechSynthesisUtterance);

    var CLAVE = 'tetVoz:' + (location.pathname || 'video');
    /* Chrome corta las locuciones de más de ~15 s: mejor frases cortas. */
    var MAX_FRASE = 180;
    /* ritmo medio de locución en español, palabras por segundo */
    var PALABRAS_SEG = 2.5;

    var voces = [];
    var cola = [];
    var idx = 0;
    var hablando = false;
    var pausado = false;

    function num(v, def) {
        var n = parseFloat(v);
        return isFinite(n) ? n : def;
    }
    function porId(id) {
        return document.getElementById(id);
    }

    caja.innerHTML =
        '<p class="voz-intro">Escribe la narración una sola vez. Puedes ensayarla con la voz del sistema ' +
            'o generar un WAV con Piper para incluirlo en el vídeo.</p>' +

        '<label class="form-label" for="voz-texto">Texto</label>' +
        '<textarea class="form-control" id="voz-texto" rows="6" ' +
            'placeholder="Escribe aquí la narración…"></textarea>' +
        '<div class="voz-cuenta">' +
            '<span id="voz-chars">0 caracteres</span>' +
            '<span id="voz-dur">≈ 0 s</span>' +
        '</div>' +

        '<label class="form-label mt-3" for="voz-voz">Voz</label>' +
        '<select class="form-select" id="voz-voz"></select>' +
        '<p class="voz-nota" id="voz-nota-voz"></p>' +

        '<div class="voz-grid">' +
            '<div>' +
                '<label class="form-label" for="voz-rate">Velocidad ' +
                    '<span class="voz-val" id="voz-rate-val">1,0×</span></label>' +
                '<input type="range" class="form-range" id="voz-rate" ' +
                    'min="0.5" max="2" step="0.1" value="1">' +
            '</div>' +
            '<div>' +
                '<label class="form-label" for="voz-pitch">Tono ' +
                    '<span class="voz-val" id="voz-pitch-val">1,0</span></label>' +
                '<input type="range" class="form-range" id="voz-pitch" ' +
                    'min="0" max="2" step="0.1" value="1">' +
            '</div>' +
            '<div>' +
                '<label class="form-label" for="voz-vol">Volumen ' +
                    '<span class="voz-val" id="voz-vol-val">100 %</span></label>' +
                '<input type="range" class="form-range" id="voz-vol" ' +
                    'min="0" max="1" step="0.05" value="1">' +
            '</div>' +
        '</div>' +

        '<div class="voz-acciones">' +
            '<button type="button" class="btn btn-primary btn-sm" id="voz-play">' +
                '<i class="fas fa-play" aria-hidden="true"></i> Reproducir</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" id="voz-pausa" disabled>' +
                '<i class="fas fa-pause" aria-hidden="true"></i> Pausar</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" id="voz-stop" disabled>' +
                '<i class="fas fa-stop" aria-hidden="true"></i> Detener</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" id="voz-copiar">' +
                '<i class="far fa-copy" aria-hidden="true"></i> Copiar</button>' +
        '</div>' +

        '<p class="voz-estado" id="voz-estado" aria-live="polite">Listo.</p>' +

        '<section class="voz-piper" aria-labelledby="voz-piper-titulo">' +
            '<h3 id="voz-piper-titulo">Generar voz neuronal para el vídeo</h3>' +
            '<p class="voz-nota">Piper usará el mismo texto de arriba. La primera vez descarga el modelo de voz; ' +
                'necesita conexión y abrir el editor desde HTTPS o localhost.</p>' +
            '<label class="form-label" for="voz-piper-modelo">Voz de Piper</label>' +
            '<select class="form-select" id="voz-piper-modelo">' +
                '<option value="es_ES-davefx-medium">Español · España · hombre · Davefx</option>' +
                '<option value="es_ES-sharvard-medium">Español · España · mujer · Sharvard</option>' +
                '<option value="es_MX-claude-high">Español · México · mujer · Claude</option>' +
                '<option value="es_MX-ald-medium">Español · México · hombre · Aldo</option>' +
                '<option value="es_ES-carlfm-x_low">Español · España · hombre · CarlFM (ligera)</option>' +
            '</select>' +
            '<div class="voz-acciones">' +
                '<button type="button" class="btn btn-outline-primary btn-sm" id="voz-piper-cargar">' +
                    '<i class="fas fa-download" aria-hidden="true"></i> Cargar modelo</button>' +
                '<button type="button" class="btn btn-primary btn-sm" id="voz-piper-generar" disabled>' +
                    '<i class="fas fa-microphone-alt" aria-hidden="true"></i> Generar e importar WAV</button>' +
                '<a class="btn btn-outline-secondary btn-sm" id="voz-piper-descargar" ' +
                    'href="#" download="voz-piper.wav" hidden>Descargar WAV</a>' +
            '</div>' +
            '<div class="progress voz-piper-progreso" id="voz-piper-progreso-caja" hidden ' +
                'role="progressbar" aria-label="Progreso de Piper" aria-valuemin="0" aria-valuemax="100">' +
                '<div class="progress-bar" id="voz-piper-progreso"></div>' +
            '</div>' +
            '<audio class="voz-piper-audio" id="voz-piper-audio" controls hidden></audio>' +
            '<p class="voz-estado" id="voz-piper-estado" aria-live="polite">Carga un modelo para empezar.</p>' +
        '</section>' +

        '<div class="alert alert-warning voz-aviso">' +
            '<p><i class="fas fa-info-circle" aria-hidden="true"></i> ' +
                'La voz del sistema solo sirve para ensayar y medir la duración. El WAV generado con Piper ' +
                'se importa automáticamente como voz para la exportación del vídeo.</p>' +
        '</div>';

    var inTexto = porId('voz-texto');
    var cuChars = porId('voz-chars');
    var cuDur = porId('voz-dur');
    var selVoz = porId('voz-voz');
    var notaVoz = porId('voz-nota-voz');
    var inRate = porId('voz-rate');
    var inPitch = porId('voz-pitch');
    var inVol = porId('voz-vol');
    var valRate = porId('voz-rate-val');
    var valPitch = porId('voz-pitch-val');
    var valVol = porId('voz-vol-val');
    var btnPlay = porId('voz-play');
    var btnPausa = porId('voz-pausa');
    var btnStop = porId('voz-stop');
    var btnCopiar = porId('voz-copiar');
    var estado = porId('voz-estado');

    /* ---------------- avisos ---------------- */
    function avisar(msg, tipo) {
        if (window.mostrarAviso) {
            window.mostrarAviso(msg, tipo);
            return;
        }
        estado.textContent = msg;
        estado.classList.toggle('es-error', tipo === 'danger' || tipo === 'warning');
    }

    /* ---------------- preferencias ---------------- */
    function guardar() {
        try {
            localStorage.setItem(CLAVE, JSON.stringify({
                texto: inTexto.value,
                voz: selVoz.value,
                rate: inRate.value,
                pitch: inPitch.value,
                vol: inVol.value
            }));
        } catch (e) { /* modo privado o cuota llena */ }
    }
    function cargar() {
        var d = null;
        try { d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { }
        if (!d) return;
        if (typeof d.texto === 'string') inTexto.value = d.texto;
        if (d.rate) inRate.value = d.rate;
        if (d.pitch) inPitch.value = d.pitch;
        if (d.vol) inVol.value = d.vol;
    }

    /* ---------------- voces ---------------- */
    function esEspanol(v) {
        return /^es\b|^es[-_]/i.test(v.lang || '');
    }
    /* Las que mejor suenan por defecto en cada sistema. */
    var PREFERIDAS = /(Elvira|Álvaro|Alvaro|Helena|Laura|Sabina|Pablo|Raúl|Raul|Mónica|Monica|Paulina|Marisol|Jorge|Diego|Google español|Google US Spanish)/i;

    function pintarVoces() {
        if (!synth) return;
        var lista = synth.getVoices().slice();
        if (!lista.length) {
            notaVoz.textContent = 'El navegador todavía no ha cargado las voces.';
            return;
        }
        voces = lista;

        var espanolas = lista.filter(esEspanol);
        var resto = lista.filter(function (v) { return !esEspanol(v); });
        var orden = function (a, b) {
            var pa = PREFERIDAS.test(a.name) ? 0 : 1;
            var pb = PREFERIDAS.test(b.name) ? 0 : 1;
            if (pa !== pb) return pa - pb;
            return (a.name || '').localeCompare(b.name || '');
        };
        espanolas.sort(orden);
        resto.sort(orden);

        var antes = selVoz.value;
        selVoz.innerHTML = '';

        if (!espanolas.length) {
            notaVoz.textContent = 'No hay voces en español instaladas; se muestran todas. ' +
                'Puedes añadir una en los ajustes de voz del sistema.';
        } else {
            notaVoz.textContent = espanolas.length +
                (espanolas.length === 1 ? ' voz en español disponible.' : ' voces en español disponibles.');
        }

        function grupo(titulo, arr) {
            if (!arr.length) return;
            var g = document.createElement('optgroup');
            g.label = titulo;
            arr.forEach(function (v) {
                var o = document.createElement('option');
                o.value = v.voiceURI || (v.name + '|' + v.lang);
                o.textContent = v.name + ' · ' + v.lang +
                    (v.localService === false ? ' · online' : '');
                g.appendChild(o);
            });
            selVoz.appendChild(g);
        }
        grupo('Español', espanolas);
        grupo('Otras voces', resto);

        /* 1) la guardada, 2) la preferida en español, 3) la primera */
        var guardada = null;
        try { guardada = (JSON.parse(localStorage.getItem(CLAVE) || 'null') || {}).voz; } catch (e) { }
        var elegida = null;
        if (guardada) {
            elegida = voces.filter(function (v) {
                return (v.voiceURI || (v.name + '|' + v.lang)) === guardada;
            })[0] || null;
        }
        if (!elegida) elegida = espanolas[0] || voces[0] || null;
        if (elegida) selVoz.value = elegida.voiceURI || (elegida.name + '|' + elegida.lang);
        else if (antes) selVoz.value = antes;

        if (!antes) guardar();
    }

    function vozActual() {
        var clave = selVoz.value;
        for (var i = 0; i < voces.length; i++) {
            var v = voces[i];
            if ((v.voiceURI || (v.name + '|' + v.lang)) === clave) return v;
        }
        return null;
    }

    /* iOS/Safari no disparan addEventListener en synth: se usan las dos vías. */
    if (synth) {
        synth.onvoiceschanged = pintarVoces;
        if (synth.addEventListener) synth.addEventListener('voiceschanged', pintarVoces);
        /* Chrome devuelve [] la primera vez: se reintenta un par de veces. */
        [0, 250, 900, 2000].forEach(function (ms) {
            window.setTimeout(pintarVoces, ms);
        });
    }

    /* ---------------- troceado ---------------- */
    function trocear(txt) {
        var limpio = String(txt || '').replace(/\s+/g, ' ').trim();
        if (!limpio) return [];
        var frases = limpio.match(/[^.!?…]+[.!?…]*/g) || [limpio];
        var out = [];
        frases.forEach(function (f) {
            f = f.trim();
            while (f.length > MAX_FRASE) {
                var corte = f.lastIndexOf(' ', MAX_FRASE);
                if (corte < 60) corte = MAX_FRASE;
                out.push(f.slice(0, corte).trim());
                f = f.slice(corte).trim();
            }
            if (f) out.push(f);
        });
        return out;
    }

    /* ---------------- reproducción ---------------- */
    function valores() {
        return {
            rate: Math.max(0.1, num(inRate.value, 1)),
            pitch: num(inPitch.value, 1),
            volume: Math.min(1, Math.max(0, num(inVol.value, 1)))
        };
    }

    function pintarControles() {
        btnPausa.disabled = !hablando;
        btnStop.disabled = !hablando;
        btnPausa.innerHTML = pausado
            ? '<i class="fas fa-play" aria-hidden="true"></i> Reanudar'
            : '<i class="fas fa-pause" aria-hidden="true"></i> Pausar';
    }

    function estadoNormal(msg) {
        estado.textContent = msg || 'Listo.';
        estado.classList.remove('es-error');
    }
    function estadoError(msg) {
        estado.textContent = msg;
        estado.classList.add('es-error');
    }

    function siguiente() {
        if (!hablando) return;
        if (idx >= cola.length) {
            terminar('Fin del texto.');
            return;
        }
        var v = valores();
        var u = new window.SpeechSynthesisUtterance(cola[idx]);
        var voz = vozActual();
        if (voz) {
            u.voice = voz;
            u.lang = voz.lang;
        } else {
            u.lang = 'es-ES';
        }
        u.rate = v.rate;
        u.pitch = v.pitch;
        u.volume = v.volume;

        u.onend = function () {
            if (!hablando) return;
            idx++;
            if (idx >= cola.length) {
                terminar('Fin del texto.');
            } else {
                estadoNormal('Leyendo ' + (idx + 1) + ' de ' + cola.length + '…');
                siguiente();
            }
        };
        u.onerror = function (e) {
            var n = e && e.error;
            if (n === 'interrupted' || n === 'canceled') return;
            terminar(n === 'not-allowed'
                ? 'El navegador bloqueó la voz. Pulsa «Reproducir» otra vez.'
                : 'No se pudo reproducir' + (n ? ' (' + n + ')' : '') + '.');
        };
        synth.speak(u);
    }

    function reproducir() {
        if (!SOPORTADO) {
            avisar('Este navegador no permite leer texto en voz alta', 'warning');
            return;
        }
        var trozos = trocear(inTexto.value);
        if (!trozos.length) {
            avisar('Escribe algo primero', 'warning');
            inTexto.focus();
            return;
        }
        hablando = false;          // que el onerror del cancel no encadene nada
        pausado = false;
        try { synth.cancel(); } catch (e) { }
        cola = trozos;
        idx = 0;
        hablando = true;
        estadoNormal('Leyendo 1 de ' + cola.length + '…');
        pintarControles();
        siguiente();
    }

    function pausarReanudar() {
        if (!hablando) return;
        if (pausado) {
            synth.resume();
            pausado = false;
        } else {
            synth.pause();
            pausado = true;
        }
        pintarControles();
    }

    function parar(msg) {
        if (!SOPORTADO) return;
        hablando = false;
        pausado = false;
        try { synth.cancel(); } catch (e) { }
        pintarControles();
        estadoNormal(msg || 'Detenido.');
    }

    function terminar(msg) {
        hablando = false;
        pausado = false;
        pintarControles();
        estadoNormal(msg);
    }

    /* ---------------- cuentas ---------------- */
    function actualizarCuentas() {
        var txt = inTexto.value;
        var palabras = txt.trim() ? txt.trim().split(/\s+/).length : 0;
        var seg = palabras / (PALABRAS_SEG * valores().rate);
        cuChars.textContent = txt.length + (txt.length === 1 ? ' carácter' : ' caracteres');
        cuDur.textContent = '≈ ' + (seg < 60
            ? Math.round(seg) + ' s'
            : Math.floor(seg / 60) + ' min ' + Math.round(seg % 60) + ' s');
    }

    function actualizarEtiquetas() {
        valRate.textContent = num(inRate.value, 1).toFixed(1).replace('.', ',') + '×';
        valPitch.textContent = num(inPitch.value, 1).toFixed(1).replace('.', ',');
        valVol.textContent = Math.round(num(inVol.value, 1) * 100) + ' %';
    }

    /* ---------------- eventos ---------------- */
    btnPlay.addEventListener('click', reproducir);
    btnPausa.addEventListener('click', pausarReanudar);
    btnStop.addEventListener('click', function () { parar('Detenido.'); });

    btnCopiar.addEventListener('click', function () {
        if (!inTexto.value.trim()) {
            avisar('No hay texto que copiar', 'warning');
            return;
        }
        var ok = function () { avisar('Texto copiado', 'success'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inTexto.value).then(ok, function () {
                avisar('No se pudo copiar', 'danger');
            });
        } else {
            inTexto.select();
            try {
                document.execCommand('copy');
                ok();
            } catch (e) {
                avisar('No se pudo copiar', 'danger');
            }
        }
    });

    inTexto.addEventListener('input', function () {
        actualizarCuentas();
        guardar();
    });
    [inRate, inPitch, inVol].forEach(function (r) {
        r.addEventListener('input', function () {
            actualizarEtiquetas();
            actualizarCuentas();
        });
        r.addEventListener('change', guardar);
    });
    selVoz.addEventListener('change', guardar);

    /* Si se cierra o se recarga la página, cortar la voz. */
    window.addEventListener('pagehide', function () {
        if (synth) { try { synth.cancel(); } catch (e) { } }
    });

    /* ---------------- arranque ---------------- */
    cargar();
    actualizarEtiquetas();
    actualizarCuentas();
    pintarVoces();
    if (!SOPORTADO) {
        btnPlay.disabled = true;
        btnPausa.disabled = true;
        btnStop.disabled = true;
        estadoError('Este navegador no permite leer texto en voz alta.');
    }

    /* Para que otros editores puedan pedir una locución. */
    window.tetVoz = {
        leer: function (txt) {
            if (typeof txt === 'string') {
                inTexto.value = txt;
                actualizarCuentas();
                guardar();
            }
            reproducir();
        },
        detener: parar
    };

    /* Función para obtener los segmentos de voz guardados */
    window.getVozSegments = function() {
        return JSON.parse(localStorage.getItem("vozSegmentos") || "[]");
    };
})();
