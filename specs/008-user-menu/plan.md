# Plan 008 — Menú de usuario (perfil, etiquetas privadas y temas)

Estado: aprobado

Cubre: RF-1 .. RF-39, RNF-1 .. RNF-7 (spec `specs/008-user-menu/spec.md`).

## 0. Concepto rector

- El **menú de usuario** vive en el encabezado autenticado (`HomeHeader`), se abre desde un
  **ícono** y reúne: perfil, contraseña, tema, etiquetas privadas (solo USER) y cerrar sesión.
- El **tema** se resuelve en dos capas: DaisyUI aplica el default/OS por CSS
  (`cupcake --default`, `sunset --prefersdark`) y una capa propia gestiona la **elección
  explícita**, su persistencia por dispositivo y la sincronización entre pestañas.
- La **gestión de etiquetas privadas** reutiliza las reglas de la Spec 007 (normalización,
  "gana la global", unicidad en BD por `(user_id, tag_name)`) y añade renombrar y eliminar.

## 1. Archivos y responsabilidades

### Backend — modificados
- `note/dto/TagResponse.java` — agregar `long noteCount` (notas del USER que usan la etiqueta).
  → RF-19, RF-27
- `note/NoteRepository.java` — agregar `countNotesByTagIdsAndUser(Collection<Long>, User)`
  (count(distinct note) acotado al USER). → RF-19, RF-27
- `note/TagService.java` — `list` calcula conteos por USER; nuevos `rename` y `delete`;
  reutiliza `TextNormalizer`, `DuplicateTagException`, `InvalidTagException` y la fusión a
  global. → RF-19, RF-22 .. RF-28, RF-30
- `note/TagController.java` — `PATCH /tags/{id}` (renombrar) y `DELETE /tags/{id}` (eliminar);
  `GET /tags` devuelve `noteCount`. → RF-19, RF-23 .. RF-26

### Backend — nuevos
- `note/dto/RenameTagRequest.java` — `{ @NotBlank @Size(min=1, max=25) String tagName }`.
  → RF-23

### Frontend — modificados
- `index.css` — habilitar los cinco temas:
  `@plugin "daisyui" { themes: cupcake --default, sunset --prefersdark, retro, nord, abyss; }`.
  → RF-31, RF-34
- `main.tsx` — envolver la app con `ThemeProvider` (el tema aplica a toda la interfaz, incluidas
  pantallas sin sesión). → RF-32
- `features/auth/model/types.ts` — `AuthUser` sin cambios; se reutiliza para el perfil. → RF-8
- `features/auth/context/authContext.ts` — agregar `applyProfile(user: AuthUser): void`.
  → RF-9
- `features/auth/context/AuthProvider.tsx` — implementar `applyProfile` (actualiza el nombre en
  memoria). → RF-9
- `features/home/components/HomeHeader.tsx` — reemplazar el botón de "Cerrar sesión" por
  `<UserMenu />`; deja de recibir `userName`/`onLogout`. → RF-1, RF-6
- `features/home/pages/UserHomePage.tsx`, `features/notes/pages/NotesPage.tsx`,
  `features/home/pages/AdminHomePage.tsx` — adaptar props de `HomeHeader`. → RF-1
- `features/notes/model/types.ts` — `Tag` agrega `noteCount`; nuevo `RenameTagPayload`.
  → RF-19
- `features/notes/api/tagsApi.ts` — `listTags` con `noteCount`; `renameTag(id, name)`,
  `deleteTag(id)`. → RF-19, RF-23, RF-26
- `features/notes/model/errors.ts` — mapear 409 (duplicado) y 404 (no encontrada). → RF-21,
  RF-24, RF-39

### Frontend — nuevos
- `features/theme/model/themes.ts` — `THEMES`, `DEFAULT_THEME` (`cupcake`), `DARK_THEME`
  (`sunset`), `isValidTheme`, `readStoredTheme`, `resolveDocumentTheme`. → RF-31 .. RF-35
- `features/theme/context/themeContext.ts` + `ThemeProvider.tsx` + `hooks/useTheme.ts` — estado
  del tema, aplicación a `document.documentElement[data-theme]`, persistencia y sincronización
  entre pestañas. → RF-32 .. RF-35
- `features/account/api/accountApi.ts` — `updateName(name)`, `changePassword(current, next)`.
  → RF-9, RF-12
- `features/account/model/copy.ts`, `model/errors.ts`, `model/validation.ts` — textos neutros,
  mapeo de errores y validaciones puras (nombre 3–150, contraseña 8–20 + confirmación).
  → RF-9, RF-10, RF-13, RF-14, RNF-1
- `features/account/components/UserMenu.tsx` — ícono disparador + panel; ítems por rol; cierre
  con Escape/click fuera; integra tema, etiquetas y logout. → RF-1 .. RF-7, RF-16, RF-17
- `features/account/components/ProfileDialog.tsx` — diálogo de perfil (nombre/correo, editar,
  cargar, error con reintento). → RF-8 .. RF-11, RF-37, RF-38
- `features/account/components/ChangePasswordDialog.tsx` — actual/nueva/confirmación; éxito →
  cierra sesión. → RF-12 .. RF-15, RF-18
- `features/account/components/ThemeMenu.tsx` — opciones con marca de selección accesible.
  → RF-36
- `features/account/components/PrivateTagsDialog.tsx` — privadas (con contador, paginadas) +
  globales en solo lectura (con contador propio); crear, renombrar, eliminar con confirmación.
  → RF-19 .. RF-30, RF-37 .. RF-39

## 2. Funciones puras (dependencias externas como parámetros)

Backend:
- `TextNormalizer.normalizeTagName/isValidTagName` (ya existen, Spec 007) — sin cambios. → RF-20,
  RF-23
- Regla de conteo: la agregación por USER vive en la consulta `countNotesByTagIdsAndUser`
  (no es pura; se prueba a nivel repositorio). → RF-19, RF-27

Frontend:
- `isValidTheme(value: string): value is Theme` — depende de `THEMES`. → RF-31, RF-35
- `readStoredTheme(storage: Pick<Storage,'getItem'>): Theme | null` — `storage` por parámetro.
  → RF-33, RF-35
- `resolveDocumentTheme(chosen: Theme | null): Theme | null` — `null` significa "sin
  `data-theme`" (aplica default/OS). → RF-34
- `paginate(items, page, pageSize): { pageItems, pageCount, page }` — pura. → RF-19
- `validateProfileName(name): string | null` (recorta, 3–150). → RF-9, RF-10
- `validatePasswordChange({ current, next, confirm }): { field, message }[]` — pura. → RF-12,
  RF-14
- `sortTagsByName(tags)` — pura (orden por nombre normalizado). → RF-19

## 3. Algoritmo (pseudocódigo)

**A. Listar etiquetas con conteo por USER — `TagService.list` → RF-19, RF-27**
```
user = findActiveUser(uuid)
globals = owner? findByUserOrderByTagNameAsc(owner).map(global=true) : []
privates = findByUserOrderByTagNameAsc(user) filtrando nombres ya presentes en globals
ids = (globals ++ privates).id
counts = countNotesByTagIdsAndUser(ids, user)        # solo notas del USER
RETURN ordenarPorNombre((globals ++ privates).map(t -> TagResponse(t.id, t.name, t.global, counts[t.id] ?? 0)))
```

**B. Crear privada — `TagService.create` (ya existente, Spec 007) → RF-20, RF-22, RF-30**
```
name = normalize(validar 1..25)
global = owner? findByUserAndTagName(owner, name)
SI global: RETURN (global.id, global.name, global=true, reused=true)   # RF-22
SI existsByUserAndTagNameIgnoreCase(user, name): throw DuplicateTag       # 409
save(Tag(user, name)); RETURN (id, name, false, false)
# Unicidad por USER garantizada por el constraint (user_id, tag_name) de la Spec 007 → RF-30
```

**C. Renombrar privada — `TagService.rename` → RF-23, RF-24, RF-25, RF-29, RNF-6**
```
user = findActiveUser(uuid)
tag = findById(id) o NOT_FOUND
SI tag.user.id != user.id: throw NOT_FOUND            # RF-29, RNF-7
name = normalize(validar 1..25)                        # 400 si inválido
SI name == tag.tagName: RETURN toResponse(tag)         # idempotente, RNF-6
owner = catalogOwner()
SI owner presente y owner.id != user.id:
   global = findByUserAndTagName(owner, name)
   SI global presente:                                  # RF-25
      fusionar(global, [tag])                           # reasocia notas, elimina la privada
      RETURN TagResponse(global.id, global.name, true, countForUser(global, user))
SI existsByUserAndTagNameIgnoreCase(user, name): throw DuplicateTag   # 409, RF-24
tag.setTagName(name); saveAndFlush                     # RF-23
RETURN toResponse(tag)
```

**D. Eliminar privada — `TagService.delete` → RF-26, RF-28, RF-29**
```
user = findActiveUser(uuid)
tag = findById(id) o NOT_FOUND
SI tag.user.id != user.id: throw NOT_FOUND
POR cada nota N en noteRepository.findByTags_Id(tag.id):
   N.tags.remove(tag); saveAndFlush(N)
tagRepository.delete(tag)
# Las etiquetas privadas sin notas NO se eliminan salvo esta acción explícita → RF-28
```

**E. Fusión (privada → global) — `TagService.fusionar` → RF-25**
```
POR cada nota N en noteRepository.findByTags_Id(private.id):
   N.tags.remove(private); N.tags.add(global); saveAndFlush(N)   # Set evita duplicados
tagRepository.delete(private)
```
(Mismo patrón que `AdminTagService.fuseCollidingPrivates`, Spec 007.)

**F. Tema — aplicación y persistencia → RF-32 .. RF-35**
```
# CSS (DaisyUI): cupcake --default; sunset --prefersdark → default = OS (claro/oscuro), fallback cupcake
alMontar():
   stored = readStoredTheme(localStorage)
   SI isValidTheme(stored): document.documentElement.dataset.theme = stored
   SINO: delete document.documentElement.dataset.theme        # default/OS vía CSS

setTheme(t):
   if !isValidTheme(t): return
   document.documentElement.dataset.theme = t
   localStorage.setItem(KEY, t)
   broadcast('memora.theme', t)                                # BroadcastChannel

onStorage(event) / onBroadcast(t):
   SI key coincide:
      SI isValidTheme(t): document.documentElement.dataset.theme = t
      SINO: delete data-theme                                  # RF-35 (retroceso)
# El SO en vivo lo cubre el @media (prefers-color-scheme: dark) de DaisyUI → RF-34
```

**G. Cambio de contraseña (frontend) → RF-12 .. RF-15, RF-18**
```
validar(current, next, confirm)                # 8–20 y coincidencia (RF-14)
SI inválido: mostrar errores; return
try: await changePassword(current, next)
catch error: mostrar error (400 actual incorrecta → RF-13; red → RF-18); return
# éxito: el servidor revoca refresh tokens (Spec 003)
signOut()                                       # limpia sesión local + redirige a /login (RF-15)
```

## 4. Interfaz del sistema

### API REST
| Método | Ruta | Rol | Request | Respuesta | RF |
|---|---|---|---|---|---|
| GET | `/tags` | USER | — | `[{id,tagName,global,noteCount}]` | RF-19, RF-27 |
| POST | `/tags` | USER | `{tagName}` | `201 {id,tagName,global,reused}` / `200` si reutiliza global | RF-20, RF-22 |
| PATCH | `/tags/{id}` | USER | `{tagName}` | `200 {id,tagName,global,noteCount}` | RF-23, RF-24, RF-25 |
| DELETE | `/tags/{id}` | USER | — | `204` | RF-26 |
| GET | `/users/me` | USER/ADMIN | — | perfil (nombre, correo, rol) | RF-8 |
| PUT | `/users/me` | USER/ADMIN | `{name}` | perfil actualizado | RF-9, RF-10 |
| PUT | `/users/me/password` | USER/ADMIN | `{currentPassword,newPassword}` | `200` (revoca sesiones) | RF-12 .. RF-15 |
| POST | `/auth/logout` | USER/ADMIN | — | `204` | RF-16 |

Errores: `400` nombre/contraseña inválidos, `404` etiqueta ajena/inexistente (RF-29), `409`
duplicado del mismo USER, `401/403` según sesión/rol.

### UI
- **Encabezado autenticado** (`HomeHeader`): ícono que abre `UserMenu` (RF-1..RF-3, RF-6, RF-7).
- **Menú**: nombre del usuario, perfil (diálogo), contraseña (diálogo), tema (marca de
  selección), etiquetas privadas (solo USER, diálogo) y cerrar sesión. (RF-2..RF-5, RF-36)
- **Perfil (diálogo)**: nombre editable + correo de solo lectura; guardar/cancelar; carga/error.
  (RF-8..RF-11, RF-37, RF-38)
- **Contraseña (diálogo)**: actual + nueva + confirmación. (RF-12..RF-14)
- **Etiquetas privadas (diálogo)**: privadas con contador (paginadas) + globales en solo lectura
  con contador propio; crear/renombrar/eliminar con confirmación; estados carga/error/vacío.
  (RF-19..RF-30, RF-37..RF-39)
- **Tema**: cinco opciones con marca de selección. (RF-31..RF-36)

## 5. Decisiones justificadas

- **D1 — `GET /tags` incluye `noteCount` por USER** (misma lista que usa el editor). Alternativa
  descartada: endpoint aparte `/tags/usage` → duplica datos y obliga a dos llamadas.
- **D2 — Renombrar/eliminar privadas en `/tags/{id}` (PATCH/DELETE).** Alternativa descartada:
  rutas `/tags/{id}/rename` y `/tags/{id}/delete` → menos idiomático.
- **D3 — Fusión privada→global en el servicio (gana la global).** Alternativa descartada:
  rechazar el renombrado con 409 → contradiría la Spec 007 y el requisito RF-25.
- **D4 — Paginación en el cliente.** Alternativa descartada: paginación en servidor → sobrecarga
  innecesaria para el volumen esperado.
- **D5 — Tema por CSS de DaisyUI (`--default`/`--prefersdark`) + JS mínimo** para la elección
  explícita, persistencia y sincronización. Alternativa descartada: gestionar todo el tema con
  `matchMedia` en JS → más código y más testeos, o añadir una librería de temas (viola la
  constitución).
- **D6 — Preferencia de tema en `localStorage` (por dispositivo).** Alternativa descartada:
  guardarla en la cuenta (servidor) → fuera de alcance (RNF-5).
- **D7 — Sincronización entre pestañas con `storage` + `BroadcastChannel`.** Alternativa
  descartada: solo recargar → incumpliría RF-32.
- **D8 — Tras cambiar contraseña, cerrar la sesión local y redirigir** (el servidor ya revoca
  refresh tokens). Alternativa descartada: reutilizar `signOut()` que llama a `/auth/logout` con
  el refresh ya revocado → ruido y error evitable.
- **D9 — Reflejar el nombre editado vía `AuthProvider.applyProfile`** (sin recargar). Alternativa
  descartada: volver a llamar `getMe()` → petición extra innecesaria.
- **D10 — Menú propio (sin dependencia nueva).** Alternativa descartada: librería headless de
  menús → stack innecesario.

## 6. Estrategia de tests

Backend (`cd backend && mvn test`, **sin `.env`**):
- `TagServiceTest`: `list` con `noteCount` por USER; `rename` (ok, mismo nombre idempotente,
  409 contra privada, fusión a global); `delete` (quita de notas y elimina); rechazo de etiqueta
  ajena (404). → RF-19, RF-23..RF-30
- `TagControllerTest`: `PATCH`/`DELETE` con códigos 200/204/409/404; `GET` devuelve `noteCount`.
  → RF-19, RF-23..RF-26
- `NoteRepositoryTest`: `countNotesByTagIdsAndUser` acota al USER e incluye archivadas, sin doble
  conteo. → RF-27
- `SecurityIntegrationTest`: ADMIN → `/tags/**` = 403; sin token = 401. → RF-4, RF-29, RNF-7
- (Sin cambios en `UserService`/`UserController`: ya cubren perfil y contraseña.)

Frontend (`npm run test`, luego `npm run lint` y `npm run build`):
- `theme/model/themes.test.ts`: `isValidTheme`, `readStoredTheme`, `resolveDocumentTheme`. →
  RF-31, RF-33..RF-35
- `theme/context/ThemeProvider.test.tsx`: aplica/persiste, retroceso ante valor inválido, sincronía
  entre pestañas (evento `storage`). → RF-32..RF-35
- `account/model/validation.test.ts`: nombre 3–150 y contraseña 8–20 + confirmación. → RF-9,
  RF-10, RF-12, RF-14
- `account/components/UserMenu.test.tsx`: abre/cierra (Escape/click fuera), ítems por rol
  (etiquetas solo USER), indicador de tema. → RF-1..RF-7, RF-36
- `ProfileDialog.test.tsx`: muestra nombre/correo, guarda, valida, cancela, carga/error con
  reintento. → RF-8..RF-11, RF-37, RF-38
- `ChangePasswordDialog.test.tsx`: validación, contraseña actual incorrecta, éxito → cierra
  sesión, error de red. → RF-12..RF-15, RF-18
- `PrivateTagsDialog.test.tsx`: lista con contador (privadas + globales solo lectura), paginación,
  crear/renombrar/eliminar con confirmación, reutilización de global, 409, vacío y error/reintento.
  → RF-19..RF-30, RF-37..RF-39
- `tagsApi.test.ts`: `noteCount`, `renameTag`, `deleteTag`. → RF-19, RF-23, RF-26
- `HomeHeader.test.tsx`: el menú reemplaza el botón de cerrar sesión. → RF-6

## 7. Riesgos y notas

- **Migración de temas**: cambiar `index.css` habilita solo los cinco temas; cualquier uso de
  `light`/`dark` por defecto deja de existir → reemplazar por `cupcake`/`sunset`.
- **`--prefersdark` + `data-theme`**: la elección explícita debe fijar `data-theme` en `<html>`;
  al no elegir, **no** fijarlo para que el CSS aplique default/OS.
- **Nombre del encabezado**: al pasar a un menú con ícono, actualizar las tres páginas que usan
  `HomeHeader` y sus tests.
- **`mvn test` sin `.env`** (JWT), ya documentado en `MEMORY.md`.

## 8. Cobertura de RF

- Menú: RF-1..RF-7 → `HomeHeader`, `UserMenu`.
- Perfil: RF-8..RF-11 → `ProfileDialog`, `AuthProvider.applyProfile`, `/users/me`.
- Contraseña: RF-12..RF-15 → `ChangePasswordDialog`, `/users/me/password`.
- Cierre de sesión y errores: RF-16..RF-18 → `UserMenu`, `AuthProvider`, `accountApi`,
  `account/model/errors`.
- Etiquetas privadas: RF-19..RF-30 → `TagService`, `TagController`, `PrivateTagsDialog`,
  `tagsApi`, `NoteRepository`.
- Tema: RF-31..RF-36 → `theme` (`themes.ts`, `ThemeProvider`, `ThemeMenu`, `index.css`).
- Estados y errores de vistas: RF-37..RF-39 → `ProfileDialog`, `PrivateTagsDialog`.
- RNF-1..RNF-7 → copys neutros, accesibilidad del menú/diálogos, no exponer datos, responsive,
  preferencia por dispositivo, idempotencia, autorización en servidor.
