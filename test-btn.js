(() => {
  const btnTitulo = document.querySelector('[aria-label="Insertar t\u00edtulo"]');
  const btnDetalles = document.querySelector('[aria-label="Insertar detalles"]');
  const btnCargar = [...document.querySelectorAll("button")].find(b => /Cargar una imagen/.test(b.textContent));
  const med = function(e) { const b = e.getBoundingClientRect(); return Math.round(b.width)+"x"+Math.round(b.height); };
  return JSON.stringify({
    botones: {
      titulo: btnTitulo ? med(btnTitulo) : "NO",
      detalles: btnDetalles ? med(btnDetalles) : "NO",
      cargar: btnCargar ? med(btnCargar) : "NO"
    }
  });
})()
