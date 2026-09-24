# tet admin

PWA estática para crear imágenes y miniaturas para redes sociales a partir de plantillas.
Proyecto [tet](https://somostet.github.io/) — sin build ni dependencias en tiempo de ejecución:
todo está vendorizado en `public/vendor/`.

## Cómo abrirlo en local

```bash
python -m http.server 8123 --bind 127.0.0.1
# abrir http://127.0.0.1:8123/
```

Solo hace falta un servidor estático (GitHub Pages sirve `master/` en `/admin/`).

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

## Funciones del editor

- Plantillas, títulos, imágenes, detalles y capas (arrastrar orden, traer/enviar).
- **Panel de capas** (`capas.js`): deshacer/rehacer (Ctrl+Z / Ctrl+Shift+Z), duplicar, guardar/cargar proyecto `.json`, compartir (Web Share).
- **Formatos sociales** (`formatos.js`): presets de Instagram, Facebook, X, YouTube, TikTok, LinkedIn y Pinterest con guía de recorte y zona segura; exporta PNG en píxeles exactos. Incluye el preset **Origen** (tamaño original del lienzo).
- **Portapapeles**: Ctrl+V pega cualquier imagen sobre el lienzo (escalada al70% y centrada, con historial) en los 6 editores; botón "Pegar" en tet1.
- **UI estilo Inkscape en `tet1.html`** (piloto, `shell.js`/`shell.css`): barra superior con plantilla/deshacer/zoom/formato+guía/descarga, rail de herramientas, reglas con coordenadas, dock Propiedades|Capas, paleta de colores, tema oscuro/claro, navbar con rotación automática de plantillas ▶ y lienzo en blanco ajustado a la red elegida.
- PWA: service worker vanilla en `sw.js` (raíz) con caché de estáticos.

## Stack

- Bootstrap 5.3.3 (vendor local) + compat shim `bootstrap5-compat.js`
- jQuery 3.7.1, Fabric.js 2.4.3, ReImg, FontAwesome 5.13
- CSS propio en `public/css/style.css` (tokens de diseño en `:root`)

## Documentación

- `PLAN_MEJORAS.md` — backlog de mejoras por prioridad (estado de cada punto).
- `BOOTSTRAP_MIGRATION_PLAN.md` — migración de Bootstrap 4 a 5.
