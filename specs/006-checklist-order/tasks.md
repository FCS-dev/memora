# Tasks 006 — Checklist ordenado, focus y estado vacío

- [x] **T1. Crear DTO `ChecklistItem` y actualizar request/response del backend.**
  RF-1
  - Hecho cuando: `ChecklistItem`, `CreateNoteRequest`, `UpdateNoteRequest`, `NoteResponse` y `ChecklistPayload` usan `List<ChecklistItem>` y compilan.

- [x] **T2. Actualizar validador `@ValidChecklist` para lista ordenada.**
  RF-1, RNF-4
  - Hecho cuando: `ChecklistValidator` valida lista no vacía, al menos un texto no en blanco y suma de longitudes ≤ 2500; sus tests pasan.

- [x] **T3. Adaptar `NoteService` a lista ordenada.**
  RF-2, RF-3, RF-6
  - Hecho cuando: `toJson`/`fromJson` manejan `List<ChecklistItem>`, `updateChecklistItem` busca por texto y `toResponse` conserva el orden; tests de `NoteServiceTest` en verde.

- [x] **T4. Ejecutar migración de datos en PostgreSQL.**
  RF-2
  - Hecho cuando: el script SQL convierte `content_json` de objeto a arreglo ordenado y el backend lee las notas existentes correctamente.

- [x] **T5. Actualizar tests del backend.**
  RF-1, RF-2, RF-3
  - Hecho cuando: `NoteControllerTest` y `FieldLengthValidationTest` pasan con el nuevo modelo.

- [x] **T6. Adaptar tipos y validación del frontend al array ordenado.**
  RF-1, RF-2, RF-3
  - Hecho cuando: `types.ts` y `validation.ts` usan `ChecklistItemForm[]`, `noteToFormValues` recibe array y `buildChecklistPayload` devuelve array; tests de validación en verde.

- [x] **T7. Actualizar API y componente `NoteCard` del frontend.**
  RF-3
  - Hecho cuando: `notesApi.ts` y `NoteCard.tsx` manejan el array ordenado y los tests existentes pasan.

- [x] **T8. Implementar reordenamiento de ítems en el editor.**
  RF-4, RF-5, RF-7
  - Hecho cuando: `useNoteEditor` expone `moveChecklistItem`, `NoteEditor` permite arrastrar ítems por la asa y el orden se refleja en la interfaz.

- [x] **T9. Añadir atajos de teclado para reordenar ítems.**
  RF-8
  - Hecho cuando: `Ctrl/Cmd + ↑/↓` mueve el ítem enfocado desde cualquier parte del renglón y los tests de teclado pasan.

- [x] **T10. Implementar auto-focus al agregar ítem.**
  RF-9
  - Hecho cuando: al hacer click en "Agregar ítem", el foco va al inicio del nuevo input y el test correspondiente pasa.

- [x] **T11. Mostrar leyenda de vacío en el listado.**
  RF-10, RF-11, RF-12
  - Hecho cuando: `NotesPanel` muestra el mensaje adecuado para panel principal y archivadas, y los tests de estado vacío pasan.

- [x] **T12. Verificación final y documentación.**
  RNF-1, RNF-2, RNF-3
  - Hecho cuando: `npm run test`, `npm run lint` y `npm run build` pasan; `tasks.md` está marcado; `MEMORY.md` se actualiza con la decisión de checklist ordenado.
