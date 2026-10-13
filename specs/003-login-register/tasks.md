- [x] **T1. Andamiaje del proyecto frontend.** RNF-3, RNF-4
- Hecho cuando: `frontend/` con Vite+React+TS+Tailwind+DaisyUI y scripts `dev/build/test/lint`; build, lint y un test smoke en verde.

- [x] **T2. Validación pura, mensajes y mapeo de errores.** RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-10, RF-13, RF-14, RF-16, RF-29, RNF-1
- Hecho cuando: `validation.ts`, `copy.ts` y `mapLoginError` con tests unitarios en verde que cubren límites 7/8/20/21, 150/151, email inválido, duplicado y 401/403/5xx.

- [x] **T3. Cliente HTTP y API de auth.** RF-2, RF-12, RF-17, RF-18, RF-20, RF-21, RF-23, RF-29, RNF-2
- Hecho cuando: `http.ts` adjunta Bearer, hace refresh *single-flight* y reintenta una vez en 401; `authApi` cubre register/login/refresh/logout/getMe; tests con `fetch` simulado en verde (incluye fallo de refresh → logout).

- [x] **T4. Contexto de sesión y bootstrap.** RF-17, RF-19, RF-20, RF-21, RF-23
- Hecho cuando: al abrir la app restaura con cookie válida, queda `anonymous` sin cookie y `restoreError` con reintento ante fallo de red; tests en verde.

- [x] **T5. Componentes base accesibles.** RF-1, RF-11, RNF-4, RNF-6
- Hecho cuando: `TextField`, `PasswordInput`, `Spinner` y `ErrorAlert` con label/aria, foco visible y `role="alert"`; tests de accesibilidad en verde.

- [x] **T6. Pantalla y formulario de login.** RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-29
- Hecho cuando: `LoginForm`/`LoginPage` con `useLogin` validan, deshabilitan el envío y muestran genérico en 401 y específico en 403; tests en verde.

- [x] **T7. Pantalla y formulario de registro con auto-login.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10
- Hecho cuando: `RegisterForm`/`RegisterPage` con `useRegister` muestran errores por campo y duplicado, y un registro válido encadena login y navega; tests en verde.

- [x] **T8. Pantallas de inicio por rol y cierre de sesión.** RF-21, RF-22, RF-24, RF-25
- Hecho cuando: `UserHomePage`, `AdminHomePage` y `HomeHeader` muestran nombre, encabezado por rol y cerrar sesión; logout revoca y vuelve al login; tests en verde.

- [x] **T9. Enrutado y guards.** RF-26, RF-27, RF-28
- Hecho cuando: rutas `/login`, `/register`, `/home`, `/admin`; sin sesión → login, rol incorrecto → su home y con sesión en login/registro → home; tests en verde.

- [x] **T10. E2E manual, responsive y cierre.** RNF-3, casos límite
- Hecho cuando: contra backend real (`docker compose up -d` + `mvn spring-boot:run`) se verifica auto-login, persistencia/revocación de sesión y ausencia de desbordamiento 320–1280 px; `MEMORY.md` actualizado.

- [x] **T11. Placeholders en login/registro y limpieza de voseo.** RF-30, RNF-1
- Hecho cuando: los campos vacíos de nombre, email, contraseña y confirmación muestran un texto de ayuda (neutro, sin voseo); los mensajes visibles no usan voseo; tests en verde.
