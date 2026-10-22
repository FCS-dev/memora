# Plan 011a — Captura de notas en lenguaje natural: texto

Estado: borrador

Spec: `specs/011a-captura-texto/spec.md` (aprobada)

Dependencias aprobadas: Groq y Spring AI. La Spec 011b reutiliza el consentimiento, la cuota y el flujo de captura definidos aquí.

## 1. Alcance y principios

Esta entrega implementa solo la captura por texto. El backend conserva la autoridad sobre autenticación, consentimiento, cuota, validación, resolución de fechas e idempotencia. El frontend presenta el flujo y nunca decide reglas de negocio.

Reglas de diseño:

- El borrador no se persiste hasta que el usuario confirme.
- El texto original se conserva en memoria mientras dure la captura.
- El contenido del usuario no se registra en logs.
- El proveedor externo de IA nunca accede a la base de datos.
- Las respuestas del modelo se tratan como datos no confiables y se validan siempre.

## 2. Arquitectura

```
CaptureBar / FAB
   └── CaptureFlow (React)
         ├── CaptureSheet ──> POST /notes/interpret
         │        └── AiConsentDialog ──> PUT /users/me/ai-consent
         └── NoteEditor (borrador o fallback) ──> POST /notes
                                                   └── NoteService (idempotencia)
Backend:
NoteInterpretationController -> NoteInterpretationService
   ├── AiConsentService
   ├── AiUsageService
   ├── TagService.list
   ├── NoteDraftExtractor (Groq)
   └── NoteDraftNormalizer
```

## 3. Backend

### 3.1 Dependencias y configuración

- Agregar el BOM de Spring AI 2.x y el starter compatible con OpenAI (`spring-ai-starter-model-openai`; nombre exacto a confirmar en el spike).
- Configurar `OpenAiChatModel` o `ChatClient` con:
  - `base-url`: `${GROQ_BASE_URL:https://api.groq.com/openai}`.
  - `api-key`: `${GROQ_API_KEY}`.
  - `model`: `${GROQ_CHAT_MODEL:openai/gpt-oss-20b}`.
  - `temperature`: `0.2`.
  - `max-tokens`: `${GROQ_MAX_OUTPUT_TOKENS:512}`.
- Crear `AiProperties` (`@ConfigurationProperties(prefix = "memora.ai")`) con: `enabled`, `noticeVersion`, `dailyLimit`, `maxInputCodePoints` (2500), `timeoutMs` (20000), `maxOutputTokens`, `model`.
- Crear `AiConfig` con el bean de chat condicionado a `memora.ai.enabled=true`; la aplicación debe arrancar sin `GROQ_API_KEY` cuando la IA está desactivada.
- Extender `EnvVarValidator` o agregar un validador específico: si `AI_ENABLED=true`, exigir `GROQ_API_KEY` y `GROQ_BASE_URL`; si es `false`, no exigirlos.
- Actualizar `application.yaml` y `.env.example` con las variables de Groq y los límites.
- Mantener las claves solo en backend; nunca exponerlas en el frontend.

### 3.2 Consentimiento

Entidad `AiConsentEvent` (tabla `ai_consent_events`):

- `id`, `user_id`, `action` (`GRANTED`, `DENIED`, `REVOKED`), `notice_version`, `created_at`.
- Es append-only: el estado actual se obtiene del último evento.

`AiConsentService`:

- `Optional<AiConsentEvent> latest(User user)`.
- `boolean isGranted(User user)`: último evento `GRANTED` y versión igual a la vigente.
- `boolean requiresConsent(User user)`: no hay consentimiento vigente.
- `void grant(User user, String noticeVersion)`, `deny(...)`, `revoke(User user)`.
- La revocación se registra como evento; las solicitudes nuevas deben consultar el estado antes de llamar a Groq.

`AiConsentController`:

- `PUT /users/me/ai-consent` con `{ action, noticeVersion }`.
- Valida que la acción sea `GRANTED`, `DENIED` o `REVOKED`; que la versión coincida con la vigente cuando corresponda.
- Devuelve el perfil actualizado.

`UserProfileResponse` agrega:

- `aiConsent`: `GRANTED`, `DENIED`, `REVOKED` o `NOT_SET`.
- `aiConsentRequired`: booleano calculado por el backend.
- `aiConsentNoticeVersion`: versión vigente del aviso.

`SecurityConfig`: `/users/me/ai-consent` restringido a `USER`.

### 3.3 Cuota diaria

Entidad `AiUsage` (tabla `ai_usage`):

- `id`, `user_id`, `usage_date` (`LocalDate`), `count`.
- Restricción única `(user_id, usage_date)`.

`AiUsageService`:

- `void check(User user, ZoneId zone)`: si el contador alcanzó `dailyLimit`, lanza `AiQuotaExceededException`.
- `void recordSuccess(User user, ZoneId zone)`: incrementa el contador después de una operación completada.
- Resuelve la fecha con `LocalDate.now(clock.withZone(zone))`; si la zona falta o es inválida, usa la zona del servidor.
- Usa `@Lock(PESSIMISTIC_WRITE)` y transacción para evitar carreras.
- Las operaciones fallidas, canceladas o rechazadas no se registran.

### 3.4 Extracción del borrador

`NoteDraft` (record interno):

- `title`, `content`, `checklistMode`, `checklistItems`, `rememberAt`, `tagIds`, `multipleIntents`, `warnings`.

`NoteDraftExtractor`:

- Interfaz `NoteDraft extract(User user, String text, ZoneId zone, Instant now, List<Tag> allowedTags)`.
- Implementación `GroqNoteDraftExtractor` con `ChatClient`.
- Prompt en `src/main/resources/prompts/note-draft.st` con:
  - Instrucción de devolver solo JSON válido.
  - Fecha y hora actual, zona horaria.
  - Lista cerrada de etiquetas permitidas (id y nombre).
  - Reglas de título, contenido, checklist, recordatorio y múltiples intenciones.
- Salida estructurada: `ChatClient...call().entity(NoteDraftModel.class)` con `BeanOutputConverter`; si el spike confirma soporte, usar `responseFormat=json_schema`. Cualquier fallo de parseo se trata como respuesta inválida.
- `NoteDraftModel` es un record separado del dominio para no confiar en el modelo.

`NoteDraftNormalizer` (funciones puras, con `now` y `zone` como parámetros):

- `normalizeTitle`: trim, límite 200; si queda vacío, primeros 60 puntos de código del texto original.
- `normalizeContent`: trim, límite 2500; si el modelo devuelve checklist válida, contenido vacío.
- `normalizeChecklist`: al menos un ítem con texto no vacío y suma de textos <= 2500; si no, descartar checklist y advertir.
- `normalizeTags`: conservar solo ids de la lista permitida, máximo 5, sin duplicados; aplicar la regla existente de global sobre privada.
- `resolveReminder`: aceptar `LocalDateTime`; si es ambiguo, solo fecha/hora, cae en hueco de DST o la zona es inválida, devolver `null` y advertencia; las fechas pasadas se aceptan.
- `warnings`: códigos `TITLE_TRUNCATED`, `CONTENT_TRUNCATED`, `CHECKLIST_DISCARDED`, `TAGS_DISCARDED`, `REMINDER_AMBIGUOUS`, `MULTIPLE_INTENTS`, `TAGS_UNAVAILABLE`.

`NoteInterpretationService`:

1. Cargar usuario activo.
2. Verificar `AiProperties.enabled`; si está desactivado, lanzar `AiDisabledException`.
3. Verificar consentimiento; si falta, lanzar `AiConsentRequiredException`.
4. Verificar cuota.
5. Cargar etiquetas visibles con `TagService.list`.
6. Llamar al extractor con texto, zona, `Clock` y etiquetas.
7. Normalizar y validar.
8. Registrar cuota solo si la operación terminó correctamente.
9. Devolver `NoteInterpretationResponse` con `draft` y `warnings`; si `multipleIntents`, `draft = null` y advertencia.
10. No persistir nada.

### 3.5 Endpoint de interpretación

`POST /notes/interpret` (USER):

Request:

```json
{
  "text": "mañana a las 18 comprar leche y pan",
  "zoneId": "America/Argentina/Buenos_Aires"
}
```

Response 200:

```json
{
  "draft": {
    "title": "Comprar leche y pan",
    "content": "",
    "checklistMode": true,
    "checklistItems": [
      { "text": "Comprar leche", "checked": false },
      { "text": "Comprar pan", "checked": false }
    ],
    "rememberAt": "2026-10-23T18:00:00",
    "tagIds": [3]
  },
  "warnings": []
}
```

Errores:

- 400: texto vacío, zona inválida o request inválido.
- 428: consentimiento requerido.
- 429: cuota diaria agotada.
- 502/504: fallo o timeout del proveedor.
- 503: IA desactivada.

El controlador no accede a repositorios; delega en `NoteInterpretationService`.

### 3.6 Límites de texto y validación

- `AiTextLimits.countCodePoints(String)` y `truncateToCodePoints(String, int)`.
- El request usa `@NotBlank`; el límite de 2500 puntos de código se valida en el servicio con `AiTextLimits`.
- El borrador se ajusta también a los límites vigentes de la nota (`@Size` de título y contenido) para que el `POST /notes` posterior no falle.
- La validación de etiquetas usa los ids permitidos, no los nombres, para evitar ambigüedad global/privada.

### 3.7 Idempotencia en la creación

- Agregar `idempotency_key` nullable (longitud 36) a `notes` y restricción única `(user_id, idempotency_key)`.
- Agregar `idempotencyKey` opcional a `CreateNoteRequest`.
- `NoteService.create`: si la clave existe para el usuario, devolver la nota existente; si no, crear. La restricción única es la red de seguridad ante carreras; en ese caso se devuelve 409 y el cliente recarga.
- No exponer la clave en `NoteResponse`.
- Las notas manuales sin clave siguen funcionando igual.

### 3.8 Errores estándar

Agregar excepciones y mapeos en `GlobalExceptionHandler`:

- `AiConsentRequiredException` -> 428.
- `AiQuotaExceededException` -> 429.
- `AiDisabledException` -> 503.
- `AiProviderException` -> 502.
- `AiTimeoutException` -> 504.
- Mantener el cuerpo `{title, status, detail}` sin detalles internos del proveedor.

## 4. Frontend

### 4.1 Estructura

Nueva carpeta `frontend/src/features/notes/capture/`:

- `api/captureApi.ts`: `interpretNote`, `updateAiConsent`.
- `components/CaptureFlow.tsx`: orquesta captura, consentimiento, borrador y editor.
- `components/CaptureSheet.tsx`: textarea, contador de puntos de código, acciones.
- `components/AiConsentDialog.tsx`: aviso y aceptar/rechazar.
- `components/DraftNotice.tsx`: advertencias y texto original.
- `hooks/useCapture.ts`: estado del flujo.
- `model/types.ts`: `NoteDraft`, `NoteInterpretationResponse`, `AiWarning`, `AiConsent`.
- `model/copy.ts`: textos de captura, consentimiento y advertencias.
- `model/errors.ts`: mapeo de errores de captura.
- `model/draft.ts`: funciones puras de transformación.

Modificar:

- `features/notes/components/CaptureBar.tsx`: recibe `onOpen` en lugar de navegar siempre.
- `features/notes/pages/NotesPage.tsx`: integra `CaptureFlow`; el FAB abre el mismo flujo; conserva la ruta `/home/new` para el modo manual.
- `features/notes/components/NoteEditor.tsx`: acepta borrador, texto inicial, advertencias y texto original.
- `features/notes/hooks/useNoteEditor.ts`: acepta valores iniciales y conserva una clave de idempotencia.
- `features/notes/model/types.ts`: agrega `idempotencyKey` a `CreateNotePayload`; agrega tipos de borrador.
- `features/notes/model/validation.ts`: `buildCreatePayload` incluye la clave.
- `features/notes/api/notesApi.ts`: envía la clave en el body.
- `features/account/components/ProfileDialog.tsx`: sección de consentimiento de IA.
- `features/account/api/accountApi.ts`: `updateAiConsent`.
- `features/account/model/copy.ts`: textos del consentimiento.
- `features/auth/model/types.ts`: `aiConsent`, `aiConsentRequired`, `aiConsentNoticeVersion`, `aiEnabled`.
- `features/auth/api/authApi.ts`: `getMe` ya devuelve el perfil; ajustar el tipo.

### 4.2 Flujo de captura

`CaptureBar` y el FAB abren `CaptureFlow`.

`CaptureFlow`:

- Estado: `text`, `status` (`editing`, `interpreting`, `review`, `error`), `draft`, `warnings`, `error`.
- `onReview`:
  - Si `!aiEnabled` o no hay consentimiento, abrir consentimiento o modo manual según corresponda.
  - Si hay consentimiento, llamar a `interpretNote`.
  - Mostrar carga y permitir cancelar; al cancelar, volver a `editing` con el texto.
- Éxito: pasar a `review` y renderizar `NoteEditor` con `initialDraft`, `warnings` y `originalText`.
- Fallo: pasar a `review` con valores de fallback (título primeros 60 puntos de código, contenido texto completo) y advertencia.
- `multipleIntents`: abrir el editor con el texto completo y advertencia.
- `onManual`: navegar a `/home/new` con estado `{ manualText: text }`; `NotesPage` lo usa como texto inicial.
- `onCancel` del editor: volver a `editing` conservando el texto.
- `onSave`: crear la nota, recargar y cerrar el flujo.
- Si el usuario abandona, no se persiste nada.

`CaptureSheet`:

- `textarea` con `maxLength` visual basado en puntos de código.
- Contador `n/2500` calculado con `Array.from(text).length`.
- `Revisar` deshabilitado si texto vacío, excede el límite o está cargando.
- `Modo manual`.
- `aria-live` para carga y errores.
- En 011b se agrega el micrófono.

`AiConsentDialog`:

- Portal modal con `useModalBehavior`.
- Aviso que nombra a Groq, indica qué se envía y que el modo manual no envía datos.
- `Aceptar` -> `PUT /users/me/ai-consent` con `GRANTED` y la versión vigente; actualizar perfil; reintentar la acción.
- `Rechazar` -> `PUT` con `DENIED`; abrir modo manual.
- Si falla la actualización, mostrar error y no enviar texto.

`ProfileDialog`:

- Sección “Inteligencia artificial”.
- Estado actual y botón para habilitar o revocar.
- Al revocar, actualizar el perfil y reflejar el cambio.

### 4.3 Editor con borrador y fallback

`NoteEditor` recibe:

- `initialDraft?: NoteDraft`.
- `initialText?: string`.
- `warnings?: AiWarningCode[]`.
- `originalText?: string`.

`useNoteEditor`:

- Inicializa con `initialDraft` o `initialText` cuando no hay `note`.
- `draftToFormValues` convierte el borrador a `NoteFormValues` (tags por id, recordatorio recortado a 16 caracteres, checklist con `clientId`).
- `fallbackFormValues(text)` usa los primeros 60 puntos de código como título y el texto completo como contenido.
- Genera una clave `crypto.randomUUID()` por edición nueva y la reutiliza en reintentos.
- `buildCreatePayload` incluye `idempotencyKey`.

`NoteEditor`:

- Muestra `DraftNotice` con las advertencias y un bloque desplegable con el texto original.
- Mantiene el comportamiento actual de checklist, etiquetas, recordatorio y confirmación de descarte.
- Al cancelar, `CaptureFlow` recupera el texto original.

### 4.4 Funciones puras

- `countCodePoints(text)`: `Array.from(text).length`.
- `firstCodePoints(text, n)`.
- `draftToFormValues(draft, tags)`.
- `fallbackFormValues(text)`.
- `warningMessage(code)`.
- `mapCaptureError(error)`.
- `buildCreatePayload(values, items, idempotencyKey)`.

## 5. Contratos y datos

### 5.1 Tablas nuevas

- `ai_consent_events`: auditoría append-only.
- `ai_usage`: contador diario por usuario.
- `notes.idempotency_key`: nullable, con restricción única `(user_id, idempotency_key)`.

No se modifica el esquema de notas más allá de la columna de idempotencia.

### 5.2 Variables de entorno

```
AI_ENABLED=true
GROQ_API_KEY=...
GROQ_BASE_URL=https://api.groq.com/openai
GROQ_CHAT_MODEL=openai/gpt-oss-20b
GROQ_MAX_OUTPUT_TOKENS=512
AI_TIMEOUT_MS=20000
AI_DAILY_LIMIT=50
AI_MAX_INPUT_CODE_POINTS=2500
AI_NOTICE_VERSION=1
```

Las claves reales no se versionan; `.env.example` solo lleva marcadores.

## 6. Decisiones y alternativas descartadas

1. **Spring AI con endpoint compatible con OpenAI** en lugar de llamadas REST manuales. Alternativa descartada: `RestClient` directo; se usará solo si el spike demuestra incompatibilidad con Spring Boot 4.1.1.
2. **Consentimiento append-only** en lugar de columnas mutables en `users`. Alternativa descartada: un booleano y una fecha; no permite auditoría.
3. **Cuota en base de datos** en lugar de memoria. Alternativa descartada: `ConcurrentHashMap`; se pierde al reiniciar y no es consistente entre instancias.
4. **Idempotencia con columna nullable** en `notes` en lugar de tabla separada. Alternativa descartada: tabla de claves; más compleja para el alcance educativo.
5. **Flujo de captura inline** en `NotesPage` en lugar de una ruta con estado. Alternativa descartada: navegar con `location.state`; se pierde el texto al cancelar o recargar.
6. **Ids de etiquetas** en lugar de nombres. Alternativa descartada: nombres; hay ambigüedad global/privada.
7. **Puntos de código Unicode** para la captura. Alternativa descartada: longitud UTF-16; no coincide con la decisión del usuario.
8. **Resolución de fechas en el servidor** con `Clock` y `ZoneId`. Alternativa descartada: resolver en el navegador o dejar que el modelo haga aritmética de fechas.
9. **Múltiples intenciones -> editor manual**. Alternativa descartada: dividir automáticamente en varias notas; contradice el alcance.
10. **Salida estructurada validada** en lugar de texto libre del modelo. Alternativa descartada: parsear texto libre con expresiones regulares.

## 7. Estrategia de tests

Backend:

- Unitarios:
  - `AiTextLimitsTest`: puntos de código, truncado, emojis.
  - `NoteDraftNormalizerTest`: título de respaldo, recortes, checklist, etiquetas, fechas, DST, múltiples intenciones, advertencias.
  - `NoteInterpretationServiceTest`: consentimiento, IA desactivada, cuota, etiquetas, fallback, no persistencia.
  - `AiConsentServiceTest`: grant/deny/revoke/version/auditoría.
  - `AiUsageServiceTest`: límite, reinicio local, zona inválida, solo exitosas.
  - `NoteServiceTest`: idempotencia y creación normal.
- Web:
  - `NoteInterpretationControllerTest`: 200, 400, 428, 429, 502, 503, 504; USER/ADMIN.
  - `UserControllerTest`: perfil con campos de consentimiento; `PUT /users/me/ai-consent`.
  - `NoteControllerTest`: `POST /notes` con y sin idempotency key; duplicado.
- Integración:
  - Reemplazar `NoteDraftExtractor` por un fake en el perfil `test`; no llamar a Groq.
  - Verificar que no se registra el texto de la captura en logs.
- Manual:
  - Script o prueba con `GROQ_API_KEY` real, fuera de CI, documentado en `docs/ai.md`.

Frontend:

- `CaptureFlow`: abrir, escribir, contador, revisar, consentimiento, éxito, fallback, múltiples intenciones, cancelar conservando texto, modo manual.
- `AiConsentDialog`: aceptar, rechazar, error de red, foco y Escape.
- `ProfileDialog`: habilitar/revocar IA.
- `NoteEditor`: borrador precargado, advertencias, texto original, fallback, clave de idempotencia reutilizada.
- `notesApi` y `captureApi`: payloads y manejo de 428/429/409.
- Accesibilidad: teclado, `aria-live`, foco, `prefers-reduced-motion`.
- Sin llamadas reales a Groq.

Comandos:

```
cd backend && mvn test
cd frontend && npm run test
cd frontend && npm run lint
cd frontend && npm run build
```

## 8. Riesgos

- Compatibilidad de Spring AI 2.x con Spring Boot 4.1.1; el spike es bloqueante.
- Diferencias de Groq en salida estructurada; si `entity` no es fiable, usar JSON schema o validación estricta.
- Disponibilidad y cuota gratuita de Groq; la interfaz debe degradar a manual.
- Conteo de puntos de código frente a límites existentes de la nota; se recorta el borrador a ambos contratos.
- Carrera de idempotencia; la restricción única y el 409 son la red de seguridad.
- Precisión del contador diario ante concurrencia; se usa bloqueo pesimista.
- Inyección de instrucciones desde el texto; el borrador no ejecuta acciones y el backend valida.
- Privacidad: el aviso debe nombrar a Groq y no se registra contenido.

## 9. Trazabilidad RF

| RF | Implementación |
|---|---|
| RF-1, RF-2 | `CaptureBar`, `CaptureFlow`, `CaptureSheet` |
| RF-3 | `AiTextLimits`, contador del frontend |
| RF-4..RF-11 | `AiConsent*`, `UserProfileResponse`, `AiConsentDialog`, `ProfileDialog`, `SecurityConfig` |
| RF-12..RF-19 | `NoteInterpretationService`, `NoteDraftNormalizer`, `NoteDraftExtractor` |
| RF-20..RF-23 | `CaptureFlow`, `NoteEditor`, `useNoteEditor`, `fallbackFormValues` |
| RF-24, RF-25 | `NoteDraftNormalizer.resolveReminder` con `Clock` y `ZoneId` |
| RF-26, RF-27 | `CaptureFlow`, estado de carga, texto original |
| RF-28 | `Note.idempotencyKey`, `NoteService`, `useNoteEditor` |
| RF-29 | `AiUsageService`, `AiQuotaExceededException` |
| RF-30 | `SecurityConfig`, `@AuthenticationPrincipal` |
| RF-31..RF-33 | Componentes accesibles, `useModalBehavior`, responsive, `prefers-reduced-motion` |
| RNF-1..RNF-10 | Timeout, cuota, logs, minimización, servidor, tests |

## 10. Fuera de este plan

- Micrófono y transcripción (Spec 011b).
- MCP, asistente, RAG y documentos (specs posteriores).
- Búsqueda o edición de notas existentes por lenguaje natural.
- Reordenamiento o acciones por voz.
