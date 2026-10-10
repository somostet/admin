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


// Color del texto
document.getElementById('colorT').oninput = function colored() {
    var color = this.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        var style = {};
        style['fill'] = color;
        obj.setSelectionStyles(style).setCoords();
    }

    canvas.renderAll();
}


// Coloca la barra superior, recibe URL de la imagen de la barra y COLOR del fondo
function set_front_bar(over, color) {
    canvas.setOverlayImage(over, canvas.renderAll.bind(canvas));
    canvas.setOverlayColor({
        source: color,
        repeat: 'repeat',
        offsetX: 0,
        offsetY: -1107
    }, canvas.renderAll.bind(canvas));
}


// Metodos de creacion del canvas
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
canvas.setBackgroundImage('./public/img/Plantilla3.png', canvas.renderAll.bind(canvas), {
    width: canvas.width,
    height: canvas.height
});
set_front_bar(tetnews_bar, "#FFFFFF");
/* fin canvas code*/

/* Cambio de plantilla
   Una tabla en vez de un switch de 11 casos: el fondo, la barra superior y el
   tinte de cada plantilla en un sitio, y las cuatro últimas ya no se mezclan
   con canvas.clear() —clear() borraba también las capas del usuario y por eso
   rotar plantillas «no servía de nada».
   · img        → imagen de fondo
   · barra      → overlay con la franja superior (se repite y se desplaza)
   · color      → '#ffffff' fijo, 'color' = el del selector, '' → transparente
   · opacidad   → 1 salvo que haya barra (esa copia se pinta encima) */
var PLANTILLAS = [
    { img: './public/img/Plantilla3.png', barra: tetnews_bar, color: '#FFFFFF' },
    { img: curi_bar, barra: curi_bar, color: 'color' },
    { img: './public/img/Plantillas/tet1/TBtet.png' },
    { img: './public/img/Plantillas/tet1/TBtet2.png' },
    { img: './public/img/Plantillas/tet1/creadores.png' },
    { img: rese, barra: rese, color: 'color' },
    { img: MB, barra: MB, color: 'color' },
    { img: TT, barra: TT, color: 'color' },
    { img: TF, barra: TF, color: 'color' },
    { img: Art, barra: Art, color: 'color' },
    { img: Blan, barra: Blan, color: 'color' }
];

/* setBackgroundImage es asíncrono: con la rotación automática cada 1,4 s se
   encadenaban dos descargas y ganaba la que llegaba antes, dejando una
   plantilla que ya no era la elegida. Cada cambio saca un tique y solo se
   aplica si sigue siendo el último. */
var tplTicket = 0;

function reload() {
    var i = parseInt(plantilla.value, 10);
    var t = PLANTILLAS[i];
    if (!t) return;
    var col = color.value;
    var fondo = (t.color === 'color') ? col : (t.color || '');

    /* fondo opaco también en las plantillas con imagen: sin esto el PNG
       exportaba con canal alfa (se veía negro) */
    canvas.backgroundColor = fondo;

    if (t.barra) {
        canvas.setOverlayImage(t.barra, canvas.renderAll.bind(canvas));
        canvas.setOverlayColor({
            source: fondo || '#FFFFFF',
            repeat: 'repeat',
            offsetX: 0,
            offsetY: -1107
        }, canvas.renderAll.bind(canvas));
    } else {
        /* las plantillas sin barra no dejaban nada del overlay anterior */
        canvas.overlayImage = null;
        canvas.overlayColor = null;
    }

    var tq = ++tplTicket;
    canvas.setBackgroundImage(t.img, function () {
        if (tq !== tplTicket) return;   // llegó una más nueva: esta ya no vale
        canvas.renderAll();
        /* el cambio entra en el historial: antes no se podía deshacer y los
           botones deshacer/rehacer se quedaban desincronizados */
        if (typeof window.tetGuardarEstado === 'function') window.tetGuardarEstado();
    }, {
        width: canvas.width,
        height: canvas.height,
        opacity: t.barra ? 0 : 1
    });
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
    var reader = new FileReader();

    if (!file) {
        if (window.mostrarAviso) { window.mostrarAviso('El archivo no es soportado'); } else { console.warn('El archivo no es soportado'); }
        return;
    }

    reader.onloadend = function() {
        globalpic = reader.result;
    }

    reader.readAsDataURL(file);
    fileName.textContent = file.name;
}

// Colocar titulo
function set_title() {
    var col = colorT.value;
    var titulo = titular.value;
    var size = parseInt(font_size.value, 10);
    var maxW = canvas.width - 100;   // igual que el detalle
    var maxH = 130;                  // hueco entre el titular (730) y el detalle (870)

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

    canvas.add(new fabric.Textbox(titulo, {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: col,
        fontSize: size,
        width: maxW,
        top: 730,
        hasControls: false,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    }));

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
    var size = font_sizeD.value;

    canvas.add(new fabric.Textbox(detail, {
        width: canvas.width - 100,
        fontFamily: 'sans-serif',
        //fontWeight: 'bold',
        fill: col,
        textAlign: 'center',
        fontSize: size,
        top: 870,
        hasControls: false,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    }));


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


// Insertar imagen al canvas
function generate() {
    if (!globalpic) {
        if (window.mostrarAviso) { window.mostrarAviso('Primero carga una imagen'); } else { console.warn('Primero carga una imagen'); }
        return;
    }

    //var shad = sombra.value;
    //var col = color.value;
    // var filter = new fabric.Image.filters.Resize({
    //     blur: shad
    // });

    fabric.Image.fromURL(globalpic, function(oImg) {
        ///oImg.filters.push(filter);
        //oImg.applyFilters();
        var height = oImg.height;
        var width = oImg.width;

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


// codigo vendor

(function() {
    // El pegado de imágenes ahora es global (ver capas.js: paste en document)
    document.addEventListener("keydown", function(event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '46') {
            remover();
        }
    });

})();