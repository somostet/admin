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
x.addListener(myFunction) // Attach listener function on state changes

/* inicio canvas code*/
var canvas = new fabric.Canvas('code');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/dictec/code.png', canvas.renderAll.bind(canvas), {
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
        cornerSize: 20,
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
        cornerSize: 20,
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
        canvase.renderAll();
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
}

function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}

// Cambio de plantilla
function reload() {
    var section = plantilla.value;

    switch (section) {
        case "0":
            canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/dictec/code.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            break;
        case "1":
            canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/dictec/tech.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            break;
        case "2":
            canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/dictec/game.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            break;
    };

}