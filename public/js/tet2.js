var globalpic;
var oImg;
var hc = 500;
var wc = 500;

var colorF = "#000";
var pesoF = "bold";
var alineacion = "center";
var tipoF = "sans-serif";


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
var canvas = new fabric.Canvas('mh');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
canvas.setBackgroundImage('./public/img/Plantillas/mh.png', canvas.renderAll.bind(canvas), {
    width: canvas.width,
    height: canvas.height,

});
colorF = "rgba(29,221,107)";
pesoF = "bold";
alineacion = "justify-left";
tipoF = "Arial";

/* fin canvas mh*/

// Cambio de plantilla
function reload() {
    var section = plantilla.value;

    switch (section) {
        case "0":
            canvas.setBackgroundImage('./public/img/Plantillas/mh.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });

            colorF = "rgba(29,221,107)";
            pesoF = "bold";
            alineacion = "justify-left";
            tipoF = "Arial";
            break;
        case "1":
            canvas.setBackgroundImage('./public/img/Plantillas/tet2/P_GNU_LINUX.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            colorF = "white";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Consolas";
            break;
        case "2":
            canvas.setBackgroundImage('./public/img/Plantillas/tet2/P_html.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            colorF = "black";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Century Gothic";
            break;
        case "3":
            canvas.setBackgroundImage('./public/img/Plantillas/tet2/P_css.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            colorF = "black";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Century Gothic";
            break;
        case "4":
            canvas.setBackgroundImage('./public/img/Plantillas/tet2/P_js.png', canvas.renderAll.bind(canvas), {
                width: canvas.width,
                height: canvas.height
            });
            colorF = "black";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Century Gothic";
            break;
    };
}

function generate() {
    var detail = detalles.value;
    canvas.add(new fabric.Textbox(detail, {
        width: canvas.width - 350,
        fontFamily: tipoF,
        fontWeight: pesoF,
        fill: colorF,
        textAlign: alineacion,
        fontSize: font_size.value,
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
    ReImg.fromCanvas(document.getElementById('mh')).toPng()
    ReImg.fromCanvas(document.getElementById('mh')).downloadPng()
}

function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}