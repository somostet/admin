// Variables globales para la imagen a subir

var globalpic;
var oImg;
var picPromesa = Promise.resolve();
var picError = null;
var hc = 360;
var wc = 640;

// Metodos de creacion del canvas
function myFunction() {
    if (x.matches) { // If media query matches
        hc = 168;
        wc = 300;
    } else {
        hc = 360;
        wc = 640;
    }

}

var x = window.matchMedia("(max-width: 1000px)")
myFunction(x) // Call listener function at run time
/* el ajuste al tamaño de pantalla lo hace shell.js (autoAjustar): este
   listener solo recalculaba hc/wc y nunca los aplicaba al lienzo */
    /* inicio canvas code*/
var canvas = new fabric.Canvas('tet', {
    preserveObjectStacking: true
});
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1280, height: 720 }, { backstoreOnly: true });
canvas.backgroundColor = document.getElementById('color').value;

var selectorFondo = document.getElementById('color');
selectorFondo.addEventListener('input', function() {
    canvas.backgroundColor = selectorFondo.value;
    canvas.renderAll();
});
selectorFondo.addEventListener('change', function() {
    if (window.tetGuardarEstado) window.tetGuardarEstado();
});

/* fin canvas code*/

// Sombras
document.getElementById('sombra').oninput = function sombrear() {

    var shad = this.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        obj.setShadow({
            color: "#000000",
            blur: shad
        });
    }

    canvas.renderAll();
}




// Color texto en tiempo real
document.getElementById('colorT').oninput = function colored() {
    var color = this.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        if (obj.type === 'i-text' && obj.isEditing && obj.selectionStart !== obj.selectionEnd) {
            obj.setSelectionStyles({ fill: color }, obj.selectionStart, obj.selectionEnd);
        } else {
            obj.set('fill', color);
        }
        obj.setCoords();
    }

    canvas.renderAll();
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
    ReImg.fromCanvas(document.getElementById('tet')).toPng()
    ReImg.fromCanvas(document.getElementById('tet')).downloadPng()
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

    picError = null;
    picPromesa = new Promise(function(resolve) {
        reader.onload = function() {
            globalpic = reader.result;
            resolve(globalpic);
        };
        reader.onerror = function() {
            picError = reader.error || new Error('No se pudo leer la imagen');
            if (window.mostrarAviso) window.mostrarAviso('No se pudo leer la imagen seleccionada', 'danger');
            console.warn('tet: no se pudo leer la imagen', picError);
            resolve(null);
        };
    });
    reader.readAsDataURL(file);
    fileName.textContent = file.name;
    return picPromesa;
}

// Colocar titulo
function set_title() {
    var col = colorT.value;
    var titulo = titular.value;
    var size = font_size.value;

    if (!titulo.trim()) {
        if (window.mostrarAviso) window.mostrarAviso('Escribe un título primero', 'warning');
        return;
    }

    var obj = new fabric.IText(titulo, {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: col,
        fontSize: size,
        top: 360,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockUniScaling: false,
        cornerColor: 'black',
        borderColor: 'black',
        transparentCorners: false
    });
    obj.centerH();
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();

}

function set_detail() {
    var detalle = document.getElementById('detalles').value.trim();
    if (!detalle) {
        if (window.mostrarAviso) window.mostrarAviso('Escribe los detalles primero', 'warning');
        return;
    }

    var obj = new fabric.Textbox(detalle, {
        width: canvas.getWidth() - 96,
        left: 48,
        top: 480,
        fontFamily: 'sans-serif',
        fontSize: parseInt(document.getElementById('font_sizeD').value, 10) || 40,
        fill: document.getElementById('colorT').value,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockUniScaling: false,
        lockRotation: true,
        splitByGrapheme: false,
        cornerColor: 'black',
        borderColor: 'black',
        transparentCorners: false
    });
    obj.tetZona = 'miniatura-detalle';
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
}

function objetoMiniatura(zona) {
    var objetos = canvas.getObjects();
    for (var i = objetos.length - 1; i >= 0; i--) {
        if (objetos[i].tetZona === zona) return objetos[i];
    }
    return null;
}

function ajustarTextoMiniatura(obj, texto, opciones) {
    obj.set(opciones);
    obj.set({ text: texto });
    if (obj.initDimensions) obj.initDimensions();
    obj.setCoords();
    return obj;
}

function cargarFotoParaComponer() {
    if (!globalpic) return Promise.resolve(null);
    return new Promise(function(resolve, reject) {
        var imagen = new Image();
        imagen.onload = function() { resolve(new fabric.Image(imagen)); };
        imagen.onerror = function() { reject(new Error('No se pudo decodificar la imagen')); };
        imagen.src = globalpic;
    });
}

function componerMiniatura(foto) {
    var titulo = titular.value.trim();
    var detalle = document.getElementById('detalles').value.trim();
    var W = canvas.getWidth(), H = canvas.getHeight();
    var margen = Math.round(W * 0.045);
    var anchoTexto = W - margen * 2;
    var zonaTitulo = 'miniatura-titulo';
    var zonaDetalle = 'miniatura-detalle';
    var tituloObj = objetoMiniatura(zonaTitulo);
    var detalleObj = objetoMiniatura(zonaDetalle);
    var colorTexto = document.getElementById('colorT').value;
    var estilosBase = {
        left: margen,
        width: anchoTexto,
        fontFamily: 'sans-serif',
        fill: colorTexto,
        textAlign: 'left',
        fontWeight: 'bold',
        lineHeight: 1.05,
        padding: 14,
        backgroundColor: 'rgba(255,255,255,0.88)',
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockUniScaling: false,
        lockRotation: true,
        selectable: true,
        evented: true
    };

    if (titulo) {
        var opTitulo = Object.assign({}, estilosBase, {
            fontSize: Math.min(parseInt(document.getElementById('font_size').value, 10) || 72, 96)
        });
        if (!tituloObj) {
            tituloObj = new fabric.Textbox(titulo, opTitulo);
            tituloObj.tetZona = zonaTitulo;
        } else {
            ajustarTextoMiniatura(tituloObj, titulo, opTitulo);
        }
    }

    if (detalle) {
        var opDetalle = Object.assign({}, estilosBase, {
            fontWeight: 'normal',
            fontSize: parseInt(document.getElementById('font_sizeD').value, 10) || 40
        });
        if (!detalleObj) {
            detalleObj = new fabric.Textbox(detalle, opDetalle);
            detalleObj.tetZona = zonaDetalle;
        } else {
            ajustarTextoMiniatura(detalleObj, detalle, opDetalle);
        }
    }

    var altoMaximo = Math.round(H * 0.58);
    while (tituloObj && detalleObj &&
        tituloObj.height + detalleObj.height + 16 > altoMaximo &&
        tituloObj.fontSize > 30) {
        tituloObj.set('fontSize', tituloObj.fontSize - 2);
        tituloObj.initDimensions();
    }
    while (tituloObj && detalleObj &&
        tituloObj.height + detalleObj.height + 16 > altoMaximo &&
        detalleObj.fontSize > 22) {
        detalleObj.set('fontSize', detalleObj.fontSize - 2);
        detalleObj.initDimensions();
    }

    var base = H - margen;
    if (detalleObj) {
        detalleObj.set({ left: margen, top: base - detalleObj.height });
        detalleObj.setCoords();
        base = detalleObj.top - 16;
    }
    if (tituloObj) {
        tituloObj.set({ left: margen, top: Math.max(margen, base - tituloObj.height) });
        tituloObj.setCoords();
    }

    if (foto) {
        var escalaFoto = Math.max(W / foto.width, H / foto.height);
        canvas.getObjects().slice().forEach(function(obj) {
            if (obj.tetAutoImagen && obj !== foto) canvas.remove(obj);
        });
        foto.set({
            scaleX: escalaFoto,
            scaleY: escalaFoto,
            left: (W - foto.width * escalaFoto) / 2,
            top: (H - foto.height * escalaFoto) / 2,
            tetAutoImagen: true,
            lockMovementX: false,
            lockMovementY: false,
            lockScalingX: false,
            lockScalingY: false,
            lockUniScaling: false,
            lockRotation: true,
            selectable: true,
            evented: true
        });
        if (!foto.canvas) canvas.add(foto);
        canvas.sendToBack(foto);
    }
    if (tituloObj && !tituloObj.canvas) canvas.add(tituloObj);
    if (detalleObj && !detalleObj.canvas) canvas.add(detalleObj);
    if (tituloObj) canvas.bringToFront(tituloObj);
    if (detalleObj) canvas.bringToFront(detalleObj);

    var activo = detalleObj || tituloObj || foto;
    if (activo) canvas.setActiveObject(activo);
    canvas.renderAll();
}

function tetComponerMiniatura() {
    var titulo = titular.value.trim();
    var detalle = document.getElementById('detalles').value.trim();
    var boton = document.getElementById('btn-auto-miniatura');
    var fotoActual = canvas.getObjects().filter(function(obj) { return obj.type === 'image'; }).pop() || null;

    if (!titulo && !detalle && !globalpic && !fotoActual) {
        if (window.mostrarAviso) window.mostrarAviso('Escribe un título, añade detalles o carga una imagen', 'warning');
        return Promise.resolve(false);
    }

    boton.disabled = true;
    var fotoLista = picPromesa.then(function() {
        if (picError) throw picError;
        return cargarFotoParaComponer();
    }).then(function(fotoNueva) {
        return fotoNueva || fotoActual;
    });
    return fotoLista.then(function(foto) {
        var aplicar = function() { componerMiniatura(foto); };
        if (window.tetHistorialBloque) window.tetHistorialBloque(aplicar);
        else {
            aplicar();
            if (window.tetGuardarEstado) window.tetGuardarEstado();
        }
        if (window.mostrarAviso) window.mostrarAviso('Miniatura compuesta · Ctrl+Z deshace', 'success');
        return true;
    }).catch(function(err) {
        console.warn('tet: no se pudo componer la miniatura', err);
        if (window.mostrarAviso) window.mostrarAviso('No se pudo componer la miniatura', 'danger');
        return false;
    }).then(function(resultado) {
        boton.disabled = false;
        return resultado;
    });
}


// Insertar imagen al canvas
function generate() {
    if (!globalpic) {
        if (window.mostrarAviso) { window.mostrarAviso('Primero carga una imagen'); } else { console.warn('Primero carga una imagen'); }
        return;
    }

    var shad = sombra.value;
    //var col = color.value;
    var filter = new fabric.Image.filters.Blur({
        blur: shad
    });



    fabric.Image.fromURL(globalpic, function(oImg) {
        oImg.filters.push(filter);
        oImg.applyFilters();

        /* contain con margen y centrada; nunca por encima del nativo */
        if (window.ajustarImagenAlLienzo) window.ajustarImagenAlLienzo(oImg);
        canvas.add(oImg.set({
            lockRotation: true,
            lockMovementX: false,
            lockMovementY: false,
            lockScalingX: false,
            lockScalingY: false,
            lockUniScaling: false,
            strokeUniform: true
        }));
        canvas.setActiveObject(oImg);
        canvas.renderAll();

    });

}

// Layers

function toFullBack() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.sendToBack(obj)
        canvas.renderAll();
    }
}

function toBackward() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.sendBackwards(obj)
        canvas.renderAll();
    }
}

function toForward() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.bringForward(obj)
        canvas.renderAll();
    }
}

function toFront() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.bringToFront(obj)
        canvas.renderAll();
    }
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