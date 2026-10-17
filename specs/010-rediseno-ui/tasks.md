# Tareas 010 — Rediseño de interfaz de usuario

- [x] **T1. Definir temas y estilos base.** RF-1, RF-2, RNF-4
  - Modificar `frontend/src/index.css` para usar `@plugin "daisyui/theme"` con `memora-light` y `memora-dark`.
  - Importar `Geist` vía `@import`.
  - Establecer estilos base de tipografía y foco.
  - Hecho cuando: los temas se aplican y el texto usa Geist.

- [x] **T2. Actualizar modelo de temas y copy.** RF-2
  - Cambiar `THEMES`, `DEFAULT_THEME` y `DARK_THEME` en `frontend/src/features/theme/model/themes.ts`.
  - Actualizar etiquetas de tema en `frontend/src/features/account/model/copy.ts`.
  - Hecho cuando: `npm run test` pasa para `themes.test.ts`, `ThemeProvider.test.tsx` y `ThemeMenu.test.tsx`.

- [x] **T3. Crear componente Logo.** RF-5
  - Crear `frontend/src/shared/components/Logo.tsx` con mark SVG y wordmark opcional.
  - Hecho cuando: el logo se renderiza correctamente en ambos temas.

- [x] **T4. Rediseñar encabezado.** RF-5
  - Modificar `frontend/src/features/home/components/HomeHeader.tsx` para usar `Logo`, ser sticky y tener fondo translúcido.
  - Actualizar tests si es necesario.
  - Hecho cuando: el header muestra “Memora” y permanece fijo al hacer scroll.

- [x] **T5. Crear barra de captura y reorganizar NotesPage.** RF-3, RF-4, RF-9
  - Crear `frontend/src/features/notes/components/CaptureBar.tsx`.
  - Reorganizar `frontend/src/features/notes/pages/NotesPage.tsx`: capture bar arriba, eliminar botón centrado de escritorio, FAB móvil alargado.
  - Hecho cuando: la barra de captura y el FAB abren el editor y no hay footer.

- [x] **T6. Rediseñar filtros y toggles.** RF-7, RF-8
  - Convertir chips a píldoras en `NotesFilterBar.tsx`.
  - Unificar estilo de `ViewModeToggle.tsx` y `PanelSwitch.tsx`.
  - Hecho cuando: los filtros activos usan color primary y los toggles comparten estilo.

- [x] **T7. Rediseñar panel y tarjetas de notas.** RF-6, RF-7, RNF-1, RNF-2
  - Modificar `NotesPanel.tsx` para grid responsive y secciones más limpias.
  - Modificar `NoteCard.tsx` con nuevo estilo, más aire y metadatos claros.
  - Reorganizar `NoteControls.tsx` manteniendo acciones visibles pero mejorando táctiles.
  - Hecho cuando: las tarjetas se ven coherentes y los controles son usables en móvil.

- [x] **T8. Rediseñar editor de nota.** RF-7, RNF-2
  - Modificar `NoteEditor.tsx` con título prominente y acciones fijas en móvil.
  - Ajustar `ReminderInput.tsx`, `TagPicker.tsx`, `TagFilterSheet.tsx` y `TagList.tsx`.
  - Hecho cuando: el editor se ve coherente y es usable en pantallas pequeñas.

- [x] **T9. Rediseñar pantallas de autenticación.** RF-5, RF-7
  - Modificar `LoginPage.tsx` y `RegisterPage.tsx` para incluir logo y aplicar espaciado/tipografía nuevos.
  - Hecho cuando: login y registro muestran el logo y usan la paleta Memora.

- [x] **T10. Rediseñar cuenta y administración.** RF-7
  - Ajustar `UserMenu.tsx`, `ThemeMenu.tsx`, diálogos de cuenta y `GlobalTagsPanel.tsx`.
  - Hecho cuando: menús, diálogos y panel admin usan la nueva paleta.

- [x] **T11. Ajustar componentes compartidos.** RF-7
  - Revisar `TextField.tsx`, `IconButton.tsx`, `ErrorAlert.tsx`, `ConfirmDialog.tsx`, `Spinner.tsx`.
  - Hecho cuando: todos los componentes compartidos son consistentes con el tema.

- [x] **T12. Tests, lint y build.** RNF-1, RNF-3
  - Actualizar tests afectados.
  - Ejecutar `npm run lint`, `npm run test` y `npm run build`.
  - Hecho cuando: lint limpio, tests en verde, build exitoso.

- [x] **T13. Verificación visual.** RNF-1
  - Revisar en escritorio, tablet y móvil.
  - Confirmar tema oscuro, estados vacíos, focus visible y reduced motion.
  - Hecho cuando: no hay inconsistencias visuales evidentes.
