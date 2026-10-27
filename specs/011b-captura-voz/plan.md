# Plan 011b — Captura de notas por voz

Estado: borrador revisado; pendiente de aprobación final

Spec: `specs/011b-captura-voz/spec.md` (aprobada)
Spec base: `specs/011a-captura-texto/spec.md` (aprobada)

Esta entrega agrega la voz como forma de llenar el texto de la captura. Reutiliza el consentimiento, la cuota, el flujo de captura y el editor definidos en la Spec 011a. No crea ni modifica notas por sí sola.

## 1. Alcance y principios

- En escritorio, la app graba audio y lo transcribe con Groq Whisper.
- En móvil o dispositivos táctiles, se usa el dictado nativo del teclado y no se muestra el micrófono propio.
- La transcripción solo llena el campo de texto; el usuario revisa y confirma.
- El audio no se persiste; se conserva en memoria del navegador solo para reintentar una transcripción fallida.
- La autorización, el consentimiento y la cuota se validan en el servidor.

## 2. Arquitectura

```
MicButton -> useAudioRecorder -> Blob
   └── CaptureSheet -> POST /ai/transcribe (multipart)
                         └── TranscriptionService
                               ├── AiConsentService (011a)
                               ├── AiUsageService (011a)
                               └── TranscriptionClient (Groq Whisper)
   └── texto insertado en el cursor -> flujo de 011a
```

## 3. Backend

### 3.1 Configuración

Extender `AiProperties` (011a) con:

- `transcriptionModel`: `${GROQ_TRANSCRIPTION_MODEL:whisper-large-v3-turbo}`.
- `maxAudioBytes`: `${AI_MAX_AUDIO_BYTES:10485760}` (10 MB).
- `maxAudioSeconds`: `${AI_MAX_AUDIO_SECONDS:60}` (contrato de UX; el límite real lo aplica el cliente).
- `transcriptionTimeoutMs`: `${AI_TRANSCRIPTION_TIMEOUT_MS:30000}`.

Agregar a `.env.example` y `application.yaml`. Si `AI_ENABLED=true`, exigir también `GROQ_TRANSCRIPTION_MODEL`; si está desactivada, no.

### 3.2 Cliente de transcripción

`TranscriptionClient` (interfaz):

```java
String transcribe(byte[] audio, String mimeType, String fileName);
```

`GroqTranscriptionClient`:

- Usa `RestClient` con `Authorization: Bearer ${GROQ_API_KEY}`.
- `POST ${GROQ_BASE_URL}/v1/audio/transcriptions` con `multipart/form-data`:
  - `file`: audio.
  - `model`: `AiProperties.transcriptionModel`.
  - `language`: `es`.
  - `response_format`: `json`.
- Lee `{ "text": "..." }`.
- Aplica timeout de `transcriptionTimeoutMs`.
- No registra audio ni transcripción.

Alternativa: usar el modelo de audio de Spring AI si el spike confirma que funciona con el endpoint de Groq. La interfaz `TranscriptionClient` aísla la decisión.

### 3.3 Servicio y endpoint

`TranscriptionController`:

- `POST /ai/transcribe` (USER).
- `multipart/form-data`: `audio` (archivo).
- Valida:
  - Archivo presente y no vacío.
  - Tamaño <= `maxAudioBytes`.
  - MIME permitido: `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/x-m4a`, `audio/m4a`.
- Delega en `TranscriptionService`.

`TranscriptionService`:

1. Cargar usuario activo.
2. Verificar `AI_ENABLED`; si no, `AiDisabledException`.
3. Verificar consentimiento vigente; si es `NOT_SET`, `DENIED` o `REVOKED`, lanzar `AiConsentRequiredException` (428). La UI decide si muestra el diálogo o el modo manual.
4. Verificar cuota con `AiUsageService.check(user)`; la zona del navegador no participa.
5. Llamar a `TranscriptionClient.transcribe`.
6. Si el texto está vacío, devolver 200 con `text=""` y no registrar cuota.
7. Normalizar el texto (trim).
8. Revalidar el consentimiento antes de responder; si fue revocado, descartar la respuesta y lanzar `AiConsentRequiredException`.
9. Registrar cuota solo si hay texto no vacío.
10. Devolver `{ "text": "..." }`.
11. No persistir el audio.

El archivo temporal de multipart se elimina al terminar la request. No se escribe en una ruta propia ni en la base de datos.

Errores:

- 400: archivo ausente, vacío o formato no permitido.
- 413: archivo demasiado grande.
- 428: consentimiento requerido.
- 429: cuota agotada.
- 502: fallo del proveedor, 429 del proveedor, bloqueo de contenido o respuesta inválida.
- 504: timeout del proveedor.
- 503: IA desactivada.
- Los errores del proveedor no consumen cuota.

`SecurityConfig`: agregar `.requestMatchers("/ai/**").hasRole("USER")`.

### 3.4 Cuota y consentimiento

- Reutilizar `AiConsentService` y `AiUsageService` de 011a.
- Una transcripción válida con texto no vacío cuenta como una operación completada; una vacía, inválida, cancelada o fallida no cuenta.
- La interpretación posterior del texto cuenta como otra operación (011a).
- La cuota se reinicia con la zona del servidor, igual que en 011a.
- El consentimiento se consulta antes de llamar al proveedor y se revalida antes de responder; si se revoca durante la request, el backend descarta la respuesta y no la devuelve.
- El audio no se persiste; el `Blob` solo vive en memoria del navegador para reintentar.

## 4. Frontend

### 4.1 Estructura

Modificar:

- `shared/lib/http.ts`: agregar `requestMultipart<T>(path, formData, options)` con el mismo manejo de token, refresh y 401 que `request`.
- `features/notes/capture/api/captureApi.ts`: `transcribeAudio(blob)`.
- `features/notes/capture/components/CaptureSheet.tsx`: integrar el micrófono y la inserción del texto.
- `features/notes/capture/components/MicButton.tsx`: control de grabación.
- `features/notes/capture/hooks/useAudioRecorder.ts`: grabación, estados, límites y limpieza.
- `features/notes/capture/model/types.ts`: `RecordingStatus`, `TranscriptionResponse`.
- `features/notes/capture/model/copy.ts`: textos de micrófono, permisos, reintento, móvil y errores.
- `features/notes/capture/model/errors.ts`: mapeo de errores de transcripción.
- `features/notes/capture/model/audio.ts`: selección de MIME y funciones puras.
- `features/notes/capture/components/AiConsentDialog.tsx`: reutilizado de 011a.
- `features/notes/capture/components/CaptureFlow.tsx`: conserva el blob para reintentar y lo descarta al salir.

### 4.2 Selección de formato

`chooseAudioMime()`:

1. `audio/webm;codecs=opus`.
2. `audio/webm`.
3. `audio/mp4`.
4. `audio/ogg`.
5. Si ninguno es soportado por `MediaRecorder.isTypeSupported`, devolver `null` y mostrar error.

Se envía el `Blob` con el MIME elegido. El backend acepta los formatos listados.

### 4.3 Hook de grabación

`useAudioRecorder`:

- Estados: `idle`, `requesting`, `recording`, `transcribing`, `error`.
- `start()`:
  - Verifica `navigator.mediaDevices` y `MediaRecorder`.
  - Pide permiso con `getUserMedia({ audio: true })`.
  - Crea `MediaRecorder` con el MIME elegido.
  - Inicia un temporizador de 60 s.
- `stop()`: detiene la grabación y construye el `Blob`.
- `cancel()`: detiene, descarta el `Blob` y libera el stream.
- Auto-stop a los 60 s.
- Al desmontar o abandonar la captura: detener tracks, limpiar timers y descartar el blob.
- Si el permiso se deniega, no hay micrófono o no hay soporte, devolver un error tipado y sugerir teclado.
- Si el usuario revoca el consentimiento, `CaptureFlow` llama a `cancel()`.

### 4.4 MicButton

- Visible solo si:
  - `useMediaQuery('(pointer: fine) and (min-width: 768px)')`.
  - `aiEnabled`.
  - El consentimiento está `GRANTED` vigente o `NOT_SET`; con `DENIED` o `REVOKED` no se muestra.
- Acciones:
  - Iniciar grabación.
  - Detener y transcribir.
  - Cancelar.
  - Reintentar cuando falla la transcripción.
  - Regrabar cuando la transcripción está vacía o falla.
- Accesible por teclado (`button`, `aria-pressed`, `aria-label`).
- `aria-live` para “Grabando”, “Transcribiendo”, “No se reconoció voz”, “Permiso denegado”.
- Indicador visual de duración y de grabación; respeta `prefers-reduced-motion`.

### 4.5 Integración con CaptureSheet

- `CaptureSheet` expone el `textarea` y su `selectionStart`/`selectionEnd`.
- Al recibir la transcripción:
  - Insertar en la posición del cursor.
  - Si hay selección, reemplazarla.
  - Si el campo no tiene foco, agregar al final.
  - No enviar automáticamente.
- Si el texto resultante supera 2500 puntos de código:
  - Insertar igualmente.
  - Mostrar advertencia.
  - Bloquear “Revisar” hasta que se reduzca.
- Si la transcripción falla, incluido un 429 o bloqueo del proveedor:
  - Conservar el `Blob` en memoria.
  - Mostrar “Reintentar” y “Regrabar”.
  - Al reintentar, reenviar el mismo `Blob`; no volver a grabar.
  - No contar la operación.
- Consentimiento:
  - Si el estado es `NOT_SET`, al pulsar el micrófono se muestra `AiConsentDialog`; aceptar inicia la grabación, rechazar abre el modo manual y cerrar no registra decisión, no inicia la grabación y vuelve a preguntar en el próximo intento.
  - Si el estado es `DENIED` o `REVOKED`, el micrófono queda oculto o deshabilitado y se indica que la IA se habilita desde el perfil.
  - Si el backend responde 428, se trata como consentimiento no vigente y se muestra el diálogo o el modo manual según el estado.
- Si el usuario cancela, abandona la captura, guarda o revoca el consentimiento:
  - Descartar el `Blob`.
  - Si estaba transcribiendo, descartar la respuesta tardía y no contar la operación.
- En móvil o táctil:
  - No mostrar `MicButton`.
  - Mostrar pista “Usa el dictado de tu teclado”.
  - Aceptar el texto que el teclado inserte en el `textarea`.

### 4.6 Funciones puras

- `chooseAudioMime()`.
- `formatDuration(seconds)`.
- `insertAtSelection(text, selectionStart, selectionEnd, fragment)`.
- `isDesktopMicAvailable(matchesMediaQuery, mediaRecorderSupported)`.
- `remainingSeconds(startedAt, now, limit)`.
- `mapTranscriptionError(error)`.

## 5. Contratos y variables

`POST /ai/transcribe` (multipart):

- `audio`: archivo.

Respuesta 200:

```json
{ "text": "comprar leche y pan mañana a las 18" }
```

Respuesta 200 con audio sin voz:

```json
{ "text": "" }
```

Variables nuevas:

```
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
AI_MAX_AUDIO_BYTES=10485760
AI_MAX_AUDIO_SECONDS=60
AI_TRANSCRIPTION_TIMEOUT_MS=30000
```

## 6. Decisiones y alternativas descartadas

1. **Groq Whisper** en lugar de Web Speech API. Alternativa descartada: API del navegador; soporte desigual y experiencia distinta según el navegador.
2. **MediaRecorder** en lugar de Web Audio API o AudioWorklet. Alternativa descartada: más complejidad y menos soporte para el alcance educativo.
3. **Blob en memoria para reintentar** en lugar de almacenamiento temporal en servidor. Alternativa descartada: guardar audio en servidor; contradice la privacidad y la simplicidad.
4. **Multipart** en lugar de base64 en JSON. Alternativa descartada: base64; aumenta el tamaño y el costo de memoria.
5. **Detección por puntero fino y ancho** en lugar de user-agent. Alternativa descartada: user-agent; frágil y difícil de testear.
6. **Límite de 60 s en el cliente** con validación de tamaño/formato en servidor. Alternativa descartada: decodificar audio en servidor; requiere dependencias nuevas y no aporta al alcance.
7. **Una transcripción válida con texto cuenta como operación**; una vacía, inválida, cancelada o fallida no cuenta. Alternativa descartada: contar intentos; penaliza al usuario por fallos del proveedor.
8. **La transcripción solo llena el texto**. Alternativa descartada: interpretar directamente el audio; duplica el flujo y oculta la revisión.
9. **Cuota con zona del servidor** compartida con 011a. Alternativa descartada: zona del navegador; manipulable para reiniciar la cuota.
10. **Consentimiento `NOT_SET` solicita diálogo; `DENIED`/`REVOKED` abre manual**. Alternativa descartada: pedir siempre; molesta a quien ya rechazó.
11. **Revalidar consentimiento antes de responder y descartar respuestas tardías**. Alternativa descartada: confiar en la comprobación previa; una revocación durante la request devolvería datos no autorizados.
12. **Errores 429 y bloqueos del proveedor como 502 genérico sin cuota**. Alternativa descartada: exponer el código del proveedor; filtra detalles y confunde con la cuota propia.
13. **Logs mínimos sin audio, texto, etiquetas, zona ni cuenta**. Alternativa descartada: registrar identificadores para soporte; expone datos personales.
14. **Benchmark manual de RNF-1**. Alternativa descartada: p95 en CI con proveedor externo; inestable y no reproducible.

## 7. Estrategia de tests

Backend:

- `GroqTranscriptionClientTest` con `MockRestServiceServer` o un fake `RestClient`: multipart, modelo, language, respuesta y timeout.
- `TranscriptionServiceTest`: consentimiento `NOT_SET`/`DENIED`/`REVOKED`, versión, cuota con zona del servidor, texto vacío, éxito, error del proveedor, 429 del proveedor, revocación durante la request, no persistencia y no logs.
- `TranscriptionControllerTest`: multipart válido, archivo ausente, formato no permitido, tamaño excesivo, 428, 429, 502, 503, 504, USER/ADMIN; un 429 del proveedor no consume cuota.
- Reutilizar los tests de `AiConsentService` y `AiUsageService`; verificar que no se registran audio, texto, etiquetas, zona ni cuenta en logs.

Frontend:

- `useAudioRecorder`: inicio, permiso, MIME, stop, auto-stop a 60 s, cancelación, limpieza al desmontar, errores.
- `MicButton`: visible/invisible según media query, teclado, estados, `aria-live`, consentimiento `NOT_SET`/`DENIED`/`REVOKED`, cierre sin decisión y versión nueva.
- `CaptureSheet`: inserción en cursor/selección/final, texto >2500, reintento con el mismo blob, regrabar, descarte al cancelar/abandonar/revocar, cancelación con Escape durante la transcripción y respuesta tardía descartada.
- `captureApi`: multipart, auth, refresh en 401, errores 428/429/502/504.
- `http.requestMultipart`: mismo comportamiento que `request`.
- Móvil/táctil: sin micrófono propio, pista de dictado nativo.
- Sin llamadas reales a Groq.

Comandos:

```
cd backend && mvn test
cd frontend && npm run test
cd frontend && npm run lint
cd frontend && npm run build
```

## 8. Riesgos

- Compatibilidad de Groq con el formato de audio de cada navegador; se prueban webm, mp4 y ogg.
- Safari puede producir `audio/mp4`; el backend debe aceptarlo.
- Permisos de micrófono y contexto seguro; sin HTTPS o `localhost` no se puede grabar.
- El límite de 60 s es del cliente; un cliente manipulado puede enviar audio más largo. El servidor limita tamaño y formato, no duración.
- Retención temporal de multipart en el servidor; se confía en la limpieza de Spring y no se escribe en una ruta propia.
- Cuota y consentimiento compartidos con 011a; cualquier cambio en 011a impacta 011b.
- La cuota se reinicia con la zona del servidor; la UI debe explicarlo si el usuario espera medianoche local.
- El consentimiento cambia de versión o se revoca durante la request; se descarta la respuesta y no se cuenta.
- Errores 429 o bloqueos del proveedor no deben confundirse con la cuota propia ni consumirla.
- Accesibilidad de un control de grabación con estados cambiantes; se cubre con `aria-live` y teclado.
- El benchmark de RNF-1 depende del proveedor y no se ejecuta en CI.

## 9. Trazabilidad RF

| RF | Implementación |
|---|---|
| RF-1, RF-2 | `MicButton`, `useMediaQuery`, `AiConsentDialog` |
| RF-3, RF-4, RF-5 | `AiConsentDialog`, `TranscriptionService`, `GlobalExceptionHandler` |
| RF-6..RF-9 | `useAudioRecorder`, `TranscriptionService`, `CaptureSheet` |
| RF-10..RF-15 | `CaptureSheet`, `useAudioRecorder`, `CaptureFlow` |
| RF-16 | `useMediaQuery`, `CaptureSheet` |
| RF-17, RF-18 | `MicButton`, `CaptureFlow`, `CaptureSheet` |
| RF-19 | `TranscriptionService`, `AiUsageService` con zona del servidor y solo texto no vacío |
| RF-20 | `SecurityConfig`, `TranscriptionController` |
| RF-21..RF-23 | `MicButton`, `CaptureSheet`, `useAudioRecorder` |
| RNF-1..RNF-9 | Benchmark manual, timeout, cuota, logs, minimización, servidor, tests |

## 10. Fuera de este plan

- Captura por texto e interpretación (Spec 011a).
- MCP, asistente, RAG y documentos.
- Dictado dentro de la app en móvil; se usa el teclado del sistema.
- Acciones por voz, reordenamiento, edición de notas existentes.
- Almacenamiento o historial de audio.
