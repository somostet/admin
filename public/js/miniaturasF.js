var globalpic;
var oImg;

/* inicio canvas code*/
var canvas = new fabric.Canvas('YouTube');
canvas.setHeight(360);
canvas.setWidth(640);
canvas.setDimensions({width: 1200, height: 675}, {backstoreOnly: true});
canvas.setBackgroundImage('https://t-e-t.github.io/admin/public/img/Plantillas/miniaturaFB.png', canvas.renderAll.bind(canvas), {
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
    ReImg.fromCanvas(document.getElementById('YouTube')).toPng()
    ReImg.fromCanvas(document.getElementById('YouTube')).downloadPng()
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
        
    fabric.Image.fromURL(globalpic, function(oImg) {
        canvas.add(oImg);
        oImg.setShadow({ color: 'rgba(17,17,17,1)', blur: shad});
      });
    
    canvas.add(new fabric.IText(titulo, { 
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textAlign: 'justify-center',
        fill: col,
        fontSize: 72
    }));

    canvas.add(new fabric.Textbox(detail, { 
        width: canvas.width -100,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        fill: col,
        textAlign: 'justify-left',
        fontSize: 32
    }));
}    

function publish(){
    $("#modal").modal("show");
    $("#modal-cuerpo").html(`La imagen ha sido publicada`);
}
