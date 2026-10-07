/* Genera public/js/audio-data.js embebiendo como data: URL los MP3 de
   public/audio (la lista de musica del editor de video).

   Motivo: en file:// no se puede hacer fetch de binarios (el origen es
   null y CORS lo bloquea), asi que la musica viaja dentro de un JS y el
   editor funciona igual a doble clic que con servidor. Los MP3 no se
   suben al repo (ver .gitignore): este script se ejecuta en local
   despues de anadir o cambiar una pista.

   Uso:  node tools/embed-audio.js
   Recuerda regenerar si anades o cambias alguna pista. */
'use strict';

var fs = require('fs');
var path = require('path');

var raiz = path.join(__dirname, '..');

/* id = nombre del archivo sin extension; debe coincidir con LISTA_MUSICA
   (public/js/video.js) */
var pistas = [
    'driving-ambition',
    'tech-house-vibes',
    'hip-hop-02',
    'epical-drums-01'
];

var mapa = {};
var bytes = 0;

pistas.forEach(function (id) {
    var rel = './public/audio/' + id + '.mp3';
    var f = path.join(raiz, 'public', 'audio', id + '.mp3');
    if (!fs.existsSync(f)) {
        console.error('FALTA: ' + rel);
        process.exitCode = 1;
        return;
    }
    var buf = fs.readFileSync(f);
    bytes += buf.length;
    mapa[id] = 'data:audio/mpeg;base64,' + buf.toString('base64');
});

if (process.exitCode) {
    process.exit(process.exitCode);
}

var cabecera = [
    '/* ARCHIVO GENERADO por tools/embed-audio.js - no editar a mano.',
    '   Los MP3 de public/audio embebidos como data: URL: en file:// no',
    '   hay fetch de binarios (origen null), y asi la lista de musica',
    '   funciona igual a doble clic que con servidor. Solo se inyecta al',
    '   primer uso, porque pesa varios MB. */',
    ''
].join('\n');

var cuerpo = 'window.TET_AUDIO = ' + JSON.stringify(mapa) + ';\n';

var destino = path.join(raiz, 'public', 'js', 'audio-data.js');
fs.writeFileSync(destino, cabecera + cuerpo, 'utf8');

var pesa = fs.statSync(destino).size;
console.log('OK: ' + Object.keys(mapa).length + ' pistas, origenes ' +
    (bytes / 1024 / 1024).toFixed(2) + ' MB -> audio-data.js ' +
    (pesa / 1024 / 1024).toFixed(2) + ' MB');
