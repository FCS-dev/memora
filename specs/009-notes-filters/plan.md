# Plan 009 — Filtros de notas (recordatorio y etiquetas)

Estado: aprobado

Cubre: RF-1 .. RF-14, RNF-1 .. RNF-5 (spec `specs/009-notes-filters/spec.md`).

## 0. Concepto rector

- Nueva **barra de filtros** en el listado de notas: fila de chips visible durante carga y
  vacío, con `Todos`, `Con recordatorio`, las 5 etiquetas filtrables más frecuentes y un
  disparador `Ver etiquetas` que abre una **hoja inferior** con todas.
- Filtrado **client-side** sobre las notas ya cargadas por `useNotes`.
- El estado del filtro vive en un **contexto por encima de las rutas** (en memoria): se
  conserva al cambiar de panel/vista y al abrir y volver de una nota, y se pierde al recargar
  (RF-14).

## 1. Archivos y responsabilidades

### Frontend — nuevos
- `features/notes/model/filters.ts` — tipos (`NotesFilter`, `TagOption`, `TagsChangedDetail`) y
  funciones puras de filtrado, opciones de etiqueta y remapeo. → RF-2 .. RF-5, RF-13
- `features/notes/context/notesFilterContext.ts` — `NotesFilterContext` y su tipo de valor
  (`reminderOnly`, `tagIds`, `toggleReminder`, `toggleTag`, `clear`). → RF-6, RF-14
- `features/notes/context/NotesFilterProvider.tsx` — estado del filtro en memoria; remapea la
  selección ante `memora:tags-changed` (`merged`/`deleted`). → RF-13, RF-14
- `features/notes/hooks/useNotesFilter.ts` — acceso al contexto. → RF-14
- `features/notes/components/NotesFilterBar.tsx` — fila de chips (`Todos`, `Con recordatorio`,
  top 5 etiquetas) y disparador de la hoja; estado de error/carga de etiquetas con reintento.
  → RF-1, RF-3, RF-6, RF-7, RF-9
- `features/notes/components/TagFilterSheet.tsx` — hoja inferior con todas las etiquetas
  filtrables (checkboxes) y limpiar/cerrar. → RF-3, RNF-2, RNF-3

### Frontend — modificados
- `features/notes/model/types.ts` — reexportar/definir `NotesFilter { reminderOnly: boolean;
  tagIds: number[] }`. → RF-4, RF-5
- `features/notes/model/copy.ts` — textos de filtros y vacíos (incluido el combinado). → RNF-1,
  RF-6, RF-10
- `features/notes/pages/NotesPage.tsx` — lee el contexto, deriva opciones (desde las notas) y
  notas visibles, pasa `reorderEnabled: false` al filtrar, elige el mensaje de vacío por tipo
  y renderea `NotesFilterBar`; conserva el refresco de etiquetas ante `memora:tags-changed` y
  agrega estado de error de carga de etiquetas con reintento. → RF-1 .. RF-14
- `shared/lib/events.ts` — `emitTagsChanged(detail?)` y `subscribeTagsChanged(handler)` que
  entrega el `detail` (`merged`/`deleted`). → RF-13
- `features/account/components/PrivateTagsDialog.tsx` — emitir el evento con detalle: `deleted`
  al eliminar, `merged: [{ fromId, toId }]` al fusionar una privada en una global (el rename
  simple mantiene el id y no requiere remapeo). → RF-13
- `app/App.tsx` — envolver `<Routes>` con `NotesFilterProvider` para que el estado sobreviva a
  los cambios de ruta. → RF-14

### Frontend — sin cambios
- `features/notes/components/NotesPanel.tsx` — ya soporta `reorderEnabled` por sección y
  mensajes `emptyTitle`/`emptyMessage`. → RF-10, RF-12

### Backend
- Sin cambios. Se reutilizan `GET /notes`, `GET /notes/archived` y `GET /tags`.

## 2. Funciones puras (dependencias externas como parámetros)

Todas en `model/filters.ts`, sin efectos ni dependencias de React:

- `isFilterActive(filter: NotesFilter): boolean` → RF-1, RF-6, RF-12
- `toggleId(ids: number[], id: number): number[]` → RF-4
- `buildTagOptions(notes: Note[], tags: Tag[]): TagOption[]` — cuenta el uso de cada nombre en
  las notas actuales (incluidas archivadas), conserva las usadas (`usage > 0`), deduplica por
  nombre normalizado (gana la global) y ordena por `usage` desc y nombre asc. → RF-3, RF-12
- `frequentOptions(options: TagOption[], limit = 5): TagOption[]` → RF-3
- `pruneTagIds(ids: number[], options: TagOption[]): number[]` → RF-13
- `remapTagIds(ids: number[], detail: TagsChangedDetail): number[]` — aplica `merged`
  (`fromId → toId`) y quita `deleted`, deduplicando. → RF-13
- `resolveSelectedNames(ids: number[], options: TagOption[]): string[]` → RF-4, RF-5
- `filterNotes(notes: Note[], filter: { reminderOnly: boolean; tagNames: string[] }):
  Note[]` — recibe `notes` y el filtro resuelto a nombres; sin dependencias externas. → RF-2,
  RF-4, RF-5, RF-8, RF-11

## 3. Algoritmo (pseudocódigo)

**A. Opciones de etiqueta (uso live) — `buildTagOptions` → RF-3**
```
usage = {}
PARA n EN notes:                       # notas activas + archivadas
   PARA name EN conjunto(n.tags): usage[name] += 1
byName = {}
PARA t EN tags:
   SI (usage[t.tagName] ?? 0) == 0: continuar
   actual = byName[t.tagName]
   SI actual == null O (t.global Y NO actual.global): byName[t.tagName] = {t, usage}
options = ordenar(byName.valores, por usage desc, tagName asc)
```

**B. Filtrado — `filterNotes` → RF-2, RF-4, RF-5, RF-8, RF-11**
```
PARA n EN notes:
   SI filter.reminderOnly Y n.rememberAt == null: descartar      # recordatorio (pasado o futuro)
   SI filter.tagNames.length > 0 Y n.tags ∩ filter.tagNames = ∅: descartar   # OR entre etiquetas
   conservar
# recordatorio y etiquetas se combinan con AND
```

**C. Derivación en `NotesPage` → RF-1 .. RF-14**
```
{ reminderOnly, tagIds } = useNotesFilter()
options   = buildTagOptions(notes, tags)
frequent  = frequentOptions(options, 5)
active    = isFilterActive({ reminderOnly, tagIds })
nombres   = resolveSelectedNames(tagIds, options)
visibles  = active ? filterNotes(notes, { reminderOnly, tagNames: nombres }) : notes
grupos    = splitByGroup(visibles)                       # conserva Fijadas/Otras (RF-8)
sections  = [...] con reorderEnabled = !active           # RF-12
empty     = active ? vacíoPorTipo(reminderOnly, tagIds.length > 0) : vacío de panel  # RF-10
```

**D. Consistencia con etiquetas — RF-13**
```
# En NotesPage: recarga de tags/notas ante `memora:tags-changed` (ya existe).
# En NotesFilterProvider: remapea la selección.
al recibir detail:
   tagIds = remapTagIds(tagIds, detail)       # fusiones: fromId→toId; borradas: fuera
al refrescar opciones (en NotesPage):
   tagIds = pruneTagIds(tagIds, options)      # descarta las que ya no están usadas
```

## 4. Interfaz del sistema

Solo UI (SPA); no hay API/CLI ni cambios de backend. El estado del filtro es un contexto en
memoria montado por encima de las rutas.

- **Ubicación**: `NotesFilterBar` entre la barra de controles (`NotesPage.tsx:127-137`) y
  `NotesPanel` (`NotesPage.tsx:138`), visible solo en `mode === 'list'` (RF-9).
- **Controles**: fila de chips con `role="group"` `aria-label="Filtros"`, cada chip `button`
  con `aria-pressed`; fila con scroll horizontal (`overflow-x-auto`). → RF-7, RNF-2, RNF-3
  - `Todos` (siempre; resaltado con filtro activo) → RF-6
  - `Con recordatorio` → RF-2
  - top 5 etiquetas frecuentes → RF-3
  - `Ver etiquetas` → abre `TagFilterSheet` (modal-bottom, scroll vertical) → RF-3, RNF-2
  - ante error de carga de etiquetas: mensaje + `Reintentar`; `Con recordatorio` sigue → RF-3
- **Vacío**: `NotesPanel` recibe `emptyTitle`/`emptyMessage` del filtro cuando aplica. → RF-10
- **Persistencia**: `NotesFilterProvider` en `App.tsx` sobre `<Routes>`; se pierde al recargar.
  → RF-14

## 5. Decisiones justificadas

- **D1 — Filtrar en el frontend sobre las notas ya cargadas.** Alternativa descartada:
  query params en `GET /notes` (requeriría backend, migración y refetch por filtro). El
  filtro es una decisión de presentación sobre datos propios ya autorizados; la autorización
  sigue en el backend (art. 3 y 5 de la constitución). → RF-8, RF-11, RNF-4
- **D2 — Ofertar solo etiquetas usadas, con uso calculado desde las notas actuales.** No se usa
  `noteCount` del servidor (queda obsoleto tras crear/editar/eliminar). Alternativa
  descartada: `noteCount` del catálogo (chips desactualizados). → RF-3, RF-12
- **D3 — Chips + hoja inferior (1 toque frecuente / 2 el resto).** Alternativa descartada:
  un único botón "Filtros" con hoja (2 toques siempre, menor descubribilidad). → RF-1, RF-3
- **D4 — Estado del filtro en un contexto por encima de las rutas (en memoria).** Alternativa
  descartada A: `localStorage` (sobrevive recargas, contradice RF-14). Alternativa descartada
  B: estado dentro de `NotesPage` (se pierde al abrir/volver de una nota). → RF-14
- **D5 — Deshabilitar reordenar con filtro activo** vía `reorderEnabled: false` (oculta asa y
  flechas en `NoteControls`). Alternativa descartada: calcular vecinos sobre el orden completo
  (mayor complejidad y UX ambigua). → RF-12
- **D6 — Selección por id de etiqueta** (no por nombre): el renombrado simple conserva el id y
  la selección sin trabajo extra. → RF-13
- **D7 — Ampliar `memora:tags-changed` con `merged`/`deleted`** para reasignar la fusión
  privada→global. Alternativa descartada: descartar la selección al fusionar (incumple RF-13).
  → RF-13
- **D8 — Sin dependencia nueva** (chips y hoja propios). Alternativa descartada: librería
  headless (art. 1). → RF-1, RF-3
- **D9 — El vacío del filtro tiene prioridad sobre el de panel**, con mensaje combinado cuando
  están activos recordatorio y etiquetas. Alternativa descartada: mostrar el vacío de panel
  (ocultaría que el filtro no tuvo resultados). → RF-10

## 6. Estrategia de tests

Backend: sin cambios → no requiere tests nuevos; se corre `cd backend && mvn test` (sin `.env`)
para confirmar que sigue verde.

Frontend (`npm run test`, luego `npm run lint` y `npm run build`):
- `filters.test.ts` — `filterNotes` (recordatorio pasado y futuro, OR entre etiquetas, AND con
  recordatorio, sin filtro devuelve todo); `buildTagOptions` (uso desde notas, excluye no
  usadas, dedup global/privada con gana-global, orden desc/alfa); `frequentOptions`;
  `pruneTagIds`; `remapTagIds` (fusión y borrado); `resolveSelectedNames`; `toggleId`;
  `isFilterActive`. → RF-2..RF-5, RF-8, RF-11, RF-12, RF-13
- `NotesFilterProvider.test.tsx` — persiste entre remontajes de consumidores; remapea la
  selección ante `memora:tags-changed` con `merged`/`deleted`; `clear` resetea. → RF-13, RF-14
- `NotesFilterBar.test.tsx` — chips, `aria-pressed` al activar, top 5 + `Ver etiquetas`, sin
  etiquetas usadas solo queda recordatorio, error de etiquetas con reintento. → RF-1, RF-3,
  RF-6, RF-7, RF-9
- `TagFilterSheet.test.tsx` — lista completa, toggle, limpiar, cierre con Escape, retorno de
  foco, scroll. → RF-3, RNF-2, RNF-3
- `notesFilters.test.tsx` (integración `NotesPage`/`App`, Vitest + Testing Library) — filtra la
  lista; con filtro activo no hay asa/flechas; vacío por tipo (y combinado); persiste al
  cambiar de panel/vista **y al abrir y volver de una nota**; se actualiza en vivo al
  crear/editar/eliminar; poda la selección ante `memora:tags-changed`; error de etiquetas con
  reintento. → RF-8, RF-10, RF-11, RF-12, RF-13, RF-14, RNF-2, RNF-3

## 7. Riesgos y notas

- **Cambio de firma del evento**: `emitTagsChanged`/`subscribeTagsChanged` y
  `PrivateTagsDialog` (Spec 008) se tocan; verificar los tests existentes de esa feature.
- **Reorder**: se apoya en `section.reorderEnabled`; con filtro debe quedar en `false` para no
  enviar `beforeUuid`/`afterUuid` incorrectos.
- **`Note.tags` es `string[]`** (nombres): el uso y el matcheo se hacen por nombre; el filtro
  guarda ids y traduce con `options`.
- **Solapamiento con FAB**: la hoja inferior debe quedar por encima (`z` > 50) y respetar
  `pb-24` del `main`.
- **Ancho en 375 px**: la barra va en su propia fila con scroll horizontal; no se toca la fila
  superior (ya tiene `ViewModeToggle` + `PanelSwitch`).

## 8. Cobertura de RF

- Barra y controles: RF-1, RF-3, RF-6, RF-7, RF-9 → `NotesFilterBar`, `copy`.
- Filtro recordatorio: RF-2 → `filterNotes`.
- Filtro etiquetas y combinación: RF-4, RF-5 → `filterNotes`, `resolveSelectedNames`, hoja.
- Alcance y vacíos: RF-8, RF-10, RF-11 → `splitByGroup`, vacíos por tipo/combinado.
- Consistencia y persistencia: RF-12, RF-13, RF-14 → `reorderEnabled`, `remapTagIds`,
  `NotesFilterProvider`.
- RNF-1..RNF-5 → copys neutros, accesibilidad de chips/hoja, sin desbordamiento, filtrado
  inmediato, sin datos de otros usuarios.
