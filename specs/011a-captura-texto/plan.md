# Plan 011a — Captura de notas en lenguaje natural: texto

Estado: implementado

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
   ├── NoteScopeGuard
   ├── TagService.list
   ├── NoteDraftExtractor (Groq)
   └── NoteDraftNormalizer
         └── SpanishReminderResolver
```

## 3. Backend

### 3.1 Dependencias y configuración

- Agregar el BOM de Spring AI 2.x y el starter compatible con OpenAI (`spring-ai-starter-model-openai`; nombre exacto a confirmar en el spike).
- Configurar `OpenAiChatModel` o `ChatClient` con:
  - `base-url`: `${GROQ_BASE_URL:https://api.groq.com/openai/v1}`.
  - `api-key`: `${GROQ_API_KEY}`.
  - `model`: `${GROQ_CHAT_MODEL:openai/gpt-oss-20b}`.
  - `temperature`: `0.2`.
  - `max-tokens`: `${GROQ_MAX_OUTPUT_TOKENS:2048}`.
- Crear `AiProperties` (`@ConfigurationProperties(prefix = "memora.ai")`) con: `enabled`, `noticeVersion`, `dailyLimit`, `maxInputCodePoints` (2500), `timeoutMs` (20000), `maxOutputTokens`, `model`.
- Crear `AiConfig` con el bean de chat condicionado a `memora.ai.enabled=true`; la aplicación debe arrancar sin `GROQ_API_KEY` cuando la IA está desactivada.
- Extender `EnvVarValidator` o agregar un validador específico: si `AI_ENABLED=true`, exigir `GROQ_API_KEY` y `GROQ_BASE_URL`; si es `false`, no exigirlos.
- Actualizar `application.yaml` y `.env.example` con las variables de Groq y los límites.
- Mantener las claves solo en backend; nunca exponerlas en el frontend.

### 3.2 Consentimiento

Entidad `AiConsentEvent` (tabla `ai_consent_events`):

- `id`, `user_id`, `action` (`GRANTED`, `DENIED`, `REVOKED`), `notice_version`, `created_at`.
- Es append-only: el estado actual se obtiene del último evento.
- Cerrar el diálogo sin aceptar ni rechazar no crea evento; el estado sigue siendo `NOT_SET`.
- No contiene texto, audio, etiquetas ni zona horaria. Se conserva mientras exista la cuenta, se elimina con ella y no se expone a ADMIN.

`AiConsentService`:

- `Optional<AiConsentEvent> latest(User user)`.
- `ConsentState state(User user)`: `NOT_SET`, `GRANTED`, `DENIED` o `REVOKED`.
- `boolean isGranted(User user)`: último evento `GRANTED` y versión igual a la vigente.
- `boolean requiresConsent(User user)`: estado `NOT_SET` o `GRANTED` con versión anterior.
- `void grant(User user, String noticeVersion)`, `deny(...)`, `revoke(User user)`.
- Un `GRANTED` de una versión anterior no autoriza la versión vigente; se pide consentimiento una vez.
- Un `DENIED` o `REVOKED` no vuelve a preguntarse automáticamente; la IA se habilita desde el perfil.
- La revocación se registra como evento; las solicitudes nuevas deben consultar el estado antes de llamar a Groq.
- La solicitud en curso se vuelve a validar antes de devolver la respuesta; si el consentimiento ya no está vigente, se descarta la respuesta y no se cuenta la operación.

`AiConsentController`:

- `PUT /users/me/ai-consent` con `{ action, noticeVersion }`.
- Valida que la acción sea `GRANTED`, `DENIED` o `REVOKED`; que la versión coincida con la vigente.
- No acepta `NOT_SET`; ese estado solo existe cuando no hay evento.
- Devuelve el perfil actualizado.

`UserProfileResponse` agrega:

- `aiConsent`: `GRANTED`, `DENIED`, `REVOKED` o `NOT_SET`.
- `aiConsentRequired`: booleano calculado por el backend.
- `aiConsentNoticeVersion`: versión vigente del aviso.
- `aiEnabled`: booleano que refleja `AiProperties.enabled`; si es `false`, el frontend abre el editor manual directo.

`SecurityConfig`: `/users/me/ai-consent` restringido a `USER`.

### 3.3 Cuota diaria

Entidad `AiUsage` (tabla `ai_usage`):

- `id`, `user_id`, `usage_date` (`LocalDate`), `count`.
- Restricción única `(user_id, usage_date)`.

`AiUsageService`:

- `void check(User user)`: si el contador alcanzó `dailyLimit`, lanza `AiQuotaExceededException`.
- `void recordSuccess(User user)`: incrementa el contador después de una operación válida.
- Resuelve la fecha con `LocalDate.now(clock.withZone(ZoneId.systemDefault()))`; la zona del navegador no participa en la cuota.
- Solo cuenta respuestas parseadas y validadas. Incluye interpretaciones con varias intenciones; no cuenta errores, cancelaciones, respuestas inválidas ni transcripciones vacías.
- Usa `@Lock(PESSIMISTIC_WRITE)` y transacción para evitar carreras.
- Las operaciones fallidas, canceladas o rechazadas no se registran.

### 3.4 Extracción del borrador

`NoteDraft` (record interno):

- `title`, `content`, `checklistMode`, `checklistItems`, `rememberAt`, `tagIds`, `multipleIntents`, `warnings`.

`NoteDraftExtractor`:

- Interfaz `NoteDraft extract(String text, ZoneId zone, Instant now, List<Tag> allowedTags)`.
- Implementación `GroqNoteDraftExtractor` con `ChatClient`.
- Prompt en `src/main/resources/prompts/note-draft.st` con:
  - Instrucción de devolver solo JSON válido.
  - Fecha y hora local actual, día de la semana y zona horaria.
  - Lista cerrada de etiquetas permitidas (id y nombre).
  - Texto del usuario delimitado como dato JSON, no como instrucciones.
  - Campo `isMemoraNote` y `reason`; si no es nota, no genera contenido.
  - Reglas de contenido, checklist, recordatorio y múltiples intenciones; el modelo no devuelve título.
  - Nunca incluye identificador de cuenta, nombre, email, estado ni otros datos del usuario.
- El spike confirmó que `ChatClient...call().entity(...)` devolvía contenido vacío con Groq. Se usa `call().content()` y parseo explícito con Jackson a `NoteDraftModel`; se limpian cercas Markdown y cualquier fallo de parseo se trata como respuesta inválida. Si `isMemoraNote` no es `true`, se lanza `OutOfScopeException` y no se devuelve contenido.
- `NoteDraftModel` es un record separado del dominio para no confiar en el modelo.

`NoteDraftNormalizer` (funciones puras, con `now` y `zone` como parámetros):

- `generatedTitle`: “Recordatorio interpretado por IA · dd/MM/yyyy HH:mm” si hay recordatorio; si no, “Lista generada por IA · …” si hay checklist; si no, “Contenido generado por IA · …”. Usa la hora de inicio de la solicitud y la zona IANA del navegador, con servidor como fallback. Prioridad: recordatorio > lista > contenido.
- `normalizeContent`: trim, límite 2500 puntos de código; si el modelo devuelve checklist válida, contenido vacío. Si la checklist es inválida, se descarta solo la checklist y se conserva el contenido válido.
- `normalizeChecklist`: al menos un ítem con texto no vacío y suma de los textos de los ítems, sin separadores, <= 2500 puntos de código; si no, descartar checklist y advertir.
- `normalizeTags`: conservar solo ids de la lista visible permitida, máximo 5, sin duplicados; aplicar la regla de que prevalece la global. No crear etiquetas.
- `resolveReminder`: recibe la expresión literal que devuelve el modelo y la resuelve en el servidor con `Instant now`, `ZoneId` y `SpanishReminderResolver`. Acepta hoy, mañana, pasado mañana, ayer, anteayer, “este/el/próximo <día>”, “en N días/semanas”, fechas `dd/MM`, `dd de <mes>`, ISO y “quincena de <mes>” (día 15). “Este viernes” incluye hoy; “el/próximo viernes” usa la siguiente ocurrencia. Si hay fecha sin hora, usa `00:00` local. Solo hora, ambigüedad, varias fechas, zona inválida o DST no resoluble devuelven `null` y advertencia. Las fechas pasadas, con o sin hora, se aceptan. Solo se acepta una zona IANA presente en `ZoneId.getAvailableZoneIds()`; los offsets como `+03:00` se rechazan.
- `warnings`: códigos `TITLE_TRUNCATED`, `CONTENT_TRUNCATED`, `CHECKLIST_DISCARDED`, `TAGS_DISCARDED`, `REMINDER_AMBIGUOUS`, `REMINDER_ZONE_INVALID`, `MULTIPLE_INTENTS`, `TAGS_UNAVAILABLE`, `PROVIDER_ERROR`.

`NoteInterpretationService`:

1. Cargar usuario activo.
2. Verificar `AiProperties.enabled`; si está desactivado, lanzar `AiDisabledException`.
3. Verificar consentimiento vigente; si no, lanzar `AiConsentRequiredException`.
4. Verificar cuota.
5. Cargar etiquetas visibles con `TagService.list`; si falla, lanzar `TagCatalogUnavailableException` (502 con `detail` fijo), no llamar al proveedor y no consumir cuota. El frontend la trata como `TAGS_UNAVAILABLE` y abre el editor manual.
6. Aplicar `NoteScopeGuard` antes de la cuota y del proveedor; si el texto es código o una petición de asistente evidente, lanzar `OutOfScopeException` sin llamar a Groq.
7. Llamar al extractor con texto, zona, `Clock` y etiquetas.
8. Normalizar y validar.
9. Revalidar consentimiento antes de responder; si fue revocado, descartar el resultado y no registrar cuota.
10. Registrar cuota solo si la respuesta fue parseada y validada; las varias intenciones cuentan, las respuestas inválidas y fuera de alcance no.
11. Devolver `NoteInterpretationResponse` con `draft` y `warnings`; si `multipleIntents`, `draft = null` y advertencia.
12. No persistir nada.

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
    "title": "Lista generada por IA · 26/10/2026 14:30",
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

Respuesta 200 con varias intenciones:

```json
{
  "draft": null,
  "warnings": ["MULTIPLE_INTENTS"]
}
```

Errores:

- 400: texto vacío, texto fuera del límite o request inválido.
- 422: texto fuera de alcance (código, pregunta general, traducción, cálculo o explicación).
- 428: consentimiento requerido.
- 429: cuota diaria agotada.
- 502: fallo del proveedor, error 429 del proveedor, bloqueo de contenido o respuesta inválida.
- 504: timeout del proveedor.
- 503: IA desactivada.
- Una zona horaria inválida no genera 400: el recordatorio queda vacío con advertencia.
- Los errores del proveedor no consumen cuota.

El controlador no accede a repositorios; delega en `NoteInterpretationService`.

### 3.6 Límites de texto y validación

- `CodePointLimits.count(String)`, `truncate(String, int)` y `isWithin(String, int)`; cuentan puntos de código Unicode, no unidades UTF-16.
- El request de interpretación usa `@NotBlank`; el límite de 2500 puntos de código se valida en el servicio con `CodePointLimits`.
- Unificar la validación de notas: título de 1 a 200 puntos de código, contenido de 0 a 2500 y suma de textos de checklist de hasta 2500. Reemplazar los `@Size` de `CreateNoteRequest`, `UpdateNoteRequest`, `ChecklistItem` y `UpdateChecklistItemRequest` por un validador de puntos de código.
- Actualizar `NoteService`, `ChecklistValidator` y los tests existentes de notas; el cambio no debe alterar el comportamiento de notas válidas.
- El borrador se ajusta a los límites de la nota antes de abrir el editor para que el `POST /notes` posterior no falle.
- La validación de etiquetas usa los ids de la lista visible, no los nombres, para evitar ambigüedad global/privada; la comparación de nombres reutiliza `TextNormalizer.normalizeTagName`.
- Las columnas de PostgreSQL se mantienen; el límite se aplica en la capa de validación, no se agrega una migración de longitud.

### 3.7 Idempotencia en la creación

- Agregar `idempotency_key` nullable (longitud 36) a `notes` y restricción única `(user_id, idempotency_key)`.
- Agregar `idempotencyKey` opcional a `CreateNoteRequest`.
- `NoteService.create`: si la misma clave, el mismo usuario y los mismos datos de la nota ya existen, devolver la nota existente con 200. Si la clave existe con datos distintos, responder 409.
- La restricción única es la red de seguridad ante carreras; al capturar `DataIntegrityViolationException`, se recupera la nota existente y se compara el contenido antes de decidir entre devolverla o responder 409.
- El cliente genera una clave por borrador, la reutiliza en reintentos y genera una nueva al iniciar otra captura.
- No exponer la clave en `NoteResponse`.
- Las notas manuales sin clave siguen funcionando igual.

### 3.8 Errores estándar

Agregar excepciones y mapeos en `GlobalExceptionHandler`:

- `AiConsentRequiredException` -> 428.
- `AiQuotaExceededException` -> 429.
- `AiDisabledException` -> 503.
- `AiProviderException` -> 502, incluidos 429 del proveedor, bloqueos de contenido y respuestas inválidas.
- `OutOfScopeException` -> 422 con detalle fijo “Solo puedo convertir notas, recordatorios y tareas”.
- `TagCatalogUnavailableException` -> 502 con `detail` fijo “No se pudieron cargar las etiquetas”, sin llamar al proveedor ni consumir cuota; el frontend lo mapea a `TAGS_UNAVAILABLE`.
- `AiTimeoutException` -> 504.
- `IdempotencyConflictException` -> 409, solo para misma clave con datos distintos.
- Mantener el cuerpo `{title, status, detail}` sin detalles internos del proveedor.
- Los logs, en todos los niveles, solo pueden contener operación, estado, latencia y correlación; no texto, etiquetas, zona, identificador de cuenta, cuerpo de respuesta del proveedor ni mensaje crudo de excepción.
- `AiProviderException` se registra de forma sanitizada: clase y estado genérico, sin cuerpo del proveedor.

## 4. Frontend

### 4.1 Estructura

Nueva carpeta `frontend/src/features/notes/capture/`:

- `api/captureApi.ts`: `interpretNote`, `updateAiConsent`.
- `components/CaptureFlow.tsx`: orquesta captura, consentimiento, borrador y editor.
- `components/CaptureSheet.tsx`: textarea, contador de puntos de código, acciones.
- `components/AiConsentDialog.tsx`: aviso, aceptar, rechazar y cierre sin decisión.
- `components/DraftNotice.tsx`: advertencias y texto original.
- `hooks/useCapture.ts`: estado del flujo.
- `hooks/useCaptureTags.ts`: carga de etiquetas visibles, estado de error y `TAGS_UNAVAILABLE`.
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
- `features/notes/model/validation.ts`: `buildCreatePayload` incluye la clave y los límites se validan por puntos de código.
- `features/notes/api/notesApi.ts`: envía la clave en el body.
- `features/account/components/ProfileDialog.tsx`: sección de consentimiento de IA.
- `features/account/api/accountApi.ts`: `updateAiConsent`.
- `features/account/model/copy.ts`: textos del consentimiento.
- `features/auth/model/types.ts`: `aiConsent`, `aiConsentRequired`, `aiConsentNoticeVersion`, `aiEnabled`.
- `features/auth/api/authApi.ts`: `getMe` ya devuelve el perfil; ajustar el tipo.

### 4.2 Flujo de captura

`CaptureBar` y el FAB abren `CaptureFlow`. La acción de captura debe quedar antes de la lista y visible sin desplazamiento inicial en 390×844 y 1280×800; se verifica en la comprobación manual de T10.

`CaptureFlow`:

- Estado: `text`, `status` (`editing`, `interpreting`, `review`, `error`), `draft`, `warnings`, `error`, `consentDialogOpen`, `manualDirect`.
- Al abrir:
  - Si `!aiEnabled` o `aiConsent` es `DENIED`/`REVOKED`, renderizar directamente `NoteEditor` en modo manual (`manualDirect=true`) con `initialText=text`, explicación y sin acciones de IA.
  - Si `aiConsent` es `NOT_SET` o (`GRANTED` con `aiConsentRequired=true`), renderizar `CaptureSheet`; el diálogo se abre al revisar.
  - Si `aiConsent` es `GRANTED` vigente, renderizar `CaptureSheet` y permitir interpretar.
- `onReview`:
  - Si `manualDirect`, no se muestra la acción de revisión.
  - Si `!aiEnabled`, abrir el editor manual con explicación y no llamar al proveedor.
  - Si `aiConsentRequired` (incluye `NOT_SET` y `GRANTED` de una versión anterior), abrir `AiConsentDialog`.
  - Si el consentimiento es `DENIED` o `REVOKED`, abrir el editor manual con la explicación de que la IA se habilita desde el perfil.
  - Si el consentimiento está vigente, llamar a `interpretNote`.
  - Mostrar carga y permitir cancelar con botón y Escape; al cancelar, descartar la respuesta tardía, no contar la operación y volver a `editing` con el texto.
  - Si el usuario revoca durante la captura o la interpretación, conservar el texto, pasar a `manualDirect` y descartar la respuesta tardía.
  - Si `useCaptureTags` falla, conservar el texto, mostrar `TAGS_UNAVAILABLE` y pasar a `manualDirect` con `initialText=text`, sin llamar a `interpretNote`.
- Éxito: pasar a `review` y renderizar `NoteEditor` con `initialDraft`, `warnings` y `originalText`.
- Fallo, timeout, cuota, error del proveedor o respuesta inválida: pasar a `review` con valores de fallback (título primeros 60 puntos de código, contenido texto completo) y advertencia; no contar la operación.
- `multipleIntents`: abrir el editor manual con el texto completo, sin borrador, y advertencia. La operación sí cuenta porque la respuesta fue válida.
- `onManual`: navegar a `/home/new` con estado `{ manualText: text }`; `NotesPage` lo usa como texto inicial.
- `onCancel` del editor: volver a `editing` conservando el texto.
- `onSave`: crear la nota, recargar y cerrar el flujo.
- Si el usuario abandona, no se persiste nada.

`CaptureSheet`:

- No se renderiza cuando `manualDirect=true`.
- Click en el fondo del modal: cierra si el texto está vacío; si hay texto, abre `ConfirmDialog` antes de descartarlo.
- Mientras interpreta, el click fuera no cierra; la acción explícita es “Cancelar”.
- `textarea` con `maxLength` visual basado en puntos de código.
- Contador `n/2500` calculado con `Array.from(text).length`.
- `Revisar` deshabilitado si el texto queda vacío, excede el límite, está cargando o, con IA activa, hay etiquetas sin cargar.
- `Modo manual`.
- `aria-live` para carga, errores y apertura del consentimiento.
- En 011b se agrega el micrófono.

`AiConsentDialog`:

- Portal modal con `useModalBehavior`.
- Aviso versionado que nombra a Groq, indica que se envían texto, audio, zona y etiquetas necesarias, y aclara que el modo manual no envía datos.
- `Aceptar` -> `PUT /users/me/ai-consent` con `GRANTED` y la versión vigente; actualizar perfil; reintentar la acción.
- `Rechazar` -> `PUT` con `DENIED`; actualizar perfil y abrir modo manual.
- Cerrar con X, Escape o fondo -> no llamar al endpoint, abrir modo manual solo para ese intento y no modificar el estado: si era `NOT_SET` sigue `NOT_SET`; si era `GRANTED` de una versión anterior sigue `GRANTED` con `aiConsentRequired=true`.
- Si falla la actualización, mostrar error y no enviar texto.

`ProfileDialog`:

- Sección “Inteligencia artificial”.
- Estado actual, versión del aviso y botón para habilitar o revocar.
- Al habilitar, registrar `GRANTED` con la versión vigente; al revocar, registrar `REVOKED`, actualizar el perfil y reflejar el cambio de inmediato.
- Si cambió la versión del aviso, mostrar que se requiere un nuevo consentimiento.

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
- Genera una clave `crypto.randomUUID()` por borrador nuevo, la reutiliza en reintentos y genera otra al iniciar una captura distinta.
- Si el servidor responde 409 porque la clave se reutilizó con datos distintos, muestra el error, conserva el texto y permite reintentar con una clave nueva.
- `buildCreatePayload` incluye `idempotencyKey`.

`NoteEditor`:

- Muestra `DraftNotice` con las advertencias y un bloque desplegable con el texto original completo.
- Mantiene el comportamiento actual de checklist, etiquetas, recordatorio y confirmación de descarte.
- Muestra advertencias específicas para fechas de solo fecha/hora, etiquetas descartadas, checklist descartada, truncados y múltiples intenciones.
- Valida título y contenido en puntos de código antes de guardar; si el borrador no cabe, permite corregirlo sin perder el texto.
- Conserva el estado `saving` de `useNoteEditor`: deshabilita el submit y evita dobles envíos mientras se guarda; `aria-live` anuncia “Guardando”, “Nota guardada” y error de guardado.
- El borrador no incluye `isPinned` ni `isArchived`; `draftToFormValues` no los asigna y solo se envían si el usuario los cambia explícitamente en el editor.
- Al cancelar, `CaptureFlow` recupera el texto original.

### 4.4 Funciones puras

- `countCodePoints(text)`: `Array.from(text).length`.
- `firstCodePoints(text, n)`.
- `trimToCodePoints(text, n)`.
- `draftToFormValues(draft, tags)`.
- `fallbackFormValues(text)`.
- `warningMessage(code)`.
- `mapCaptureError(error)`.
- `buildCreatePayload(values, items, idempotencyKey)`.
- `isIdempotencyConflict(error)`.
- `canReview(text, loading, tagsLoaded)`.

## 5. Contratos y datos

### 5.1 Tablas nuevas

- `ai_consent_events`: auditoría append-only con `GRANTED`, `DENIED` y `REVOKED`; sin evento para cierre sin decisión; retención mientras exista la cuenta y borrado en cascada con ella mediante FK `ON DELETE CASCADE`.
- `ai_usage`: contador diario por usuario con fecha del servidor; FK `ON DELETE CASCADE` con la cuenta.
- `notes.idempotency_key`: nullable, con restricción única `(user_id, idempotency_key)`.

No se modifica el esquema de notas más allá de la columna de idempotencia. Los límites de 200/2500 se validan por puntos de código en la capa de aplicación; no se cambian longitudes de columnas.

### 5.2 Variables de entorno

```
AI_ENABLED=true
GROQ_API_KEY=...
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_CHAT_MODEL=openai/gpt-oss-20b
GROQ_MAX_OUTPUT_TOKENS=2048
AI_TIMEOUT_MS=20000
AI_DAILY_LIMIT=50
AI_MAX_INPUT_CODE_POINTS=2500
AI_NOTICE_VERSION=1
```

Las claves reales no se versionan; `.env.example` solo lleva marcadores.

## 6. Decisiones y alternativas descartadas

1. **Spring AI con endpoint compatible con OpenAI** en lugar de llamadas REST manuales. Alternativa descartada: `RestClient` directo; se usará solo si el spike demuestra incompatibilidad con Spring Boot 4.1.1.
2. **Consentimiento append-only** en lugar de columnas mutables en `users`. Alternativa descartada: un booleano y una fecha; no permite auditoría.
3. **Cuota en base de datos** en lugar de memoria. Alternativa descartada: `ConcurrentHashMap`; se pierde al reiniciar y no es consistente entre instancias. La fecha se calcula con la zona del servidor; alternativa descartada: zona del navegador, manipulable para reiniciar la cuota.
4. **Idempotencia con columna nullable** en `notes` en lugar de tabla separada. Alternativa descartada: tabla de claves; más compleja para el alcance educativo. La misma clave con los mismos datos devuelve la nota existente; con datos distintos se responde 409. Alternativa descartada: rechazar toda repetición con 409, que rompe reintentos tras una respuesta perdida.
5. **Flujo de captura inline** en `NotesPage` en lugar de una ruta con estado. Alternativa descartada: navegar con `location.state`; se pierde el texto al cancelar o recargar.
6. **Ids de etiquetas** en lugar de nombres. Alternativa descartada: nombres; hay ambigüedad global/privada.
7. **Puntos de código Unicode** para la captura. Alternativa descartada: longitud UTF-16; no coincide con la decisión del usuario.
8. **Resolución de fechas en el servidor** con `Clock` y `ZoneId`. Alternativa descartada: resolver en el navegador o dejar que el modelo haga aritmética de fechas. Solo se aceptan fecha y hora completas; las expresiones de solo fecha, incluidas las relativas, quedan vacías con advertencia. Alternativa descartada: completar con una hora por defecto, que inventa datos.
9. **Múltiples intenciones -> editor manual**. Alternativa descartada: dividir automáticamente en varias notas; contradice el alcance. La señal proviene del modelo y se prueba con fixtures controlados.
10. **Salida estructurada validada** en lugar de texto libre del modelo. Alternativa descartada: parsear texto libre con expresiones regulares.
11. **Puntos de código Unicode en todos los límites**. Alternativa descartada: mantener UTF-16 solo en notas; un texto válido en captura podría fallar al guardar.
12. **Cierre del consentimiento sin decisión = `NOT_SET`**. Alternativa descartada: registrar `DENIED` al cerrar; un cierre accidental bloquearía la IA hasta ir al perfil.
13. **Revalidar consentimiento antes de responder**. Alternativa descartada: confiar solo en la comprobación previa; una revocación durante la llamada devolvería datos no autorizados.
14. **Errores 429 y bloqueos del proveedor como fallo genérico**. Alternativa descartada: exponer el código del proveedor; filtra detalles internos y confunde con la cuota propia.
15. **Logs mínimos y auditoría privada**. Alternativa descartada: registrar texto o identificador de cuenta para soporte; expone datos personales y contradice la constitución.
16. **Benchmark manual de RNF-1** en lugar de una prueba de CI. Alternativa descartada: exigir p95 en CI con un proveedor externo; resulta inestable y no reproducible.
17. **Parseo explícito de `call().content()`** en lugar de `entity(...)`. Alternativa descartada: `BeanOutputConverter`/structured output; con Groq devolvió contenido vacío en el spike.
18. **Máximo de salida 2048 tokens** en lugar de 512. Alternativa descartada: 512; el modelo de razonamiento truncaba el JSON y lo dejaba inválido.
19. **Resolución determinista de fechas relativas en el servidor**. El modelo extrae la expresión literal y el servidor calcula con `Clock`/`ZoneId`. Alternativa descartada: dejar que el LLM haga la aritmética; falla con “este viernes” y cerca de medianoche por el desfase UTC/local.
20. **Semántica de “este viernes”**: incluye hoy si hoy es viernes; “el/próximo viernes” toma la siguiente ocurrencia. Alternativa descartada: tratar todos los modificadores igual.
21. **Fecha sin hora = 00:00 local**. Alternativa descartada: dejar el recordatorio vacío; el usuario espera que una fecha sola genere recordatorio.
22. **“Quincena de <mes>” = día 15**. Alternativa descartada: interpretar una quincena como rango; el modelo de recordatorio solo admite una fecha/hora.
23. **Doble defensa de alcance: prefiltro local + `isMemoraNote`**. Alternativa descartada: confiar solo en el prompt; el texto del usuario puede contener instrucciones.
24. **Texto del usuario como dato JSON delimitado**. Alternativa descartada: enviarlo como mensaje de usuario libre; el modelo puede obedecer “haz el código”.
25. **Fuera de alcance no consume cuota**. Alternativa descartada: contar rechazos; no producen una nota útil.
26. **Título generado por el servidor**, no por el modelo. Alternativa descartada: aceptar el título del LLM; el usuario quiere identificar el tipo de interpretación y la fecha de solicitud.
27. **Prioridad Recordatorio > Lista > Contenido** para el título. Alternativa descartada: priorizar checklist; el recordatorio es el dato más específico.
28. **Fecha/hora de solicitud en `dd/MM/yyyy HH:mm`**, zona del navegador y servidor como fallback. Alternativa descartada: fecha del recordatorio o ISO; confunde el momento de la interpretación con el del aviso.
29. **Click fuera con confirmación si hay texto**. Alternativa descartada: cerrar siempre; el usuario puede perder una captura larga por accidente.
30. **Durante la interpretación, el backdrop no cierra**. Alternativa descartada: cancelar implícitamente la solicitud; la acción explícita es el botón “Cancelar”.
17. **Validación estricta de zona IANA** en lugar de aceptar cualquier `ZoneId`. Alternativa descartada: aceptar offsets como `+03:00`; la spec exige una zona IANA.
18. **Editor manual directo cuando no hay IA disponible** en lugar de mostrar la captura con acciones deshabilitadas. Alternativa descartada: obligar a pulsar “Revisar” para descubrir que la IA no está disponible.
19. **Lista blanca de logs y excepción del proveedor sanitizada** en lugar de confiar en que los mensajes no contienen datos. Alternativa descartada: registrar cuerpos o mensajes crudos; puede filtrar contenido.
20. **Fallo de etiquetas como estado propio en el frontend** (`TAGS_UNAVAILABLE`) en lugar de tratarlo como fallo genérico. Alternativa descartada: mostrar un error de proveedor sin explicar que el problema son las etiquetas.
21. **Conservar el bloqueo de submit existente** mientras se guarda, además de la idempotencia. Alternativa descartada: confiar solo en la clave del servidor; el usuario podría disparar dos peticiones y ver un error innecesario.

## 7. Estrategia de tests

Backend:

- Unitarios:
  - `CodePointLimitsTest`: conteo, truncado, emojis, pares sustitutos y límites 60/200/2500.
  - `NoteValidationTest`: título, contenido y checklist por puntos de código en `CreateNoteRequest`, `UpdateNoteRequest`, `ChecklistItem`, `UpdateChecklistItemRequest` y `ChecklistValidator`.
  - `NoteScopeGuardTest`: código, fences, preguntas, traducciones, cálculos y notas válidas.
  - `SpanishReminderResolverTest`: “este viernes a las 11” desde lunes, “mañana a las 18”, “este/el lunes”, “próximo viernes”, “en 3 días”, “quincena de noviembre”, fechas explícitas, variantes de hora, pasado, ISO, fecha sin hora a 00:00, solo hora y bordes de viernes.
  - `NoteDraftNormalizerTest`: títulos generados por tipo, prioridad recordatorio, recortes, checklist válida e inválida con contenido, etiquetas, fechas relativas, DST, fechas pasadas completas, zona IANA/offset inválido, múltiples intenciones y advertencias.
  - `NoteInterpretationServiceTest`: consentimiento `NOT_SET`/`DENIED`/`REVOKED`, versión nueva con `GRANTED` anterior, IA desactivada, cuota, fallo de catálogo de etiquetas sin proveedor ni cuota, fallback, no persistencia y no conteo en errores.
  - `AiConsentServiceTest`: grant/deny/revoke, versión, estado `NOT_SET`, `aiConsentRequired` con `GRANTED` anterior, cierre sin evento y auditoría.
  - `AiUsageServiceTest`: límite, reinicio con zona del servidor, múltiples intenciones, respuestas inválidas y errores del proveedor.
  - `NoteServiceTest`: idempotencia con misma clave/mismos datos, misma clave/datos distintos, carrera y creación normal.
- Web:
  - `NoteInterpretationControllerTest`: 200, 200 con zona inválida y recordatorio vacío, 400, 428, 429, 502 por proveedor, 502 por etiquetas, 503, 504; USER/ADMIN.
  - `UserControllerTest`: perfil con `aiEnabled` y campos de consentimiento; `PUT /users/me/ai-consent` con `GRANTED`, `DENIED`, `REVOKED` y versión inválida.
  - `NoteControllerTest`: `POST /notes` con y sin idempotency key; misma clave/mismos datos devuelve la nota; misma clave/datos distintos devuelve 409; ADMIN recibe 403.
- Integración:
  - Reemplazar `NoteDraftExtractor` por un fake en el perfil `test`; no llamar a Groq.
  - Verificar que no se registran texto, etiquetas, zona, cuenta, cuerpo del proveedor ni mensaje crudo de excepción en logs.
  - Verificar que el prompt no contiene identidad del usuario.
  - Eliminar una cuenta y comprobar la cascada de `ai_consent_events` y `ai_usage`.
- Manual:
  - Script o prueba con `GROQ_API_KEY` real, fuera de CI, documentado en `docs/ai.md`.
  - Benchmark manual de RNF-1: 20 solicitudes consecutivas de 2500 puntos de código, proveedor disponible, reporte de p95.
  - Verificar `CaptureBar`/FAB sin scroll inicial en 390×844 y 1280×800.
  - Auditoría WCAG manual de captura, consentimiento, revisión y errores: teclado, foco, contraste, etiquetas accesibles, anuncios y movimiento reducido.

Frontend:

- `CaptureFlow`: apertura con editor manual directo si IA desactivada/`DENIED`/`REVOKED`; error 422 fuera de alcance con aviso y editor manual; click fuera con confirmación si hay texto; `NOT_SET` y `GRANTED` anterior abren diálogo; cierre sin decisión conserva el estado; texto vacío; contador de puntos de código; éxito; fallback; múltiples intenciones; cancelación con Escape; respuesta tardía descartada; fallo de etiquetas; conservación del texto.
- `CaptureSheet`: click en backdrop/Escape cierra si vacío; con texto abre confirmación; durante interpretación no cierra por backdrop.
- `AiConsentDialog`: aceptar, rechazar, cerrar sin PUT, versión, `GRANTED` anterior, error de red, foco y Escape.
- `ProfileDialog`: habilitar/revocar IA y aviso de versión.
- `NoteEditor`: borrador precargado, advertencias de solo fecha, texto original, fallback, límites por puntos de código, clave de idempotencia reutilizada, 409 con clave nueva, doble submit bloqueado, anuncio de guardado y ausencia de `isPinned`/`isArchived` en el borrador.
- `notesApi` y `captureApi`: payloads y manejo de 409/428/429/502/504.
- Responsive: 390-2560 formal; 320 y zoom 200 % como regresión no bloqueante.
- Accesibilidad: teclado, `aria-live`, foco, contraste, etiquetas accesibles y `prefers-reduced-motion`.
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
- Groq devolvió contenido vacío con `entity`; se usa parseo explícito de `content`. El modelo de razonamiento consume tokens y requiere `max-tokens` 2048 para no truncar el JSON.
- El modelo no debe calcular fechas relativas; el servidor usa `SpanishReminderResolver` con `Clock` y la zona IANA. Si se vuelve a delegar en el LLM, “este viernes” puede resolverse mal.
- El prefiltro local es conservador y puede no bloquear todas las preguntas; el campo `isMemoraNote` y el rechazo 422 son la segunda barrera. Nunca se devuelve contenido si no es `true`.
- Disponibilidad y cuota gratuita de Groq; la interfaz debe degradar a manual.
- Cambio de validación de notas a puntos de código: afecta DTOs, checklist y tests existentes; debe probarse con emojis y pares sustitutos.
- Diferencia entre la medianoche del servidor y la del usuario; la spec y la UI deben explicar que la cuota se reinicia con la zona del servidor.
- Expresiones de solo fecha, como “mañana”, quedan sin recordatorio; es una decisión deliberada y debe comunicarse con una advertencia clara.
- Carrera de idempotencia; la restricción única y la comparación de contenido son la red de seguridad.
- Clave de idempotencia reutilizada con datos distintos; se responde 409 y se conserva el texto.
- Precisión del contador diario ante concurrencia; se usa bloqueo pesimista.
- Inyección de instrucciones desde el texto; el borrador no ejecuta acciones y el backend valida.
- Privacidad: el aviso debe nombrar a Groq y cubrir audio, texto, zona y etiquetas; los logs no deben incluir datos personales.
- Retención y borrado del historial de consentimiento; debe cubrirse con tests de cascada al eliminar la cuenta.
- Un offset horario como `+03:00` es un `ZoneId` válido en Java pero no una zona IANA; la validación debe rechazarlo y advertir.
- El fallo de etiquetas y el fallo del proveedor comparten 502; el frontend debe distinguirlos por el estado de `useCaptureTags` o por el `detail` fijo de `TagCatalogUnavailableException` para mostrar `TAGS_UNAVAILABLE`.
- El editor manual directo cambia el punto de entrada de la captura; debe conservar el texto si la IA se desactiva o se revoca a mitad del flujo.
- Los logs de excepciones del proveedor pueden arrastrar el cuerpo de la respuesta; la sanitización debe probarse.
- La visibilidad de la acción de captura en 390×844 y 1280×800 requiere verificación visual manual.
- El benchmark de RNF-1 depende del proveedor y no se ejecuta en CI; queda documentado como verificación manual.

## 9. Trazabilidad RF

| RF | Implementación |
|---|---|
| RF-1, RF-2 | `CaptureBar`, `CaptureFlow`, `CaptureSheet`, viewports 390×844 y 1280×800 |
| RF-3 | `CodePointLimits`, contador y validación del frontend |
| RF-4..RF-11 | `AiConsentService`, `AiConsentEvent`, `aiConsentRequired`, `AiConsentDialog`, `ProfileDialog`, `SecurityConfig`, sanitización de logs |
| RF-12..RF-19 | `NoteInterpretationService`, `NoteDraftNormalizer`, `NoteDraftExtractor`, `CodePointLimits`, prompt sin identidad ni título, título generado por tipo/fecha |
| RF-15 | `useCaptureTags`, `TagCatalogUnavailableException`, fallback manual sin proveedor ni cuota |
| RF-20..RF-23 | `CaptureFlow`, `NoteEditor`, `useNoteEditor`, `fallbackFormValues` |
| RF-24, RF-25 | `SpanishReminderResolver` + `NoteDraftNormalizer` con `Clock`, validación IANA, fechas relativas, quincena, fecha sin hora a 00:00 y solo hora vacía |
| RF-34 | `NoteScopeGuard`, `isMemoraNote`, `OutOfScopeException` 422, fallback manual sin cuota |
| RF-35 | `CaptureSheet`, `ConfirmDialog`, cierre por backdrop y confirmación de descarte |
| RF-26, RF-27 | `CaptureFlow`, estado de carga, cancelación con botón/Escape, texto original |
| RF-28 | `Note.idempotencyKey`, `NoteService`, `useNoteEditor`, bloqueo de submit y comparación de datos |
| RF-29 | `AiUsageService` con zona del servidor, `AiQuotaExceededException` |
| RF-30 | `SecurityConfig`, `@AuthenticationPrincipal`, prueba ADMIN en `POST /notes` |
| RF-31..RF-33 | Componentes accesibles, anuncio de guardado, `useModalBehavior`, responsive, `prefers-reduced-motion` |
| RNF-1..RNF-10 | Benchmark manual, timeout, cuota, logs, minimización, servidor, auditoría, cascada y tests |

## 10. Fuera de este plan

- Micrófono y transcripción (Spec 011b).
- MCP, asistente, RAG y documentos (specs posteriores).
- Búsqueda o edición de notas existentes por lenguaje natural.
- Reordenamiento o acciones por voz.
