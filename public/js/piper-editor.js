(function () {
    'use strict';

    var texto = document.getElementById('voz-texto');
    var selVoz = document.getElementById('voz-piper-modelo');
    var btnCargar = document.getElementById('voz-piper-cargar');
    var btnGenerar = document.getElementById('voz-piper-generar');
    var estado = document.getElementById('voz-piper-estado');
    var progresoCaja = document.getElementById('voz-piper-progreso-caja');
    var progreso = document.getElementById('voz-piper-progreso');
    var audio = document.getElementById('voz-piper-audio');
    var enlace = document.getElementById('voz-piper-descargar');
    var coreUrl = new URL('./piper-core.js', document.currentScript.src).href;

    if (!texto || !selVoz || !btnCargar || !btnGenerar || !estado) return;

    var corePromise = null;
    var modeloCargado = null;
    var generando = false;
    var urlAudio = null;

    function setEstado(mensaje, error) {
        estado.textContent = mensaje;
        estado.classList.toggle('es-error', !!error);
    }

    function setProgreso(valor) {
        if (valor == null) {
            progresoCaja.hidden = true;
            progresoCaja.removeAttribute('aria-valuenow');
            progreso.style.width = '0%';
            return;
        }
        var porcentaje = Math.max(0, Math.min(100, valor));
        progresoCaja.hidden = false;
        progresoCaja.setAttribute('aria-valuenow', String(Math.round(porcentaje)));
        progreso.style.width = porcentaje + '%';
    }

    function cargaCore() {
        if (!corePromise) {
            corePromise = import(coreUrl).catch(function (error) {
                corePromise = null;
                throw error;
            });
        }
        return corePromise;
    }

    function actualizaBotones() {
        var noSeguro = location.protocol === 'file:';
        selVoz.disabled = generando;
        btnGenerar.disabled = noSeguro || generando || modeloCargado !== selVoz.value || !texto.value.trim();
        btnCargar.disabled = noSeguro || generando;
    }

    async function cargarModelo() {
        if (generando) return;
        generando = true;
        modeloCargado = null;
        actualizaBotones();
        setProgreso(0);
        setEstado('Cargando modelo de voz…');
        try {
            var core = await cargaCore();
            var voz = selVoz.value;
            await core.cargarModeloPiper(voz, function (dato) {
                if (dato && dato.status === 'progress' && dato.total) {
                    var porcentaje = dato.loaded / dato.total * 100;
                    setProgreso(porcentaje);
                    setEstado('Descargando modelo… ' + Math.round(porcentaje) + ' %');
                }
            });
            modeloCargado = voz;
            setProgreso(null);
            setEstado('Modelo listo. Ya puedes generar el WAV.');
        } catch (error) {
            setProgreso(null);
            setEstado(error && error.message ? error.message : 'No se pudo cargar el modelo de voz.', true);
        } finally {
            generando = false;
            actualizaBotones();
        }
    }

    async function generar() {
        var narracion = texto.value.trim();
        if (generando) return;
        if (!narracion) {
            setEstado('Escribe la narración en el campo Texto antes de generar.', true);
            texto.focus();
            return;
        }
        if (modeloCargado !== selVoz.value) {
            setEstado('Carga el modelo de la voz seleccionada antes de generar.', true);
            return;
        }

        generando = true;
        actualizaBotones();
        enlace.hidden = true;
        setProgreso(0);
        setEstado('Generando la narración con Piper…');
        try {
            var core = await cargaCore();
            var voz = selVoz.value;
            var blob = await core.generarAudioPiper(narracion, voz, function (dato) {
                if (dato && dato.status === 'progress' && dato.total) {
                    setProgreso(dato.loaded / dato.total * 100);
                }
            });
            if (urlAudio) URL.revokeObjectURL(urlAudio);
            urlAudio = URL.createObjectURL(blob);
            audio.src = urlAudio;
            audio.hidden = false;
            enlace.href = urlAudio;
            enlace.download = 'voz-piper-' + voz + '.wav';
            enlace.hidden = false;

            if (typeof window.tetImportaVozGenerada !== 'function') {
                throw new Error('No se encontró el importador de voz del editor.');
            }
            await window.tetImportaVozGenerada(blob, 'voz-piper-' + voz + '.wav');
            setEstado('WAV generado e importado en la pista de voz. Se incluirá al exportar el vídeo.');
            setProgreso(null);
        } catch (error) {
            setProgreso(null);
            setEstado(error && error.message ? error.message : 'No se pudo generar o importar el WAV.', true);
        } finally {
            generando = false;
            actualizaBotones();
        }
    }

    selVoz.addEventListener('change', function () {
        modeloCargado = null;
        setEstado('Carga el modelo de esta voz para poder generar audio.');
        actualizaBotones();
    });
    texto.addEventListener('input', actualizaBotones);
    btnCargar.addEventListener('click', cargarModelo);
    btnGenerar.addEventListener('click', generar);

    if (location.protocol === 'file:') {
        setEstado('Piper necesita abrir el editor desde HTTPS o localhost; file:// bloquea los módulos del modelo.', true);
    }
    actualizaBotones();
}());
