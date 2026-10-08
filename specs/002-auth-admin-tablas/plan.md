# Plan 002 — Autenticación, autorización y entidades de dominio

## Stack y restricciones base

- Java 21, Spring Boot 4.1.1, Maven, JPA/Hibernate, PostgreSQL, Lombok.
- Arquitectura obligatoria: **Controller → Service → Repository**; controllers nunca tocan repositories.
- DTOs como Java records; entidades JPA con Lombok.
- Código en inglés; textos visibles al usuario en español neutro.
- Sin eliminación física; sin frontend en esta spec.

---

## 1. Archivos a crear o modificar

### Dependencias y configuración

| Archivo | Responsabilidad | RF cubiertos |
|---|---|---|
| `backend/pom.xml` | Agregar `spring-boot-starter-security`, `spring-security-crypto` (BCrypt ya incluido) y librería JWT (`jjwt` o `spring-security-oauth2-jose`). | RF-6, RF-9, RNF-1, RNF-4 |
| `backend/.env.example` | Documentar nuevas variables: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`. | RF-2, RF-3 |
| `backend/src/main/resources/application.yaml` | Binding de variables JWT y seguridad; mantener placeholders sin defaults sensibles. | RF-6, RNF-4 |
| `fcs.memora.config.SecurityConfig` | Configurar Spring Security: deshabilitar CSRF (API stateless), definir rutas públicas (`/auth/**`, `/health`), proteger el resto, insertar filtro JWT. | RF-6, RF-7, RF-8, RF-9, RF-10 |
| `fcs.memora.config.JwtProperties` | Record/POJO de propiedades JWT (`secret`, `accessTtl`, `refreshTtl`). | RF-6, RNF-4 |
| `fcs.memora.config.AdminBootstrap` | Listener/CommandLineRunner que detecta instalación limpia y crea el ADMIN inicial. | RF-1, RF-2, RF-3, RF-12 |

### Entidades JPA

| Archivo | Responsabilidad | RF cubiertos |
|---|---|---|
| `fcs.memora.user.User` | Entidad `users`: `id`, `uuidUser`, `email`, `name`, `passwordHash`, `role`, `lastNotePosition`, `createdAt`, `updatedAt`, `userStatus`. | RF-5, RF-11, RF-13, RF-19, RF-20, RF-21, RF-REF-1 |
| `fcs.memora.note.Note` | Entidad `notes`: `id`, `user`, `title`, `content`, `contentJson`, `checklistMode`, `rememberAt`, `isPinned`, `isArchived`, `position`, `createdAt`, `updatedAt`, `tags`. | RF-14, RF-15, RF-16, RF-17, RF-19, RF-26, RF-27, RF-28 |
| `fcs.memora.tag.Tag` | Entidad `tags`: `id`, `user`, `tagName`, `createdAt`, `updatedAt`. | RF-18, RF-19 |

### Repositorios

| Archivo | Responsabilidad | RF cubiertos |
|---|---|---|
| `fcs.memora.user.UserRepository` | Buscar por email normalizado, por UUID, verificar existencia de ADMIN. | RF-5, RF-6, RF-12, RF-13, RF-20 |
| `fcs.memora.note.NoteRepository` | CRUD de notas filtradas por usuario; queries por tags. | RF-14, RF-15, RF-17 |
| `fcs.memora.tag.TagRepository` | Buscar por usuario y nombre normalizado; listar por usuario. | RF-18 |

### Servicios

| Archivo | Responsabilidad | RF cubiertos |
|---|---|---|
| `fcs.memora.auth.AuthService` | Registro, login, refresh, validación de credenciales, revocación de tokens. | RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-21, RF-22 |
| `fcs.memora.auth.JwtService` | Generar y validar access tokens JWT; generar refresh tokens. | RF-6, RF-9, RF-10, RNF-4 |
| `fcs.memora.auth.RefreshTokenService` | Persistir, buscar y revocar refresh tokens. | RF-9, RF-10, RF-24, RF-25 |
| `fcs.memora.auth.PasswordService` | Hashear y verificar contraseñas con BCrypt. | RNF-1 |
| `fcs.memora.user.UserService` | Perfil propio, cambio de nombre/contraseña. | RF-11, RF-24 |
| `fcs.memora.admin.AdminService` | Cambiar estado de cualquier usuario; impedir auto-modificación. | RF-13, RF-23, RF-25 |
| `fcs.memora.note.NoteService` | Crear, leer, actualizar notas; calcular posición; manejar checklist. | RF-14, RF-15, RF-16, RF-17, RF-26, RF-27, RF-28 |
| `fcs.memora.tag.TagService` | Crear, listar, asociar tags; garantizar unicidad normalizada. | RF-18 |

### Controllers

| Archivo | Responsabilidad | RF cubiertos |
|---|---|---|
| `fcs.memora.auth.AuthController` | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`. | RF-4, RF-5, RF-6, RF-9 |
| `fcs.memora.user.UserController` | `GET /users/me`, `PUT /users/me`, `PUT /users/me/password`. | RF-11 |
| `fcs.memora.admin.AdminController` | `PATCH /admin/users/{uuid}/status`. | RF-13 |
| `fcs.memora.note.NoteController` | `POST /notes`, `GET /notes`, `GET /notes/{id}`, `PUT /notes/{id}`, `DELETE /notes/{id}`. | RF-14, RF-15, RF-16, RF-17, RF-26, RF-27, RF-28 |
| `fcs.memora.tag.TagController` | `POST /tags`, `GET /tags`, `GET /tags/{id}`. | RF-18 |

### DTOs (records)

- `RegisterRequest`, `LoginRequest`, `LoginResponse`, `RefreshResponse`.
- `UpdateProfileRequest`, `ChangePasswordRequest`, `UserResponse`.
- `UpdateUserStatusRequest`.
- `CreateNoteRequest`, `UpdateNoteRequest`, `ChecklistItem`, `NoteResponse`.
- `CreateTagRequest`, `TagResponse`.

---

## 2. Funciones puras identificadas

Funciones que no dependen de estado global ni de I/O; sus dependencias externas se pasan como parámetros.

| Función | Entrada | Salida | RF |
|---|---|---|---|
| `normalizeEmail(String email)` | Email crudo | Email en minúsculas y sin espacios externos | RF-5 |
| `normalizeTagName(String name)` | Nombre de tag crudo | Nombre en minúsculas y sin espacios externos | RF-18 |
| `calculateNextNotePosition(long lastPosition)` | Última posición generada | `lastPosition + 100000` | RF-15 |
| `buildChecklistContent(List<ChecklistItem> items)` | Lista de ítems | `Map<String, Boolean>` | RF-16 |

Las validaciones de formato, obligatoriedad y longitud se implementan con **Jakarta Bean Validation** en los DTOs (`@NotBlank`, `@Email`, `@Size`, etc.), aprovechando la dependencia `spring-boot-starter-validation` ya existente.

---

## 3. Algoritmos en pseudocódigo

### 3.1 Instalación limpia y creación de ADMIN

```text
function bootstrapAdmin():
    if userRepository.count() > 0:
        return  // no es instalación limpia

    adminEmail = env("ADMIN_EMAIL")
    adminPassword = env("ADMIN_PASSWORD")

    if adminEmail is missing or adminPassword is missing:
        log error "Faltan ADMIN_EMAIL o ADMIN_PASSWORD"
        exit application

    admin = new User(
        uuidUser = generateUuid(),
        email = normalizeEmail(adminEmail),
        name = "Administrator",
        passwordHash = hashPassword(adminPassword),
        role = ADMIN,
        userStatus = ACTIVE,
        lastNotePosition = 0
    )
    userRepository.save(admin)
```
**RF:** RF-1, RF-2, RF-3, RF-12, RF-20, RF-REF-1.

---

### 3.2 Registro de visitante

```text
function register(request):
    email = normalizeEmail(request.email)
    if userRepository.existsByEmail(email):
        throw EmailAlreadyExistsException

    role = USER  // ignora request.role
    user = new User(
        uuidUser = generateUuid(),
        email = email,
        name = request.name.trim(),
        passwordHash = hashPassword(request.password),
        role = role,
        userStatus = ACTIVE,
        lastNotePosition = 0
    )
    userRepository.save(user)
```
**RF:** RF-4, RF-5, RF-21, RF-22, RF-REF-1.

---

### 3.3 Login

```text
function login(emailRaw, password):
    email = normalizeEmail(emailRaw)
    user = userRepository.findByEmail(email)

    if user is null or not matchesPassword(password, user.passwordHash):
        throw InvalidCredentialsException(401)

    if user.userStatus in [BLOCKED, DISABLED]:
        throw AccountDisabledException(403)

    accessToken = jwtService.generateAccessToken(user)
    refreshToken = jwtService.generateRefreshToken(user)
    refreshTokenService.save(refreshToken, user)

    return { accessToken, refreshToken }
```
**RF:** RF-6, RF-7, RF-8, RNF-1, RNF-4.

---

### 3.4 Renovación de access token

```text
function refresh(refreshTokenValue):
    refreshToken = refreshTokenService.findByToken(refreshTokenValue)

    if refreshToken is null or refreshToken.isExpired():
        throw InvalidRefreshTokenException

    user = refreshToken.user
    if user.userStatus in [BLOCKED, DISABLED]:
        throw AccountDisabledException

    newAccessToken = jwtService.generateAccessToken(user)
    return { accessToken = newAccessToken }
```
**RF:** RF-9, RF-10.

---

### 3.5 Cambio de contraseña

```text
function changePassword(userId, currentPassword, newPassword):
    user = userRepository.findById(userId)

    if not matchesPassword(currentPassword, user.passwordHash):
        throw InvalidCredentialsException

    user.passwordHash = hashPassword(newPassword)
    userRepository.save(user)
    refreshTokenService.revokeAllByUser(user)
```
**RF:** RF-11, RF-24, RF-REF-1.

---

### 3.6 Cambio de estado por ADMIN

```text
function updateUserStatus(adminId, targetUserUuid, newStatus):
    if targetUserUuid == adminId:
        throw ForbiddenException  // no puede modificarse a sí mismo

    targetUser = userRepository.findByUuidUser(targetUserUuid)
    targetUser.userStatus = newStatus
    userRepository.save(targetUser)

    if newStatus in [BLOCKED, DISABLED]:
        refreshTokenService.revokeAllByUser(targetUser)
```
**RF:** RF-13, RF-23, RF-25.

---

### 3.7 Crear nota

```text
function createNote(userId, request):
    user = userRepository.findById(userId)

    position = calculateNextNotePosition(user.lastNotePosition)

    note = new Note(
        user = user,
        title = request.title.trim(),
        content = request.checklistMode ? "" : defaultEmpty(request.content),
        contentJson = request.checklistMode ? buildChecklistContent(request.checklistItems) : null,
        checklistMode = request.checklistMode,
        rememberAt = request.rememberAt,
        isPinned = defaultFalse(request.isPinned),
        isArchived = defaultFalse(request.isArchived),
        position = position
    )

    if request.tags is not empty:
        note.tags = tagService.resolveTags(userId, request.tags)

    user.lastNotePosition = position
    noteRepository.save(note)
    userRepository.save(user)

    return note
```
**RF:** RF-14, RF-15, RF-16, RF-17, RF-26, RF-27, RF-28, RF-REF-1.

---

### 3.8 Crear tag

```text
function createTag(userId, name):
    normalized = normalizeTagName(name)

    if tagRepository.existsByUserAndTagName(userId, normalized):
        throw TagAlreadyExistsException

    tag = new Tag(user = user, tagName = normalized)
    return tagRepository.save(tag)
```
**RF:** RF-18, RF-REF-1.

---

## 4. Interfaz del sistema

La spec 002 cubre solo el backend; el frontend está fuera de alcance. La interfaz expuesta será una **API REST JSON** documentada con OpenAPI/SpringDoc.

| Método | Endpoint | Protegido | Rol permitido | Descripción |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | - | Registro de usuario |
| `POST` | `/auth/login` | No | - | Login, devuelve JWT y setea cookie HttpOnly con refresh token |
| `POST` | `/auth/refresh` | No | - | Renueva access token usando cookie HttpOnly |
| `GET` | `/users/me` | Sí | USER / ADMIN | Perfil propio |
| `PUT` | `/users/me` | Sí | USER / ADMIN | Cambiar nombre propio |
| `PUT` | `/users/me/password` | Sí | USER / ADMIN | Cambiar contraseña propia |
| `PATCH` | `/admin/users/{uuid}/status` | Sí | ADMIN | Cambiar estado de usuario |
| `POST` | `/notes` | Sí | **USER** | Crear nota |
| `GET` | `/notes` | Sí | **USER** | Listar notas propias |
| `GET` | `/notes/{id}` | Sí | **USER** | Obtener nota propia |
| `PUT` | `/notes/{id}` | Sí | **USER** | Actualizar nota propia |
| `DELETE` | `/notes/{id}` | Sí | **USER** | Eliminar nota propia |
| `POST` | `/tags` | Sí | **USER** | Crear tag |
| `GET` | `/tags` | Sí | **USER** | Listar tags propios |

**Manejo de errores:** respuesta estándar JSON:

```json
{
  "title": "Solicitud inválida",
  "status": 400,
  "detail": "El request contiene campos inválidos"
}
```

---

## 5. Decisiones técnicas justificadas

### 5.1 Spring Security + JWT

- **Justificación:** RF-6 a RF-10 requieren autenticación stateless, access token JWT de corta duración y refresh token de 30 días en cookie HttpOnly. Spring Security es el estándar en el ecosistema Spring Boot.
- **Alternativa descartada:** Sesiones HTTP stateful. Complica el refresh token en cookie HttpOnly y no escala horizontalmente sin sticky sessions.

### 5.2 BCrypt para contraseñas

- **Justificación:** RNF-1. BCrypt incluye salt automático, es resistente a rainbow tables y viene incluido en Spring Security.
- **Alternativa descartada:** MD5/SHA-256 sin salt o con salt manual. Son menos seguros y más propensos a errores.

### 5.3 Almacenar refresh tokens en base de datos

- **Justificación:** RF-24 y RF-25 exigen revocar tokens al cambiar contraseña o al bloquear/deshabilitar un usuario. Sin persistencia no es posible invalidar refresh tokens.
- **Alternativa descartada:** Refresh token stateless como JWT. No permite revocación inmediata.

### 5.4 UUID v4 sin guiones como identificador visible

- **Justificación:** RF-20. No es secuencial, no revela cantidad de usuarios ni orden de creación.
- **Alternativa descartada:** ID numérico secuencial expuesto. Revela información y facilita enumeración.

### 5.5 Posición de nota con incremento de 100000

- **Justificación:** RF-15. Deja huecos suficientes para implementar reordenamiento manual en el futuro sin migraciones masivas.
- **Alternativa descartada:** Incremento de 1. Reordenar una nota requeriría recalcular muchas posiciones.

### 5.6 Checklist como `Map<String, Boolean>` en columna `jsonb`

- **Justificación:** RF-16. PostgreSQL soporta `jsonb`; es flexible y evita una tabla adicional para este alcance.
- **Alternativa descartada:** Tabla separada `checklist_items`. Más normalizada pero innecesariamente compleja para la funcionalidad actual.

### 5.7 Controllers no acceden a repositories

- **Justificación:** Constitución #3 y `AGENTS.md`. Mantiene la lógica de negocio y autorización en la capa Service.
- **Alternativa descartada:** Lógica en controllers con acceso directo a repositories. Difícil de testear y de mantener.

### 5.8 ADMIN no gestiona notas ni tags

- **Justificación:** La spec define al ADMIN como rol único que solo cambia estados de usuario. Restringir `/notes/**` y `/tags/**` a `ROLE_USER` simplifica la autorización y evita que el ADMIN acceda a información ajena.
- **Alternativa descartada:** Permitir ADMIN en endpoints de notas/tags con filtros adicionales. Añade complejidad innecesaria y no aporta valor según la spec.

### 5.9 Bean Validation en DTOs

- **Justificación:** `spring-boot-starter-validation` ya está en el proyecto. Reduce código repetitivo y centraliza validaciones de formato, obligatoriedad y longitud.
- **Alternativa descartada:** Validaciones manuales en services. Más verboso y propenso a inconsistencias.

---

## 6. Estrategia de tests

Stack de tests: **JUnit 5, Mockito, MockMvc, `@MockitoBean`, `@DataJpaTest`**. Comando de verificación: `cd backend && mvn test`.

### 6.1 Tests unitarios de servicios

Cada servicio se testea aislando repositories con Mockito:

- `AuthServiceTest`: registro con email duplicado, login exitoso, login con credenciales inválidas, login con usuario BLOCKED/DISABLED.
- `JwtServiceTest`: generación y validación de tokens, token expirado.
- `PasswordServiceTest`: hash y match con BCrypt.
- `UserServiceTest`: cambio de nombre, cambio de contraseña con contraseña actual incorrecta.
- `AdminServiceTest`: cambio de estado, auto-modificación prohibida.
- `NoteServiceTest`: creación con posición, modo checklist, título vacío.
- `TagServiceTest`: unicidad normalizada.

### 6.2 Tests de controllers (`@WebMvcTest`)

- `AuthControllerTest`, `UserControllerTest`, `AdminControllerTest`, `NoteControllerTest`, `TagControllerTest`.
- Verificar HTTP status, serialización JSON, validaciones de entrada y autorización básica.

### 6.3 Tests de repositorios (`@DataJpaTest`)

- `UserRepositoryTest`: unicidad de email, búsqueda por UUID, conteo de ADMIN.
- `NoteRepositoryTest`: búsqueda por usuario, orden por posición.
- `TagRepositoryTest`: unicidad por usuario y nombre normalizado.

### 6.4 Tests de bootstrap

- `AdminBootstrapTest`: instalación limpia con credenciales presentes crea ADMIN; instalación limpia sin credenciales falla; sistema con usuarios existentes no crea segundo ADMIN.

### 6.5 Tests de seguridad

- Verificar que endpoints protegidos requieran JWT.
- Verificar que `/admin/**` requiera rol ADMIN.
- Verificar que `/notes/**` y `/tags/**` requieran rol USER.
- Verificar que usuarios solo accedan a sus propias notas/tags.

---

## Cobertura de RF por parte del plan

| RF | Cubierto en |
|---|---|
| RF-1, RF-2, RF-3, RF-12 | `AdminBootstrap`, `UserRepository` |
| RF-4, RF-5, RF-21, RF-22, RF-REF-1 | `AuthController`, `AuthService`, `User`, DTOs con Bean Validation |
| RF-6, RF-9, RF-10, RNF-4 | `AuthController`, `AuthService`, `JwtService`, `RefreshTokenService`, `SecurityConfig` |
| RF-7, RF-8 | `AuthService` |
| RF-11, RF-24 | `UserController`, `UserService` |
| RF-13, RF-23, RF-25 | `AdminController`, `AdminService` |
| RF-14, RF-15, RF-16, RF-17, RF-26, RF-27, RF-28, RF-REF-1 | `NoteController`, `NoteService`, `Note` |
| RF-18, RF-REF-1 | `TagController`, `TagService`, `Tag` |
| RF-19 | Entidades con `@CreatedDate`/`@LastModifiedDate` o callbacks JPA |
| RF-20 | `User` + generación en `AuthService`/`AdminBootstrap` |
| RNF-1 | `PasswordService` con BCrypt |
| RNF-2 | Servicios filtran por `userId` del token; ADMIN excluido de notas/tags |
| RNF-3 | DTOs nunca exponen `id`; solo `uuidUser` |
| RNF-5 | `UserResponse` incluye `uuidUser` |
| RNF-6 | Jakarta Validation en DTOs |
