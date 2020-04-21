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
var canvas = new fabric.Canvas('tetnews');
canvas.setHeight(hc);
canvas.setWidth(wc);
canvas.setDimensions({ width: 1200, height: 1200 }, { backstoreOnly: true });
canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/Plantilla3.png', canvas.renderAll.bind(canvas), {
    width: canvas.width,
    height: canvas.height
});
/* fin canvas code*/

// document.getElementById('sombra').oninput = function sombrear() {
//     var shad = this.value;
//     var obj = canvas.getActiveObject();
//     if (obj) {
//         obj.setShadow({
//             color: "#000000",
//             blur: shad
//         });
//     }

//     canvas.renderAll();
// }

// document.getElementById('color').oninput = function colored() {
//     var color = this.value;
//     var obj = canvas.getActiveObject();
//     if (obj) {
//         var style = {};
//         style['fill'] = color;
//         obj.setSelectionStyles(style).setCoords();
//         /*obj.set({
//             fill: color
//         });*/
//     }

//     canvas.renderAll();
// }

function reload() {
    var section = plantilla.value;
    var col = color.value;

    switch (section) {
        case "0":   
                    canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/Plantilla3.png', canvas.renderAll.bind(canvas), {
                    width: canvas.width,
                    height: canvas.height
                });
                break;
        case "1":   canvas.backgroundColor=col;
                    canvas.setBackgroundImage('https://somostet.github.io/admin/public/img/bars/somostetCuri.png', canvas.renderAll.bind(canvas), {
                    width: canvas.width,
                    height: canvas.height
                });
                break;
        case "2": break;
    };




}

function center() {
    var obj = canvas.getActiveObject();
    if (obj) {
        obj.centerH();
        canvas.renderAll();
    }
}

function download() {
    /*var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    window.location.href=image;  */
    canvas.discardActiveObject();
    canvas.renderAll();
    ReImg.fromCanvas(document.getElementById('tetnews')).toPng()
    ReImg.fromCanvas(document.getElementById('tetnews')).downloadPng()
}

function remover() {
    var obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }
}

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

function set_title() {
    var col = colorT.value;
    var titulo = titular.value;
    var size = font_size.value;
    var obj = canvas.getActiveObject();
    if (obj) {
        obj.centerH();
        canvas.renderAll();
    }

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
        canvase.renderAll();
    }

}

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

        if (height >= 600 && width >= 1200) {
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
        }

    });

}