// Variables globales para la imagen a subir

var globalpic;
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
    opacidad: 1,           // 0..1 sobre la imagen de plantilla y la franja
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

    /* Si ya está puesta esa misma franja solo se reajusta escala y opacidad:
       recargarla en cada movimiento de deslizador haría parpadear el lienzo. */
    if (esLaMismaImagen(url, canvas.overlayImage)) {
        canvas.overlayImage.set({
            left: 0, top: 0,
            scaleX: r.esc, scaleY: r.esc,
            opacity: DECO.opacidad
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
        opacity: DECO.opacidad
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
            opacity: DECO.opacidad
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
    if (bg) bg.set({ opacity: DECO.opacidad });
    if (ov) ov.set({ opacity: DECO.opacidad });
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
   opacidad que tocan a la plantilla y al formato actuales. */
window.tetRestaurarDecoracion = function () {
    aplicarDecoracion(false);
};

window.tetAplicarDecoracion = aplicarDecoracion;
window.tetDeco = DECO;


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
    { img: Blan, barra: Blan, color: 'color', arte: false }
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
        return;
    }

    var reader = new FileReader();
    reader.onloadend = function () {
        globalpic = reader.result;
        /* se vacía el input para que volver a elegir EL MISMO archivo dispare
           otro onchange: sin esto, elegir dos veces la misma imagen no hacía
           nada (el navegador no vuelve a lanzar el evento si no cambia el
           valor) */
        try { input.value = ''; } catch (e) { /* algunos navegadores lo impiden */ }
    }
    reader.onerror = function () {
        globalpic = null;
        if (window.mostrarAviso) { window.mostrarAviso('No se pudo leer la imagen', 'danger'); }
        try { input.value = ''; } catch (e) { }
    };

    reader.readAsDataURL(file);
    if (fileName) fileName.textContent = file.name;
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

/* Alto disponible entre las dos zonas: el titular encoge hasta quepa aquí. */
function huecoTitulo() {
    var H = canvas.getHeight();
    return Math.max(40, Math.round((ZONAS.detalle.top - ZONAS.titulo.top) * H - 12));
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
    if (n) canvas.renderAll();
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

// Colocar titulo
function set_title() {
    var col = colorT.value;
    var titulo = titular.value;
    var size = parseInt(font_size.value, 10);
    var maxW = anchoTexto();
    var maxH = huecoTitulo();

    /* Q1a · el titular se parte en líneas y encoge si no cabe: antes era
       IText sin ancho —no partía nunca— y centrado se salía por los dos
       bordes del lienzo (se comían letras de los lados) */
    var tmp = document.createElement('canvas').getContext('2d');
    function parteTitulo(s) {
        tmp.font = 'bold ' + s + 'px sans-serif';
        var palabras = titulo.split(/\s+/).filter(Boolean);
        if (!palabras.length) return [''];
        var lineas = [], actual = palabras[0];
        for (var i = 1; i < palabras.length; i++) {
            var prueba = actual + ' ' + palabras[i];
            if (tmp.measureText(prueba).width <= maxW) actual = prueba;
            else { lineas.push(actual); actual = palabras[i]; }
        }
        lineas.push(actual);
        return lineas;
    }
    while (size > 24 && parteTitulo(size).length * size * 1.16 > maxH) size -= 4;

    var obj = new fabric.Textbox(titulo, {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: col,
        fontSize: size,
        width: maxW,
        left: Math.round((canvas.getWidth() - maxW) / 2),
        top: Math.round(canvas.getHeight() * ZONAS.titulo.top),
        hasControls: false,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    });
    situarEnZona(obj, 'titulo');
    canvas.add(obj);

    var canvas_objects = canvas._objects;
    if (canvas_objects.length !== 0) {
        var last = canvas_objects[canvas_objects.length - 1]; //Get last object
        last.centerH();
        last.lockMovementX = true;
        //last.lockMovementY=true;
        last.lockRotation = true;
        canvas.renderAll();
    }

}


// Colocar detalles
function set_detail() {
    var detail = detalles.value;
    var col = colorT.value;
    var size = parseInt(font_sizeD.value, 10);

    var H = canvas.getHeight();
    var maxW = anchoTexto();
    var altoZona = Math.round(ZONAS.detalle.alto * H);

    var obj = new fabric.Textbox(detail, {
        width: maxW,
        left: Math.round((canvas.getWidth() - maxW) / 2),
        fontFamily: 'sans-serif',
        //fontWeight: 'bold',
        fill: col,
        textAlign: 'center',
        fontSize: size,
        top: Math.round(H * ZONAS.detalle.top),
        // el alto de la zona hace que el cuadro no se salga por abajo
        height: altoZona,
        splitByGrapheme: false,
        hasControls: false,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    });
    situarEnZona(obj, 'detalle');
    canvas.add(obj);


    var canvas_objects = canvas._objects;
    if (canvas_objects.length !== 0) {
        var last = canvas_objects[canvas_objects.length - 1]; //Get last object
        last.centerH();
        last.lockMovementX = true;
        //last.lockMovementY=true;
        last.lockRotation = true;
        canvas.renderAll();
    }

}


/* =========================================================================
   6 · INSERTAR IMAGEN AL CANVAS
   ========================================================================= */
function generate() {
    if (!globalpic) {
        if (window.mostrarAviso) { window.mostrarAviso('Primero carga una imagen'); }
        else { console.warn('Primero carga una imagen'); }
        return;
    }

    //var shad = sombra.value;
    //var col = color.value;
    // var filter = new fabric.Image.filters.Resize({
    //     blur: shad
    // });

    fabric.Image.fromURL(globalpic, function (oImg) {
        ///oImg.filters.push(filter);
        //oImg.applyFilters();

        /* contain con margen y centrada; nunca por encima del nativo
           (antes scaleToWidth(1200) pixelaba las fotos pequeñas) */
        if (window.ajustarImagenAlLienzo) window.ajustarImagenAlLienzo(oImg);
        canvas.add(oImg.set({
            //hasControls: false,
            //lockMovementY: true,
            lockRotation: true
        }));

    });

}


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
