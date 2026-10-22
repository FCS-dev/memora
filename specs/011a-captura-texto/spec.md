# Spec 011a — Captura de notas en lenguaje natural: texto

Estado: aprobada

## Contexto y objetivo

Memora permite crear notas mediante un formulario con título, contenido, recordatorio, etiquetas y checklist. Ese formato es preciso, pero obliga al usuario a decidir de antemano cómo estructurar la información. Muchas veces la intención surge como una frase: “mañana a las 18 comprar leche y pan, urgente”.

El objetivo de esta spec es permitir que el usuario escriba una frase y obtenga un borrador de nota editable. El borrador nunca se guarda automáticamente: el usuario siempre lo revisa antes de confirmar.

Esta spec cubre solo la captura por texto. La captura por voz se define en la Spec 011b y reutiliza el consentimiento, la captura, el borrador y la revisión definidos aquí. MCP, búsqueda asistida, documentos, RAG y el asistente conversacional quedan fuera de alcance.

## Usuarios

- **Usuario autenticado (USER):** crea notas propias y quiere capturarlas con lenguaje natural.
- **Administrador (ADMIN):** no gestiona notas; no participa en este flujo.

## Historias de usuario

- HU-1. Como USER, quiero escribir una frase y obtener un borrador de nota para no estructurar los campos manualmente.
- HU-2. Como USER, quiero revisar y corregir el borrador antes de guardarlo para mantener el control de mis notas.
- HU-3. Como USER, quiero que se sugieran solo mis etiquetas existentes para no crear etiquetas por error.
- HU-4. Como USER, quiero que si la interpretación falla no se pierda lo que escribí.
- HU-5. Como USER, quiero decidir de forma explícita si mi texto se envía a un servicio externo de IA.
- HU-6. Como USER, quiero que una captura genere una sola nota y que no se duplique al reintentar.
- HU-7. Como USER, quiero que la captura siga disponible en modo manual cuando la IA esté desactivada o no haya consentimiento.

## Definiciones

- **Captura:** texto libre escrito por el usuario que describe una nota.
- **Interpretación:** proceso que convierte el texto de la captura en un borrador estructurado.
- **Borrador:** propuesta de nota con título, contenido, checklist, recordatorio y etiquetas sugeridas. No está persistida.
- **Etiqueta existente:** etiqueta global o privada que ya pertenece al usuario y puede asociarse a la nota.
- **Consentimiento:** autorización explícita del usuario para enviar texto o audio a un servicio externo de IA. Un mismo consentimiento cubre texto y audio.
- **Proveedor externo de IA:** servicio configurado para interpretar texto o transcribir audio. En esta fase se usa Groq.
- **Modo manual:** creación de la nota completando el editor sin interpretación ni transcripción.
- **Operación de IA completada:** interpretación o transcripción que termina correctamente. Las solicitudes fallidas, canceladas o rechazadas no cuentan.

## Requisitos funcionales

### Acceso, consentimiento y privacidad

- RF-1: EL SISTEMA debe ofrecer, en la vista de notas, una acción principal de captura en lenguaje natural ubicada antes de la lista y visible sin desplazamiento inicial en móvil y escritorio.
- RF-2: CUANDO el usuario abra la captura, EL SISTEMA debe mostrar un campo de texto libre, un contador de caracteres y las acciones para revisar o pasar al modo manual.
- RF-3: EL SISTEMA debe aceptar capturas de hasta 2500 puntos de código Unicode después de recortar espacios externos; SI el texto supera ese límite, ENTONCES EL SISTEMA debe bloquear la revisión, mostrar el límite y permitir editar hasta reducirlo.
- RF-4: La primera vez que el usuario realice una acción que implique IA, EL SISTEMA debe solicitar un consentimiento explícito único que cubra texto y audio; cerrar o cancelar el diálogo sin aceptar debe equivaler a no otorgar el consentimiento.
- RF-5: SI el usuario rechaza el consentimiento, ENTONCES EL SISTEMA debe permitir la captura manual y no enviar texto ni audio a ningún servicio externo de IA.
- RF-6: EL SISTEMA debe recordar la decisión de consentimiento por cuenta en el servidor, de modo que se comparta entre dispositivos, y no debe volver a solicitarla salvo que el usuario la cambie.
- RF-7: EL SISTEMA debe permitir al usuario cambiar su decisión de consentimiento desde su perfil; SI la revoca, ENTONCES EL SISTEMA debe desactivar la IA de inmediato y cancelar cualquier solicitud en curso.
- RF-8: EL SISTEMA debe registrar un historial de consentimiento con la decisión, la fecha y la versión del aviso aceptado o rechazado.
- RF-9: SI la IA está desactivada o el usuario no otorgó consentimiento, ENTONCES la captura debe abrir el editor manual, ocultar o deshabilitar las acciones de IA con una explicación y mantener disponible el guardado manual.
- RF-10: EL SISTEMA debe mostrar un aviso de privacidad que nombre a Groq como proveedor externo, indique que el texto se envía a ese servicio y aclare que el modo manual no envía datos.
- RF-11: EL SISTEMA no debe registrar en logs el texto de la captura, el borrador, el contenido de la nota ni respuestas completas del proveedor.

### Captura por texto

- RF-12: CUANDO el usuario envíe un texto dentro del límite, EL SISTEMA debe generar un borrador de una única nota y no debe persistirla.
- RF-13: EL SISTEMA debe incluir en el borrador, cuando corresponda, título, contenido, modo checklist, ítems de checklist, recordatorio y etiquetas existentes sugeridas; no debe incluir estado fijado ni estado archivado.
- RF-14: EL SISTEMA debe sugerir como máximo cinco etiquetas existentes del usuario y descartar cualquier etiqueta inexistente, ajena o inventada; SI hay una etiqueta global y otra privada con el mismo nombre normalizado, ENTONCES EL SISTEMA debe aplicar la regla vigente de que prevalece la global.
- RF-15: SI no se pueden cargar las etiquetas, ENTONCES EL SISTEMA debe continuar en modo manual, avisar y no sugerir etiquetas.
- RF-16: EL SISTEMA debe validar y normalizar el borrador con las reglas vigentes: título obligatorio de 1 a 200 caracteres, contenido de 0 a 2500 caracteres, checklist con al menos un ítem y suma de textos de hasta 2500 caracteres.
- RF-17: SI el modelo devuelve contenido y checklist a la vez, ENTONCES EL SISTEMA debe conservar la checklist, dejar el contenido vacío y respetar la regla vigente de las notas checklist.
- RF-18: SI el modelo devuelve un título de más de 200 caracteres, contenido de más de 2500 o una checklist inválida, ENTONCES EL SISTEMA debe recortar el título y el contenido al límite, descartar la checklist inválida y mostrar una advertencia.
- RF-19: SI el modelo devuelve un título vacío o compuesto solo por espacios, ENTONCES EL SISTEMA debe usar los primeros 60 caracteres del texto original como título provisional editable.
- RF-20: CUANDO exista un borrador, EL SISTEMA debe abrir el editor con los campos precargados y permitir modificarlos; la nota solo debe guardarse cuando el usuario confirme.
- RF-21: SI el usuario cancela la interpretación, ENTONCES EL SISTEMA debe volver a la captura conservando el texto; SI cancela la revisión, ENTONCES EL SISTEMA debe descartar el borrador pero conservar el texto original.
- RF-22: SI la interpretación falla, supera el tiempo de espera, no hay cuota disponible o la respuesta es inválida, ENTONCES EL SISTEMA debe abrir el editor manual con el texto original como contenido y los primeros 60 caracteres como título provisional, sin perder la entrada.
- RF-23: SI el texto contiene varias notas o varias intenciones, ENTONCES EL SISTEMA no debe dividirlo ni inventar datos; debe abrir el editor manual con el texto completo y una advertencia para que el usuario lo estructure.
- RF-24: CUANDO el texto incluya una fecha relativa, EL SISTEMA debe resolverla en el servidor usando la zona horaria enviada por el navegador y el reloj del servidor; SI la fecha es ambigua, solo contiene fecha u hora, o la zona es ausente o inválida, ENTONCES EL SISTEMA debe dejar el recordatorio vacío y advertirlo.
- RF-25: EL SISTEMA debe aceptar las fechas pasadas con el mismo comportamiento actual de los recordatorios y no debe rechazarlas por estar vencidas.
- RF-26: MIENTRAS la interpretación esté en curso, EL SISTEMA debe mostrar un estado de carga, impedir envíos duplicados y permitir cancelar.
- RF-27: EL SISTEMA debe conservar el texto original durante la revisión y permitir volver a consultarlo.
- RF-28: EL SISTEMA debe evitar que una misma confirmación cree más de una nota: debe bloquear el botón de guardado mientras se procesa y el servidor debe rechazar reintentos de la misma confirmación.
- RF-29: EL SISTEMA debe permitir un máximo de 50 operaciones de IA completadas por usuario y por día, contando interpretaciones y transcripciones, con reinicio a la medianoche de la zona horaria del navegador; SI la zona falta o es inválida, ENTONCES EL SISTEMA debe usar la zona del servidor para el reinicio; SI se alcanza el límite, ENTONCES EL SISTEMA debe informar y ofrecer el modo manual.
- RF-30: EL SISTEMA debe rechazar la captura cuando no haya una sesión de USER activa y no debe permitir que ADMIN cree notas.

### Interfaz y accesibilidad

- RF-31: EL SISTEMA debe permitir toda la captura y revisión con teclado y lector de pantalla, con foco visible y anuncios de los cambios de estado.
- RF-32: EL SISTEMA debe ser usable sin desbordamiento horizontal entre 390 px y 2560 px, con prioridad móvil.
- RF-33: EL SISTEMA debe respetar `prefers-reduced-motion` en las transiciones de la captura y la revisión.

## Requisitos no funcionales

- RNF-1: La interpretación de texto debe responder con un percentil 95 menor o igual a 8 segundos para capturas de hasta 2500 caracteres, con una conexión estable de al menos 10 Mbps y el proveedor disponible; la medición se realiza en el servidor desde la recepción de la solicitud hasta el envío de la respuesta.
- RNF-2: EL SISTEMA debe cancelar la solicitud y aplicar el fallback si el proveedor no responde en 20 segundos.
- RNF-3: EL SISTEMA debe imponer el límite diario definido y manejar la falta de cuota sin bloquear el modo manual.
- RNF-4: EL SISTEMA no debe exponer claves, credenciales ni detalles internos del proveedor de IA en errores, logs ni respuestas.
- RNF-5: EL SISTEMA debe tratar el texto y el borrador como datos personales: no registrar contenido, no enviar más información de la necesaria y limitar el envío al texto, la zona horaria y las etiquetas necesarias para la sugerencia.
- RNF-6: La validación del borrador, la resolución de fechas, la autorización y la idempotencia deben ejecutarse en el servidor; el cliente solo envía la zona horaria y presenta el resultado.
- RNF-7: EL SISTEMA debe mostrar todos los textos visibles al usuario en español neutro, sin voseo.
- RNF-8: EL SISTEMA debe cumplir WCAG 2.1 nivel AA en los elementos de captura, consentimiento, revisión y estados de error.
- RNF-9: EL SISTEMA debe conservar el comportamiento actual de creación manual de notas cuando la IA esté desactivada o no haya consentimiento.
- RNF-10: El registro de consentimiento no debe contener más datos personales que la decisión, la fecha y la versión del aviso.

## Casos límite

- El usuario envía texto vacío o compuesto solo por espacios.
- El texto supera los 2500 puntos de código Unicode.
- El usuario pega texto que supera el límite y luego intenta revisar.
- El usuario rechaza el consentimiento y luego intenta usar la interpretación.
- El usuario cierra el diálogo de consentimiento sin aceptar ni rechazar.
- El usuario revoca el consentimiento desde el perfil mientras tiene la captura abierta o una solicitud en curso.
- El usuario cambia el consentimiento desde otro dispositivo.
- La carga de etiquetas falla, el usuario no tiene etiquetas o una etiqueta se elimina, renombra o fusiona mientras la captura está abierta.
- El modelo sugiere una etiqueta inexistente, ajena, duplicada o con un nombre parecido a una existente.
- Hay una etiqueta global y una privada con el mismo nombre normalizado.
- El modelo devuelve contenido y checklist a la vez.
- El modelo devuelve una checklist vacía, duplicada, con ítems no textuales o con suma superior a 2500.
- El modelo devuelve un título de más de 200 caracteres, un título solo de espacios, contenido de más de 2500, una fecha pasada o campos desconocidos.
- El servicio externo tarda demasiado, no responde, devuelve un error de cuota o una respuesta inválida.
- El servicio externo bloquea el contenido por políticas de seguridad.
- El texto contiene varias notas o varias intenciones mezcladas.
- El texto contiene una fecha ambigua, una fecha pasada, solo fecha, solo hora o varias fechas.
- La zona horaria del navegador falta, es inválida o cambia durante la captura.
- Hay un desfase entre el reloj del navegador y el del servidor.
- La fecha cae en un hueco o solapamiento por cambio de horario.
- El usuario cancela durante la interpretación o durante la revisión.
- El usuario intenta confirmar dos veces la misma captura o reintenta tras una respuesta perdida.
- El usuario cierra o abandona la revisión con cambios sin guardar.
- La sesión expira, la cuenta se bloquea o se deshabilita durante la captura, la revisión o el guardado.
- El usuario está en un dispositivo compartido y otro usuario usa la misma sesión de navegador.
- El texto está en otro idioma o mezcla idiomas.
- El texto contiene instrucciones maliciosas, datos personales o contenido que el proveedor bloquea.
- No hay conexión a internet o el proveedor está caído.
- La IA está desactivada globalmente.
- El usuario alcanza el límite diario.
- El usuario intenta usar una captura por voz; se deriva a la Spec 011b.

## Fuera de alcance

- Captura por voz, micrófono y transcripción; se define en la Spec 011b.
- MCP y herramientas de notas.
- Asistente conversacional.
- Búsqueda o edición de notas existentes mediante lenguaje natural.
- RAG, documentos y adjuntos.
- Notificaciones de recordatorio.
- Creación de más de una nota por captura.
- Creación automática de etiquetas.
- Ejecución de acciones por voz.
- Reordenamiento de notas.
- Almacenamiento o historial de audio.
- Dictado dentro de la app en móvil; se usa el teclado del sistema.
- Soporte de idiomas distintos al español para la interpretación.
- Recordatorios recurrentes.
- Edición por voz de una nota ya guardada.

## Criterios de finalización

- [ ] La vista de notas ofrece una captura de texto visible, accesible y ubicada antes de la lista.
- [ ] El usuario puede escribir hasta 2500 puntos de código Unicode y revisar el borrador antes de guardar.
- [ ] El borrador incluye solo campos válidos y hasta cinco etiquetas existentes del usuario.
- [ ] La nota solo se persiste cuando el usuario confirma; cancelar no guarda nada y conserva el texto.
- [ ] Una captura genera como máximo una nota, incluso ante reintentos.
- [ ] El consentimiento se solicita la primera vez, se recuerda por cuenta, se audita y se puede revocar de inmediato.
- [ ] Rechazar el consentimiento o desactivar la IA no impide la captura manual y no envía datos.
- [ ] Si falla la interpretación, el texto original queda disponible en el editor con un título provisional.
- [ ] Las fechas relativas se resuelven en el servidor con la zona del navegador; las ambiguas se dejan vacías con advertencia.
- [ ] Las fechas pasadas se aceptan con el comportamiento actual.
- [ ] El límite diario se aplica y se informa sin bloquear el modo manual.
- [ ] No se registra contenido de notas en logs y no se exponen detalles internos del proveedor.
- [ ] La interfaz es usable con teclado, lector de pantalla y entre 390 px y 2560 px.
- [ ] Los tests del backend y del frontend pasan; lint y build están en verde.

## Dudas abiertas

Ninguna. Las decisiones de consentimiento, límites, privacidad, fechas, etiquetas e idempotencia quedaron cerradas con el usuario.
