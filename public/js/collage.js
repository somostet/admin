/* ============================================================
   collage.js — editor de collages por celdas (collage.html)

   Cada diseño es una lista de celdas en coordenadas normalizadas
   (0..1): al cambiar el formato de salida (1200×1200, 1080×1350…)
   el collage se recompone solo, y al mover el «hueco» o las «esquinas»
   se redibujaban las celdas vacías sin tocar las fotos ya puestas.

     · «Cargar plantilla» (shell.js) aplica el diseño elegido
     · Tocar una celda abre la galería y mete ahí la foto
     · Ctrl+V con la celda elegida pega la foto del portapapeles
     · La foto se recorta a la celda con clipPath LOCAL: al moverla o
       acercarla, el encuadre se mueve con ella

   Requiere: fabric.js y que la página haya creado `canvas`.
   ============================================================ */
(function () {
    'use strict';

    if (typeof canvas === 'undefined' || !canvas) return;
    if (typeof fabric === 'undefined') return;

    var ANCHO = 1200;
    var ALTO = 1200;

    /* se pueden cambiar en caliente con los deslizadores del panel */
    var margen = 14;             /* hueco entre celdas y alrededor */
    var radio = 22;              /* esquinas redondeadas */

    var fondo = '#ffffff';

    /* cómo se mete la foto en la celda: entera (por defecto) o rellenando */
    var modo = 'completa';

    /* controles del panel (collage.html): se rellenan al arrancar y se
       refrescan cuando un deshacer devuelve el collage a otro hueco */
    var slHueco = null, slRadio = null, slEncuadre = null;

    function textoEstado(t) {
        var e = document.getElementById('collage-estado');
        if (e) e.textContent = t;
    }

    function diana(mensaje) {
        if (celdaActiva >= 0 && celdas[celdaActiva]) {
            textoEstado('Celda ' + (celdaActiva + 1) + ' lista · ' + mensaje);
            return true;
        }
        textoEstado('Toca primero una celda del collage');
        aviso('Toca primero una celda del collage', 'warning');
        return false;
    }

    /* ---------- plantillas: cada celda es {x, y, w, h} en 0..1 ---------- */
    var DISENOS = {
        '1 foto': [{ x: 0, y: 0, w: 1, h: 1 }],

        '2 fotos · columna': [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }],
        '2 fotos · fila': [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],

        '3 fotos · apiladas': [{ x: 0, y: 0, w: 1, h: 0.333 }, { x: 0, y: 0.333, w: 1, h: 0.333 }, { x: 0, y: 0.666, w: 1, h: 0.341 }],
        '3 fotos · a la izquierda': [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }],

        '4 fotos · 2 × 2': [
            { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
            { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
        ],

        '5 fotos · cruz': [
            { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
            { x: 0.25, y: 0.5, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.25, h: 0.5 },
            { x: 0.75, y: 0.5, w: 0.25, h: 0.5 }
        ],

        '6 fotos · 3 × 2': [
            { x: 0, y: 0, w: 0.333, h: 0.5 }, { x: 0.333, y: 0, w: 0.333, h: 0.5 }, { x: 0.666, y: 0, w: 0.334, h: 0.5 },
            { x: 0, y: 0.5, w: 0.333, h: 0.5 }, { x: 0.333, y: 0.5, w: 0.333, h: 0.5 }, { x: 0.666, y: 0.5, w: 0.334, h: 0.5 }
        ],

        'revista · 1 + 2': [
            { x: 0, y: 0, w: 0.62, h: 0.62 }, { x: 0.62, y: 0, w: 0.38, h: 0.31 },
            { x: 0.62, y: 0.31, w: 0.38, h: 0.31 }, { x: 0, y: 0.62, w: 1, h: 0.38 }
        ],

        'revista · 2 + 3': [
            { x: 0, y: 0, w: 0.5, h: 0.55 }, { x: 0.5, y: 0, w: 0.5, h: 0.55 },
            { x: 0, y: 0.55, w: 0.333, h: 0.45 }, { x: 0.333, y: 0.55, w: 0.333, h: 0.45 }, { x: 0.666, y: 0.55, w: 0.334, h: 0.45 }
        ]
    };

    var NOMBRES = Object.keys(DISENOS);

    /* estado por celda: celdas[i] = null (vacía) o { src, left, top, scaleX, scaleY } */
    var celdas = [];
    var celdaActiva = -1;

    /* ---------- helpers ---------- */
    function aviso(msg, tipo) { if (window.mostrarAviso) window.mostrarAviso(msg, tipo); }

    function celdaEnPx(c) {
        return {
            x: Math.round(c.x * canvas.getWidth()),
            y: Math.round(c.y * canvas.getHeight()),
            w: Math.round(c.w * canvas.getWidth()),
            h: Math.round(c.h * canvas.getHeight())
        };
    }

    /* Rectángulo interior de la celda, en coordenadas RELATIVAS a su esquina
       superior izquierda. La foto nace con originX/originY = left/top justo
       en (c.x + margen, c.y + margen), así que aquí left/top valen 0 y el
       clipPath local sale centrado en la foto sin desplazamientos raros. */
    function rectLocal(c) {
        return {
            left: 0,
            top: 0,
            width: Math.max(1, c.w - margen * 2),
            height: Math.max(1, c.h - margen * 2)
        };
    }

    function marcoDe(c, i) {
        var r = rectLocal(c);
        var ancho = r.width, alto = r.height;
        return new fabric.Rect({
            /* OJO: por defecto Fabric usa originX/originY = 'center', y aquí
               left/top son la ESQUINA superior izquierda. Sin esto el marco
               (y la foto) salían desplazados media celda. */
            originX: 'left',
            originY: 'top',
            left: c.x + margen,
            top: c.y + margen,
            width: ancho,
            height: alto,
            rx: Math.min(radio, ancho / 4),
            ry: Math.min(radio, alto / 4),
            fill: 'rgba(255,255,255,0.02)',
            stroke: '#9aa7bf',
            strokeWidth: 1.5,
            strokeDashArray: [8, 6],
            cornerSize: 18,
            selectable: true,
            evented: true,
            name: 'Celda ' + (i + 1),
            data: { celda: true, indice: i }
        });
    }

    /* el «＋» del centro de cada celda vacía */
    function masDe(c) {
        var ancho = Math.max(1, c.w - margen * 2);
        var alto = Math.max(1, c.h - margen * 2);
        return new fabric.Text('＋', {
            left: c.x + c.w / 2,
            top: c.y + c.h / 2,
            originX: 'center',
            originY: 'center',
            fontSize: Math.max(26, Math.min(ancho, alto) * 0.28),
            fill: '#b6c1d4',
            fontWeight: '300',
            selectable: false,
            evented: false,
            excludeFromExport: true
        });
    }

    /* Foto recortada a la celda con clipPath LOCAL: el encuadre se mueve con
       la foto (ideal para reencuadrar dentro de la celda).

       Encuadre:
         'completa' → la foto ENTERA dentro de la celda (lo que se espera al
                      meter una foto en un hueco; se ve el fondo en las bandas)
         'cubrir'   → la celda se llena y la foto se recorta (como un fondo)
         guardada   → posición y tamaño que el usuario ya dejó a mano

       guardada = { src, left, top, scaleX, scaleY, movida }. */
    function escalaFoto(foto, r, modo) {
        var ew = r.width / Math.max(1, foto.width);
        var eh = r.height / Math.max(1, foto.height);
        return modo === 'cubrir' ? Math.max(ew, eh) : Math.min(ew, eh);
    }

    /* Recorte de la celda para una foto con la transformación que tenga AHORA.
       El clipPath se dibuja en el sistema local de la foto y Fabric lo ancla
       al CENTRO del objeto, así que el desplazamiento se mide desde el centro
       de la foto y se divide por la escala:
           (esquina de la celda − centro de la foto) / escala
       Recalcularlo en cada cambio es lo que mantiene la ventana de recorte
       clavada a la celda aunque el usuario mueva o amplíe la foto (si el clip
       se dejara fijo en local, el zoom agrandaría también el recorte). */
    function clipDeCelda(foto, c) {
        var esc = Math.max(0.0001, Math.abs(foto.scaleX) || 1);
        var centroX = foto.left + (foto.width * esc) / 2;
        var centroY = foto.top + (foto.height * esc) / 2;
        var ancho = Math.max(1, c.w - margen * 2);
        var alto = Math.max(1, c.h - margen * 2);
        return new fabric.Rect({
            left: (c.x + margen - centroX) / esc,
            top: (c.y + margen - centroY) / esc,
            width: ancho / esc,
            height: alto / esc,
            originX: 'left',
            originY: 'top',
            rx: Math.min(radio, ancho / 4) / esc,
            ry: Math.min(radio, alto / 4) / esc,
            fill: 'rgba(0,0,0,0)',
            stroke: 'none',
            selectable: false,
            evented: false,
            excludeFromExport: true
        });
    }

    function colocaFoto(foto, c, guardada, indice, modoForzado) {
        var r = rectLocal(c);
        var modo = modoForzado || modo;
        var esc = guardada ? guardada.scaleX : escalaFoto(foto, r, modo);
        var w = foto.width * esc;
        var h = foto.height * esc;
        /* centrada dentro de la celda: en 'cubrir' recorta por igual en los
           cuatro lados; en 'completa' la deja centrada con bandas */
        var left = guardada ? guardada.left : c.x + margen + (r.width - w) / 2;
        var top = guardada ? guardada.top : c.y + margen + (r.height - h) / 2;

        foto.set({
            /* igual que en marcoDe: left/top es la esquina, no el centro */
            originX: 'left',
            originY: 'top',
            left: left,
            top: top,
            scaleX: esc,
            scaleY: guardada ? guardada.scaleY : esc,
            strokeUniform: true,
            lockRotation: true,
            name: 'Foto ' + (indice + 1)
        });
        foto.clipPath = clipDeCelda(foto, c);
        return {
            src: foto.getSrc(),
            left: foto.left,
            top: foto.top,
            scaleX: foto.scaleX,
            scaleY: foto.scaleY,
            movida: guardada ? guardada.movida === true : false
        };
    }

    /* ---------- resincronizar tras deshacer/rehacer ----------
       collage.js guarda su propio estado (diseño, hueco, fotos por celda) que
       NO viaja en el historial: el historial de Fabric solo sabe de objetos.
       Sin esto, deshacer un cambio de diseño dejaba el collage creyendo en el
       diseño nuevo (el selector lo decía, pero el lienzo mostraba el
       anterior) y a partir de ahí los huecos y las fotos nuevas se colocaban
       con la geometría equivocada.

       No se intenta adivinar el diseño de los marcos porque solo existen en
       las celdas VACÍAS (con las 4 celdas llenas no queda ni uno). En su lugar
       el diseño manda: se repinta con el que hay seleccionado y las fotos que
       sobrevivieron al deshacer se reacomodan en sus celdas, en orden. */

    function resincroniza() {
        var dis = DISENOS[disenioActual];
        var fotos = canvas.getObjects().filter(function (o) { return o instanceof fabric.Image; });

        /* el repintado no debe apilar nada: capas.js ya ha dejado el puntero
           de historial donde corresponde, y un estado nuevo aquí hacia que
           «rehacer» volviera a un sitio equivocado */
        var antes = window.tetHistorialEnBloque;
        window.tetHistorialEnBloque = true;
        try {
            canvas.discardActiveObject();
            canvas.clear();
            canvas.backgroundColor = fondo;
            celdas = dis.map(function () { return null; });

            fotos.forEach(function (foto, i) {
                if (i >= dis.length) { return; }   /* sobran: no se pintan */
                var c = celdaEnPx(dis[i]);
                celdas[i] = colocaFoto(foto, c, null, i);
                canvas.add(foto);
            });
            dis.forEach(function (norm, i) {
                if (celdas[i]) return;
                var c = celdaEnPx(norm);
                canvas.add(marcoDe(c, i));
                canvas.add(masDe(c));
            });
            celdaActiva = -1;
            canvas.renderAll();
        } finally {
            window.tetHistorialEnBloque = antes;
        }
        if (selTpl && selTpl.value !== disenioActual) selTpl.value = disenioActual;
        if (slHueco) slHueco.value = margen;
        if (slRadio) slRadio.value = radio;
        if (slEncuadre) slEncuadre.value = modo;
        textoEstado('Deshecho: collage repintado con el diseño «' + disenioActual + '»');
    }

    canvas.on('estado-restaurado', resincroniza);

    /* ---------- pintar todo el collage ----------
       Todo el repintado va en bloque de historial: vaciar el lienzo y añadir
       un marco por celda son decenas de object:added, y sin el bloque un solo
       cambio de diseño llenaba la pila de tal forma que hacia falta pulsar
       deshacer varias veces para recuperar las fotos. */
    function pintar() {
        var conFotos = celdas.filter(Boolean).length;
        var cargadas = 0;
        var bloque = window.tetHistorialBloque || function (fn) { fn(); if (window.tetGuardarEstado) window.tetGuardarEstado(); };

        bloque(function () {
            canvas.discardActiveObject();
            canvas.clear();
            canvas.backgroundColor = fondo;

            celdas.forEach(function (guardada, i) {
                var c = celdaEnPx(DISENOS[disenioActual][i]);
                if (guardada) {
                    fabric.Image.fromURL(guardada.src, function (foto) {
                        if (!foto || !foto.width) return;
                        colocaFoto(foto, c, guardada, i);
                        canvas.add(foto);
                        canvas.renderAll();
                        /* cada foto que vuelve es un paso de deshacer propio:
                           así «poner una foto» se deshace con un solo Ctrl+Z */
                        if (++cargadas >= conFotos && window.tetGuardarEstado) window.tetGuardarEstado();
                    });
                } else {
                    canvas.add(marcoDe(c, i));
                    canvas.add(masDe(c));
                }
            });
            canvas.renderAll();
        });
    }

    /* ---------- huecos, radios y encuadre SIN recargar las fotos ----------
       Antes esto llamaba a pintar(), queBORRABA el lienzo y volvía a crear
       cada foto desde su dataURL: al arrastrar un deslizador se notaba el
       parpadeo y se perdía la selección. Aquí solo se rehacen los marcos de
       las celdas vacías y se recalcula el recorte de las fotos ya puestas. */

    function fotoDeCelda(indice) {
        var rango = /(\d+)\s*$/;
        var candidatas = canvas.getObjects().filter(function (o) {
            return o instanceof fabric.Image && rango.test(o.name || '');
        });
        for (var i = 0; i < candidatas.length; i++) {
            if (celdaDeFoto(candidatas[i]) === indice) return candidatas[i];
        }
        return null;
    }

    /* El usuario movió o amplió la foto a mano: se marca como «tocada» (para
       que tetCollageModo no le imponga un encuadre) y se recalcula el recorte
       con la transformación nueva, porque el clip local se deformaría. */
    canvas.on('object:modified', function (ev) {
        var o = ev.target;
        if (!o || !(o instanceof fabric.Image)) return;
        var i = celdaDeFoto(o);
        if (i < 0) return;
        o.tetMovida = true;
        o.clipPath = clipDeCelda(o, celdaEnPx(DISENOS[disenioActual][i]));
        o.setCoords();
        canvas.renderAll();
        if (window.tetGuardarEstado) window.tetGuardarEstado();
    });

    function reaplicarCeldas() {
        var dis = DISENOS[disenioActual];
        var bloque = window.tetHistorialBloque || function (fn) { fn(); if (window.tetGuardarEstado) window.tetGuardarEstado(); };

        bloque(function () {
            /* fuera los marcos y los «＋» de las celdas vacías */
            canvas.getObjects().slice().forEach(function (o) {
                if (o.data && o.data.celda) canvas.remove(o);
                else if (o.type === 'text' && o.excludeFromExport && o.text === '＋') canvas.remove(o);
            });

            canvas.getObjects().forEach(function (foto) {
                if (!(foto instanceof fabric.Image)) return;
                var i = celdaDeFoto(foto);
                if (i < 0) return;
                foto.clipPath = clipDeCelda(foto, celdaEnPx(dis[i]));
                foto.setCoords();
            });

            /* marcos donde aún no hay foto */
            var ocupadas = {};
            canvas.getObjects().forEach(function (foto) {
                if (foto instanceof fabric.Image) ocupadas[celdaDeFoto(foto)] = true;
            });
            dis.forEach(function (norm, i) {
                if (ocupadas[i]) return;
                var c = celdaEnPx(norm);
                canvas.add(marcoDe(c, i));
                canvas.add(masDe(c));
            });

            canvas.renderAll();
        });
    }

    function guardarEstadoFotos() {
        celdas = canvas.getObjects()
            .filter(function (o) { return o instanceof fabric.Image; })
            .map(function (foto) {
                var indice = celdaDeFoto(foto);
                return indice < 0 ? null
                    : {
                        indice: indice, src: foto.getSrc(), left: foto.left, top: foto.top,
                        scaleX: foto.scaleX, scaleY: foto.scaleY, movida: foto.tetMovida === true
                    };
            })
            .filter(Boolean);
        /* se reordena por celda */
        var porCelda = [];
        celdas.forEach(function (g) { porCelda[g.indice] = g; });
        celdas = porCelda;
    }

    function celdaDeFoto(foto) {
        var mejor = -1, mejorArea = 0;
        DISENOS[disenioActual].forEach(function (norm, i) {
            var c = celdaEnPx(norm);
            var area = Math.min(foto.left + foto.getScaledWidth(), c.x + c.w) - Math.max(foto.left, c.x);
            var areaV = Math.min(foto.top + foto.getScaledHeight(), c.y + c.h) - Math.max(foto.top, c.y);
            var solape = Math.max(0, area) * Math.max(0, areaV);
            if (solape > mejorArea) { mejorArea = solape; mejor = i; }
        });
        return mejor;
    }

    function aplicarDisenio(nombre) {
        if (!DISENOS[nombre]) return;
        /* Las fotos no caben en un diseño distinto, así que se descartan; antes
           de borrarlas se apila el estado actual para que Ctrl+Z las traiga de
           vuelta (guardarEstado apila el lienzo tal y como está ahora). */
        var habia;
        guardarEstadoFotos();
        habia = celdas.filter(Boolean).length;
        if (habia && window.tetGuardarEstado) window.tetGuardarEstado();
        disenioActual = nombre;
        celdas = DISENOS[nombre].map(function () { return null; });
        celdaActiva = -1;
        pintar();
        textoEstado('Diseño «' + nombre + '» · toca una celda para llenarla'
            + (habia ? ' (las fotos se quitaron: Ctrl+Z para volver atrás)' : ''));
    }

    /* ---------- galería ---------- */
    var modal = document.querySelector('.modal.bd-example-modal-lg');

    function abrirGaleria() {
        if (!modal) { aviso('No hay galería en esta página', 'danger'); return; }
        var inst = window.bootstrap && bootstrap.Modal
            ? bootstrap.Modal.getOrCreateInstance(modal) : null;
        if (inst) inst.show();
    }

    /* galeria.js llama aquí: la foto cae en la celda elegida.
       Devuelve true para que la galería no la añada dos veces. */
    window.tetDestinoImagen = function (foto) {
        if (celdaActiva < 0) return false;
        var i = celdaActiva;
        var c = celdaEnPx(DISENOS[disenioActual][i]);

        /* se quitan el marco y el «＋» de esa celda: ya tiene foto */
        canvas.getObjects().slice().forEach(function (o) {
            if (o.data && o.data.celda && o.data.indice === i) canvas.remove(o);
            else if (o.type === 'text' && o.excludeFromExport &&
                Math.abs(o.left - (c.x + c.w / 2)) < 1 && Math.abs(o.top - (c.y + c.h / 2)) < 1) canvas.remove(o);
        });

        celdas[i] = colocaFoto(foto, c, null, i);
        foto.set({ lockRotation: true });
        canvas.add(foto);
        canvas.setActiveObject(foto);
        canvas.renderAll();
        celdaActiva = -1;
        textoEstado('Foto puesta en la celda ' + (i + 1) +
            ' · muévela o acércala para encuadrar · toca otra celda para la siguiente');
        if (window.tetGuardarEstado) window.tetGuardarEstado();
        return true;
    };

    /* Ctrl+V con la celda elegida (capas.js llama a tetCollagePegar) */
    window.tetCollagePegar = function (foto) {
        if (celdaActiva >= 0 && celdas[celdaActiva]) {
            if (foto.width) window.tetDestinoImagen(foto);
            return true;
        }
        return false;
    };

    /* botón «Pegar imagen» del panel: hay que tener celda elegida */
    window.tetCollagePegarDelPortapapeles = function () {
        if (celdaActiva < 0 || !celdas[celdaActiva]) {
            aviso('Toca primero una celda del collage', 'warning');
            return;
        }
        function pon(blob) { if (window.pegarImagenBlob) window.pegarImagenBlob(blob); }
        if (navigator.clipboard && navigator.clipboard.read) {
            navigator.clipboard.read().then(function (entradas) {
                for (var i = 0; i < entradas.length; i++) {
                    var tipos = (entradas[i].types || []).filter(function (t) { return t.indexOf('image/') === 0; });
                    if (tipos.length) { entradas[i].getType(tipos[0]).then(pon); return; }
                }
                aviso('El portapapeles no tiene imágenes', 'warning');
            }).catch(function () { aviso('Pulsa Ctrl+V para pegar la foto', 'warning'); });
        } else {
            aviso('Pulsa Ctrl+V para pegar la foto', 'warning');
        }
    };

    /* Celda tocada: solo se elige. ANTES abría la galería de golpe, y en el
       móvil eso tapaba el collage entero cada vez que se pasaba el dedo por
       encima. Ahora el hueco se resalta y el panel dice qué hacer; la galería
       se abre solo si se pulsa «Galería» (o Ctrl+V, que ya pega directo). */
    function resaltaCelda(indice) {
        canvas.getObjects().forEach(function (o) {
            if (o.data && o.data.celda) {
                var on = o.data.indice === indice;
                o.set({
                    stroke: on ? '#4dabf7' : '#9aa7bf',
                    strokeWidth: on ? 3 : 1.5,
                    strokeDashArray: on ? null : [8, 6]
                });
            }
        });
        canvas.renderAll();
    }

    canvas.on('mouse:down', function (opt) {
        var t = opt.target;
        if (t && t.data && t.data.celda) {
            celdaActiva = t.data.indice;
            canvas.setActiveObject(t);
            resaltaCelda(celdaActiva);
            textoEstado('Celda ' + (celdaActiva + 1) + (celdas[celdaActiva]
                ? ' con foto · toca otra celda o «Galería» para cambiarla'
                : ' vacía · «Galería», «Cargar» o Ctrl+V para poner una foto'));
        } else {
            celdaActiva = -1;
            resaltaCelda(-1);
            textoEstado('Toca una celda para llenarla');
        }
    });

    /* ---------- meter la foto: galería, archivo o portapapeles ---------- */
    window.tetCollageFoto = function (origen) {
        if (!diana('elige de dónde sacas la foto')) return;
        if (origen === 'galeria') { abrirGaleria(); return; }
        if (origen === 'pegar') { window.tetCollagePegarDelPortapapeles(); return; }
        if (origen === 'archivo') {
            var inp = document.getElementById('imagen');
            if (inp) inp.click();
        }
    };

    /* Reajusta al hueco/encuadre actual las fotos que el usuario NO ha tocado
       a mano. Las que sí (movida) se dejan tal cual: manda lo que hizo la
       persona, no el deslizador. */
    function reencuadrarIntactas() {
        guardarEstadoFotos();
        var dis = DISENOS[disenioActual];
        celdas.forEach(function (g, i) {
            if (!g || g.movida) return;
            var foto = fotoDeCelda(i);
            if (!foto) return;
            var c = celdaEnPx(dis[i]);
            var r = rectLocal(c);
            var esc = escalaFoto(foto, r, modo);
            var w = foto.width * esc, h = foto.height * esc;
            foto.set({
                scaleX: esc,
                scaleY: esc,
                left: c.x + margen + (r.width - w) / 2,
                top: c.y + margen + (r.height - h) / 2
            });
        });
        reaplicarCeldas();
    }

    /* encuadre: la foto entra entera (por defecto) o rellena la celda */
    window.tetCollageModo = function (nuevo) {
        modo = (nuevo === 'cubrir') ? 'cubrir' : 'completa';
        reencuadrarIntactas();
        textoEstado(modo === 'cubrir'
            ? 'Las fotos rellenan la celda (se recorta lo que sobra)'
            : 'Las fotos se ven enteras dentro de la celda');
    };

    /* ---------- formato de salida ---------- */
    function tetAjustarLienzoA(d) {
        canvas.setDimensions({ width: d.w, height: d.h }, { backstoreOnly: true });
        guardarEstadoFotos();
        pintar();
    }

    /* ---------- arranque ---------- */
    var disenioActual = '4 fotos · 2 × 2';
    var selTpl = document.getElementById('plantilla');
    if (selTpl) {
        selTpl.innerHTML = '';
        NOMBRES.forEach(function (n) {
            var o = document.createElement('option');
            o.textContent = n;
            selTpl.appendChild(o);
        });
        selTpl.value = disenioActual;
    }

    celdas = DISENOS[disenioActual].map(function () { return null; });

    window.reload = function () {
        if (selTpl) aplicarDisenio(selTpl.value);
    };
    window.tetAjustarLienzoA = tetAjustarLienzoA;

    /* Cambiar el diseño en el selector lo aplica al momento. Antes solo
       reaccionaba el botón «Cargar plantilla», y en el móvil (donde ese botón
       se va a la barra flotante) el selector parecía no hacer nada. */
    if (selTpl) {
        selTpl.addEventListener('change', function () { aplicarDisenio(selTpl.value); });
    }

    /* arranque: se pinta el diseño elegido («4 fotos · 2 × 2») */
    pintar();

    /* ---------- panel: color, hueco y esquinas ---------- */
    /* El hueco, el radio, el color y el encuadre se controlan con
       onclick/oninput desde collage.html (para que también respondan al
       teclado). Aquí solo se guardan las referencias para poder
       resincronizarlos tras un deshacer. */
    slHueco = document.getElementById('huecoCollage');
    slRadio = document.getElementById('radioCollage');
    slEncuadre = document.getElementById('encuadreCollage');
    var colorFondo = document.getElementById('colorFondoCollage');
    if (colorFondo) {
        colorFondo.addEventListener('input', function () {
            fondo = colorFondo.value;
            canvas.backgroundColor = fondo;
            canvas.renderAll();
        });
    }

    /* los controles del panel usan onclick/oninput en collage.html: también
       funcionan si se reachazan con el teclado */
    /* el hueco cambia el tamaño de la celda, así que las fotos intactas se
       reajustan (si no, se quedaban recortadas); el radio solo redondea */
    window.tetCollageHueco = function (v) { margen = parseInt(v, 10) || 0; reencuadrarIntactas(); };
    window.tetCollageRadio = function (v) { radio = parseInt(v, 10) || 0; reaplicarCeldas(); };
    window.tetCollageColor = function (v) {
        fondo = v;
        canvas.backgroundColor = fondo;
        canvas.renderAll();
    };

    window.tetCollageListo = true;
})();
