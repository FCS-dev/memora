# MEMORY.md — MEMORA

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Spec 001 (backend inicial) implementada al 100%.
- Spec 002 (autenticación, autorización y entidades) implementada al 100%: T1-T13 marcadas en `specs/002-auth-admin-tablas/tasks.md`.
- Backend Spring Boot 4.1.1 con Java 21; endpoints de auth, users, admin, notes y tags operativos.
- Suite de tests del backend: 131 tests, todos en verde; `mvn package -DskipTests` exitoso.
- Spec 003 (frontend login/registro) implementada al 100%: T1-T10 marcadas en `specs/003-login-register/tasks.md`.
- Frontend React 19 + Vite 8 + Tailwind 4/DaisyUI 5 en `frontend/`; 61 tests Vitest en verde, lint y build OK.
- E2E verificado contra backend real: registro+auto-login, guards de rol, persistencia, logout, errores de login y responsive 320–1280.
- Spec 004 (UUID y orden manual de notas) implementada al 100%: T1-T9 marcadas en `specs/004-note-uuid-position/tasks.md`; Spec 002 ajustada (RF-15 derogado, RF-20 a UUID 36).

## Decisiones vigentes
- Java 21 vía SDKMAN (`.sdkmanrc`); `.env` se carga manualmente con `source .env` antes de Maven/app.
- `application.yaml` sin valores por defecto para DB_URL, DB_USERNAME, DB_PASSWORD y SERVER_PORT.
- Spring Boot 4.1.1 usa `spring-boot-webmvc-test` y `@MockitoBean`; `@MockBean` eliminado.
- `@DataJpaTest` no disponible; tests de repositorio usan `@SpringBootTest` + `@Transactional`.
- `AdminBootstrap` lleva `@Profile("!test")` para no requerir credenciales admin en tests.
- `User.uuidUser` usa longitud 36 para UUID con guiones.
- Refresh token incluye `jti` UUID para evitar duplicados por unique constraint.
- `GlobalExceptionHandler` mapea `UsernameNotFoundException` a 404.
- ADMIN no accede a notas/tags; `/notes/**` y `/tags/**` restringidos a USER.
- OpenAPI/SpringDoc expone `/v3/api-docs` y `/swagger-ui/index.html`.
- Spec 003: validación FE contraseña 8–20, nombre/email 150; auto-login encadenado registro+login; sesión hasta logout o 30 días de inactividad; mensaje específico para BLOCKED/DISABLED.
- Plan 003: React Router + access token en memoria (refresh por cookie HttpOnly), proxy Vite `/api`→`:8080`, `fetch` nativo, Context para sesión, tests con Vitest + Testing Library; refresh *single-flight* por pestaña.
- Tailwind 4 + DaisyUI 5 con `@tailwindcss/vite` (CSS-first) en lugar de Tailwind 3/postcss (desvío justificado: versión vigente y sin vulnerabilidades dev).
- Longitudes alineadas (backend 002/003 + frontend): name 3–150, email 5–150, password 8–20 (hash 256), title 1–200, content 0–2500, tag 1–25.
- `Note.contentJson` es `jsonb` (`@JdbcTypeCode(SqlTypes.JSON)`); validación personalizada `@ValidChecklist` (null si checklistMode=false; con checklist: al menos 1 key no vacía y suma de longitudes de keys ≤ 2500).
- Spec 004 deroga RF-15 de Spec 002 (se elimina `lastNotePosition`); nota con UUID público (36 con guiones, con reintento ante colisión) y `position` interna por grupo (PINNED/NOT_PINNED/ARCHIVED), no expuesta; alta arriba del grupo; reordenamiento por vecinos `beforeUuid`/`afterUuid` (vacío en extremos) con punto medio entero + renumeración (falta de espacio o no positiva) y desempate por mayor id interno. Cambio de grupo sin adyacencia: a activo arriba; a ARCHIVED conserva `position`, `isPinned=false` y se lista por `createdAt` desc. `PUT` completo (título/contenido/checklist obligatorios; `isPinned` opcional; desarchiva). Vecina malformada → 400; inexistente/ajena → 404.

## Aprendizajes recientes
- Los tests de controller con filtros de seguridad requieren usuarios reales o tokens válidos; preferir `@AutoConfigureMockMvc(addFilters = false)` solo cuando no se pruebe seguridad.
- `/swagger-ui.html` redirige (302) a `/swagger-ui/index.html`; usar el índice para testear 200.
- En tests, `new ObjectMapper()` evita depender del bean configurado de Spring.
- `ddl-auto: update` agrega `uuid_note` pero deja huérfana la columna `last_note_position` (sin datos, ignorable).

## Próximos pasos
- [x] Implementar Spec 001.
- [x] Aprobar e implementar Spec 002.
- [x] Implementar Spec 003 por tareas (T1-T10).
- [x] Revisar y alinear longitudes de campos (backend, Spec 002/003 y frontend).
- [x] Implementar Spec 004 por tareas (T1-T9).
- [ ] Definir specs de la Fase 2 (documentos, RAG, MCP/LLM).
