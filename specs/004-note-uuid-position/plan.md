# Plan 004 — Identificador público y orden manual de notas

## 0. Alcance y supuestos

- Solo backend. El frontend no tiene feature de notas (fuera de alcance de la spec).
- No se agregan dependencias nuevas (constitución #1): Java 21, Spring/JPA y Jakarta Validation ya presentes.
- Esquema con `ddl-auto: update`; se asume base sin datos (sin migración de filas).
- Transiciones de grupo sin adyacencia. Las notas archivadas conservan su `position` y se listan por fecha de creación.

## 1. Archivos y responsabilidades

### Modelo
- `note/Note.java` — agrega `uuidNote` (`@Column(name="uuid_note", nullable=false, unique=true, length=36)`); mantiene `position` (interna). (RF-1, RF-2, RF-12)
- `user/User.java` — elimina el campo `lastNotePosition` y su valor por defecto. (derogación RF-15 de Spec 002)
- `note/NoteGroup.java` (nuevo) — enum `PINNED, NOT_PINNED, ARCHIVED`. (RF-3..RF-6, RF-13)

### Repositorio
- `note/NoteRepository.java`
  - `Optional<Note> findByUuidNoteAndUser(String uuidNote, User user)`. (RF-2, RF-19, RF-20)
  - `List<Note> findByUserAndIsArchivedFalseOrderByIsPinnedDescPositionDescIdDesc(User user)`. (RF-5, RF-12)
  - `List<Note> findByUserAndIsArchivedTrueOrderByCreatedAtDescIdDesc(User user)`. (RF-6)
  - `List<Note> findByUserAndIsPinnedAndIsArchivedOrderByPositionDescIdDesc(User user, boolean pinned, boolean archived)`. (RF-7..RF-11)
  - `@Query` de máximo por grupo: `maxPosition(user, pinned, archived)`. (RF-3, RF-9, RF-13)

### Servicio
- `note/NoteService.java`
  - `create`: genera UUID reintentando hasta que sea único; rechaza archivada; grupo según `isPinned`; `position = max(grupo)+STEP` (o `STEP`). (RF-1, RF-3, RF-4)
  - `list` / `listArchived`. (RF-5, RF-6)
  - `getByUuid`, `delete`. (RF-2, RF-19, RF-20)
  - `update` (PUT completo: título, contenido y checklist obligatorios; `isPinned` opcional): aplica contenido y, si `isPinned` cambia o la nota está archivada, la mueve arriba de PINNED/NOT_PINNED (desarchiva); no acepta `isArchived` ni `position`. (RF-15, RF-16)
  - `reorder(uuid, beforeUuid, afterUuid)`: solo dentro del grupo actual; archivadas rechazadas; vecinos del mismo grupo; posición tope/fondo/punto medio + renumeración. (RF-7..RF-11, RF-18)
  - `changeGroup(uuid, destino)`: cualquier destino distinto; activo → `MAX+STEP`; ARCHIVED → `isPinned=false` y conserva `position`. (RF-13, RF-14, RF-17)
  - `rebalance(groupNotes)`. (RF-11)
- `auth/AuthService.java` y `admin/AdminBootstrap.java` — quitan `.lastNotePosition(0L)`. (derogación RF-15 de Spec 002)

### DTOs
- `note/dto/NoteResponse.java` — reemplaza `Long id` por `String uuidNote`; elimina `Long position`. (RF-2, RNF-3)
- `note/dto/CreateNoteRequest.java` — conserva `isPinned`; mantiene `isArchived` solo para rechazarlo. (RF-3, RF-4)
- `note/dto/UpdateNoteRequest.java` — `isPinned` como `Boolean` (nullable = no enviado); sin `isArchived`. (RF-15, RF-16)
- `note/dto/ReorderNoteRequest.java` (nuevo) — `{ beforeUuid: String, afterUuid: String }`; cadena vacía en un extremo sin vecina. (RF-7, RF-9, RF-10)
- `note/dto/ChangeNoteGroupRequest.java` (nuevo) — `{ group: PINNED|NOT_PINNED|ARCHIVED }`. (RF-13)

### API
- `note/NoteController.java` — rutas por `{uuidNote}`; agrega lectura de archivadas, reordenar y cambiar grupo (sección 4). (RF-2..RF-20)

## 2. Funciones puras (params explícitos)

- `resolveGroup(boolean isPinned, boolean isArchived): NoteGroup`. (RF-3..RF-6, RF-13)
- `targetIsPinned(NoteGroup group): Boolean`. (RF-13)
- `midpoint(long upper, long lower): long` → `floor((upper+lower)/2)`. (RF-10)
- `resolvePosition(String before, String after, OptionalLong max, OptionalLong min, long step): long` → ambos vacíos: `step`; solo vecina anterior: `min−step` (fondo); solo vecina siguiente: `max+step` (tope); ambas: `midpoint`. (RF-7, RF-9, RF-10)
- `topPosition(OptionalLong max, long step): long` → `max+step` o `step`. (RF-3, RF-9, RF-13)
- `needsRebalance(long candidate, long upper, long lower): boolean` → sin espacio entero (`candidate>=upper || candidate<=lower`) o `candidate<0`. (RF-11)
- `rebalancedPositions(int count, long step): List<Long>` → positivas decrecientes `step*count … step`. (RF-11)
- `isValidUuid(String value): boolean`. (RF-20)

No hay dependencia de reloj; ninguna función pura recibe “hoy”. La identidad y autorización se resuelven en el servicio.

## 3. Algoritmo (pseudocódigo)

```
CREATE(req):
  SI req.isArchived: rechazar 400                      # RF-4
  grupo = req.isPinned ? PINNED : NOT_PINNED           # RF-3
  position = (MAX(user, grupo) ?? 0) + STEP
  repetir: uuidNote = UUIDv4 hasta que no exista       # RF-1
  note = Note(uuidNote, flags, position); guardar

UPDATE(uuid, req):
  note = owned o 404
  aplicar title, content, checklistMode/items, rememberAt, tagIds   # RF-15 (título, contenido y checklist obligatorios)
  SI req.isPinned != null Y (note.archived O note.pinned != req.isPinned):
     destino = req.isPinned ? PINNED : NOT_PINNED
     note.archived = false; note.pinned = req.isPinned
     note.position = (MAX(user, destino) ?? 0) + STEP
  guardar

REORDER(uuid, beforeUuid, afterUuid):
  note = owned o 404; SI resolveGroup(note)==ARCHIVED: rechazar   # RF-18
  SI beforeUuid o afterUuid malformado: rechazar 400    # RF-20
  before = resolverVecina(beforeUuid) o 404 si inexistente/ajena # RF-20
  after  = resolverVecina(afterUuid)  o 404 si inexistente/ajena # RF-20
  SI before == note O after == note:
     rechazar 400                                        # RF-8
  SI before != null Y resolveGroup(before) != resolveGroup(note): rechazar 400  # RF-8
  SI after  != null Y resolveGroup(after)  != resolveGroup(note): rechazar 400  # RF-8
  pares = grupo(user, note) sin la nota, orden position DESC,id DESC
  (upper, lower) = posiciones de before/after dentro del grupo
  cand = resolvePosition(before, after, upper, lower)   # RF-7/RF-9/RF-10
  SI needsRebalance(cand, upper, lower):
     rebalancedPositions(pares); recalcular (upper, lower, cand)   # RF-11
  note.position = cand; guardar                         # RF-7

CHANGE_GROUP(uuid, destino):
  note = owned o 404; actual = resolveGroup(note)
  SI destino == actual: rechazar                       # RF-13
  SI destino == ARCHIVED:                              # RF-13/14/17
     note.archived = true; note.pinned = false         # conserva position
  SINO:
     note.archived = false; note.pinned = (destino == PINNED)
     note.position = (MAX(user, destino) ?? 0) + STEP
  guardar

REBALANCE(pares):                                       # RF-11/RNF-5 (solo grupos activos)
  para i, nota en pares (orden DESC): nota.position = STEP*(n-i)
```

## 4. Cómo se expone (API REST)

- `POST /notes` — crear (RF-3, RF-4)
- `GET /notes` — no archivadas, PINNED + NOT_PINNED (RF-5)
- `GET /notes/archived` — ARCHIVED por fecha de creación desc (RF-6)
- `GET /notes/{uuidNote}` — obtener (RF-2, RF-19, RF-20)
- `PUT /notes/{uuidNote}` — actualizar contenido + estado de fijada (RF-15, RF-16)
- `DELETE /notes/{uuidNote}` — eliminar
- `PATCH /notes/{uuidNote}/position` — reordenar dentro del grupo con `{ beforeUuid, afterUuid }` (RF-7..RF-11, RF-18)
- `PATCH /notes/{uuidNote}/group` — cambiar de grupo (RF-13, RF-14, RF-17)

Errores: `IllegalArgumentException` → 400 (RF-4, RF-8, RF-13; UUID malformado de la nota o de una vecina, RF-20); `UsernameNotFoundException` → 404 (RF-19, RF-20; vecina inexistente o ajena). UI/CLI: no aplica.

## 5. Decisiones técnicas (con alternativa descartada)

1. **Orden por grupo** (consultas filtradas por `isPinned`/`isArchived`). Alternativa descartada: secuencia global (colisiona entre grupos).
2. **Entero + STEP + rebalanceo**. Alternativa descartada: decimal/LexoRank (más complejidad, constitución #1).
3. **`position` oculta** en la API. Alternativa descartada: exponerla (RNF-3).
4. **Operaciones separadas**: `PUT` completo (título, contenido y checklist obligatorios; `isPinned` opcional), `PATCH position` (orden por vecinos before/after) y `PATCH group` (archivar/restaurar y mover de grupo). Alternativa descartada: un solo update con todos los flags.
5. **UUID generado en servidor** con reintento ante colisión, 36 con guiones (igual que el usuario); el constraint `unique` es red de seguridad. Alternativa descartada: exponer el id numérico o confiar solo en el constraint.
6. **Desempate por id interno mayor**. Alternativa descartada: por UUID o `updatedAt`.
7. **Archivadas conservan `position`** y se listan por `createdAt` desc. Alternativa descartada: reasignar `position` al archivar o ordenar por `updatedAt`.
8. **Eliminar `lastNotePosition`**. Alternativa descartada: dejarlo sin uso.
9. **Concurrencia: última escritura gana**, rebalanceo transaccional. Alternativa descartada: control optimista con versión.
10. **Referencias de vecinos**: malformada → 400; inexistente o ajena → 404. Alternativa descartada: 400 uniforme para toda referencia inválida.

## 6. Estrategia de tests (JUnit 5 + Mockito + AssertJ + MockMvc + `@SpringBootTest`)

- **Unitarias puras**: `resolveGroup`, `targetIsPinned`, `midpoint` (incluye negativos), `needsRebalance`, `rebalancedPositions`. (RF-3..RF-6, RF-9..RF-13)
- **`NoteServiceTest`**: alta (not-pinned/pinned; archivada rechazada; reintento de UUID), update PUT completo (campos obligatorios) con cambio de `isPinned` y desarchivado, reordenar por vecinos (extremos vacíos, grupo unitario, entre dos, renumeración por falta de espacio y por negativo), cambio de grupo a activo (arriba) y a ARCHIVED (conserva `position`, `isPinned=false`), rechazo de mismo grupo, vecina de otro grupo/ajena/propia, no reordenar archivada. (RF-3..RF-18)
- **`NoteControllerTest` (MockMvc)**: rutas por UUID, `GET /notes/archived`, `PATCH .../position` (before/after) y `.../group`, 400 (malformado) / 404 (inexistente o ajeno), validación de campos obligatorios del PUT. (RF-2, RF-5, RF-6, RF-15, RF-19, RF-20)
- **`NoteRepositoryTest`**: consultas por grupo/orden y desempate por id. (RF-5, RF-6, RF-12)
- **Validación de DTOs**: `CreateNoteRequest` (archivada rechazada), `UpdateNoteRequest`, `ReorderNoteRequest`, `ChangeNoteGroupRequest`. (RF-4, RF-7, RF-13)
- **Actualización de tests existentes**: quitar `.lastNotePosition(...)` (~20 archivos) y ajustar aserciones de `NoteResponse` (sin `id`/`position`).
- Comandos: `mvn test`, `mvn package -DskipTests` (backend). Frontend sin cambios.

## 7. Trazabilidad RF → plan

| RF | Dónde se cubre |
| --- | --- |
| RF-1, RF-2 | `Note.uuidNote` (reintento de unicidad), `NoteResponse`, endpoints por UUID |
| RF-3, RF-4 | `create`, `topPosition`, `CreateNoteRequest` |
| RF-5, RF-6 | `list`, `listArchived`, queries del repositorio |
| RF-7..RF-11 | `reorder(before,after)`, `resolvePosition`, `midpoint`, `needsRebalance`, `rebalancedPositions` |
| RF-12 | `IdDesc` en queries, desempate por id |
| RF-13, RF-14 | `changeGroup`, `ChangeNoteGroupRequest` |
| RF-15, RF-16 | `UpdateNoteRequest` (PUT completo), `update`, DTOs separados |
| RF-17 | `changeGroup` a ARCHIVED |
| RF-18 | `reorder` rechaza archivadas |
| RF-19, RF-20 | `findByUuidNoteAndUser`, validación de UUID (nota y vecinas), 404/400 |
| RNF-1 | `unique=true` en `uuid_note` |
| RNF-2 | resolución por usuario en el servicio |
| RNF-3 | `NoteResponse` sin id ni position |
| RNF-4 | persistencia en `position`/`uuid_note` |
| RNF-5 | `rebalance` |

## 8. Riesgos y pendientes

- `ddl-auto: update`: agrega `uuid_note` pero no elimina `last_note_position` (queda huérfana; sin datos, se puede ignorar).
- Impacto amplio en tests existentes por quitar `lastNotePosition` y por `NoteResponse` sin `id`/`position`.
