/* ============================================================
   galeria.js — la galería de imágenes, de «míralas y ya» a «toca e inserta»

   Antes el modal era un <div> con seis <img> sueltos: el único camino era
   copiar la imagen y pegarla. En el móvil eso es imposible de verdad —no hay
   Ctrl+V para imágenes— y en el escritorio hay que pelearse con el menú del
   botón derecho.

   Aquí cada miniatura se convierte en un botón que inserta la imagen en el
   lienzo (escalada y centrada) y cierra el modal.

   Requiere: fabric.js y la variable global `canvas` ya creados.
   ============================================================ */
(function () {
    'use strict';

    if (typeof canvas === 'undefined' || !canvas) return;
    if (typeof fabric === 'undefined') return;

    var modal = document.querySelector('.modal.bd-example-modal-lg');
    if (!modal) return;

    var imagenes = modal.querySelectorAll('.modal-body img');
    if (!imagenes.length) return;

    function aviso(msg, tipo) {
        if (window.mostrarAviso) window.mostrarAviso(msg, tipo);
        else console.info(msg);
    }
    /* nombre legible a partir de la ruta: 2NGSQ.png → 2NGSQ */
    function nombreDe(src) {
        var base = (src || '').split('/').pop().split('?')[0].split('#')[0];
        return base.replace(/\.[a-z0-9]{2,5}$/i, '') || 'imagen';
    }

    var titulo = modal.querySelector('.modal-title');
    if (titulo) {
        titulo.innerHTML = '<i class="fas fa-photo-video me-2" aria-hidden="true"></i>' +
            'Imágenes para insertar · <strong>toca para llevarla al lienzo</strong>';
    }

    Array.prototype.forEach.call(imagenes, function (img) {
        /* el <img> se queda tal cual; se envuelve en un botón para conservar la
           maquetación de columnas que ya tenía el modal */
        var cont = img.parentElement;
        if (!cont || cont.dataset.galeriaLista === '1') return;

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'galeria-item';
        boton.title = 'Insertar ' + nombreDe(img.getAttribute('src')) + ' en el lienzo';
        boton.setAttribute('aria-label', boton.title);

        var pie = document.createElement('span');
        pie.className = 'galeria-pie';
        pie.textContent = nombreDe(img.getAttribute('src'));

        cont.dataset.galeriaLista = '1';
        cont.classList.add('galeria-celda');
        cont.appendChild(boton);
        boton.appendChild(img);
        boton.appendChild(pie);

        boton.addEventListener('click', function () {
            var src = img.getAttribute('src');
            if (!src) return;
            boton.disabled = true;

            /* se quita el foco de selección del lienzo: si no, al cerrar el
               modal aparecían las asas de control dentro de la captura */
            canvas.discardActiveObject();

            /* sin crossOrigin: todas las imágenes son del propio sitio y, con
               crossorigin puesto, una respuesta sin cabeceras CORS fallaría al
               cargar (y el canvas pasaría a estar contaminado) */
            fabric.Image.fromURL(src, function (foto) {
                boton.disabled = false;
                if (!foto || !foto.width) {
                    aviso('No se pudo cargar esa imagen', 'danger');
                    return;
                }
                /* contain al 90 % y centrada; nunca por encima del tamaño
                   nativo, para que no salga pixelada */
                if (window.ajustarImagenAlLienzo) window.ajustarImagenAlLienzo(foto, 0.9);
                foto.set({
                    lockRotation: true,
                    strokeUniform: true
                });
                /* preservObjectStacking: enlaza sobre lo que el usuario haya
                   puesto, que es lo que espera al pulsar una miniatura */
                canvas.add(foto);
                canvas.setActiveObject(foto);
                canvas.renderAll();
                if (window.tetGuardarEstado) window.tetGuardarEstado();

                /* se cierra el modal para ver el resultado de una vez */
                var inst = window.bootstrap && bootstrap.Modal
                    ? bootstrap.Modal.getInstance(modal) : null;
                if (inst) inst.hide();
                aviso(nombreDe(src) + ' en el lienzo · muévela o escala con las asas', 'success');
            });
        });
    });

    /* el modal necesita scroll propio en el móvil: con modal-lg y seis
       imágenes a pantalla completa se quedaba fuera de la vista */
})();