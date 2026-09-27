# Plan de Mejoras de Seguridad — tet admin

Documento complementario a `PLAN_MEJORAS.md` con la auditoría de seguridad y los
lotes propuestos. Auditoría realizada sobre el estado `42c0688`.

Contexto: es una **PWA estática sin backend** — no hay cuentas, cookies,
localStorage ni endpoints, así que no hay datos de usuario que robar. Los riesgos
reales son otros: ejecución de scripts en el origen (github.io), suministro de
dependencias, colgar la pestaña del móvil con archivos maliciosos y cachés
obsoletas del service worker.

---

## Estado

| Lote | Qué | Prioridad | Esfuerzo | Estado |
|---|---|---|---|---|
| S1 | Quitar jQuery + `bootstrap5-compat.js` | 🔴 Alta | Bajo | ✅ Hecho |
| S2 | CSP por meta, solo http/https | 🔴 Alta | Medio | ⬜ Pendiente |
| S3 | Validar el `.json` de "Cargar proyecto" | 🟠 Media-alta | Bajo | ⬜ Pendiente |
| S4 | Bootstrap a última 5.3.x · riesgo de fabric | 🟡 Media | Bajo / Proyecto | ⬜ Pendiente |
| S5 | Higiene: referrer, frame-buster opcional | 🟢 Baja | Bajo | ⬜ Pendiente |
| S6 | Migrar `onclick=` a `addEventListener` | 🟢 Futuro | Alto | ⬜ Diferido |

Orden recomendado: **S1 → S3 → S2 → S5 → S4**; S6 cuando haya motivo.

---

## ✅ Verificado en la auditoría (no tocar)

1. **Cero CDN en runtime**: todo vendorizado en `public/vendor/` (Bootstrap
   5.3.3, fabric 2.4.3, FontAwesome 5.13.0 — jQuery retirado en S1) → sin cadena de
   suministro remota y sin necesidad de SRI. Búsqueda de `googleapis|cdnjs|unpkg|
   jsdelivr|cloudflare` en HTML/CSS/JS: **ninguna**.
2. **`rel="noopener"` en el 100 %** de los `target="_blank"` (verificado en los
   7 HTML).
3. **Sin XSS por datos de usuario**: el nombre de capas y los toasts usan
   `textContent`; todos los `innerHTML` (`formatos.js`, `capas.js`, `shell.js`)
   interpolan solo constantes/ HTML fijo.
4. **Service worker contenido**: `fetch` solo del mismo origen, limpia cachés de
   versiones antiguas en `activate`, TTL de 7 días y máximo 20 imágenes.
5. **Entradas de archivo con `accept`** (`application/json,.json`) y sin
   almacenamiento persistente.
6. **Export limitado** (×3, ~16,7 M px en iOS) — sin riesgo de render infinito.
7. **Enlaces externos solo `https://`** (auditoría de `http://`: ninguno).
8. **Sin `eval`/`new Function`/`setTimeout(string)` en nuestro código**. En
   fabric hay 2 `new Function`, ambos en rutas muertas para este proyecto
   (`clipTo` y `Pattern.source` con string, no usados — ver S3).

---

## S1 — Quitar jQuery y `bootstrap5-compat.js` 🔴

**Uso real auditado:**

| Dónde | Qué | Sustituto |
|---|---|---|
| `art.js:32,210`, `mc.js:31,209`, `miniaturas.js:31,215`, `main.js:331` | `$(".fondocol").change(...)`, `$(document).keydown(...)` | `querySelectorAll` + `addEventListener` |
| tet1/tet2/art/dictet/miniatura/modcre | `$(document).ready($('[data-bs-toggle="tooltip"]').tooltip())` | `bootstrap.Tooltip.getOrCreateInstance` en 3 líneas, o `title` nativo |
| `index.html` | carga jQuery + shim **sin usarlos** | borrar |

- Los modales (`data-bs-toggle="modal"`) ya funcionan nativos de BS5.
- `bootstrap5-compat.js` imita la API jQuery de Bootstrap 4; BS5 ya no la
  necesita (de hecho BS5 auto-registra su interfaz jQuery si detecta
  `window.jQuery`: al quitar jQuery esa rama se apaga sola).
- **Acción**: 7 `<script>` de jQuery + 7 de shim → fuera; borrar
  `public/js/bootstrap5-compat.js`; portar las 7 líneas JS y los 6 init HTML.
- **Beneficio**: −2 dependencias, ~90 KB menos, una superficie menos.

**Validación**: `node --check` en los 4 JS tocados, barrido HTTP 200, probar en
navegador: tooltips (hover), modal "Imágenes", atajos de teclado, cambio de
color de fondo (art/mc/miniaturas) y Ctrl+Z.

**✅ Hecho**: portados los 7 handlers JS y los 6 init HTML a vanilla
(`bootstrap.Tooltip.getOrCreateInstance`), fuera los 14 `<script>` (7 jQuery +
7 shim) de las 7 páginas, y eliminados `public/js/bootstrap5-compat.js` +
`public/vendor/jquery/`.

## S2 — CSP por meta, solo http/https 🔴

- **Implementación**: snippet inline al principio del `<head>` de los 7 HTML que
  inserte `<meta http-equiv="Content-Security-Policy">` **solo cuando
  `location.protocol` sea http/https** → el modo doble-clic (`file://`) queda
  intacto. Propuesta:

  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self';
  object-src 'none'; base-uri 'self';
  form-action 'self'; frame-src 'none';
  ```

- `unsafe-inline` es obligatorio por los `onclick=` del HTML (eliminarlos = S6).
- **Sin `unsafe-eval`**: los 2 `new Function` de fabric solo están en rutas no
  usadas (S3 además las bloquea). Si en pruebas falla algo, documentarlo y
  añadirlo.
- **Límites conocidos**: GitHub Pages no permite cabeceras → no existe
  `frame-ancestors` (clickjacking → S5) ni `upgrade-insecure-requests`; la meta
  dinámica se aplica desde su inserción al resto del documento.
- **Validación**: probar **en GitHub Pages** (no solo local): editor, subir
  imagen, plantillas, descargar, compartir, service worker; revisar consola por
  violaciones. Recargar dos veces para que el SW no enmascare nada.

## S3 — Validar el `.json` de "Cargar proyecto" 🟠

En el manejador de `data-act="load"` (`capas.js`), antes de `loadFromJSON`:

1. **Límite de tamaño**: rechazar archivos > 12 MB con aviso.
2. **`JSON.parse` en try/catch** → aviso y abort si es inválido.
3. **Lista blanca de `type`** en `objects` (y en un `clipPath` anidado si lo
   hay): `image, text, i-text, textbox, rect, circle, ellipse, line, path,
   polyline, polygon, triangle, group`. Tipo desconocido → aviso y abort.
4. **Cerrar las rutas `new Function` de fabric**: eliminar todo `clipTo` de
   tipo string y rechazar rellenos `pattern` cuyo `source` no empiece por
   `data:`/`blob:`/`http(s):`.

**Validación**: guardar → cargar un proyecto normal (funciona); cargar un JSON
con `type` inventado o `clipTo` string → aviso, sin romper; cargar un archivo
gigante → aviso.

## S4 — Dependencias vendorizadas 🟡

- **Bootstrap 5.3.3 → última 5.3.x**: copiar bundle + CSS a
  `public/vendor/bootstrap5/` y probar tooltips/modales/toasts. Sin prisa.
- **fabric 2.4.3 (2019)**: sin mantenimiento. **Riesgo aceptado documentado**:
  migrar a 6.x rompe API (`fabric.Canvas`, eventos, `clipPath`) y es un proyecto
  aparte — solo si aparece un CVE real o se necesitan features nuevas.
- **jQuery**: ~~no actualizar~~ **eliminado** en S1.

## S5 — Higiene 🟢

- `<meta name="referrer" content="strict-origin-when-cross-origin">` explícito
  en los 7 HTML (hoy es default en navegadores modernos, pero sin costo).
- **Frame-buster opcional** (3 líneas, inserto como S2 solo en http/https) si
  preocupa el clickjacking; impacto bajo porque no hay acciones sensibles.
- Mantener la regla: enlaces nuevos siempre `https://` + `rel="noopener"`.

## S6 — Migrar `onclick=` a `addEventListener` 🟢 futuro

~40 handlers inline en 5 HTML. Permitiría endurecer la CSP de S2 (quitar
`unsafe-inline` de `script-src` con `unsafe-hashes`). Mucho churn y hoy no hay
XSS confirmada → diferido hasta que S2 esté asentada.

---

## Criterios comunes de validación

1. `node --check` en cada JS tocado.
2. Barrido HTTP 200 contra el servidor local (7 HTML + JS/CSS del shell).
3. Prueba manual en navegador del lote; **S2 además obliga a prueba en Pages**.
4. **Un commit por lote**, en español, como en el resto del repo.

## Nota

Los commits de móvil/UX (Lote A, Lote C, asas y −/+) ya están en el remoto
(hasta `42c0688`); lo que siga pendiente de push será documentación.
