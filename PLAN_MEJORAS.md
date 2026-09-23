# Plan de Mejoras — tet admin

Documento con las mejoras pendientes tras la migración a Bootstrap 5.
Orden por prioridad: 🔴 crítico/roto → 🟠 alta → 🟡 media → 🟢 baja.

---

## Estado

| Área | Estado |
|---|---|
| Migración Bootstrap 4 → 5.3.3 | ✅ Completada (commits `fbe3076`…`3797bd3`) |
| Panel de capas + botones de orden | ✅ Completada (`dcec182`) |
| P0 — Bugs visibles | ✅ Completada (`06a93d5`) |
| P1 — Móvil | ✅ Completada (`253e453`) |
| P1 — Seguridad / infra | ✅ Completada (`0eb5dc5`) |
| P2 — UI + capas extendidas | ✅ Completada (`4922297`) + fix `59ca606` |
| P3 — Formatos sociales | ✅ Completada (`a0b89ff`) |
| P4 — Repo y calidad | ✅ Completada |
| Diferidos (pendiente de prueba visual) | 🅿️ Offcanvas, pinch-zoom, navbar, plantilla común |

---

## 🔴 P0 — Bugs visibles / que rompen la experiencia

> ✅ **Completado** (commit `06a93d5`): los 5 puntos resueltos.

1. ~~**Panel "Capas" mal posicionado y recortado**~~ → cabecera **plegable** (accordion) + ancho completo en desktop/móvil; ya no tapa ni se recorta.

2. ~~**`picload()` crashea sin archivo**~~ → guard `if (!file)` antes de acceder, modal inexistente reemplazado por **toast** (`window.mostrarAviso`, creado en `capas.js`, usa BS5 Toast).

3. ~~**`generate()` sin imagen cargada**~~ → guard `if (!globalpic)` + aviso "Primero carga una imagen" en los 4 editores con imagen (main, art, mc, miniaturas).

4. ~~**IDs duplicados `id=button`**~~ → eliminados los 9 (nadie los referenciaba).

5. ~~**Typo `canvase.renderAll()`**~~ → corregido en `dictet.js:77`.

---

## 🟠 P1 — Móvil (uso cómodo desde el celular)

> ✅ **Completado** (commit `253e453`). Punto 7 (offcanvas) **diferido** hasta revisión visual en el navegador.

1. ✅ **Apilar formularios**: columnas principales → `col-12 col-lg-*`; filas internas → `col-sm-*` (apilan por debajo de 576px).
2. ✅ **Barra de herramientas**: etiqueta visible en móvil (`<span class="solo-movil">`) + `aria-label` en todos los botones solo-icono; targets ≥ 44px.
3. ✅ **Sección "Atajos" oculta en móvil** (`.solo-desktop`) y **botón visible de subida** de imagen (label-botón a pantalla completa, abre galería/cámara); `remover()` ya existía.
4. ✅ **iOS**: `font-size: 16px` en inputs/selects para evitar zoom automático.
5. ✅ **Safe-area insets** + meta `theme-color` (#1d2b43) y `viewport-fit=cover` en las 7 páginas.
6. ✅ `matchMedia().addEventListener('change')` en los 6 JS (antes eran 4 con `addListener()` deprecado; `mc.js` y `dictet.js` también).
7. ⏸️ **Offcanvas de formulario** (diferido): requiere prueba visual; el apilado ya hace el editor usable en móvil.

## 🟠 P1 — Seguridad / infraestructura

> ✅ **Completado** (commit `0eb5dc5`).

8. ✅ **`rel="noopener"`** en los enlaces `target="_blank"` (7 páginas).
9. ✅ **Service Worker**: `sw.js` en la **raíz** y registrado en las 7 páginas (el scope `public/` no cubría las páginas).
10. ✅ **Workbox eliminado** → `sw.js` **vanilla** (NetworkFirst html/js, SWR css, CacheFirst imágenes, versionado). Sin CDN de Google en runtime.
11. ✅ **jQuery 3.3.1 → 3.7.1** (CVE-2019-11358, CVE-2020-11022/11023).

---

## 🟡 P2 — UI / look & feel

> ✅ **Completado** (commit `4922297`). Puntos 5, 14 y 15 **diferidos**; el 12 se hizo con archivo `.json` (más portable que localStorage).

1. ✅ **Design tokens**: `:root` con `--tet-nav/-dark/-footer/-bar` y clases `.bg-tet-*` sustituyen los estilos inline ×7.
2. ✅ **Layout editor equilibrado**: `col-12 col-lg-4/8` (form/lienzo) + apilado en móvil sin huecos.
3. ✅ **Botones con etiqueta**: icono + texto visible en móvil (`solo-movil`), `aria-label` siempre.
4. ✅ **Cards de portada** con hover (elevación + transición).
5. ⏸️ **Navbar mejorada** (diferido): requiere diseño visual; la actual funciona.
6. ✅ **Toasts de feedback**: "Imagen descargada" (los 6 editores) + mensajes de `mostrarAviso(msg, tipo)`.
7. ✅ **`:focus-visible`** con contorno visible en todos los controles.
8. ✅ **Footer compacto en móvil**: logo 150px → 84px, sin `<br>` sobrantes.
9. ✅ **Bulma eliminado**: componente `.file` migrado a label-botón BS5 (`.file-name` conservado para `picload()`); vendor `bulma/` borrado.

## 🟡 P2 — UX

10. ✅ **Deshacer/Rehacer**: historial de snapshots (`canvas.toJSON`) en `capas.js`, botones en la toolbar del panel + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (máx. 40 estados).
11. ✅ **Duplicar elemento** (`obj.clone()` + offset) con botón.
12. ✅ **Guardar/Cargar proyecto**: descarga `tet-proyecto.json` y carga por input de archivo (`loadFromJSON`). (No localStorage.)
13. ✅ **Web Share API**: botón "Compartir" (solo si `navigator.share`) → PNG vía `navigator.share({files})`, con fallback a "usar Descargar".
14. ⏸️ **Zoom/pan táctil** (pinch-to-zoom de Fabric) (diferido).
15. ⏸️ **Guía de estado vacío** en el lienzo (diferido).

---

## 🟢 P3 — Nuevas funcionalidades

1. ✅ **Formatos de redes sociales** (commit `a0b89ff`, `public/js/formatos.js`):
   - Panel inyectado en los 6 editores con `<optgroup>` por red:
     | Red | Formato | Px |
     |---|---|---|
     | Instagram | Post / Vertical / Story | 1080×1080 / 1080×1350 / 1080×1920 |
     | Facebook | Post / Cover / Evento | 1200×630 / 820×312 / 1920×1005 |
     | X (Twitter) | Post / Header | 1600×900 / 1500×500 |
     | YouTube | Thumbnail / 2K / Banner (safe area 1546×423) | 1280×720 / 2560×1440 / 2048×1152 |
     | TikTok | Frame | 1080×1920 |
     | LinkedIn / Pinterest | Post / Pin | 1200×627 / 1000×1500 |
   - **Export en px exactos**: canvas offscreen con recorte **cover centrado** (`m = max(W/sw, H/sh)`) desde el backstore → no redimensiona el lienzo ni rompe plantillas. Fichero `tet_<w>x<h>.png`.
   - **Guía de recorte** sobre el lienzo (zona recortada atenuada + etiqueta con px) y **zona segura** cuando el preset la define; conmutable.
2. ⬜ **Textos con borde/sombra** con controles en la UI.
3. ⬜ **Panel de capas extendido**: miniaturas de preview, drag & drop, bloquear capa.
4. ⬜ **Galería de plantillas** con previews generadas.
5. ⬜ **PWA instalable**: icons en `manifest.webmanifest` + apple-touch-icon (revisar).

---

## ⚪ P4 — Repo y calidad

> ✅ **Completado**. Punto 8 **diferido**.

1. ✅ **FontAwesome podado**: solo `css/all.min.css` + `webfonts/` (eliminados `svgs/`, `scss/`, `less/`, `metadata/`, `js/`, `sprites/` y CSS no usados ≈1.650 archivos).
2. ✅ **`vendor/chartjs`** confirmado sin uso → eliminado (junto con `vendor/bulma` y `vendor/canvas to blob js`).
3. ✅ **`README.md`** y **`.gitignore`** añadidos.
4. ✅ **`lang="es"`** en los 7 HTML.
5. ✅ **`<center>`** → `<div class="text-center">` (9 usos en 6 páginas).
6. ✅ **`aria-label`** en botones solo-icono (hecho en P1); `alt` presente en imágenes.
7. ✅ **Código muerto eliminado**: script `#sidebarCollapse` (index), variable `$wrapper` sin uso (4 JS, el manejo Ctrl+Supr sigue vivo) y ~150 líneas comentadas en `main.js`.
8. ⏸️ **Plantilla común** inyectada por JS para navbar/modal/scripts (diferido: toca las 7 páginas y quiere revisión visual).

---

## Orden de ejecución recomendado

1. ✅ **P0** (bugs visibles)
2. ✅ **P1 móvil** + seguridad
3. ✅ **P2 UI/look** (tokens, toolbar con labels, layout)
4. ✅ **P3 formatos de redes**
5. ✅ **P4 repo**

## Diferidos — próximos pasos

- P1.7 offcanvas del formulario en móvil.
- P2.5 rediseño de navbar (brand + menú agrupado).
- P2.14 pinch-zoom/pan en el lienzo.
- P2.15 guía de estado vacío.
- P3.2–P3.4 textos con borde/sombra, capas con preview/lock, galería de plantillas.
- P4.8 plantilla común de HTML.

Todos ellos requieren **prueba visual en el navegador** antes de darlos por buenos.
