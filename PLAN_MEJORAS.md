# Plan de Mejoras — tet admin

Documento con las mejoras pendientes tras la migración a Bootstrap 5.
Orden por prioridad: 🔴 crítico/roto → 🟠 alta → 🟡 media → 🟢 baja.

---

## Estado

| Área | Estado |
|---|---|
| Migración Bootstrap 4 → 5.3.3 | ✅ Completada (commits `fbe3076`…`3797bd3`); vendor actualizado a 5.3.8 en el lote S4 de seguridad |
| Panel de capas + botones de orden | ✅ Completada (`dcec182`) |
| P0 — Bugs visibles | ✅ Completada (`06a93d5`) |
| P1 — Móvil | ✅ Completada (`253e453`) |
| P1 — Seguridad / infra | ✅ Completada (`0eb5dc5`) |
| P2 — UI + capas extendidas | ✅ Completada (`4922297`) + fix `59ca606` |
| P3 — Formatos sociales | ✅ Completada (`a0b89ff`) |
| P4 — Repo y calidad | ✅ Completada |
| UI estilo Inkscape | ✅ En los 6 editores (`32f238e`, `da1b520` piloto tet1; `bf68993`–`e685bba` fixes y rollout): barra superior, rail, reglas, dock Propiedades|Capas, paleta en dock, colores arriba, atajos en chips, tema oscuro/claro |
| Lote fixes UI tet1 | ✅ Completada (`bf68993` lienzo que llena el viewport y scrollea desde el borde, `f1f15b4` colores arriba: paleta bajo las pestañas del dock y fondo/texto al inicio de Propiedades, `e38b592` atajos en chips modernos + selector de color cuadrado) |
| UX 2026 — chrome, portapapeles, formato arriba, navbar ▶ | ✅ Completada (`6bd2f45`, `9fe8fbb`, `da1b520`, `c467604`) |
| Diferidos (pendiente de prueba visual) | 🅿️ Offcanvas, plantilla común, catálogo de elementos |
| Seguridad | 📋 Plan propio en [`PLAN_SEGURIDAD.md`](PLAN_SEGURIDAD.md) (S1 quitar jQuery · S2 CSP · S3 validar .json · S4 deps · S5 higiene) · **S1–S5 ✅ Hechos** (`ef790f0`, `2ecdd54`, `0f0d9d6`, `d53a510`, `b15bf6d`) |
| Lote D — GIF (`gif.html`) | 🔨 **D1 imágenes→GIF ✅** · D2 vídeo→GIF ⬜ · D3 grabar lienzo ⬜ |
| Lote E — Vídeo (`video.html`) | 🔨 **E1 imágenes→vídeo ✅** · E3 subir/recortar ⬜ **adelantado tras F3** · E2 grabar en directo ⬜ **al final** |
| Lote F — Enriquecimientos vídeo | 🔨 **F1 duración objetivo ✅ · F2 transiciones ✅ · F3 fondo blur ✅** · orden: E3 → F4 → F5 → F6 → F8 → F7 → E2 |

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

> ✅ **Completado** (commit `4922297`). Punto 15 **diferido**; el 12 se hizo con archivo `.json` (más portable que localStorage).

1. ✅ **Design tokens**: `:root` con `--tet-nav/-dark/-footer/-bar` y clases `.bg-tet-*` sustituyen los estilos inline ×7.
2. ✅ **Layout editor equilibrado**: `col-12 col-lg-4/8` (form/lienzo) + apilado en móvil sin huecos.
3. ✅ **Botones con etiqueta**: icono + texto visible en móvil (`solo-movil`), `aria-label` siempre.
4. ✅ **Cards de portada** con hover (elevación + transición).
5. ✅ **Navbar rediseñada**: barra única sin hamburguesa en las 7 páginas — marca (logo + tet admin + canvas de acento) · desplegable «Crear ▾» con nombres por función (Noticias, Textos, Diccionario, Arte, Miniaturas, Creaciones — el subtitulo conserva la identidad «tet N») y el editor activo resaltado (`aria-current`) · redes siempre visibles · selector de plantilla con ▶/⏸ en tet1. El bloque collapse de 4 columnas se eliminó (su contenido vive en footer/redes). Footer en 4 columnas con copyright 2026 y columna «Crear». El tema oscuro/claro pasó al footer de tet1. Falta replicar el selector al resto al aprobar la shell.
6. ✅ **Toasts de feedback**: "Imagen descargada" (los 6 editores) + mensajes de `mostrarAviso(msg, tipo)`.
7. ✅ **`:focus-visible`** con contorno visible en todos los controles.
8. ✅ **Footer compacto en móvil**: logo 150px → 84px, sin `<br>` sobrantes.
9. ✅ **Bulma eliminado**: componente `.file` migrado a label-botón BS5 (`.file-name` conservado para `picload()`); vendor `bulma/` borrado.

## 🟡 P2 — UX

10. ✅ **Deshacer/Rehacer**: historial de snapshots (`canvas.toJSON`) en `capas.js`, botones en la toolbar del panel + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (máx. 40 estados).
11. ✅ **Duplicar elemento** (`obj.clone()` + offset) con botón.
12. ✅ **Guardar/Cargar proyecto**: descarga `tet-proyecto.json` y carga por input de archivo (`loadFromJSON`). (No localStorage.)
13. ✅ **Web Share API**: botón "Compartir" (solo si `navigator.share`) → PNG vía `navigator.share({files})`, con fallback a "usar Descargar".
14. ✅ **Zoom táctil y ajuste** (commit `d862f76`): pinch de dos dedos interceptado en fase de captura (mientras hay dos dedos Fabric no recibe eventos, así no arrastra objetos y su transformación a medias se cancela al soltar), zoom en **valor libre** 0.25–4× con el % siempre visible, botón **Ajustar a pantalla** que encaja el lienzo completo en el área disponible y ± que siguen saltando por niveles.
15. ⏸️ **Guía de estado vacío** en el lienzo (diferido).
16. ✅ **Barra de acciones bajo el lienzo** (commit `90d4803`, reposicionada después): con selección activa aparece una franja **en el flujo justo debajo del canvas** — subir/bajar capa, duplicar, reducir/agrandar, recortar, llenar/ajustar y eliminar — con botones de 44 px; nunca se superpone al área de trabajo (en escritorio ocupa una fila propia de la rejilla del escenario y en móvil queda tras el lienzo, scrolleable horizontalmente si no caben los 9 botones) y con recortar/llenar/ajustar solo visibles sobre imágenes.
17. ✅ **Recorte libre de imágenes** (commit `ddbde2c`): marco punteado del tamaño de la imagen, movable y escalable con asas grandes (clavado dentro de la imagen al arrastrar); **Aplicar** recorta con `cropX/cropY` + `width/height` sin redecodificar el origen (calidad intacta y re-recortable); cancelable con Escape, toque fuera o cambio de selección; el marco lleva `excludeFromExport` así que no aparece en capas, historial ni `.json`, y deshacer/rehacer quedan bloqueados con aviso mientras se recorta.

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
   - Preset **Origen** (tamaño original del lienzo, por defecto) y bloque de formato integrado en la **barra superior** de la shell (tet1), con botón de descarga compacto.
2. ⬜ **Textos con borde/sombra** con controles en la UI.
3. ⬜ **Panel de capas extendido**: miniaturas de preview, drag & drop, bloquear capa.
4. ⬜ **Galería de plantillas** con previews generadas.
5. ⬜ **PWA instalable**: icons en `manifest.webmanifest` + apple-touch-icon (revisar).

---

## 🟢 Lote D — Creador de GIF (`gif.html`) 🆕

Nuevo editor para crear GIFs animados, 3 modos (alcance decidido el 27/09/2026).
Un commit por modo.

**Motor (común a los 3): `gifenc` vendorizado** en `public/vendor/gifenc/`
(MIT, **cero dependencias**, codificación **síncrona sin Web Workers** →
funciona igual en doble clic `file://` y en GitHub Pages; el `dist/gifenc.js`
de npm es CommonJS sin `require()`, así que se envuelve en IIFE y se usa como
`<script>` clásico).

- **D1 · Varias imágenes → GIF ✅** (validado en Chrome: subida múltiple, tira
  con ↑↓/duplicar/quitar, presets desde `TET_FORMATOS`, codificación por lotes
  con progreso, GIF que decodifica y consola limpia; `gifenc` envuelto en IIFE
  en `public/vendor/gifenc/gifenc.js`): input múltiple, tira de fotogramas con
  reordenar (↑↓)/duplicar/borrar (botones de 44 px como la barra de acciones),
  preset de tamaño (los presets sociales + Origen), delay por fotograma y
  bucle; previsualización ciclando y botón **Crear GIF** con progreso →
  descarga `tet.gif`. Toces de fotogramas/px con aviso y codificación por
  lotes (`setTimeout`) para no congelar la UI en el móvil.
- **D2 · Vídeo existente → GIF**: input mp4/webm con `<video>` de preview,
  recorte de rango (inicio/fin) y fps → fotogramas extraídos con
  `currentTime` + `drawImage` → misma tubería de D1.
- **D3 · Grabar el lienzo → GIF**: lienzo fabric en la propia página (con la
  rotación de plantillas de la shell) + duración/fps → captura de fotogramas
  del canvas → misma tubería.

**Validación**: abrir el `.gif` resultante en Chrome y móvil, doble clic
`file://`, barrido HTTP 200.

## 🟢 Lote E — Creador de vídeo (`video.html`) 🆕

Nuevo editor para crear vídeos, 3 modos (mismo día/lote D, después del GIF).

- **E1 · Imágenes → vídeo ✅** (validado en Chrome: 2 imágenes × 1 s → MP4
  de 640×360 que decodifica con duración 2,01 s, autodetección MP4→WebM,
  barra de grabación + cancelar, consola limpia y `media-src blob:` para
  previsualizar el resultado): slideshow con duración por imagen →
  `canvas.captureStream()` + **`MediaRecorder`** (autodetección:
  `video/mp4;codecs=avc1…` en Chrome reciente e iOS, si no
  `video/webm;codecs=vp9`, y `video/webm` de última instancia) → descarga
  `tet.mp4|webm`. Presets sociales de salida.
- **E2 · Grabar el lienzo en directo** *(al final)*: botón Grabar/Parar sobre
  el lienzo de la página (plantillas rotando o edición) → misma tubería.
- **E3 · Subir vídeo y editarlo** *(adelantado tras F3)*: recorte inicio/fin —
  se reproduce el rango seleccionado mientras se regraba compuesto en el canvas
  → salida limpia. Es la puerta de entrada para clips de X/YouTube/etc. que
  tengas como archivo (descarga, hoja de compartir o grabación de pantalla del
  móvil); «pegar enlace» no es viable en una web estática (streams firmados +
  CORS + ToS), se documenta en el plan.

Notas: CSP + `referrer` iguales que en las 7 páginas, enlaces en el menú
**Crear**, sin dependencias de red en runtime; si `MediaRecorder` no existe
(navegador antiguo) → aviso y modo deshabilitado.

---

## 🟢 Lote F — Enriquecimientos de vídeo (`video.html`) 🆕

Funciones elegidas el 27/09/2026 (incluye «textos y animaciones», petición
propia). Un commit por función.

**Orden acordado** (elección del usuario el 27/09: adelantar E3 + añadir F8):
**F3 → E3 → F4 → F5 → F6 → F8 → F7 → E2**. La lista de abajo va por número:

- **F1 · Duración objetivo ✅** (validado en Chrome: el valor se convierte al
  cambiar de modo —3 s × 2 → 6 s totales y al revés—, el reparto se recalcula
  solo al añadir/quitar imágenes, límites 0,5–30 / 1–120, el tope de 2 minutos
  y el mínimo de 0,1 s por imagen deshabilitan con aviso, y grabar 3 s en modo
  total dio un MP4 de 3,01 s; consola con 0 mensajes): al lado de «segundos por
  imagen» aparece el modo *por imagen* o *total del vídeo* (p. ej. 15 s de
  Reel) → reparte solo y el texto de duración lo explica. Sigue con el tope
  de 2 minutos.
- **F2 · Transiciones ✅** (validado en Chrome midiendo los píxeles del lienzo
  fotograma a fotograma: fundido lineal de 400 ms entre 1000 y 1400 ms —p=0,25
  → 0,49 → 0,74→ 0,99—, corte seco con 0 muestras mezcladas, deslizar con la
  derecha cambiando en 1073 ms y la izquierda en 1340 ms (pareja roja/azul
  detectada), Ken Burns moviendo el borde con el zoom del 8%, grabación de
  2 s → MP4 de 2,02 s y consola con 0 mensajes): fundido cruzado, deslizar y
  zoom Ken Burns entre imágenes (40% del tiempo de cada imagen, suelo 150 ms,
  techo 800 ms), **iguales en vista previa y grabación** — la vista previa
  pasó de `setInterval` a un bucle `requestAnimationFrame` contra el mismo
  reloj (`dibujarEn`) que usa la grabación.
- **F3 · Fondo desenfocado ✅** (validado en Chrome midiendo píxeles en un
  vertical 1080×1920 con foto de marco blanco: en «contener» la esquina sigue
  siendo el color de fondo, en «blur» la esquina pasa a ser el cover de la
  propia imagen, el borde blanco/verde sale mezclado —154/151/148/145, lo nítido
  daría 255 o 46—, el centro sigue nítido, grabación → MP4 0,98 s de
  1080×1920 y consola con 0 mensajes): opción «contener con fondo desenfocado»
  para verticales 9:16 con foto horizontal —la imagen en cover con
  `ctx.filter: blur()` (radio ≈ lado/20, con un 15% de sobredimensión para que
  el halo caiga fuera del lienzo) bajo la capa nítida—; el desenfoque también
  funde durante las transiciones y **fallback a color si `ctx.filter` no existe**
  (Safari < 17.4: aviso al seleccionarlo). Nueva opción en `Ajuste de cada
  imagen`; `video.js` con `?v=f3`.
- **F4 · Logotipo y texto superpuestos**: logo PNG + línea de título con
  posición (esquinas/abajo-centro) durante todo el vídeo.
- **F5 · Textos y animaciones** (petición del usuario): entradas animadas del
  texto de F4 (aparecer, deslizar, escribir) con su duración.
- **F6 · Música de fondo**: audio subido → Web Audio → pista mezclada en el
  MP4/WebM (loop si es más corto); prueba obligatoria en iOS.
- **F7 · Compartir**: botón «Compartir» con Web Share API (archivos), igual
  que el de `capas.js`.
- **F8 · Grabar pestaña** (nuevo, solo ordenador): botón con `getDisplayMedia`
  que graba la pestaña donde se reproduce un vídeo de X/YouTube/etc. (con audio
  de pestaña en Chrome) como fuente más; si el navegador no lo soporta (móvil)
  el botón no aparece. Va tras F6 porque reutiliza su mezcla de audio.

Validación de cada uno: E2E en Chrome + consola limpia + barrido 200. **E3**
queda justo después de F3 y **E2** cierra el bloque.

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

- ~~**UI estilo Inkscape**~~ → ✅ shell (`shell.js` + `shell.css`) extendida a los 6
  editores (commit `b948e2d`) + atajos en chips (`e685bba`); pendiente solo de tu
  prueba visual.
- **Catálogo de elementos** (nuevo): biblioteca de formas, iconos, marcos y plantillas base
  para componer imágenes — siguiente bloque grande tras validar la UI.
- P1.7 offcanvas del formulario en móvil.
- P2.15 guía de estado vacío.
- **Lote S — seguridad** (quitar jQuery, CSP, validar `.json`): ver [`PLAN_SEGURIDAD.md`](PLAN_SEGURIDAD.md).
- P3.2–P3.4 textos con borde/sombra, capas con preview/lock, galería de plantillas.
- P4.8 plantilla común de HTML.

Todos ellos requieren **prueba visual en el navegador** antes de darlos por buenos.
