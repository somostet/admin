# tet admin

PWA estática para crear imágenes y miniaturas para redes sociales a partir de plantillas.
Proyecto [tet](https://somostet.github.io/) — sin build ni dependencias en tiempo de ejecución:
todo está vendorizado en `public/vendor/`.

## Cómo abrirlo en local

Doble clic en el HTML: funciona como archivo local (`file://`) **sin servidor**,
gracias a que las plantillas viajan embebidas en `public/js/plantillas-data.js`
(el lienzo no queda «tainted» y descargas, compartir e historial funcionan).

Para desarrollo o probar el service worker, un servidor estático opcional:

```bash
python -m http.server 8123 --bind 127.0.0.1
# abrir http://127.0.0.1:8123/
```

En producción, GitHub Pages sirve `master/` en `/admin/`.

## Páginas

| Archivo | Qué edita |
|---|---|
| `index.html` | Portada con acceso a los editores |
| `tet1.html` | Tet (noticias) 1200×1200 |
| `tet2.html` | Tet (miniatura mh) |
| `dictet.html` | Diccionario / código `#code` |
| `art.html` | Arte 1280×720 |
| `miniatura.html` | Miniatura 1280×720 |
| `modcre.html` | Mod creaciones |
| `gif.html` | GIF animado a partir de imágenes (lote D) |
| `video.html` | Vídeo MP4/WebM a partir de imágenes (lote E) |
| `collage.html` | Collage: varias fotos en una sola imagen con plantillas de celdas |
| `piper.html` | Voz neuronal con Piper (español) — no está en la portada; se llega desde la pestaña «Voz» de `video.html`; `noindex` |

## Portada (`index.html`)

Rejilla con los **8 editores**, cada tarjeta con su categoría, su tamaño de
salida y una descripción de una línea, más filtros (Todos · Imágenes · GIF ·
Vídeo) y los tres pasos del flujo. En el móvil son dos columnas y la tarjeta
entera es pulsable. `public/js/portada.js` solo se ocupa de los filtros.

Las capturas de las tarjetas pesan 186 KB en total (eran 413 KB): se generan con

```bash
powershell -ExecutionPolicy Bypass -File tools/optimizar-imagenes-portada.ps1
```

que aplana el alfa, las deja en 760 px de ancho y las guarda en JPEG (las
cuadras, en PNG). El script borra la versión que no mejora.

## Voz

- **Pestaña «Voz» del editor de vídeo** (`video.html` + `public/js/voz.js` +
  `public/css/voz.css`): una pestaña más del formulario, junto a «Ajustes» y
  «Exportar». Escribe el texto, elige una de las voces del sistema (prioriza las
  españolas), ajusta velocidad, tono y volumen y reproduce. Trocea por frases
  (máx. 180 caracteres) porque Chrome corta las locuciones largas, estima la
  duración y guarda texto y ajustes en `localStorage` (`tetVoz:<ruta>`). Expone
  `window.tetVoz.leer(texto)` y `.detener()` para que otra página pida la
  locución.
  - Usa la **Web Speech API**: 0 KB, gratis y sin servidor. La contrapartida es
    que el navegador **no deja exportar la voz a un archivo** (no pasa por Web
    Audio). Para el vídeo se graba la pestaña con «Grabar pestaña (vídeo)» de
    `video.html` marcando «Compartir audio de la pestaña»; para un WAV, la
    prueba de Piper.
  - `voz.css` reutiliza los tokens `--sh-*` de `shell.css` (que `video.html`
    también carga), así que el panel sigue el tema oscuro/claro del editor.
- **Prueba de Piper** (`piper.html`): página suelta y `noindex` que carga
  `@mintplex-labs/piper-tts-web` desde jsDelivr (con ONNX Runtime WASM y espeak-ng
  desde jsDelivr y cdnjs) y el modelo `es_ES-davefx-medium` desde Hugging Face.
  Su CSP es la única abierta del sitio (código de terceros, `wasm-unsafe-eval` y los
  hosts de HF/CDN). Genera WAV de 16 bits y 24 kHz en el navegador. **De momento solo
  español** (`es_ES`, `es_MX`); cada voz se descarga una vez y queda en la caché del
  navegador (OPFS). Para narrar en español y descargar el audio, el siguiente paso
  es integrar Piper en el editor de vídeo.
  - El modelo se guarda en la caché del navegador (OPFS), así que la segunda
    generación con la misma voz es rápida.

## Funciones del editor

- Plantillas, títulos, imágenes, detalles y capas (arrastrar orden, traer/enviar).
- **Pestaña «Capas» en el editor de vídeo** (`video.html`, R5): varias imágenes sueltas además del contenido, cada una con posición, tamaño y ventana temporal (aparece y desaparece en un momento del vídeo), mezcladas con los textos en un único orden de dibujo — una imagen puede quedar entre dos textos. Con tocar para seleccionar, manija para mover y asas para escalar.
- **Panel de capas** (`capas.js`): deshacer/rehacer (Ctrl+Z / Ctrl+Shift+Z), duplicar, guardar/cargar proyecto `.json`, compartir (Web Share).
- **Formatos sociales** (`formatos.js`): presets de Instagram, Facebook, X, YouTube, TikTok, LinkedIn y Pinterest con guía de recorte y zona segura; exporta PNG en píxeles exactos. Incluye el preset **Origen** (tamaño original del lienzo).
- **Portapapeles**: Ctrl+V pega cualquier imagen sobre el lienzo (escalada al70% y centrada, con historial) en los 6 editores; botón "Pegar" en tet1.
- **Pestaña «Investigar» en `tet1.html`** (`investigacion.js` + `investigacion.css`): el
  título del lienzo alimenta un buscador que abre Google IA (modo IA), Perplexity,
  Copilot, Gemini o ChatGPT con la consulta ya escrita, y galerías con licencia
  (Google filtrado a Creative Commons, Openverse, Unsplash, Pexels, Pixabay,
  Wikimedia). Compone el prompt de imagen con el estilo, la paleta y el tamaño del
  lienzo, lo copia para Bing Image Creator / Ideogram / Leonardo o genera una imagen
  gratis con Pollinations (sin cuenta ni clave); y arma un prompt de investigación
  que pide datos con fecha y fuente, más titulares y palabras clave para imágenes.
  Todo son enlaces y portapapeles: la CSP (`connect-src 'self'`) no se toca, el
  editor no envía nada a ningún servidor y sigue funcionando en `file://`.
- **UI estilo Inkscape en los 6 editores** (`shell.js`/`shell.css`): barra superior con plantilla/deshacer/zoom/formato+guía/descarga, rail de herramientas, reglas con coordenadas, dock Propiedades|Capas|Publicación, paleta de colores, tema oscuro/claro, navbar con rotación automática de plantillas ▶ y lienzo en blanco ajustado a la red elegida.
  - El **tamaño en pantalla del lienzo se calcula** (no es el 300/500 px fijo de
    el HTML): llena el espacio de trabajo sin pasar de 100 %, y el 100 % sigue
    siendo el tamaño real del diseño.
  - En **móvil y tableta** el rail y la barra superior son una fila que se
    desplaza lateralmente, con «Descargar» anclado a la derecha, y el campo de
    título + su botón bajan a una barra fija (`.sh-movil`) para escribir sin
    subir y bajar la página.
  - El encaje se recalcula **al abrir la página** (no solo al girar el móvil) y
    también cuando cambia el área de trabajo, por ejemplo al abrir el dock.
- **Edición de imagen** (`editar.js`, compartido por los 6 editores Fabric):
  girar 90°, voltear horizontal/vertical, brillo/contraste/saturación con reset,
  **borrador** con tamaño y plumón (borde suave), y **recortar** arrastrando un
  marco. Todo deshacible. El panel aparece en el dock solo cuando hay una foto
  seleccionada.
- **Collage** (`collage.html` + `collage.js`): plantillas con celdas (1, 2, 3,
  4, 5, 6 fotos y diseños de revista). Tocas una celda para elegirla y luego
  pones la foto desde **Galería**, **Cargar** o Ctrl+V — la galería no se abre
  sola. La foto entra **entera** en la celda; con «Rellena la celda» se recorta.
  Dentro de la celda se mueve y se acerca para encuadrar, y el recorte sigue a
  la foto. Color de fondo, hueco y esquinas redondeadas ajustables en vivo.
- **Accesibilidad**: Lighthouse (accesibilidad / buenas prácticas / SEO) da
  1,00 / 1,00 / 1,00 en las 10 páginas, sin scroll horizontal en rail ni barra
  superior, y objetivos táctiles de 24 px como mínimo.
- PWA: service worker vanilla en `sw.js` (raíz) con caché de estáticos.

> Al tocar `shell.js`, `shell.css`, `style.css` o `formatos.js`, sube el `?v=`
> en los `<link>`/`<script>` de las nueve páginas: el service worker sirve el CSS
> con *stale-while-revalidate* y, sin cambiar la URL, seguiría dando el viejo.

## Stack

- Bootstrap 5.3.8 (vendor local)
- Fabric.js 2.4.3, ReImg, FontAwesome 5.13
- CSS propio en `public/css/style.css` (tokens de diseño en `:root`)

## Documentación

- `PLAN_MEJORAS.md` — backlog de mejoras por prioridad (estado de cada punto).
- `BOOTSTRAP_MIGRATION_PLAN.md` — migración de Bootstrap 4 a 5.
