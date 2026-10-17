# Spec 010 — Rediseño de interfaz de usuario

Estado: implementada

## Contexto y objetivo

Memora es una agenda-memoria digital para capturar notas, listas de verificación, recordatorios y etiquetas, y recuperar esa información después. La interfaz actual es funcional pero depende de los presets genéricos de DaisyUI, lo que le quita personalidad propia y dificulta diferenciar la aplicación visualmente.

El objetivo de esta spec es dar a Memora una identidad visual coherente, minimalista y tecnológica, priorizando la experiencia móvil sin descuidar el escritorio. El rediseño debe facilitar los tres flujos principales: capturar información, organizarla y recuperarla.

## Usuarios

- **Usuario de Memora (USER):** persona que usa la app a diario para guardar notas, listas y recordatorios. Pasa más tiempo en móvil que en escritorio.
- **Administrador (ADMIN):** gestiona etiquetas globales desde un panel simple.

## Historias de usuario

- HU-1. Como usuario, quiero identificar la app al instante por su marca y colores para sentir que uso un producto con identidad propia.
- HU-2. Como usuario, quiero que la acción de crear una nota sea lo más visible posible en móvil para capturar ideas rápidamente.
- HU-3. Como usuario, quiero distinguir claramente las notas fijadas de las demás para encontrar lo importante sin esfuerzo.
- HU-4. Como usuario, quiero que los filtros y etiquetas se vean como un sistema coherente para no confundirme al buscar.
- HU-5. Como usuario, quiero que los botones de acción de una nota sean lo suficientemente grandes para usarlos con el pulgar sin fallar.
- HU-6. Como usuario, quiero poder elegir entre tema claro y oscuro para adaptar la app a mi entorno.
- HU-7. Como administrador, quiero que el panel de etiquetas globales use la misma identidad visual que el resto de la app para no sentir que cambio de aplicación.

## Requisitos funcionales

- RF-1. CUANDO el usuario abra la app, EL SISTEMA mostrará un tema visual propio (`memora-light` u `memora-dark`) en lugar de los presets genéricos de DaisyUI.
- RF-2. EL SISTEMA permitirá cambiar entre tema claro y oscuro desde el menú de usuario.
- RF-3. CUANDO el usuario esté en la vista de notas, EL SISTEMA mostrará una barra de captura prominente que, al interactuar con ella, abrirá el editor de una nueva nota.
- RF-4. SI el usuario está en un dispositivo móvil, ENTONCES EL SISTEMA mostrará un botón flotante alargado con la etiqueta “Nueva nota” en lugar de un botón circular con solo un icono.
- RF-5. EL SISTEMA mostrará el logo y el nombre “Memora” en el encabezado, reemplazando el título genérico “Inicio”.
- RF-6. CUANDO el usuario vea una nota, EL SISTEMA mantendrá visibles las acciones de fijar, archivar, eliminar, reordenar y arrastrar, pero con áreas táctiles y agrupación mejoradas.
- RF-7. EL SISTEMA aplicará una paleta de colores coherente a todos los componentes: encabezado, tarjetas, filtros, formularios, modales y paneles de administración.
- RF-8. CUANDO el usuario esté en estados vacíos o de error, EL SISTEMA mostrará mensajes claros con una acción siguiente cuando corresponda.
- RF-9. EL SISTEMA no mostrará un pie de página en ninguna pantalla de la aplicación.
- RF-10. EL SISTEMA no representará funcionalidades que aún no estén implementadas (MCP, RAG, documentos).

## Requisitos no funcionales

- RNF-1. La interfaz debe ser responsive: experiencia coherente desde 390px hasta 2560px.
- RNF-2. Todos los controles interactivos deben tener un área táctil mínima de `44x44px` en móvil.
- RNF-3. Los estados de foco deben ser visibles para navegación por teclado.
- RNF-4. Las transiciones y animaciones deben respetar `prefers-reduced-motion`.
- RNF-5. La carga de recursos tipográficos no debe bloquear el renderizado inicial.
- RNF-6. El contraste entre texto y fondo debe cumplir WCAG 2.1 AA.

## Casos límite

- Si el usuario nunca eligió tema, el sistema usará `memora-light` por defecto y respetará `prefers-color-scheme: dark` para cambiar a `memora-dark`.
- Si la carga de la fuente externa falla, el sistema usará la fuente del sistema como respaldo sin romper el layout.
- Si una nota tiene muchas etiquetas, las tarjetas deben mostrarlas truncadas sin desbordar el contenedor.
- Si el usuario tiene muchas notas, el encabezado debe permanecer accesible mientras hace scroll.

## Fuera de alcance

- Nuevas funcionalidades de negocio (búsqueda, documentos, RAG, MCP, LLM).
- Cambios en la arquitectura de autenticación o en el contrato de la API.
- Reemplazo de componentes de terceros por implementaciones propias si los actuales cumplen el requisito con estilos ajustados.

## Criterios de finalización

- [ ] La app usa exclusivamente los temas `memora-light` y `memora-dark`.
- [ ] El logo y la marca “Memora” aparecen en el encabezado y en las pantallas de autenticación.
- [ ] La vista de notas muestra una barra de captura prominente y, en móvil, un FAB alargado con etiqueta.
- [ ] Las tarjetas, filtros, editor, modales y panel de administración usan la nueva paleta y espaciado.
- [ ] No hay pie de página en ninguna pantalla.
- [ ] Los tests actualizados pasan, el lint está limpio y el build es exitoso.
- [ ] Se verifica visualmente en escritorio, tablet y móvil.

## Dudas abiertas

Ninguna.
