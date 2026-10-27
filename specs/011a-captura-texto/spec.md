# Spec 011a — Captura de notas en lenguaje natural: texto

Estado: implementada

## Contexto y objetivo

Memora permite crear notas mediante un formulario con título, contenido, recordatorio, etiquetas y checklist. Ese formato es preciso, pero obliga al usuario a decidir de antemano cómo estructurar la información. Muchas veces la intención surge como una frase: “mañana a las 18 comprar leche y pan, urgente”.

El objetivo de esta spec es permitir que el usuario escriba una frase y obtenga un borrador de nota editable. El borrador nunca se guarda automáticamente: el usuario siempre lo revisa antes de confirmar.

Esta spec cubre solo la captura por texto. Define además el consentimiento y la cuota compartidos que reutiliza la Spec 011b; la transcripción de audio se implementa y verifica en 011b. MCP, búsqueda asistida, documentos, RAG y el asistente conversacional quedan fuera de alcance.

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
- **Etiqueta existente:** etiqueta global o privada visible para el usuario y que puede asociarse a la nota.
- **Consentimiento:** autorización explícita y versionada del usuario para enviar texto, audio, zona horaria y etiquetas necesarias a un servicio externo de IA. Un mismo consentimiento cubre texto y audio.
- **Proveedor externo de IA:** servicio configurado para interpretar texto o transcribir audio. En esta fase se usa Groq.
- **Modo manual:** creación de la nota completando el editor sin interpretación ni transcripción.
- **Solicitud fuera de alcance:** texto que no describe una nota, recordatorio, tarea o checklist, como una pregunta general, una traducción, un cálculo o una petición de código.
- **Operación de IA completada:** interpretación o transcripción cuya respuesta el proveedor devuelve y el sistema logra parsear y validar. Incluye las interpretaciones con varias intenciones. No cuentan los errores, las cancelaciones, las respuestas inválidas ni las transcripciones vacías.
- **Fecha de recordatorio:** expresión que permite resolver una fecha en la zona horaria indicada. Si no incluye hora, se usa la medianoche local.
- **Día de cuota:** período diario calculado con la zona horaria del servidor.

## Requisitos funcionales

### Acceso, consentimiento y privacidad

- RF-1: EL SISTEMA debe ofrecer, en la vista de notas, una acción principal de captura en lenguaje natural ubicada antes de la lista y visible sin desplazamiento inicial en viewports de 390×844 px y 1280×800 px.
- RF-2: CUANDO el usuario abra la captura, EL SISTEMA debe mostrar un campo de texto libre, un contador de puntos de código Unicode y las acciones para revisar o pasar al modo manual.
- RF-3: EL SISTEMA debe aceptar capturas de 1 a 2500 puntos de código Unicode después de recortar espacios externos; SI el texto queda vacío o supera ese límite, ENTONCES EL SISTEMA debe bloquear la revisión, mostrar la causa y permitir editarlo hasta que sea válido.
- RF-4: CUANDO el usuario realice la primera interpretación con la IA activa y su consentimiento esté sin decidir, EL SISTEMA debe solicitar un consentimiento explícito único que cubra texto y audio; SI el usuario acepta, ENTONCES debe registrar el consentimiento y continuar; SI rechaza, ENTONCES debe registrar el rechazo y abrir el modo manual; SI cierra o cancela el diálogo sin aceptar ni rechazar, ENTONCES no debe registrar una decisión, debe abrir el modo manual para ese intento y debe volver a solicitar el consentimiento en la siguiente interpretación.
- RF-5: SI el usuario rechaza el consentimiento, ENTONCES EL SISTEMA debe permitir la captura manual y no enviar texto ni audio a ningún servicio externo de IA.
- RF-6: EL SISTEMA debe recordar la decisión de consentimiento por cuenta en el servidor, de modo que se comparta entre dispositivos; no debe volver a solicitarla mientras la versión del aviso siga vigente y el usuario no la cambie; SI cambia la versión del aviso y el último estado era `GRANTED`, ENTONCES debe solicitar un nuevo consentimiento una vez; SI el último estado era `DENIED` o `REVOKED`, ENTONCES debe mantener el modo manual y no volver a preguntar automáticamente.
- RF-7: EL SISTEMA debe permitir al usuario cambiar su decisión de consentimiento desde su perfil; SI la revoca, ENTONCES EL SISTEMA debe desactivar la IA de inmediato, descartar cualquier respuesta de IA en curso y no contabilizarla como operación completada.
- RF-8: EL SISTEMA debe registrar un historial de consentimiento con la decisión (`GRANTED`, `DENIED` o `REVOKED`), la fecha y la versión del aviso; cerrar el diálogo sin aceptar ni rechazar no debe generar un evento.
- RF-9: SI la IA está desactivada, el usuario rechazó el consentimiento o lo revocó, ENTONCES la captura debe abrir el editor manual, ocultar o deshabilitar las acciones de IA con una explicación y mantener disponible el guardado manual; la IA solo puede habilitarse desde el perfil.
- RF-10: EL SISTEMA debe mostrar un aviso de privacidad versionado que nombre a Groq como proveedor externo, indique que el texto, el audio, la zona horaria y las etiquetas necesarias se envían a ese servicio y aclare que el modo manual no envía datos.
- RF-11: EL SISTEMA no debe registrar en logs el texto de la captura, el borrador, el contenido de la nota, las etiquetas, la zona horaria, el identificador de cuenta ni respuestas del proveedor; los logs solo pueden contener la operación, el estado, la latencia y un identificador de correlación.

### Captura por texto

- RF-12: CUANDO el usuario envíe un texto no vacío dentro del límite, EL SISTEMA debe generar un borrador de una única nota y no debe persistirla.
- RF-13: EL SISTEMA debe generar el título del borrador interpretado y, según la interpretación, incluir contenido o checklist, recordatorio y etiquetas existentes sugeridas; no debe incluir estado fijado ni estado archivado.
- RF-14: EL SISTEMA debe sugerir como máximo cinco etiquetas existentes visibles para el usuario y descartar cualquier etiqueta inexistente, ajena o inventada; SI hay una etiqueta global y otra privada con el mismo nombre normalizado, ENTONCES EL SISTEMA debe conservar la global. La comparación de nombres debe ignorar mayúsculas, colapsar espacios y usar normalización Unicode NFC.
- RF-15: SI no se pueden cargar todas las etiquetas visibles, ENTONCES EL SISTEMA no debe llamar al proveedor, debe continuar en modo manual, avisar y no sugerir etiquetas.
- RF-16: EL SISTEMA debe validar y normalizar el borrador con límites en puntos de código Unicode: título generado de 1 a 200, contenido de 0 a 2500, checklist con al menos un ítem y suma de los textos de los ítems, sin contar separadores, de hasta 2500.
- RF-17: SI el modelo devuelve contenido y una checklist válida a la vez, ENTONCES EL SISTEMA debe conservar la checklist, dejar el contenido vacío y respetar la regla de las notas checklist.
- RF-18: SI el modelo devuelve contenido de más de 2500 puntos de código o una checklist inválida, ENTONCES EL SISTEMA debe recortar el contenido al límite, descartar solo la checklist inválida, conservar el contenido si es válido y mostrar una advertencia.
- RF-19: EL SISTEMA debe generar el título del borrador interpretado según el tipo detectado y la fecha/hora de inicio de la solicitud: “Recordatorio interpretado por IA · dd/MM/yyyy HH:mm”, “Lista generada por IA · dd/MM/yyyy HH:mm” o “Contenido generado por IA · dd/MM/yyyy HH:mm”; si hay recordatorio y checklist, prevalece recordatorio. La fecha usa la zona IANA del navegador y, si falta o es inválida, la del servidor.
- RF-20: CUANDO exista un borrador, EL SISTEMA debe abrir el editor con los campos precargados y permitir modificarlos; la nota solo debe guardarse cuando el usuario confirme.
- RF-21: SI el usuario cancela la interpretación, ENTONCES EL SISTEMA debe volver a la captura conservando el texto, descartar cualquier respuesta tardía y no contabilizar la operación; SI cancela la revisión, ENTONCES EL SISTEMA debe descartar el borrador pero conservar el texto original.
- RF-22: SI la interpretación falla, supera el tiempo de espera, no hay cuota disponible o la respuesta es inválida, ENTONCES EL SISTEMA debe abrir el editor manual con el texto original como contenido y los primeros 60 puntos de código como título provisional, sin perder la entrada y sin contar la operación. Un 429 del proveedor o un bloqueo de política del proveedor se considera fallo del proveedor, no cuota del usuario.
- RF-23: SI la interpretación válida indica varias notas o varias intenciones, ENTONCES EL SISTEMA no debe dividir el texto ni inventar datos; debe abrir el editor manual con el texto completo y una advertencia para que el usuario lo estructure. La detección se basa en la señal del modelo y se verifica con respuestas de prueba controladas.
- RF-24: CUANDO el texto incluya una fecha, EL SISTEMA debe resolverla en el servidor usando la zona horaria IANA enviada por el navegador y el reloj del servidor; SI la fecha no incluye hora, ENTONCES debe usar las 00:00 locales; SI la fecha es ambigua, contiene solo hora, contiene varias fechas, la zona es ausente o inválida o el horario cae en un hueco o solapamiento por cambio de horario, ENTONCES EL SISTEMA debe dejar el recordatorio vacío y advertirlo.
- RF-25: EL SISTEMA debe aceptar las fechas pasadas, con o sin hora, con el mismo comportamiento actual de los recordatorios, y no debe rechazarlas por estar vencidas.
- RF-26: MIENTRAS la interpretación esté en curso, EL SISTEMA debe mostrar un estado de carga, impedir envíos duplicados y permitir cancelar con un botón y con la tecla Escape; al cancelar debe descartar la respuesta tardía y no contar la operación.
- RF-27: EL SISTEMA debe conservar el texto original recortado durante la revisión y permitir consultarlo completo, incluso después de editar el borrador o de aplicar el fallback.
- RF-28: EL SISTEMA debe evitar que una misma confirmación cree más de una nota: debe bloquear el botón de guardado mientras se procesa y el servidor debe devolver la nota existente cuando reciba la misma clave de idempotencia, el mismo usuario y los mismos datos de la nota; SI la clave se reutiliza con datos distintos, ENTONCES debe rechazar la solicitud.
- RF-29: EL SISTEMA debe permitir un máximo de 50 operaciones de IA completadas por usuario y por día, contando interpretaciones y transcripciones, con reinicio a la medianoche de la zona horaria del servidor; SI se alcanza el límite, ENTONCES EL SISTEMA debe informar y ofrecer el modo manual. Solo cuentan las respuestas parseadas y validadas; no cuentan los errores, las cancelaciones, las respuestas inválidas ni las transcripciones vacías.
- RF-30: EL SISTEMA debe rechazar la interpretación y la creación de notas cuando no haya una sesión de USER activa y no debe permitir que ADMIN cree notas.
- RF-34: SI el texto no describe una nota, recordatorio, tarea o checklist, ENTONCES EL SISTEMA no debe responderlo, explicarlo, traducirlo, calcularlo ni generar código; debe informar que está fuera de alcance, conservar el texto, ofrecer el modo manual y no consumir cuota ni devolver contenido generado por el proveedor.
- RF-35: CUANDO el usuario haga click fuera del modal de captura, EL SISTEMA debe cerrarlo; SI hay texto escrito, ENTONCES debe pedir confirmación antes de descartarlo.

### Interfaz y accesibilidad

- RF-31: EL SISTEMA debe permitir toda la captura y revisión con teclado y lector de pantalla, con foco visible y anuncios de los estados de interpretación, error, consentimiento, revisión y guardado.
- RF-32: EL SISTEMA debe ser usable sin desbordamiento horizontal entre 390 px y 2560 px, con prioridad móvil; 320 px y el zoom de 200 % se verifican como casos de regresión no bloqueantes.
- RF-33: EL SISTEMA debe respetar `prefers-reduced-motion` en las transiciones de la captura y la revisión, sin impedir la comprensión ni la operación.

## Requisitos no funcionales

- RNF-1: La interpretación de texto debe responder con un percentil 95 menor o igual a 8 segundos para capturas de hasta 2500 puntos de código, con una conexión estable de al menos 10 Mbps y el proveedor disponible; la medición se realiza en el servidor desde la recepción de la solicitud hasta el envío de la respuesta, con 20 solicitudes consecutivas documentadas como benchmark manual y no como prueba de CI.
- RNF-2: EL SISTEMA debe cancelar la solicitud y aplicar el fallback si el proveedor no responde en 20 segundos.
- RNF-3: EL SISTEMA debe imponer el límite diario definido y manejar la falta de cuota sin bloquear el modo manual.
- RNF-4: EL SISTEMA no debe exponer claves, credenciales ni detalles internos del proveedor de IA en errores, logs ni respuestas; los errores 429 y los bloqueos de contenido del proveedor se presentan como fallo genérico.
- RNF-5: EL SISTEMA debe tratar el texto, el borrador, las etiquetas y la zona horaria como datos personales: no registrar contenido, no enviar más información de la necesaria y limitar el envío al texto, la zona horaria y las etiquetas necesarias para la sugerencia.
- RNF-6: La validación del borrador, la resolución de fechas, la autorización y la idempotencia deben ejecutarse en el servidor; el cliente no resuelve fechas ni aplica reglas de negocio, y solo envía el texto, la zona horaria, la acción de consentimiento y la clave de idempotencia, y presenta el resultado.
- RNF-7: EL SISTEMA debe mostrar todos los textos visibles al usuario en español neutro, sin voseo.
- RNF-8: EL SISTEMA debe cumplir WCAG 2.1 nivel AA en los elementos de captura, consentimiento, revisión y estados de error; la verificación se realiza con una auditoría manual de teclado, foco, contraste, etiquetas, anuncios y movimiento reducido.
- RNF-9: EL SISTEMA debe conservar el flujo de creación manual de notas de la Spec 005 cuando la IA esté desactivada, el usuario haya rechazado o revocado el consentimiento o no haya cuota.
- RNF-10: El registro de consentimiento debe asociarse a la cuenta mediante su identificador técnico y no debe contener más datos personales que la decisión, la fecha, la versión del aviso y ese identificador; se conserva mientras exista la cuenta, se elimina con ella y no es visible para ADMIN.

## Casos límite

- El usuario envía texto vacío, compuesto solo por espacios o por caracteres que quedan vacíos tras el recorte.
- El texto supera los 2500 puntos de código Unicode.
- El usuario pega texto que supera el límite y luego intenta revisar.
- El usuario rechaza el consentimiento y luego intenta usar la interpretación.
- El usuario cierra el diálogo de consentimiento sin aceptar ni rechazar.
- La versión del aviso cambia mientras el usuario tiene un consentimiento vigente.
- El usuario revoca el consentimiento desde el perfil mientras tiene la captura abierta o una solicitud en curso.
- El usuario cambia el consentimiento desde otro dispositivo.
- El usuario cambia la zona horaria del navegador para intentar reiniciar la cuota.
- La carga de etiquetas falla, el usuario no tiene etiquetas o una etiqueta se elimina, renombra o fusiona mientras la captura está abierta.
- El modelo sugiere una etiqueta inexistente, ajena, duplicada o con un nombre parecido a una existente.
- Hay una etiqueta global y una privada con el mismo nombre normalizado.
- El modelo devuelve contenido y una checklist válida o inválida a la vez.
- La checklist está vacía, tiene ítems duplicados, ítems no textuales o suma más de 2500 puntos de código.
- El modelo devuelve contenido de más de 2500 puntos, una fecha pasada o campos desconocidos.
- El modelo devuelve varias intenciones y, a la vez, un borrador con campos válidos.
- El usuario confirma dos veces con la misma clave y los mismos datos; también con la misma clave y datos distintos.
- El servicio externo tarda demasiado, no responde, devuelve un error de cuota o una respuesta inválida.
- El servicio externo bloquea el contenido por políticas de seguridad.
- El texto contiene varias notas o varias intenciones mezcladas.
- El texto contiene una fecha ambigua, una fecha pasada, solo hora o varias fechas.
- El texto contiene expresiones relativas como “este viernes a las 11”, “el próximo viernes a las 11”, “mañana a las 18”, “en 3 días a las 9”, “el viernes” o “quincena de noviembre”.
- El usuario escribe “Recordarme que este viernes a las 11 debo ir a Mercadona” o “recordarme que en quincena de noviembre es santo de jorge” y hoy es lunes.
- La zona horaria del navegador falta, es inválida o cambia durante la captura.
- Hay un desfase entre el reloj del navegador y el del servidor.
- La fecha cae en un hueco o solapamiento por cambio de horario.
- El usuario cancela durante la interpretación o durante la revisión, y el proveedor responde después.
- El usuario intenta confirmar dos veces la misma captura o reintenta tras una respuesta perdida.
- El usuario cierra o abandona la revisión con cambios sin guardar.
- La sesión expira, la cuenta se bloquea o se deshabilita durante la captura, la revisión o el guardado.
- El usuario está en un dispositivo compartido y otro usuario usa la misma sesión de navegador.
- El texto está en otro idioma o mezcla idiomas.
- El texto contiene instrucciones maliciosas, datos personales o contenido que el proveedor bloquea.
- El texto contiene emojis o grafemas compuestos en los límites de 60, 200 o 2500 puntos de código.
- No hay conexión a internet o el proveedor está caído.
- La IA está desactivada globalmente.
- El usuario alcanza el límite diario.
- El usuario intenta usar una captura por voz; se deriva a la Spec 011b.
- El borrador corresponde a un recordatorio, una checklist o contenido general; el título debe reflejar el tipo y la fecha de solicitud.
- El usuario pide código, una pregunta general, una traducción, un cálculo o una explicación en lugar de una nota.
- El usuario hace click fuera del modal de captura con texto escrito o con el campo vacío.

## Fuera de alcance

- La implementación de la transcripción de audio; se define en la Spec 011b. Esta spec solo define el consentimiento y la cuota compartidos.
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

- [x] La vista de notas ofrece una captura de texto visible, accesible y ubicada antes de la lista en 390×844 y 1280×800.
- [x] El usuario puede escribir entre 1 y 2500 puntos de código Unicode y revisar el borrador antes de guardar.
- [x] El borrador incluye solo campos válidos y hasta cinco etiquetas existentes visibles para el usuario.
- [x] La nota solo se persiste cuando el usuario confirma; cancelar no guarda nada y conserva el texto.
- [x] Una captura genera como máximo una nota, incluso ante reintentos con la misma clave y los mismos datos.
- [x] El consentimiento se solicita en la primera interpretación, se recuerda por cuenta, se audita, se renueva al cambiar la versión y se puede revocar de inmediato.
- [x] Cerrar el diálogo sin decidir no registra consentimiento ni rechazo, abre el modo manual para ese intento y vuelve a preguntar en la siguiente interpretación.
- [x] Rechazar o revocar el consentimiento no impide la captura manual y no envía datos.
- [x] Si falla la interpretación, el texto original queda disponible en el editor con un título provisional.
- [x] El título del borrador interpretado indica el tipo (“Recordatorio/Lista/Contenido”) y la fecha/hora de inicio de la solicitud, con recordatorio como prioridad.
- [x] Las fechas se resuelven en el servidor con la zona del navegador; las de solo fecha usan las 00:00 locales y las de solo hora o ambiguas se dejan vacías con advertencia.
- [x] Las fechas pasadas, con o sin hora, se aceptan con el comportamiento actual.
- [x] El límite diario se aplica con la zona del servidor y se informa sin bloquear el modo manual.
- [x] Los errores 429 y los bloqueos del proveedor no consumen cuota y se muestran sin detalles internos.
- [x] No se registra contenido, etiquetas, zona ni identificador de cuenta en logs.
- [x] El historial de consentimiento se elimina con la cuenta y no es visible para ADMIN.
- [x] La interfaz es usable con teclado, lector de pantalla y entre 390 px y 2560 px.
- [x] Las solicitudes de código, preguntas generales, traducciones y cálculos no se responden ni se convierten en contenido de IA; se informa, se conserva el texto y no consumen cuota.
- [x] Hacer click fuera del modal cierra la captura; con texto escrito pide confirmación antes de descartarlo.
- [x] Las fechas relativas como “este viernes a las 11”, “el viernes”, “mañana”, “en 3 días” o “quincena de noviembre” se resuelven en el servidor; sin hora usan las 00:00 locales.
- [x] El benchmark manual de RNF-1 queda documentado y los tests del backend y del frontend pasan; lint y build están en verde.

## Dudas abiertas

Ninguna. Las decisiones de unidades, consentimiento, cancelación, fechas, cuota, idempotencia, privacidad y rendimiento quedaron cerradas con el usuario.
