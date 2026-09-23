# Plan de Mejoras — tet admin

Documento con las mejoras pendientes tras la migración a Bootstrap 5.
Orden por prioridad: 🔴 crítico/roto → 🟠 alta → 🟡 media → 🟢 baja.

---

## Estado

| Área | Estado |
|---|---|
| Migración Bootstrap 4 → 5.3.3 | ✅ Completada (commits `fbe3076`…`3797bd3`) |
| Panel de capas + botones de orden | ✅ Completada (`dcec182`) |
| Resto de mejoras | ⬜ Pendiente |

---

## 🔴 P0 — Bugs visibles / que rompen la experiencia

> ✅ **Completado** (commit `P0-fixes`): los 5 puntos resueltos.

1. ~~**Panel "Capas" mal posicionado y recortado**~~ → cabecera **plegable** (accordion) + ancho completo en desktop/móvil; ya no tapa ni se recorta.

2. ~~**`picload()` crashea sin archivo**~~ → guard `if (!file)` antes de acceder, modal inexistente reemplazado por **toast** (`window.mostrarAviso`, creado en `capas.js`, usa BS5 Toast).

3. ~~**`generate()` sin imagen cargada**~~ → guard `if (!globalpic)` + aviso "Primero carga una imagen" en los 4 editores con imagen (main, art, mc, miniaturas).

4. ~~**IDs duplicados `id=button`**~~ → eliminados los 9 (nadie los referenciaba).

5. ~~**Typo `canvase.renderAll()`**~~ → corregido en `dictet.js:77`.

---

## 🟠 P1 — Móvil (uso cómodo desde el celular)

1. **Apilar formularios**: filas con `col-8 + col + col` sin breakpoint → usar `col-12 col-sm-*`.
2. **Barra de herramientas**: convertir los botones solo-icono en **botones con texto visible en móvil** (o icono + label), targets ≥ 44px.
3. **Sustituir la sección "Atajos" en móvil**: ocultar `ctrl+v` / `supr` y ofrecer botones reales:
   - "Galería/Cámara" (`<input type="file" accept="image/*" capture="environment">` + drag&drop)
   - "Borrar seleccionado" (ya existe `remover()`).
4. **iOS**: `font-size: 16px` en inputs/selects para evitar zoom automático.
5. **Safe-area insets** para notches; navbar con `theme-color`.
6. Media query moderna: `matchMedia().addEventListener('change')` en lugar de `addListener()` deprecado (4 JS).
7. Rediseño del **layout editor**: formulario colapsable (offcanvas de BS5) + lienzo a pantalla completa en móvil.

## 🟠 P1 — Seguridad / infraestructura

8. **`rel="noopener"` en los 42 enlaces `target="_blank"`**.
9. **Service Worker no funciona**: scope `public/` no cubre las páginas → mover `sw.js` a la raíz y registrar en las 7 páginas.
10. **Workbox 4.3.1 → v7 vendorizado** (hoy depende del CDN de Google en runtime).
11. **jQuery 3.3.1 → 3.7.1** (CVE-2019-11358, CVE-2020-11022/11023).

---

## 🟡 P2 — UI / look & feel

1. **Design tokens**: variables CSS para `#1d2b43`, acentos, radios y sombras; eliminar estilos inline repetidos (`style="background: #1d2b43"` ×7).
2. **Layout editor equilibrado** (visible en la captura): formulario y lienzo en columnas equilibradas (`col-lg-4` / `col-lg-8`), sin huecos muertos.
3. **Botones con etiqueta**: icono + texto en la toolbar del editor; agrupar por función (Insertar / Orden / Descargar).
4. **Cards de portada** con hover, sombra y jerarquía tipográfica.
5. **Navbar mejorada**: brand + menú agrupado (hoy colapsable crudo).
6. **Toasts de feedback**: "Imagen insertada", "PNG descargado" (Bootstrap 5 Toasts).
7. **Estados de foco visibles** (`:focus-visible`) y hover en todos los controles.
8. **Footer compacto en móvil** (logo de 150px come pantalla).
9. Reducir **Bulma + Bootstrap** a un solo framework (migrar componente `.file` de Bulma a input-group de BS5).

## 🟡 P2 — UX

10. **Deshacer/Rehacer** (historial de Fabric: botones undo/redo en la toolbar).
11. **Duplicar elemento** (`obj.clone()`).
12. **Guardar/Cargar proyecto**: `canvas.toJSON()` → localStorage + descarga/carga `.json`.
13. **Web Share API**: compartir PNG directo desde el móvil (`canvas.toBlob` + `navigator.share`, con fallback a descarga).
14. **Zoom/pan táctil** en el lienzo (pinch-to-zoom de Fabric).
15. Guía de estado vacío en el lienzo: "Empieza eligiendo una plantilla".

---

## 🟢 P3 — Nuevas funcionalidades

1. **Formatos de redes sociales** (bloque grande):
   - `public/js/formatos.js` con presets:
     | Red | Formato | Px |
     |---|---|---|
     | Instagram | Post / Vertical / Story | 1080×1080 / 1080×1350 / 1080×1920 |
     | Facebook | Post / Cover / Evento | 1200×630 / 820×312 / 1920×1005 |
     | X (Twitter) | Post / Header | 1600×900 / 1500×500 |
     | YouTube | Thumbnail / Channel art | 1280×720 / 2560×1440 (safe area 1546×423) |
     | TikTok | Frame | 1080×1920 |
     | LinkedIn / Pinterest | Post / Pin | 1200×627 / 1000×1500 |
   - Selector en cada editor que redimensiona el canvas (backstore) sin romper plantillas.
   - **Export en px exactos**: `canvas.toDataURL({ multiplier: anchoDeseado / canvas.width })`.
   - Guía opcional de **zona segura** (stories/channel art) como overlay.
2. **Textos con borde/sombra** con controles en la UI.
3. **Panel de capas extendido**: miniaturas de preview, drag & drop para reordenar, bloquear capa.
4. **Galería de plantillas** con previews generadas.
5. **PWA instalable**: icons en `manifest.webmanifest` + apple-touch-icon.

---

## ⚪ P4 — Repo y calidad

1. **FontAwesome**: eliminar `svgs/`, `scss/`, `less/`, `metadata/`, `js/` → 95% menos archivos (solo `css/all.min.css` + `webfonts/`).
2. Revisar si `vendor/chartjs` se usa → si no, eliminar.
3. Añadir `README.md` y `.gitignore`.
4. `lang="es"` en los 7 HTML (hoy `lang="en"` o sin lang).
5. `<center>` obsoleto → utilidades BS5 (7 usos).
6. `aria-label` en botones solo-icono; `alt` descriptivos en imágenes.
7. Quitar código muerto (~150 líneas comentadas en `main.js`, variables sin uso).
8. Duplicación de navbar/modal/scripts en 7 HTML → plantilla común inyectada por JS.

---

## Orden de ejecución recomendado

1. **P0** (bugs visibles, ~1 sesión)
2. **P1 móvil** + seguridad (paralelo)
3. **P2 UI/look** (tokens, toolbar con labels, layout)
4. **P3 formatos de redes** (bloque grande)
5. **P4 repo** (cuando haya calma)
