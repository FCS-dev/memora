# Spec 005 — Gestión de notas en la interfaz

Estado: implementada

## Contexto y objetivo

El backend ya permite consultar, crear, editar, eliminar, reordenar y agrupar notas (fijadas, no fijadas y archivadas), pero la aplicación aún no ofrece ninguna interfaz para gestionarlas. Esta spec define la experiencia de notas: verlas por grupo con un selector para alternar entre Notas y Archivadas, alternar la vista de las tarjetas, abrir y editar una nota, crear, eliminar, reordenar dentro de un grupo y moverlas entre grupos. Todo el ciclo se realiza sobre las notas propias del usuario autenticado.

## Usuarios

- **Usuario autenticado (USER):** consulta y gestiona únicamente sus propias notas. El ADMIN no gestiona notas.

## Historias de usuario

- HU-1. Como usuario autenticado, quiero ver mis notas agrupadas (Fijadas y Otras) y poder alternar al panel de Archivadas con un selector, para encontrarlas rápido.
- HU-2. Como usuario autenticado, quiero alternar la vista de las tarjetas entre tarjetas ampliadas y lista compacta según mi preferencia.
- HU-3. Como usuario autenticado, quiero abrir una nota y editarla.
- HU-4. Como usuario autenticado, quiero crear una nota de texto o una checklist con etiquetas y recordatorio.
- HU-5. Como usuario autenticado, quiero eliminar una nota que ya no necesito.
- HU-6. Como usuario autenticado, quiero reordenar mis notas dentro de un grupo y que el orden quede guardado al instante.
- HU-7. Como usuario autenticado, quiero fijar, desfijar, archivar y restaurar notas desde su tarjeta.

## Definiciones

- **Panel de notas:** bloque que agrupa las tarjetas. El **panel principal** contiene las secciones Fijadas y Otras; el **panel de Archivadas** es independiente. Se alterna con el selector de panel (ya no son bloques plegables).
- **Vista de notas:** forma de mostrar las tarjetas; puede ser "card ampliado" o "lista compacta". Se elige con un único control en el encabezado, a la izquierda del selector de panel.
- **Selector de panel:** dos botones, "Notas" y "Archivadas", ubicados en el mismo renglón que el control de vista y alineados a la derecha; alternan el panel visible (por defecto "Notas").
- **Extracto:** porción visible del contenido de una nota dentro de una tarjeta; el límite de líneas de la vista aplica solo al extracto.
- **Controles de tarjeta:** acciones disponibles en cada tarjeta: fijar/desfijar, archivar/restaurar, eliminar y arrastrar (asa).
- **Nota de texto:** nota con contenido libre.
- **Nota checklist:** nota compuesta por ítems, cada uno con su texto y su estado marcado/no marcado.
- **Recordatorio:** fecha y hora asociada a una nota (solo dato; esta versión no emite avisos).
- **Reordenar:** ubicar una nota en una posición manual dentro de su grupo.

## Requisitos funcionales

### Listado y navegación
- RF-1: CUANDO el usuario acceda a la sección de notas, EL SISTEMA debe mostrar el panel principal (secciones Fijadas y Otras) y ofrecer el selector de panel para ver las Archivadas.
- RF-2: CUANDO el usuario elija "Archivadas" en el selector, EL SISTEMA debe mostrar el panel de Archivadas en lugar del principal, y viceversa; el panel elegido por defecto es "Notas".
- RF-3: EL SISTEMA debe mostrar las notas de Fijadas y Otras en su orden manual, y las de Archivadas por fecha de creación descendente; cada tarjeta debe incluir el título, un extracto del contenido o de los ítems del checklist, las etiquetas (en una sola línea; las que no entren se indican con "..." y solo se ven completas en el editor), si tiene el recordatorio (identificado con un ícono de reloj) y la última fecha/hora de actualización (en tamaño reducido de 0.65rem). El límite de líneas de la vista aplica solo al extracto.
- RF-35: CUANDO una nota no sea checklist y su contenido tenga saltos de línea, EL SISTEMA debe respetarlos al mostrar el extracto (cada salto de línea equivale a una línea visual).
- RF-43: EL SISTEMA debe mostrar el contenido de texto y los ítems del checklist con un `line-height` de `1.25rem`.
- RF-44: EL SISTEMA debe mostrar el contenido principal (el área de notas) a ancho completo (100%) en pantallas menores a 2560px, y al 90% del ancho a partir de 2560px.

### Vistas del panel
- RF-4: EL SISTEMA debe ofrecer un control único, en el encabezado de la lista, para alternar entre "card ampliado" y "lista compacta".
- RF-5: CUANDO la vista sea "card ampliado", EL SISTEMA debe mostrar cada nota con un extracto de hasta 12 líneas visuales, más una línea final con sus controles (fijar/desfijar, archivar/restaurar, eliminar y arrastrar); el título, las etiquetas, el recordatorio y la fecha de actualización no consumen ese límite.
- RF-6: CUANDO la vista sea "lista compacta", EL SISTEMA debe mostrar cada nota con un extracto de hasta 2 líneas visuales, más una tercera línea con sus controles (fijar/desfijar, archivar/restaurar, eliminar y arrastrar); el título, las etiquetas, el recordatorio y la fecha de actualización no consumen ese límite.
- RF-7: EL SISTEMA debe recordar la vista elegida entre recargas de la aplicación; SI no hay preferencia previa, ENTONCES debe usar "card ampliado".
- RF-8: CUANDO una nota sea checklist, EL SISTEMA debe mostrar cada ítem en su propia línea, contando cada ítem como una línea del límite de la vista activa.
- RF-38: CUANDO el extracto de una nota no se muestre por completo (texto recortado por el límite de líneas de la vista, o checklist con más ítems que ese límite), EL SISTEMA debe indicarlo con una marca de continuación ("...").
- RF-39: EL SISTEMA debe mostrar cada tarjeta con ancho fluido por debajo de `md` (partiendo de 367px y creciendo de forma fluida hasta justo antes de 767px; en pantallas más angostas que 367px no debe desbordar). Desde `md`, EL SISTEMA debe distribuir las notas del grupo en columnas según su cantidad, con un mínimo de 348px y un máximo de 500px por nota, y cuando no entren todas en una fila debe continuar en filas adicionales.

### Estados
- RF-9: MIENTRAS se obtienen las notas, EL SISTEMA debe mostrar un estado de carga.
- RF-10: SI una sección no tiene notas, ENTONCES EL SISTEMA no debe mostrar contenido en ella ni ocupar espacio por notas inexistentes.
- RF-11: SI falla la obtención de las notas, ENTONCES EL SISTEMA debe mostrar un mensaje de error y ofrecer reintentar.

### Apertura y edición
- RF-12: CUANDO el usuario abra una nota (toque/click sobre el cuerpo de la tarjeta), EL SISTEMA debe abrirla en un formulario editable con sus valores precargados (título, contenido o checklist, etiquetas, recordatorio y estado de fijada).
- RF-13: CUANDO el usuario guarde cambios válidos, EL SISTEMA debe reflejarlos y reubicar la nota en la sección correspondiente si cambió su estado de fijada.
- RF-14: SI el usuario intenta salir de una nota que tiene datos y cambios sin guardar (incluido cambiar de panel), ENTONCES EL SISTEMA debe pedir confirmación; SI el usuario confirma, ENTONCES debe descartar los cambios; SI la nota no tiene ningún dato, ENTONCES aplica RF-22.

### Creación
- RF-15: CUANDO el usuario cree una nota de texto, EL SISTEMA debe permitir indicar título y contenido; CUANDO active el modo checklist con contenido presente, EL SISTEMA debe tomar cada línea del contenido (separada por un salto de línea) como un ítem, ignorando las líneas en blanco y recortando espacios al inicio y fin de cada línea; SI el contenido está vacío o todas las líneas quedan en blanco al activar el checklist, ENTONCES EL SISTEMA debe mostrar una primera casilla para el primer ítem.
- RF-16: CUANDO el usuario cree o edite una nota, EL SISTEMA debe permitir asociar etiquetas existentes y crear una etiqueta nueva desde la propia nota; la etiqueta nueva se crea y persiste al instante, aunque luego se cancele el guardado de la nota.
- RF-17: CUANDO el usuario cree o edite una nota, EL SISTEMA debe permitir indicar un recordatorio (cualquier fecha y hora, incluida una pasada), o dejarlo sin recordatorio.
- RF-18: CUANDO el usuario cree una nota, EL SISTEMA debe permitir definirla como fijada o no fijada; la nota creada debe aparecer en la sección correspondiente.
- RF-36: MIENTRAS el usuario cree o edite una nota, EL SISTEMA debe mostrar un contador `N/2500` del campo activo: la longitud del contenido cuando no hay checklist, o la suma de las longitudes de los ítems cuando el checklist está activo; el contador no debe superar el límite (2500) sin marcar el exceso.
- RF-37: MIENTRAS la pantalla sea de creación o edición de una nota, EL SISTEMA no debe mostrar el botón flotante de "Nueva nota" ("+") en móvil.
- RF-45: CUANDO el usuario cree o edite una nota, EL SISTEMA debe mostrar los campos "Título", "Recordatorio" y "Nueva etiqueta" con etiqueta flotante sobre el borde (floating label con recuadro).
- RF-46: EL SISTEMA debe rotular el campo de texto libre como "Nota" y el de checklist como "Lista".
- RF-47: EL SISTEMA debe ofrecer el modo checklist y el estado "fijada" como botones de ícono (lista y pin), con su estado reflejado de forma accesible, ubicados uno al lado del otro.
- RF-48: EL SISTEMA debe reemplazar los botones "Eliminar ítem" y "Agregar etiqueta" por botones de ícono (cruz y más), sin borde.
- RF-49: EL SISTEMA debe mostrar el input de cada ítem del checklist con borde únicamente inferior y una altura de 1rem.
- RF-50: CUANDO el usuario cree o edite una nota, EL SISTEMA debe: no mostrar el título de pantalla ni los rótulos "Nota"/"Lista"; ubicar el recordatorio (ancho de 25 caracteres) a la derecha de los botones de checklist y fijada; no aplicar separación (gap) al fieldset de la lista; y mostrar la sección de etiquetas con un tamaño de fuente de 0.75rem.
- RF-51: CUANDO el usuario cree o edite una nota con un recordatorio cargado, EL SISTEMA debe ofrecer un botón de ícono (cruz) junto al campo para quitar el recordatorio, dejando la nota sin recordatorio.
- RF-52: EL SISTEMA debe mostrar cada ítem del checklist con un tamaño de fuente de 0.75rem y una altura base de fila de 1.5rem (checkbox, asa de arrastre y botón de eliminación centrados, con el input de alto base de 1rem); SI el texto del ítem es largo, ENTONCES el campo debe crecer en altura hasta mostrar 3 líneas y, pasado ese punto, desplazarse internamente.
- RF-53: CUANDO el usuario cree o edite una nota, EL SISTEMA debe ofrecer las etiquetas desde un botón que abre una ventana modal; la modal debe mostrar arriba un campo para crear una etiqueta nueva y debajo las casillas de las etiquetas disponibles; el botón de agregar ("+") debe aparecer al escribir en el campo, agregar la etiqueta a la lista, dejarla marcada y limpiar el campo; la modal debe poder cerrarse con su botón "x" o al hacer click fuera de ella.
- RF-54: MIENTRAS la pantalla sea el listado de notas, EL SISTEMA debe mostrar el botón "Nueva nota" (en escritorio) centrado horizontalmente, con el control de vista a la izquierda y el selector Notas/Archivadas a la derecha.
- RF-55: CUANDO el usuario cree o edite una nota y un campo esté vacío, EL SISTEMA debe mostrar un texto de ayuda (placeholder) en los campos Título, contenido de la nota, cada ítem del checklist y nueva etiqueta; el texto de ayuda desaparece al escribir o al enfocar el campo.

### Eliminación
- RF-19: CUANDO el usuario solicite eliminar una nota, EL SISTEMA debe pedir confirmación antes de eliminarla.
- RF-20: CUANDO el usuario confirme la eliminación, EL SISTEMA debe quitar la nota de la lista.

### Validación
- RF-21: SI el usuario intenta guardar con datos inválidos o incompletos (sin título, título fuera de 1–200 caracteres, contenido mayor a 2500 caracteres, etiqueta fuera de 1–25 caracteres, o checklist activo sin ítems cuando la nota tiene título), ENTONCES EL SISTEMA debe impedir el guardado y mostrar mensajes en español neutro.
- RF-22: SI el usuario intenta guardar una nota que no incluye ningún dato (salvo el estado de fijada, el recordatorio, o un checklist activo sin ítems), ENTONCES EL SISTEMA debe tratarlo como una cancelación y volver a la pantalla principal sin guardar.

### Reordenamiento
- RF-23: CUANDO el usuario reordene una nota dentro de su grupo (arrastrando desde el asa de la tarjeta), EL SISTEMA debe guardar y reflejar el nuevo orden de inmediato, sin pedir confirmación.
- RF-24: EL SISTEMA solo debe permitir reordenar dentro del mismo grupo.
- RF-25: EL SISTEMA no debe habilitar el reordenamiento en el panel de Archivadas.
- RF-26: EL SISTEMA debe ofrecer, además de arrastrar, atajos de teclado (por ejemplo Ctrl+↑ / Ctrl+↓) sobre la tarjeta enfocada para reordenar una nota.

### Cambio de grupo
- RF-27: CUANDO el usuario active o desactive el control de "fijada" dentro de una nota, EL SISTEMA debe moverla a Fijadas u Otras, respectivamente, de forma automática; SI la nota ya está en la sección destino, ENTONCES no debe cambiar nada.
- RF-28: CUANDO el usuario archive una nota, EL SISTEMA debe moverla a Archivadas; SI ya está archivada, ENTONCES no debe cambiar nada.
- RF-29: CUANDO el usuario, desde Archivadas, active o desactive el control de "fijada" de una nota, EL SISTEMA debe restaurarla en Fijadas u Otras según corresponda.

### Sesión
- RF-30: MIENTRAS no haya una sesión válida, EL SISTEMA no debe mostrar notas y debe dirigir al acceso.
- RF-31: SI la sesión expira durante una operación, EL SISTEMA debe restablecer la sesión de forma transparente y, si no es posible, dirigir al acceso.

### Errores
- RF-40: CUANDO una operación sobre notas falle, EL SISTEMA debe mostrar el motivo devuelto por el servidor (su mensaje de detalle) y no un mensaje genérico; SI el servidor responde 401 y la sesión no puede renovarse, ENTONCES EL SISTEMA debe informar que la sesión expiró y dirigir al acceso.

### Persistencia
- RF-32: CUANDO el usuario recargue la aplicación, EL SISTEMA debe conservar el orden y el grupo de sus notas, y la vista elegida.

### Reglas adicionales
- RF-33: SI el usuario crea una etiqueta con un nombre ya existente, ENTONCES EL SISTEMA debe informar el error del servidor sin crear una etiqueta duplicada.
- RF-34: SI el usuario intenta reordenar un grupo que tiene una sola nota, ENTONCES EL SISTEMA no debe cambiar nada.

### Checklist interactivo
- RF-41: CUANDO el usuario edite una nota en modo checklist, EL SISTEMA debe mostrar una casilla por ítem y permitir marcarla o desmarcarla, persistiendo el estado `true/false` de cada ítem.
- RF-42: CUANDO el usuario marque o desmarque la casilla de un ítem visible en una tarjeta (vista card o lista, incluido el panel de Archivadas), EL SISTEMA debe actualizar el estado de ese ítem de forma automática sin abrir la nota, reflejándolo de forma inmediata y revirtiéndolo si la operación falla.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe ser utilizable primero en pantallas móviles y adaptarse a los puntos de quiebre `sm` (640px), `md` (768px), `lg` (1024px) y `xl` (1280px).
- RNF-2: EL SISTEMA debe usar estructura semántica y ser accesible conforme a WCAG 2.1 nivel AA (navegación por teclado, foco, etiquetas y contraste), incluidos los atajos de reordenamiento.
- RNF-3: EL SISTEMA debe realizar en la interfaz validaciones básicas (campos no vacíos y longitudes permitidas: título 1–200, contenido ≤2500, etiqueta 1–25); el servidor revalida y decide el resultado definitivo.
- RNF-4: EL SISTEMA no debe decidir autorización en la interfaz; solo el servidor valida el acceso a cada nota.
- RNF-5: EL SISTEMA debe mostrar los textos visibles en español neutro.
- RNF-6: EL SISTEMA debe ofrecer estados de carga y error en cada vista; las secciones sin notas no muestran contenido.
- RNF-7: EL SISTEMA no debe perder ni duplicar notas al reordenar o cambiar de grupo.
- RNF-8: EL SISTEMA no debe exponer datos de la nota ni del usuario en los mensajes de error.
- RNF-9: EL SISTEMA no debe registrar en logs datos de la nota ni del usuario (PII).

## Casos límite

- Sección sin notas (no ocupa espacio).
- Extracto recortado por la vista (12 líneas en card, 2 en lista); el contenido completo se ve al abrir la nota.
- Contenido de una sola línea muy larga (wrap) y recorte visual del extracto.
- Contenido de texto con varios saltos de línea: el extracto respeta cada salto y el recorte se indica con "...". (RF-35, RF-38)
- Contador de caracteres en el límite (2500) y con exceso (se marca el exceso). (RF-36)
- Checklist con más ítems que el límite de la vista activa: se muestra la marca "...". (RF-38)
- Ancho de tarjeta en móvil angosto (<367px), en `sm` (fluido) y desde `md` (fijo 348px). (RF-39)
- Checklist mostrado ítem por ítem, contando cada ítem como una línea del límite de la vista.
- Lista compacta con checklist de más de 2 ítems (se muestra el recorte).
- Tarjeta con muchas etiquetas (desborde del espacio de la tarjeta).
- Cambiar la vista de un panel no modifica datos ni el orden; la preferencia es independiente por panel.
- Activar checklist con contenido multilínea (ignorando líneas en blanco y recortando espacios extremos); activarlo con contenido vacío o con todas las líneas en blanco (primera casilla).
- Guardar una nota sin ningún dato: se trata como cancelación, sin confirmación.
- Salir de una nota con datos y cambios sin guardar (incluido cambiar de panel): se pide confirmación.
- Guardar con checklist activo sin ítems estando el título presente: se rechaza con mensaje.
- Título y contenido en los límites (200 y 2500) y etiqueta en el límite (25).
- Recordatorio con fecha/hora inválida: se rechaza con mensaje.
- Fijar, desfijar o archivar una nota ya en la sección destino: sin cambios.
- Nota con recordatorio en el pasado: permitida.
- Crear una etiqueta nueva con un nombre ya existente: se informa el error sin duplicar.
- Fijar, archivar o eliminar una nota mientras está abierta en edición.
- Reordenar en Archivadas: control no habilitado.
- Alternar Notas/Archivadas con el selector: se muestra un panel y se oculta el otro; por defecto "Notas". (RF-1, RF-2)
- Actualizar una nota (contenido, posición, checklist o grupo): la leyenda de la tarjeta muestra la nueva fecha/hora sin recargar. (RF-3, RF-32)
- Reordenar un grupo con una sola nota: sin efecto.
- Reordenar por teclado desde el primer o el último lugar.
- Eliminar la última nota de una sección.
- Error de red intermitente y reintento.
- Sesión expirada durante la creación, un guardado o un reordenamiento.
- Operación rechazada por el servidor (p. ej. 403/400): la app muestra el motivo devuelto, no un mensaje genérico. (RF-40)
- Sesión expirada con refresh fallido: se informa y se dirige al acceso. (RF-40)
- Marcar/desmarcar un ítem en la tarjeta (card, lista y Archivadas): persiste solo ese ítem, no abre la nota ni cambia el orden; si falla, se revierte. (RF-42)
- Marcar ítems desde el editor y guardar: persiste el `true/false` de cada ítem. (RF-41)
- Quitar un recordatorio cargado: la nota queda sin recordatorio y el botón de cruz desaparece. (RF-51)
- Ítem de checklist con texto corto (una línea) y con texto largo (crece hasta 3 líneas y luego se desplaza). (RF-52)
- Modal de etiquetas: el botón "+" solo aparece con texto en el campo; la etiqueta creada se agrega y queda marcada; cerrar con "x" o click fuera descarta la selección en curso pero conserva lo ya marcado. (RF-53)
- Listado en escritorio: el botón "Nueva nota" permanece centrado con paneles a los costados. (RF-54)

## Fuera de alcance

- Búsqueda por texto.
- Filtro por etiqueta.
- Paginación (se listan todas las notas del grupo).
- Notificaciones o avisos de recordatorio.
- Compartir notas (no contemplado en la aplicación).
- Adjuntos de archivos o imágenes.
- Gestión de etiquetas fuera de la nota (renombrar, borrar o listar por separado).

## Criterios de finalización

- [ ] Selector "Notas"/"Archivadas" en el encabezado (default Notas) que alterna el panel visible. (RF-1, RF-2)
- [ ] Fijadas y Otras en orden manual; Archivadas por fecha descendente; tarjetas con título, extracto, etiquetas, recordatorio y fecha de actualización (el límite de líneas aplica solo al extracto). (RF-3, RF-32)
- [ ] Control de vista único en el encabezado (card de 12 líneas; lista de 2 líneas + controles), con checklist contado 1 ítem = 1 línea, recordado entre recargas y por defecto card ampliado. (RF-4 .. RF-8)
- [ ] Extracto de texto respeta los saltos de línea y el recorte (texto o checklist) se indica con "...". (RF-35, RF-38)
- [ ] Tarjetas con ancho fluido en móvil (367px hasta antes de 767px); desde `md`, columnas según las notas del grupo con mínimo 348px y máximo 500px por nota, pasando a más filas si no entran. (RF-39)
- [ ] Contenido e ítems del checklist con `line-height` de 1.25rem. (RF-43)
- [ ] La tarjeta muestra la última fecha/hora de actualización y se refresca tras cada cambio. (RF-3, RF-32)
- [ ] El recordatorio se identifica con un ícono de reloj y la fecha de actualización se muestra en 0.65rem. (RF-3)
- [ ] El contenido principal ocupa 100% del ancho por debajo de 2560px y 90% desde 2560px. (RF-44)
- [ ] Editor con contador `N/2500` del campo activo y sin botón flotante "+" en móvil. (RF-36, RF-37)
- [ ] Controles de tarjeta: fijar/desfijar, archivar/restaurar, eliminar y arrastrar desde el asa. (RF-5, RF-6, RF-23)
- [ ] Estados de carga y error; sección sin notas no muestra contenido. (RF-9 .. RF-11, RNF-6)
- [ ] Abrir una nota (cuerpo) la deja editable; guardar refleja y reubica si cambió su estado de fijada; salir con datos sin guardar pide confirmación y sin datos cancela. (RF-12 .. RF-14, RF-22)
- [ ] Alta de texto o checklist (derivación por líneas, ignorando vacías y recortando espacios), etiquetas existentes o nuevas (persistidas al instante), recordatorio y estado de fijada. (RF-15 .. RF-18)
- [ ] Eliminación con confirmación. (RF-19, RF-20)
- [ ] Validaciones con límites en la interfaz, rechazo de checklist vacío con título y cancelación sin datos. (RF-21, RF-22, RNF-3)
- [ ] Reordenamiento inmediato dentro del grupo, solo intra-grupo, deshabilitado en Archivadas, con atajos de teclado y sin efecto en grupos de una nota. (RF-23 .. RF-26, RF-34)
- [ ] Cambio de grupo por el control de fijada y archivado, idempotente, incluida la restauración. (RF-27 .. RF-29)
- [ ] Etiqueta nueva con nombre existente: se informa sin duplicar. (RF-33)
- [ ] Acceso solo autenticado y manejo de sesión expirada. (RF-30, RF-31)
- [ ] Los errores de operaciones muestran el motivo del servidor; la sesión expirada sin renovación informa y dirige al acceso. (RF-40)
- [ ] Editor y tarjetas muestran casillas de checklist marcables; el marcado en la tarjeta persiste con una operación automática (optimista, con reversión) sin abrir la nota. (RF-41, RF-42)
- [ ] Editor con floating labels (Título/Recordatorio/Nueva etiqueta), labels "Nota"/"Lista", toggles de ícono (checklist y fijada), botones SVG de cruz/más y input de ítem con borde inferior a 1rem. (RF-45 .. RF-49)
- [ ] Editor sin título ni rótulos, recordatorio a la derecha (ancho 25) junto a los botones, fieldset de lista sin gap y etiquetas a 0.75rem. (RF-50)
- [ ] Editor permite quitar el recordatorio con un botón de cruz. (RF-51)
- [ ] Ítems de checklist con fuente 0.75rem, fila base de 1.5rem y crecimiento hasta 3 líneas. (RF-52)
- [ ] Etiquetas desde un botón que abre una modal con casillas y alta dinámica ("+"), cerrable con "x" o click fuera. (RF-53)
- [ ] Botón "Nueva nota" centrado en el listado (escritorio), con vista y selector a los costados. (RF-54)
- [ ] Campos Título, contenido, ítem del checklist y nueva etiqueta muestran un texto de ayuda cuando están vacíos. (RF-55)
- [ ] Etiquetas en la tarjeta en una sola línea, con "..." cuando desbordan. (RF-3)
- [ ] Responsive y accesible (WCAG 2.1 AA); errores y logs sin datos sensibles. (RNF-1, RNF-2, RNF-8, RNF-9)
- [ ] Los tests correspondientes pasan.

## Dudas abiertas

- Ninguna.
