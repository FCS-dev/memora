# Constitución — MEMORA

1. **Stack simple y estable**: no se agrega tecnología, framework o dependencia sin justificar por qué la actual no alcanza. Verificable: todo cambio de stack se documenta y aprueba antes de escribir código.

2. **La spec manda**: si un comportamiento no está en la spec aprobada, no va al código. Verificable: cada cambio de código se vincula a un RF de la spec activa.

3. **Lógica e interfaz separadas**: el backend contiene toda la lógica de negocio y autorización; el frontend solo presenta y captura. Verificable: los controllers no acceden a repositories y los componentes no contienen reglas de negocio.

4. **Tests antes de dar por válido**: toda tarea termina con tests que la comprueben y pasan. Verificable: el build/lint/test del módulo afectado está en verde antes de cerrar.

5. **Datos del usuario protegidos**: cada usuario solo accede a su propia información; nunca se exponen datos sensibles en errores, logs ni respuestas. Verificable: hay pruebas de autorización por recurso y ausencia de PII en logs.

6. **Idioma claro**: código, variables y nombres técnicos en inglés; textos visibles para usuarios en español neutro. Verificable: linter o revisión manual distingue ambos dominios.
