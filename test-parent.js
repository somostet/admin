(() => {
  const btnTitulo = document.querySelector("[aria-label=Insertar t\u00edtulo]");
  const btnDetalles = document.querySelector("[aria-label=Insertar detalles]");
  const btnCargar = [...document.querySelectorAll("button")].find(b => /Cargar una imagen/.test(b.textContent));
  return JSON.stringify({
    tituloParent: btnTitulo ? btnTitulo.parentElement.tagName + "." + btnTitulo.parentElement.className : "NO",
    detallesParent: btnDetalles ? btnDetalles.parentElement.tagName + "." + btnDetalles.parentElement.className : "NO",
    cargarParent: btnCargar ? btnCargar.parentElement.tagName + "." + btnCargar.parentElement.className : "NO",
  });
})()
