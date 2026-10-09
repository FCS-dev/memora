# Tasks 004 — Identificador público y orden manual de notas

- [x] **T1. Agregar `NoteGroup` y el campo `uuidNote` en `Note`.**
  RF-1, RF-12
- Hecho cuando: existe el enum `NoteGroup (PINNED, NOT_PINNED, ARCHIVED)` y `Note` mapea `uuid_note` (`nullable=false`, `unique=true`, `length=36`); la suite compila.

- [x] **T2. Consultas de repositorio por grupo/orden y búsqueda por UUID.**
  RF-2, RF-5, RF-6, RF-12, RF-19, RF-20
- Hecho cuando: tests de repositorio (`@SpringBootTest` + `@Transactional`) verifican no-archivadas `PINNED`→`NOT_PINNED` por `position` desc, archivadas por `createdAt` desc (desempate por mayor id) y `findByUuidNoteAndUser`.

- [x] **T3. Funciones puras de posición y validación de UUID.**
  RF-7, RF-8, RF-9, RF-10, RF-11, RF-20
- Hecho cuando: unit tests verifican extremos vacíos (posición base), tope/fondo, punto medio, detección de falta de espacio entero/valor no positivo, renumeración con orden preservado y `isValidUuid` (malformado).

- [x] **T4. DTOs de nota (respuesta, alta, actualización, reorden, cambio de grupo).**
  RF-2, RF-3, RF-4, RF-7, RF-13, RF-15
- Hecho cuando: `NoteResponse` expone `uuidNote` y no `id`/`position`; `UpdateNoteRequest` exige título/contenido/checklist y `isPinned` opcional; `ReorderNoteRequest { beforeUuid, afterUuid }`; `ChangeNoteGroupRequest { group }`; los tests de validación pasan y los tests existentes que usaban `NoteResponse.id/position` quedan actualizados.

- [x] **T5. Servicio: alta, listados, obtención, borrado y actualización (PUT completo).**
  RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-15, RF-16, RF-19, RF-20
- Hecho cuando: `NoteServiceTest` verifica alta fijada/no fijada, rechazo de alta archivada, reintento de UUID ante colisión, listados, y actualización que cambia `isPinned`/desarchiva con campos obligatorios.

- [x] **T6. Servicio: reordenar por vecinos y cambio de grupo.**
  RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-17, RF-18
- Hecho cuando: `NoteServiceTest` verifica tope/fondo/entre dos, renumeración, vecina inválida (archivada/otro grupo/ajena/propia), rechazo de reordenar archivada, cambio de grupo a activo (arriba) y a `ARCHIVED` (conserva `position`, `isPinned=false`), y rechazo de mismo grupo.

- [x] **T7. Controller: rutas por UUID, archivadas, reordenar y cambiar grupo.**
  RF-2, RF-5, RF-6, RF-7, RF-13, RF-15, RF-19, RF-20
- Hecho cuando: `NoteControllerTest` (MockMvc) verifica rutas `{uuidNote}`, `GET /notes/archived`, `PATCH .../position` y `.../group`, 400 por UUID malformado de nota o vecina y 404 por inexistente/ajena.

- [x] **T8. Eliminar `lastNotePosition` y ajustar clientes/tests existentes.**
  Todas (derogación RF-15 de Spec 002)
- Hecho cuando: se quita `User.lastNotePosition` y sus usos en auth/admin, se actualizan los tests que la referenciaban y la suite `mvn test` compila y pasa.

- [x] **T9. Verificación final y documentación.**
  RNF-1, RNF-3, RNF-4, RNF-5
- Hecho cuando: `mvn test` y `mvn package -DskipTests` en verde, endpoints y esquema visibles en OpenAPI, tareas marcadas y `MEMORY.md` actualizado.
