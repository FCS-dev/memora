# Plan 005 — Gestión de notas en la interfaz

## 0. Alcance y supuestos

- Solo frontend (`frontend/`), módulo nuevo `src/features/notes/`. Sin cambios de backend ni dependencias nuevas (constitución #1).
- Reutiliza la sesión y el `request` con refresh automático de `shared/lib/http.ts` (RF-30, RF-31). El refresh ocurre en 401; si falla, `http` notifica a `AuthProvider` para cerrar sesión y dirigir al acceso (RF-40).
- "Líneas visuales" se implementa con truncado CSS (`line-clamp`), no con cálculo de caracteres (RF-5, RF-6).
- La vista de las tarjetas es **global** (un único control en el encabezado), persistida en `localStorage`, por defecto "card" (RF-4, RF-7, RF-32).
- Recordatorios pasados permitidos; no se necesita reloj en la lógica (RF-17).
- Contrato del backend (Spec 004/002): `GET /notes`, `GET /notes/archived`, `GET/PUT/DELETE /notes/{uuidNote}`, `PATCH /notes/{uuidNote}/position` con `{beforeUuid, afterUuid}`, `PATCH /notes/{uuidNote}/group` con `{group}`, `GET/POST /tags`. La respuesta de nota trae `tags` como nombres y crear/editar pide `tagIds`.

## 1. Archivos y responsabilidades

### Modelo (puro)
- `notes/model/types.ts` — `Note`, `NoteGroup`, `ViewMode`, `NoteFormValues` (checklist como `{text, checked}[]`), `NoteField`, payloads de crear/editar/reordenar/cambiar grupo. (RF-3, RF-12, RF-15..RF-18, RF-41)
- `notes/model/validation.ts` — límites (título 1–200, contenido ≤2500, etiqueta 1–25, suma de claves del checklist ≤2500), `validateNoteForm`, `deriveChecklistItems`, `isNoteEmpty`, `charCount` (contenido o suma de ítems, para el contador), `buildChecklistRecord` (usa el `checked` del formulario), `buildCreatePayload`, `buildUpdatePayload`. (RF-15, RF-16, RF-17, RF-21, RF-22, RF-36, RF-41, RNF-3)
- `notes/model/grouping.ts` — `splitByGroup`, `resolveGroupForPin`. (RF-3, RF-27, RF-28)
- `notes/model/position.ts` — `resolveNeighborUuids` (teclado), `resolveReorderPayloadFromDrop`. (RF-23, RF-24, RF-26, RF-34)
- `notes/model/viewPreference.ts` — `readViewMode`, `writeViewMode` (global) con `storage` inyectado. (RF-4, RF-7, RF-32)
- `notes/model/errors.ts` — `mapNotesError` (400/404/500 → mensaje), detección de etiqueta duplicada; propaga el `detail` del servidor y el mensaje de sesión expirada. (RF-33, RF-40, RNF-8)
- `notes/model/copy.ts` — textos visibles en español neutro. (RNF-5)

### API
- `notes/api/notesApi.ts` — `listNotes`, `listArchivedNotes`, `createNote`, `updateNote`, `deleteNote`, `reorderNote`, `changeNoteGroup`, `updateChecklistItem`. (RF-1..RF-31, RF-42)
- `notes/api/tagsApi.ts` — `listTags`, `createTag`. (RF-16, RF-33)

### Estado (hooks)
- `notes/hooks/useNotes.ts` — carga activas+archivadas, estados `loading/error`, y acciones con actualización optimista + rollback (`setChecklistItemChecked` incluida). (RF-9, RF-10, RF-11, RF-23, RF-27, RF-28, RF-29, RF-42, RNF-7)
- `notes/hooks/useNoteEditor.ts` — formulario, `dirty`, validación, guardar/cancelar, `toggleChecklistItemChecked`. (RF-12, RF-13, RF-14, RF-21, RF-22, RF-41)

### Componentes
- `notes/components/PanelSwitch.tsx` — selector segmentado "Notas"/"Archivadas" (control del panel visible). (RF-1, RF-2)
- `notes/components/NotesPanel.tsx` — una lista por panel en **grid** (`grid-cols-1` en móvil, `md:[grid-template-columns:repeat(auto-fit,minmax(348px,500px))]` desde `md`), estados carga/error/sección vacía. (RF-3, RF-9, RF-10, RF-11, RF-39)
- `notes/components/ViewModeToggle.tsx` — alterna card/lista (control global). (RF-4, RF-7)
- `notes/components/NoteCard.tsx` — tarjeta card/lista con `bg-base-200` y `text-xs`, extracto (`line-clamp-12`/`line-clamp-2`, texto con `whitespace-pre-line` y `leading-5`), checklist (`leading-5`), indicador "..." cuando el checklist se recorta, leyenda de última actualización, **casillas de checklist habilitadas fuera de la región que abre la nota** (evita interactivos anidados), etiquetas, recordatorio, controles y asa con **Pointer Events**. (RF-3, RF-5, RF-6, RF-8, RF-23, RF-24, RF-25, RF-26, RF-35, RF-38, RF-42, RF-43)
- `notes/components/NoteControls.tsx` — íconos fijar/desfijar, archivar/restaurar, eliminar, arrastrar. (RF-19, RF-25, RF-27, RF-28, RF-29)
- `notes/components/NoteEditor.tsx` — formulario editable: título, texto/checklist con casillas marcables, etiquetas, recordatorio, fijada; derivación por líneas y contador `N/2500`; ítem del checklist en fila base 1.5rem con `textarea` auto-ajustable (alto base 1rem, hasta 3 líneas) y tipografía 0.75rem; textos de ayuda (placeholder) en los campos vacíos. (RF-12..RF-18, RF-21, RF-22, RF-36, RF-41, RF-49, RF-52, RF-55)
- `notes/components/TagPicker.tsx` — botón que abre la modal de etiquetas: campo de alta con "+" dinámico (con placeholder), casillas de las disponibles, chips de las seleccionadas y cierre con "x"/click fuera. (RF-16, RF-33, RF-53, RF-55)
- `notes/components/ReminderInput.tsx` — fecha/hora con botón de cruz para quitarla cuando hay valor. (RF-17, RF-51)
- `shared/components/ConfirmDialog.tsx` (nuevo) — confirmación de eliminar y de salir con cambios. (RF-14, RF-19)
- `shared/components/IconButton.tsx` (nuevo) — botón con ícono accesible. (RNF-2)
- `notes/pages/NotesPage.tsx` — compone el encabezado (vista + selector de panel) y el editor; incluye el botón "Nueva nota" (texto en `lg+`, centrado, y FAB circular con "+" en `<lg`) solo en la pantalla de listado. (RF-1, RF-2, RF-4, RF-12, RF-37, RF-54)

### Rutas / integración
- `app/routing.ts` — agrega rutas de notas del usuario. (RF-30)
- `app/App.tsx` — monta `/home` (lista), `/home/new` y `/home/:uuid` (editor) bajo `RequireAuth`+`RequireRole USER`. (RF-12, RF-30)
- `features/home/pages/UserHomePage.tsx` — reemplaza el placeholder por `NotesPage` (reusa `HomeHeader`). (RF-1, RF-30)

## 2. Funciones puras (dependencias externas como parámetros explícitos)

- `deriveChecklistItems(raw: string): string[]` — separa por `\n`, recorta espacios, descarta vacías. (RF-15)
- `isNoteEmpty(values): boolean` — sin título ni ítems ni contenido. (RF-22)
- `validateNoteForm(values, limits): FormErrors` — `limits` explícito. (RF-21, RNF-3)
- `charCount(values): number` — contenido (sin checklist) o suma de longitudes de los ítems recortados (con checklist). (RF-36)
- `buildCreatePayload(values, tagIds)` / `buildUpdatePayload(values, tagIds)`. (RF-16, RF-18)
- `splitByGroup(notes)` → `{ pinned, others, archived }`. (RF-3)
- `resolveGroupForPin(isPinned)` → `PINNED | NOT_PINNED`. (RF-27, RF-29)
- `resolveNeighborUuids(ordered, movingUuid, direction)` — `beforeUuid`/`afterUuid` (vacío en extremos); `null` si no aplica. (RF-24, RF-26, RF-34)
- `resolveReorderPayloadFromDrop(ordered, movingUuid, targetIndex)`. (RF-23, RF-24)
- `readViewMode(storage, fallback)` / `writeViewMode(storage, mode)` — vista global. (RF-7, RF-32)
- `mapNotesError(error)` — sin depender de `window`. (RF-33, RNF-8)
- `noteToFormValues(note, tagIdsByName)` — mapea nombres de etiquetas a ids. (RF-12, RF-16)

## 3. Algoritmo (pseudocódigo)

```
LOAD:
  loading = true; error = null
  activas = GET /notes ; archivadas = GET /notes/archived
  grupos = splitByGroup(activas concat archivadas)   # archivadas ya vienen por fecha
  loading = false
  SI falla: error = mapNotesError; mostrar reintentar   # RF-9..RF-11

VIEW_MODE():
  mode = readViewMode(localStorage, 'card')
  al alternar: writeViewMode(localStorage, nuevo)

OPEN(uuid) -> ruta /home/{uuid}:
  note = buscar en memoria o GET /notes/{uuid}
  values = noteToFormValues(note, tagIdsByName)      # RF-12

TOGGLE_CHECKLIST(values):
  SI activa y hay contenido: items = deriveChecklistItems(contenido)   # RF-15
  SI activa y está vacío: items = [""]               # primera casilla
  SI desactiva: contenido = items.join("\n")

SAVE(values):
  SI isNoteEmpty(values): cancelar y volver            # RF-22
  errores = validateNoteForm(values)
  SI errores: mostrar mensajes, no guardar             # RF-21
  SI crear: POST /notes {..., tagIds}; SINO: PUT /notes/{uuid} {..., isPinned}
  recargar grupo afectado y volver                     # RF-13, RF-16..RF-18

CANCEL:
  SI dirty y tiene datos: confirmar salida             # RF-14
  volver                                                # (sin datos: RF-22)

CREATE_TAG(name):
  tag = POST /tags {tagName}                           # persiste al instante
  SI 400 duplicado: mostrar error y no duplicar        # RF-33
  agregar a tagIds y refrescar lista de etiquetas      # RF-16

REORDER_DRAG(uuid, targetIndex):
  {beforeUuid, afterUuid} = resolveReorderPayloadFromDrop(ordered, uuid, targetIndex)
  aplicar optimista; PATCH /notes/{uuid}/position       # RF-23, RF-24
  (arrastre con Pointer Events: mouse y táctil)
  SI falla: revertir y avisar                            # RNF-7

REORDER_KEYBOARD(uuid, direction):
  {beforeUuid, afterUuid} = resolveNeighborUuids(ordered, uuid, direction)
  SI null: no hacer nada                                 # RF-26, RF-34
  PATCH /notes/{uuid}/position

PIN(uuid, isPinnedActual):
  group = resolveGroupForPin(!isPinnedActual)
  PATCH /notes/{uuid}/group {group}                     # RF-27, RF-29

ARCHIVE(uuid):
  PATCH /notes/{uuid}/group {group: ARCHIVED}           # RF-28

DELETE(uuid):
  confirmar; DELETE /notes/{uuid}; quitar de la lista   # RF-19, RF-20

SESION:
  request() reintenta una vez tras refresh en 401       # RF-30, RF-31
  SI refresh falla: App dirige a /login
```

## 4. Cómo se expone (UI)

- Ruta `/home`: `HomeHeader` + encabezado (vista + selector Notas/Archivadas) + `NotesPanel` del panel activo + FAB "Nueva nota" en móvil. Default "Notas". (RF-1, RF-2, RF-4, RF-30)
- Ruta `/home/new` y `/home/{uuid}`: `NoteEditor` a pantalla completa (móvil primero), con guardar/cancelar. (RF-12..RF-18)
- `ViewModeToggle` único, en el encabezado; preferencia persistida. (RF-4, RF-7)
- `NoteCard` muestra extracto con `line-clamp`, etiquetas, recordatorio y controles; checklist ítem por ítem contado al límite. (RF-3, RF-5, RF-6, RF-8)
- API consumida: `GET /notes`, `GET /notes/archived`, `GET/POST/PUT/DELETE /notes[/{uuid}]`, `PATCH /notes/{uuid}/position`, `PATCH /notes/{uuid}/group`, `GET/POST /tags`. (RF-1..RF-33)

## 5. Decisiones técnicas (con alternativa descartada)

1. **Drag & drop con Pointer Events** (mouse y táctil unificados) desde el asa. Alternativa descartada: HTML5 DnD (no funciona en táctil) o `dnd-kit` (dependencia nueva, constitución #1).
2. **Truncado visual por CSS** (`line-clamp-12`/`line-clamp-2`) para "líneas visuales". Alternativa descartada: contar caracteres/líneas en JS (no refleja el render).
3. **Preferencia de vista global en `localStorage`**, por defecto card. Alternativa descartada: por panel (el control pedido es único) o solo estado en memoria (pierde al recargar).
4. **Editor como ruta dedicada** a pantalla completa. Alternativa descartada: modal (peor en móvil y accesibilidad).
5. **Estado con hooks propios** (`useState`/`useReducer`) sin librería. Alternativa descartada: Redux/Zustand (dependencia innecesaria, constitución #1).
6. **Derivación del checklist en el front** y envío de `checklistItems`; el backend revalida y decide. Alternativa descartada: enviar texto y parsear en el backend (fuera del contrato actual).
7. **Actualización optimista con rollback** en reordenar/fijar/archivar (feedback inmediato, RF-23). Alternativa descartada: esperar la respuesta del servidor en cada acción.
8. **Etiqueta nueva persistida de inmediato** (`POST /tags`) y luego asociada. Alternativa descartada: crear la etiqueta junto con la nota (no cumple RF-16).
9. **Diálogo de confirmación propio y accesible**. Alternativa descartada: `window.confirm` (no accesible/estilizable).
10. **Mapeo nombre↔id de etiquetas** con `GET /tags`, porque la respuesta trae nombres y el request pide ids. Alternativa descartada: cambiar el contrato del backend (fuera de esta spec).
11. **Ancho de tarjeta por breakpoint**: una sola columna fluida en móvil (`grid-cols-1`) y, desde `md`, `repeat(auto-fit,minmax(348px,500px))` (columnas según las notas del grupo, tope 500px, salto a más filas). Alternativa descartada: forzar `N` columnas rígidas (impide el wrap). (RF-39)
12. **Indicador "..." del checklist recortado** con una fila muted que reemplaza al último ítem visible (mantiene el límite de líneas), más el recorte CSS del texto (`line-clamp`). Alternativa descartada: medición en runtime del desborde (dependiente del render, más compleja). (RF-38)
13. **Ítem del checklist como `textarea` auto-ajustable** (`rows=1`, alto recalculado con `scrollHeight` acotado a 3 líneas). Alternativa descartada: `<input>` de una línea (no muestra textos largos) o `contenteditable` (accesibilidad y control más complejos). (RF-52)
14. **Etiquetas en modal con chips de seleccionadas fuera**. Alternativa descartada: mantener la lista de casillas siempre visible (la pide el requisito dentro de la modal) o un desplegable sin casillas (pierde el marcado múltiple). (RF-53)

## 6. Estrategia de tests (Vitest + Testing Library, jsdom)

- **Puras**: `validation` (límites, checklist por líneas, vacío/cancelación), `grouping`, `position` (vecinos en extremos, grupo de una nota), `viewPreference` (storage falso, global), `errors` (mapeo). (RF-3, RF-7, RF-15, RF-21, RF-22, RF-24, RF-26, RF-27, RF-33, RF-34)
- **`notesApi`/`tagsApi`**: rutas y métodos usados, mapeo de errores (fetch mockeado). (RF-33, RNF-8)
- **`PanelSwitch`**: default "Notas" y alternancia con "Archivadas"; `NotesPage` muestra el panel activo. (RF-1, RF-2, RF-4)
- **`NotesPanel`**: carga, error con reintento, sección vacía y disposición en grid. (RF-9, RF-10, RF-11)
- **`NoteCard`**: extracto card/lista, checklist contado, controles, atajos de teclado, fondo `base-200`, `text-xs`, texto con `whitespace-pre-line` (saltos de línea) e indicador "..." del checklist recortado; Archivadas sin arrastre. (RF-3, RF-5, RF-6, RF-8, RF-23..RF-26, RF-35, RF-38)
- **`NoteEditor`**: precarga, toggle de checklist y derivación, contador `N/2500`, validaciones, salida con cambios, guardar; ítem del checklist como `textarea` con `text-xs`, `min-h-4` y `max-h-12`; quitar recordatorio. (RF-12..RF-18, RF-21, RF-22, RF-36, RF-49, RF-51, RF-52)
- **`TagPicker`**: crear etiqueta al instante y error por duplicado; modal con "+" dinámico, marca de la nueva y cierre con "x"/click fuera. (RF-16, RF-33, RF-53)
- **`NotesPage` (integración, api mockeada)**: carga por grupos, fijar/desfijar, archivar/restaurar, eliminar con confirmación, reordenar optimista + rollback, FAB en móvil solo en listado, botón "Nueva nota" centrado y reorden táctil. (RF-1, RF-3, RF-4, RF-19, RF-20, RF-23, RF-27..RF-29, RF-37, RF-54, RNF-7)
- **`App`/routing**: guardas y acceso a notas solo con rol USER; redirección sin sesión. (RF-30)
- **`http`**: reintento único tras 401 y redirección si falla. (RF-31)
- Comandos: `npm run test`, `npm run lint`, `npm run build`.

## 7. Trazabilidad RF → plan

| RF | Dónde se cubre |
| --- | --- |
| RF-1, RF-2 | `PanelSwitch` en `NotesPage` |
| RF-3 | `NoteCard`, `splitByGroup`, `NoteEditor` (recordatorio/etiquetas) |
| RF-4, RF-7 | `ViewModeToggle` (global) en `NotesPage`, `viewPreference` |
| RF-5, RF-6, RF-8 | `NoteCard` (`line-clamp`, checklist ítem por ítem) |
| RF-9, RF-10, RF-11 | `useNotes`, `NotesPanel` |
| RF-12, RF-13 | `NoteEditor`, `useNoteEditor`, `notesApi` |
| RF-14 | `useNoteEditor` + `ConfirmDialog` |
| RF-15 | `deriveChecklistItems`, `NoteEditor` |
| RF-16, RF-33 | `TagPicker`, `tagsApi`, `mapNotesError` |
| RF-17 | `ReminderInput`, `validation` |
| RF-18 | `NoteEditor`, `buildCreatePayload` |
| RF-19, RF-20 | `NoteControls` + `ConfirmDialog`, `useNotes` |
| RF-21, RF-22 | `validation`, `NoteEditor` |
| RF-23, RF-24 | `NoteCard` (asa) + `position` + `useNotes` |
| RF-25 | `NoteCard` (deshabilita arrastre en Archivadas) |
| RF-26, RF-34 | `position.resolveNeighborUuids`, `NoteCard` (atajos) |
| RF-27, RF-28, RF-29 | `NoteControls`, `grouping.resolveGroupForPin`, `useNotes` |
| RF-30, RF-31 | `App`/guards, `http` (refresh en 401) |
| RF-32 | `useNotes` (recarga) + `viewPreference` (global) |
| RF-33 | `TagPicker`, `errors` |
| RF-35, RF-38 | `NoteCard` (saltos de línea, indicador "...") |
| RF-36 | `validation.charCount`, `NoteEditor` (contador `N/2500`) |
| RF-37 | `NotesPage` (FAB solo en listado) |
| RF-39 | `NotesPanel` (grid responsive) |
| RF-43 | `NoteCard` (`leading-5`) |
| RF-32 | `NoteService` (`saveAndFlush`), `NoteCard` (leyenda) |
| RF-40 | `errors.mapNotesError`, `shared/lib/http` (`onUnauthorized`), `AuthProvider` |
| RF-41 | `types`/`validation`, `useNoteEditor`, `NoteEditor` |
| RF-42 | `notesApi.updateChecklistItem`, `useNotes.setChecklistItemChecked`, `NoteCard` |
| RF-49, RF-52 | `NoteEditor` (ítem `textarea` auto-ajustable, 0.75rem, fila base 1.5rem, máx 3 líneas) |
| RF-51 | `ReminderInput` (botón de cruz) |
| RF-53 | `TagPicker` (modal de etiquetas) |
| RF-54 | `NotesPage` (botón "Nueva nota" centrado) |
| RF-55 | `TextField`/`PasswordInput` (prop `placeholder`), `NoteEditor`, `TagPicker`, `copy.ts` |
| RNF-1 | clases responsive (`sm/md/lg/xl`) |
| RNF-2 | componentes semánticos, foco, `ConfirmDialog`, atajos |
| RNF-3 | `validation` + revalidación backend |
| RNF-4 | no se decide autorización en el front (guards según rol del backend) |
| RNF-5 | `copy.ts` |
| RNF-6 | `NotesPanel` (carga/error; vacío sin contenido) |
| RNF-7 | `useNotes` (rollback) |
| RNF-8, RNF-9 | `mapNotesError`, sin logs con datos |

## 8. Riesgos y pendientes

- El truncado "visual" depende del render: la verificación del recorte es visual/manual.
- Reorden táctil resuelto con Pointer Events (mouse y táctil); se acompaña con atajos de teclado (RF-26).
- La respuesta de nota trae etiquetas por nombre: requiere `GET /tags` para mapear a ids al editar.
- Sin paginación: con muchas notas, el render puede ser costoso (fuera de alcance optimizar).
