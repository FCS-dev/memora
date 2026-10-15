# Spec 007 — Etiquetas globales administradas y unicidad de etiquetas

Estado: aprobada

## Contexto y objetivo

Hoy las etiquetas son privadas de cada usuario y la unicidad se controla solo en la capa de servicio, sin una garantía a nivel de datos, por lo que dos operaciones simultáneas podrían crear duplicados. Además no existe un catálogo común de etiquetas. Esta spec define un **catálogo global** formado por las etiquetas de la cuenta ADMIN, usables por todos los USER, que convive con las **etiquetas privadas** de cada usuario, y establece la **garantía de unicidad** dentro de cada dueño sobre el nombre normalizado, incluida la concurrencia. El ADMIN no tiene notas: su conjunto de etiquetas es el catálogo global.

## Usuarios

- **Usuario autenticado (USER):** administra sus etiquetas privadas y asocia etiquetas globales y propias a sus notas.
- **Administrador (ADMIN):** es el dueño del catálogo global; **no tiene notas**. Gestiona sus etiquetas (las globales) desde la administración, no desde los endpoints de usuario, y no gestiona etiquetas privadas de otros usuarios.
- **Excepción aprobada:** para cumplir esta spec, el ADMIN accede únicamente a su catálogo global y a conteos agregados de uso; nunca al contenido de las notas ni a etiquetas privadas de otros usuarios.

## Historias de usuario

- HU-1. Como usuario autenticado, quiero crear mis propias etiquetas y usarlas en mis notas sin generar duplicados por diferencias de mayúsculas, minúsculas o espacios.
- HU-2. Como usuario autenticado, quiero usar las etiquetas globales en mis notas.
- HU-3. Como usuario autenticado, cuando escribo una etiqueta con el nombre de una global existente, quiero que se use esa global en lugar de crear una copia.
- HU-4. Como administrador, quiero crear, listar, renombrar y eliminar etiquetas globales desde la administración.
- HU-5. Como administrador, quiero que al renombrar o eliminar una global las notas queden consistentes y no pierdan la etiqueta, y que al crear o renombrar una global que coincida con una etiqueta privada, esta se fusione en la global.
- HU-6. Como administrador, quiero ver cuántas notas usan cada etiqueta global para decidir sobre el catálogo.
- HU-7. Como sistema, quiero que el catálogo global siga disponible para los USER aunque la cuenta ADMIN cambie de estado.

## Definiciones

- **Cuenta ADMIN del catálogo:** la única cuenta con rol ADMIN que es dueña de las etiquetas globales. No tiene notas.
- **Etiqueta global:** etiqueta cuya dueña es la cuenta ADMIN del catálogo; está disponible para asociar a las notas de todos los USER.
- **Etiqueta privada:** etiqueta creada por un USER, visible y asociable solo por ese usuario.
- **Nombre normalizado:** resultado de recortar los espacios de los extremos, colapsar los espacios internos a uno solo y aplicar normalización Unicode NFC. La comparación ignora las diferencias de mayúsculas/minúsculas (Unicode); los acentos y el resto de los caracteres se consideran distintos. Los espacios colapsados incluyen tabuladores y saltos tratados como espacio.
- **Unicidad de etiquetas:** no pueden coexistir dos etiquetas con el mismo nombre normalizado dentro de un mismo dueño (la cuenta ADMIN, o el conjunto privado de un USER).
- **Fusionar:** cuando una etiqueta global toma el nombre normalizado de etiquetas privadas existentes, las notas que usaban esas privadas pasan a usar la global y las privadas se eliminan, conservando todas las asociaciones y sin duplicar etiquetas en una misma nota.

## Requisitos funcionales

### Catálogo de etiquetas globales (ADMIN)
- RF-1: CUANDO el ADMIN cree una etiqueta global con un nombre válido cuyo nombre normalizado no colisione con otra de sus etiquetas, EL SISTEMA debe crearla en su forma normalizada como etiqueta de la cuenta ADMIN y dejarla disponible para todos los USER.
- RF-2: EL SISTEMA debe mostrar al ADMIN el listado de sus etiquetas globales en orden alfabético por nombre normalizado, indicando por cada una su nombre y la cantidad de notas distintas de USER que la usan, y un estado vacío cuando no exista ninguna.
- RF-3: CUANDO el ADMIN renombre una etiqueta global a un nombre válido cuyo normalizado no colisione con otra de sus etiquetas, EL SISTEMA debe actualizar el nombre de la etiqueta y el de todas las notas que la usaban, conservando la asociación.
- RF-4: CUANDO el ADMIN elimine una etiqueta global, EL SISTEMA debe quitarla del catálogo y dejar que cada nota que la usaba conserve el nombre como etiqueta privada de su dueño (USER), sin duplicar la etiqueta en una misma nota.
- RF-5: SI el ADMIN intenta crear o renombrar una etiqueta global con un nombre cuyo normalizado colisiona con otra de sus etiquetas globales, ENTONCES EL SISTEMA debe rechazar la operación e informar el motivo.
- RF-6: SI una persona sin rol ADMIN (incluido un visitante sin sesión) intenta crear, listar, renombrar o eliminar etiquetas globales, ENTONCES EL SISTEMA debe impedirlo. La gestión del catálogo se realiza solo desde la administración; los endpoints de usuario no crean ni modifican etiquetas globales.

### Etiquetas de usuario y uso en notas
- RF-7: CUANDO un USER cree o edite una nota, EL SISTEMA debe permitirle asociar etiquetas globales y sus propias etiquetas privadas.
- RF-8: CUANDO un USER cree una etiqueta privada con un nombre válido, EL SISTEMA debe crearla en su forma normalizada y asociarla a ese usuario.
- RF-9: SI un USER intenta crear una etiqueta privada cuyo nombre normalizado colisiona con otra etiqueta privada suya ya existente, ENTONCES EL SISTEMA debe rechazar la creación e informar que ya existe.
- RF-10: SI un USER intenta crear una etiqueta privada cuyo nombre normalizado colisiona con una etiqueta global, ENTONCES EL SISTEMA debe tratar la operación como exitosa, reutilizar la etiqueta global, asociarla y avisar que se usó la existente (sin crear una privada ni reportar error).
- RF-11: EL SISTEMA debe mostrar a cada USER, al asociar etiquetas a una nota, tanto las etiquetas globales como sus propias etiquetas privadas.
- RF-12: MIENTRAS una etiqueta privada pertenezca a otro usuario, EL SISTEMA no debe ofrecerla ni permitir asociarla.

### Unicidad, normalización y resolución de colisiones
- RF-13: EL SISTEMA debe garantizar que la cuenta ADMIN no tenga dos etiquetas globales con el mismo nombre normalizado, incluso ante operaciones simultáneas.
- RF-14: EL SISTEMA debe garantizar que un USER no tenga dos etiquetas privadas con el mismo nombre normalizado, incluso ante operaciones simultáneas.
- RF-15: SI una operación intenta crear una etiqueta que viola la unicidad dentro de un mismo dueño (global-global, o privada-privada del mismo USER), ENTONCES EL SISTEMA debe rechazar la operación correspondiente e informar el motivo, sin crear duplicados.
- RF-16: EL SISTEMA debe comparar los nombres de etiqueta usando el nombre normalizado (extremos recortados, espacios internos colapsados, NFC, sin distinguir mayúsculas/minúsculas; acentos y demás caracteres distintos) y debe medir la longitud sobre ese nombre normalizado.
- RF-17: EL SISTEMA debe validar que el nombre normalizado de la etiqueta tenga entre 1 y 25 caracteres, sin aceptar nombres vacíos ni compuestos solo por espacios.
- RF-18: CUANDO exista coincidencia entre una etiqueta global y una privada con el mismo nombre normalizado, EL SISTEMA debe dar prioridad a la global: al crear una privada coincidente se reutiliza la global (RF-10); al crear o renombrar una global que coincide con privadas existentes se fusionan (RF-19).
- RF-19: SI al crear o renombrar una etiqueta global su nombre normalizado coincide con etiquetas privadas ya existentes de uno o más USER, ENTONCES EL SISTEMA debe fusionarlas: reasociar a la etiqueta global las notas que usaban esas privadas, eliminar las privadas y conservar todas las asociaciones, sin crear duplicados ni dejar etiquetas repetidas en una misma nota.
- RF-20: EL SISTEMA debe poner en conformidad los datos previos antes de aplicar la unicidad: normalizar y fusionar las etiquetas que dentro de un mismo dueño queden duplicadas por nombre normalizado, y resolver las coincidencias entre privadas y globales (gana la global) según RF-18 y RF-19.

### Errores
- RF-21: CUANDO una operación de etiquetas falle por nombre inválido o duplicado, EL SISTEMA debe responder con un error que indique el motivo, sin exponer datos internos ni de otros usuarios.

### Conservación de etiquetas privadas
- RF-22: EL SISTEMA debe conservar las etiquetas privadas de un USER aunque no estén asociadas a ninguna nota.

### Cuenta ADMIN y catálogo global
- RF-23: EL SISTEMA debe tratar la cuenta ADMIN dueña del catálogo como protegida: no puede eliminarse ni deshabilitarse, y sus etiquetas globales deben seguir disponibles para los USER con independencia del estado de esa cuenta.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe presentar todos los textos visibles al usuario en español neutro (sin voseo).
- RNF-2: EL SISTEMA debe permitir gestionar el catálogo de etiquetas globales con teclado y lector de pantalla, conforme a WCAG 2.1 nivel AA.
- RNF-3: EL SISTEMA no debe exponer etiquetas privadas de otros usuarios ni datos internos en respuestas, errores o registros, ni indicar qué usuario usa cada etiqueta global.
- RNF-4: EL SISTEMA debe sostener la unicidad de etiquetas ante solicitudes concurrentes mediante una garantía en la base de datos **dentro de cada dueño** (la cuenta ADMIN y cada USER). La coincidencia entre una privada y una global se resuelve por regla de negocio (RF-18) y no cuenta con garantía de datos ante concurrencia cruzada. Esto aprueba la infraestructura de esquema/migraciones necesaria. La única excepción de acceso del ADMIN es su catálogo global y los conteos agregados (nunca el contenido de notas ni etiquetas privadas ajenas).
- RNF-5: EL SISTEMA debe ser idempotente donde corresponda: reutilizar una etiqueta global existente, fusionar etiquetas con el mismo nombre normalizado, renombrar una global a su mismo nombre normalizado o eliminar una global en uso no debe generar duplicados ni cambios inesperados más allá de lo definido.
- RNF-6: EL SISTEMA debe presentar las pantallas de administración de etiquetas sin desbordamiento horizontal entre 320 px y 1280 px.

## Casos límite

- Nombres con distinto uso de mayúsculas/minúsculas ("Casa" vs "casa"): mismo nombre normalizado → duplicado.
- Nombres con espacios externos ("  casa  "): se recortan.
- Nombres con varios espacios internos, tabuladores o saltos ("casa    grande"): se colapsan a uno.
- Nombres equivalentes en NFC/NFD: se consideran iguales.
- Nombres con acentos ("sábana" vs "sabana"): se consideran distintos.
- Casing no ASCII (por ejemplo, caracteres alemanes o turcos): se comparan sin distinguir mayúsculas/minúsculas (Unicode).
- Nombre vacío o solo con espacios: rechazado.
- Nombre normalizado mayor a 25 caracteres: rechazado.
- Colisión global-global (dos etiquetas del ADMIN): rechazada.
- Colisión privada-privada del mismo USER: rechazada.
- Coincidencia privada vs global al crear la privada: se reutiliza la global y se avisa (operación exitosa).
- Crear o renombrar una global cuyo nombre normalizado coincide con privadas existentes de varios USER: todas se fusionan en la global y las notas quedan asociadas a ella.
- La fusión no debe crear duplicados ni perder asociaciones de notas.
- Renombrar una global a su mismo nombre normalizado: sin cambio efectivo y sin duplicar.
- Eliminar una global: cada nota que la usaba conserva el nombre como etiqueta privada de su dueño (USER); si un mismo dueño tenía varias notas con la global, se recrea una sola privada y se asocia a todas.
- Eliminar una global reduce el conteo de uso correspondiente.
- Archivar o eliminar una nota reduce el conteo de uso de sus etiquetas globales.
- Dos altas simultáneas del mismo nombre normalizado (global-global, o privada-privada del mismo USER): una prospera y la otra se rechaza.
- Alta simultánea de una privada y de una global con el mismo nombre (concurrencia cruzada): no la bloquea la base de datos; el sistema aplica la regla de negocio (gana la global) y puede requerir reconciliación posterior.
- Listado del ADMIN sin etiquetas globales: muestra el estado vacío.
- USER intenta asociar una etiqueta privada de otro usuario: no se ofrece y se rechaza.
- Nota de un USER con una global asociada: la global es común, pero la nota y sus demás etiquetas privadas no se comparten.
- El listado del ADMIN muestra el conteo de notas por etiqueta sin revelar qué USER las usa.
- El ADMIN no crea etiquetas privadas ni tiene notas; su conjunto de etiquetas es el catálogo global.
- Existen varias cuentas con rol ADMIN: solo la cuenta ADMIN designada es dueña del catálogo global (no hay más de un catálogo global).
- Se intenta eliminar o deshabilitar la cuenta ADMIN dueña del catálogo: se impide; las globales permanecen usables.
- Datos previos con etiquetas duplicadas por casing o espacios de un mismo dueño: se normalizan/fusionan antes de aplicar la unicidad.
- Datos previos donde una privada quedó con el mismo nombre que una global (por ejemplo, tras asignar etiquetas a la cuenta ADMIN): se fusionan en la global (gana la global) al poner en conformidad.
- Una etiqueta privada sin ninguna nota asociada (por ejemplo, al quitar la etiqueta de una nota o eliminarla) se conserva disponible para el usuario.

## Fuera de alcance

- Fusionar (merge) etiquetas más allá de lo definido en RF-18, RF-19 y RF-20.
- Jerarquías, alias o sinónimos de etiquetas.
- Color, ícono u otros metadatos de etiquetas.
- Filtrar o buscar notas por etiqueta.
- Migrar masivamente las etiquetas privadas existentes al catálogo global (solo la puesta en conformidad de RF-20).
- Múltiples catálogos globales o más de una cuenta dueña del catálogo.
- Que el ADMIN tenga notas.
- Auditoría o historial de cambios del catálogo global.
- Notificaciones a los usuarios ante cambios en las etiquetas globales.
- Compartir notas entre usuarios.
- Ámbitos de etiqueta distintos de "global" y "privada" (por rol, grupo, etc.).
- Renombrar o eliminar etiquetas privadas por parte del USER (esta versión solo define su alta y uso).

## Criterios de finalización

- [ ] El ADMIN puede crear, listar (con conteo agregado), renombrar y eliminar etiquetas globales desde la administración. (RF-1 .. RF-4)
- [ ] El listado del ADMIN va en orden alfabético, muestra el conteo de notas por etiqueta sin exponer USER y tiene estado vacío. (RF-2, RNF-3)
- [ ] Solo el ADMIN gestiona el catálogo global y no crea etiquetas privadas ni tiene notas. (RF-6)
- [ ] Existe una única cuenta ADMIN dueña del catálogo; no hay varios catálogos globales. (Definiciones, RF-6)
- [ ] La cuenta ADMIN dueña del catálogo está protegida y las globales siguen usándose con independencia de su estado. (RF-23)
- [ ] Las etiquetas globales son usables por cualquier USER en sus notas y se listan junto a las privadas. (RF-7, RF-11)
- [ ] Cada USER conserva sus etiquetas privadas (aun sin notas asociadas) y no accede a las de otros. (RF-8, RF-12, RF-22)
- [ ] No se permiten duplicados por nombre normalizado dentro de un mismo dueño. (RF-5, RF-9, RF-13 .. RF-17)
- [ ] Al crear una privada con el nombre de una global, la operación es exitosa, se reutiliza la global y se avisa. (RF-10)
- [ ] Al crear o renombrar una global que coincide con privadas existentes, estas se fusionan conservando las asociaciones y sin duplicados. (RF-18, RF-19)
- [ ] Renombrar una global actualiza las notas; eliminarla deja el nombre como etiqueta privada del dueño (USER) de cada nota. (RF-3, RF-4)
- [ ] Los datos previos se ponen en conformidad (incluidas las coincidencias privada-global) para poder aplicar la unicidad. (RF-20)
- [ ] La unicidad se sostiene ante operaciones concurrentes con garantía en la base de datos dentro de cada dueño, y el ADMIN solo accede a su catálogo y conteos. (RF-13 .. RF-15, RNF-4)
- [ ] Los errores indican el motivo sin exponer datos internos y los textos están en español neutro. (RF-21, RNF-1, RNF-3)
- [ ] Los tests correspondientes pasan.
- [ ] `tasks.md` marcado y `MEMORY.md` actualizado.

## Dudas abiertas

- Ninguna.
