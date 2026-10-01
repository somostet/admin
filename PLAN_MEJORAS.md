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
| Lote E — Vídeo (`video.html`) | 🔨 **E1 imágenes→vídeo ✅ · E3 subir/recortar ✅ · E2 grabar en directo ✅ · E4 duración hasta 5 min ✅ · E5 varios vídeos (montaje) ✅ · E5b recorte por clip ✅** |
| Lote F — Enriquecimientos vídeo | 🔨 **F1 duración objetivo ✅ · F2 transiciones ✅ · F3 fondo blur ✅ · F4 logo y título ✅ · F5 animaciones ✅ · F5b título arrastrable ✅ · F5d plantilla Tet News ✅ · F5e lista de textos ✅ · F5f riel con cabezal ✅ · F6 música ✅ · F8 grabar pestaña ✅ · F7 compartir ✅ · F9 color y tipografía de los textos ✅ · F10 compartir y descarga en el móvil ✅** |
| Lote N — Textos y noticias ágiles | ✅ **N1 motor de texto (salto de líneas, ajuste y zona) · N2 tipos de texto y «Añadir título» · N3a centrado blindado · N3b reparto de textos · N4 centrado por ejes del contenido · N5 centrado por ejes de los textos** |
| Lote P — Interfaz amigable y rápida | 🔨 **P1a barra de acción pegajosa ✅ · P1b duplicar texto ✅ · P1c quitar con deshacer ✅ · P1d feedback («✓ guardado», táctil y vibración) ✅ · P2 barra flotante sobre el texto ✅ · P3 pestañas del formulario ✅ · P4 deshacer/rehacer ✅ · P5 vista previa en reposo ✅ · P6 barra de texto fuera del lienzo ✅** |
| Lote M — Móvil en vídeo (`video.html`) | 🔨 **M1 lienzo táctil y controles junto al lienzo ✅ · M2 manipulación estilo tet1 ✅ · M3 el resultado no se pierde (IndexedDB) ✅ · M4 peso y grabación estable ✅** |

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
- **E2 · Grabar el lienzo en directo ✅** (validado en Chrome: **57
  comprobaciones** en tres tandas —estado inicial con el marcador oculto sin
  soporte y deshabilitado sin contenido, par Grabar/Parar que muta en el
  propio botón con reloj `Detener (0:07)`, bloqueo de «Crear vídeo» durante
  la grabación, resultado `tet.mp4` con clip de **2,71 s** para 2,7 s de
  grabación, música F6 mezclada —28 KB con audio frente a 3 KB sin—, rama de
  vídeo con `dibujarFrame` (1,88 s), regresiones de E1 (cancelar), F8 y F7,
  consola 0 y barrido 14/14): botón Grabar/Parar **bajo el lienzo** (los
  manijas de M1/M2 conservan zona de toque libre) que graba lo que el lienzo
  muestra —plantilla rotando o edición en directo— hasta pulsar Detener,
  con el tiempo en el botón y tope de 2 minutos → misma tubería que E1
  (`captureStream` + `MediaRecorder` con autodetección MP4→WebM), música en
  bucle y el sonido del vídeo fuente en modo vídeo. *Lección:* el lienzo
  hay que **repintar cada fotograma** (como hace E1) —si solo se redibuja
  al cambiar de imagen, `captureStream` deja de emitir y el clip sale
  corto: se detiene la previa y el tick del directo bombea el dibujo.
- **E3 · Subir vídeo y editarlo ✅** (validado en Chrome: carga de MP4 y de webm
  con duración ilegible en la cabecera —el típico de `MediaRecorder`— vía
  búsqueda al final, recorte 1,0–2,5 s → MP4 de 640×360 de 1,5 s exactos con
  pista de audio y los dos bordes verificados por píxeles, cancelar a mitad de
  grabación y vuelta al modo imágenes, consola limpia y barrido 13/13): recorte
  inicio/fin sobre un **riel tipo editor** (filmstrip del original con
  miniaturas de un `<video>` oculto —no mueve el cabezal del reproductor—,
  tiradores de inicio/fin y cabezal arrastrables con puntero o flechas del
  teclado, fuera de rango atenuado y scroll vertical del móvil intacto sobre
  el riel); el riel se validó con 9/9 etapas —miniaturas, posiciones, arrastre
  del tirador, cabezal con píxel verificado, teclado y una grabación de
  control de 0,5 s— + consola limpia + barrido 13/13. Se reproduce el rango
  seleccionado mientras se regraba compuesto en el canvas → salida limpia. El sonido original viaja por Web Audio (pista
  añadida al grabador; con audio se elige `avc3` porque Chrome avisa de que
  «avc1» no debe cambiar la descripción del códec durante la grabación y él
  mismo recomienda avc3). Es la puerta de entrada para clips de X/YouTube/etc.
  que tengas como archivo (descarga, hoja de compartir o grabación de pantalla
  del móvil); «pegar enlace» no es viable en una web estática (streams firmados
  + CORS + ToS), se documenta en el plan. Fix posterior (commit aparte): al
  cargar un MP4 la vista previa se quedaba en el color de fondo —Chrome no
  decodifica el primer fotograma hasta el primer «buscar» y la ruta webm ya
  lo hacía—; `listo()` fuerza un buscar a 0.
- **E4 · Duración hasta 5 minutos ✅** (feedback del usuario: «no puedo subir
  un vídeo de más de 2 minutos»; preguntado sobre la duración que necesita,
  respondió **5 minutos**). `MAX_TOTAL_SEG` 120 → **300**, con `MINUTOS_MAX`
  derivado para los avisos; el tope de captura de pestaña pasa a compartir la
  misma constante (`MAX_PESTANA_SEG = MAX_TOTAL_SEG`). Todos los textos de
  tope leen la constante: recorte (`Máximo 5 minutos por grabación en tiempo
  real`), totales de imágenes, aviso al pulsar Crear, título y avisos del
  directo y el de la captura; los `max` de los tiempos de texto en el HTML
  pasan de 120 a 300. Y el cambio de UX clave: al cargar un vídeo **largo**,
  «fin» arranca ya en los primeros 5 minutos —antes era duración completa y
  «Crear vídeo» salía deshabilitado con «Máximo 2 minutos» sin explicación—,
  con el aviso «Vídeo de 600 s: por defecto recortamos los primeros 5 minutos;
  mueve «fin» para elegir otra parte»; «fin» sigue pudiendo llegar hasta el
  final del archivo para elegir cualquier ventana de hasta 5 min dentro del
  vídeo (el validador avisa si excedes). Fix posterior (**E4b**, commit
  aparte): los topes en JS de `inicio`/`dur` de los textos seguían clavados en
  120 → ahora `MAX_TOTAL_SEG` (`?v=e4b`); validado con 4 comprobaciones (250 s
  se mantiene en los dos campos y la lista refleja 250–500 s) + consola 0 +
  barrido 14/14. E2E **20 comprobaciones**: A imágenes
  (8 — topes de texto a 300, duración total a 300, aviso «máximo 5 minutos»
  con 400 s y Crear deshabilitado/habilitado según el caso), B vídeo «largo»
  de 600 s (9 — recorte por defecto 300 s con máximo 600, duración leída,
  aviso de recarga, Crear habilitado, título del directo «máx. 5 min»,
  recorte de 400 s → «Máximo 5 minutos por grabación en tiempo real» y botón
  bloqueado) y 3 de regresión (E1 sigue creando el vídeo con el tope nuevo);
  consola 0, barrido 14/14, `node --check` OK; `?v=e4` en `video.html`.
  *Dato de futuro test:* la duración real de un vídeo no se puede alargar en
  un test —se parchea `duration` en la instancia de `#vid-fuente` antes de
  cargar el archivo— y el aviso vive 4,5 s: hay que comprobarlo dentro del
  mismo script que dispara la carga.
- **E5 · Varios vídeos en cola (montaje) ✅** (último pendiente del bloque
  móvil; preguntado sobre «varios vídeos» el usuario respondió **Ambas**: poder
  elegir varios de una vez Y montarlos secuencialmente en un solo vídeo). El
  selector acepta ya `multiple` y **todos los archivos entran en cola** —se
  añaden a la existente, igual que las imágenes—; cada clip lleva `nombre`,
  `url` y `dur`, leídas una a una con un `<video>` temporal (`duraDe()`, con
  la misma danza del webm de MediaRecorder que usaba la carga directa: buscar
  al final para que el navegador calcule la duración). Con **1 clip nada
  cambia** (recorte de E3 tal cual); con **≥2 clips** aparece la fila
  «Cola de vídeos» con una fila por clip —toca para previsualizarlo, ↑↓ para
  reordenar, × para quitar—, cambia la etiqueta del reproductor a «Vídeo
  activo» y **se ocultan el riel de recorte y «Poner aquí»** *(E5b: vuelven,
  ahora sobre el clip activo —ver abajo—)*, porque inicio y
  fin pasan a valer sobre el **montaje completo**: `durVideo` es la suma y la
  ventana por defecto es 0…min(total, 300 s) —se recalcula con cada cambio de
  la cola, con el aviso de E4 si suma más de 5 min («Los vídeos suman…»)—. El
  render (`crearVideoRecorte`) ahora calcula un **plan de segmentos**
  (`segmentosDeMontaje`): un tramo por clip dentro de la ventana; al llegar
  al final de uno se cambia la fuente (`preparaSeg`, esperando a
  `loadedmetadata`+`seeked`) mientras el tick **congela el lienzo en el último
  fotograma** —sin destello del color de fondo—, y el progreso/los textos
  (F5) cuentan sobre el montaje gracias a `desfaseActivo` (duración acumulada
  del clip activo, también al reordenar); `limpiar()` devuelve el reproductor
  al clip resaltado tras grabar, fallar o cancelar. «Quitar vídeo» quita el
  clip activo y al quitar el último se vacía todo; la captura de pestaña (F8)
  se **añade a la cola** en lugar de sustituirla. E2E **57 comprobaciones** en
  4 etapas: A carga de 2 clips (27 — cola/riel/etiquetas según el número de
  clips, activar la fila 2 muestra el clip azul por píxeles, reordenar y
  quitar vuelve al layout de E3 con aviso), B render de 1 clip (9 — duración
  1,13 s ≈ 1,2 y frame azul: regresión del camino E3 por el nuevo plan de
  segmentos), C append + montaje (12 — el clip azul se conserva al añadir
  otro, duración del resultado 2,399 s ≈ badge 2,4, **inicio azul y final
  rojo**: el orden se respeta) y D cancelar en mitad (9 — UI limpia, cola
  intacta, «Grabación cancelada»); consola 0, barrido 14/14, `node --check`
  OK; `?v=e5` en `video.html`. *Dato de futuro test:* los avisos de
  éxito/cancelación se leen tras esperar a que el resultado aparezca (los
  toasts viven 4,5 s y pueden apilarse con el de wakeLock) y **durante** el
  render «Crear vídeo» está deshabilitado —es el indicador correcto de que
  arrancó—.
- **E5b · Recorte por clip ✅** (siguiente paso tras F10, elegido por el
  usuario). Cada clip de la cola pasa a guardar su propio recorte —`{nombre,
  url, dur, ini, fin}`, por defecto 0…min(dur, 300 s)— y riel, «Poner aquí»,
  cabezal y miniaturas actúan **sobre el clip activo** (la fila resaltada de
  la cola), con el badge «Recortando «nombre» · clip i de n»: cambiar de clip
  conserva el recorte de los demás (`ponRecorte` es el único escritor y
  `recorteDeInputs` lo vuelca al clip activo). El plan de segmentos usa ya el
  recorte de cada clip y la suma (`totalRecorte`) es lo que miden el badge, el
  resumen —«Salida de X s (origen Y s)», solo si hay recorte— y la barra de
  progreso; cada fila de la cola muestra «recortado / duración total». Durante
  la grabación los inputs de recorte quedan inertes y `limpiar()` restaura el
  clip que estaba activo. E2E en **5 etapas**: UI con 2 clips y badge/etiquetas,
  recortar A 0,4–1,0 (fila «0,6 / 1,2 s», badge 1,6 s, resumen con origen),
  cambiar de clip sin perder recortes, reordenar (el badge sigue al activo),
  inputs/botón inertes y cancelación —más el **render real**: duración 1,66 s
  ≈ plan 1,6 (sin recorte serían 2,3), azul desde 0,75 s —la cabeza roja
  recortada no aparece—, nombre `tet-…mp4`, etiqueta MP4 y restauración de
  inputs/clip tras grabar—; consola 0, barrido 14/14, `node --check` OK;
  `?v=e5b` en `video.html`. *Dato de futuro test:* el render va con
  `requestAnimationFrame` —si el navegador oculta la pestaña, rAF se para
  pero el grabador sigue: la salida sale larga, con el lienzo congelado y el
  primer fotograma negro (artefacto del entorno, no de la app); en pruebas
  automatizadas hay que forzar visibilidad o bombear rAF con timers—.

Notas: CSP + `referrer` iguales que en las 7 páginas, enlaces en el menú
**Crear**, sin dependencias de red en runtime; si `MediaRecorder` no existe
(navegador antiguo) → aviso y modo deshabilitado.

---

## 🟢 Lote F — Enriquecimientos de vídeo (`video.html`) 🆕

Funciones elegidas el 27/09/2026 (incluye «textos y animaciones», petición
propia). Un commit por función.

**Orden acordado** (elección del usuario el 27/09: adelantar E3 + añadir F8;
el 28/09, tras el feedback del usuario sobre las plantillas, F5 se extiende
con F5d/F5e/F5f antes del audio):
**F3 ✅ → E3 ✅ → F4 ✅ → F5 ✅ → F5d ✅ → F5e ✅ → F5f ✅ → F6 ✅ → F8 ✅ → F7 ✅ → E2 ✅**. La lista de abajo va por número:

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
- **F4 · Logotipo y texto superpuestos ✅** (validado en Chrome: E2E 14/14
  etapas —logo en las 5 posiciones verificado por píxeles, texto blanco
  contado en su banda y encendido/apagado en vivo, MP4 de 1 s con ambas
  superposiciones comprobadas píxel a píxel, modo vídeo y «quitar logo»—,
  consola 0 y barrido 13/13): logo PNG (con miniatura sobre damero de
  transparencia y botón «Quitar logo») + línea de título con posición
  (esquinas/abajo-centro) durante todo el vídeo; cada elemento con su
  posición y su tamaño en % del alto (el texto va en negrita con sombra y
  se encoge si no cabe). Se dibuja al final de cada fotograma —tanto en
  imágenes como en vídeo—, por encima de las transiciones y en la
  grabación; `video.js` con `?v=f4`.
- **F5 · Textos y animaciones** (petición del usuario) ✅: entradas animadas
  del texto de F4 —aparecer (fundido), deslizar y escribir (máquina de
  escribir)— con duración configurable (0,2–5 s). El reloj se cuenta desde el
  inicio de la salida: en vídeo, desde el inicio del recorte; la vista previa
  de una sola imagen también anima y la entrada entra en el fotograma
  grabado; `video.js` con `?v=f5`.
- **F5b · Título arrastrable** (extra del usuario) ✅: posición «personalizada»
  que mueve el texto con ratón o dedo desde una manija que cubre solo su caja
  (con `touch-action:none`, así el resto del lienzo sigue moviendo la página
  en móvil). El centro se guarda en fracciones del lienzo —al cambiar de
  tamaño de salida el título queda en su sitio— y el texto nunca sale del
  lienzo; `?v=f5b` en `video.html`, `video.js` y `video.css`.
- **F5c → F5d · Plantilla Tet News** (extra del usuario) ✅: el usuario pidió
  sustituir el select de 9 plantillas por **una única plantilla que replica el
  canvas de noticias** (`tet1.html`): interruptor «Tet News (noticias)» que
  dibuja la barra `bars/tetnews.png` (1200×93 escalada al ancho) arriba y deja
  el cuerpo de color (blanco por defecto). El vídeo/imagen vive **dentro del
  cuerpo**: contain automático y centrado (como el canvas de imágenes),
  **movible arrastrando** una manija cian sobre su caja (`touch-action:none`),
  **ajustable** con el deslizador «Tamaño del contenido (%)» (30–300) y
  **«Centrar contenido»** vuelve al automático; el dibujo se recorta al cuerpo
  —la barra nunca queda tapada— y todo entra en imágenes, vídeo y grabación.
  Al activarla, si el ajuste era «cubrir» cambia a «contener». En `file://`
  la barra se sirve como data URL (`plantillas-data.js`, verificado 21 claves
  incluida la barra); `video.js` y `video.css` con `?v=f5d`.
- **F5e · Lista de textos** ✅ (petición del usuario, antes del audio):
  sustituye «Línea de título» por una lista de textos (título, descripción…
  los que quieras) con filas de 44 px —nombre, ventana temporal y botones
  subir/bajar/quitar— y panel de edición del seleccionado: contenido,
  posición (presets + personalizada), tamaño, **animación de entrada
  (fundido/deslizar/escribir) y animación de salida (fundido/deslizar, nueva)**,
  «Aparece en (s)» y «Dura (s)» (0 = hasta el final). Cada texto se dibuja
  solo dentro de su ventana, con entrada y salida combinadas (el fundido de
  salida multiplica la alfa de entrada), y entra/sale por su propio borde. La
  manija F5b mueve el texto seleccionado —arrastrar ⇒ posición personalizada—
  y solo aparece mientras el texto se dibuja; al vaciar la lista se ocultan
  editor y manija. E2E 36 comprobaciones (9 configuración/etiquetas/preview,
  11 muestreo del MP4 en 6 instantes con la salida al 50 % ≈ punto medio,
  8 manija+arrastre, 8 acciones de lista), consola 0, barrido 13/13;
  `?v=f5e` en `video.html`, `video.js` y `video.css`.
- **F5f · Riel de textos con cabezal** ✅ (petición del usuario, «como en los
  editores de vídeo»): bloque «Línea de tiempo» bajo la vista previa (oculto
  sin contenido) con una **barra por texto** —el cuerpo arrastra el inicio
  (con «dur = 0» el fin queda clavado al final), el tirador izquierdo recorta
  el inicio con el fin fijo y el derecho estira la duración (arrancar un
  «dur = 0» la fija explícita)—, clic sobre la barra ⇒ selección sincronizada
  con lista y editor, y **teclado** (flechas ±0,1 s, mayús ±1 s) que además
  sincroniza los inputs. **Regla** con marcas proporcionales al total (imágenes
  o recorte de vídeo) y **cabezal con chip de tiempo**: al arrastrarlo la vista
  previa se pausa y muestra ese instante —fotograma en imágenes, `seek` en
  vídeo, reanudando después el estado de reproducción previo—, y al soltar el
  bucle continúa **desde el cabezal**; mientras reproduce, el cabezal lo sigue
  (y se recoloca con `actualizaCrear` cuando cambia el total). E2E 27
  comprobaciones (9 estructura/arrastres/tiradores/teclado, 9 scrub en
  imágenes con pausa y reaparición del texto, 9 en vídeo con webm
  sintetizado de 4 s), consola 0, barrido 13/13; `?v=f5f` en `video.html`,
  `video.js` y `video.css`.
- **F6 · Música de fondo ✅** (bloque «Música de fondo (opcional)»: archivo
  `audio/*`, fila con `nombre · duración`, deslizador de volumen 0–100 % con
  etiqueta en vivo y papelera). El archivo se decodifica al elegirlo
  (`decodeAudioData` con guardia anti-doble llamada y promesa de respaldo para
  Safari); `preparaMusica(segTotal)` crea por cada grabación una fuente de
  buffer (de un solo uso) con **loop si dura menos que la salida**, `gain` con
  el volumen (también se puede mover en vivo) y salida **solo al `audioDest`
  del grabador** (no suena en la previa ni en los altavoces). Comparte
  AudioContext con el recorte: `conectarAudio` refactorizado para crear
  `fuenteAudio` una sola vez aunque el ctx exista ya por la música. La música
  arranca tras `rec.start` en `crearVideo` y en `arrancar()` del recorte, y se
  corta en `limpiar()` (fin, fallo o cancelación) y en los fallbacks video-only
  (`elegirMime(hay) || elegirMime(false)` en ambas rutas). E2E **16
  comprobaciones**: fase A imágenes (10 — fila oculta de entrada, WAV
  decodificado `tono.wav · 0:02`, volumen 100 %, stream con 1 pista y mime
  `avc3…mp4a`, contenedor `soun`+`mp4a`, resultado ~2 s `readyState` 4, quitar
  música, y control sin música: 0 pistas, `avc1` sin marcas, 1,96 s) y fase B
  recorte (6 — webm sintetizado sin audio propio, recorte 1,5 s con música
  `tono2.wav`, 1 pista, contenedor con audio, 1,51 s); consola 0, barrido 13/13,
  `node --check` OK; `?v=f6` en `video.html`, `video.js` y `video.css`.
  *Dato de futuros tests:* la CSP `connect-src 'self'` (S2) bloquea
  `fetch(blob:)`; el análisis de los resultados se hace parcheando
  `MediaRecorder` y leyendo los chunks con `Blob.arrayBuffer()` (en memoria,
  sin red). **Prueba en iOS pendiente (obligatoria).**
- **M1 · Controles del lienzo en móvil ✅** (peticiones del usuario: «mejora los
  controles del video en el canvas porque es difícil manejarlo desde móvil» y
  «cuesta ver los botones para agrandar el video y ponerlo en el centro»).
  Cuatro mejoras: (1) **toque–selección**: cada texto guarda su caja en el
  último fotograma (`cajasTextos`) y un toque sobre el lienzo —con 14 px de
  tolerancia— selecciona el texto de debajo sin ir a buscarlo a la lista (en
  zona vacía no cambia la selección); (2) **arrastre directo con ratón** desde
  el propio lienzo con el mismo motor que la manija (`arrastraTextoA`, con el
  seguimiento del puntero en `window`); en táctil el arrastre directo queda
  excluido a propósito para no robar el scroll vertical de la página; (3)
  **manijas con zona de toque ≥ 44 px**: el pseudo-elemento `::before` se
  ensancha con `--zona` (hasta 32 px por lado) sin agrandar el recuadro
  visible, y con Tet News activo la manija del contenido deja pasar los textos
  —si hay uno encima manda el texto: el dedo lo selecciona y el ratón lo
  arrastra— en lugar de robarles el toque (cubre casi todo el lienzo); (4)
  **controles del contenido junto al lienzo**: «Tamaño del contenido», la
  lectura en vivo del % y «Centrar contenido» pasan de lo alto del formulario a
  una barra justo debajo de la vista previa (visible solo con Tet News; mismos
  ids, sin cambios en la lógica), con `touch-action: manipulation` en el lienzo
  y una pista de uso bajo la previa. E2E **21 comprobaciones** (selección por
  toque y en zona vacía, arrastre con ratón, táctil sin arrastre, zona ≥ 44 px,
  `touch-action` sin regresiones, barra oculta/visible y posterior al lienzo,
  lectura del %, centrar, textos sobre el contenido con ratón y dedo,
  regresión del arrastre de contenido); consola 0, barrido 14/14,
  `node --check` OK; `?v=m1` en `video.html`, `video.js` y `video.css`.
- **M2 · Manipulación del contenido estilo tet1 ✅** (petición del usuario:
  «mejora la manipulación del vídeo como las imágenes del canvas de tet1…
  porque se mueve extraño»). Cinco mejoras: (1) **arrastre con delta** en textos
  y contenido: agarras donde tocas y va contigo (el origen es el centro
  *dibujado*, no `t.x/t.y` de la plantilla, que provocaba un salto al primer
  agarre); (2) **4 asas circulares gordas** en la esquina de la manija del
  contenido, estilo tet1 (círculo blanco, borde azul 3 px entero —Chrome
  redondea los subpíxeles—, 26 px y 34 px con puntero grueso, zona `::before`
  ≥ 44 px), que escalan de 30 % a 300 % en pasos de 5 % con **la esquina
  opuesta clavada**, sincronizadas con el deslizador y la lectura; (3) **borde
  azul sólido 2 px** en la manija del contenido; (4) atajos **«Llenar»** y
  **«Ajustar»** con estado resaltado en la barra junto al lienzo; (5) fix del
  salto de página: al tocar lienzo/manijas se suelta el campo con foco
  (si no, el navegador «revela» el textarea fuera de pantalla y tira de la
  página hacia el formulario en mitad del arrastre —parte de lo raro—; de paso
  cierra el teclado al tocar en móvil). E2E **20 comprobaciones** (delta de
  texto y contenido, asas con esquina opuesta clavada al crecer y encoger,
  lectura/escala sincronizadas, bordes y zonas táctiles, «Llenar»/«Ajustar»,
  página quieta con el campo enfocado, regresiones M1 de toque y dedo);
  consola 0, barrido 14/14, `node --check` OK; `?v=m2b` en `video.html`.
  *Dato de futuro test:* Bootstrap trae `scroll-behavior: smooth` en `:root`,
  así que todo scroll programático se anima —los tests deben medir con
  `behavior: 'instant'` o esperar a que se asiente.
- **M3 · El resultado no se pierde y se guarda ✅** (feedback del usuario desde
  el móvil: «la descarga del vídeo no funciona, no se guarda en el celular y lo
  pierdo» y «cuando dura el video bastante demora y se pierde el video en
  celular y debo reiniciar»). Dos problemas distintos: el blob del resultado
  solo vivía en la pestaña —si Chrome mataba la pestaña (frecuente en el móvil
  con grabaciones largas) se perdía para siempre— y en el móvil no quedaba
  claro dónde acaba el archivo. Tres mejoras: (1) **persistencia en IndexedDB**:
  tras cada grabación (crear, directo y recorte) el último resultado se guarda
  con `put(…, 'ultimo')` en la base `tet-video` y, al volver a abrir la
  página, `recuperaUltimo()` lo restaura —blob, nombre, texto de KB y
  previsualización— con el aviso «Recuperamos «tet.mp4»: seguía guardado en
  este equipo», **sin scroll automático** al abrir (`sinScroll`); (2) **pista de
  guardado** en el bloque de resultado («Se guarda en «Descargas»; en el móvil,
  si no aparece, usa «Compartir vídeo»»); (3) **botón «Descartar este vídeo»**
  (≥ 44 px) que oculta el bloque, vacía la previsualización (`src` + `load()`),
  revoca la URL y borra el registro. De paso, el tramo común de los tres
  `onstop` quedó unificado en `muestraResultado(blob, tipo)` —antes estaba
  triplicado—, que pinta, baja al bloque y persiste. Todo con `try/catch`:
  sin IndexedDB (`file://`, modo privado) la app sigue igual que siempre.
  E2E **27 comprobaciones** en 4 etapas: A grabación (12 — IDB borrada de
  partida, bloque oculto, imagen, directo ~1,6 s, resultado `tet.mp4` con KB y
  blobs, registro IDB con tamaño/nombre/tipo), B recarga (8 — restauración,
  aviso «Recuperamos», nombre/href/KB/blob nuevos, compartir oculto sin Web
  Share, descartar visible), C descartar (4 — bloque oculto, aviso, `src`
  limpio, registro borrado) y D recarga tras descartar (3 — no vuelve nada);
  consola 0, barrido 14/14, `node --check` OK; `?v=m3` en `video.html`.
- **M4 · Peso del archivo y grabación estable ✅** (feedback del usuario desde
  el móvil: «el peso del video es mucho» y «cuando dura el video bastante
  demora y se pierde el video en celular y debo reiniciar»). Dos mejoras:
  (1) **bitrate por fórmula y selector «Calidad del vídeo»** nuevo junto a
  Fondo —Ligiana (0,03 bits/píxel), Equilibrada (0,06, por defecto) y Alta
  (0,1)— en lugar de los **8 Mbps fijos** que traían los tres grabadores; la
  tasa sale de `bitrateSalida(w, h, fps)` = píxeles × fotogramas × calidad con
  suelo de 400 kbps (un minuto de 1080p a Equilibrada pasa de ~60 MB a ~16 MB;
  la captura de pestaña F8, que iba a los defectos del navegador, ahora
  también respeta la calidad con las dimensiones de `getSettings()`); (2)
  **`navigator.wakeLock`**: `pantallaDespierta(true)` se pide en los cuatro
  puntos de arranque (crear, directo, recorte y captura de pestaña) y se
  libera en `limpiar()` y `finCaptura()` —con reaprovechamiento en
  `visibilitychange`, porque el navegador suelta el lock al ocultar la pestaña—;
  si la API no existe o el permiso falla, aviso «No se pudo mantener la
  pantalla encendida…» y la app sigue. El check de blob vacío ya existía
  (`La grabación salió vacía`). E2E **21 comprobaciones** en tres etapas:
  A calidad (14 — selector con sus 3 opciones y valor por defecto, tasas
  exactas para las tres calidades a 64², donde manda el suelo, y a 1080²:
  1 049 760 / 2 099 520 / 3 499 200 bits, con regresión del resultado M3),
  B wake lock (7 — API presente, `request` parcheado, pedido al empezar,
  liberado al terminar y sin aviso de fallo) y validación final (consola 0,
  barrido 14/14, `node --check` OK); `?v=m4` en `video.html`. *Dato de futuro
  test:* el espía de `MediaRecorder` debe copiar los estáticos
  (`isTypeSupported`) si no, `elegirMime()` revienta; y para probar las tasas
  hace falta fijar el tamaño de salida (con «orig» y una imagen de 64 px el
  lienzo baja a 64² y todo cae al suelo de 400 kbps).
- **F7 · Compartir ✅**: botón «Compartir vídeo» con Web Share API (archivos),
  igual que el de `capas.js`: el blob del último resultado viaja como `File`
  (nombre `tet.mp4`/`tet.webm`, el mismo que usa Descargar) a la hoja de
  compartir del sistema —WhatsApp, Telegram, guardar en archivos…—. El botón
  solo aparece si el navegador acepta archivos en `navigator.share` (móvil y
  escritorio reciente); sin soporte, o si algo falla, se avisa para usar el
  «Descargar vídeo» de al lado, y cancelar la hoja (AbortError) es silencio.
  Los dos botones del resultado llevan `min-height:44px` (`vid-cargar`) para
  el dedo. Ojo: el navegador de pruebas (Electron) no trae Web Share, así que
  el E2E comprueba que el botón queda **oculto sin soporte** y stuba
  `share`+`canShare` para recorrer el camino completo: **8 comprobaciones**
  (File con nombre/tipo/tamaño/título correctos, AbortError sin aviso, aviso
  «usa Descargar», regresiones de F8 y del fix de logo); consola 0, barrido
  14/14, `node --check` OK; `?v=f7` en `video.html`.
- **F8 · Grabar pestaña ✅** (nuevo, solo ordenador): botón «Grabar pestaña»
  con `getDisplayMedia` que captura la pestaña donde se reproduce un vídeo de
  X/YouTube/etc. —en Chrome, con la casilla «Compartir audio de pestaña»— y el
  clip resultante entra por la misma puerta que un vídeo subido
  (`cargarVideo`): bloque de recorte, riel, miniaturas y duración de E3 (el
  webm de MediaRecorder sin duración en cabecera ya lo sabía resolver E3; en
  Chrome actual sale mp4 con códec `mp4a`). El sonido de la pestaña viaja
  dentro del clip y al render se mezcla con la música en el `audioDest` de F6
  (una única pista para el grabador). El botón no aparece sin
  `getDisplayMedia` (iOS/móvil) ni con puntero táctil; mientras graba hay
  fila con punto rojo, cronómetro y «Detener» (máximo 2 min; si pulsan
  «Dejar de compartir» de Chrome, la pista se corta sola y el clip se carga
  igual); la captura bloquea «Crear vídeo» y las cargas de archivos.
  **Fix visual asociado:** `d-flex` (utilidad con `!important`) ganaba a
  `[hidden]` y la fila de captura se veía siempre — regla
  `#vid-pestana-fila[hidden]{display:none !important}`; el mismo patrón
  afectaba a `#vid-logo-estado` (F4/E4, la barra de estado del logo se veía
  sin logo), **arreglado acto seguido en su propio commit**. E2E
  **17 comprobaciones** con `getDisplayMedia` simulado (canvas animado +
  pista de audio) y visibilidad real por `getComputedStyle`: constraints con
  audio, códec con audio, clip `pestana-*` con duración leída, pistas
  apagadas al terminar, cronómetro, bloqueos, cancelación del selector y
  regresión de subida de imágenes; consola 0, barrido 14/14, `node --check`
  OK; `?v=f8b` en `video.html`.
  *Descarga directa de YouTube/otras redes (29/09, estudiado):* **no es
  viable** en un PWA estático —YouTube no envía cabeceras CORS y cifra las
  URL de sus streams (habría que interpretar su player JS, que cambia cada
  pocos días, y unir audio/vídeo DASH—; en la práctica solo funciona con
  servidor propio o extensiones con privilegios, contra el principio «sin
  subir nada» de S1–S5, y además va contra los Términos de YouTube.
  **Decisión del usuario: no añadir nada**; F8 «Grabar pestaña» es la vía
  recomendada para llevar contenido de X/YouTube al editor.
- **F9 · Color y tipografía de los textos ✅** (feedback del usuario: «no puedo
  cambiar los colores o el formato de las letras» —en tet1/tet2 ya existía con
  fabric: `fill`, `fontFamily`, `fontWeight`—). Los textos de `video.html` se
  pintaban con **blanco fijo** y la pila de sistema en negrita. Ahora cada
  texto lleva `color`, `fuente` y `peso` propios con tres controles nuevos en
  el panel «Editar texto»: **color** (`input[type=color]`, se aplica en vivo
  con `input`/`change`), **Tipografía** (5 opciones: sistema, Arial, Georgia,
  Verdana, Courier) y **Estilo** (negrita, normal, cursiva, negrita+cursiva);
  `nuevoTexto()` arranca con `#ffffff`/`sistema`/`negrita` (visualmente igual
  que antes) y `dibujaTexto()` construye el `ctx.font` por texto con
  `FUENTES_VIDEO`/`PESOS_VIDEO` —los textos antiguos sin campos caen en los
  valores por defecto—. E2E **16 comprobaciones** en dos etapas: A (11 —
  controles y defectos, texto en rojo verificado por píxeles —7 306 rojos—,
  cambio de familia y de peso verificado por hash de píxeles, valores
  conservados en los controles) y B (5 — un texto nuevo nace con los defectos,
  volver al primero recupera `#ff0000`/`mono`/`normal` y grabación directa con
  el texto estilado); consola 0, barrido 14/14, `node --check` OK; `?v=f9` en
  `video.html`. *Dato de futuro test:* sin imágenes ni vídeo el lienzo está
  **oculto** (`reiniciarPreview` muestra el estado vacío) y no pinta nada:
  los tests de dibujo necesitan contenido —y fijar el tamaño de salida, que
  con «orig» una imagen de 64 px encoge el lienzo a 64²—.
- **F10 · Compartir y descargar en el móvil ✅** (feedback de campo: «al
  compartir solo llega el audio» y «la descarga cae en
  `content://media/externa` y no sirve para ponerla en las redes»). Tres
  cambios en la salida: (1) `dibujarFrame` **no se salta ya el fotograma**
  cuando el vídeo fuente está en `readyState < 2` —pinta el fondo y los
  superpuestos para que `captureStream` siga recibiendo dibujos: sin ellos
  la grabación puede quedar **sin pista de vídeo** (en WhatsApp solo
  llega el audio)— y los dos ticks que lo llamaban con guard ya no lo
  necesitan (así el **E2 directo** bombea el lienzo aunque la fuente se
  quede sin datos, en vez de dejar el stream morir); (2) `elegirMime` con
  audio prueba **avc1 antes que avc3** —WhatsApp, Instagram y Facebook
  decodifican mejor el MP4 con los parámetros solo en avcC—, ya que la
  «advertencia de codec description» que motivaba avc3 no aparece al
  grabar avc1 con audio en Chrome 152; (3) nombre de archivo único
  **`tet-AAAA-MM-DD-HHmmss.mp4`** para «Descargar» y «Compartir» —antes
  `tet.mp4` fijo: en Descargas se pisaba con cada render o el sistema le
  añadía « (1)»—. E2E **33 comprobaciones** en cuatro etapas: A (7 — clip
  sintético de 1,2 s con música WAV cargada, botón habilitado y espía de
  `MediaRecorder` con estáticos copiados), B (13 — render en tiempo real
  de 1 239 ms con mimeType exacto `video/mp4;codecs=avc1.42E01E,mp4a.40.2`,
  resultado 128×128 y 1,217 s con 93 % de píxeles rojos y 6 % de blancos
  —pista de vídeo real—, nombre con fecha, «Descargar vídeo MP4 (22 KB)»,
  solo el aviso esperado de wake lock), C (5 — con `navigator.share`
  parcheado el `File` lleva el **mismo nombre** y tipo `video/mp4`) y D (7 —
  con la fuente rota, `readyState` 0, un cambio de fondo **repinta el
  lienzo de magenta**: antes se quedaba el fotograma anterior); consola 0,
  barrido 14/14, `node --check` OK; `?v=f10` en `video.html`. *Dato de
  futuro test:* el clip sintético se anima con **timers, no rAF** —con la
  pestaña al fondo rAF está throttlada y el webm salía de 493 B sin
  fotogramas—.
- **N1 · Motor de texto: salto de líneas, ajuste y zona ✅** (primer pedido del
  usuario del lote de noticias: «el texto no se adapta y no tiene salto de
  líneas»). `dibujaTexto` dibujaba **un solo `fillText`**: los Enter del
  textarea se colapsaban y un texto ancho se encogía entero hasta quedar
  diminuto. Ahora `parteLineas` parte el texto en **varias líneas**
  —respetando los Enter del autor y saltando por palabras dentro de cada
  párrafo; una palabra más ancha que la línea se corta por caracteres— y el
  bloque se **encoge en alto** hasta caber en su zona (parte, mide y reduce:
  converge en pocas vueltas). El bloque se ancla arriba/abajo/centro según la
  posición y la caja de la manija y de los toques pasa a ser la del **bloque
  completo** —con una sola línea es exactamente la caja de antes—. Con **Tet
  News** los textos viven en el **cuerpo** (`zonaDibujo`): los de arriba
  empiezan bajo la barra y uno «personalizada» se recorta dentro del cuerpo,
  nunca sobre la barra. El máquina de escribir revela sobre las líneas ya
  partidas para que el bloque no salte mientras se escribe. E2E **7
  comprobaciones** (lienzo 128², texto rojo sobre vídeo verde): `UNO\nDOS` →
  exactamente 2 bandas de píxeles, línea larga → 5 bandas (salto por palabras),
  ambas bajo la barra (≥ barH+2), sin plantilla el mismo texto sube a la fila
  8, manija visible sobre el bloque, anclaje abajo en el pie y render real con
  texto activo (`tet-…mp4`); consola 0, barrido 14/14, `node --check` OK;
  `?v=n1` en `video.html`.
- **N2 · Tipos de texto y «Añadir título» ✅** («no se puede tener un título»;
  el usuario eligió **los dos**: botón y estilos). El botón **«Añadir título»**
  —junto a «Añadir texto»— crea el texto ya de titular: arriba al centro con
  entrada `deslizar`. El nuevo selector **«Tipo de texto»**
  (Título/Subtítulo/Cuerpo) aplica su preset de un toque —posición, tamaño y
  animación de entrada— sin tocar color, tipografía, tiempos ni contenido, y
  refresca los controles al instante. Posición nueva **«Arriba al centro»**
  (`arriba-centro`): centrada y, con Tet News, bajo la barra. E2E **10
  comprobaciones** (lienzo 128²): el botón añade exactamente una fila con los
  4 presets del titular, el titular cae bajo la barra centrado (banda 17–27,
  x=63 de 128), «Subtítulo» → `personalizada` con `aparecer` (banda 28–36,
  bajo la barra), «Cuerpo» → `abajo-centro` tam 7 (banda 110–118 en el pie),
  la fila 0 sigue en `cuerpo` con el editor visible y render real con el
  titular en escena (`tet-…mp4`); consola 0, barrido 14/14, `node --check`
  OK; `?v=n2` en `video.html`.
- **N3a · «Centrar contenido» blindado contra gestos táctiles huérfanos ✅**
  («un botón que independientemente de donde esté solo mueve al centro el
  vídeo… porque el botón actual lo mueve en 0 0»). El E2E reproduce el
  síntoma: arrastrando la manija al extremo el contenido queda pegado a la
  esquina —x=0, tope del cuerpo— y el botón sí lo devolvía (la lógica era
  correcta), pero en táctil un `pointercancel` perdido dejaba `contAsa` y
  `contRedimBase` **huérfanos**: el siguiente toque reescalaba con la base
  vieja y podía clavar el contenido en (0, 0) *después* de tocar el botón.
  Tres blindajes: **1)** «Centrar contenido» anula cualquier gesto a medias
  antes de centrar —el botón siempre gana—; **2)** cada `pointerdown` de la
  manija arranca con estado limpio (cada rama declara lo suyo); **3)**
  `lostpointercapture` cierra el gesto junto a `pointerup`/`pointercancel`.
  E2E **8 comprobaciones** con punteros sintéticos `pointerType:'touch'`:
  base centrada, arrastre a la esquina (centro blanco / borde verde),
  «Centrar» recupera el centro con escala 100 %, un asa sin cerrar no
  secuestra el arrastre (escala 135 % intacta, manija 300→295 px), el botón
  limpia el gesto huérfano, `lostpointercapture` lo cierra y estado final
  centrado; consola 0, barrido 14/14, `node --check` OK; `?v=n3` en
  `video.html`.
- **N3b · Reparto automático de los textos al añadir o quitar ✅** («al añadir
  o quitar»: los textos se reparten solos por la duración). Con **Tet News**
  activo, cada alta o baja de texto vuelve a repartir todos por igual —
  `inicio = i·T/n` sobre `totalSalida()` (el recorte de la salida en vídeo)
  con 1 decimal— y después cualquier «Inicio» se ajusta a mano; sin
  plantilla no se toca nada. `redistribuyeTextos()` se engancha en «Añadir
  texto», «Añadir título» y «Quitar» y repinta la línea de tiempo F5f. E2E
  **7 comprobaciones**: de 1 a 2 textos (0 y 0,5 s), de 2 a 3 (0 / 0,3 /
  0,6 s), edición manual respetada —el campo sanea a 1 decimal, 0,15 →
  0,2—, quitar el texto del medio devuelve exactamente el 0,5 s, sin
  noticias el nuevo nace en 0 y el título conserva su tiempo, al volver a
  noticias quitar reparte otra vez y render real con el título escalonado
  (`tet-…mp4`); consola 0, barrido 14/14, `node --check` OK; `?v=n3b` en
  `video.html`.
- **N4 · Centrado por ejes adicional ✅** («el botón que centre en eje
  vertical u horizontal»). Dos botones nuevos junto a «Centrar contenido»:
  **«Centrar horizontal»** mueve solo la X al centro del cuerpo y **«Centrar
  vertical»** mueve solo la Y —cada uno respeta la otra coordenada y el
  tamaño—; comparten `anulaGestosContenido()` con el botón original, que
  sigue devolviendo todo (posición + escala 100 %) y se apagan sin plantilla
  de noticias. E2E **10 comprobaciones**: botones presentes y activos,
  centrar horizontal no toca nada si ya está centrado, arrastre a la esquina
  verificado por píxeles (centro blanco, borde y sup-izquierda verdes; la
  manija recorta a la zona, por eso su `top` no baja), H centra solo X
  dejando la Y intacta, V centra solo Y dejando la X intacta, escala 150 %
  conservada tras centrar, el botón de siempre sigue reseteando todo y los
  tres se apagan al quitar noticias; consola 0, barrido 14/14,
  `node --check` OK; `?v=n4` en `video.html`.
- **N5 · Centrado por ejes de los textos ✅** («también para el texto»): los
  mismos dos botones de N4 dentro de «Editar texto», bajo «Posición» —
  **«Centrar horizontal»** y **«Centrar vertical»**. Cada botón convierte el
  texto a «personalizada» moviendo SOLO su eje: el otro se recupera de la
  última caja dibujada (`t.cajaDib`, que guarda el centro tal y como se ve y
  sigue al objeto al reordenar o quitar) —los presets izquierda/derecha se
  convierten desde su borde ± media anchura para no saltar de sitio— y, si
  el texto aún no se ha visto, de `t.x/t.y` (fracciones→píxeles: el E2E cazó
  justo ahí una mezcla de unidades, corregida en el acto). E2E **7
  comprobaciones**: botones presentes, abajo-izquierda por píxeles, H centra
  solo la X (alto intacto en la manija, select en «personalizada»), V centra
  solo la Y (ancho intacto), V desde abajo-izquierda conserva la izquierda,
  la reserva sin caja dibujada centra bien, y render real (`tet-…mp4`);
  consola 0, barrido 14/14, `node --check` OK; `?v=n5` en `video.html`.

Validación de cada uno: E2E en Chrome + consola limpia + barrido 200. **E3**
se hizo justo después de F3 (✅), con el **riel de recorte** como commit
propio (✅), el fix del primer fotograma (✅), **F4** (✅) y **F5** (✅, en
tres commits: animaciones, título arrastrable y plantilla Tet News —F5d,
reemplazando el select de 9 plantillas—); antes del audio vienen **F5e** ✅
(lista de textos) y **F5f** ✅ (riel con cabezal), y **F6** ✅ cerró la
petición del usuario (la prueba en iOS queda anulada: el usuario no tiene
iPhone); **F8** ✅ añadió la captura de pestaña como fuente, **F7** ✅ el
botón «Compartir vídeo» y **E2** ✅ cerró el bloque con la grabación en
directo del lienzo (57 comprobaciones E2E, consola 0, barrido 14/14); **F10**
✅ cerró después la queja de compartir/descarga en el móvil (33 comprobaciones)
y **E5b** ✅ añadió el recorte por clip (5 etapas de E2E, con el render real).

---

## 🟢 Lote P — Interfaz amigable y rápida (`video.html`) 🆕

Cinco piezas elegidas por el usuario el 01/10/2026 para «una interfaz más
amigable y rápida». Un commit por pieza.

- **P1a · Barra de acción pegajosa ✅** (arranque del lote: «Crear vídeo está
  muy abajo y hay que ir a buscarlo»). El bloque final —progreso de la
  grabación, **«Ver lienzo»** (nuevo) y los botones «Crear vídeo» y
  «Cancelar»— pasa a `.vid-acciones-fijas` con `position: sticky;
  bottom: 0`: mientras se recorre el formulario la barra queda pegada al
  pie —a ras del borde de `.vid-caja` por margen negativo, fondo opaco y
  `env(safe-area-inset-bottom)` para el gesto de iPhone— y se suelta sola
  al llegar a su sitio, sin una línea de JS. «Ver lienzo» sube a la vista
  previa con `scrollIntoView` suave; los dos botones comparten renglón
  (`d-flex`, «Crear» crece) con objetivos de 44 px, y el progreso va dentro
  de la barra para verse también mientras se graba. *Dato de test:*
  Bootstrap trae `scroll-behavior: smooth` en `:root` y la pestaña oculta
  congela esas animaciones —el primer E2E falló por el arnés, no por la
  app—; el test usa `behavior: 'instant'` y un espía en `scrollIntoView`.
  E2E **6 comprobaciones**: barra con los cuatro hijos y `position: sticky`,
  los dos botones en el mismo renglón con «Crear» más ancho, pegada al pie
  arriba del todo y a mitad del formulario (scroll real a 1200 px), «Ver
  lienzo» llama a `scrollIntoView` de `#vid-lienzo` con
  `block: 'center'` y aterriza centrado, «Crear» activo con el clip
  cargado; consola 0, barrido 14/14, `node --check` OK; `?v=p1a` en
  `video.html` (script y CSS).
- **P1b · Duplicar texto ✅** («quiero otro igual sin reconstruirlo»): junto
  a subir/bajar/quitar, cada fila de la lista lleva un **cuarto botón
  «Duplicar el texto»** (`fa-clone`, con `title` y `aria-label`, objetivo de
  44 px; `.vid-texto-sel` encoge con elipsis, sin tocar el CSS).
  `duplicaTexto(i)` hace copia profunda —`JSON.parse(JSON.stringify())`
  sobre campos planos: contenido, tipo, color, posición, tamaño, animaciones,
  fuente, tiempos y `cajaDib` viajan—, la inserta justo debajo, con Tet News
  reparte los inicios como al añadir (N3b) y deja **el clon seleccionado**
  en el editor para retocarlo; sin plantilla la copia conserva la ventana
  exacta del original. *Dato de test:* la página arranca SIEMPRE con **un
  texto vacío seleccionado** —el primer E2E esperaba cero y por eso
  duplicó la fila equivocada—. E2E **5 comprobaciones**: arranque con 1
  seleccionado, botón con título, `aria-label` e icono `fa-clone`, la copia
  idéntica (contenido, color, inicio y ventana) y seleccionada debajo,
  objetos independientes —editar la copia deja el original en
  «Original»/4 s—, y con Tet News duplicar da 3 filas repartidas
  0 / 0,2 / 0,3 s con el clon seleccionado; consola 0, barrido 14/14,
  `node --check` OK; `?v=p1b` en `video.html`.
- **P1c · «Quitar texto» con «Deshacer» ✅** («que un toque erróneo no
  pierda lo escrito»). `aviso()` gana una acción opcional —un botón junto a
  la X, resuelto en el propio toast que la app ya usa (arriba a la derecha,
  4,5 s)— y `quitaTexto` lo invoca guardando el objeto, su índice y la
  selección previa: «Deshacer» devuelve el texto a su sitio con su
  selección, vuelve a repartir en Tet News (N3b) y repinta lista, editor y
  lienzo. Cada aviso cierra su propia cortina: dos quitar seguidos dejan
  dos avisos y cada «Deshacer» repara el suyo. El botón mide 44 px
  (`.vid-aviso-accion`). E2E **4 comprobaciones**: quitar deja 0 filas,
  editor oculto y aviso con botón «Deshacer»; deshacer restaura contenido,
  tiempo (4 s), selección y editor; con dos textos quitar el primero y
  deshacer repone el orden exacto [Borrable, Segundo]; el aviso caduca
  solo a los ~4,5 s sin restaurar nada; consola 0, barrido 14/14,
  `node --check` OK; `?v=p1c` en `video.html` (script y CSS).
- **P1d · Feedback: «✓ guardado», tinte táctil y vibración ✅** («que se
  note al tocar»). Tres piezas: (1) `#vid-guardado`, un distintivo verde
  dentro del bloque de resultado que `guardaUltimo` enciende en el
  `oncomplete` de IndexedDB —«Guardado en este dispositivo — se recupera
  aunque cierres la pestaña»—; (2) `.vid-texto-sel:active` tiñe la fila
  transparente al pulsar (los `.btn` ya traen el `:active` de Bootstrap);
  (3) `vibra(ms)` —`navigator.vibrate` envuelto en try/catch, iOS la
  ignora sin más—: 10 ms al arrancar «Crear vídeo» **tras** pasar todas las
  validaciones (los dos caminos: clips E5b y montaje) y `[15, 60, 15]` al
  terminar el render en `muestraResultado`, nunca al restaurar
  (`sinScroll`). E2E **4 comprobaciones**: regla `:active` en la hoja,
  `navigator.vibrate` espiado recibe `10` al pulsar «Crear», `[15, 60, 15]`
  al completar un render real con clip sintético, y el distintivo visible
  con su texto tras confirmar IDB; consola 0, barrido 14/14,
  `node --check` OK; `?v=p1d` en `video.html` (script y CSS).
- **P2 · Barra flotante sobre el texto ✅** («las acciones al alcance del
  pulgar sin soltar el lienzo»). Dentro de `.vid-preview`, **bajo la
  manija y con la misma vida que ella** —`actualizaManija()` la enciende
  con la misma condición (`textoSel ≥ 0` + lienzo visible + caja
  dibujada)—, una barra redondeada con **cinco controles de 44 px**:
  centrar horizontal y vertical (reusan `centraTextoPorEje('h'|'v')` —el
  primer intento pasó `'x'/'y'` y la función, ante eje desconocido,
  convertía a «personalizada» sin mover nada: el E2E lo cazó por píxeles—),
  duplicar (P1b), quitar (P1c, con su Deshacer) y un selector de color
  —el swatch y el `#vid-txt-color` del formulario van sincronizados en
  ambos sentidos—. Un texto vacío no tiene caja en el lienzo → la barra
  no aparece, igual que la manija. E2E **8 comprobaciones**: oculta sin
  contenido, visible con la manija y sus 5 controles táctiles con
  `aria-label`, H centra la X por píxeles (0 px) con el select en
  «personalizada», V centra la Y (0 px) y la barra sigue viva, duplicar
  suma fila, el color llega al formulario, quitar deja el aviso
  «Deshacer» y sin textos se apaga con la manija; consola 0,
  barrido 14/14, `node --check` OK; `?v=p2` en `video.html` (script y
  CSS).

- **P3 · Pestañas del formulario ✅** («menos scroll, el lienzo siempre
  visible»). La barra `#vid-pestanas` (Bootstrap `nav-tabs`, enlazadas
  por `data-bs-target`) parte el formulario en **Contenido · Textos ·
  Ajustes · Exportar** y el scroll de móvil queda en cuatro pantallas
  cortas. El **lienzo, su pista, los controles M1/M2 y la barra P1a se
  quedan fuera** de los paneles: se ven desde cualquiera, y el
  resultado M3 también (fuera, para que siga viéndose al terminar el
  render sin cambiar de pestaña). Reordenado sin romper ids: el bloque
  del lienzo sube tras la cabecera, la **música F6** se muda junto al
  logo dentro de `#vid-superp` (la fila original se parte en dos:
  `#vid-superp` + `#vid-textos-fila`), la **línea de tiempo F5f** baja
  al final de Textos y el **total** va a Exportar con «Grabar en
  directo» E2. El orden físico de los paneles sigue el del formulario
  original (Ajustes antes que Textos) y la barra los reordena por
  flujo —Bootstrap resuelve por id, no por posición—. Al mostrarse
  una pestaña (`shown.bs.tab`) se repintan `pintarRiel()`,
  `pintaRielSalida()` y `actualizaManija()` por si estaban midiendo
  con el contenedor oculto (las posiciones de los rieles van en %,
  pero las miniaturas miden). Objetivo táctil de **44 px** en
  `.vid-pestanas .nav-link`. E2E **estructura + pestañas + render**:
  0 ids duplicados, 4 paneles con su membresía, cambio de pestaña con
  `aria-selected` y los demás ocultos, lienzo/barra/resultado siempre
  fuera, añadir texto desde Textos (1→2 filas) con manija y barra P2
  vivas, barras del riel con ancho real (924 px), Ajustes con
  fondo/calidad/logo/música, Exportar con el total («2 imágenes × 2 s
  = 4 s»), vuelta a Contenido con la tira, **render real 4,2 s** con
  resultado visible y fuera de paneles; consola 0, barrido 14/14,
  `node --check` OK; `?v=p3` en `video.html` (script y CSS).

- **P4 · Deshacer y rehacer ✅** (botones junto a las pestañas y
  `Ctrl/Cmd+Z`). Historial con el mismo patrón que `capas.js`:
  capturas del modelo —imágenes, textos, ajustes del formulario, logo,
  música y cola de clips— con **tope de 40 estados**, marca con
  **600 ms de retardo** dentro de los refrescos (`reiniciarPreview`,
  `pintaListaTextos`, `redibujarArrastre`, `actualizaCrear`,
  `pintaMusica` y el volumen/calidad) para que teclear o arrastrar
  dejen una sola entrada, y **dedupe por clave** para no repetir
  estados iguales (la clave ignora los objetos pesados: img, buffer y
  Blob serializan como `{}`). Las urls de logo y clips se revocan al
  sustituirlos o quitarlos, así que cada estado guarda el `File`/`Blob`
  original y el historial las marca en `histRevocadas`: al rehacer se
  recrean (vuelven a ser `blob:`). La restauración **reutiliza los
  refrescos**: escribe los valores del formulario y lanza `change`
  (con `modoAnterior` adelantado para que la conversión de duración
  salga identidad), reinyenta el `File` de la música con `DataTransfer`
  y recoloca la entrada para que el dedupe no marque cambios falsos.
  Al deshacer se corta la cola de rehacer cuando hay un cambio nuevo;
  el resultado M3 queda **fuera** del historial (se guarda aparte).
  Botones `#vid-deshacer` / `#vid-rehacer` de **44 px** en la fila de
  las pestañas (`.vid-pestanas-fila`, parten a dos filas antes que
  esconderse), inertes durante grabación o captura; teclado
  `Ctrl/Cmd+Z` y `Ctrl+Shift+Z` o `Ctrl+Y`, sin robar el deshacer
  nativo de los campos. E2E **siete fases**: estructura (0 ids
  duplicados, botones siempre visibles), imágenes (cargar → deshacer
  a vacío → rehacer con centro verde), textos (cadena añadir/Hola/
  Adios con ida y vuelta), tamaño + `Ctrl+Z` en página (surge) y en
  el campo (no roba), calidad con corte de rehacer, **render real**
  (botones inertes mientras graba, visibles tras el render y
  deshacer no toca el resultado) y **clip webm grabado en la página**
  (cargar → deshacer revoca la url → rehacer la recrea del blob);
  consola 0, barrido 14/14, `node --check` OK; `?v=p4` en
  `video.html` (script y CSS).

- **P5 · Vista previa sin repintados en reposo ✅**. El bucle de la
  previa (F5e) repintaba el lienzo a 60 fps mientras hubiera «algo
  animado» en la escena, aunque en ese instante no se moviera nada:
  cualquier texto con entrada, salida o ventana temporal dejaba el
  canvas dibujando eternamente en hueco. Ahora cada fotograma lleva
  una **firma** (`firmaFotograma`): imagen en curso, kenburns
  (siempre en movimiento), fundido o deslizar
  (`local < durTransicion(durMs)`) y, por texto, su visibilidad en
  la ventana `inicio`/`dur` más la animación de entrada (primeros
  `animDur` s) y la de salida (últimos `salidaDur` s) —las mismas
  fórmulas que usa `dibujaTexto`, donde `p`/`q` no se mueven fuera
  de su tramo—. **Firma igual → no se repinta**: el lienzo ya es el
  correcto. La firma cambia en cada frontera (cambio de imagen,
  entrar o salir de un fundido, de una ventana o de una animación),
  así que el fotograma que abre o cierra cada tramo se dibuja igual
  que siempre y no se pierde ni un fotograma de transición. El
  **cabezal del riel sigue el reloj** por su cuenta
  (`poneCabezalSalida` en cada tick), para que la línea de tiempo no
  se congele mientras el lienzo descansa. E2E con espía de
  `ctx.drawImage`: 1 imagen × 4 s + texto con entrada de 1 s → **24
  repintados en la animación, 0 (cero) en los 1,2 s de reposo con el
  cabezal avanzando del 36,98 % al 67,7 %, 17 repintados tras dar la
  vuelta al bucle**, deshacer sigue operativo; consola 0, barrido
  14/14, `node --check` OK; `?v=p5` en `video.html` (script y CSS).

- **P6 · Barra de texto fuera del lienzo ✅**. La barra P2 (centrar
  H/V, duplicar, quitar y color) estaba anclada dentro del marco del
  lienzo (`position:absolute; bottom:.5rem` sobre `.vid-preview`), de
  modo que tapaba la banda baja de la vista previa —justo donde suele
  estar el texto— e interceptaba toques y arrastres de esa zona al
  escribir o manipular. Ahora la barra **sale del marco** y vive como
  fila centrada justo debajo (`width: fit-content; margin: .5rem
  auto 0`): nunca cubre el canvas ni roba gestos, sigue naciendo y
  muriendo con la manija (`flotTexto.hidden` en `actualizaManija`)
  y conserva los mismos 44 px táctiles y el mismo aspecto. E2E: con
  texto seleccionado la barra queda **por debajo del borde del marco
  sin solaparse con el canvas**, se oculta al deseleccionar y
  «duplicar» sigue añadiendo texto; consola 0, barrido 14/14,
  `node --check` OK; `?v=p6` en `video.html` (script y CSS).

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
