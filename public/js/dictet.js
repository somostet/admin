var globalpic;
var oImg;
var hc = 500;
var wc = 500;

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
var canvas = new fabric.Canvas('code');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
canvas.setBackgroundImage('./public/img/dictec/code.png', canvas.renderAll.bind(canvas), {
    width: canvas.width,
    height: canvas.height,

});

/* fin canvas code*/

function generate() {
    var titulo = titular.value;
    var detail = detalles.value;
    var obj = canvas.getActiveObject();
    var size = font_sizeD.value;


    canvas.add(new fabric.IText(titulo, {
        fontFamily: 'Arial Rounded MT',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: 'white',
        fontSize: 72,
        shadow: 'rgba(0,0,0) 2px 2px 2px',
        left: 250,
        top: 250,
        cornerColor: 'white',
        borderColor: 'white',
        transparentCorners: false
    }));

    canvas.add(new fabric.Textbox(detail, {
        width: canvas.width - 350,
        fontFamily: 'Arial Rounded MT',
        fontWeight: 'bold',
        fill: 'white',
        textAlign: 'justify-left',
        fontSize: size,
        shadow: 'rgba(0,0,0) 2px 2px 2px',
        top: 400,
        cornerColor: 'white',
        borderColor: 'white',
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

function center() {
    var obj = canvas.getActiveObject();
    if (obj) {
        obj.centerH();
        canvas.renderAll();
    }
}

function download() {
    canvas.discardActiveObject();
    canvas.renderAll();
    ReImg.fromCanvas(document.getElementById('code')).toPng()
    ReImg.fromCanvas(document.getElementById('code')).downloadPng()
    if (window.mostrarAviso) { window.mostrarAviso('Imagen descargada', 'success'); }
}

function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}

/* Cambio de plantilla
   setBackgroundImage es asíncrono: encadenados cada 1,4 s por la rotación
   automática, dos descargas se cruzaban y ganaba la que llegaba antes, dejando
   una plantilla que no era la elegida. Cada cambio saca un tique y solo se
   aplica si sigue siendo el último; además entra en el historial. */
var tplTicket = 0;
function fondoPlantilla(url) {
    var tq = ++tplTicket;
    canvas.setBackgroundImage(url, function () {
        if (tq !== tplTicket) return;   // llegó una más nueva: esta ya no vale
        canvas.renderAll();
        if (typeof window.tetGuardarEstado === 'function') window.tetGuardarEstado();
    }, { width: canvas.width, height: canvas.height });
}

function reload() {
    switch (plantilla.value) {
        case "0": fondoPlantilla('./public/img/dictec/code.png'); break;
        case "1": fondoPlantilla('./public/img/dictec/tech.png'); break;
        case "2": fondoPlantilla('./public/img/dictec/game.png'); break;
    }
}