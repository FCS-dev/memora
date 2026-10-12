# Tareas — Spec 002: Autenticación, autorización y entidades de dominio

Orden de dependencia: configuración → entidades core → auth → usuario → admin → dominio → tests de integración → documentación.

- [x] **T1. Configurar seguridad y JWT.** RF-6, RF-9, RF-10, RNF-1, RNF-4
  - Agregar dependencias en `pom.xml`: `spring-boot-starter-security`, librería JWT (`jjwt` o similar) y `springdoc-openapi`.
  - Crear `JwtProperties` con `secret`, `accessTtl`, `refreshTtl`.
  - Crear `SecurityConfig` con CSRF deshabilitado, rutas públicas (`/auth/**`, `/health`), rutas protegidas y placeholder para filtro JWT.
  - Actualizar `.env.example` con `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`.
  - Hecho cuando: `mvn test` compila sin errores y los tests existentes siguen pasando.

- [x] **T2. Crear entidad User y UserRepository.** RF-5, RF-19, RF-20, RF-21, RF-REF-1
  - Crear `User` con campos `id`, `uuidUser`, `email`, `name`, `passwordHash`, `role`, `lastNotePosition`, `createdAt`, `updatedAt`, `userStatus`.
  - Crear `UserRepository` con métodos: `findByEmail`, `findByUuidUser`, `existsByEmail`, `countByRole`.
  - Hecho cuando: `@DataJpaTest` guarda y recupera un usuario correctamente.

- [x] **T3. Implementar PasswordService y utilitarios de normalización.** RF-5, RF-18, RNF-1
  - Crear `PasswordService` con BCrypt.
  - Crear funciones puras `normalizeEmail` y `normalizeTagName`.
  - Hecho cuando: los tests unitarios verifican hash/match y normalización correcta.

- [x] **T4. Implementar JwtService y refresh tokens.** RF-6, RF-9, RF-10, RNF-4
  - Crear `JwtService` para generar y validar access tokens JWT.
  - Crear entidad `RefreshToken` y `RefreshTokenRepository`.
  - Crear `RefreshTokenService` para guardar, buscar y revocar tokens.
  - Hecho cuando: se genera un access token válido y se persiste un refresh token.

- [x] **T5. Implementar bootstrap de ADMIN inicial.** RF-1, RF-2, RF-3, RF-12
  - Crear `AdminBootstrap` que verifique instalación limpia y cree el ADMIN con credenciales de entorno.
  - Fallar al arrancar con mensaje claro en logs si faltan `ADMIN_EMAIL` o `ADMIN_PASSWORD`.
  - Hecho cuando: tests de bootstrap pasan para los tres casos (con credenciales, sin credenciales, con usuarios existentes).

- [x] **T6. Implementar AuthService y AuthController.** RF-4, RF-5, RF-6, RF-7, RF-8, RF-21, RF-22, RF-REF-1
  - Implementar registro con validación de email único, longitudes y contraseña mínima de 8 caracteres.
  - Implementar login que emita access token y refresh token en cookie `HttpOnly`.
  - Rechazar credenciales inválidas con HTTP 401 sin detalles.
  - Rechazar usuarios BLOCKED/DISABLED con HTTP 403 sin detalles.
  - Ignorar rol enviado en el registro; siempre crear USER.
  - Hecho cuando: tests de `@WebMvcTest` y unitarios de `AuthService` pasan.

- [x] **T7. Implementar UserService y UserController.** RF-11, RF-24, RF-REF-1
  - Endpoint `GET /users/me` para obtener perfil propio.
  - Endpoint `PUT /users/me` para cambiar nombre propio.
  - Endpoint `PUT /users/me/password` para cambiar contraseña propia, revocando todos los refresh tokens.
  - Validar contraseña actual antes de cambiar.
  - Hecho cuando: tests de controller y service pasan.

- [x] **T8. Implementar AdminService y AdminController.** RF-13, RF-23, RF-25
  - Endpoint `PATCH /admin/users/{uuid}/status` para cambiar estado entre ACTIVE, BLOCKED, DISABLED.
  - Impedir que el ADMIN modifique su propio estado.
  - Revocar tokens del usuario afectado al pasar a BLOCKED/DISABLED.
  - Hecho cuando: tests de autorización y cambio de estado pasan.

- [x] **T9. Crear entidades Note y Tag con repositorios.** RF-14, RF-17, RF-18, RF-19, RF-REF-1
  - Crear `Note` con campos `id`, `user`, `title`, `content`, `contentJson`, `checklistMode`, `rememberAt`, `isPinned`, `isArchived`, `position`, `createdAt`, `updatedAt`, `tags`.
  - Crear `Tag` con campos `id`, `user`, `tagName`, `createdAt`, `updatedAt`.
  - Crear `NoteRepository` y `TagRepository`.
  - Hecho cuando: `@DataJpaTest` persiste notas y tags con relaciones correctas.

- [x] **T10. Implementar TagService y TagController.** RF-18, RF-REF-1
  - Endpoints `POST /tags` y `GET /tags`.
  - Garantizar unicidad de tag por usuario comparando en minúsculas y sin espacios externos.
  - Restringir a usuarios con rol USER.
  - Hecho cuando: tests de controller y service pasan.

- [x] **T11. Implementar NoteService y NoteController.** RF-14, RF-15, RF-16, RF-17, RF-26, RF-27, RF-28, RF-REF-1
  - Endpoints CRUD para `/notes`.
  - Calcular posición como `user.lastNotePosition + 100000` y actualizar el contador del usuario.
  - Manejar modo checklist: `content = ""` y `contentJson` como pares `text → checked`.
  - Soportar `rememberAt`, `isPinned`, `isArchived`.
  - Asociar tags existentes del usuario.
  - Restringir a usuarios con rol USER.
  - Hecho cuando: tests de controller y service pasan.

- [x] **T12. Tests de integración de seguridad y autorización.** RF-7, RF-8, RF-10, RNF-2
  - Verificar que endpoints protegidos requieran JWT.
  - Verificar que `/admin/**` requiera rol ADMIN.
  - Verificar que `/notes/**` y `/tags/**` requieran rol USER.
  - Verificar que un usuario no acceda a notas/tags de otro usuario.
  - Hecho cuando: todos los tests de integración pasan.

- [x] **T13. Documentar API con OpenAPI/SpringDoc.** RF-6, RF-11, RF-13, RF-14, RF-18
  - Configurar SpringDoc.
  - Asegurar que todos los endpoints aparezcan documentados.
  - Hecho cuando: se accede a `/swagger-ui.html` y se visualizan los endpoints correctamente.

- [x] **T14. Respuestas 401/403 con cuerpo de error.** RF-29, RF-30
  - `AuthenticationEntryPoint` (401) y `AccessDeniedHandler` (403) con el cuerpo de error estándar.
  - `JwtAuthenticationFilter` no debe lanzar con token expirado/malformado.
  - Hecho cuando: token ausente/expirado/malformado → 401 con `{title, status, detail}`; autenticado sin permiso → 403 con el mismo cuerpo; tests en verde.

- [x] **T15. Marcar un ítem de checklist (`PATCH /notes/{uuid}/checklist`).** RF-31
  - DTO `{item, checked}`; servicio valida dueño, `checklistMode` y existencia del ítem; actualiza solo ese booleano en `contentJson`.
  - Hecho cuando: marcar/desmarcar es idempotente y devuelve la nota; nota ajena/inexistente/ítem ausente → 404; nota no-checklist → 400; tests en verde.

---

## Criterios de finalización comunes

- Cada tarea termina con tests en verde.
- No se introduce código sin vincularlo a un RF de la spec.
- No se exponen datos sensibles ni PII en logs ni respuestas.
