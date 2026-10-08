---
description: SDD · Valida la spec RF por RF (tests + Chrome DevTools)
agent: build
---
Recorre specs/$1/spec.md requisito por requisito. Para cada RF identifica qué
test lo cubre y ejecuta el comando de tests apropiado al módulo afectado
(por ejemplo, `node --test`, `npm test`, `mvn test`, `pytest`, etc.).
Para los RF de interfaz o de comportamiento que no se puedan verificar con
tests automáticos del módulo, utiliza el MCP de Chrome DevTools (incluida la
vista móvil de 375 px cuando aplique).
Si algún RF no está cubierto o falla, dilo claramente. NO arregles nada todavía.
Después comprueba los criterios de finalización y dame un veredicto:
¿la spec está cumplida?
