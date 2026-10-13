# Tasks 005 — Gestión de notas en la interfaz

- [x] **T1. Modelo de datos, textos y preferencia de vista.**
  RF-3, RF-4, RF-7, RF-32, RNF-5
- Hecho cuando: existen `types.ts`, `copy.ts` y `viewPreference.ts`; `readViewMode`/`writeViewMode` operan por panel con un `storage` inyectado (default "card") y sus tests pasan.

- [x] **T2. Validación y transformaciones puras.**
  RF-15, RF-16, RF-18, RF-21, RF-22, RNF-3
- Hecho cuando: `deriveChecklistItems` (ignora vacías, recorta espacios), `isNoteEmpty`, `validateNoteForm` (límites 1–200 / ≤2500 / 1–25), `buildCreatePayload` y `buildUpdatePayload` tienen tests en verde.

- [x] **T3. Agrupación y lógica de posición.**
  RF-3, RF-24, RF-26, RF-27, RF-29, RF-34
- Hecho cuando: `splitByGroup`, `resolveGroupForPin`, `resolveNeighborUuids` (extremos con before/after vacíos, grupo de una sola nota) y `resolveReorderPayloadFromDrop` tienen tests en verde.

- [x] **T4. APIs de notas y etiquetas + mapeo de errores.**
  RF-1 .. RF-29, RF-33, RNF-8
- Hecho cuando: `notesApi` y `tagsApi` cubren listar (activas/archivadas), crear, editar, eliminar, reordenar, cambiar grupo y crear/listar etiquetas; `mapNotesError` traduce 400/404/500 y detecta duplicado; los tests con `fetch` mockeado pasan.

- [x] **T5. Hooks de datos y del editor.**
  RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-21, RF-22, RF-23, RF-27, RF-28, RF-29, RNF-7
- Hecho cuando: `useNotes` gestiona `loading`/`error` y acciones optimistas con rollback; `useNoteEditor` maneja precarga, `dirty`, validación y guardar/cancelar; los tests de hooks (renderHook) pasan.

- [x] **T6. Tarjeta, controles y cambio de vista.**
  RF-3, RF-5, RF-6, RF-8, RF-14, RF-19, RF-23, RF-24, RF-25, RF-26
- Hecho cuando: `NoteCard` (extracto `line-clamp-12`/`line-clamp-2`, checklist ítem por ítem, etiquetas, recordatorio, asa y atajos de teclado), `NoteControls`, `ViewModeToggle`, `IconButton` y `ConfirmDialog` tienen tests de componente en verde; Archivadas no habilita arrastre.

- [x] **T7. Editor de nota y selector de etiquetas.**
  RF-12, RF-13, RF-15, RF-16, RF-17, RF-18, RF-21, RF-22, RF-33
- Hecho cuando: `NoteEditor` + `TagPicker` + `ReminderInput` permiten crear/editar con derivación por líneas, crear etiqueta al instante (error si duplica), validar y confirmar salida; los tests pasan.

- [x] **T8. Acordeón y página de notas.**
  RF-1, RF-2, RF-3, RF-9, RF-10, RF-11
- Hecho cuando: `NotesAccordion` (principal con Fijadas y Otras; Archivadas plegado, plegado mutuo) y `NotesPage` integran las piezas; tests de integración con api mockeada cubren carga por grupos, error/reintento y sección vacía.

- [x] **T9. Rutas, guardas y manejo de sesión.**
  RF-12, RF-30, RF-31
- Hecho cuando: `/home` (lista), `/home/new` y `/home/{uuid}` quedan bajo `RequireAuth`+`RequireRole USER`; el reintento por 401 y la redirección al fallar el refresh tienen tests en verde.

- [x] **T10. Verificación final y documentación.**
  RNF-1, RNF-2, RNF-4, RNF-6, RNF-9
- Hecho cuando: `npm run test`, `npm run lint` y `npm run build` pasan; se revisan responsive (sm/md/lg/xl) y accesibilidad (WCAG 2.1 AA) de las vistas; `tasks.md` marcado y `MEMORY.md` actualizado.

- [x] **T11. Revisión de UI: vista global, FAB, grid, fondo y drag táctil.**
  RF-4, RF-7, RF-23, RF-32, RNF-1, RNF-2
- Hecho cuando: la vista es un control único antes del acordeón (persistida y global), el botón "Nueva nota" es FAB circular con "+" por debajo de `lg` y texto en `lg+`, las tarjetas van en grid (`minmax(285px,367px)` en `sm+`), con fondo `base-200` y `text-xs`, y el reorden funciona con Pointer Events en táctil (y se desactiva en Archivadas); `npm run test`, `npm run lint` y `npm run build` en verde.

- [x] **T12. Extracto de texto respeta los saltos de línea.**
  RF-35
- Hecho cuando: la nota de texto muestra el contenido con `whitespace-pre-line` (cada `ENTER` es una línea) manteniendo el recorte `line-clamp` de la vista; test de componente en verde.

- [x] **T13. Ancho responsive de las tarjetas.**
  RF-39
- Hecho cuando: en móvil las tarjetas van en una columna fluida que no desborda (367px hasta antes de 767px) y desde `md` la grilla usa columnas fijas de 348px; verificación visual 320–1280.

- [x] **T14. Contador de caracteres en el editor.**
  RF-36
- Hecho cuando: `charCount` (contenido o suma de ítems recortados) tiene test y `NoteEditor` muestra `N/2500` del campo activo, marcando el exceso; tests en verde.

- [x] **T15. Ocultar el botón flotante "+" en creación/edición.**
  RF-37
- Hecho cuando: el FAB "Nueva nota" solo se renderiza en el listado (`mode === 'list'`) y hay test de rutas que verifica su ausencia en el editor.

- [x] **T16. Indicador "..." cuando el extracto se recorta.**
  RF-38
- Hecho cuando: si el checklist tiene más ítems que el límite de la vista se muestra una marca de continuación ("...") sin superar el límite de líneas (el texto lo cubre `line-clamp`); test de componente en verde.

- [x] **T17. Verificación final y documentación.**
  RNF-1, RNF-5, RNF-6
- Hecho cuando: `npm run test`, `npm run lint` y `npm run build` pasan; se revisan responsive y estados en navegador; `tasks.md` marcado y `MEMORY.md` actualizado.

- [x] **T18. Errores con el motivo del servidor y sesión expirada.**
  RF-40
- Hecho cuando: `mapNotesError` propaga el `detail` del servidor y muestra un mensaje específico cuando la sesión expira; `http` avisa al proveedor de sesión si el refresh falla; tests en verde.

- [x] **T19. Casillas de checklist editables (editor y tarjetas).**
  RF-41, RF-42
- Hecho cuando: el formulario del editor lleva `{text, checked}` por ítem y permite marcarlas; `NoteCard` (reestructurada para no anidar interactivos) muestra casillas habilitadas en card, lista y Archivadas que disparan `PATCH /notes/{uuid}/checklist` de forma optimista con reversión; `npm run test`, `npm run lint` y `npm run build` en verde.

- [x] **T20. Selector Notas/Archivadas, leyenda de actualización, line-height y grid.**
  RF-1, RF-2, RF-3, RF-32, RF-39, RF-43
- Hecho cuando: el encabezado tiene un selector segmentado "Notas"/"Archivadas" (default Notas) que alterna el panel; la tarjeta muestra la última fecha/hora de actualización (refrescada en la respuesta de cada mutación); contenido y checklist usan `line-height` 1.25rem; desde `md` la grilla reparte las notas del grupo con `minmax(348px, 500px)` y salta a más filas; `npm run test`, `npm run lint` y `npm run build` en verde.

- [x] **T21. Ícono de recordatorio, tamaño de la leyenda y ancho del main.**
  RF-3, RF-44
- Hecho cuando: el recordatorio se muestra con un ícono de reloj; la leyenda de actualización usa `0.65rem`; el `main` es 100% por debajo de 2560px y 90% desde 2560px; `npm run test`, `npm run lint` y `npm run build` en verde.

- [x] **T22. Rediseño del editor y pills de etiquetas.**
  RF-3, RF-45, RF-46, RF-47, RF-48, RF-49
- Hecho cuando: Título/Recordatorio/Nueva etiqueta usan floating label con recuadro; los labels son "Nota"/"Lista"; modo checklist y fijada son botones de ícono con `aria-pressed`; eliminar ítem y agregar etiqueta son botones SVG (cruz/más) sin borde; el input de ítem solo muestra borde inferior con altura 1rem; las etiquetas de la tarjeta ocupan una línea y muestran "..." al desbordar (medición real); `npm run test`, `npm run lint` y `npm run build` en verde.

- [x] **T23. Ajustes finos del editor.**
  RF-50
- Hecho cuando: el editor no muestra el título ni los rótulos "Nota"/"Lista"; el recordatorio (ancho 25) queda a la derecha de los botones de checklist/pin; el fieldset de la lista no tiene gap; la sección de etiquetas usa 0.75rem; `npm run test`, `npm run lint` y `npm run build` en verde.

- [x] **T24. Quitar el recordatorio desde el editor.**
  RF-51
- Hecho cuando: `ReminderInput` muestra un botón de cruz junto al campo solo cuando hay recordatorio y al pulsarlo lo vacía; test de componente en verde.

- [x] **T25. Tipografía, altura y crecimiento de los ítems del checklist.**
  RF-49, RF-52
- Hecho cuando: los ítems usan 0.75rem con fila base de 1rem (checkbox/asa/cruz ajustados) y el campo es un `textarea` que crece hasta 3 líneas y luego desplaza; tests de componente en verde. (Revisado en T29: la fila base pasa a 1.5rem.)

- [x] **T26. Etiquetas en ventana modal.**
  RF-53
- Hecho cuando: un botón abre una modal con el campo de nueva etiqueta (botón "+" dinámico) y las casillas de las disponibles; la nueva se agrega y queda marcada; cierra con "x" o click fuera; tests en verde.

- [x] **T27. Centrar el botón "Nueva nota" en el listado.**
  RF-54
- Hecho cuando: en escritorio el botón queda centrado con el control de vista a la izquierda y el selector Notas/Archivadas a la derecha; test en verde.

- [x] **T28. Verificación final y documentación.**
  RF-49, RF-51 .. RF-54, RNF-2
- Hecho cuando: `npm run test`, `npm run lint` y `npm run build` pasan; se revisa en navegador el crecimiento de ítems y la modal; `tasks.md` marcado y `MEMORY.md` actualizado.

- [x] **T29. Altura base de la fila del ítem a 1.5rem.**
  RF-52
- Hecho cuando: el `div` que agrupa los elementos de cada ítem usa `min-h-6` (1.5rem) manteniendo los elementos internos centrados y el crecimiento del texto hasta 3 líneas; test de componente en verde.

- [x] **T30. Placeholders en el editor y limpieza de voseo.**
  RF-55, RNF-1
- Hecho cuando: Título, contenido, ítem del checklist y nueva etiqueta muestran un texto de ayuda (neutro, sin voseo) cuando están vacíos; `notesCopy` no contiene voseo; tests de componente en verde.
