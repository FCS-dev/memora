# Spec 011b — Captura de notas por voz

> Cancelada: Groq Whisper se descartó por costo. No hay micrófono propio, audio, transcripción externa ni backend de voz. En móvil se usa el dictado nativo del teclado dentro de la captura de la Spec 011a. Se conserva el documento como historial.

Estado: cancelada

## Contexto y objetivo

La Spec 011a define la captura de notas en lenguaje natural por texto, el consentimiento, el borrador y la revisión antes de guardar. Esta spec agrega la voz como forma de llenar ese texto: en escritorio mediante el micrófono de la app y en móvil mediante el dictado nativo del teclado del sistema.

La voz no crea, guarda, busca, edita, elimina ni reordena notas. Solo produce texto para que el usuario lo revise y continúe con el flujo de la Spec 011a.

La interpretación, el título generado, la resolución de fechas y el bloqueo de contenido fuera de alcance se rigen por la Spec 011a. Esta spec no responde preguntas ni genera contenido a partir del audio.

## Usuarios

- **Usuario autenticado (USER):** captura notas con voz desde escritorio o móvil.
- **Administrador (ADMIN):** no gestiona notas; no participa en este flujo.

## Historias de usuario

- HU-1. Como USER de escritorio, quiero dictar una frase con el micrófono de la app para capturar ideas sin escribir.
- HU-2. Como USER móvil, quiero usar el dictado de mi teclado para escribir la frase sin que la app me pida permisos adicionales.
- HU-3. Como USER, quiero revisar y corregir la transcripción antes de usarla para crear una nota.
- HU-4. Como USER, quiero que si la transcripción falla no se pierda la grabación y pueda reintentar.
- HU-5. Como USER, quiero que la voz no ejecute acciones por sí sola.
- HU-6. Como USER, quiero saber cuándo se envía audio a un servicio externo y poder revocar el consentimiento.

## Definiciones

- **Dictado nativo:** función de voz del teclado del sistema operativo; no forma parte de Memora.
- **Micrófono propio:** control de la app que graba audio en el navegador para transcribirlo.
- **Grabación:** audio capturado por el micrófono propio mientras el usuario mantiene activa la captura por voz.
- **Transcripción:** conversión del audio grabado a texto.
- **Consentimiento:** el definido en la Spec 011a; un mismo consentimiento cubre texto y audio.
- **Operación de IA completada:** transcripción cuya respuesta el proveedor devuelve, el sistema logra parsear y el texto resultante no está vacío. Las solicitudes fallidas, canceladas, inválidas, rechazadas o sin voz reconocible no cuentan.
- **Escritorio:** dispositivo con puntero principal fino, como mouse o trackpad, y ancho de ventana mayor o igual a 768 px.
- **Móvil o táctil:** cualquier dispositivo que no cumpla la definición de escritorio.

## Requisitos funcionales

### Disponibilidad, consentimiento y privacidad

- RF-1: EL SISTEMA debe mostrar el micrófono propio únicamente cuando el dispositivo se clasifique como escritorio según la definición de esta spec; en el resto de los casos debe usar el dictado nativo del teclado.
- RF-2: EL SISTEMA debe reutilizar el consentimiento único definido en la Spec 011a; SI el consentimiento está sin decidir, ENTONCES debe solicitar el consentimiento al intentar usar el micrófono; SI el usuario rechazó o revocó el consentimiento, ENTONCES el micrófono debe estar oculto o deshabilitado y la captura debe ofrecer el modo manual.
- RF-3: EL SISTEMA debe mostrar el aviso de privacidad versionado de la Spec 011a, que nombre a Groq, indique que el audio, el texto, la zona horaria y las etiquetas necesarias se envían a ese servicio y aclare que la grabación no se persiste, se conserva solo en memoria para reintentar y se descarta al terminar, y que el modo manual no envía datos.
- RF-4: SI el permiso de micrófono se deniega, no hay micrófono disponible, el navegador no soporta la grabación o el contexto no es seguro, ENTONCES EL SISTEMA debe informar la situación y ofrecer el ingreso por teclado.
- RF-5: EL SISTEMA no debe registrar en logs el audio, la transcripción, las etiquetas, la zona horaria, el identificador de cuenta ni respuestas del proveedor; los logs solo pueden contener la operación, el estado, la latencia y un identificador de correlación, conforme a la Spec 011a.

### Grabación y transcripción

- RF-6: CUANDO el usuario inicie la grabación, EL SISTEMA debe grabar audio durante un máximo de 60 segundos y permitir detenerla manualmente.
- RF-7: SI la grabación alcanza los 60 segundos, ENTONCES EL SISTEMA debe detenerla automáticamente y transcribir lo grabado.
- RF-8: CUANDO termine la transcripción, EL SISTEMA debe insertar el texto en la posición del cursor del campo de captura, reemplazando la selección si existe, o al final si el campo no tiene foco; no debe enviarlo automáticamente.
- RF-9: SI la transcripción supera los 2500 puntos de código Unicode, ENTONCES EL SISTEMA debe insertarla, bloquear la revisión y advertir que el usuario debe reducirla.
- RF-10: SI la transcripción falla, supera el tiempo de espera, no hay cuota o la respuesta es inválida, ENTONCES EL SISTEMA debe conservar la grabación en memoria del navegador para reintentar, sin persistirla, ofrecer reintentar o continuar en modo manual y no contar la operación. Un error 429 o un bloqueo de contenido del proveedor se considera fallo del proveedor, no cuota del usuario.
- RF-11: EL SISTEMA debe descartar la grabación de la memoria del navegador cuando la transcripción finalice correctamente, cuando el usuario cancele, cuando abandone la captura o cuando revoque el consentimiento.
- RF-12: SI el usuario cancela durante la grabación, ENTONCES EL SISTEMA debe detenerla y descartar el audio; SI cancela durante la transcripción, ENTONCES EL SISTEMA debe abortar la solicitud en la interfaz, descartar cualquier respuesta tardía, descartar el audio pendiente, no contar la operación y volver a la captura conservando el texto existente.
- RF-13: SI la transcripción está vacía o no se reconoce voz, ENTONCES EL SISTEMA debe informar, conservar la grabación en memoria para reintentar o regrabar, y no insertar texto.
- RF-14: SI el usuario revoca el consentimiento mientras graba o transcribe, ENTONCES EL SISTEMA debe detener la operación, descartar el audio, descartar cualquier respuesta tardía y no contar la operación.
- RF-15: EL SISTEMA no debe almacenar audio después de obtener la transcripción ni conservar historial de grabaciones.
- RF-16: En móvil o en dispositivos táctiles, EL SISTEMA debe aceptar el texto dictado por el teclado del sistema y no debe mostrar el micrófono propio.
- RF-17: La voz no debe crear, guardar, buscar, editar, eliminar ni reordenar notas; solo debe llenar el texto de la captura para su revisión.
- RF-18: MIENTRAS la transcripción esté en curso, EL SISTEMA debe mostrar un estado de carga, impedir grabaciones o envíos duplicados y permitir cancelar con un botón y con la tecla Escape; al cancelar debe descartar la respuesta tardía y no contar la operación.
- RF-19: EL SISTEMA debe contar cada transcripción válida y con texto no vacío como una operación de IA para el límite diario definido en la Spec 011a; el reinicio diario usa la zona del servidor; los errores, cancelaciones, respuestas inválidas y transcripciones vacías no cuentan; la interpretación posterior del texto cuenta como otra operación.
- RF-20: EL SISTEMA debe rechazar la captura por voz cuando no haya una sesión de USER activa y no debe permitir que ADMIN use el micrófono.

### Integración con 011a y cierre

- RF-24: CUANDO el usuario haga click fuera del modal de captura, EL SISTEMA debe aplicar el cierre de RF-35 de la Spec 011a; SI hay texto o audio pendiente, ENTONCES debe pedir confirmación antes de descartarlo; al confirmar debe detener la grabación, descartar el audio y cualquier respuesta tardía; MIENTRAS grabe o transcriba, el click fuera no debe cerrar el modal y la acción explícita debe ser cancelar.
- RF-25: La transcripción no debe interpretar, responder, explicar, traducir, calcular ni generar código; solo debe llenar el texto de la captura. La interpretación posterior se rige por la Spec 011a, incluido el rechazo de contenido fuera de alcance, el título generado y la resolución de fechas.

### Interfaz y accesibilidad

- RF-21: EL SISTEMA debe permitir iniciar, detener y cancelar la grabación con teclado, mostrar foco visible y anunciar al lector de pantalla los estados de grabación, transcripción, error y cancelación.
- RF-22: EL SISTEMA debe ser usable sin desbordamiento horizontal entre 390 px y 2560 px, con prioridad móvil; 320 px y el zoom de 200 % se verifican como casos de regresión no bloqueantes.
- RF-23: EL SISTEMA debe respetar `prefers-reduced-motion` en las transiciones y en el indicador de grabación, sin impedir la comprensión ni la operación.

## Requisitos no funcionales

- RNF-1: La transcripción debe responder con un percentil 95 menor o igual a 20 segundos para grabaciones de hasta 60 segundos, con una conexión estable de al menos 10 Mbps y el proveedor disponible; la medición se realiza en el servidor desde la recepción del audio hasta el envío del texto, con 20 grabaciones consecutivas documentadas como benchmark manual y no como prueba de CI.
- RNF-2: EL SISTEMA debe cancelar la solicitud, descartar cualquier respuesta tardía, conservar la grabación en memoria para reintentar y no contar la operación si el proveedor no responde en 30 segundos.
- RNF-3: EL SISTEMA debe aplicar el límite diario definido en la Spec 011a y manejar la falta de cuota sin bloquear el modo manual.
- RNF-4: EL SISTEMA no debe exponer claves, credenciales ni detalles internos del proveedor de IA en errores, logs ni respuestas; los errores 429 y los bloqueos de contenido del proveedor se presentan como fallo genérico y no consumen cuota.
- RNF-5: EL SISTEMA debe tratar el audio como dato personal: no persistirlo, no registrar su contenido y enviar solo el audio necesario para la transcripción.
- RNF-6: La autorización, el límite diario y la validación del audio deben ejecutarse en el servidor; el cliente solo captura el audio y presenta el resultado.
- RNF-7: EL SISTEMA debe mostrar todos los textos visibles al usuario en español neutro, sin voseo.
- RNF-8: EL SISTEMA debe cumplir WCAG 2.1 nivel AA en los controles de grabación, consentimiento y estados de error; la verificación se realiza con una auditoría manual de teclado, foco, contraste, etiquetas, anuncios y movimiento reducido.
- RNF-9: EL SISTEMA debe conservar el flujo de creación manual de notas de la Spec 011a cuando la voz no esté disponible, la IA esté desactivada, el usuario haya rechazado o revocado el consentimiento o no haya cuota.

## Casos límite

- El permiso de micrófono se deniega de forma temporal o permanente.
- No hay micrófono, el dispositivo se desconecta a mitad de la grabación o otro proceso lo ocupa.
- El navegador no soporta grabación, no soporta el formato elegido o el contexto no es seguro.
- El usuario graba menos de un segundo, en silencio o con ruido sin voz reconocible.
- La transcripción devuelve una cadena vacía.
- La grabación alcanza los 60 segundos.
- La transcripción supera los 2500 puntos de código Unicode.
- La transcripción falla por timeout, cuota, error del proveedor o respuesta inválida.
- El usuario reintenta después de un fallo y la grabación sigue en memoria.
- El usuario cancela durante la grabación o durante la transcripción.
- El usuario abandona la captura, recarga la página o cierra la pestaña durante la grabación o transcripción.
- El usuario revoca el consentimiento durante la grabación o transcripción.
- El usuario cambia el consentimiento desde otro dispositivo.
- Hay varias pestañas o sesiones simultáneas con micrófono.
- El usuario está en un dispositivo híbrido, tableta con puntero fino, portátil táctil o móvil con teclado externo.
- El usuario usa el dictado nativo en móvil.
- El usuario usa el micrófono propio en escritorio.
- El audio tiene un formato, MIME o tamaño no aceptado por el proveedor.
- El proveedor bloquea el audio por políticas de seguridad.
- El usuario alcanza el límite diario.
- No hay conexión a internet o el proveedor está caído.
- La sesión expira, la cuenta se bloquea o se deshabilita durante la grabación o transcripción.
- El usuario está en un dispositivo compartido y otro usuario usa la misma sesión de navegador.
- El usuario intenta ejecutar una acción de nota mediante la voz.
- El usuario hace click fuera del modal con texto o audio pendiente, o mientras graba o transcribe.
- El audio contiene una pregunta, una traducción, un cálculo o una petición de código.
- La interpretación posterior genera un título de recordatorio, lista o contenido.
- El consentimiento está sin decidir, se cierra el diálogo o cambia la versión del aviso.
- El usuario cambia la zona horaria del navegador para intentar reiniciar la cuota; la cuota no cambia.
- El proveedor devuelve 429 o bloquea el audio por políticas; no se consume cuota.
- El usuario cancela y el proveedor responde después; la respuesta se descarta.
- Varias pestañas graban o transcriben a la vez; se impiden envíos duplicados y se respeta la cuota.
- La sesión expira, la cuenta se bloquea o se deshabilita durante la grabación o transcripción.

## Fuera de alcance

- Captura por texto, interpretación, borrador y revisión; se definen en la Spec 011a.
- MCP y herramientas de notas.
- Asistente conversacional.
- Búsqueda o edición de notas existentes mediante voz.
- RAG, documentos y adjuntos.
- Notificaciones de recordatorio.
- Creación de más de una nota por captura.
- Creación automática de etiquetas.
- Ejecución de acciones por voz.
- Reordenamiento de notas.
- Almacenamiento o historial de audio.
- Dictado dentro de la app en móvil; se usa el teclado del sistema.
- Soporte de idiomas distintos al español para la transcripción.
- Recordatorios recurrentes.
- Edición por voz de una nota ya guardada.

## Criterios de finalización

- [ ] En escritorio se muestra el micrófono propio; en móvil y dispositivos táctiles se usa el dictado nativo y no se muestra el micrófono de la app.
- [ ] El micrófono se habilita con consentimiento vigente; con `NOT_SET` se solicita consentimiento; con rechazo o revocación se ofrece el modo manual y la IA se habilita desde el perfil.
- [ ] Un cambio de versión del aviso exige un nuevo consentimiento una vez.
- [ ] Solo las transcripciones válidas con texto no vacío consumen cuota; errores, cancelaciones, respuestas inválidas y transcripciones vacías no cuentan.
- [ ] Se puede grabar hasta 60 segundos, detener manualmente o por límite, y transcribir el audio.
- [ ] La transcripción se inserta en el cursor o al final, sin envío automático, y se puede editar.
- [ ] Si la transcripción supera 2500 puntos de código Unicode, se advierte y se bloquea la revisión hasta reducirla.
- [ ] Si falla la transcripción, la grabación se conserva en memoria para reintentar y no se persiste.
- [ ] La grabación se descarta al transcribir, cancelar, abandonar la captura o revocar el consentimiento.
- [ ] La voz no ejecuta acciones distintas de llenar el texto.
- [ ] Los estados de grabación, transcripción, error y cancelación son accesibles por teclado y lector de pantalla.
- [ ] No se registra audio, transcripción, etiquetas, zona ni identificador de cuenta en logs, y no se exponen detalles internos del proveedor.
- [ ] El límite diario se aplica con la zona del servidor y se informa sin bloquear el modo manual.
- [ ] La interfaz es usable entre 390 px y 2560 px; 320 px y zoom 200 % se verifican como regresión no bloqueante.
- [ ] El benchmark manual de RNF-1 queda documentado.
- [ ] Hacer click fuera del modal pide confirmación si hay texto o audio; al confirmar se detiene la grabación y se descarta el audio.
- [ ] La transcripción no responde preguntas ni genera código; la interpretación posterior aplica el alcance, el título y las fechas de la Spec 011a.
- [ ] Los tests del backend y del frontend pasan; lint y build están en verde.

## Dudas abiertas

Ninguna. Las decisiones de disponibilidad, consentimiento, retención temporal, reintento, cuota, logs, cierre del modal y límites quedaron cerradas con el usuario y alineadas con la Spec 011a.
