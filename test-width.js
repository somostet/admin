var btnTitulo = document.querySelector("[aria-label=Insertar t\u00edtulo]");
var btnDetalles = document.querySelector("[aria-label=Insertar detalles]");
var w1 = btnTitulo ? Math.round(btnTitulo.getBoundingClientRect().width) : 0;
var w2 = btnDetalles ? Math.round(btnDetalles.getBoundingClientRect().width) : 0;
console.log("w1:", w1, "w2:", w2, "same:", w1 === w2 ? "SI" : "NO");
