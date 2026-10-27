var piperEnginePromise = null;
var piperLoadedModels = new Set();
var piperModelLoads = new Map();

function piperEngine() {
    if (location.protocol === 'file:') {
        return Promise.reject(new Error(
            'Piper necesita abrir el editor desde HTTPS o localhost. La apertura directa con file:// bloquea los módulos del modelo.'
        ));
    }
    if (!piperEnginePromise) {
        piperEnginePromise = import(
            'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-tts-web.js'
        ).catch(function (error) {
            piperEnginePromise = null;
            throw new Error(
                'No se pudo cargar Piper desde jsDelivr. Comprueba la conexión y que la página se abra desde HTTPS o localhost. ' +
                (error && error.message ? error.message : '')
            );
        });
    }
    return piperEnginePromise;
}

export async function cargarModeloPiper(voz, progreso) {
    if (!voz) throw new Error('Selecciona una voz de Piper.');
    if (piperLoadedModels.has(voz)) return;
    if (piperModelLoads.has(voz)) return piperModelLoads.get(voz);

    var carga = piperEngine().then(function (tts) {
        return tts.download(voz, progreso);
    }).then(function () {
        piperLoadedModels.add(voz);
    }).finally(function () {
        piperModelLoads.delete(voz);
    });

    piperModelLoads.set(voz, carga);
    return carga;
}

export async function generarAudioPiper(texto, voz, progreso) {
    var textoLimpio = String(texto || '').trim();
    if (!textoLimpio) throw new Error('Escribe la narración antes de generar la voz.');

    await cargarModeloPiper(voz, progreso);
    var tts = await piperEngine();
    return tts.predict({ text: textoLimpio, voiceId: voz }, progreso || function () {});
}
