---
description: SDD · Genera el plan técnico de una spec aprobada
agent: plan
---
Lee docs/constitution.md, AGENTS.md y specs/$1/spec.md. Usa la skill sdd.
NO escribas código.
Genera specs/$1/plan.md con:
- archivos que se crean o modifican y la responsabilidad de cada uno,
- funciones puras de lógica identificadas, con sus dependencias externas como parámetros explícitos,
- algoritmo en pseudocódigo,
- cómo se expone en la interfaz del sistema (UI, API, CLI, etc.) según corresponda,
- decisiones técnicas justificadas con su alternativa descartada,
- estrategia de tests acorde al stack del proyecto.
Todo debe respetar la constitución y cubrir todos los RF. Marca qué RF cubre
cada parte. Si la spec no está aprobada o tiene dudas abiertas, para y avísame.
