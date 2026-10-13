---
description: SDD · Implementa tareas pendientes (uso - /sdd-implement 001-nombre [tarea1])
agent: build
---
Implementa tareas de specs/$1/tasks.md, siguiendo specs/$1/plan.md,
docs/constitution.md, AGENTS.md y la skill sdd.

Si se proporciona $2 (ej. tarea1), implementa esa tarea directamente.
Si no se proporciona $2:
  1. Lee specs/$1/tasks.md.
  2. Encuentra la primera tarea que no esté marcada como hecha (línea que empiece con `- [ ]`).
  3. Pregunta al usuario: "La siguiente tarea pendiente es <Tarea>. ¿Quieres implementar solo esa tarea, implementar todas las tareas pendientes, o cancelar?".
     - Si elige "solo esa tarea": implementa solo esa tarea y después para.
     - Si elige "todas las tareas pendientes": implementa una por una, en orden, marcando cada una como hecha; cada tarea sigue el flujo tests-first; cuando termina la última, para.
     - Si elige "cancelar" o no confirma: párate.

Para cada tarea a implementar:
1. Escribe primero los tests y comprueba que fallan.
2. Escribe el código hasta que pasen.
3. Ejecuta el comando de tests del proyecto (ej. ./mvnw test, npm test, pytest, etc.) y muestra el resultado.
4. Ejecuta lint y build del proyecto cuando apliquen.
5. Marca la tarea como hecha en tasks.md e indica qué RF cubre.

Después PÁRATE. No empieces tareas de otra spec.
