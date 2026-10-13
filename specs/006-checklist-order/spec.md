# Spec 006 — Checklist ordenado, focus y estado vacío

Estado: implementada

## Contexto y objetivo

El editor de notas permite crear y editar checklists, pero los ítems se almacenan como un mapa de claves únicas sin orden garantizado. Esto impide que el usuario reordene los ítems y provoca que la base de datos pueda devolverlos en un orden distinto al guardado. Esta spec define el soporte para listas de ítems ordenadas, la mejora de usabilidad al agregar ítems y la visualización de un estado vacío en el listado de notas.

## Usuarios

- **Usuario autenticado (USER):** crea, edita y consulta sus propias notas.

## Historias de usuario

- HU-1. Como usuario autenticado, quiero reordenar los ítems de una checklist dentro del editor para organizar mis tareas.
- HU-2. Como usuario autenticado, quiero que al agregar un ítem nuevo el cursor se ubique en su input para seguir escribiendo sin clicks adicionales.
- HU-3. Como usuario autenticado, quiero ver una leyenda cuando no tenga notas para saber que el listado está vacío.

## Definiciones

- **Ítem de checklist:** objeto con un texto y un estado marcado/no marcado.
- **Reordenamiento:** cambiar la posición de un ítem dentro de su misma checklist.
- **Asa de arrastre:** ícono ubicado a la izquierda del checkbox de un ítem que permite iniciar el reordenamiento con puntero.
- **Panel principal:** vista de notas activas, que incluye las secciones de fijadas y no fijadas.

## Requisitos funcionales

### Modelo de checklist ordenado
- RF-1: EL SISTEMA debe almacenar los ítems de una checklist como una lista ordenada de objetos `{texto, marcado}`.
- RF-2: CUANDO el sistema persista una checklist, ENTONCES debe conservar el orden de los ítems definido por el usuario.
- RF-3: CUANDO el sistema devuelva una checklist, ENTONCES debe devolver los ítems en el mismo orden en que fueron guardados.

### Reordenamiento en el editor
- RF-4: CUANDO el usuario esté editando una checklist, ENTONCES EL SISTEMA debe permitir reordenar sus ítems dentro de la misma lista.
- RF-5: CUANDO el usuario reordene ítems en el editor, ENTONCES EL SISTEMA debe reflejar el nuevo orden en la interfaz de inmediato.
- RF-6: CUANDO el usuario guarde la nota, ENTONCES EL SISTEMA debe persistir el orden actual de los ítems.
- RF-7: EL SISTEMA debe ofrecer un asa de arrastre en cada ítem para reordenar con puntero.
- RF-8: EL SISTEMA debe ofrecer los atajos de teclado `Ctrl + ↑` / `Ctrl + ↓` (o `Cmd + ↑` / `Cmd + ↓` en macOS) para subir y bajar el ítem enfocado dentro de la lista.

### Agregar ítem
- RF-9: CUANDO el usuario agregue un nuevo ítem a una checklist, ENTONCES EL SISTEMA debe mover el foco al inicio del input de ese ítem recién agregado.

### Estado vacío
- RF-10: CUANDO el panel principal no contenga notas, ENTONCES EL SISTEMA debe mostrar una leyenda indicando que no hay notas.
- RF-11: CUANDO el panel de archivadas no contenga notas, ENTONCES EL SISTEMA debe mostrar una leyenda indicando que no hay notas archivadas.
- RF-12: SI el listado tiene notas, ENTONCES EL SISTEMA no debe mostrar la leyenda de vacío.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe mantener los textos visibles en español neutro.
- RNF-2: EL SISTEMA debe ser utilizable con teclado y puntero, conforme a WCAG 2.1 nivel AA.
- RNF-3: EL SISTEMA no debe perder ni duplicar ítems al reordenar o guardar.
- RNF-4: EL SISTEMA debe validar que una checklist tenga al menos un ítem con texto no vacío antes de guardar.

## Casos límite

- Checklist con un solo ítem: el reordenamiento no tiene efecto.
- Ítems con texto duplicado: el sistema los trata como entradas independientes; al marcar desde una tarjeta solo se actualiza el primer ítem coincidente.
- Reordenar y cancelar la edición: los cambios no se persisten.
- Guardar una checklist con todos los ítems vacíos: se rechaza o se trata como nota vacía según las reglas existentes.
- Panel principal vacío pero con notas archivadas: solo el panel principal muestra su leyenda de vacío.
- Panel de archivadas vacío pero con notas activas: solo el panel de archivadas muestra su leyenda de vacío.
- Atajos de teclado con foco en el checkbox o en la asa: deben funcionar igual que con foco en el input.

## Fuera de alcance

- Reordenar ítems entre distintas notas.
- Reordenar ítems desde la tarjeta de la nota (solo en el editor).
- Persistir un historial de cambios de orden.
- Notificaciones o recordatorios sobre ítems individuales.

## Criterios de finalización

- [x] El backend almacena y devuelve el checklist como una lista ordenada. (RF-1, RF-2, RF-3)
- [x] El editor permite reordenar ítems con asa de arrastre. (RF-4, RF-5, RF-7)
- [x] El editor permite reordenar ítems con atajos de teclado. (RF-8)
- [x] Al guardar, el orden de los ítems se persiste. (RF-6)
- [x] Al agregar un ítem, el foco se ubica en su input. (RF-9)
- [x] El listado muestra leyendas de vacío para el panel principal y archivadas. (RF-10, RF-11, RF-12)
- [x] Los tests correspondientes pasan.
- [x] `tasks.md` está marcado y `MEMORY.md` actualizado.

## Dudas abiertas

- Ninguna.
