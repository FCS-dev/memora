# Plan 010 — Rediseño de interfaz de usuario

## Base técnica

- React 19 + Vite + TypeScript.
- Tailwind CSS 4 con `@tailwindcss/vite`.
- DaisyUI 5 con temas personalizados definidos en CSS.
- Fuente `Geist` cargada por `@import` desde Google Fonts.

## Archivos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/index.css` | Define los temas `memora-light` y `memora-dark`, importa la fuente Geist y establece estilos base. |
| `frontend/src/features/theme/model/themes.ts` | Expone los nombres de los temas y la lógica de almacenamiento/validación. |
| `frontend/src/features/account/model/copy.ts` | Etiquetas legibles para las opciones de tema. |
| `frontend/src/shared/components/Logo.tsx` | Componente de logo: mark SVG + wordmark “Memora”. |
| `frontend/src/features/home/components/HomeHeader.tsx` | Encabezado sticky con logo y menú de usuario. |
| `frontend/src/features/notes/components/CaptureBar.tsx` | Barra de captura prominente que abre el editor. |
| `frontend/src/features/notes/pages/NotesPage.tsx` | Orquesta la vista de notas: capture bar, filtros, panel, FAB. |
| `frontend/src/features/notes/components/NotesFilterBar.tsx` | Píldoras de filtro con estados activos/inactivos. |
| `frontend/src/features/notes/components/ViewModeToggle.tsx` | Toggle de vista con estilo unificado. |
| `frontend/src/features/notes/components/PanelSwitch.tsx` | Switch de panel con estilo unificado. |
| `frontend/src/features/notes/components/NotesPanel.tsx` | Panel de notas con secciones y grid responsive. |
| `frontend/src/features/notes/components/NoteCard.tsx` | Tarjeta de nota con nuevo estilo y controles reorganizados. |
| `frontend/src/features/notes/components/NoteControls.tsx` | Controles de acción de la tarjeta con áreas táctiles mejoradas. |
| `frontend/src/features/notes/components/NoteEditor.tsx` | Editor con título prominente y acciones fijas en móvil. |
| `frontend/src/features/notes/components/ReminderInput.tsx` | Input de recordatorio con estilo consistente. |
| `frontend/src/features/notes/components/TagPicker.tsx` | Selector de etiquetas en modal con estilo consistente. |
| `frontend/src/features/notes/components/TagFilterSheet.tsx` | Hoja de filtros de etiquetas con estilo consistente. |
| `frontend/src/features/notes/components/TagList.tsx` | Lista de badges de etiquetas con estilo consistente. |
| `frontend/src/features/auth/pages/LoginPage.tsx` | Pantalla de login con logo y estilo renovado. |
| `frontend/src/features/auth/pages/RegisterPage.tsx` | Pantalla de registro con logo y estilo renovado. |
| `frontend/src/shared/components/TextField.tsx` | Campo de texto con estilo base consistente. |
| `frontend/src/shared/components/IconButton.tsx` | Botón de icono con tamaño y color estándar. |
| `frontend/src/shared/components/ErrorAlert.tsx` | Alerta de error con estilo consistente. |
| `frontend/src/shared/components/ConfirmDialog.tsx` | Diálogo de confirmación con estilo consistente. |
| `frontend/src/shared/components/Spinner.tsx` | Indicador de carga con color del tema. |
| `frontend/src/features/account/components/UserMenu.tsx` | Menú de usuario con nuevo estilo. |
| `frontend/src/features/account/components/ThemeMenu.tsx` | Submenú de tema con solo dos opciones. |
| `frontend/src/features/account/components/ProfileDialog.tsx` | Diálogo de perfil con estilo consistente. |
| `frontend/src/features/account/components/ChangePasswordDialog.tsx` | Diálogo de contraseña con estilo consistente. |
| `frontend/src/features/account/components/PrivateTagsDialog.tsx` | Diálogo de etiquetas privadas con estilo consistente. |
| `frontend/src/features/admin/components/GlobalTagsPanel.tsx` | Panel de etiquetas globales con estilo consistente. |
| Archivos `*.test.ts` y `*.test.tsx` afectados | Actualizar expectativas que dependan de nombres de tema, textos o clases cambiadas. |

## Decisiones justificadas

- **Tema propio en lugar de presets de DaisyUI.** Los presets `cupcake`, `sunset`, etc. son genéricos y no comunican identidad. Un tema propio permite controlar cada color y mantener coherencia entre claro y oscuro.
- **Fuente `Geist`.** Es contemporánea, legible y tecnológica, pero se carga de forma no bloqueante con respaldo al sistema para no depender exclusivamente de la red.
- **Barra de captura como elemento memorable.** En una app de memoria, el momento de captura es el más importante. Una barra prominente reduce la fricción para crear notas.
- **Controles de tarjeta visibles.** El usuario prefiere acceso directo a las acciones; se mantienen pero se reorganizan para mejorar la usabilidad táctil.
- **Sin pie de página.** En una app de productividad el footer consume espacio vertical sin aportar valor; el contenido gana prioridad.

## Estrategia de tests

- Actualizar tests de tema (`themes.test.ts`, `ThemeProvider.test.tsx`, `ThemeMenu.test.tsx`) para los nuevos nombres y opciones.
- Actualizar tests de `HomeHeader` si dependen del texto “Inicio”.
- Revisar tests de componentes visuales que usen clases específicas; preferir selectores por rol/texto.
- Ejecutar `npm run test` después de cada bloque de cambios.
- Finalizar con `npm run lint` y `npm run build`.

## Orden de implementación

1. Tokens CSS y tema.
2. Componente `Logo` y `HomeHeader`.
3. `CaptureBar` y reorganización de `NotesPage`.
4. Tarjetas, filtros y panel de notas.
5. Editor de nota y sus componentes.
6. Auth (login/registro).
7. Cuenta y administración.
8. Tests y ajustes finales.
9. Verificación visual y build.
