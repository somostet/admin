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
/* el ajuste al tamaño de pantalla lo hace shell.js (autoAjustar): este
   listener solo recalculaba hc/wc y nunca los aplicaba al lienzo */

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

/* Cambio de plantilla
   setBackgroundImage es asíncrono: encadenados cada 1,4 s por la rotación
   automática, dos descargas se cruzaban y ganaba la que llegaba antes, dejando
   una plantilla que no era la elegida. Cada cambio saca un tique y solo se
   aplica si sigue siendo el último; además entra en el historial, que antes
   no lo recogía y dejaba deshacer/rehacer desincronizados. */
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
    var section = plantilla.value;

    switch (section) {
        case "0":
            fondoPlantilla('./public/img/Plantillas/mh.png');
            colorF = "rgba(29,221,107)";
            pesoF = "bold";
            alineacion = "justify-left";
            tipoF = "Arial";
            break;
        case "1":
            fondoPlantilla('./public/img/Plantillas/tet2/P_GNU_LINUX.png');
            colorF = "white";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Consolas";
            break;
        case "2":
            fondoPlantilla('./public/img/Plantillas/tet2/P_html.png');
            colorF = "black";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Century Gothic";
            break;
        case "3":
            fondoPlantilla('./public/img/Plantillas/tet2/P_css.png');
            colorF = "black";
            pesoF = "normal";
            alineacion = "center";
            tipoF = "Century Gothic";
            break;
        case "4":
            fondoPlantilla('./public/img/Plantillas/tet2/P_js.png');
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
    if (window.mostrarAviso) { window.mostrarAviso('Imagen descargada', 'success'); }
}

function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}