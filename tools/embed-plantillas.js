/* Genera public/js/plantillas-data.js embebiendo como data: URL las
   imagenes que se dibujan en el lienzo (plantillas y barras).

   Motivo: al abrir los HTML como archivo local (file://) las imagenes
   file:// contaminan el lienzo (canvas tainted) y el navegador bloquea
   descargas, compartir e historial. Las imagenes data: URL no
   contaminan el lienzo, asi tet funciona sin servidor local.

   Uso:  node tools/embed-plantillas.js
   Recuerda regenerar si anades o cambias alguna plantilla. */
'use strict';

var fs = require('fs');
var path = require('path');

var raiz = path.join(__dirname, '..');

/* Rutas EXACTAS tal como aparecen en los editores (clave del mapa) */
var plantillas = [
    './public/img/Plantilla3.png',
    './public/img/bars/tetnews.png',
    './public/img/bars/somostetCuri.png',
    './public/img/bars/somostetR.png',
    './public/img/bars/somostetMB.png',
    './public/img/bars/somostetTT.png',
    './public/img/bars/somostetTF2079.png',
    './public/img/bars/somostetArt.png',
    './public/img/bars/somostetBlanco.png',
    './public/img/Plantillas/tet1/TBtet.png',
    './public/img/Plantillas/tet1/TBtet2.png',
    './public/img/Plantillas/tet1/creadores.png',
    './public/img/Plantillas/mh.png',
    './public/img/Plantillas/tet2/P_GNU_LINUX.png',
    './public/img/Plantillas/tet2/P_html.png',
    './public/img/Plantillas/tet2/P_css.png',
    './public/img/Plantillas/tet2/P_js.png',
    './public/img/dictec/code.png',
    './public/img/dictec/tech.png',
    './public/img/dictec/game.png'
];

var mapa = {};
var bytes = 0;

plantillas.forEach(function (p) {
    var f = path.join(raiz, p.replace(/^\.\//, ''));
    if (!fs.existsSync(f)) {
        console.error('FALTA: ' + p);
        process.exitCode = 1;
        return;
    }
    var buf = fs.readFileSync(f);
    bytes += buf.length;
    mapa[p] = 'data:image/png;base64,' + buf.toString('base64');
});

if (process.exitCode) {
    process.exit(process.exitCode);
}

var cabecera = [
    '/* ARCHIVO GENERADO por tools/embed-plantillas.js - no editar a mano.',
    '   Plantillas embebidas como data: URL para que el lienzo no quede',
    '   "tainted" al abrir los HTML como archivo local (file://), lo que',
    '   bloquearia descargas, compartir e historial (deshacer/rehacer).',
    '   En http(s) el override se desactiva y siguen valiendo las rutas',
    '   normales, sin pesar de mas en la web. */',
    ''
].join('\n');

var cuerpo = [
    'window.TET_PLANTILLAS = ' + JSON.stringify(mapa) + ';',
    '',
    '(function () {',
    "    if (location.protocol !== 'file:') { return; } // en http(s) no hace falta",
    '    if (!window.fabric || !fabric.util || !fabric.util.loadImage) { return; }',
    '    var mapa = window.TET_PLANTILLAS;',
    '    var original = fabric.util.loadImage;',
    '    fabric.util.loadImage = function (url, callback, context, crossOrigin) {',
    "        var u = (typeof url === 'string' && mapa[url]) ? mapa[url] : url;",
    '        return original.call(fabric.util, u, callback, context, crossOrigin);',
    '    };',
    '})();',
    ''
].join('\n');

var destino = path.join(raiz, 'public', 'js', 'plantillas-data.js');
fs.writeFileSync(destino, cabecera + cuerpo, 'utf8');

var pesa = fs.statSync(destino).size;
console.log('OK: ' + Object.keys(mapa).length + ' plantillas, origenes ' +
    (bytes / 1024 / 1024).toFixed(2) + ' MB -> plantillas-data.js ' +
    (pesa / 1024 / 1024).toFixed(2) + ' MB');
