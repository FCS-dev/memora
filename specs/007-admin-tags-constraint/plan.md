# Plan 007 — Etiquetas globales administradas y unicidad

Estado: propuesto

Cubre: RF-1 .. RF-23, RNF-1 .. RNF-6 (spec `specs/007-admin-tags-constraint/spec.md`).

## 0. Concepto rector

- **Catálogo global = etiquetas del usuario ADMIN** (dueño del catálogo). El ADMIN no tiene notas.
- El dueño del catálogo se identifica **por rol ADMIN** (no por `id=1` literal); puede no existir (tests) y entonces no hay globales.
- La unicidad real la da la **base de datos por dueño** `(user_id, tag_name)` sobre el nombre ya normalizado; el cruce privada↔global se resuelve por **regla de servicio** (gana la global).

## 1. Archivos y responsabilidades

### Backend — modificados

- `note/Tag.java` — agregar `@UniqueConstraint(name = "uk_tags_owner_name", columnNames = {"user_id", "tag_name"})` en `@Table`. → RF-13, RF-14, RF-15, RNF-4
- `util/TextNormalizer.java` — `normalizeTagName` pasa a: `trim` → colapsar `\s+` a `" "` (incluye tabuladores y saltos) → `Normalizer.normalize(NFC)` → `toLowerCase(Locale.ROOT)`; nuevo `isValidTagName(String normalized, int max)`. → RF-16, RF-17
- `note/TagRepository.java` — agregar `Optional<Tag> findByUserAndTagName(User, String)`; `List<Tag> findByTagName(String)`; `List<Tag> findByTagNameAndUserNot(String, User)`. → RF-9, RF-10, RF-18, RF-19
- `note/NoteRepository.java` — agregar `List<Note> findByTags_Id(Long)` y `@Query("select t.id, count(distinct n) from Note n join n.tags t where t.id in :ids group by t.id")` proyectada a `TagUsageCount(Long tagId, long total)`; método `countNotesByTagIds(Collection<Long>)`. → RF-2, RF-4, RF-19, RF-20
- `note/dto/TagResponse.java` — agregar `boolean global`. → RF-11
- `note/TagService.java` — `list` devuelve globales (del ADMIN) + privadas; `create` reutiliza la global con `reused=true`; duplicado propio → conflicto. → RF-8, RF-9, RF-10, RF-11
- `note/TagController.java` — `POST /tags` devuelve `CreateTagResponse`; `GET /tags` devuelve `TagResponse` con `global`. → RF-8, RF-11
- `note/NoteService.java` — `resolveTags` acepta etiquetas propias **y** del dueño del catálogo; rechaza las de otros USER. → RF-7, RF-12
- `admin/AdminService.java` — impedir cambiar el estado del **dueño del catálogo** (además de la autoprotección actual). → RF-23
- `config/GlobalExceptionHandler.java` — mapear `DuplicateTagException` a **409**; `InvalidTagException` a **400** (ya cubre `IllegalArgumentException`). → RF-15, RF-21

### Backend — nuevos

- `note/dto/CreateTagResponse.java` — `(Long id, String tagName, boolean global, boolean reused)`. → RF-10
- `note/exception/DuplicateTagException.java` — conflicto de unicidad. → RF-9, RF-15, RF-21
- `note/exception/InvalidTagException.java` — nombre inválido. → RF-17, RF-21
- `admin/TagOwnerResolver.java` — resuelve el dueño del catálogo (`UserRepository.findFirstByRoleOrderByIdAsc(UserRole.ADMIN)`), devolviendo `Optional`. → RF-7, RF-11
- `admin/dto/GlobalTagResponse.java` — `(Long id, String tagName, long noteCount)`. → RF-2
- `admin/dto/RenameGlobalTagRequest.java` — `{ @NotBlank @Size(max = 25) String tagName }`. → RF-3
- `admin/AdminTagService.java` — CRUD de globales + fusión + baja con recreación de privadas por dueño + conteos. → RF-1 .. RF-5, RF-18, RF-19, RF-20
- `admin/AdminTagController.java` — `/admin/tags` (`POST`, `GET`, `PATCH /{id}`, `DELETE /{id}`). → RF-1 .. RF-6

### Backend — conformidad y unicidad (sin dependencias nuevas)

- `backend/scripts/007-conform-tags.sql` — script idempotente de una sola ejecución sobre la BD existente: (1) normaliza `tag_name` existentes, (2) fusiona duplicados por dueño reapuntando `note_tags`, (3) resuelve coincidencias privada↔global (gana la global), (4) agrega el índice único `uk_tags_owner_name`. Al agregarlo, Hibernate `ddl-auto=update` lo detecta como existente. → RF-20, RNF-4
- La conformidad "del sistema" para datos previos queda documentada como paso de despliegue en `tasks.md`; en BD nuevas (tests y primer arranque) el constraint lo crea Hibernate sobre tablas vacías, sin riesgo.

### Frontend — modificados

- `features/notes/model/types.ts` — `Tag` agrega `global: boolean`; nuevo `CreateTagResult { tag: Tag; reused: boolean }`. → RF-10, RF-11
- `features/notes/api/tagsApi.ts` — `listTags` tipa `global`; `createTag` devuelve `CreateTagResult`. → RF-10, RF-11
- `features/notes/model/errors.ts` — `isDuplicateTagError` pasa a **status 409**. → RF-21
- `features/notes/model/copy.ts` — copys: badge "Global" y aviso "Ya existía una etiqueta global: se reutilizó". → RF-10, RNF-1
- `features/notes/components/TagPicker.tsx` — marcar globales con badge y mostrar el aviso de reutilización. → RF-10, RF-11
- `features/notes/pages/NotesPage.tsx` — `handleCreateTag` propaga `reused` al picker. → RF-10
- `features/home/pages/AdminHomePage.tsx` — montar el panel de etiquetas globales. → RF-1 .. RF-4

### Frontend — nuevos (`features/admin/`)

- `api/adminTagsApi.ts` — `listGlobalTags`, `createGlobalTag`, `renameGlobalTag`, `deleteGlobalTag`. → RF-1 .. RF-4
- `model/types.ts` — `GlobalTag { id; tagName; noteCount }`, payloads. → RF-2
- `model/copy.ts` — textos en español neutro (título, alta, renombrar, eliminar, vacío, confirmaciones). → RF-1 .. RF-4, RNF-1
- `model/errors.ts` — mapeo de 400/409/403/404 a mensajes neutros. → RF-21, RNF-1
- `components/GlobalTagsPanel.tsx` — listado alfabético con conteo, estados carga/error/vacío, alta, renombrar y eliminar con confirmación; accesible por teclado. → RF-1 .. RF-4, RNF-2, RNF-6

## 2. Funciones puras (dependencias externas como parámetros)

Backend:
- `TextNormalizer.normalizeTagName(String raw) -> String` — sin dependencias; `Locale.ROOT` y `NFC` explícitos. → RF-16
- `TextNormalizer.isValidTagName(String normalized, int min, int max) -> boolean` — sin dependencias. → RF-17
- `TagMergePlanner.plan(Tag global, List<Tag> collidingPrivates, Map<Long, Set<Long>> tagToNoteIds) -> MergePlan` — puro: decide reasociaciones y bajas, sin tocar BD. → RF-19
- `TagDeletePlanner.plan(Tag global, Map<Long, List<Long>> notesByOwnerId, Map<Long, Long> privateTagByOwnerId) -> RecreatePlan` — puro: por dueño, una privada y las reasociaciones. → RF-4
- `TagCounts.attach(List<Tag> globals, Map<Long, Long> counts) -> List<GlobalTagResponse>` — puro. → RF-2

Frontend:
- `stripTagName(raw) -> string` (espejo de UX del backend). → RF-16, RF-17
- `validateTagName(name, max) -> string | null`. → RF-17
- `sortGlobalTags(tags) -> GlobalTag[]`. → RF-2
- `reuseNotice(globalName) -> string`. → RF-10

## 3. Algoritmo (pseudocódigo)

**A. USER crea privada — `TagService.create` → RF-8, RF-9, RF-10**
```
user = findActiveUser(uuid)
name = normalizeTagName(req.tagName)
SI !isValidTagName(name, 1, 25): throw InvalidTag            # 400, RF-17
owner = tagOwnerResolver.optionalOwner()
global = owner presente ? findByUserAndTagName(owner, name) : empty
SI global presente: RETURN (global.id, global.name, global=true, reused=true)  # RF-10
SI existsByUserAndTagName(user, name): throw DuplicateTag    # 409, RF-9
tag = tagRepository.save(Tag(user, name))
RETURN (tag.id, name, global=false, reused=false)            # RF-8
```

**B. USER lista — `TagService.list` → RF-11, RF-18**
```
own = findByUserOrderByTagNameAsc(user).map(global=false)
globals = owner presente ? findByUserOrderByTagNameAsc(owner).map(global=true) : []
resultado = globals ++ own, omitiendo privada cuyo nombre ya está en globals
RETURN ordenarPorNombre(resultado)
```

**C. ADMIN crea global — `AdminTagService.create` → RF-1, RF-5, RF-19**
```
admin = findActiveUser(uuid)                                  # caller ADMIN
name = normalizeTagName(req.tagName); SI !valid: throw InvalidTag     # 400
SI existe en el propio admin: throw DuplicateTag             # 409, RF-5
global = tagRepository.save(Tag(admin, name))                # RF-1
fusionar(global, findByTagNameAndUserNot(name, admin))       # RF-19
RETURN GlobalTagResponse(global.id, name, 0)
```

**D. ADMIN renombra — `AdminTagService.rename` → RF-3, RF-5, RF-19, RNF-5**
```
global = findOwnedTag(admin, id) o NOT_FOUND
newname = normalize+validar
SI newname == global.name: RETURN sin cambios                # idempotente
SI existe otra global del admin con newname: throw DuplicateTag       # 409, RF-5
global.setTagName(newname); save
fusionar(global, findByTagNameAndUserNot(newname, admin))    # RF-19
RETURN GlobalTagResponse(con conteo fresco)
```

**E. Fusión privadas → global — `fusionar` → RF-19, RNF-5**
```
POR cada privada P en colliding:
  POR cada nota N en noteRepository.findByTags_Id(P.id):
     N.tags.remove(P); N.tags.add(global); saveAndFlush(N)   # Set evita duplicar la global
  tagRepository.delete(P)
```

**F. ADMIN elimina global — `AdminTagService.delete` → RF-4**
```
global = findOwnedTag(admin, id) o NOT_FOUND
notas = noteRepository.findByTags_Id(global.id)
agrupar notas por dueño
POR cada dueño D:
  priv = findByUserAndTagName(D, global.name) o save(Tag(D, global.name))   # una por dueño
  POR cada N en notas(D): N.tags.remove(global); N.tags.add(priv); saveAndFlush(N)
tagRepository.delete(global)
```

**G. Listado con conteos — `AdminTagService.list` → RF-2, RF-20**
```
globals = findByUserOrderByTagNameAsc(admin)                 # orden alfabético por nombre normalizado
counts = noteRepository.countNotesByTagIds(globals.ids)      # count(distinct note), incluye archivadas
RETURN TagCounts.attach(globals, counts)                     # estado vacío si globals está vacío
```

**H. Conformidad previa — `backend/scripts/007-conform-tags.sql` (una sola vez) → RF-20, RNF-4**
```
1. normalizar tag_name (trim, espacios, NFC, minúsculas)
2. por (user_id, tag_name) duplicado: conservar una, reapuntar note_tags, borrar el resto
3. para cada privada cuyo (normalizado) coincide con una global del ADMIN: reapuntar a la global, borrar la privada
4. CREATE UNIQUE INDEX uk_tags_owner_name ON tags(user_id, tag_name)
```
Idempotente: reejecutarlo no altera un estado ya conforme.

## 4. Interfaz del sistema

### API REST

| Método | Ruta | Rol | Request | Respuesta | RF |
|---|---|---|---|---|---|
| POST | `/tags` | USER | `{tagName}` | `201 {id,tagName,global:false,reused:false}` o `200 {…,global:true,reused:true}` | RF-8, RF-10 |
| GET | `/tags` | USER | — | `[{id,tagName,global}]` | RF-11 |
| POST | `/admin/tags` | ADMIN | `{tagName}` | `201 {id,tagName,noteCount:0}` | RF-1 |
| GET | `/admin/tags` | ADMIN | — | `[{id,tagName,noteCount}]` alfabético; `[]` si vacío | RF-2 |
| PATCH | `/admin/tags/{id}` | ADMIN | `{tagName}` | `200 {id,tagName,noteCount}` | RF-3 |
| DELETE | `/admin/tags/{id}` | ADMIN | — | `204` | RF-4 |
| (sin cambios) | `/admin/users/{uuid}/status` | ADMIN | — | rechaza cambiar estado del dueño del catálogo | RF-23 |

Códigos de error: `400` nombre inválido, `409` duplicado del mismo dueño, `401` sin sesión, `403` sin rol, `404` etiqueta inexistente/ajena. (RF-6, RF-21)

### UI

- **USER** (`TagPicker`): lista **globales (badge "Global") + privadas**, permite crear privadas y **avisa** cuando el nombre reutiliza una global. (RF-10, RF-11)
- **ADMIN** (`AdminHomePage` → `GlobalTagsPanel`): alta, listado alfabético con conteo, renombrar y eliminar con confirmación; estados de carga/error/vacío; navegable por teclado. (RF-1 .. RF-4, RNF-2, RNF-6)

## 5. Decisiones justificadas

- **D1 — Dueño del catálogo por rol ADMIN** (`findFirstByRoleOrderByIdAsc(ADMIN)`). Alternativa descartada: `id=1` literal → frágil (en dev/tests el id 1 puede ser USER; `AdminBootstrap` no corre en tests por `@Profile("!test")`).
- **D2 — Unicidad en BD `(user_id, tag_name)` + verificación en servicio.** Alternativa descartada: solo servicio → no sostiene concurrencia (RNF-4). El nombre se guarda normalizado, así que el constraint sobre la columna equivale a unicidad por nombre normalizado. → RF-13 .. RF-15
- **D3 — Cruce privada↔global por regla de servicio** (gana la global), sin constraint cruzado. Alternativa descartada: constraint global sobre `tag_name` → impediría privadas legítimas en otros contextos y contradice RF-10 (reutiliza, no falla).
- **D4 — Duplicado = HTTP 409** (`DuplicateTagException`). Alternativa descartada: 400 → confunde validación con conflicto; el frontend necesita distinguir reutilización/duplicado.
- **D5 — Baja de global recrea privada por dueño** (una por dueño). Alternativa descartada: dejar notas sin etiqueta → perdería RF-4.
- **D6 — Conformidad y unicidad sin dependencias nuevas:** `@UniqueConstraint` en la entidad + script SQL idempotente de una sola ejecución para la BD existente. Alternativa descartada: Flyway (dependencia nueva) → más robusto y versionado, pero fuera del alcance de esta spec y sujeto a aprobación como infraestructura aparte. En BD nuevas y tests el constraint lo crea Hibernate sobre tablas vacías (sin riesgo de violación).
- **D7 — `/admin/tags` en un servicio admin dedicado** (`admin/AdminTagService`), compartiendo normalización en `util`. Alternativa descartada: mezclar el CRUD global dentro de `note/TagService` → rompe la separación por módulos.

## 6. Estrategia de tests

Backend (`cd backend && mvn test`, **sin `.env`**):
- `TextNormalizerTest`: trim, colapso de tabuladores/saltos, NFC, `Locale.ROOT`, acentos distintos, límite 1/25. → RF-16, RF-17
- `TagServiceTest` (Mockito): reutilización de global (`reused`), duplicado propio → conflicto, listado globales+privadas. → RF-8, RF-9, RF-10, RF-11
- `AdminTagServiceTest` (Mockito): crear/renombrar/eliminar, fusión, recreación por dueño, duplicado → conflicto, idempotencia. → RF-1 .. RF-5, RF-18, RF-19, RNF-5
- `NoteServiceTest`: `resolveTags` acepta globales y propias, rechaza ajenas. → RF-7, RF-12
- `TagRepositoryTest` / `NoteRepositoryTest` (`@SpringBootTest` + `@ActiveProfiles("test")` + `@Transactional`): constraint `(user_id, tag_name)` y consulta de conteo. → RF-13, RF-14, RF-2
- `TagControllerTest` / `AdminTagControllerTest` (MockMvc, perfil test): códigos 201/200/400/409/204; `/admin/tags` solo ADMIN. → RF-1 .. RF-6, RF-21
- `SecurityIntegrationTest`: USER → `/admin/tags` = 403; ADMIN → `/tags` = 403; sin token = 401. → RF-6
- Concurrencia: dos `save` simultáneos del mismo nombre → una `DataIntegrityViolationException` (best-effort H2). → RF-13, RF-15, RNF-4
- `AdminServiceTest`: no se puede desactivar al dueño del catálogo. → RF-23
- Conformidad: prueba de normalización/fusión/colisión previa con el script (o su lógica). → RF-20
- `TagControllerTest`: etiqueta privada sin notas se conserva. → RF-22

Frontend (`npm run test`, luego `npm run lint` y `npm run build`):
- `tagsApi.test.ts`: listado con `global`, create con `reused`. → RF-10, RF-11
- `errors.test.ts`: mapeo 409 duplicado. → RF-21
- `TagPicker` (nuevo test): badge global y aviso de reutilización. → RF-10, RF-11
- `GlobalTagsPanel.test.tsx`: alta, listado con conteo, renombrar y eliminar; estados vacío/error. → RF-1 .. RF-4, RNF-2
- `App`/guards: `/admin` solo ADMIN. → RF-6

## 7. Riesgos y notas

- **Orden constraint vs conformidad (D6):** en la BD de dev con datos sucios, el script `007-conform-tags.sql` debe ejecutarse antes de levantar la versión nueva; si no, `ddl-auto=update` podría fallar al crear el índice único. En BD nuevas y tests no hay riesgo (tablas vacías).
- La conformidad debe ser **idempotente**: la BD de dev ya trae cambios manuales (`user_id=1`).
- `mvn test` debe correr **sin `.env`** (JWT): documentado en `MEMORY.md`.
- `NoteService.toResponse` expone nombres de etiqueta (no ids): sin cambios de contrato de nota.

## 8. Cobertura de RF

- Catálogo: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6 → `AdminTagService`, `AdminTagController`, `GlobalTagsPanel`.
- Usuario y notas: RF-7, RF-8, RF-9, RF-10, RF-11, RF-12 → `TagService`, `NoteService`, `TagPicker`.
- Unicidad y normalización: RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20 → `Tag`, `TextNormalizer`, repositorios, `TagMergePlanner`, `007-conform-tags.sql`.
- Errores: RF-21 → `GlobalExceptionHandler`, `features/admin/model/errors.ts`, `features/notes/model/errors.ts`.
- Conservación de privadas: RF-22 → `TagService`/datos + test.
- Cuenta y catálogo: RF-23 → `AdminService` + `TagOwnerResolver`.
- No funcionales: RNF-1 (copy neutro), RNF-2 (panel accesible), RNF-3 (sin exponer usuarios en conteos), RNF-4 (BD por dueño), RNF-5 (idempotencia), RNF-6 (responsive 320–1280 px).
