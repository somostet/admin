// Variables globales para la imagen a subir

var globalpic;                 // data URL (compatibilidad / respaldo)
var globalpicFuente = null;    // canvas ya decodificado y reducido: inserción instantánea
var picPromesa = null;         // preparación en curso (el botón auto la espera)
var picToken = 0;              // evita que gane una imagen vieja si se eligen dos seguidas
var oImg;
var hc = 500;
var wc = 500;

// Barras superiores de cada plantilla
var tetnews_bar = "./public/img/bars/tetnews.png";
var curi_bar = "./public/img/bars/somostetCuri.png";
var rese = "./public/img/bars/somostetR.png";
var MB = "./public/img/bars/somostetMB.png";
var TT = "./public/img/bars/somostetTT.png";
var TF = "./public/img/bars/somostetTF2079.png";
var Art = "./public/img/bars/somostetArt.png";
var Blan = "./public/img/bars/somostetBlanco.png";
/* Franjas nuevas: mismas medidas que el resto (1200 × 93) para que la
   cabecera mida lo mismo en todas las plantillas. */
var barTetNewsNuevo = "./public/img/bars/tetnews_nuevo.jpg";
var barRecomendaciones = "./public/img/bars/recomendaciones.jpg";
var barEstrenos = "./public/img/bars/estrenos_streaming.png";


/* =========================================================================
   1 · DECORACIÓN DE LA PLANTILLA  (fondo · degradado · franja · opacidad)
   -------------------------------------------------------------------------
   Todo lo que se ve POR DEBAJO del contenido: el fondo, la imagen de la
   plantilla y la franja superior. Es la parte que hay que rehacer para que la
   plantilla sirva en los tamaños de redes sociales.

   Qué fallaba antes
   -----------------
   · La franja se colocaba con `setOverlayColor({ offsetY: -1107 })`. Ese
     -1107 es 1200 − 93, la altura del lienzo por defecto menos la de la
     franja, y `setOverlayColor` pinta SIEMPRE un rectángulo de alto
     `canvas.height` desde ese desplazamiento. Con el lienzo cuadrado de
     1200 casaba por casualidad; al pasar a un preset (1080 × 1920, 1200 × 630…)
     la banda se iba del sitio o directamente no se pintaba.
   · La propia franja se insertaba sin escalar, a su tamaño natural (1200 px),
     así que en un lienzo de 1080 se salía por la derecha.
   · `reload()` era la única vía para cambiar el fondo: el selector de color
     estaba cableado al texto pero no al fondo (ver `colorFondo` más abajo).

   Qué hace ahora
   --------------
   La geometría se calcula siempre a partir del tamaño real del lienzo, así que
   la franja queda pegada arriba y con la misma proporción en cualquier
   formato, y el fondo admite color plano o degradado.

   NOTA sobre el relleno de color detrás de la franja: ya no se usa
   `setOverlayColor`. Ese patrón pintaba la banda para que el texto blanco de
   la franja se leyera, pero `backgroundColor` (o el degradado) pinta el lienzo
   entero justo debajo, así que el resultado es idéntico y además vale para
   cualquier tamaño de lienzo. De paso se deja de generar el patrón con
   `source` nulo que hacía romper la serialización del historial.
   ========================================================================= */

/* Medidas naturales de las franjas (todas vienen a 1200 × 93). */
var BARRA_ANCHO_NAT = 1200;
var BARRA_ALTO_NAT = 93;

/* Estado de la decoración. Lo edita el panel «Plantilla» de tet1-editor.js. */
var DECO = {
    tipoFondo: 'solido',   // 'solido' | 'degradado'
    color1: '#ffffff',     // degradado: color inicial
    color2: '#1d3f7a',     // degradado: color final
    angulo: 150,           // grados; 0 = de izquierda a derecha
    opacidad: 1,           // 0..1 sobre el fondo cuando se activa esa opción
    opacidadFondo: false,  // true = el deslizador también baja el fondo
    conBarra: true         // mostrar / ocultar la franja
};

/* Plantilla que está aplicada ahora mismo (la elige reload()). */
var plantillaActual = null;

function colorFondo() {
    var c = document.getElementById('color');
    return (c && c.value) || '#ffffff';
}

/* Rectángulo de la franja en coordenadas del lienzo: siempre a 0,0 y con la
   altura proporcional al ancho, de modo que en un 1080 × 1920 sale más baja
   que en el cuadrado pero conserva la proporción del diseño. */
function rectBarra() {
    var W = canvas.getWidth();
    var esc = (BARRA_ANCHO_NAT > 0) ? W / BARRA_ANCHO_NAT : 1;
    return { esc: esc, w: W, h: Math.round(BARRA_ALTO_NAT * esc), top: 0, left: 0 };
}

/* Descriptor de degradado lineal que entiende Fabric (se serializa y revive
   solo en el historial y en el .json del proyecto). Los extremos se calculan
   sobre la diagonal completa del lienzo, para que el degradado llegue a las
   cuatro esquinas en cualquier formato. */
function descriptorDegradado() {
    var W = canvas.getWidth(), H = canvas.getHeight();
    var rad = (DECO.angulo || 0) * Math.PI / 180;
    var dx = Math.cos(rad), dy = Math.sin(rad);
    var ext = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
    var cx = W / 2, cy = H / 2;
    return {
        type: 'linear',
        coords: {
            x1: cx - dx * ext, y1: cy - dy * ext,
            x2: cx + dx * ext, y2: cy + dy * ext
        },
        colorStops: [
            { offset: 0, color: DECO.color1 },
            { offset: 1, color: DECO.color2 }
        ]
    };
}

/* Fondo: color plano o degradado. `callback` opcional. */
function aplicarFondo(callback) {
    var cb = function () {
        canvas.renderAll();
        if (callback) callback();
    };
    var v = (DECO.tipoFondo === 'degradado') ? descriptorDegradado() : colorFondo();
    canvas.setBackgroundColor(v, cb);
}

/* -------------------------------------------------------------------------
   FRANJA SUPERIOR

   Un solo PNG, tal cual está en public/img/bars/. Se coloca pegado arriba y
   se redimensiona con una escala UNIFORME al ancho del lienzo:

       escala = ancho del lienzo / 1200   (las barras vienen a 1200 × 93)

   Uniforme es la clave: con la misma escala en X que en Y el logo, el rótulo y
   la diagonal conservan su proporción y solo cambian de tamaño. Si se estirase
   el alto o el ancho por separado, el resultado se ve deformado.

   Se usa el overlay de Fabric (canvas.overlayImage) y no un objeto suelto: así
   no aparece en el panel de capas, no se puede mover por accidente y no se
   serializa en el historial. El overlay se pinta después de los objetos, de
   modo que la franja queda por encima del contenido, igual que antes.
   ------------------------------------------------------------------------- */
function aplicarBarra(url) {
    if (!url || !DECO.conBarra) {
        canvas.overlayImage = null;
        canvas.renderAll();
        return;
    }
    var r = rectBarra();

    /* La franja superior conserva siempre su opacidad: el deslizador solo
       puede afectar al fondo cuando el usuario activa esa opción. */
    if (esLaMismaImagen(url, canvas.overlayImage)) {
        canvas.overlayImage.set({
            left: 0, top: 0,
            scaleX: r.esc, scaleY: r.esc,
            opacity: 1
        });
        canvas.renderAll();
        return;
    }
    canvas.setOverlayImage(url, canvas.renderAll.bind(canvas), {
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        scaleX: r.esc,
        scaleY: r.esc,
        opacity: 1
    });
}

/* Imagen de plantilla, ajustada al lienzo tapándolo entero («cover»): no se
   deforma al cambiar de formato, se recorta por los lados. Antes se estiraba
   con width/height, así que en un 1080 × 1920 salía una franja 1200 × 1200
   aplastada. */
function aplicarImagenPlantilla(url, sinCallback) {
    var cb = function () {
        canvas.renderAll();
        if (!sinCallback && window.tetGuardarEstado) window.tetGuardarEstado();
    };
    if (!url) {
        canvas.backgroundImage = null;
        canvas.renderAll();
        return;
    }
    var W = canvas.getWidth(), H = canvas.getHeight();

    /* Se carga primero para conocer el tamaño natural: setBackgroundImage crea
       el objeto internamente y no da forma de pasarle una escala calculada. */
    fabric.util.loadImage(url, function (img) {
        if (!img || !img.width) { cb(); return; }
        var esc = Math.max(W / img.width, H / img.height);
        canvas.setBackgroundImage(url, cb, {
            originX: 'left',
            originY: 'top',
            scaleX: esc,
            scaleY: esc,
            left: (W - img.width * esc) / 2,
            top: (H - img.height * esc) / 2,
            /* el fondo se miente a tope salvo que el usuario haya marcado
               «aplicar opacidad también al fondo»: si no, el deslizador
               desteñía la plantilla entera */
            opacity: (DECO.opacidadFondo ? DECO.opacidad : 1)
        });
    });
}

/* ¿La imagen que ya está puesta es la que se pide? Sin esto, cada movimiento
   de un deslizador volvería a cargar el PNG y el lienzo parpadearía.
   Hay que comparar contra lo que realmente hay en el elemento <img>: en
   file:// las plantillas llegan embebidas como data: URL (plantillas-data.js)
   y en http el navegador puede haber resuelto la ruta a una URL absoluta. */
function esLaMismaImagen(url, img) {
    if (!url) return !img;
    if (!img) return false;
    var s = (img._originalSrc || (img._element && img._element.src) || '');
    if (!s) return false;
    if (s === url) return true;
    var mapa = window.TET_PLANTILLAS;
    if (mapa && mapa[url] && s === mapa[url]) return true;
    return s.slice(-url.length) === url;
}

/* Opacidad sobre lo ya cargado: no recarga nada. */
function refrescarOpacidadDecoracion() {
    var bg = canvas.backgroundImage, ov = canvas.overlayImage;
    /* el fondo solo se toca si el usuario lo pidió: si no, el deslizador
       desteñía la plantilla entera y parecía que estuviera dañada */
    if (bg) bg.set({ opacity: (DECO.opacidadFondo ? DECO.opacidad : 1) });
    if (ov) ov.set({ opacity: 1 });
    canvas.renderAll();
}

/* Reaplica la decoración.
   · recargar = true  → además vuelve a colocar la imagen de plantilla
     (cambio de plantilla).
   · recargar = false → solo toca fondo, franja y opacidad de lo que ya está
     puesto; es lo que llaman los deslizadores y los interruptores, así que
     no hay parpadeo.
   Se llama al cambiar de plantilla, al cambiar el tamaño del lienzo («Lienzo en
   blanco») y desde el panel de decoración, para que el degradado siga
   cubriendo el lienzo nuevo. */
function aplicarDecoracion(recargar) {
    aplicarFondo();
    var t = plantillaActual;
    aplicarBarra(t ? t.barra : null);

    if (recargar) {
        aplicarImagenPlantilla(imgDePlantilla(t));
        return;
    }
    /* la imagen de plantilla solo se repinta si la que hay ya es la correcta */
    if (esLaMismaImagen(imgDePlantilla(t), canvas.backgroundImage)) {
        refrescarOpacidadDecoracion();
    } else {
        aplicarImagenPlantilla(imgDePlantilla(t));
    }
}

/* Al cambiar el TAMAÑO del lienzo («Lienzo en blanco» al formato elegido) hay
   que reajustar la decoración: la franja se escala con el ancho, así que sin
   esto se quedaba con el tamaño de la plantilla anterior y se salía del
   lienzo —justo el caso que pedía el formato de redes sociales—. El fondo
   también se recalcula, porque los extremos del degradado van por la diagonal.

   La imagen de la plantilla NO se vuelve a poner: ese botón vacía el lienzo a
   propósito. Lo que se conserva es la franja, que es la identidad de la
   plantilla y lo que tiene que quedar arriba. */
window.tetReajustarAlLienzo = function () {
    aplicarFondo();
    var t = plantillaActual;
    if (t) aplicarBarra(t.barra);
    refrescarOpacidadDecoracion();
};

/* Tras un deshacer o al cargar un proyecto, el overlay vuelve como una imagen
   normal; se reaplica la decoración para que quede con la escala y la
   opacidad que tocan a la plantilla y al formato actuales. Antes de repintar
   se lee el fondo que acaba de restaurar el historial: si no, DECO seguía con
   los colores nuevos y Ctrl+Z no devolvía el degradado anterior. */
window.tetRestaurarDecoracion = function () {
    sincronizarDecoConFondo();
    aplicarDecoracion(false);
};

window.tetAplicarDecoracion = aplicarDecoracion;
window.tetDeco = DECO;


/* =========================================================================
   1b · DEGRADADO SUGERIDO A PARTIR DE LA FOTO
   -------------------------------------------------------------------------
   La idea: mirar los colores de la imagen que hay en el lienzo y proponer un
   degradado que no compita con ella. Se muestrea la foto en pequeño (48 px),
   se busca el tono dominante y se construyen dos paradas del mismo tono:
   una clara y otra más profunda. El ángulo se elige para que el texto se lea:
   si el texto es oscuro, la parte baja del degradado queda clara; si es
   claro, queda oscura.

   Todo se hace sobre un canvas aparte, nunca sobre el lienzo de Fabric: el
   muestreo no toca el diseño ni el historial. Si la imagen es de otro origen
   y el navegador bloquea la lectura de píxeles, se avisa y no se cambia nada.
   ========================================================================= */

function _rgbAHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
    }
    return { h: h, s: s, l: l };
}

function _hslAHex(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    var r, g, b;
    if (!s) {
        r = g = b = l;
    } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        var tono = function (t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        r = tono(h + 1 / 3);
        g = tono(h);
        b = tono(h - 1 / 3);
    }
    var hex = function (v) {
        var x = Math.round(v * 255).toString(16);
        return x.length < 2 ? '0' + x : x;
    };
    return '#' + hex(r) + hex(g) + hex(b);
}

function _luminanciaHex(hex) {
    if (!hex || hex.charAt(0) !== '#') return null;
    var h = hex.slice(1);
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) +
        h.charAt(2) + h.charAt(2);
    if (h.length !== 6) return null;
    var r = parseInt(h.slice(0, 2), 16) / 255;
    var g = parseInt(h.slice(2, 4), 16) / 255;
    var b = parseInt(h.slice(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function _rgbAHex(r, g, b) {
    var hex = function (v) {
        var x = Math.round(Math.max(0, Math.min(255, v))).toString(16);
        return x.length < 2 ? '0' + x : x;
    };
    return '#' + hex(r) + hex(g) + hex(b);
}

/* Normaliza a #rrggbb lo que puede venir en un fondo de Fabric (hex o
   rgba). Devuelve null si no es un color reconocible. */
function _colorAHex(c) {
    if (typeof c !== 'string') return null;
    c = c.trim();
    if (c.charAt(0) === '#') {
        var h = c.slice(1);
        if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) +
            h.charAt(2) + h.charAt(2);
        return /^[0-9a-f]{6}$/i.test(h) ? '#' + h.toLowerCase() : null;
    }
    var m = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!m) return null;
    return _rgbAHex(+m[1], +m[2], +m[3]);
}

/* El historial restaura el fondo tal cual estaba (sólido o degradado). Antes
   de volver a aplicar la decoración se copia ese estado a DECO para que los
   selectores del panel y un nuevo cambio no pisen lo restaurado. */
function sincronizarDecoConFondo() {
    var bg = canvas.backgroundColor;
    var selector = document.getElementById('color');
    if (!bg) return;
    if (bg.type === 'linear' || bg.type === 'radial') {
        var paradas = bg.colorStops || [];
        if (paradas.length >= 2) {
            DECO.tipoFondo = 'degradado';
            DECO.color1 = _colorAHex(paradas[0].color) || DECO.color1;
            DECO.color2 = _colorAHex(paradas[paradas.length - 1].color) || DECO.color2;
            if (bg.coords) {
                var dx = (bg.coords.x2 || 0) - (bg.coords.x1 || 0);
                var dy = (bg.coords.y2 || 0) - (bg.coords.y1 || 0);
                var ang = Math.atan2(dy, dx) * 180 / Math.PI;
                if (ang < 0) ang += 360;
                DECO.angulo = Math.round(ang);
            }
            if (selector) selector.value = DECO.color1;
        }
    } else if (typeof bg === 'string') {
        DECO.tipoFondo = 'solido';
        if (selector) selector.value = bg;
    }
    document.dispatchEvent(new CustomEvent('tet:deco-restaurada'));
}

/* Devuelve { color1, color2, angulo } o null si no se puede leer la foto. */
function _sugerenciaDeImagen(img) {
    var el = img && (img._element || img._originalElement);
    if (!el) return null;
    var nw = el.naturalWidth || el.width || 0;
    var nh = el.naturalHeight || el.height || 0;
    if (!nw || !nh) return null;

    /* Se analiza solo la parte visible: si la foto tiene un recorte de
       Fabric, su width/height ya son el trozo recortado y cropX/cropY, el
       origen dentro del archivo. */
    var cx = Math.max(0, Math.round(img.cropX || 0));
    var cy = Math.max(0, Math.round(img.cropY || 0));
    var cw = Math.max(1, Math.round(img.width || nw));
    var ch = Math.max(1, Math.round(img.height || nh));
    cw = Math.min(cw, nw - cx);
    ch = Math.min(ch, nh - cy);
    if (cw < 2 || ch < 2) return null;

    var esc = Math.min(1, 48 / Math.max(cw, ch));
    var w = Math.max(8, Math.round(cw * esc));
    var h = Math.max(8, Math.round(ch * esc));
    var lienzo = document.createElement('canvas');
    lienzo.width = w;
    lienzo.height = h;
    var ctx = lienzo.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    try {
        ctx.drawImage(el, cx, cy, cw, ch, 0, 0, w, h);
    } catch (e) {
        return null;
    }

    var datos;
    try {
        datos = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
        /* imagen de otro dominio sin CORS: el navegador no deja leer píxeles */
        return null;
    }

    var BINS = 24, i;
    var hist = [];
    for (i = 0; i < BINS; i++) {
        hist.push({ peso: 0, sin: 0, cos: 0, s: 0, l: 0 });
    }
    var sumaSat = 0, sumaLum = 0, n = 0;

    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var p = (y * w + x) * 4;
            if (datos[p + 3] < 96) continue;
            var r = datos[p], g = datos[p + 1], b = datos[p + 2];
            var hsl = _rgbAHsl(r, g, b);
            sumaSat += hsl.s;
            sumaLum += hsl.l;
            n++;
            /* los blancos, negros y grises no aportan tono: si mandaran,
               una foto con fondo blanco sugeriría un degradado gris */
            if (hsl.s < 0.06 || hsl.l < 0.05 || hsl.l > 0.97) continue;
            var idx = Math.floor(hsl.h / (360 / BINS)) % BINS;
            var peso = (0.2 + hsl.s) * (1 - Math.abs(hsl.l - 0.5) * 0.8);
            var rad = hsl.h * Math.PI / 180;
            hist[idx].peso += peso;
            hist[idx].sin += Math.sin(rad) * peso;
            hist[idx].cos += Math.cos(rad) * peso;
            hist[idx].s += hsl.s * peso;
            hist[idx].l += hsl.l * peso;
        }
    }

    var tono = 214, sat = 0.16, lum = 0.55;
    var mejor = -1, mejorPeso = 0;
    for (i = 0; i < BINS; i++) {
        if (hist[i].peso > mejorPeso) {
            mejorPeso = hist[i].peso;
            mejor = i;
        }
    }
    if (mejor >= 0 && mejorPeso > 0) {
        var vx = 0, vy = 0;
        for (i = -1; i <= 1; i++) {
            var j = (mejor + i + BINS) % BINS;
            vx += hist[j].cos;
            vy += hist[j].sin;
        }
        tono = Math.atan2(vy, vx) * 180 / Math.PI;
        if (tono < 0) tono += 360;
        sat = hist[mejor].s / hist[mejor].peso;
        lum = hist[mejor].l / hist[mejor].peso;
    } else if (n) {
        /* foto en blanco y negro o muy apagada: se usa su luminosidad media
           con un tono frío suave, que combina con casi todo */
        sat = Math.min(0.3, sumaSat / n);
        lum = sumaLum / n;
        tono = 214;
    }

    /* El ángulo se decide por el color del texto: el degradado no debe
       comerse la legibilidad. Texto oscuro → zona baja clara; texto claro →
       zona baja oscura. */
    var colorTexto = (document.getElementById('colorT') || {}).value || '#000000';
    var lumTexto = _luminanciaHex(colorTexto);
    var textoClaro = lumTexto !== null && lumTexto > 0.55;
    var angulo = textoClaro ? 90 : 270;

    var s = Math.max(0.12, Math.min(0.85, sat));
    var l = Math.max(0.15, Math.min(0.85, lum));
    var color1, color2;

    if (textoClaro) {
        /* arranque luminoso arriba y caída oscura abajo, donde va el texto */
        color1 = _hslAHex(tono + 8, Math.min(0.5, Math.max(0.14, s * 0.7)),
            Math.min(0.8, Math.max(0.66, 0.48 + l * 0.35)));
        color2 = _hslAHex(tono - 8, Math.min(0.85, Math.max(0.32, s * 1.1)),
            Math.min(0.32, Math.max(0.16, 0.06 + l * 0.3)));
    } else {
        /* texto oscuro: el degradado se queda en tonos claros para que el
           negro siga teniendo contraste en la zona del titular */
        color1 = _hslAHex(tono + 8, Math.min(0.45, Math.max(0.1, s * 0.5)),
            Math.min(0.95, Math.max(0.86, 0.8 + l * 0.15)));
        color2 = _hslAHex(tono - 8, Math.min(0.6, Math.max(0.2, s * 0.85)),
            Math.min(0.68, Math.max(0.52, 0.38 + l * 0.3)));
    }

    return {
        color1: color1,
        color2: color2,
        angulo: angulo,
        tono: Math.round(tono),
        saturacion: Math.round(s * 100)
    };
}

/* Imagen que se analiza: la seleccionada o, si no, la última que se colocó. */
function imagenParaSugerencia() {
    var activo = canvas.getActiveObject();
    if (activo && activo.type === 'image') return activo;
    var objs = canvas.getObjects();
    for (var i = objs.length - 1; i >= 0; i--) {
        if (objs[i].type === 'image') return objs[i];
    }
    return null;
}

/* Aplica la sugerencia. `silencioso` evita el aviso (lo usa el modo
   automático, que ya avisa al insertar la foto). Devuelve la sugerencia. */
function aplicarSugerenciaDeImagen(img, silencioso) {
    var sug = _sugerenciaDeImagen(img);
    if (!sug) {
        if (!silencioso && window.mostrarAviso) {
            window.mostrarAviso('No se han podido leer los colores de esta imagen', 'warning');
        }
        return null;
    }

    DECO.tipoFondo = 'degradado';
    DECO.color1 = sug.color1;
    DECO.color2 = sug.color2;
    DECO.angulo = sug.angulo;
    var selector = document.getElementById('color');
    if (selector) selector.value = sug.color1;

    aplicarDecoracion();
    if (window.tetGuardarEstado) window.tetGuardarEstado();
    document.dispatchEvent(new CustomEvent('tet:degradado-sugerido', { detail: sug }));
    if (!silencioso && window.mostrarAviso) {
        window.mostrarAviso('Degradado sugerido según la foto · Ctrl+Z para volver', 'success');
    }
    return sug;
}

/* Botón «Sugerir según la foto»: siempre aplica. */
window.tetSugerirDegradado = function () {
    var img = imagenParaSugerencia();
    if (!img) {
        if (window.mostrarAviso) {
            window.mostrarAviso('Coloca una imagen para sugerir un degradado', 'warning');
        }
        return null;
    }
    return aplicarSugerenciaDeImagen(img, false);
};

/* Opción «Automático al colocar la foto» (panel Plantilla). El estado vive en
   localStorage para que siga activo al recargar. */
function autoDegradadoActivo() {
    try {
        return localStorage.getItem('tet-auto-degradado') === '1';
    } catch (e) {
        return false;
    }
}
window.tetAutoDegradadoActivo = autoDegradadoActivo;

window.tetSugerirDegradadoAuto = function (img) {
    if (!autoDegradadoActivo()) return null;
    var objetivo = img || imagenParaSugerencia();
    if (!objetivo) return null;
    return aplicarSugerenciaDeImagen(objetivo, true);
};


/* =========================================================================
   2 · SELECTORES DE COLOR
   ========================================================================= */

/* Color del TEXTO: se aplica en vivo a lo seleccionado. */
document.getElementById('colorT').oninput = function colored() {
    var color = this.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        var style = {};
        style['fill'] = color;
        obj.setSelectionStyles(style).setCoords();
        canvas.renderAll();
    }
    if (window.tetRefrescarPanelTexto) window.tetRefrescarPanelTexto();
};

/* Color del FONDO: antes no tenía ningún manejador, así que mover el selector
   no hacía nada hasta pulsar «Cargar plantilla». Ahora repinta el fondo (o el
   primer color del degradado) mientras se arrastra y guarda el estado una vez
   al soltar. */
document.getElementById('color').oninput = function fondoEnVivo() {
    if (DECO.tipoFondo === 'degradado') DECO.color1 = this.value;
    aplicarFondo();
};
document.getElementById('color').onchange = function fondoSoltado() {
    if (DECO.tipoFondo === 'degradado') DECO.color1 = this.value;
    aplicarFondo(function () {
        if (window.tetGuardarEstado) window.tetGuardarEstado();
    });
};


/* =========================================================================
   3 · LIENZO
   ========================================================================= */
function myFunction() {
    if (x.matches) { // If media query matches
        hc = 300;
        wc = 300;
    } else {
        hc = 500;
        wc = 500;
    }

}

var x = window.matchMedia("(max-width: 1000px)")
myFunction(x) // Call listener function at run time
/* el ajuste al tamaño de pantalla lo hace shell.js (autoAjustar): este
   listener solo recalculaba hc/wc y nunca los aplicaba al lienzo */
    /* inicio canvas code*/
var canvas = new fabric.Canvas('tetnews');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
/* fondo blanco: sin él el lienzo es transparente y el PNG descargado o
   compartido sale con canal alfa (se ve negro en fuera del navegador) */
canvas.backgroundColor = '#ffffff';

plantillaActual = { img: './public/img/Plantilla3.png', barra: tetnews_bar, color: '#FFFFFF', arte: false };
aplicarDecoracion(true);
/* fin canvas code*/


/* =========================================================================
   4 · PLANTILLAS
   -------------------------------------------------------------------------
   Una tabla en vez de un switch de 11 casos: el fondo, la barra superior y el
   tinte de cada plantilla en un sitio, y las cuatro últimas ya no se mezclan
   con canvas.clear() —clear() borraba también las capas del usuario y por eso
   rotar plantillas «no servía de nada».
   · img        → imagen de la plantilla
   · arte       → true si `img` es el DIBUJO de la plantilla. Varias entradas
                   apuntan a un PNG de 1200 × 93 que es la misma franja: como
                   imagen de fondo se estiraba a tapar el lienzo entero, así
                   que no se dibuja (antes se esquivaba con `opacity: barra ? 0 : 1`,
                   una regla invisible que además apagaba el dibujo bueno).
   · barra      → franja superior (se escala al ancho y se pega arriba)
   · color      → '#ffffff' fijo, 'color' = el del selector, '' → transparente

   Con `arte: false` el lienzo queda limpio: solo el fondo (plano o degradado) y
   la franja. Así el degradado y el deslizador de opacidad tienen dónde verse,
   que es justamente el caso de uso: bajar la opacidad para que el fondo
   asome detrás de la plantilla.
   ========================================================================= */
var PLANTILLAS = [
    { img: './public/img/Plantilla3.png', barra: tetnews_bar, color: '#FFFFFF', arte: false },
    { img: curi_bar, barra: curi_bar, color: 'color', arte: false },
    { img: './public/img/Plantillas/tet1/TBtet.png', arte: true },
    { img: './public/img/Plantillas/tet1/TBtet2.png', arte: true },
    { img: './public/img/Plantillas/tet1/creadores.png', arte: true },
    { img: rese, barra: rese, color: 'color', arte: false },
    { img: MB, barra: MB, color: 'color', arte: false },
    { img: TT, barra: TT, color: 'color', arte: false },
    { img: TF, barra: TF, color: 'color', arte: false },
    { img: Art, barra: Art, color: 'color', arte: false },
    { img: Blan, barra: Blan, color: 'color', arte: false },
    { img: barTetNewsNuevo, barra: barTetNewsNuevo, color: 'color', arte: false },
    { img: barRecomendaciones, barra: barRecomendaciones, color: 'color', arte: false },
    { img: barEstrenos, barra: barEstrenos, color: 'color', arte: false }
];

/* Imagen de la plantilla que toca: solo si es el dibujo. */
function imgDePlantilla(t) {
    return (t && t.arte) ? t.img : null;
}
/* setBackgroundImage es asíncrono: con la rotación automática cada 1,4 s se
   encadenaban dos descargas y ganaba la que llegaba antes, dejando una
   plantilla que ya no era la elegida. Cada cambio saca un tique y solo se
   aplica si sigue siendo el último. */
var tplTicket = 0;

function reload() {
    var i = parseInt(plantilla.value, 10);
    var t = PLANTILLAS[i];
    if (!t) return;

    var tq = ++tplTicket;
    plantillaActual = t;

    /* Fondo, franja e imagen de plantilla, todo desde la geometría real del
       lienzo. La imagen se carga de forma asíncrona: con la rotación
       automática cada 1,4 s se encadenaban dos descargas y ganaba la que
       llegaba antes, dejando una plantilla que ya no era la elegida. Por eso
       cada cambio saca un tique y el guardado en el historial solo ocurre si
       al terminar sigue siendo el último. */
    aplicarDecoracion(true);

    if (window.tetGuardarEstado) {
        setTimeout(function () {
            if (tq === tplTicket) window.tetGuardarEstado();
        }, 60);
    }
}

// Centrar objeto seleccionado
function center() {
    var obj = canvas.getActiveObject();
    if (obj) {
        obj.centerH();
        canvas.renderAll();
    }
}

// Descargar como imagen PNG
function download() {
    canvas.discardActiveObject();
    canvas.renderAll();
    try {
        ReImg.fromCanvas(document.getElementById('tetnews')).toPng()
        ReImg.fromCanvas(document.getElementById('tetnews')).downloadPng()
    } catch (err) {
        // canvas "tainted" (p.ej. abierto como file://): aviso claro
        if (window.avisoExportacion) window.avisoExportacion(err);
        else if (window.mostrarAviso) window.mostrarAviso('No se pudo descargar la imagen', 'danger');
        return;
    }
    if (window.mostrarAviso) { window.mostrarAviso('Imagen descargada', 'success'); }
}

// Remover objeto
function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}

/* -------------------------------------------------------------------------
   CARGA RÁPIDA DE IMÁGENES

   Antes: FileReader.readAsDataURL() guardaba la foto entera (un 33 % más
   grande en base64) y generate() volvía a decodificarla cada vez que se
   insertaba. Con una foto de móvil de 12 Mpx eso se nota y, si se pulsaba
   «Insertar imagen» varias veces, se pagaba la decodificación en cada pulsación.

   Ahora se decodifica UNA vez fuera del hilo principal (createImageBitmap),
   se reduce a un tamaño útil para el lienzo (2× el lado mayor, máximo 3200 px)
   y se guarda el canvas resultante. Fabric lo usa directamente: insertar la
   misma imagen o componerla con el botón automático es casi instantáneo.
   ------------------------------------------------------------------------- */
function limiteImagen() {
    var lado = Math.max(canvas.getWidth(), canvas.getHeight());
    return Math.max(1000, Math.min(3200, Math.round(lado * 2)));
}

function rasterizarImagen(origen, tipo, ancho, alto) {
    var max = limiteImagen();
    var esc = Math.min(1, max / Math.max(ancho || 1, alto || 1));
    var w = Math.max(1, Math.round((ancho || 1) * esc));
    var h = Math.max(1, Math.round((alto || 1) * esc));
    var lienzo = document.createElement('canvas');
    lienzo.width = w;
    lienzo.height = h;
    var ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error('El navegador no ha podido crear el lienzo de la imagen');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(origen, 0, 0, w, h);

    /* PNG/WebP/GIF conservan transparencia; una foto JPEG se guarda como JPEG
       para que el historial no cargue con PNG gigantes. */
    var conAlfa = /png|webp|gif|svg/i.test(tipo || '');
    return {
        fuente: lienzo,
        url: lienzo.toDataURL(conAlfa ? 'image/png' : 'image/jpeg', 0.92),
        optimizada: esc < 1
    };
}

function prepararImagen(file) {
    return new Promise(function (resolve, reject) {
        var terminado = false;
        function listo(origen, w, h) {
            if (terminado) return;
            terminado = true;
            try { resolve(rasterizarImagen(origen, file.type, w, h)); }
            catch (err) { reject(err); }
        }
        function clasico() {
            var url = URL.createObjectURL(file);
            var im = new Image();
            im.onload = function () {
                URL.revokeObjectURL(url);
                listo(im, im.naturalWidth, im.naturalHeight);
            };
            im.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('No se pudo decodificar la imagen'));
            };
            im.src = url;
        }
        if (window.createImageBitmap) {
            try {
                createImageBitmap(file, { imageOrientation: 'from-image' })
                    .then(function (bmp) {
                        listo(bmp, bmp.width, bmp.height);
                        if (bmp.close) bmp.close();
                    })
                    .catch(clasico);
            } catch (e) {
                clasico();
            }
        } else {
            clasico();
        }
    });
}

// Cargar URL de la imagen a subir
function picload() {
    /* por id, no por 'input[type=file]': capas.js inyecta otro input (el del
       .json de proyecto) y el primero del documento podía acabar siendo ese */
    var input = document.getElementById('imagen');
    var file = input && input.files ? input.files[0] : null;
    var fileName = document.querySelector('#div-img .file-name');

    if (!file) {
        if (window.mostrarAviso) { window.mostrarAviso('El archivo no es soportado'); }
        else { console.warn('El archivo no es soportado'); }
        return Promise.resolve(null);
    }

    var token = ++picToken;
    globalpic = null;
    globalpicFuente = null;
    if (fileName) fileName.textContent = file.name + ' · preparando…';

    picPromesa = prepararImagen(file).then(function (res) {
        if (token !== picToken) return;      // llegó tarde: manda la última elegida
        globalpic = res.url;
        globalpicFuente = res.fuente;
        if (fileName) {
            fileName.textContent = file.name + (res.optimizada ? ' · optimizada' : '');
        }
        if (window.mostrarAviso) { window.mostrarAviso('Imagen lista', 'success'); }
    }).catch(function (err) {
        if (token !== picToken) return;
        globalpic = null;
        globalpicFuente = null;
        if (fileName) fileName.textContent = 'Ninguna imagen seleccionada';
        if (window.mostrarAviso) { window.mostrarAviso('No se pudo leer la imagen', 'danger'); }
        console.warn('tet: no se pudo preparar la imagen', err);
    }).then(function () {
        /* se vacía el input para que volver a elegir EL MISMO archivo dispare
           otro onchange: sin esto, elegir dos veces la misma imagen no hacía
           nada (el navegador no vuelve a lanzar el evento si no cambia el
           valor) */
        try { input.value = ''; } catch (e) { /* algunos navegadores lo impiden */ }
    });

    return picPromesa;
}


/* =========================================================================
   5 · ZONAS DE COMPOSICIÓN
   -------------------------------------------------------------------------
   Antes el titular y el detalle se colocaban en píxeles fijos (top: 730 y
   top: 870) calibrados para el lienzo cuadrado de 1200. Al cambiar a un
   formato de redes sociales el titular caía fuera del lienzo —en un
   1200 × 630 de Facebook no se veía nada— y el detalle, encima.

   Ahora son fracciones de la altura del lienzo, de modo que los huecos se
   reparten igual en cualquier formato. Para el cuadrado de 1200 dan 720/864,
   prácticamente los valores de siempre.
   ========================================================================= */
var ZONAS = {
    titulo:  { top: 0.60, alto: 0.11 },
    detalle: { top: 0.72, alto: 0.20 }
};

/* Ancho útil para los textos: deja un margen lateral proporcional. */
function anchoTexto() {
    return Math.max(80, Math.round(canvas.getWidth() * 0.92));
}

/* Coloca un texto en su zona y deja constancia de a cuál pertenece
   (`tetZona`). Esa marca es la que permite recolocarlos solos al cambiar el
   tamaño del lienzo; viaja en el historial porque capas.js la pide
   explícitamente en el toJSON. */
function situarEnZona(obj, zona) {
    var z = ZONAS[zona];
    if (!z) return obj;
    var maxW = anchoTexto();
    obj.set({
        tetZona: zona,
        width: maxW,
        left: Math.round((canvas.getWidth() - maxW) / 2),
        top: Math.round(canvas.getHeight() * z.top)
    });
    obj.setCoords();
    return obj;
}

/* -------------------------------------------------------------------------
   SEPARACIÓN ENTRE TITULAR Y DETALLE

   Las zonas están al 60 % y al 72 % de la altura: 12 px de aire en un lienzo
   de 1200. Pero el titular se encogía con una estimación del alto
   (líneas × tamaño × 1,16) que se queda corta —el texto real medía 137 px
   donde se estimaban 130— y el detalle acababa a 6 px del titular; con la
   sombra activada se leían pegados.

   Ahora el aire es una fracción de la altura (2 %, 24 px en 1200) y se
   comprueba con el alto REAL del texto, no con el de la caja: el Textbox del
   detalle se crea con height = alto de zona, y medir su caja daría 240 px de
   algo que no existe.
   ------------------------------------------------------------------------- */
var SEPARACION = 0.02;

function separacionMinima() {
    return Math.max(12, Math.round(canvas.getHeight() * SEPARACION));
}

/* Alto que ocupa el TEXTO de un objeto (no el de su caja). */
function altoTexto(obj) {
    if (obj._textLines && obj.fontSize) {
        return obj._textLines.length * obj.fontSize * (obj.lineHeight || 1.16);
    }
    return obj.height || 0;
}

/* Alto disponible entre las dos zonas: el titular encoge hasta quepa aquí,
   dejando además la separación mínima. */
function huecoTitulo() {
    var H = canvas.getHeight();
    return Math.max(40, Math.round((ZONAS.detalle.top - ZONAS.titulo.top) * H - separacionMinima()));
}

/* Garantiza que entre el final del titular y el principio del detalle haya
   separación. Se llama al insertar cualquiera de los dos y al recolocar las
   zonas. Si el detalle se saldría por abajo, se sube el titular en lugar de
   bajar el detalle. Devuelve true si ha movido algo. */
function separarTextos() {
    if (window.matchMedia('(max-width: 767.98px)').matches) return false;

    var titulos = [], detalles = [];
    canvas.getObjects().forEach(function (o) {
        if (o.tetZona === 'titulo') titulos.push(o);
        else if (o.tetZona === 'detalle') detalles.push(o);
    });
    if (!titulos.length || !detalles.length) return false;

    var finTitulo = -Infinity, iniDetalle = Infinity, finDetalle = -Infinity;
    titulos.forEach(function (o) {
        finTitulo = Math.max(finTitulo, o.top + altoTexto(o));
    });
    detalles.forEach(function (o) {
        iniDetalle = Math.min(iniDetalle, o.top);
        finDetalle = Math.max(finDetalle, o.top + altoTexto(o));
    });

    var falta = separacionMinima() - (iniDetalle - finTitulo);
    if (falta <= 0) return false;

    var H = canvas.getHeight();
    var mover = function (lista, delta) {
        lista.forEach(function (o) {
            o.set({ top: Math.round(o.top + delta) });
            o.setCoords();
        });
    };

    /* el detalle no puede quedar pegado al borde del lienzo */
    var margenAbajo = Math.max(8, Math.round(H * 0.02));
    if (finDetalle + falta > H - margenAbajo) {
        mover(titulos, -falta);   /* no cabe bajando: sube el titular */
    } else {
        mover(detalles, falta);
    }
    canvas.renderAll();
    return true;
}
window.tetSepararTextos = separarTextos;

/* Recoloca el titular y los detalles en sus zonas para el tamaño de lienzo
   actual. Se llama al cambiar de formato («Lienzo en blanco»): los textos se
   quedan donde el usuario los puso salvo que sean uno de esos dos, que es lo
   que se adapta solo. El resto de capas las mueve el usuario a mano. */
window.tetReubicarTextos = function () {
    var n = 0;
    canvas.getObjects().forEach(function (o) {
        if (o.tetZona && ZONAS[o.tetZona]) {
            situarEnZona(o, o.tetZona);
            n++;
        }
    });
    if (n) {
        separarTextos();
        canvas.renderAll();
    }
    return n;
};

/* Da al lienzo las medidas de un formato y reajusta todo lo que depende de
   ellas: el respaldo, el tamaño en pantalla, la franja (que se redimensiona,
   no se estira), el degradado y las zonas de texto. Lo comparten el botón
   «Lienzo en blanco» y la adaptación automática al cambiar de formato. */
window.tetAjustarLienzoA = function (d) {
    if (!d || !(d.w > 0) || !(d.h > 0)) return false;

    /* con el retina activo el respaldo sale a dpr²: un preset de 2560×1440 en
       un móvil pedía 7680×4320 (33 Mpx) y el lienzo se quedaba negro */
    var dpr = fabric.devicePixelRatio || 1;
    var retina0 = canvas.enableRetinaScaling;
    if (d.w * d.h * dpr * dpr > 12e6) canvas.set({ enableRetinaScaling: false });

    canvas.setDimensions({ width: d.w, height: d.h }, { backstoreOnly: true });

    /* tamaño en pantalla: el lienzo se ve siempre como máximo a 500 px */
    var esc = Math.min(500 / d.w, 500 / d.h, 1);
    var dw = Math.round(d.w * esc);
    var dh = Math.round(d.h * esc);
    canvas.setDimensions({ width: dw, height: dh }, { cssOnly: true });
    var wrap = canvas.wrapperEl;
    if (wrap) { wrap.style.width = dw + 'px'; wrap.style.height = dh + 'px'; }

    /* se deja el retina como estaba: el respaldo ya está a la medida que
       corresponde al preset elegido */
    canvas.set({ enableRetinaScaling: retina0 });

    canvas.calcOffset();
    canvas.renderAll();

    if (window.tetReubicarTextos) window.tetReubicarTextos();
    /* la imagen del botón automático también se reencaja en el formato nuevo
       (la franja y el titular ya cambiaron de sitio) */
    if (window.tetReubicarImagenAuto) window.tetReubicarImagenAuto();
    if (window.tetReajustarAlLienzo) window.tetReajustarAlLienzo();
    if (window.tetAjustarGuias) window.tetAjustarGuias();
    /* la barra de estado de la shell anuncia el tamaño del lienzo: sin esto
       seguía diciendo el tamaño anterior (1200 × 1200) con el lienzo ya
       adaptado a otro formato */
    var estado = document.getElementById('sh-estado');
    if (estado) estado.textContent = d.w + ' × ' + d.h + ' px';
    canvas.renderAll();
    return true;
};

/* Adapta el lienzo al formato elegido al cambiar el selector. Sin esto el
   lienzo se quedaba en 1200 × 1200 y el formato de redes sociales se
   recortaba por los lados: la franja salía cortada (justo donde está «somostet.com»)
   y el diseño no se veía como se iba a exportar. El contenido se conserva; solo
   el titular y el detalle vuelven a su zona (ver tetReubicarTextos). */
window.tetAdaptarAlFormato = function () {
    if (window.tetModoRecorte) {
        if (window.mostrarAviso) window.mostrarAviso('Aplica o cancela el recorte antes de cambiar de formato', 'warning');
        return false;
    }
    var d = window.formatosDims ? window.formatosDims() : null;
    if (!d || d.orig) return false;          // «Tamaño original» no cambia nada
    if (canvas.getWidth() === d.w && canvas.getHeight() === d.h) return false;
    if (!window.tetAjustarLienzoA(d)) return false;

    /* la vista se vuelve a encajar en el área de trabajo con el tamaño nuevo */
    window.dispatchEvent(new Event('resize'));
    if (window.mostrarAviso) {
        window.mostrarAviso('Lienzo adaptado a ' + d.w + '×' + d.h + ' · Ctrl+Z deshace', 'info');
    }
    return true;
};

/* Titular: se crea y, si el texto real no cabe en su hueco, se encoge de 4 en
   4 px. Se mide sobre el Textbox ya creado (alto real del texto) y no con una
   estimación de líneas × tamaño. */
function crearTitulo(texto) {
    var col = document.getElementById('colorT').value;
    var size = parseInt(document.getElementById('font_size').value, 10) || 72;
    var maxW = anchoTexto();
    var maxH = huecoTitulo();

    var obj = new fabric.Textbox(texto, {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: col,
        fontSize: size,
        width: maxW,
        left: Math.round((canvas.getWidth() - maxW) / 2),
        top: Math.round(canvas.getHeight() * ZONAS.titulo.top),
        lockMovementX: false,
        lockMovementY: false,
        hasControls: false,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    });

    while (obj.fontSize > 24 && altoTexto(obj) > maxH) {
        size -= 4;
        obj.set({ fontSize: size, width: maxW });
    }

    situarEnZona(obj, 'titulo');
    return obj;
}

function actualizarTitulo(obj, texto) {
    obj.set({
        text: texto,
        fill: document.getElementById('colorT').value,
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        fontSize: parseInt(document.getElementById('font_size').value, 10) || 72,
        width: anchoTexto(),
        lockMovementX: false,
        lockMovementY: false,
        hasControls: false
    });
    if (obj.initDimensions) obj.initDimensions();
    situarEnZona(obj, 'titulo');
    var maxH = huecoTitulo();
    var size = obj.fontSize;
    while (obj.fontSize > 24 && altoTexto(obj) > maxH) {
        size -= 4;
        obj.set({ fontSize: size, width: anchoTexto() });
    }
    obj.setCoords();
    return obj;
}

// Colocar titulo
function set_title() {
    var txt = (document.getElementById('titular').value || '').trim();
    if (!txt) {
        if (window.mostrarAviso) window.mostrarAviso('Escribe un título primero', 'warning');
        return null;
    }
    var obj = crearTitulo(txt);
    canvas.add(obj);
    obj.centerH();
    obj.lockRotation = true;
    obj.setCoords();
    canvas.setActiveObject(obj);
    canvas.renderAll();
    return obj;
}


/* Detalle: mismo criterio que el titular. Además se encoge si el texto real
   no cabe en la zona, para que no se salga por abajo al componer en automático. */
function crearDetalle(texto) {
    var H = canvas.getHeight();
    var maxW = anchoTexto();
    var altoZona = Math.round(ZONAS.detalle.alto * H);
    var size = parseInt(document.getElementById('font_sizeD').value, 10) || 48;

    var obj = new fabric.Textbox(texto, {
        width: maxW,
        left: Math.round((canvas.getWidth() - maxW) / 2),
        fontFamily: 'sans-serif',
        fill: document.getElementById('colorT').value,
        textAlign: 'center',
        fontSize: size,
        top: Math.round(H * ZONAS.detalle.top),
        // el alto de la zona hace que el cuadro no se salga por abajo
        height: altoZona,
        lockMovementX: false,
        lockMovementY: false,
        splitByGrapheme: false,
        hasControls: false,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    });

    while (obj.fontSize > 18 && altoTexto(obj) > altoZona) {
        size -= 2;
        obj.set({ fontSize: size, width: maxW });
    }

    situarEnZona(obj, 'detalle');
    return obj;
}

function actualizarDetalle(obj, texto) {
    obj.set({
        text: texto,
        fill: document.getElementById('colorT').value,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        fontSize: parseInt(document.getElementById('font_sizeD').value, 10) || 48,
        width: anchoTexto(),
        lockMovementX: false,
        lockMovementY: false,
        hasControls: false
    });
    if (obj.initDimensions) obj.initDimensions();
    situarEnZona(obj, 'detalle');
    var altoZona = Math.round(ZONAS.detalle.alto * canvas.getHeight());
    var size = obj.fontSize;
    while (obj.fontSize > 18 && altoTexto(obj) > altoZona) {
        size -= 2;
        obj.set({ fontSize: size, width: anchoTexto() });
    }
    obj.setCoords();
    return obj;
}

// Colocar detalles
function set_detail() {
    var txt = (document.getElementById('detalles').value || '').trim();
    if (!txt) {
        if (window.mostrarAviso) window.mostrarAviso('Escribe el detalle primero', 'warning');
        return null;
    }
    var obj = crearDetalle(txt);
    canvas.add(obj);
    separarTextos();   /* el detalle acaba de entrar: comprueba el aire con el titular */
    obj.centerH();
    obj.lockRotation = true;
    obj.setCoords();
    canvas.setActiveObject(obj);
    canvas.renderAll();
    return obj;
}


/* =========================================================================
   6 · INSERTAR IMAGEN AL CANVAS
   ========================================================================= */
function nuevaImagenFabric() {
    if (!globalpicFuente) return null;
    /* Fabric acepta directamente el canvas ya preparado: no se vuelve a
       decodificar el archivo, que es la parte lenta. */
    var img = new fabric.Image(globalpicFuente);
    if (globalpic) {
        /* Al serializar, Fabric haría un PNG nuevo del canvas en CADA guardado
           del historial (varios MB y una pausa perceptible). Se le da el JPEG
           ya reducido: el historial y el .json pesan mucho menos y reconocen la
           imagen aunque se haya deshecho/rehecho. */
        var fuenteUrl = globalpic;
        img._originalSrc = fuenteUrl;
        img.getSrc = function (paraFiltro) {
            if (paraFiltro) return fabric.Image.prototype.getSrc.call(this, true);
            return fuenteUrl;
        };
    }
    return img;
}

/* ¿Esta imagen del lienzo viene del archivo cargado ahora? Se compara el
   canvas preparado y también el src serializado, porque tras deshacer/rehacer
   (o al abrir un proyecto) la imagen revive como <img>, no como canvas. */
function mismaFuente(img) {
    if (!img || !globalpicFuente) return false;
    if (img._originalElement === globalpicFuente || img._element === globalpicFuente) return true;
    var actual = img._originalSrc || (img._element && img._element.src) ||
        (img._originalElement && img._originalElement.src) || '';
    return !!globalpic && actual === globalpic;
}

function colocarImagenNueva(img) {
    if (!img) return null;
    if (window.ajustarImagenAlLienzo) window.ajustarImagenAlLienzo(img);
    /* recién insertada: nunca bloqueada (un candado heredado la dejaba fija
       y parecía que el arrastre no funcionaba) */
    img.set({
        lockRotation: true,
        selectable: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        visible: true
    });
    img.capaBloqueada = false;
    img.setCoords();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    /* con la opción del panel activada, el fondo se adapta a la foto recién
       colocada. Va después de añadirla para que el lienzo ya tenga sus colores. */
    if (window.tetSugerirDegradadoAuto) window.tetSugerirDegradadoAuto(img);
    return img;
}

/* Inserción normal (botón «Insertar imagen»). Devuelve una promesa por si
   quien llama quiere esperar (el modo automático). */
function generate() {
    if (!globalpic && !globalpicFuente) {
        if (window.mostrarAviso) { window.mostrarAviso('Primero carga una imagen'); }
        else { console.warn('Primero carga una imagen'); }
        return Promise.resolve(null);
    }
    var img = nuevaImagenFabric();
    if (img) return Promise.resolve(colocarImagenNueva(img));
    return new Promise(function (resolve) {
        fabric.Image.fromURL(globalpic, function (oImg) {
            resolve(colocarImagenNueva(oImg));
        });
    });
}


/* =========================================================================
   6b · COMPOSICIÓN AUTOMÁTICA (título + detalle + imagen)

   Un solo botón coloca las tres piezas con aire entre ellas:
     franja → imagen → titular → detalle
   La imagen ocupa exactamente el hueco entre la franja y el titular; si su
   proporción es parecida a la del hueco se recorta para rellenarlo (cover) y,
   si es muy distinta, se ajusta entera (contain) para no comerse la foto.
   ========================================================================= */

/* Objeto de texto que ya está en el lienzo y pertenece a una zona. */
function objetoDeZona(zona) {
    var lista = canvas.getObjects().filter(function (o) {
        return o.tetZona === zona && o.type !== 'image';
    });
    return lista.length ? lista[lista.length - 1] : null;
}

function quitarImagenAuto(excepto) {
    canvas.getObjects().slice().forEach(function (o) {
        if (o.tetAutoImagen && o !== excepto) canvas.remove(o);
    });
}

/* Imagen que gestiona el botón automático (o la última que coincida con el
   archivo cargado). Reutilizarla evita duplicados al pulsar dos veces y, sobre
   todo, conserva el recorte manual (_tetBase) al recomponer. */
function imagenParaAuto() {
    var imgs = canvas.getObjects().filter(function (o) { return o.type === 'image'; });
    var i, auto = null;
    for (i = imgs.length - 1; i >= 0; i--) {
        if (imgs[i].tetAutoImagen) { auto = imgs[i]; break; }
    }
    if (auto) {
        /* si se acaba de cargar OTRO archivo, la imagen automática vieja ya no
           sirve: se descarta y se crea una nueva con la fuente actual */
        if (globalpicFuente && !mismaFuente(auto)) return null;
        return auto;
    }
    if (globalpicFuente) {
        for (i = imgs.length - 1; i >= 0; i--) {
            if (mismaFuente(imgs[i])) return imgs[i];
        }
        return null;
    }
    return imgs.length ? imgs[imgs.length - 1] : null;
}

/* Región de origen que debe usar el ajuste automático. Se guarda la primera
   vez para que cambiar de formato no vaya recortando la foto en cada pasada. */
function baseDeImagen(img) {
    if (!img._tetBase) {
        img._tetBase = {
            cropX: img.cropX || 0,
            cropY: img.cropY || 0,
            width: img.width,
            height: img.height
        };
    }
    return img._tetBase;
}

/* Hueco libre entre la franja superior y el titular (o el detalle). */
function huecoImagen() {
    var W = canvas.getWidth(), H = canvas.getHeight();
    var aireCabecera = Math.max(8, Math.round(H * 0.012));
    var aire = Math.max(12, Math.round(H * 0.022));
    var arriba = (DECO.conBarra ? rectBarra().h : 0) + aireCabecera;
    var abajo = H - aire;

    var t = objetoDeZona('titulo');
    var d = objetoDeZona('detalle');
    if (t) abajo = Math.min(abajo, t.top - aire);
    else if (d) abajo = Math.min(abajo, d.top - aire);

    if (abajo - arriba < H * 0.1) return null;
    return { x: 0, y: arriba, w: W, h: abajo - arriba };
}

/* Encaja la imagen en el hueco. Cover si la proporción es parecida (así no
   queda un marco vacío); contain si es muy apaisada o muy vertical. */
function encajarImagen(img, hueco) {
    var base = baseDeImagen(img);
    img.set({
        cropX: base.cropX,
        cropY: base.cropY,
        width: base.width,
        height: base.height,
        originX: 'left',
        originY: 'top'
    });

    var dispW = img.width, dispH = img.height;
    if (!(dispW > 0) || !(dispH > 0) || !hueco) return img;
    var aspectoImg = dispW / dispH;
    var aspectoHueco = hueco.w / hueco.h;
    var rellenar = aspectoImg > aspectoHueco / 1.6 && aspectoImg < aspectoHueco * 1.6;

    if (rellenar) {
        var cw, ch;
        if (aspectoImg > aspectoHueco) {
            ch = dispH;
            cw = ch * aspectoHueco;
        } else {
            cw = dispW;
            ch = cw / aspectoHueco;
        }
        img.set({
            cropX: base.cropX + (dispW - cw) / 2,
            cropY: base.cropY + (dispH - ch) / 2,
            width: cw,
            height: ch,
            scaleX: hueco.w / cw,
            scaleY: hueco.h / ch,
            left: hueco.x,
            top: hueco.y
        });
    } else {
        var e = Math.min(hueco.w / dispW, hueco.h / dispH);
        img.set({
            scaleX: e,
            scaleY: e,
            left: Math.round(hueco.x + (hueco.w - dispW * e) / 2),
            top: Math.round(hueco.y)
        });
    }
    img.setCoords();
    return img;
}

/* Recoloca la imagen automática tras cambiar de formato. */
window.tetReubicarImagenAuto = function () {
    var img = null;
    canvas.getObjects().some(function (o) {
        if (o.tetAutoImagen) { img = o; return true; }
        return false;
    });
    if (!img) return false;
    var hueco = huecoImagen();
    if (!hueco) return false;
    encajarImagen(img, hueco);
    canvas.renderAll();
    return true;
};

function componerTodo() {
    var texto = (document.getElementById('titular').value || '').trim();
    var detalle = (document.getElementById('detalles').value || '').trim();
    if (!texto && !detalle && !globalpicFuente && !globalpic && !imagenParaAuto()) {
        if (window.mostrarAviso) {
            window.mostrarAviso('Escribe un título, el detalle o carga una imagen', 'warning');
        }
        return false;
    }

    /* Todo entra en el historial como UN solo paso: Ctrl+Z deshace la
       composición completa, no tres cambios sueltos. */
    window.tetHistorialBloque(function () {
        /* se busca ANTES de retirar la imagen automática anterior: así se
           reutiliza el mismo objeto y su recorte manual no se pierde */
        var img = imagenParaAuto();
        quitarImagenAuto(img);

        var titulo = null;
        if (texto) {
            titulo = objetoDeZona('titulo');
            if (titulo) actualizarTitulo(titulo, texto);
            else {
                titulo = crearTitulo(texto);
                canvas.add(titulo);
            }
            titulo.centerH();
            titulo.lockRotation = true;
            titulo.setCoords();
        }

        var desc = null;
        if (detalle) {
            desc = objetoDeZona('detalle');
            if (desc) actualizarDetalle(desc, detalle);
            else {
                desc = crearDetalle(detalle);
                canvas.add(desc);
            }
            desc.centerH();
            desc.lockRotation = true;
            desc.setCoords();
        }

        separarTextos();

        if (!img && globalpicFuente) img = nuevaImagenFabric();
        if (img) {
            var hueco = huecoImagen();
            if (hueco) encajarImagen(img, hueco);
            img.set({ tetAutoImagen: true, tetZona: 'imagen', lockRotation: true });
            if (!img.canvas) canvas.add(img);
            /* los textos, por delante: si el hueco se quedara corto por una
               foto contain, nunca tapan el titular */
            if (titulo) canvas.bringToFront(titulo);
            if (desc) canvas.bringToFront(desc);
            canvas.setActiveObject(img);
        }

        canvas.renderAll();
        /* la composición automática también puede adaptar el fondo a la foto */
        if (img && window.tetSugerirDegradadoAuto) window.tetSugerirDegradadoAuto(img);
    });

    return true;
}

window.tetAutoComponer = function () {
    if (window.tetModoRecorte) {
        if (window.mostrarAviso) {
            window.mostrarAviso('Aplica o cancela el recorte antes de componer', 'warning');
        }
        return Promise.resolve(false);
    }

    var btn = document.getElementById('btn-auto');
    var restaurar = function () {
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('is-cargando');
    };
    if (btn) {
        btn.disabled = true;
        btn.classList.add('is-cargando');
    }

    /* Si la imagen todavía se está decodificando, se espera: así el botón
       funciona aunque se pulse justo después de elegir el archivo. */
    var espera = picPromesa || Promise.resolve();
    return espera.then(function () {
        var ok = componerTodo();
        if (ok && window.mostrarAviso) {
            window.mostrarAviso('Composición automática lista · Ctrl+Z deshace', 'success');
        }
        return ok;
    }).catch(function (err) {
        console.warn('tet: no se pudo componer', err);
        if (window.mostrarAviso) window.mostrarAviso('No se pudo componer la imagen', 'danger');
        return false;
    }).then(function (r) {
        restaurar();
        return r;
    });
};


/* =========================================================================
   7 · código vendor
   ========================================================================= */

(function () {
    // El pegado de imágenes ahora es global (ver capas.js: paste en document)
    document.addEventListener("keydown", function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '46') {
            remover();
        }
    });

})();
