# Spec 008 — Menú de usuario (perfil, etiquetas privadas y temas)

Estado: aprobada

## Contexto y objetivo

Hoy el encabezado autenticado solo ofrece un botón suelto de "Cerrar sesión", y no existe
un lugar unificado para las acciones de la propia cuenta. Tampoco se pueden administrar
las etiquetas privadas (la gestión previa solo definió crearlas y usarlas) ni elegir el
tema de la interfaz. Esta spec define un **menú de usuario** desde el encabezado que
reúne el perfil, el cambio de contraseña, el cierre de sesión, la gestión de etiquetas
privadas (con contador de uso) y la selección de tema.

## Usuarios

- **Usuario autenticado (USER):** usa el menú para ver/editar su nombre, cambiar su
  contraseña, cerrar sesión, gestionar sus etiquetas privadas y elegir el tema.
- **Administrador (ADMIN):** usa el menú para ver/editar su nombre, cambiar su contraseña,
  cerrar sesión y elegir el tema. No tiene etiquetas privadas ni notas, por lo que no ve la
  opción de etiquetas.

## Historias de usuario

- HU-1. Como usuario autenticado, quiero un menú en el encabezado para acceder a mis
  acciones de cuenta sin elementos sueltos.
- HU-2. Como usuario autenticado, quiero ver y editar mi nombre.
- HU-3. Como usuario autenticado, quiero cambiar mi contraseña de forma segura.
- HU-4. Como usuario autenticado, quiero cerrar sesión desde el menú.
- HU-5. Como USER, quiero crear, renombrar y eliminar mis etiquetas privadas viendo cuántas
  notas usan cada una.
- HU-6. Como usuario autenticado, quiero elegir el tema de la interfaz y que se recuerde.

## Definiciones

- **Menú de usuario:** control del encabezado que, al abrirse, muestra las acciones de la
  propia cuenta.
- **Etiqueta privada:** etiqueta creada por un USER, visible y asociable solo por ese
  usuario.
- **Etiqueta global:** etiqueta del catálogo del ADMIN (Spec 007), usable por todos los
  USER; no editable desde la gestión de etiquetas privadas.
- **Nombre normalizado:** resultado de recortar los extremos, colapsar los espacios internos
  a uno, aplicar normalización Unicode NFC y pasar a minúsculas; la comparación ignora
  mayúsculas/minúsculas y los acentos se consideran distintos.
- **Contador de uso:** cantidad de notas distintas del USER (incluidas las archivadas) que
  tienen la etiqueta; para las etiquetas globales mostradas en la gestión cuenta solo las notas
  del USER. Se calcula al abrir o refrescar y se mantiene actualizado tras cada operación.
- **Tema:** conjunto de colores que define la apariencia visual de la interfaz.
- **Temas disponibles:** `cupcake` (modo claro), `sunset` (modo oscuro), `retro`, `nord` y
  `abyss`.

## Requisitos funcionales

### Menú de usuario
- RF-1: EL SISTEMA debe ofrecer, en el encabezado de las pantallas autenticadas, un menú de
  usuario que se abre desde un control con forma de ícono y nombre accesible.
- RF-2: EL SISTEMA debe mostrar en el menú el nombre del usuario autenticado.
- RF-3: CUANDO el usuario abra el menú, EL SISTEMA debe ofrecer las acciones: abrir el perfil
  (en un diálogo, para ver y editar el nombre), cambiar la contraseña, elegir el tema y cerrar
  la sesión.
- RF-4: CUANDO un USER abra el menú, EL SISTEMA debe ofrecer además la opción de gestionar
  sus etiquetas privadas; esta opción no debe ofrecerse al ADMIN.
- RF-5: CUANDO el usuario elija una acción, cierre el menú o interactúe fuera de él (o pulse
  Escape), EL SISTEMA debe cerrar el menú.
- RF-6: EL SISTEMA debe reemplazar el botón suelto de "Cerrar sesión" del encabezado por el
  menú de usuario.
- RF-7: EL SISTEMA no debe mostrar el menú de usuario cuando no haya sesión activa.

### Perfil
- RF-8: CUANDO el usuario consulte su perfil, EL SISTEMA debe mostrar en un diálogo su nombre y
  su correo, siendo el correo de solo lectura.
- RF-9: CUANDO el usuario guarde un nombre válido (recortado, entre 3 y 150 caracteres), EL
  SISTEMA debe actualizarlo y reflejarlo de inmediato en el encabezado y en el menú.
- RF-10: SI el nombre es inválido (vacío o fuera de 3–150), ENTONCES EL SISTEMA debe
  rechazar la operación e informar el motivo sin cambiar nada.
- RF-11: CUANDO el usuario cancele la edición del nombre, EL SISTEMA debe descartar los
  cambios y conservar el nombre anterior.

### Cambio de contraseña
- RF-12: CUANDO el usuario cambie su contraseña, EL SISTEMA debe solicitar la contraseña
  actual y la nueva, y pedir una confirmación de la nueva que se valida en la interfaz; el
  servidor debe validar la contraseña actual y la longitud de la nueva.
- RF-13: SI la contraseña actual es incorrecta, ENTONCES EL SISTEMA debe rechazar la
  operación y avisar, sin cerrar la sesión.
- RF-14: SI la nueva contraseña no cumple la longitud (8–20) o la confirmación no coincide,
  ENTONCES EL SISTEMA debe rechazar la operación y avisar (la longitud se comprueba tanto en el
  servidor como en la interfaz).
- RF-15: CUANDO el cambio de contraseña sea exitoso, EL SISTEMA debe cerrar todas las
  sesiones del usuario y llevarlo a iniciar sesión nuevamente.

### Cierre de sesión y errores de las acciones de cuenta
- RF-16: CUANDO el usuario elija cerrar sesión, EL SISTEMA debe terminar su sesión y llevarlo
  a la pantalla de inicio de sesión.
- RF-17: SI el cierre de sesión falla por un problema de red, ENTONCES EL SISTEMA debe
  informar el error y conservar la sesión.
- RF-18: SI una operación de perfil o de contraseña falla por un problema de red, ENTONCES EL
  SISTEMA debe informar el error, conservar lo ingresado y no cerrar la sesión.

### Gestión de etiquetas privadas (solo USER)
- RF-19: CUANDO el USER abra la gestión de etiquetas privadas, EL SISTEMA debe listar sus
  etiquetas privadas en orden alfabético por nombre normalizado, indicando por cada una su
  nombre y su contador de uso, en una lista paginada. Debe mostrar además las etiquetas
  globales en modo solo lectura, cada una con el contador de uso referido a las notas del
  propio USER. Si no tiene privadas, debe mostrar el estado vacío de privadas y, aparte, las
  globales.
- RF-20: CUANDO el USER cree una etiqueta privada con un nombre válido (1–25 sobre el nombre
  normalizado) que no colisione, EL SISTEMA debe crearla y reflejarla en la lista.
- RF-21: SI el USER intenta crear una etiqueta privada cuyo nombre normalizado ya existe como
  etiqueta privada suya, ENTONCES EL SISTEMA debe rechazar la operación y avisar.
- RF-22: SI el USER intenta crear una etiqueta privada con el nombre normalizado de una
  etiqueta global, ENTONCES EL SISTEMA debe reutilizar la global y avisar, sin crear una
  privada.
- RF-23: CUANDO el USER renombre una etiqueta privada a un nombre válido que no colisione, EL
  SISTEMA debe actualizar el nombre y conservar sus asociaciones en las notas.
- RF-24: SI el USER renombra una etiqueta privada a un nombre normalizado que coincide con
  otra etiqueta privada suya, ENTONCES EL SISTEMA debe rechazar la operación y avisar.
- RF-25: SI el USER renombra una etiqueta privada a un nombre normalizado que coincide con una
  etiqueta global, ENTONCES EL SISTEMA debe dar prioridad a la global: reasociar sus notas a
  la global y eliminar siempre la privada (aunque no tenga notas), conservando todas las
  asociaciones y sin duplicar etiquetas en una misma nota.
- RF-26: CUANDO el USER elimine una etiqueta privada, EL SISTEMA debe solicitar confirmación
  y, al confirmarla, eliminarla y quitarla de todas las notas que la usaban, conservando las
  notas y sus demás etiquetas.
- RF-27: EL SISTEMA debe calcular el contador de uso de las etiquetas al abrir o refrescar la
  vista y mantenerlo actualizado automáticamente tras crear, renombrar o eliminar una
  etiqueta, contando notas distintas incluidas las archivadas y sin contar dos veces la misma
  nota.
- RF-28: EL SISTEMA debe conservar una etiqueta privada cuando deje de estar asociada a
  cualquier nota (contador 0).
- RF-29: EL SISTEMA no debe listar, ofrecer ni permitir modificar etiquetas privadas de otro
  usuario.
- RF-30: EL SISTEMA debe garantizar que un mismo USER no tenga dos etiquetas privadas con el
  mismo nombre normalizado, incluso ante operaciones simultáneas.

### Tema
- RF-31: EL SISTEMA debe ofrecer cinco temas seleccionables desde el menú: `cupcake` (claro),
  `sunset` (oscuro), `retro`, `nord` y `abyss`.
- RF-32: CUANDO el usuario elija un tema, EL SISTEMA debe aplicarlo de inmediato a toda la
  interfaz, incluidas las pantallas sin sesión, el propio menú y las demás pestañas abiertas.
- RF-33: EL SISTEMA debe conservar el tema elegido entre recargas y sesiones en el mismo
  dispositivo, incluso sin sesión activa.
- RF-34: MIENTRAS el usuario no haya elegido un tema, EL SISTEMA debe usar la preferencia
  claro/oscuro del sistema operativo (`cupcake`/`sunset`), actualizarse si esa preferencia
  cambia y, si no puede determinarla, usar el tema `cupcake`.
- RF-35: SI el tema guardado no es válido o ya no existe, ENTONCES EL SISTEMA debe aplicar el
  tema por defecto (preferencia del sistema o `cupcake`).
- RF-36: EL SISTEMA debe indicar en el menú cuál es el tema activo mediante una marca de
  selección accesible.

### Estados y errores de las vistas
- RF-37: CUANDO el USER abra el perfil o la gestión de etiquetas privadas, EL SISTEMA debe
  mostrar un estado de carga mientras obtiene los datos.
- RF-38: SI la carga del perfil o de la gestión de etiquetas falla por un problema de red,
  ENTONCES EL SISTEMA debe mostrar un error con una acción para reintentar.
- RF-39: SI una operación de etiquetas privadas (crear, renombrar o eliminar) falla por un
  problema de red, ENTONCES EL SISTEMA debe informar el error y conservar el estado de la
  vista.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe presentar todos los textos visibles al usuario en español neutro (sin
  voseo).
- RNF-2: EL SISTEMA debe permitir operar el menú, el perfil, el cambio de contraseña, la
  gestión de etiquetas y la selección de tema con teclado y lector de pantalla, conforme a
  WCAG 2.1 nivel AA (foco visible, cierre con Escape, roles y etiquetas accesibles).
- RNF-3: EL SISTEMA no debe exponer datos sensibles ni datos de otros usuarios en respuestas,
  errores ni registros.
- RNF-4: EL SISTEMA debe presentar el menú y las pantallas asociadas sin desbordamiento
  horizontal entre 320 px y 1280 px.
- RNF-5: EL SISTEMA debe tratar la preferencia de tema como un ajuste del dispositivo, sin
  sincronizarla entre dispositivos ni cuentas.
- RNF-6: EL SISTEMA debe ser idempotente donde corresponda: renombrar una etiqueta a su mismo
  nombre normalizado, eliminar una etiqueta ya eliminada o el cambio de nombre sin cambios no
  deben producir efectos inesperados.
- RNF-7: EL SISTEMA debe validar y autorizar todas las operaciones de etiquetas en el servidor,
  comprobando la pertenencia al usuario.

## Casos límite

- Abrir el menú y hacer click fuera o pulsar Escape: el menú se cierra.
- Elegir una acción o navegar a otra pantalla: el menú se cierra.
- Editar el nombre y cancelar: se conserva el nombre anterior.
- Nombre con espacios en los extremos: se recorta antes de validar (3–150).
- Nombre de exactamente 3 y 150 caracteres: válido; 2 y 151: rechazado.
- Falla de red al guardar el nombre o cambiar la contraseña: se informa y se conserva lo
  ingresado; la sesión continúa.
- Falla de red al cerrar sesión: se informa y la sesión continúa.
- Cambio de contraseña con contraseña actual incorrecta: se rechaza y la sesión continúa.
- Nueva contraseña igual a la actual: se acepta como cambio válido (no hay regla de historial).
- Nueva contraseña con espacios o confirmación vacía: aplica la validación (longitud y
  coincidencia) y se rechaza si no cumple; la longitud se comprueba también en el servidor.
- Cambio de contraseña exitoso: se cierran todas las sesiones y se pide iniciar sesión de nuevo.
- Etiqueta privada sin notas: se conserva y su contador es 0.
- Renombrar una privada a su mismo nombre normalizado: sin cambio efectivo.
- Renombrar una privada al nombre de una global: se fusiona en la global (gana la global) y la
  privada se elimina aunque no tenga notas; el ítem desaparece de la lista de privadas.
- Eliminar la última etiqueta privada: la lista pasa al estado vacío.
- Eliminar una privada en uso: se pide confirmación; al confirmar, las notas conservan el resto
  de sus etiquetas.
- Contador de uso: se recalcula al abrir o refrescar y se actualiza de inmediato tras crear,
  renombrar o eliminar una etiqueta; incluye archivadas y no cuenta dos veces la misma nota.
- Contador de las globales mostradas en la gestión: cuenta solo las notas del propio USER que
  usan esa global.
- Muchas etiquetas privadas: la lista se presenta paginada.
- Creación o renombrado simultáneo del mismo nombre normalizado por el mismo USER: una
  operación prospera y la otra se rechaza.
- USER sin etiquetas privadas: la gestión muestra el estado vacío (y las globales en solo
  lectura).
- USER intenta operar una etiqueta privada de otro usuario: no se ofrece y se rechaza.
- En la gestión, escribir el nombre de una global: se reutiliza la global y se avisa; no se crea
  privada.
- Cambio de tema en una pestaña: el cambio se aplica de inmediato a la interfaz y también a las
  demás pestañas abiertas.
- Sin elección de tema: se usa la preferencia del sistema (`cupcake`/`sunset`) y el fallback es
  `cupcake`.
- Sin elección de tema: si la preferencia del sistema cambia en vivo, el tema aplicado se
  actualiza.
- Alta de la vista de perfil o etiquetas: se muestra un estado de carga hasta obtener los datos.
- Falla de red al cargar el perfil o las etiquetas: se muestra un error con opción de
  reintentar.
- Falla de red al crear, renombrar o eliminar una etiqueta: se informa y se conserva el estado
  de la vista.
- Tema guardado inexistente o inválido: se aplica el tema por defecto.
- Preferencia de tema ausente (por ejemplo, al limpiar los datos del navegador): se aplica el
  tema por defecto.
- El tema elegido se refleja de inmediato, incluido el menú abierto.

## Fuera de alcance

- Cambiar el correo electrónico.
- Foto o avatar de perfil.
- Eliminar la propia cuenta.
- Gestión de sesiones o dispositivos (listar/cerrar sesiones individuales).
- Recuperación de contraseña olvidada.
- Sincronizar el tema entre dispositivos o cuentas.
- CRUD de etiquetas globales desde el menú (permanece en el panel de administración, Spec 007).
- Reglas de complejidad, rotación o historial de contraseñas más allá de 8–20.
- Que el ADMIN tenga etiquetas privadas o notas.

## Criterios de finalización

- [ ] El menú aparece en el encabezado para USER y ADMIN, muestra el nombre y reemplaza el
      botón suelto de "Cerrar sesión". (RF-1, RF-2, RF-6)
- [ ] La opción de etiquetas privadas aparece solo para USER. (RF-4)
- [ ] El usuario ve y edita su nombre con validación 3–150 y cancelación. (RF-8 .. RF-11)
- [ ] El usuario cambia su contraseña (actual + nueva + confirmación) y al lograrlo se cierran
      sus sesiones. (RF-12 .. RF-15)
- [ ] Cerrar sesión desde el menú lleva a iniciar sesión; los fallos de red no cierran la
      sesión. (RF-16 .. RF-18)
- [ ] El USER lista (privadas + globales en solo lectura, con contador propio y paginación),
      crea, renombra y elimina etiquetas privadas con contador de uso. (RF-19, RF-20, RF-23,
      RF-26 .. RF-28)
- [ ] Las colisiones al crear/renombrar se resuelven: privada→error, global→reutilizar/fusionar,
      con unicidad ante concurrencia. (RF-21, RF-22, RF-24, RF-25, RF-30)
- [ ] No se accede a etiquetas privadas de otro usuario. (RF-29)
- [ ] El usuario elige entre cinco temas; se aplica de inmediato a toda la interfaz, también a
      las demás pestañas abiertas, se recuerda por dispositivo y, sin elección, sigue la
      preferencia del sistema en vivo con fallback `cupcake`. (RF-31 .. RF-36)
- [ ] Las vistas de perfil y etiquetas muestran carga y, ante fallo de red, un error con
      reintento; las operaciones de etiquetas fallidas informan y conservan el estado. (RF-37 ..
      RF-39)
- [ ] Accesibilidad y responsive cumplidos. (RNF-2, RNF-4)
- [ ] Los tests correspondientes pasan.
- [ ] `tasks.md` marcado y `MEMORY.md` actualizado.

## Dudas abiertas

- Ninguna.
