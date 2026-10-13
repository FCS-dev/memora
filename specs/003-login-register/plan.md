# Plan 003 — Login y registro (frontend)

## 0. Alcance y supuestos

- Solo frontend: React + TypeScript + Vite + TailwindCSS + DaisyUI (stack fijado por AGENTS.md).
- No se modifica el backend; se consumen los endpoints existentes de auth y perfil.
- El backend sigue siendo la autoridad de validación y autorización (constitución #3, RNF-5); los guards del frontend son solo UX.
- Dependencias nuevas (aprobadas el 2026-10-08, constitución #1):
  - runtime: `react`, `react-dom`, `react-router-dom`.
  - desarrollo: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss` (v4), `daisyui` (v5), `typescript`, `eslint`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- Longitudes alineadas con Spec 002: nombre 3–150, email 5–150, contraseña 8–20.

## 1. Archivos y responsabilidades

### Configuración del proyecto
- `frontend/package.json` — scripts `dev`, `build`, `test`, `lint`; dependencias.
- `frontend/vite.config.ts` — plugins React y `@tailwindcss/vite`, proxy de desarrollo `/api` → `http://localhost:8080`, config de Vitest (jsdom).
- `frontend/tsconfig.json`, `frontend/tsconfig.node.json` — TypeScript estricto.
- `frontend/index.html` — contenedor raíz, `lang="es"`.
- `frontend/src/index.css` — `@import "tailwindcss"` + `@plugin "daisyui"` (mobile-first, RNF-3).
- `frontend/eslint.config.js` — lint (constitución #6).

### Arranque y enrutado
- `src/main.tsx` — monta `App` con `AuthProvider` y `BrowserRouter`. (RF-1, RF-11)
- `src/index.css` — directivas Tailwind.
- `src/app/App.tsx` — tabla de rutas. (RF-22, RF-24, RF-25, RF-26, RF-27, RF-28)
- `src/app/guards/RequireAuth.tsx` — sin sesión → `/login`. (RF-28)
- `src/app/guards/RequireRole.tsx` — rol distinto → su propia home. (RF-26)
- `src/app/guards/PublicOnly.tsx` — con sesión → home del rol. (RF-27)

### Infraestructura compartida
- `src/shared/lib/http.ts` — wrapper de `fetch`: cabecera `Authorization`, parseo de error estándar, ante 401 intenta refresh y reintenta una vez. (RF-13, RF-14, RF-20, RF-23, RF-29, RNF-2)
- `src/shared/components/Spinner.tsx` — indicador de carga. (RF-9, RF-15, RNF-6)
- `src/shared/components/ErrorAlert.tsx` — mensaje de error accesible (`role="alert"`). (RF-8, RF-13, RF-14, RF-23, RF-29, RNF-4)
- `src/shared/components/TextField.tsx` — `<label>` + `<input>` semánticos, error asociado por `id`/`aria-describedby`, foco visible. (RF-1, RF-11, RNF-4)

### Módulo auth
- `src/features/auth/model/types.ts` — `Role`, `AuthUser`, `Session`, estados de sesión.
- `src/features/auth/model/validation.ts` — funciones puras de validación (sección 2).
- `src/features/auth/model/errors.ts` — `mapLoginError` (sección 2).
- `src/features/auth/model/copy.ts` — mensajes y textos de ayuda (placeholder) visibles en español neutro (sin voseo) centralizados. (RNF-1, RF-30)
- `src/features/auth/api/authApi.ts` — `register`, `login`, `refresh`, `logout`, `getMe` sobre `http.ts`. (RF-2, RF-12, RF-17, RF-18, RF-19, RF-21)
- `src/features/auth/context/authContext.ts` — contexto de sesión. (RF-17, RF-19)
- `src/features/auth/context/AuthProvider.tsx` — sesión en memoria, estado (`loading|anonymous|authenticated|restoreError`) y acciones. (RF-17, RF-19, RF-20, RF-21, RF-23)
- `src/features/auth/context/useAuth.ts` — hook de consumo del contexto.
- `src/features/auth/hooks/useLogin.ts`, `useRegister.ts` — orquestación y estado de envío. (RF-2, RF-9, RF-12, RF-13, RF-14, RF-15, RF-29)
- `src/features/auth/pages/LoginPage.tsx` — página de login. (RF-11, RF-26, RF-27)
- `src/features/auth/pages/RegisterPage.tsx` — página de registro. (RF-1, RF-27)
- `src/features/auth/components/LoginForm.tsx` — formulario de login. (RF-11, RF-13, RF-14, RF-15, RF-16)
- `src/features/auth/components/RegisterForm.tsx` — formulario de registro. (RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10)
- `src/features/auth/components/PasswordInput.tsx` — campo con mostrar/ocultar contraseña. (RNF-4)

### Módulo home
- `src/features/home/pages/UserHomePage.tsx` — home de USER. (RF-24)
- `src/features/home/pages/AdminHomePage.tsx` — home de ADMIN. (RF-25)
- `src/features/home/components/HomeHeader.tsx` — nombre + encabezado por rol + cerrar sesión visible. (RF-21, RF-22, RF-24, RF-25)

### Tests
- `src/test/setup.ts` — setup de Testing Library.
- `*.test.ts` / `*.test.tsx` colocados junto a cada unidad (sección 6).

## 2. Funciones puras

Todas deterministas; no dependen de reloj, red ni DOM salvo lo indicado por parámetros.

- `normalizeEmail(raw: string): string` — quita espacios externos. (RF-10, RF-16)
- `isValidEmail(raw: string): boolean` — parte local, "@", dominio con al menos un punto, sin espacios. (RF-4)
- `isValidPassword(value: string): boolean` — longitud 8–20. (RF-5)
- `isValidName(value: string): boolean` — longitud entre 3 y 150. (RF-3, RF-7)
- `isValidEmailLength(value: string): boolean` — longitud entre 5 y 150. (RF-7)
- `validateRegister(values): Record<Field,string>` — mapa de errores por campo. (RF-3, RF-4, RF-5, RF-6, RF-7)
- `buildRegisterPayload(values): { email, name, password }` — normaliza email, recorta nombre. (RF-2, RF-10)
- `mapLoginError(status: number, body): 'generic' | 'inactive' | 'server' | null` — 401→`generic`, 403→`inactive`, 5xx→`server`. (RF-13, RF-14, RF-29)
- `resolveHomePath(role: Role): '/home' | '/admin'`. (RF-12, RF-24, RF-25)
- `resolveInitialRoute(session, status): string` — decide login vs home en el arranque. (RF-19, RF-27, RF-28)
- `canAccess(role: Role, required: Role): boolean` — guard de rol UX. (RF-26)

Nota sobre "hoy": la única lógica temporal (caducidad a los 30 días, RF-18) es autoritativa del servidor vía expiración/rotación del refresh token; por eso el cliente no incorpora reloj y ninguna función pura recibe una fecha. Si en el futuro se añadiera inactividad en cliente, se pasaría `now` como parámetro explícito.

## 3. Algoritmo (pseudocódigo)

```
BOOTSTRAP (al montar la app):
  status = loading
  TRY
    token = api.refresh()            # usa cookie HttpOnly
    user  = api.getMe(token)
    session = { token, user }
    status = authenticated
  CATCH NetworkError:
    status = restoreError            # RF-23: ofrecer reintentar, no borrar sesión
  CATCH Unauthorized:
    status = anonymous               # RF-19: sesión inválida -> login

GET_ME con token expirado (cualquier llamada):
  respuesta = http.send(request, token)
  SI status == 401 Y no reintentado:
    token = api.refresh()            # RF-18, RF-20; single-flight por pestaña
    SI refresh ok: reintentar una vez
    SI refresh falla: cerrar sesión local -> /login

LOGIN(email, password):
  email = normalizeEmail(email)      # RF-16
  setSubmitting(true)                # RF-15
  TRY
    token = api.login(email, password)     # RF-12
    user  = api.getMe(token)
    session = { token, user }
    navegar(resolveHomePath(user.role))    # RF-24, RF-25
  CATCH error:
    mostrar(mapLoginError(status, body))   # RF-13 / RF-14 / RF-29
  FINALLY setSubmitting(false)

REGISTER(values):
  errores = validateRegister(values)       # RF-3..RF-7
  SI errores: mostrar por campo; RETURN
  setSubmitting(true)                      # RF-9
  TRY
    api.register(buildRegisterPayload(values))   # RF-2, RF-10
    LOGIN(values.email, values.password)         # auto-login encadenado (RF-2)
  CATCH 400 duplicado:
    mostrar error en campo email               # RF-8
  CATCH error: mostrar(mapLoginError(...))     # RF-29
  FINALLY setSubmitting(false)

LOGOUT:                                    # RF-21, RF-22
  TRY api.logout() CATCH ignorar
  session = null -> /login

GUARDS:
  RequireAuth: si status != authenticated -> /login          # RF-28
  RequireRole(role): si user.role != role -> home del rol    # RF-26
  PublicOnly: si authenticated -> home del rol               # RF-27
```

## 4. Cómo se expone

### UI (navegador)
- `/login` — formulario email + contraseña, mensaje genérico o de cuenta inactiva, enlaces a registro.
- `/register` — nombre, email, contraseña, confirmación, errores por campo, enlace a login.
- `/home` — home de USER: nombre, encabezado de usuario, cerrar sesión.
- `/admin` — home de ADMIN: nombre, encabezado de administración, cerrar sesión.
- Cualquier ruta protegida sin sesión redirige a `/login`; con sesión en `/login` o `/register` redirige a la home del rol.
- Estados visibles: carga (spinner), error con reintento, campos inválidos.

### API consumida (sin cambios de backend)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/users/me`.
- El prefijo `/api` lo resuelve el proxy de Vite hacia `:8080` (mismo origen, cookies incluidas).
- CLI: no aplica.

## 5. Decisiones técnicas (con alternativa descartada)

1. **Enrutado con React Router** — necesario para URL directa, botón "atrás" y guards (RF-26/27/28). Alternativa descartada: renderizado condicional sin router, que no cumple RF-26/27 ni el botón "atrás".
2. **Access token solo en memoria; refresh por cookie HttpOnly en el arranque** — la persistencia de RF-17 se logra re-renovando contra `/auth/refresh`; el refresh token nunca es accesible por JS. Alternativa descartada: guardar el access token en `localStorage` (expone el token a XSS, choca con constitución #5).
3. **Proxy de desarrollo de Vite `/api` → `:8080`** — mantiene mismo origen y cookies, sin tocar el backend. Alternativa descartada: habilitar CORS con credenciales en el backend (cambio de backend fuera de spec y riesgo con `SameSite=Strict`).
4. **`fetch` nativo con wrapper propio** — evita dependencias (constitución #1). Alternativa descartada: `axios`.
5. **Formularios controlados + funciones puras de validación** — poca superficie y funciones testeables. Alternativa descartada: `react-hook-form` + `zod` (dependencias innecesarias para este alcance).
6. **Estado de sesión con React Context** — suficiente para un único dominio de auth. Alternativa descartada: Redux/Zustand (sobredimensionado).
7. **Mensajes en español centralizados en `copy.ts`** — cumple RNF-1 y separa texto visible del código (constitución #6). Alternativa descartada: literales dispersos en componentes.
8. **Tests con Vitest + Testing Library + jsdom** — encaja con Vite/TSX/DOM y con `npm run test`. Alternativa descartada: `node --test` (no renderiza React/TSX ni DOM sin cargadores adicionales).
9. **Estilado con Tailwind v4 + DaisyUI v5 vía `@tailwindcss/vite`** — stack de AGENTS.md en su versión vigente, CSS-first sin `postcss.config.js`; mobile-first 320–1280 px. Alternativa descartada: Tailwind v3 + DaisyUI v4 con `tailwind.config.js`/`postcss.config.js` (versión obsoleta que arrastra 5 vulnerabilidades altas de solo-dev). También descartado: CSS-in-JS.
10. **Refresh *single-flight* por pestaña** — cada pestaña ejecuta como máximo una renovación simultánea para evitar que dos `refresh` locales inutilicen el token rotado. La carrera entre pestañas distintas (el backend revoca y rota el refresh token en cada renovación) se acepta y se documenta como limitación; mitigación diferida: coordinar pestañas. Alternativa descartada: coordinación entre pestañas con `BroadcastChannel`/`storage` (complejidad fuera del alcance).

## 6. Estrategia de tests

- **Unitarias (Vitest)** de `validation.ts`, `mapLoginError`, `resolveHomePath`, `resolveInitialRoute`, `canAccess`: cubren RF-3..RF-7, RF-10, RF-13, RF-14, RF-16, RF-19, RF-24..RF-28.
- **Componentes (Testing Library + `user-event`)**:
  - `RegisterForm`: errores por campo, botón deshabilitado en envío, mensaje de email duplicado. (RF-1..RF-10)
  - `LoginForm`: genérico en 401, específico en 403, deshabilitado en envío. (RF-11..RF-16)
  - `HomeHeader`: nombre, encabezado por rol y cerrar sesión. (RF-21, RF-22, RF-24, RF-25)
- **Guards/routing**: sin sesión → login; rol incorrecto → home propia; con sesión en `/login` → home. (RF-26, RF-27, RF-28)
- **Integración con API simulada**: se intercepta `fetch` con `vi.stubGlobal` (sin MSW) para bootstrap, refresh en 401 y errores de red/5xx. (RF-17, RF-18, RF-19, RF-20, RF-23, RF-29)
- **Accesibilidad**: aserciones de `role`/`label`/foco y anuncio de errores. (RNF-4)
- **E2E manual** contra backend real (`docker compose up -d` + `mvn spring-boot:run`) para verificar cookies y auto-login encadenado, que no son reproducibles solo con mocks.
- Comandos: `npm run test` (vitest), `npm run lint`, `npm run build`.

## 7. Trazabilidad RF → plan

| RF | Dónde se cubre |
| --- | --- |
| RF-1, RF-11 | `RegisterForm`, `LoginForm`, `TextField`, `*Page` |
| RF-2 | `useRegister`, `authApi.register+login`, pseudocódigo REGISTER |
| RF-3..RF-7 | `validation.ts`, `RegisterForm` |
| RF-8 | `mapLoginError`/manejo 400 duplicado, `RegisterForm` |
| RF-9, RF-15 | `useRegister`/`useLogin` (estado `submitting`), `Spinner` |
| RF-10, RF-16 | `normalizeEmail`, payloads |
| RF-12 | `useLogin`, `getMe`, `resolveHomePath` |
| RF-13, RF-14 | `mapLoginError`, `ErrorAlert`, `LoginForm` |
| RF-17..RF-21 | `AuthContext`, `http.ts` (refresh+retry), BOOTSTRAP/LOGOUT |
| RF-22 | `HomeHeader` |
| RF-23 | BOOTSTRAP `restoreError`, `ErrorAlert` |
| RF-24, RF-25 | `UserHomePage`, `AdminHomePage`, `HomeHeader` |
| RF-26..RF-28 | `RequireAuth`, `RequireRole`, `PublicOnly`, `resolveInitialRoute` |
| RF-29 | `http.ts`, `mapLoginError('server')`, `ErrorAlert` |
| RF-30 | `TextField`/`PasswordInput` (prop `placeholder`), `LoginForm`, `RegisterForm`, `copy.ts` |
| RNF-1 | `copy.ts`, textos en español neutro (sin voseo) |
| RNF-2 | `http.ts` (sin exponer cuerpos sensibles), sin logs de contraseñas |
| RNF-3 | Tailwind mobile-first, pruebas de no desbordamiento 320–1280 |
| RNF-4 | `TextField`, `ErrorAlert`, `PasswordInput`, tests de accesibilidad |
| RNF-5 | guards como UX; rol y validación autoritativos del backend |
| RNF-6 | `Spinner`, mensajes por campo |

## 8. Riesgos y pendientes

- Cookie `refreshToken` es `Secure` + `SameSite=Strict`: en desarrollo sobre HTTP local puede no persistir según el navegador; se documenta y se verifica en el E2E manual (caso límite de la spec).
- Autenticación real (cookies) requiere backend + PostgreSQL levantados para el E2E.
- Dependencias nuevas (React Router, Vitest, Testing Library) aprobadas (constitución #1).
- Varias pestañas: el refresh rotativo del backend puede provocar que una renovación simultánea falle; se mitiga con *single-flight* por pestaña y se acepta la carrera entre pestañas como limitación documentada.
- Longitudes alineadas con Spec 002 (nombre 3–150, email 5–150, contraseña 8–20); sin pendientes.
