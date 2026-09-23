# Plan de Migración a Bootstrap 5

> 📄 Las mejoras pendientes posteriores a la migración están en **[PLAN_MEJORAS.md](./PLAN_MEJORAS.md)**.

Este documento describe un plan paso a paso para migrar el proyecto de Bootstrap 4 a Bootstrap 5 sin destruir el estado actual.

## 1. Preparación y respaldo

1. Hacer un respaldo completo del proyecto antes de tocar archivos.
   - Usar `git status` para revisar cambios actuales.
   - Crear una rama nueva, por ejemplo: `git checkout -b bootstrap5-migration`.
   - O copiar el proyecto a una carpeta de respaldo.

2. Identificar las páginas que usan Bootstrap.
   - `index.html`
   - `art.html`
   - `tet1.html`
   - `tet2.html`
   - `dictet.html`
   - `miniatura.html`
   - `modcre.html`

3. Tomar nota de las dependencias actuales:
   - `public/vendor/bootstrap/css/bootstrap.min.css`
   - `public/vendor/bootstrap/js/bootstrap.min.js`
   - `public/vendor/popper/popper.min.js`
   - `public/vendor/jquery/jquery-3.3.1.min.js`

## 2. Selección de la versión de Bootstrap 5

1. Decidir si usar CDN o archivo local.
   - CDN: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/...`
   - Local: descargar Bootstrap 5 y colocarlo bajo `public/vendor/bootstrap/`

2. Si se elige local, descargar:
   - `bootstrap.min.css`
   - `bootstrap.bundle.min.js`

3. Eliminar dependencias Bootstrap 4 de los archivos HTML:
   - `public/vendor/bootstrap/css/bootstrap.min.css`
   - `public/vendor/popper/popper.min.js`
   - `public/vendor/bootstrap/js/bootstrap.min.js`

## 3. Actualización de HTML y markup

1. Cambios globales de atributos:
   - `data-toggle="..."` → `data-bs-toggle="..."`
   - `data-target="..."` → `data-bs-target="..."`
   - `data-dismiss="modal"` → `data-bs-dismiss="modal"`
   - `data-placement="..."` → `data-bs-placement="..."`

2. Clases y componentes obsoletos:
   - `input-group-prepend` → reemplazar por `<span class="input-group-text">...</span>` dentro de `.input-group`
   - `custom-range` → `form-range`
   - `btn-block` → `w-100`
   - `float-right` → `float-end`
   - `text-right` → `text-end`
   - `pos-f-t` → `position-fixed top-0 start-0 w-100`
   - `close` button dentro de modal → `btn-close`

3. Verificar los componentes usados:
   - Modales (`.modal`, `.modal-dialog`, `.modal-content`)
   - Navbar colapsable
   - Tooltips
   - Input groups
   - Grid y utilidades de espaciado

## 4. Compatibilidad de JavaScript

1. Actualizar la carga de JS de Bootstrap:
   - Usar `bootstrap.bundle.min.js` en vez de Bootstrap 4 + Popper.

2. Revisar código jQuery que usa Bootstrap:
   - `$('#modal').modal('show')`
   - `$('[data-toggle="tooltip"]').tooltip()`

3. Si se desea mantener jQuery, añadir un parche de compatibilidad:
   - Crear un script que implemente `$.fn.modal` y `$.fn.tooltip` usando la API de Bootstrap 5.
   - Esto evita rehacer inmediatamente todo el código JS.

## 5. Pruebas y ajustes

1. Probar cada página en el navegador:
   - Abrir `index.html`, `art.html`, `tet1.html`, `tet2.html`, `dictet.html`, `miniatura.html`, `modcre.html`.
   - Probar colapsado del menú, modales y tooltips.
   - Probar los formularios y controles de rango.

2. Corregir errores visuales o clases faltantes.
   - Ajustar clases de utilidades y contenedores según Bootstrap 5.
   - Revisar `navbar`, `cards`, `botones` y `formularios`.

3. Ejecutar pruebas funcionales en la UI:
   - Cargar plantilla
   - Insertar título
   - Generar contenido
   - Descargar imagen
   - Mostrar modal de imágenes

## 6. Limpieza final

1. Eliminar cualquier referencia a Bootstrap 4 que quede en el proyecto.
2. Retirar `public/vendor/popper/popper.min.js` si ya no es necesario.
3. Confirmar que el `CSS` de Bootstrap 5 no entra en conflicto con estilos personalizados.
4. Documentar los cambios en el `README` o en una nota de commit.

## 7. Alternativa si se desea revertir

1. Volver a la rama anterior o restaurar desde respaldo si algo falla.
   - `git checkout main` o `git checkout -- <archivo>`
2. Revisar archivos específicos antes de aplicar nuevos cambios.

---

### Recomendación
Migrar primero en una sola página de prueba (`tet1.html` o `art.html`) y luego replicar los cambios al resto. Esto permite validar la compatibilidad con menos riesgo antes de ajustar todas las páginas.

---

## Estado final (completado)

Migración ejecutada en la rama `bootstrap5-migration`:

1. ✅ Bootstrap **5.3.3** descargado en local: `public/vendor/bootstrap5/` (`bootstrap.min.css` + `bootstrap.bundle.min.js`).
2. ✅ Las 7 páginas migradas: `index`, `tet1` (piloto), `tet2`, `dictet`, `art`, `miniatura`, `modcre`.
3. ✅ Atributos `data-*` → `data-bs-*`, `input-group-prepend` → `span.input-group-text`, `close` → `btn-close`, `btn-block` → `w-100`, `pos-f-t` eliminada (era código muerto, no existía ni en BS4).
4. ✅ Capa de compatibilidad `public/js/bootstrap5-compat.js` cargada en las 7 páginas: mantiene funcionando el código jQuery existente (`$().modal(...)`, `$().tooltip(...)`).
5. ✅ Eliminados `public/vendor/bootstrap/` (BS4) y `public/vendor/popper/` (ya los incluye el bundle de BS5).
6. ✅ Validación por HTTP: 7 páginas + 154 recursos responden 200; grep sin restos de BS4.

**Pendiente de verificación manual**: probar en navegador navbar colapsable, tooltips, modales y canvas en cada página antes del merge a `master`.
