# MEMORY.md — MEMORA

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001-010 implementadas; backend (189 tests) y frontend (297 tests) en verde, lint y build OK.
- Spec 005 (gestión de notas en UI): ciclo completo con drag&drop, checklist, archivadas, vista responsive y editor pulido.
- Scripts de desarrollo: `scripts/start-dev.sh` levanta DB + backend + frontend; `scripts/stop-dev.sh` los detiene.
- Historial detallado archivado en `docs/memory-archive/2026-10-13-specs-001-005.md`.

## Decisiones vigentes
- Java 21 vía SDKMAN (`.sdkmanrc`); `.env` se carga manualmente con `source .env` antes de Maven/app.
- `application.yaml` sin valores por defecto para DB_URL, DB_USERNAME, DB_PASSWORD y SERVER_PORT.
- Spring Boot 4.1.1 usa `spring-boot-webmvc-test` y `@MockitoBean`; `@MockBean` eliminado.
- `@DataJpaTest` no disponible; tests de repositorio usan `@SpringBootTest` + `@Transactional`.
- `AdminBootstrap` lleva `@Profile("!test")` para no requerir credenciales admin en tests.
- `User.uuidUser` usa longitud 36 para UUID con guiones.
- Refresh token incluye `jti` UUID para evitar duplicados por unique constraint.
- `GlobalExceptionHandler` mapea `UsernameNotFoundException` a 404.
- `SecurityConfig` usa `RestSecurityErrorHandler`: sin token/token expirado → 401 JSON; rol insuficiente → 403 JSON; `JwtAuthenticationFilter` no lanza con token inválido. Frontend: `http` renueva en 401 y `setUnauthorizedHandler` cierra sesión si el refresh falla; `mapNotesError` propaga el `detail` del servidor.
- ADMIN no accede a notas/tags; `/notes/**` y `/tags/**` restringidos a USER. Spec 007 (implementada): las etiquetas globales son las de la cuenta ADMIN (dueño por rol, sin notas); ADMIN las gestiona desde `/admin/tags`, no ve notas ni privadas ajenas.
- OpenAPI/SpringDoc expone `/v3/api-docs` y `/swagger-ui/index.html`.
- Spec 003: validación FE contraseña 8–20, nombre/email 150; auto-login encadenado registro+login; sesión hasta logout o 30 días de inactividad; mensaje específico para BLOCKED/DISABLED.
- Plan 003: React Router + access token en memoria (refresh por cookie HttpOnly), proxy Vite `/api`→`:8080`, `fetch` nativo, Context para sesión, tests con Vitest + Testing Library; refresh *single-flight* por pestaña.
- Tailwind 4 + DaisyUI 5 con `@tailwindcss/vite` (CSS-first) en lugar de Tailwind 3/postcss (desvío justificado: versión vigente y sin vulnerabilidades dev).
- Longitudes alineadas (backend 002/003 + frontend): name 3–150, email 5–150, password 8–20 (hash 256), title 1–200, content 0–2500, tag 1–25.
- `Note.contentJson` es `jsonb` (`@JdbcTypeCode(SqlTypes.JSON)`); checklist como arreglo ordenado `[{text,checked}]` (Spec 006) para preservar orden y permitir ítems duplicados. Marcar un ítem usa `PATCH /notes/{uuid}/checklist` `{item, checked}`, idempotente, busca por texto. Toda mutación en `NoteService` usa `saveAndFlush` para `updatedAt` fresco.
- Spec 006 (frontend): `ChecklistItemForm` con `clientId` local (React key estable); reordenamiento de ítems en el editor por asa (Pointer Events) y atajos `Ctrl/Cmd+↑/↓`; auto-focus al agregar ítem; leyendas de vacío por panel (`copy.empty`); el orden se persiste al Guardar.
- Spec 004 deroga RF-15 de Spec 002 (se elimina `lastNotePosition`); nota con UUID público (36 con guiones, con reintento ante colisión) y `position` interna por grupo (PINNED/NOT_PINNED/ARCHIVED), no expuesta; alta arriba del grupo; reordenamiento por vecinos `beforeUuid`/`afterUuid` (vacío en extremos) con punto medio entero + renumeración (falta de espacio o no positiva) y desempate por mayor id interno. Cambio de grupo sin adyacencia: a activo arriba; a ARCHIVED conserva `position`, `isPinned=false` y se lista por `createdAt` desc. `PUT` completo (título/contenido/checklist obligatorios; `isPinned` opcional; desarchiva). Vecina malformada → 400; inexistente/ajena → 404.
- Spec 005 (frontend `features/notes/`): ciclo completo de notas; revisiones 1–7 archivadas en `docs/memory-archive/2026-10-13-spec-005-revisiones.md`.
- Spec 005 rev. 8-10: editor con cruz para quitar recordatorio; checklist como `textarea` auto-ajustable; etiquetas en modal `TagPicker`; placeholders neutros y limpieza de voseo (copy, backend 403). Detalle en `docs/memory-archive/`.
- Spec 008 (implementada T1-T8): menú de usuario en `HomeHeader` (ícono+nombre, Escape/click-fuera, ítems por rol); tema en `features/theme/` (5 temas vía `@plugin daisyui`, `data-theme` solo al elegir, `localStorage`+BroadcastChannel, fallback OS `cupcake`/`sunset`); `features/account/` (UserMenu, ProfileDialog, ChangePasswordDialog, PrivateTagsDialog); `AuthProvider.applyProfile` refleja el nombre. Backend: `GET /tags` con `noteCount` por USER (`countNotesByTagIdsAndUser`), `PATCH/DELETE /tags/{id}` (fusión privada→global gana global, 409 dup, 404 ajena). `signOut` propaga `NetworkError` (RF-17). Fix: el CRUD de etiquetas emite `memora:tags-changed` (`shared/lib/events`) y `NotesPage` recarga etiquetas (y notas en modo lista); `NoteEditor` poda ids de etiquetas ya inexistentes.

## Aprendizajes recientes
- Los tests de controller con filtros de seguridad requieren usuarios reales o tokens válidos; preferir `@AutoConfigureMockMvc(addFilters = false)` solo cuando no se pruebe seguridad.
- `mvn test` debe correr SIN `.env`: `JWT_SECRET` del entorno pisa `jwt.secret` del perfil test y rompe `JwtPropertiesTest`.
- PostgreSQL `jsonb` reordena las claves por longitud: por eso el checklist se guarda como arreglo ordenado `[{text,checked}]` (Spec 006).
- `ddl-auto: update` agrega `uuid_note` pero no elimina columnas; la columna legacy `last_note_position` (NOT NULL) rompía el registro en la BD de dev y se eliminó a mano (`ALTER TABLE users DROP COLUMN`). Conviene migraciones (Flyway).

## Próximos pasos
- [x] Specs 001-006 implementadas (init, auth/admin, login/register, UUID/posición de nota, vista de notas, orden de checklist) y longitudes de campos alineadas. Detalle en `docs/memory-archive/`.
- [x] Spec 007 aprobada e implementada (T1-T10): globales=tags del ADMIN (dueño por rol, sin notas), unicidad BD `(user_id,tag_name)` + regla de servicio (gana global), 409 duplicados, `/admin/tags` + panel admin y picker con badge/aviso, script `007-conform-tags.sql`.
- [x] Spec 008 aprobada e implementada (T1-T8): menú de usuario (perfil, contraseña, etiquetas privadas con contador/paginación, 5 temas).
- [x] Spec 009 (Filtros de notas por recordatorio/etiqueta) **implementada** (T1-T7): barra de chips + hoja de etiquetas en `NotesPage`; estado en `NotesFilterProvider` sobre las rutas (memoria, RF-14); uso de etiquetas calculado desde las notas; selección por id + payload en `memora:tags-changed` (fusiones/borrados, RF-13); OR entre etiquetas + AND con recordatorio; reorden deshabilitado con filtro. Backend sin cambios. Frontend 284 tests, backend 189, lint/build OK.
- [ ] Definir specs de la Fase 2 (documentos, RAG, MCP/LLM).
- [x] Spec 010 (rediseño visual frontend) implementada: temas propios `memora-light`/`memora-dark`, logo, tipografía Geist, capture bar, tarjetas y editor rediseñados. Correcciones posteriores: menú de usuario en portal/fixed, filtros móviles compactos (`Todos/Recordatorio/Etiquetas`), avatar con color aleatorio editable en perfil y persistido en BD, FAB móvil visible solo cuando la barra de captura no lo está, título de nota limitado a 2 líneas con ellipsis (`line-clamp-2 break-words`), fecha de actualización a `0.65rem`. Fix: `backdrop-blur` del header crea containing block para `fixed`; todos los modales se portalan a `document.body`. `useModalBehavior` centraliza Escape, foco inicial, focus trap con pila de modales y restauración de foco; al abrir diálogos desde el menú se enfoca el botón disparador. Con `.modal-open` se difumina `#root` (`filter: blur(4px)`). Frontend 297 tests.
