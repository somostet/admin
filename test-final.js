(() => {
  const f = document.querySelector("iframe");
  const d = f.contentDocument, w = f.contentWindow;
  const q = s => d.querySelector(s);
  if (!q(".shell-rail")) return "cargando";
  const med = e => { const b = e.getBoundingClientRect(); return Math.round(b.width)+"x"+Math.round(b.height); };
  const btnTitulo = d.querySelector("[aria-label=Insertar t\u00edtulo]");
  const btnDetalles = d.querySelector("[aria-label=Insertar detalles]");
  const btnCargar = [...d.querySelectorAll("button")].find(b => /Cargar una imagen/.test(b.textContent));
  const btnCompartir = [...d.querySelectorAll("button")].find(b => /Compartir/.test(b.getAttribute("aria-label")||""));
  const pub = q(".dock-pane[data-pane=pub]");
  const pestanaPub = [...d.querySelectorAll(".dock-tab")].find(t => t.textContent.includes("Publicación"));
  const inTags = q("#pub-hashtags");
  return JSON.stringify({
    botones: {
      titulo: btnTitulo ? med(btnTitulo) : "NO",
      detalles: btnDetalles ? med(btnDetalles) : "NO",
      cargar: btnCargar ? med(btnCargar) : "NO",
      compartir: btnCompartir ? med(btnCompartir) : "NO"
    },
    hashtags: { panelVisible: pub ? pub.getBoundingClientRect().height > 0 : "NO", inputVisible: inTags ? inTags.getBoundingClientRect().width > 0 : "NO" },
    overflow: d.documentElement.scrollWidth - d.documentElement.clientWidth
  }, null, 1);
})()
