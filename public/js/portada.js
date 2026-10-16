/* public/js/portada.js — filtros de la portada (index.html)
   Ocho editores en tarjetas: en un teléfono obligan a hacer scroll y scroll.
   Con los chips se pasa de "todo" a "solo GIF" o "solo imágenes" de un toque.  */
(function () {
    'use strict';

    var grid = document.getElementById('portada-grid');
    if (!grid) return;

    var chips = Array.prototype.slice.call(document.querySelectorAll('.portada-filtros .chip'));
    var tarjetas = Array.prototype.slice.call(grid.querySelectorAll('.tarjeta'));
    var conteo = document.getElementById('portada-conteo');
    var vacio = document.getElementById('portada-vacio');
    if (!chips.length) return;

    function plural(n, palabra) {
        return n + (n === 1 ? ' editor' : ' editores');
    }

    chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            var filtro = chip.dataset.filtro;

            chips.forEach(function (c) {
                var activo = c === chip;
                c.classList.toggle('is-activo', activo);
                c.setAttribute('aria-pressed', activo ? 'true' : 'false');
            });

            var visibles = 0;
            tarjetas.forEach(function (t) {
                var ver = filtro === 'todos' || t.dataset.cat === filtro;
                t.hidden = !ver;
                if (ver) visibles++;
            });

            if (conteo) conteo.textContent = filtro === 'todos'
                ? plural(tarjetas.length, 'editor')
                : plural(visibles, 'editor');
            if (vacio) vacio.hidden = visibles > 0;
        });
    });
})();
