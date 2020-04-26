// Variables globales para la imagen a subir

var globalpic;
var oImg;
var hc = 500;
var wc = 500;

// Barras superiores de cada plantilla
var tetnews_bar = "https://somostet.github.io/admin/public/img/bars/tetnews.png";
var curi_bar = "https://somostet.github.io/admin/public/img/bars/somostetCuri.png"


// Coloca la barra superior, recibe URL de la imagen de la barra y COLOR del fondo
function set_front_bar(over,color){
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
x.addListener(myFunction) // Attach listener function on state changes
/* inicio canvas code*/
var canvas = new fabric.Canvas('tetnews');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/Plantilla3.png', canvas.renderAll.bind(canvas), {
    width: canvas.width,
    height: canvas.height
});
set_front_bar(tetnews_bar,"#FFFFFF");
/* fin canvas code*/

// Cambio de plantilla
function reload() {
    var section = plantilla.value;
    var col = color.value;

    switch (section) {
        case "0":   
                    canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/Plantilla3.png', canvas.renderAll.bind(canvas), {
                    width: canvas.width,
                    height: canvas.height
                });
                    set_front_bar(tetnews_bar,"#FFFFFF");
                break;
        case "1":   canvas.backgroundColor=col;
                    canvas.setBackgroundImage(curi_bar, canvas.renderAll.bind(canvas), {
                    width: canvas.width,
                    height: canvas.height,
                    opacity: 0
                });
                    set_front_bar(curi_bar,col);
                break;
        case "2": break;
    };
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
        last.lockMovementX=true;
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
        last.lockMovementX=true;
        //last.lockMovementY=true;
        last.lockRotation = true;
        canvase.renderAll();
    }

}


// Insertar imagen al canvas
function generate() {


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
        //oImg.set('padding', 20);
        //oImg.scaleToWidth(1200);

        /*if (height >= 600 && width >= 1200) {
            canvas.add(oImg.set({
                //width: canvas.width,
                height: 600,
                hasControls: false,
                //scaleX:1,
                //scaleY:1,
                //strokeUniform: true,
                //lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                top: 93
            }));
        } else if (height < 600 && width >= 1200) {
            oImg.scaleToHeight(600);

            canvas.add(oImg.set({
                height: 600,
                hasControls: false,
                lockMovementY: true,
                lockRotation: true,
                top: 93
            }));
        } else if (height >= 600 && width < 1200) {
            oImg.scaleToWidth(canvas.getWidth());

            canvas.add(oImg.set({
                height: 600,
                hasControls: false,
                lockMovementY: true,
                lockRotation: true,
                top: 93
            }));
        } else {
            oImg.scaleToWidth(canvas.getWidth());

            canvas.add(oImg.set({
                hasControls: false,
                lockMovementY: true,
                lockRotation: true,
                top: 93
            }));
        }*/

        oImg.scaleToWidth(canvas.getWidth());
        canvas.add(oImg.set({
            //hasControls: false,
            //lockMovementY: true,
            lockRotation: true,
            top: 93
        }));

    });

}


// codigo vendor

(function() {
    var $wrapper = $('#content'),
        pasteImage = function (e) {
          var items=e.originalEvent.clipboardData.items;

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