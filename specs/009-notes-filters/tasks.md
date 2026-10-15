# Tareas — Spec 009 (Filtros de notas)

Cubre: RF-1 .. RF-14, RNF-1 .. RNF-5. Plan: `specs/009-notes-filters/plan.md`.

- [x] **T1. Modelo y funciones puras de filtro.** RF-2 .. RF-5, RF-8, RF-11, RF-12, RF-13
- Archivos: `frontend/src/features/notes/model/filters.ts`, `frontend/src/features/notes/model/types.ts`, `filters.test.ts`.
- Hecho cuando: `NotesFilter {reminderOnly, tagIds}` y las puras `isFilterActive`, `toggleId`, `buildTagOptions(notes, tags)`, `frequentOptions`, `pruneTagIds`, `remapTagIds`, `resolveSelectedNames`, `filterNotes` están implementadas; `filters.test.ts` pasa (recordatorio pasado/futuro, OR entre etiquetas, AND con recordatorio, uso calculado desde las notas, dedup global/privada gana-global, orden usado desc/nombre asc, remapeo de fusión y borrado).

- [x] **T2. Evento `memora:tags-changed` con detalle.** RF-13
- Archivos: `frontend/src/shared/lib/events.ts`, `frontend/src/shared/lib/events.test.ts`.
- Hecho cuando: `emitTagsChanged(detail?)` y `subscribeTagsChanged(handler)` propagan `{ merged?, deleted? }`; los usos actuales de `emitTagsChanged()` siguen compilando; el test verifica el detalle recibido.

- [x] **T3. Emitir el detalle desde el CRUD de etiquetas.** RF-13
- Archivos: `frontend/src/features/account/components/PrivateTagsDialog.tsx`, `PrivateTagsDialog.test.tsx`.
- Hecho cuando: eliminar emite `{ deleted: [id] }`; renombrar a un nombre global (fusión) emite `{ merged: [{ fromId, toId }], deleted: [fromId] }`; el renombrado simple no emite mapeo; los tests de `PrivateTagsDialog` pasan y comprueban el payload.

- [x] **T4. Contexto del filtro por encima de las rutas.** RF-6, RF-13, RF-14
- Archivos: `frontend/src/features/notes/context/notesFilterContext.ts`, `NotesFilterProvider.tsx`, `hooks/useNotesFilter.ts`, `frontend/src/app/App.tsx`, `NotesFilterProvider.test.tsx`.
- Hecho cuando: el contexto expone `{ reminderOnly, tagIds, toggleReminder, toggleTag, clear }`; el provider se monta sobre `<Routes>` y sobrevive a remontajes de los consumidores; remapea la selección ante `memora:tags-changed` (`merged`/`deleted`); `clear` resetea; el test pasa.

- [x] **T5. Barra de filtros (chips).** RF-1, RF-3, RF-6, RF-7, RF-9
- Archivos: `frontend/src/features/notes/model/copy.ts`, `frontend/src/features/notes/components/NotesFilterBar.tsx`, `NotesFilterBar.test.tsx`.
- Hecho cuando: muestra `Todos` (siempre, resaltado con filtro activo), `Con recordatorio`, el top 5 de etiquetas usadas y `Ver etiquetas`; cada chip activo tiene `aria-pressed=true` y resaltado; sin etiquetas usadas solo queda `Con recordatorio`; no altera la fila superior; el test pasa.

- [x] **T6. Hoja inferior de etiquetas.** RF-3, RNF-2, RNF-3
- Archivos: `frontend/src/features/notes/components/TagFilterSheet.tsx`, `TagFilterSheet.test.tsx`.
- Hecho cuando: lista todas las etiquetas filtrables con checkboxes y limpiar/cerrar; `Escape` cierra y el foco vuelve al disparador; el contenedor hace scroll vertical; el test pasa.

- [x] **T7. Integración en `NotesPage` y estados.** RF-1 .. RF-14, RNF-1 .. RNF-5
- Archivos: `frontend/src/features/notes/pages/NotesPage.tsx`, `notesFilters.test.tsx`.
- Hecho cuando: al activar filtros la lista se acota (AND/OR) conservando agrupamiento Fijadas/Otras y orden; con filtro activo no se ofrecen asa/flechas de reordenamiento; el vacío por tipo (y combinado) tiene prioridad sobre el del panel; el filtro persiste al cambiar de panel/vista y al abrir/volver de una nota; la lista se actualiza en vivo al crear/editar/eliminar; la selección se poda ante `memora:tags-changed`; el error de carga de etiquetas muestra reintento; `npm run test`, `npm run lint`, `npm run build` y `mvn test` pasan.
