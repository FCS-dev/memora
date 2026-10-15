# Spec 009 — Filtros de notas (recordatorio y etiquetas)

Estado: implementada

## Contexto y objetivo

Hoy la vista de notas lista todas las notas del panel activo sin forma de acotarlas: no se
pueden ver solo las que tienen recordatorio ni las asociadas a una etiqueta. Esta spec define
filtros de la lista por recordatorio y por etiqueta, con acceso rápido desde el propio
listado y pensados para pantallas táctiles.

## Usuarios

- **Usuario autenticado (USER):** administra sus notas y quiere acotar la lista por
  recordatorio y/o etiqueta.

## Historias de usuario

- HU-1. Como USER, quiero ver solo las notas que tienen recordatorio para ubicar esas notas
  de un vistazo.
- HU-2. Como USER, quiero ver solo las notas asociadas a una etiqueta para agrupar por tema.
- HU-3. Como USER, quiero combinar el recordatorio y las etiquetas para acotar aún más.

## Definiciones

- **Nota con recordatorio:** nota cuyo recordatorio está definido, sea pasado o futuro.
- **Filtro activo:** hay recordatorio activado y/o al menos una etiqueta seleccionada.
- **Etiqueta filtrable:** etiqueta usada en al menos una nota del USER, sin importar si es
  global o privada.
- **Etiqueta frecuente:** etiqueta filtrable ordenada por cantidad de notas del USER que la
  usan (mayor primero), con desempate alfabético por nombre normalizado.

## Requisitos funcionales

### Barra de filtros
- RF-1: EL SISTEMA debe ofrecer, en el listado de notas, una barra de filtros visible incluso
  durante la carga y el vacío; debe permitir activar "Con recordatorio" y las etiquetas
  frecuentes con un toque, y el resto de las etiquetas con dos toques.
- RF-2: CUANDO el usuario active "Con recordatorio", EL SISTEMA debe mostrar solo las notas
  con recordatorio definido, sea pasado o futuro.
- RF-3: EL SISTEMA debe ofrecer como accesos rápidos las cinco etiquetas filtrables más
  frecuentes y un control para ver todas las etiquetas filtrables; SI el USER no tiene
  etiquetas filtrables, ENTONCES EL SISTEMA no debe ofrecer ni los accesos ni el control.
- RF-4: CUANDO el usuario seleccione una o más etiquetas, EL SISTEMA debe mostrar solo las
  notas que tengan al menos una de las etiquetas seleccionadas.
- RF-5: CUANDO el usuario combine el filtro de recordatorio con etiquetas, EL SISTEMA debe
  mostrar solo las notas que cumplan ambas condiciones.
- RF-6: EL SISTEMA debe ofrecer un control "Todos" siempre presente que quite todos los
  filtros de una vez, y debe resaltarlo cuando haya filtro activo.
- RF-7: EL SISTEMA debe exponer cada filtro activo con estado de selección accesible
  (`aria-pressed=true`) y un resaltado visual.

### Alcance de la lista
- RF-8: EL SISTEMA debe aplicar los filtros a las notas del panel activo, conservando el
  agrupamiento Fijadas/Otras y el orden existente.
- RF-9: EL SISTEMA debe ofrecer los filtros únicamente en el listado de notas, no en el
  editor.
- RF-10: SI el filtro activo no produce resultados, ENTONCES EL SISTEMA debe mostrar un
  estado vacío propio del filtro con prioridad sobre el vacío del panel, distinguiendo entre
  "sin notas con recordatorio" y "sin notas con las etiquetas seleccionadas".
- RF-11: CUANDO el usuario desactive el último filtro, EL SISTEMA debe volver a mostrar todas
  las notas del panel activo.

### Consistencia y orden
- RF-12: MIENTRAS haya un filtro activo, EL SISTEMA no debe ofrecer el reordenamiento por
  arrastre; las demás acciones (crear, editar, archivar, fijar, eliminar) deben seguir
  disponibles y el listado debe actualizarse de inmediato.
- RF-13: CUANDO una etiqueta seleccionada se renombre o se fusione en una global, EL SISTEMA
  debe mantener la selección apuntando a la etiqueta resultante; solo debe descartarla si la
  etiqueta deja de existir o de estar usada.
- RF-14: EL SISTEMA debe conservar el filtro durante toda la sesión de la vista (cambios de
  panel, cambios de vista y al abrir o volver de una nota) y descartarlo al recargar o
  iniciar una nueva sesión.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe presentar todos los textos visibles al usuario en español neutro
  (sin voseo).
- RNF-2: EL SISTEMA debe permitir operar la barra de filtros y la lista completa de etiquetas
  con teclado y lector de pantalla, conforme a WCAG 2.1 nivel AA: foco visible, roles y
  estados accesibles, cierre de la lista completa con Escape, retorno del foco al control al
  cerrarla y anuncio de los cambios en los resultados.
- RNF-3: EL SISTEMA debe presentarse sin desbordamiento horizontal entre 320 px y 1280 px:
  los chips van en una fila con desplazamiento horizontal y la lista completa de etiquetas,
  en un contenedor con desplazamiento vertical.
- RNF-4: EL SISTEMA debe aplicar y quitar los filtros de forma inmediata, sin espera
  perceptible para el usuario.
- RNF-5: EL SISTEMA no debe listar, ofrecer ni filtrar notas de otro usuario.

## Casos límite

- Nota con recordatorio pasado: se incluye en el filtro "Con recordatorio".
- Etiqueta global usada por sus notas: es filtrable igual que una privada.
- Solo se ofrecen las etiquetas usadas; las de contador 0 no se ofrecen.
- Varias etiquetas seleccionadas: se muestran las notas que tengan al menos una.
- Sin notas con recordatorio, sin notas con la etiqueta, o combinación sin resultados: se
  muestra el vacío propio del filtro, con prioridad sobre el vacío del panel.
- Filtro activo y se crea una nota que no cumple el filtro: no aparece hasta quitarlo.
- Filtro activo y se edita una nota que deja de cumplir el filtro: desaparece de la lista.
- Filtro activo y se elimina la última nota coincidente: pasa al vacío del filtro.
- Filtro activo y se archiva, fija o elimina una nota: la acción se permite y la lista se
  actualiza en vivo.
- Filtro activo y arrastre: la acción de reordenar no se ofrece.
- Abrir una nota filtrada y volver: el filtro se mantiene.
- Cambiar de panel o de vista: el filtro se mantiene y se reaplica.
- Se renombra o fusiona una etiqueta seleccionada: la selección se mantiene.
- Se elimina la etiqueta seleccionada: se descarta la selección.
- Muchas etiquetas: los chips usan desplazamiento horizontal y la lista completa,
  desplazamiento vertical.
- Etiquetas homónimas global/privada: se ofrece una sola entrada por nombre normalizado.
- USER sin etiquetas usadas: solo se ofrece "Con recordatorio".
- Falla la carga de etiquetas: "Con recordatorio" sigue disponible y las etiquetas muestran
  un error con opción de reintentar.
- Lista sin notas y sin filtro: se muestra el vacío del panel; con filtro: el vacío del
  filtro.
- Recarga o nueva sesión: el filtro parte sin selección.

## Fuera de alcance

- Persistir el filtro entre sesiones o dispositivos.
- Guardar "vistas" con nombre.
- Filtrar por texto, estado de checklist u otros campos.
- Filtros en el panel de administración.
- Búsqueda combinada con texto libre.

## Criterios de finalización

- [ ] La barra de filtros aparece en el listado (incluso en carga y vacío) con acceso directo
      a "Con recordatorio" y a las etiquetas frecuentes. (RF-1, RF-2, RF-3)
- [ ] Seleccionar etiquetas y/o recordatorio acota la lista conservando agrupamiento y orden;
      el control "Todos" la restaura. (RF-4, RF-5, RF-6, RF-8, RF-11)
- [ ] Cada filtro activo se refleja con estado accesible y resaltado. (RF-7)
- [ ] Los filtros se ofrecen solo en el listado y no en el editor. (RF-9)
- [ ] Aparece el vacío propio del filtro cuando no hay resultados, con prioridad sobre el del
      panel. (RF-10)
- [ ] Con filtro activo no se ofrece reordenar; el resto de acciones sí y la lista se
      actualiza en vivo. (RF-12)
- [ ] Renombrar o fusionar una etiqueta seleccionada mantiene la selección; eliminarla la
      descarta. (RF-13)
- [ ] El filtro se conserva durante la sesión de la vista y se descarta al recargar o nueva
      sesión. (RF-14)
- [ ] Accesibilidad (teclado, lector de pantalla, Escape, anuncio) y responsive sin
      desbordamiento 320–1280 px. (RNF-2, RNF-3)
- [ ] Los tests correspondientes pasan.
- [ ] `tasks.md` marcado y `MEMORY.md` actualizado.

## Dudas abiertas

- Ninguna.
