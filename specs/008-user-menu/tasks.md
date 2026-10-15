# Tareas — Spec 008 (Menú de usuario)

Cubre: RF-1 .. RF-39, RNF-1 .. RNF-7. Plan: `specs/008-user-menu/plan.md`.

- [x] **T1. Tema base: catálogo, provider y aplicación global.** RF-31 .. RF-36, RNF-5
- Archivos: `frontend/src/features/theme/model/themes.ts`, `features/theme/context/themeContext.ts`, `ThemeProvider.tsx`, `hooks/useTheme.ts`, `src/index.css`, `src/main.tsx`, `themes.test.ts`, `ThemeProvider.test.tsx`.
- Hecho cuando: `index.css` habilita `cupcake --default`, `sunset --prefersdark`, `retro`, `nord`, `abyss`; el provider aplica `data-theme` al elegir, persiste en `localStorage`, sincroniza entre pestañas (`storage`+`BroadcastChannel`), retrocede al default ante valor inválido y sin elección **no** fija `data-theme`; tests + `npm run lint` + `npm run build` pasan.

- [x] **T2. Capa de cuenta: API, validaciones y errores (frontend).** RF-8 .. RF-14, RF-18, RNF-1
- Archivos: `frontend/src/features/account/api/accountApi.ts`, `features/account/model/copy.ts`, `model/errors.ts`, `model/validation.ts`, `validation.test.ts`, `accountApi.test.ts`.
- Hecho cuando: `updateName`/`changePassword` llaman `/users/me` y `/users/me/password`; `validateProfileName` (recorta, 3–150) y `validatePasswordChange` (8–20 + coincidencia) son puras; los errores mapean 400/401/red a mensajes neutros; tests pasan.

- [x] **T3. Backend: listado de etiquetas con `noteCount` por USER.** RF-19, RF-27
- Archivos: `backend/src/main/java/fcs/memora/note/dto/TagResponse.java`, `note/NoteRepository.java`, `note/TagService.java`, `TagServiceTest.java`, `NoteRepositoryTest.java`.
- Hecho cuando: `GET /tags` devuelve `noteCount` acotado al USER (incluye archivadas, distintas y sin doble conteo), globales sin privadas homónimas y orden alfabético normalizado; `mvn test` (sin `.env`) pasa.

- [x] **T4. Backend: renombrar y eliminar etiquetas privadas.** RF-23 .. RF-26, RF-29, RF-30, RNF-6, RNF-7
- Archivos: `backend/src/main/java/fcs/memora/note/dto/RenameTagRequest.java`, `note/TagService.java`, `note/TagController.java`, `TagServiceTest.java`, `TagControllerTest.java`, `SecurityIntegrationTest.java`.
- Hecho cuando: `PATCH /tags/{id}` renombra (idempotente con el mismo nombre, 409 contra privada propia, fusión a global sin duplicar), `DELETE /tags/{id}` quita la etiqueta de las notas y la elimina, etiqueta ajena/inexistente → 404, ADMIN→`/tags/**`→403; tests pasan.

- [x] **T5. Menú de usuario en el encabezado.** RF-1 .. RF-7, RF-16, RF-17, RF-36, RNF-2
- Archivos: `frontend/src/features/account/components/UserMenu.tsx`, `features/account/components/ThemeMenu.tsx`, `features/home/components/HomeHeader.tsx`, `features/home/pages/UserHomePage.tsx`, `features/notes/pages/NotesPage.tsx`, `features/home/pages/AdminHomePage.tsx`, `UserMenu.test.tsx`, `HomeHeader.test.tsx`.
- Hecho cuando: `HomeHeader` reemplaza el botón de cerrar sesión por `<UserMenu/>`; abre/cierra con Escape/click fuera/acción, muestra el nombre, ofrece perfil/contraseña/tema/cerrar sesión y etiquetas **solo USER**, marca el tema activo, no aparece sin sesión y un fallo de red al cerrar sesión conserva la sesión; tests pasan.

- [x] **T6. Perfil (diálogo) y reflejo del nombre.** RF-8 .. RF-11, RF-37, RF-38
- Archivos: `frontend/src/features/auth/context/authContext.ts`, `features/auth/context/AuthProvider.tsx`, `features/account/components/ProfileDialog.tsx`, `ProfileDialog.test.tsx`, `AuthProvider.test.tsx`.
- Hecho cuando: el diálogo carga el perfil (carga/error con reintento), muestra nombre editable y correo de solo lectura, valida 3–150, guarda y refleja el nombre vía `applyProfile` (encabezado + menú) y cancela sin cambios; tests pasan.

- [x] **T7. Cambio de contraseña (diálogo).** RF-12 .. RF-15, RF-18
- Archivos: `frontend/src/features/account/components/ChangePasswordDialog.tsx`, `ChangePasswordDialog.test.tsx`.
- Hecho cuando: valida actual + nueva + confirmación (8–20 y coincidencia); contraseña actual incorrecta → aviso sin cerrar sesión; éxito → cierra sesión y lleva a login; error de red informa y conserva lo ingresado; tests pasan.

- [x] **T8. Gestión de etiquetas privadas + API (frontend).** RF-19 .. RF-30, RF-37 .. RF-39, RNF-1, RNF-2, RNF-4
- Archivos: `frontend/src/features/notes/model/types.ts`, `features/notes/api/tagsApi.ts`, `features/notes/model/errors.ts`, `features/account/components/PrivateTagsDialog.tsx`, `tagsApi.test.ts`, `PrivateTagsDialog.test.tsx`.
- Hecho cuando: `tagsApi` expone `noteCount`, `renameTag`, `deleteTag`; el diálogo lista privadas con contador (paginadas) + globales en solo lectura con contador propio, crea/renombra/elimina con confirmación, reutiliza la global con aviso, mapea 409 y muestra estados carga/error/vacío (sin desbordes 320–1280 px); `npm run test`, `lint` y `build` pasan.
