# Tareas — Spec 007 (Etiquetas globales administradas y unicidad)

Cubre: RF-1 .. RF-23, RNF-1 .. RNF-6. Plan: `specs/007-admin-tags-constraint/plan.md`.

- [x] **T1. Normalización y validación de nombres de etiqueta.** RF-16, RF-17
- Archivos: `backend/.../util/TextNormalizer.java`, `TextNormalizerTest.java`.
- Hecho cuando: `normalizeTagName` recorta extremos, colapsa espacios/tabuladores/saltos, aplica NFC y minúsculas `Locale.ROOT`; `isValidTagName` rechaza vacío y >25; `TextNormalizerTest` pasa.

- [x] **T2. Unicidad en BD por dueño y conformidad de datos previos.** RF-13, RF-14, RF-15, RF-20
- Archivos: `note/Tag.java`, `note/TagRepository.java`, `backend/scripts/007-conform-tags.sql`, `TagRepositoryTest.java`.
- Hecho cuando: existe el constraint `(user_id, tag_name)` y dos altas del mismo dueño con el mismo nombre fallan; el script normaliza, fusiona y crea el índice de forma idempotente; tests pasan.

- [x] **T3. Errores de etiquetas: 409 (conflicto) y 400 (inválido).** RF-15, RF-17, RF-21
- Archivos: `note/exception/DuplicateTagException.java`, `note/exception/InvalidTagException.java`, `config/GlobalExceptionHandler.java`, `TagControllerTest.java`.
- Hecho cuando: un duplicado responde `409` y un nombre inválido `400`, ambos con `detail` neutro; tests pasan.

- [x] **T4. Etiquetas de usuario: reutilización de global y listado.** RF-8, RF-9, RF-10, RF-11
- Archivos: `admin/TagOwnerResolver.java`, `note/dto/CreateTagResponse.java`, `note/dto/TagResponse.java`, `note/TagService.java`, `note/TagController.java`, `TagServiceTest.java`, `TagControllerTest.java`.
- Hecho cuando: crear una privada con el nombre de una global devuelve `reused=true` sin crear copia; el duplicado propio responde `409`; `GET /tags` devuelve globales+privadas con `global`; tests pasan.

- [x] **T5. Uso de etiquetas globales en notas.** RF-7, RF-12
- Archivos: `note/NoteService.java`, `NoteServiceTest.java`.
- Hecho cuando: una nota acepta globales y propias y rechaza etiquetas privadas de otro USER; tests pasan.

- [x] **T6. Catálogo ADMIN: crear, renombrar, eliminar y fusión.** RF-1, RF-3, RF-4, RF-5, RF-18, RF-19
- Archivos: `admin/AdminTagService.java`, `admin/AdminTagController.java`, `admin/dto/RenameGlobalTagRequest.java`, `admin/dto/GlobalTagResponse.java`, `note/NoteRepository.java`, `AdminTagServiceTest.java`, `AdminTagControllerTest.java`.
- Hecho cuando: `/admin/tags` crea, renombra y elimina globales; renombrar actualiza las notas; eliminar recrea una privada por dueño; crear/renombrar global fusiona privadas homónimas sin duplicar; tests pasan.

- [x] **T7. Listado ADMIN con conteo de uso.** RF-2
- Archivos: `admin/AdminTagService.java`, `note/NoteRepository.java`, `AdminTagServiceTest.java`.
- Hecho cuando: `GET /admin/tags` lista alfabéticamente con `noteCount` (incluye archivadas), `[]` si vacío y el conteo baja al eliminar una nota o una global; tests pasan.

- [x] **T8. Protección de la cuenta dueña, conservación de privadas y seguridad de rutas.** RF-6, RF-22, RF-23
- Archivos: `admin/AdminService.java`, `AdminServiceTest.java`, `SecurityIntegrationTest.java`, `TagControllerTest.java`.
- Hecho cuando: no se puede desactivar al dueño del catálogo y sus globales siguen usables; una privada sin notas persiste; USER→`/admin/tags`=`403` y ADMIN→`/tags`=`403`; tests pasan.

- [x] **T9. Frontend ADMIN: panel de etiquetas globales.** RF-1, RF-2, RF-3, RF-4, RF-6, RNF-1, RNF-2, RNF-6
- Archivos: `frontend/src/features/admin/**`, `features/home/pages/AdminHomePage.tsx`, `GlobalTagsPanel.test.tsx`.
- Hecho cuando: `/admin` permite alta, listado con conteo, renombrar y eliminar con confirmación (estados carga/error/vacío, accesible por teclado, sin desbordamiento 320–1280 px); `npm run test` pasa.

- [x] **T10. Frontend USER: etiquetas globales en el selector.** RF-10, RF-11, RF-21, RNF-1
- Archivos: `features/notes/model/types.ts`, `features/notes/api/tagsApi.ts`, `features/notes/model/errors.ts`, `features/notes/model/copy.ts`, `features/notes/components/TagPicker.tsx`, `features/notes/pages/NotesPage.tsx`, tests.
- Hecho cuando: el selector muestra globales (badge) + privadas, avisa al reutilizar una global y mapea `409` como duplicado; `npm run test`, `npm run lint` y `npm run build` pasan.
