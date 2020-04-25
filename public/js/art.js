// Variables globales para la imagen a subir

var globalpic;
var oImg;
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
x.addListener(myFunction) // Attach listener function on state changes
/* inicio canvas code*/
var canvas = new fabric.Canvas('tetnews',{
    preserveObjectStacking: true
});
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1280, height: 720 }, { backstoreOnly: true });

$(".fondocol").change(function(){
    canvas.backgroundColor=color.value;
    canvas.renderAll();
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
document.getElementById('color').oninput = function colored() {
    var color = this.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        var style = {};
        style['fill'] = color;
        obj.setSelectionStyles(style).setCoords();
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
    /*var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    window.location.href=image;  */
    canvas.discardActiveObject();
    canvas.renderAll();
    ReImg.fromCanvas(document.getElementById('tetnews')).toPng()
    ReImg.fromCanvas(document.getElementById('tetnews')).downloadPng()
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
    var preview = document.querySelector('img');
    var file = document.querySelector('input[type=file]').files[0];
    var name = file.name;
    var fileName = document.querySelector('#div-img .file-name');
    var reader = new FileReader();

    reader.onloadend = function() {
        globalpic = reader.result;
    }

    if (file) {
        reader.readAsDataURL(file);
        fileName.textContent = name;
    } else {
        $("#modal").modal("show");
        $("#modal-cuerpo").html("El archivo no es soportado");
    }
}

// Colocar titulo
function set_title() {
    var col = colorT.value;
    var titulo = titular.value;
    var size = font_size.value;

    canvas.add(new fabric.IText(titulo, {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: col,
        fontSize: size,
        top: 360,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    }));

    var canvas_objects = canvas._objects;
    if (canvas_objects.length !== 0) {
        var last = canvas_objects[canvas_objects.length - 1]; //Get last object   
        last.centerH();
        canvas.renderAll();
    }

}


// Insertar imagen al canvas
function generate() {


    var shad = sombra.value;
    //var col = color.value;
    var filter = new fabric.Image.filters.Blur({
         blur: shad
    });

    fabric.Image.fromURL(globalpic, function(oImg) {
        oImg.filters.push(filter);
        oImg.applyFilters();

        oImg.scaleToWidth(canvas.getWidth());
        canvas.add(oImg.set({
            //hasControls: false,
            //lockMovementY: true,
            lockRotation: true,
            top: 93,
            strokeUniform: true
        }));

    });

}

// Layers

function toFullBack(){
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.sendToBack(obj)
        canvas.renderAll();
    }
}

function toBackward(){
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.sendBackwards(obj)
        canvas.renderAll();
    }
}

function toForward(){
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.bringForward(obj)
        canvas.renderAll();
    }
}

function toFront(){
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.bringToFront(obj)
        canvas.renderAll();
    }
}


// codigo vendor

(function() {
    var $wrapper = $('#content'),
        pasteImage = function (e) {
          var items=e.originalEvent.clipboardData.items;

          var shad = sombra.value;
          var filter = new fabric.Image.filters.Blur({
            blur: shad
        });
  
          e.preventDefault();
          e.stopPropagation();
  
          //Loop through files
          for(var i=0;i<items.length;i++){
            if (items[i].type.indexOf('image')== -1) continue;
            var file = items[i],
                type = items[i].type;
            var imageData = file.getAsFile();
            var URLobj = window.URL || window.webkitURL;
            var img = new Image();
            img.src = URLobj.createObjectURL(imageData);
            fabric.Image.fromURL(img.src, function(img){
                img.filters.push(filter);
                img.applyFilters();
                canvas.add(img);
            });
          }
        }
  
    $(window).on('paste', pasteImage);
    $(document).keydown(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '46' || keycode == '8'){
            remover();    
        }
    });

  })();