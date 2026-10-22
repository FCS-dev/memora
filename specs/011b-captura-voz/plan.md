# Plan 011b — Captura de notas por voz

Estado: borrador

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
- `multipart/form-data`: `audio` (archivo) y `zoneId` (texto).
- Valida:
  - Archivo presente y no vacío.
  - Tamaño <= `maxAudioBytes`.
  - MIME permitido: `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/x-m4a`, `audio/m4a`.
  - `zoneId` válido o ausente (se usa la zona del servidor para la cuota).
- Delega en `TranscriptionService`.

`TranscriptionService`:

1. Cargar usuario activo.
2. Verificar `AI_ENABLED`; si no, `AiDisabledException`.
3. Verificar consentimiento; si falta, `AiConsentRequiredException` (428).
4. Verificar cuota con `AiUsageService.check(user, zone)`.
5. Llamar a `TranscriptionClient.transcribe`.
6. Si el texto está vacío, devolver 200 con `text=""` y no registrar cuota.
7. Normalizar el texto (trim).
8. Registrar cuota solo si hay texto no vacío.
9. Devolver `{ "text": "..." }`.
10. No persistir el audio.

El archivo temporal de multipart se elimina al terminar la request. No se escribe en una ruta propia ni en la base de datos.

Errores:

- 400: archivo ausente, vacío, formato no permitido o `zoneId` inválido.
- 413: archivo demasiado grande.
- 428: consentimiento requerido.
- 429: cuota agotada.
- 502/504: fallo o timeout del proveedor.
- 503: IA desactivada.

`SecurityConfig`: agregar `.requestMatchers("/ai/**").hasRole("USER")`.

### 3.4 Cuota y consentimiento

- Reutilizar `AiConsentService` y `AiUsageService` de 011a.
- Una transcripción con texto no vacío cuenta como una operación completada.
- La interpretación posterior del texto cuenta como otra operación (011a).
- La revocación del consentimiento se consulta antes de llamar al proveedor; si se revoca durante la request, el backend descarta la respuesta y no la devuelve.

## 4. Frontend

### 4.1 Estructura

Modificar:

- `shared/lib/http.ts`: agregar `requestMultipart<T>(path, formData, options)` con el mismo manejo de token, refresh y 401 que `request`.
- `features/notes/capture/api/captureApi.ts`: `transcribeAudio(blob, zoneId)`.
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
  - Hay consentimiento o se puede solicitarlo.
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
- Si la transcripción falla:
  - Conservar el `Blob` en memoria.
  - Mostrar “Reintentar” y “Regrabar”.
  - Al reintentar, reenviar el mismo `Blob`; no volver a grabar.
- Si el usuario cancela, abandona la captura, guarda o revoca el consentimiento:
  - Descartar el `Blob`.
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
- `zoneId`: texto opcional.

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
7. **Una transcripción con texto cuenta como operación**; una vacía no cuenta. Alternativa descartada: contar intentos; penaliza al usuario por fallos del proveedor.
8. **La transcripción solo llena el texto**. Alternativa descartada: interpretar directamente el audio; duplica el flujo y oculta la revisión.

## 7. Estrategia de tests

Backend:

- `GroqTranscriptionClientTest` con `MockRestServiceServer` o un fake `RestClient`: multipart, modelo, language, respuesta y timeout.
- `TranscriptionServiceTest`: consentimiento, cuota, texto vacío, éxito, error del proveedor, no persistencia, no logs.
- `TranscriptionControllerTest`: multipart válido, archivo ausente, formato no permitido, tamaño excesivo, 428, 429, 502, 503, 504, USER/ADMIN.
- Reutilizar los tests de `AiConsentService` y `AiUsageService`.

Frontend:

- `useAudioRecorder`: inicio, permiso, MIME, stop, auto-stop a 60 s, cancelación, limpieza al desmontar, errores.
- `MicButton`: visible/invisible según media query, teclado, estados, `aria-live`, consentimiento.
- `CaptureSheet`: inserción en cursor/selección/final, texto >2500, reintento con el mismo blob, regrabar, descarte al cancelar/abandonar/revocar.
- `captureApi`: multipart, auth, refresh en 401, errores.
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
- Accesibilidad de un control de grabación con estados cambiantes; se cubre con `aria-live` y teclado.

## 9. Trazabilidad RF

| RF | Implementación |
|---|---|
| RF-1, RF-2 | `MicButton`, `useMediaQuery`, `AiConsentDialog` |
| RF-3, RF-4, RF-5 | `AiConsentDialog`, `TranscriptionService`, `GlobalExceptionHandler` |
| RF-6..RF-9 | `useAudioRecorder`, `TranscriptionService`, `CaptureSheet` |
| RF-10..RF-15 | `CaptureSheet`, `useAudioRecorder`, `CaptureFlow` |
| RF-16 | `useMediaQuery`, `CaptureSheet` |
| RF-17, RF-18 | `MicButton`, `CaptureFlow`, `CaptureSheet` |
| RF-19 | `TranscriptionService`, `AiUsageService` |
| RF-20 | `SecurityConfig`, `TranscriptionController` |
| RF-21..RF-23 | `MicButton`, `CaptureSheet`, `useAudioRecorder` |
| RNF-1..RNF-9 | Timeout, cuota, logs, minimización, servidor, tests |

## 10. Fuera de este plan

- Captura por texto e interpretación (Spec 011a).
- MCP, asistente, RAG y documentos.
- Dictado dentro de la app en móvil; se usa el teclado del sistema.
- Acciones por voz, reordenamiento, edición de notas existentes.
- Almacenamiento o historial de audio.
