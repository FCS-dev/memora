# MEMORY.md — MEMORA

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Spec 001 (backend inicial) implementada al 100%.
- Spec 002 (autenticación, autorización y entidades) implementada al 100%: T1-T15 marcadas en `specs/002-auth-admin-tablas/tasks.md` (T14: 401/403 con cuerpo; T15: `PATCH /notes/{uuid}/checklist`; RF-32: `updatedAt` fresco en la respuesta de cada mutación).
- Backend Spring Boot 4.1.1 con Java 21; endpoints de auth, users, admin, notes (incl. marcar ítem de checklist) y tags operativos.
- Suite de tests del backend: 142 tests en verde; `mvn package -DskipTests` exitoso.
- Spec 003 (frontend login/registro) implementada al 100%: T1-T10 marcadas en `specs/003-login-register/tasks.md`.
- Frontend React 19 + Vite 8 + Tailwind 4/DaisyUI 5 en `frontend/`; 152 tests Vitest en verde, lint y build OK.
- E2E verificado contra backend real: registro+auto-login, guards de rol, persistencia, logout, errores de login y responsive 320–1280.
- Spec 004 (UUID y orden manual de notas) implementada al 100%: T1-T9 marcadas en `specs/004-note-uuid-position/tasks.md`; Spec 002 ajustada (RF-15 derogado, RF-20 a UUID 36).
- Spec 005 (gestión de notas en la interfaz) implementada al 100%: T1-T23 marcadas en `specs/005-view-notes/tasks.md` (vista global, ciclo completo; frontend). Revisión 2 (T12-T17): saltos de línea en el extracto, ancho responsive de tarjetas, contador `N/2500`, FAB `+` oculto en creación/edición e indicador `...` al recortar. T18: errores con el motivo del servidor y sesión expirada. T19: casillas de checklist marcables en editor y tarjetas. T20: selector Notas/Archivadas (reemplaza el acordeón), leyenda de última actualización, `line-height` 1.25rem y grid con tope 500px.

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
- ADMIN no accede a notas/tags; `/notes/**` y `/tags/**` restringidos a USER.
- OpenAPI/SpringDoc expone `/v3/api-docs` y `/swagger-ui/index.html`.
- Spec 003: validación FE contraseña 8–20, nombre/email 150; auto-login encadenado registro+login; sesión hasta logout o 30 días de inactividad; mensaje específico para BLOCKED/DISABLED.
- Plan 003: React Router + access token en memoria (refresh por cookie HttpOnly), proxy Vite `/api`→`:8080`, `fetch` nativo, Context para sesión, tests con Vitest + Testing Library; refresh *single-flight* por pestaña.
- Tailwind 4 + DaisyUI 5 con `@tailwindcss/vite` (CSS-first) en lugar de Tailwind 3/postcss (desvío justificado: versión vigente y sin vulnerabilidades dev).
- Longitudes alineadas (backend 002/003 + frontend): name 3–150, email 5–150, password 8–20 (hash 256), title 1–200, content 0–2500, tag 1–25.
- `Note.contentJson` es `jsonb` (`@JdbcTypeCode(SqlTypes.JSON)`); validación personalizada `@ValidChecklist` (null si checklistMode=false; con checklist: al menos 1 key no vacía y suma de longitudes de keys ≤ 2500). Marcar un ítem usa `PATCH /notes/{uuid}/checklist` `{item, checked}`, idempotente, actualiza solo ese booleano (404 ajena/ítem ausente; 400 no-checklist). Toda mutación en `NoteService` usa `saveAndFlush` para que `@PreUpdate` corra y la respuesta traiga el `updatedAt` nuevo (antes salía el viejo hasta el commit).
- Spec 004 deroga RF-15 de Spec 002 (se elimina `lastNotePosition`); nota con UUID público (36 con guiones, con reintento ante colisión) y `position` interna por grupo (PINNED/NOT_PINNED/ARCHIVED), no expuesta; alta arriba del grupo; reordenamiento por vecinos `beforeUuid`/`afterUuid` (vacío en extremos) con punto medio entero + renumeración (falta de espacio o no positiva) y desempate por mayor id interno. Cambio de grupo sin adyacencia: a activo arriba; a ARCHIVED conserva `position`, `isPinned=false` y se lista por `createdAt` desc. `PUT` completo (título/contenido/checklist obligatorios; `isPinned` opcional; desarchiva). Vecina malformada → 400; inexistente/ajena → 404.
- Spec 005 (frontend `features/notes/`): vista única global antes del acordeón (persistida en `localStorage`, defecto card); botón "Nueva nota" texto en `lg+` y FAB circular "+" debajo de `lg` (solo en listado); tarjetas en grid `grid-cols-1 md:repeat(auto-fill,348px)` (móvil fluido, ≥768 fijo 348), fondo `base-200` y `text-xs`; drag&drop con Pointer Events (mouse y táctil), deshabilitado en Archivadas; acciones optimistas + rollback; etiquetas mapeadas por nombre↔id (`GET/POST /tags`); main a `w-full` y `lg:w-[90%]` (sin `max-w-5xl`). Revisión 2: `<p>` del extracto con `whitespace-pre-line` (respeta `ENTER`), checklist recortado muestra fila `...` (muestra `MAX_ITEMS-1` + indicador), editor con contador `N/2500` (`charCount`: contenido o suma de ítems recortados) y sin FAB `+`; en móvil el ancho fluye 367→767 y desde `md` es 348. Revisión 3: `NoteFormValues.checklistItems` es `{text, checked}[]`; `NoteCard` reestructurada (casillas fuera de la región que abre la nota) con `PATCH` optimista + rollback; `NoteEditor` con `key` por uuid para precargar al entrar directo a la ruta de edición. Revisión 4 (T20): `PanelSwitch` segmentado "Notas"/"Archivadas" (default Notas) reemplaza el acordeón; `NoteCard` muestra leyenda "Actualizada: dd/mm/aaaa hh:mm" en el pie y `leading-5` (1.25rem) en contenido y checklist; grid `md:repeat(auto-fit,minmax(348px,1fr))` con tarjeta `md:max-w-[500px]`. Revisión 5 (T21): recordatorio con ícono `ClockIcon`, leyenda de actualización en `0.65rem` y `main` con `w-full` hasta 2560px (`min-[2560px]:w-[90%]`). Revisión 6 (T22): editor con floating labels (`TextField` prop `floating`), labels "Nota"/"Lista", toggles de ícono (lista/pin) con `aria-pressed`, botón SVG cruz (borrar ítem) y más (agregar etiqueta) sin borde, input de ítem solo borde inferior `h-4`; tags de la tarjeta en una línea (`TagList`) con `…` medido por `hasOverflow`. Revisión 7 (T23): editor sin título ni rótulos "Nota"/"Lista" (accesibilidad por `aria-label`); recordatorio inline a la derecha de los botones con `size=25`/`w-[25ch]`; fieldset de lista sin gap; etiquetas a `text-xs` (0.75rem).

## Aprendizajes recientes
- Los tests de controller con filtros de seguridad requieren usuarios reales o tokens válidos; preferir `@AutoConfigureMockMvc(addFilters = false)` solo cuando no se pruebe seguridad.
- `mvn test` debe correr SIN `.env`: `JWT_SECRET` del entorno pisa `jwt.secret` del perfil test y rompe `JwtPropertiesTest`.
- PostgreSQL `jsonb` reordena las claves por longitud: el checklist `{texto:bool}` cambia de orden al editar un ítem. Decisión pendiente (arreglo ordenado vs columna `json`).
- `ddl-auto: update` agrega `uuid_note` pero no elimina columnas; la columna legacy `last_note_position` (NOT NULL) rompía el registro en la BD de dev y se eliminó a mano (`ALTER TABLE users DROP COLUMN`). Conviene migraciones (Flyway).

## Próximos pasos
- [x] Implementar Spec 001.
- [x] Aprobar e implementar Spec 002.
- [x] Implementar Spec 003 por tareas (T1-T10).
- [x] Revisar y alinear longitudes de campos (backend, Spec 002/003 y frontend).
- [x] Implementar Spec 004 por tareas (T1-T9).
- [x] Implementar Spec 005 por tareas (T1-T19).
- [ ] Resolver el orden del checklist (jsonb) — arreglo ordenado o columna `json`.
- [ ] Definir specs de la Fase 2 (documentos, RAG, MCP/LLM).
