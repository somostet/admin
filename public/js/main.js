var globalpic;
var oImg;
var hc =500;
var wc =500;

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
canvas.setDimensions({width: 1200, height: 1200}, {backstoreOnly: true});
canvas.setBackgroundImage('https://t-e-t.github.io/admin/public/img/Plantilla.png', canvas.renderAll.bind(canvas), {
  width: canvas.width,
  height: canvas.height
});
/* fin canvas code*/

document.getElementById('sombra').oninput = function sombrear(){
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

document.getElementById('color').oninput = function colored(){
    var color = this.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        var style = { };
        style['fill'] = color;
        obj.setSelectionStyles(style).setCoords();
        /*obj.set({
            fill: color
        });*/
    }

    canvas.renderAll();
}

function center (){
    var obj = canvas.getActiveObject();
    if (obj){
        obj.centerH();
        canvas.renderAll();
    }
}

function download (){
    /*var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    window.location.href=image;  */
    canvas.discardActiveObject();
    canvas.renderAll(); 
    ReImg.fromCanvas(document.getElementById('tetnews')).toPng()
    ReImg.fromCanvas(document.getElementById('tetnews')).downloadPng()
}

function remover (){
    var obj = canvas.getActiveObject();
    if (obj){
        canvas.remove(obj);
        canvas.renderAll();
    }
}

function picload(){
    var preview = document.querySelector('img');
    var file    = document.querySelector('input[type=file]').files[0];
    var reader  = new FileReader();

    reader.onloadend = function () {
        globalpic = reader.result;
    }

    if (file) {
        reader.readAsDataURL(file);
    } else {
        $("#modal").modal("show");
        $("#modal-cuerpo").html(`El archivo no es soportado`);
    }
}

function generate(){
    var titulo = titular.value;
    var detail = detalles.value;
    var shad = sombra.value;
    var col = color.value;
    var filter = new fabric.Image.filters.Blur({
        blur: shad
      });

    fabric.Image.fromURL(globalpic, function(oImg) {
        oImg.filters.push(filter);
        oImg.applyFilters();
        oImg.set('padding', 20);
        canvas.add(oImg);
      });
    
    canvas.add(new fabric.IText(titulo, { 
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'justify-center',
        fill: col,
        fontSize: 72,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    }));

    canvas.add(new fabric.Textbox(detail, { 
        width: canvas.width -100,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        fill: col,
        textAlign: 'justify-left',
        fontSize: 32,
        cornerColor: 'black',
        cornerSize: 20,
        borderColor: 'black',
        transparentCorners: false
    }));
}    

function publish(){
    $("#modal").modal("show");
    $("#modal-cuerpo").html(`La imagen ha sido publicada`);
}
