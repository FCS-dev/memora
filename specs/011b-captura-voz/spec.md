# Spec 011b — Captura de notas por voz

Estado: aprobada

## Contexto y objetivo

La Spec 011a define la captura de notas en lenguaje natural por texto, el consentimiento, el borrador y la revisión antes de guardar. Esta spec agrega la voz como forma de llenar ese texto: en escritorio mediante el micrófono de la app y en móvil mediante el dictado nativo del teclado del sistema.

La voz no crea, guarda, busca, edita, elimina ni reordena notas. Solo produce texto para que el usuario lo revise y continúe con el flujo de la Spec 011a.

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
- **Operación de IA completada:** transcripción que termina correctamente. Las solicitudes fallidas, canceladas o rechazadas no cuentan.
- **Escritorio:** dispositivo con puntero principal fino, como mouse o trackpad, y ancho de ventana mayor o igual a 768 px.
- **Móvil o táctil:** cualquier dispositivo que no cumpla la definición de escritorio.

## Requisitos funcionales

### Disponibilidad, consentimiento y privacidad

- RF-1: EL SISTEMA debe mostrar el micrófono propio únicamente cuando el dispositivo se clasifique como escritorio según la definición de esta spec; en el resto de los casos debe usar el dictado nativo del teclado.
- RF-2: EL SISTEMA debe reutilizar el consentimiento único definido en la Spec 011a; SI no hay consentimiento, ENTONCES el micrófono debe estar oculto o deshabilitado y la captura debe ofrecer el modo manual.
- RF-3: EL SISTEMA debe mostrar un aviso de privacidad que nombre a Groq, indique que el audio se envía a ese servicio y aclare que no se conserva la grabación.
- RF-4: SI el permiso de micrófono se deniega, no hay micrófono disponible, el navegador no soporta la grabación o el contexto no es seguro, ENTONCES EL SISTEMA debe informar la situación y ofrecer el ingreso por teclado.
- RF-5: EL SISTEMA no debe registrar en logs el audio, la transcripción ni respuestas completas del proveedor.

### Grabación y transcripción

- RF-6: CUANDO el usuario inicie la grabación, EL SISTEMA debe grabar audio durante un máximo de 60 segundos y permitir detenerla manualmente.
- RF-7: SI la grabación alcanza los 60 segundos, ENTONCES EL SISTEMA debe detenerla automáticamente y transcribir lo grabado.
- RF-8: CUANDO termine la transcripción, EL SISTEMA debe insertar el texto en la posición del cursor del campo de captura, reemplazando la selección si existe, o al final si el campo no tiene foco; no debe enviarlo automáticamente.
- RF-9: SI la transcripción supera los 2500 puntos de código Unicode, ENTONCES EL SISTEMA debe insertarla, bloquear la revisión y advertir que el usuario debe reducirla.
- RF-10: SI la transcripción falla, supera el tiempo de espera, no hay cuota o la respuesta es inválida, ENTONCES EL SISTEMA debe conservar la grabación en memoria del navegador para reintentar, sin persistirla, y ofrecer reintentar o continuar en modo manual.
- RF-11: EL SISTEMA debe descartar la grabación de la memoria del navegador cuando la transcripción finalice correctamente, cuando el usuario cancele, cuando abandone la captura o cuando revoque el consentimiento.
- RF-12: SI el usuario cancela durante la grabación, ENTONCES EL SISTEMA debe detenerla y descartar el audio; SI cancela durante la transcripción, ENTONCES EL SISTEMA debe abortar la solicitud, descartar el audio pendiente y volver a la captura conservando el texto existente.
- RF-13: SI la transcripción está vacía o no se reconoce voz, ENTONCES EL SISTEMA debe informar, conservar la grabación en memoria para reintentar o regrabar, y no insertar texto.
- RF-14: SI el usuario revoca el consentimiento mientras graba o transcribe, ENTONCES EL SISTEMA debe detener la operación y descartar el audio.
- RF-15: EL SISTEMA no debe almacenar audio después de obtener la transcripción ni conservar historial de grabaciones.
- RF-16: En móvil o en dispositivos táctiles, EL SISTEMA debe aceptar el texto dictado por el teclado del sistema y no debe mostrar el micrófono propio.
- RF-17: La voz no debe crear, guardar, buscar, editar, eliminar ni reordenar notas; solo debe llenar el texto de la captura para su revisión.
- RF-18: MIENTRAS la transcripción esté en curso, EL SISTEMA debe mostrar un estado de carga, impedir grabaciones o envíos duplicados y permitir cancelar.
- RF-19: EL SISTEMA debe contar cada transcripción completada como una operación de IA para el límite diario definido en la Spec 011a; la interpretación posterior del texto cuenta como otra operación.
- RF-20: EL SISTEMA debe rechazar la captura por voz cuando no haya una sesión de USER activa y no debe permitir que ADMIN use el micrófono.

### Interfaz y accesibilidad

- RF-21: EL SISTEMA debe permitir iniciar y detener la grabación con teclado, mostrar foco visible y anunciar al lector de pantalla los estados de grabación, transcripción, error y cancelación.
- RF-22: EL SISTEMA debe ser usable sin desbordamiento horizontal entre 390 px y 2560 px, con prioridad móvil.
- RF-23: EL SISTEMA debe respetar `prefers-reduced-motion` en las transiciones y en el indicador de grabación.

## Requisitos no funcionales

- RNF-1: La transcripción debe responder con un percentil 95 menor o igual a 20 segundos para grabaciones de hasta 60 segundos, con una conexión estable de al menos 10 Mbps y el proveedor disponible; la medición se realiza en el servidor desde la recepción del audio hasta el envío del texto.
- RNF-2: EL SISTEMA debe cancelar la solicitud y conservar la grabación en memoria para reintentar si el proveedor no responde en 30 segundos.
- RNF-3: EL SISTEMA debe aplicar el límite diario definido en la Spec 011a y manejar la falta de cuota sin bloquear el modo manual.
- RNF-4: EL SISTEMA no debe exponer claves, credenciales ni detalles internos del proveedor de IA en errores, logs ni respuestas.
- RNF-5: EL SISTEMA debe tratar el audio como dato personal: no persistirlo, no registrar su contenido y enviar solo el audio necesario para la transcripción.
- RNF-6: La autorización, el límite diario y la validación del audio deben ejecutarse en el servidor; el cliente solo captura el audio y presenta el resultado.
- RNF-7: EL SISTEMA debe mostrar todos los textos visibles al usuario en español neutro, sin voseo.
- RNF-8: EL SISTEMA debe cumplir WCAG 2.1 nivel AA en los controles de grabación, consentimiento y estados de error.
- RNF-9: EL SISTEMA debe conservar el comportamiento actual de creación manual de notas cuando la voz no esté disponible, la IA esté desactivada o no haya consentimiento.

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
- [ ] El micrófono solo está disponible con consentimiento; sin consentimiento se ofrece el modo manual.
- [ ] Se puede grabar hasta 60 segundos, detener manualmente o por límite, y transcribir el audio.
- [ ] La transcripción se inserta en el cursor o al final, sin envío automático, y se puede editar.
- [ ] Si la transcripción supera 2500 puntos de código Unicode, se advierte y se bloquea la revisión hasta reducirla.
- [ ] Si falla la transcripción, la grabación se conserva en memoria para reintentar y no se persiste.
- [ ] La grabación se descarta al transcribir, cancelar, abandonar la captura o revocar el consentimiento.
- [ ] La voz no ejecuta acciones distintas de llenar el texto.
- [ ] Los estados de grabación, transcripción, error y cancelación son accesibles por teclado y lector de pantalla.
- [ ] No se registra audio ni transcripción en logs y no se exponen detalles internos del proveedor.
- [ ] El límite diario se aplica y se informa sin bloquear el modo manual.
- [ ] La interfaz es usable entre 390 px y 2560 px.
- [ ] Los tests del backend y del frontend pasan; lint y build están en verde.

## Dudas abiertas

Ninguna. Las decisiones de disponibilidad, consentimiento, retención temporal, reintento y límites quedaron cerradas con el usuario.
