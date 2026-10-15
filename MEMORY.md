# MEMORY.md — MEMORA

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001-006 implementadas al 100%; backend (142 tests) y frontend (166 tests) en verde, lint y build OK.
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
- Spec 005 (frontend `features/notes/`): ciclo completo de notas con vista global, selector Notas/Archivadas, grid responsive, drag&drop táctil, checklist marcable y editor pulido. Revisiones 1–7 archivadas en `docs/memory-archive/2026-10-13-spec-005-revisiones.md`.
- Revisión 8 (T24-T29): editor con botón de cruz para quitar recordatorio; ítems de checklist como `textarea` auto-ajustable (`text-xs` 0.75rem, fila `min-h-6` 1.5rem, campos internos 1rem, crece hasta 3 líneas con `resizeItemTextarea` y scroll interno); etiquetas movidas a una modal (`TagPicker`) con campo de alta, botón "+" dinámico, chips de seleccionadas fuera y cierre con "x"/click fuera; botón "Nueva nota" centrado en el listado (toggle izq., selector der.).
- Revisión 10 (T30 005 / T11 003): placeholders neutros `placeholders` en copys, prop `placeholder` en `TextField`/`PasswordInput`, aplicados en editor y auth; limpieza de voseo→neutro (copy.ts, backend 403 y `.opencode/commands/sdd-implement.md`); AGENTS.md explicita "español neutro (sin voseo)".

## Aprendizajes recientes
- Los tests de controller con filtros de seguridad requieren usuarios reales o tokens válidos; preferir `@AutoConfigureMockMvc(addFilters = false)` solo cuando no se pruebe seguridad.
- `mvn test` debe correr SIN `.env`: `JWT_SECRET` del entorno pisa `jwt.secret` del perfil test y rompe `JwtPropertiesTest`.
- PostgreSQL `jsonb` reordena las claves por longitud: por eso el checklist se guarda como arreglo ordenado `[{text,checked}]` (Spec 006).
- `ddl-auto: update` agrega `uuid_note` pero no elimina columnas; la columna legacy `last_note_position` (NOT NULL) rompía el registro en la BD de dev y se eliminó a mano (`ALTER TABLE users DROP COLUMN`). Conviene migraciones (Flyway).

## Próximos pasos
- [x] Implementar Spec 001.
- [x] Aprobar e implementar Spec 002.
- [x] Implementar Spec 003 por tareas (T1-T10).
- [x] Revisar y alinear longitudes de campos (backend, Spec 002/003 y frontend).
- [x] Implementar Spec 004 por tareas (T1-T9).
- [x] Implementar Spec 005 por tareas (T1-T30, revisiones 1-10); Spec 003 T11 (placeholders auth).
- [x] Implementar Spec 006 por tareas (T1-T12).
- [x] Aprobar Spec 007 (etiquetas globales = tags del ADMIN, sin notas; + unicidad): `spec.md` aprobada (RF 1-23) y `plan.md` aprobado. Dueño del catálogo por rol ADMIN (no `id=1`), unicidad BD `(user_id,tag_name)` + regla de servicio (gana global), 409 para duplicados, sin dependencias nuevas (script `007-conform-tags.sql`).
- [x] Implementar Spec 007 por tareas (T1-T10): globales=tags del ADMIN, unicidad BD `(user_id,tag_name)`, 409 duplicados, `/admin/tags` + panel admin y picker con badge/aviso, script `007-conform-tags.sql`.
- [ ] Definir specs de la Fase 2 (documentos, RAG, MCP/LLM).
