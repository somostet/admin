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

/* inicio canvas game*/
var canvas = new fabric.Canvas('game');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/dictec/game.png', canvas.renderAll.bind(canvas), {
    width: canvas.width,
    height: canvas.height,

});

/* fin canvas code*/

function generate() {
    var titulo = titular.value;
    var detail = detalles.value;


    canvas.add(new fabric.IText(titulo, {
        fontFamily: 'Arial Rounded MT',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: 'white',
        fontSize: 72,
        shadow: 'rgba(0,0,0) 2px 2px 2px',
        left: 200,
        top: 200,
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
        fontSize: 32,
        shadow: 'rgba(0,0,0) 2px 2px 2px',
        left: 200,
        top: 400,
        cornerColor: 'white',
        cornerSize: 20,
        borderColor: 'white',
        transparentCorners: false
    }));
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
    ReImg.fromCanvas(document.getElementById('game')).toPng()
    ReImg.fromCanvas(document.getElementById('game')).downloadPng()
}

function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}