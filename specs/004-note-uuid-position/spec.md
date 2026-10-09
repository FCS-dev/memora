# Spec 004 — Identificador público y orden manual de notas

Estado: implementada

## Contexto y objetivo

Hoy las notas se identifican por un id numérico interno expuesto en las URLs y en las respuestas, y su orden se asigna con un incremento global por usuario, sin permitir reordenarlas. Se necesita que cada nota tenga un identificador público único y que el usuario pueda ordenar manualmente sus notas con arrastrar y soltar, persistiendo el orden. El orden se maneja por grupos (fijadas, no fijadas y archivadas) con secuencias independientes, de modo que las posiciones de un grupo no interfieran con las de otro. Esta spec deroga el requisito de posición global (RF-15 de la Spec 002) y deja de usar el contador `lastNotePosition`.

## Usuarios

- **Usuario autenticado (USER):** gestiona, reordena y cambia de grupo sus propias notas. El ADMIN no accede a notas.

## Historias de usuario

- HU-1. Como usuario autenticado, quiero que cada nota tenga un identificador público único para referirme a ella sin exponer identificadores internos.
- HU-2. Como usuario autenticado, quiero reordenar mis notas dentro de su grupo y que ese orden quede guardado.
- HU-3. Como usuario autenticado, quiero que mis notas fijadas, no fijadas y archivadas mantengan órdenes independientes.
- HU-4. Como usuario autenticado, quiero mover una nota entre grupos (fijar, desfijar, archivar, restaurar) sin que ello desordene mis notas.

## Definiciones

- **Identificador público de nota:** UUID v4 con guiones (36 caracteres), con el mismo formato que el identificador público del usuario.
- **Grupo:** uno de PINNED (fijada), NOT_PINNED (no fijada) o ARCHIVED (archivada). Cada grupo tiene su propio orden por usuario.
- **position:** clave de orden **interna y por grupo**; un valor mayor se muestra más arriba. No es única entre grupos y no se expone en la API.
- **Vecinos de destino (before/after):** la nota que quedará inmediatamente **antes** y la que quedará inmediatamente **después** de la nota movida, dentro del mismo grupo; en un extremo, el vecino ausente llega vacío.
- **Transición de grupo:** paso a cualquier grupo distinto del actual, sin orden obligatorio; al entrar a ARCHIVED se fuerza el estado de fijada en falso.

## Requisitos funcionales

- RF-1: EL SISTEMA debe asignar a cada nota un identificador público UUID v4 único en el momento de crearla.
- RF-2: EL SISTEMA debe exponer en las respuestas y aceptar en las URLs el identificador público de la nota; no debe exponer el id numérico interno ni el valor de `position`.
- RF-3: CUANDO se cree una nota, EL SISTEMA debe colocarla arriba del grupo NOT_PINNED; SI la nota se crea con estado fijada, ENTONCES debe colocarla arriba del grupo PINNED.
- RF-4: SI una nota se intenta crear con estado archivado, ENTONCES EL SISTEMA debe rechazar la operación.
- RF-5: CUANDO un usuario solicite sus notas no archivadas, EL SISTEMA debe devolverlas ordenadas primero el grupo PINNED y luego el grupo NOT_PINNED, cada grupo con `position` descendente.
- RF-6: CUANDO un usuario solicite sus notas archivadas, EL SISTEMA debe devolver el grupo ARCHIVED ordenado por fecha de creación descendente.
- RF-7: CUANDO el usuario reordene una nota indicando la nota vecina anterior y la nota vecina siguiente dentro de su grupo, EL SISTEMA debe dejarla inmediatamente entre ambas; SI un extremo no tiene vecina, ENTONCES debe dejarla en el tope (sin vecina anterior) o en el fondo (sin vecina siguiente) del grupo.
- RF-8: SI el usuario indica como vecina una nota que no pertenece a su mismo grupo, o la propia nota que se mueve, ENTONCES EL SISTEMA debe rechazar la operación.
- RF-9: CUANDO el usuario mueva una nota al tope del grupo (sin vecina anterior), EL SISTEMA debe dejarla por encima de todas las demás; CUANDO la mueva al fondo (sin vecina siguiente), por debajo de todas las demás; SI el grupo no tiene otras notas, ENTONCES debe quedar en la posición base del grupo.
- RF-10: CUANDO el usuario ubique una nota entre dos vecinas, EL SISTEMA debe dejar el orden resultante: vecina anterior, nota movida, vecina siguiente.
- RF-11: SI no queda espacio entero entre las vecinas, O si la posición resultante no puede ser positiva, ENTONCES EL SISTEMA debe renumerar el grupo conservando el orden relativo, de modo de mantener el orden sin degradación; esta renumeración tiene precedencia sobre RF-9 y RF-10.
- RF-12: EL SISTEMA debe garantizar un orden total y determinista dentro de cada grupo; ante un empate de `position`, se muestra primero la nota con mayor id interno.
- RF-13: CUANDO el usuario cambie una nota de grupo, EL SISTEMA debe permitir cualquier grupo destino distinto del actual: SI el destino es PINNED o NOT_PINNED, ENTONCES debe fijar `isArchived=false`, el estado de fijada según el destino y colocarla arriba del grupo destino; SI el destino es ARCHIVED, ENTONCES debe fijar `isPinned=false` y conservar la `position` actual; SI la nota ya está en el grupo destino, ENTONCES EL SISTEMA debe rechazar la operación.
- RF-14: CUANDO una nota pase al grupo ARCHIVED, EL SISTEMA debe fijar su estado de fijada en falso.
- RF-15: CUANDO el usuario actualice una nota, EL SISTEMA debe recibir título, contenido y modo de checklist como campos obligatorios y, opcionalmente, el estado de fijada; SI cambia el estado de fijada o la nota está archivada, ENTONCES debe colocarla arriba del grupo PINNED o NOT_PINNED según corresponda, desarchivándola si estaba archivada; la actualización no acepta `position` ni el estado archivado.
- RF-16: EL SISTEMA debe tratar el reordenamiento y el cambio de grupo como operaciones separadas: reordenar no cambia el grupo y cambiar de grupo no admite indicar vecinas.
- RF-17: CUANDO una nota pase al grupo ARCHIVED, EL SISTEMA debe quitarla del orden activo conservando su `position` y preservando el orden relativo de las demás.
- RF-18: EL SISTEMA debe impedir reordenar una nota del grupo ARCHIVED.
- RF-19: SI un usuario intenta operar sobre una nota que no le pertenece, ENTONCES EL SISTEMA debe responder como si la nota no existiera, sin revelar su existencia.
- RF-20: SI un identificador público (de la nota operada o de una vecina de destino) está malformado, ENTONCES EL SISTEMA debe rechazar la solicitud; SI está bien formado pero no corresponde a una nota del usuario, ENTONCES EL SISTEMA debe responder "no encontrado".

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe garantizar que el identificador público sea único en todo el sistema.
- RNF-2: EL SISTEMA debe aplicar autorización por recurso: cada usuario solo opera sobre sus propias notas.
- RNF-3: EL SISTEMA no debe exponer identificadores internos (id numérico ni `position`) ni datos sensibles en respuestas o errores.
- RNF-4: EL SISTEMA debe conservar el orden por grupo y los identificadores públicos tras reinicios y recargas.
- RNF-5: EL SISTEMA debe mantener el orden de un grupo sin degradación indefinida, mediante la renumeración definida.

## Casos límite

- Crear una nota ya fijada; crear una nota ya archivada (rechazada).
- Insertar repetidamente entre las mismas dos notas hasta no dejar espacio entero entre ellas; debe renumerarse el grupo.
- Mover al fondo repetidamente hasta que la nota no pueda quedar por debajo; debe renumerarse el grupo.
- Empate de `position` dentro de un grupo: se desempata por mayor id interno.
- Indicar como vecina una nota archivada, de otro grupo o la propia nota.
- Cambiar una nota a su mismo grupo.
- Mover una nota que pertenece a otro usuario.
- Pasar una nota de PINNED a ARCHIVED (o viceversa) directamente: permitido.
- Actualizar con estado de fijada una nota archivada: la desarchiva y la ubica arriba de PINNED/NOT_PINNED.
- Listado de archivadas ordenado por fecha de creación.
- Reordenar indicando solo la vecina anterior o solo la siguiente (un extremo vacío): tope o fondo.
- Reordenar en un grupo sin otras notas: la nota queda en la posición base.
- Fijar/desfijar/archivar/restaurar una nota y su posición en el grupo destino.
- Leer el grupo de notas archivadas.
- Una vecina de destino malformada (rechazo) frente a inexistente o ajena ("no encontrado").
- Grupo destino vacío al crear o al cambiar de grupo.
- Base sin datos: no se define migración de notas existentes.

## Fuera de alcance

- Interfaz de usuario de notas (el frontend aún no la tiene).
- Elegir un destino relativo a notas de otro grupo (el cambio de grupo coloca la nota arriba del grupo destino).
- Compartir notas, notificaciones o adjuntos.
- Mover notas entre usuarios.
- Migración de notas existentes (se asume base sin datos).

## Criterios de finalización

- [ ] Cada nota expone y se identifica por un UUID v4 con guiones único; no se exponen id interno ni `position`. (RF-1, RF-2, RNF-1, RNF-3)
- [ ] Al crear, la nota entra arriba de NOT_PINNED, o de PINNED si se crea fijada; crear archivada se rechaza. (RF-3, RF-4)
- [ ] El listado de no archivadas devuelve PINNED y luego NOT_PINNED en `position` descendente. (RF-5)
- [ ] El listado de archivadas devuelve ARCHIVED ordenado por fecha de creación descendente. (RF-6)
- [ ] Reordenar indicando vecina anterior y siguiente (o extremo vacío) respeta el destino dentro del grupo. (RF-7, RF-9, RF-10)
- [ ] Una vecina inválida (otro grupo, archivada, ajena, propia) o un cambio al mismo grupo se rechaza. (RF-8, RF-13)
- [ ] La renumeración se dispara por falta de espacio entero o posición no positiva y conserva el orden. (RF-11, RNF-5)
- [ ] El orden intra-grupo es total y determinista, con desempate por mayor id interno. (RF-12)
- [ ] El cambio de grupo admite cualquier destino: a PINNED/NOT_PINNED la coloca arriba y fija el estado según destino; a ARCHIVED conserva `position` y fuerza `isPinned=false`. (RF-13)
- [ ] Al archivar, el estado de fijada queda en falso. (RF-14)
- [ ] El update recibe título, contenido y checklist obligatorios, cambia el estado de fijada; sobre una archivada, la desarchiva y la sube arriba del destino. (RF-15)
- [ ] Reordenar y cambiar de grupo son operaciones separadas. (RF-16)
- [ ] Archivar saca la nota del orden activo conservando su `position`, sin alterar el orden relativo de las demás. (RF-17)
- [ ] No se puede reordenar una nota archivada. (RF-18)
- [ ] Operar o referenciar una nota ajena o inexistente no filtra su existencia; el UUID malformado se rechaza. (RF-19, RF-20, RNF-2)
- [ ] El orden y los identificadores se conservan tras reinicios. (RNF-4)
- [ ] Los tests correspondientes pasan.

## Dudas abiertas

- Ninguna.
