/* Genera cuatro piezas instrumentales originales de 60 s dedicadas a CC0 1.0.
   Requiere ffmpeg para codificar los MP3 que se embeben en el editor. */
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');

var raiz = path.join(__dirname, '..');
var sampleRate = 44100;
var duracion = 60;

var pistas = [
    {
        id: 'clasica-original-cc0',
        bpm: 76,
        acordeVol: 0.045,
        bajoVol: 0.055,
        melodiaVol: 0.14,
        acordes: [
            { bajo: 48, tercero: 52, quinto: 55, pedal: 36, melodia: [72, 76, 79, 76, 74, 72, 67, 72] },
            { bajo: 45, tercero: 48, quinto: 52, pedal: 33, melodia: [72, 76, 81, 79, 76, 74, 72, 69] },
            { bajo: 41, tercero: 45, quinto: 48, pedal: 29, melodia: [72, 77, 81, 77, 76, 72, 69, 72] },
            { bajo: 43, tercero: 47, quinto: 50, pedal: 31, melodia: [71, 74, 79, 74, 81, 79, 74, 71] }
        ]
    },
    {
        id: 'clasica-dramatica-cc0',
        bpm: 72,
        acordeVol: 0.055,
        bajoVol: 0.075,
        melodiaVol: 0.15,
        acordes: [
            { bajo: 50, tercero: 53, quinto: 57, pedal: 38, melodia: [74, 77, 81, 77, 75, 74, 69, 74] },
            { bajo: 46, tercero: 50, quinto: 53, pedal: 34, melodia: [74, 77, 82, 81, 77, 75, 74, 70] },
            { bajo: 43, tercero: 46, quinto: 50, pedal: 31, melodia: [74, 77, 82, 77, 79, 77, 74, 70] },
            { bajo: 45, tercero: 49, quinto: 52, pedal: 33, melodia: [73, 76, 81, 79, 76, 73, 69, 73] }
        ]
    },
    {
        id: 'clasica-feliz-cc0',
        bpm: 104,
        acordeVol: 0.04,
        bajoVol: 0.045,
        melodiaVol: 0.14,
        acordes: [
            { bajo: 53, tercero: 57, quinto: 60, pedal: 41, melodia: [77, 81, 84, 81, 79, 77, 72, 77] },
            { bajo: 48, tercero: 52, quinto: 55, pedal: 36, melodia: [76, 79, 84, 83, 79, 76, 72, 76] },
            { bajo: 50, tercero: 53, quinto: 57, pedal: 38, melodia: [77, 81, 86, 84, 81, 79, 77, 74] },
            { bajo: 46, tercero: 50, quinto: 53, pedal: 34, melodia: [77, 82, 86, 84, 82, 77, 74, 77] }
        ]
    },
    {
        id: 'clasica-triste-cc0',
        bpm: 60,
        acordeVol: 0.04,
        bajoVol: 0.045,
        melodiaVol: 0.12,
        acordes: [
            { bajo: 45, tercero: 48, quinto: 52, pedal: 33, melodia: [69, 72, 76, 72, 71, 69, 64, 69] },
            { bajo: 41, tercero: 45, quinto: 48, pedal: 29, melodia: [69, 72, 77, 76, 72, 69, 65, 69] },
            { bajo: 48, tercero: 52, quinto: 55, pedal: 36, melodia: [67, 72, 76, 72, 74, 72, 67, 64] },
            { bajo: 40, tercero: 44, quinto: 47, pedal: 28, melodia: [68, 71, 76, 74, 71, 68, 64, 68] }
        ]
    }
];

function frecuencia(nota) {
    return 440 * Math.pow(2, (nota - 69) / 12);
}

function tono(nota, t, largo, amplitud, parciales) {
    var ataque = Math.min(1, t / 0.08);
    var salida = Math.min(1, Math.max(0, (largo - t) / 0.14));
    var env = Math.min(ataque, salida);
    var vibrato = 1 + 0.0015 * Math.sin(2 * Math.PI * 5.1 * t);
    var fase = 2 * Math.PI * frecuencia(nota) * vibrato * t;
    var valor = 0;
    for (var h = 1; h <= parciales.length; h++) {
        valor += parciales[h - 1] * Math.sin(fase * h);
    }
    return valor * env * amplitud;
}

function escribeWav(pista, temporal) {
    var bpm = pista.bpm;
    var pulso = 60 / bpm;
    var compas = pulso * 4;
    var totalMuestras = sampleRate * duracion;
    var bytesAudio = totalMuestras * 4;
    var wav = Buffer.alloc(44 + bytesAudio);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + bytesAudio, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(2, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 4, 28);
    wav.writeUInt16LE(4, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(bytesAudio, 40);

    for (var i = 0; i < totalMuestras; i++) {
        var t = i / sampleRate;
        var compasN = Math.floor(t / compas);
        var local = t - compasN * compas;
        var acorde = pista.acordes[compasN % pista.acordes.length];
        var octava = Math.floor(local / (pulso / 2));
        var tMelodia = local % (pulso / 2);
        var tPulso = t % pulso;
        var nota = acorde.melodia[octava];
        var pad = tono(acorde.bajo, local, compas, pista.acordeVol * 1.22, [1, 0.3, 0.09]) +
            tono(acorde.tercero, local, compas, pista.acordeVol, [1, 0.25, 0.07]) +
            tono(acorde.quinto, local, compas, pista.acordeVol * 0.89, [1, 0.22, 0.06]);
        var melodia = tono(nota, tMelodia, pulso / 2 * 0.94, pista.melodiaVol, [1, 0.3, 0.12, 0.04]);
        var bajo = tono(acorde.pedal, tPulso, pulso * 0.9, pista.bajoVol, [1, 0.2, 0.05]);
        var centro = pad + bajo;
        var paneo = compasN % 2 ? 0.88 : 1;
        var izquierda = Math.max(-1, Math.min(1, (centro + melodia * paneo) * 0.82));
        var derecha = Math.max(-1, Math.min(1, (centro + melodia * (2 - paneo)) * 0.82));
        var offset = 44 + i * 4;
        wav.writeInt16LE(Math.round(izquierda * 32767), offset);
        wav.writeInt16LE(Math.round(derecha * 32767), offset + 2);
    }
    fs.writeFileSync(temporal, wav);
}

for (var i = 0; i < pistas.length; i++) {
    var pista = pistas[i];
    var salida = path.join(raiz, 'public', 'audio', pista.id + '.mp3');
    var temporal = path.join(os.tmpdir(), 'tet-' + pista.id + '-' + process.pid + '.wav');
    try {
        escribeWav(pista, temporal);
        cp.execFileSync(process.env.FFMPEG || 'ffmpeg', [
            '-hide_banner', '-loglevel', 'error', '-y', '-i', temporal,
            '-t', String(duracion),
            '-af', 'afade=t=out:st=59.6:d=0.4',
            '-codec:a', 'libmp3lame', '-b:a', '112k', '-ar', '44100', '-ac', '2',
            salida
        ], { stdio: ['ignore', 'ignore', 'inherit'] });
        console.log('OK: ' + pista.id + ' · ' + duracion + ' s · original CC0 1.0');
    } finally {
        if (fs.existsSync(temporal)) fs.unlinkSync(temporal);
    }
}
