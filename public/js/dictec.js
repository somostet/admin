function copiar() {
    var texto = document.querySelector('#texto');
    var rango = document.createRange();
    rango.selectNode(texto);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(rango);
    var successful = document.execCommand('copy');
    window.getSelection().removeAllRanges();

};


