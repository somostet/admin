/* Descarga de Mixkit y recodeo a 60 s / 112 kbps como las pistas ya
   incluidas en public/audio (los MP3 crudos pesan 4-5 MB y el embed los
   multiplica por 1,33 en base64).

   Uso:  node tools/descargar-musica.js
   Los MP3 crudos NO se guardan: se recodean en el sitio. */
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');
var cp = require('child_process');

var raiz = path.join(__dirname, '..');
var destino = path.join(raiz, 'public', 'audio');
var tmp = path.join(process.env.TEMP || '.', 'musica-cruda');

/* id de Mixkit (assets.mixkit.co/music/<id>) + nombre del archivo local */
var PISTAS = [
    { id: '1024', slug: 'delayed-flight' },
    { id: '75', slug: 'almost-game-time' },
    { id: '720', slug: 'new-bass-01' },
    { id: '175', slug: 'digital-clouds' },
    { id: '464', slug: 'sci-fi-score' },
    { id: '76', slug: 'epic-games' },
    { id: '706', slug: 'games-music' }
];

var ffmpeg = process.env.FFMPEG || 'ffmpeg';
var SEG = 60;          // segundos que se quedan (el editor hace bucle)
var KBPS = '112k';
var FUNDO = 0.4;       // fade out para que el bucle no chasquee

function baja(url, a) {
    return new Promise(function (ok, ko) {
        https.get(url, function (r) {
            if (r.statusCode !== 200) { ko(new Error('HTTP ' + r.statusCode + ' ' + url)); r.resume(); return; }
            var f = fs.createWriteStream(a);
            r.pipe(f);
            f.on('finish', function () { f.close(); ok(); });
            f.on('error', ko);
        }).on('error', ko);
    });
}

function ffmpegArgs(entrada, salida) {
    return ['-hide_banner', '-loglevel', 'error', '-y', '-i', entrada,
        '-t', String(SEG), '-af', 'afade=t=out:st=' + (SEG - FUNDO) + ':d=' + FUNDO,
        '-codec:a', 'libmp3lame', '-b:a', KBPS, '-ar', '44100', '-ac', '2', salida];
}

(async function () {
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    for (var i = 0; i < PISTAS.length; i++) {
        var p = PISTAS[i];
        var crudo = path.join(tmp, p.id + '.mp3');
        var url = 'https://assets.mixkit.co/music/' + p.id + '/' + p.id + '.mp3';
        await baja(url, crudo);
        var pesoCrudo = fs.statSync(crudo).size;
        var salida = path.join(destino, p.slug + '.mp3');
        cp.execFileSync(ffmpeg, ffmpegArgs(crudo, salida), { stdio: ['ignore', 'ignore', 'inherit'] });
        var peso = fs.statSync(salida).size;
        console.log(p.id.padStart(5) + ' -> ' + p.slug.padEnd(18) +
            (pesoCrudo / 1024 / 1024).toFixed(2) + ' MB crudo -> ' +
            (peso / 1024).toFixed(0) + ' KB (' + (peso / 1024 / 1024).toFixed(2) + ' MB)');
        fs.unlinkSync(crudo);
    }
    try { fs.rmdirSync(tmp); } catch (e) { }
    console.log('OK: ' + PISTAS.length + ' pistas en public/audio (' + SEG + ' s / ' + KBPS + ')');
})().catch(function (e) { console.error('FALLO: ' + e.message); process.exit(1); });