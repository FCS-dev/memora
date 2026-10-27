# Tareas 011a — Captura de notas en lenguaje natural: texto

Spec: `specs/011a-captura-texto/spec.md` (aprobada)
Plan: `specs/011a-captura-texto/plan.md` (aprobado)

- [x] **T1. Spike Spring AI + Groq y configuración base.** RNF-1, RNF-9
- Hecho cuando: el BOM/starter de Spring AI está agregado, `AiProperties`/`AiConfig` arrancan con `AI_ENABLED=false` sin `GROQ_API_KEY`, un smoke test manual con clave real devuelve un JSON válido y la compatibilidad con Spring Boot 4.1.1 queda documentada en `docs/ai.md`.

- [x] **T2. Consentimiento de IA, auditoría y perfil.** RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-30, RNF-10
- Hecho cuando: `ai_consent_events` registra `GRANTED`, `DENIED` y `REVOKED` con versión y fecha; cerrar el diálogo no crea evento y conserva el estado (`NOT_SET` o `GRANTED` de versión anterior); `aiConsentRequired` distingue `NOT_SET` y `GRANTED` vencido; un cambio de versión exige un nuevo consentimiento; `GET /users/me` devuelve `aiEnabled`, `aiConsent`, `aiConsentRequired` y `aiConsentNoticeVersion`; `PUT /users/me/ai-consent` funciona solo para USER y rechaza una versión inválida; el historial y el uso se eliminan en cascada con la cuenta y no son visibles para ADMIN; ningún log contiene datos sensibles; los tests cubren versión vencida, versión inválida, revocación, cierre sin decisión, cascada y ausencia de datos sensibles.

- [x] **T3. Cuota diaria y errores de IA.** RF-29, RNF-2, RNF-3, RNF-4
- Hecho cuando: `ai_usage` cuenta solo respuestas parseadas y validadas por usuario y fecha del servidor; las varias intenciones cuentan; errores, cancelaciones y respuestas inválidas no cuentan; la operación 51 responde 429; un 429 o bloqueo del proveedor responde 502 y no consume cuota; `GlobalExceptionHandler` mapea 409/428/429/502/503/504 sin detalles del proveedor.

- [x] **T4. Extracción y normalización del borrador.** RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-24, RF-25
- Hecho cuando: `NoteDraftExtractor` devuelve el contrato interno y su prompt no incluye identidad del usuario; `NoteDraftNormalizer` usa puntos de código, cubre título de respaldo de 60, recortes 200/2500, checklist válida sobre contenido, checklist inválida que conserva contenido válido, máximo cinco etiquetas visibles, etiquetas ajenas, normalización de nombres por mayúsculas/espacios/NFC, fechas relativas (“este viernes a las 11”, “el viernes”, “mañana”, “en 3 días”, “quincena de noviembre”), fecha sin hora a 00:00, solo hora vacía, fechas pasadas con o sin hora aceptadas, DST, zona IANA válida, offsets como `+03:00` rechazados con `REMINDER_ZONE_INVALID` y múltiples intenciones; los tests usan un extractor fake, `Clock` fijo y fixtures controlados.

- [x] **T5. Endpoint `POST /notes/interpret`.** RF-12..RF-25, RF-29, RF-30
- Hecho cuando: un USER con consentimiento y cuota recibe 200 con borrador y advertencias; varias intenciones reciben 200 con `draft=null`; una zona inválida recibe 200 con recordatorio vacío y advertencia; una expresión relativa con hora completa o sin hora se resuelve en el servidor; sin consentimiento recibe 428; sin cuota recibe 429; fallo o 429 del proveedor recibe 502; fallo de etiquetas recibe 502 con `detail` fijo sin llamar al proveedor ni consumir cuota; IA desactivada recibe 503; timeout recibe 504; ADMIN recibe 403; no se persiste ninguna nota; los logs no contienen texto, etiquetas, zona, cuenta, cuerpo del proveedor ni mensaje crudo de excepción.

- [x] **T6. Idempotencia y validación de notas por puntos de código.** RF-28, RF-16
- Hecho cuando: `notes.idempotency_key` existe con restricción única por usuario; la misma clave y los mismos datos devuelven la nota existente; la misma clave con datos distintos responde 409; las notas manuales sin clave siguen funcionando; título, contenido y checklist se validan por puntos de código en `CreateNoteRequest`, `UpdateNoteRequest`, `ChecklistItem`, `UpdateChecklistItemRequest`, servicio y checklist; ADMIN recibe 403 en `POST /notes`; los tests de `NoteService`, `NoteController` y validación de notas están actualizados.

- [x] **T7. API frontend, consentimiento y perfil.** RF-4..RF-11
- Hecho cuando: `AuthUser` incluye `aiEnabled`, `aiConsent`, `aiConsentRequired` y `aiConsentNoticeVersion`; `captureApi` interpreta y actualiza consentimiento; `CaptureFlow` usa `aiConsentRequired` para abrir el diálogo también con `GRANTED` de versión anterior; `AiConsentDialog` muestra el aviso versionado que nombra a Groq y cubre texto, zona y etiquetas, y acepta, rechaza y cierra sin llamar al endpoint; el cierre conserva `NOT_SET` o el `GRANTED` anterior; el perfil permite habilitar/revocar y avisa de una versión nueva; los errores de red no envían texto.

- [x] **T8. Flujo de captura en la vista de notas.** RF-1, RF-2, RF-3, RF-9, RF-20, RF-21, RF-26, RF-27
- Hecho cuando: `CaptureBar` y el FAB abren `CaptureFlow`; si la IA está desactivada o el consentimiento es `DENIED`/`REVOKED`, se renderiza directamente el editor manual con explicación y sin acciones de IA; el contador usa puntos de código; un texto vacío bloquea la revisión; revisar muestra carga y permite cancelar con botón/Escape; cancelar conserva el texto, descarta la respuesta tardía y no cuenta cuota; el modo manual navega con el texto; si falla la carga de etiquetas se muestra `TAGS_UNAVAILABLE` y se abre el editor manual sin llamar al proveedor; si se revoca el consentimiento durante la captura o la interpretación, se conserva el texto y se pasa al editor manual.

- [x] **T9. Editor con borrador, fallback e idempotencia.** RF-13, RF-17..RF-23, RF-27, RF-28
- Hecho cuando: el editor precarga el borrador, muestra advertencias de fechas de solo fecha/hora, etiquetas, checklist, truncados y múltiples intenciones; muestra el texto original completo en `DraftNotice`; valida límites por puntos de código; el borrador no incluye `isPinned` ni `isArchived`; el fallback usa los primeros 60 puntos de código como título y el texto como contenido; cancelar vuelve a la captura con el texto; el submit se deshabilita con `saving` y no permite doble envío; `aria-live` anuncia guardado y error; la clave de idempotencia se reutiliza en reintentos y se regenera tras un 409 por datos distintos; los tests de `NoteEditor`, `useNoteEditor` y `notesApi` pasan.

- [x] **T10. Accesibilidad, responsive, documentación y cierre.** RF-31, RF-32, RF-33, RNF-1..RNF-10
- Hecho cuando: el flujo es operable con teclado y lector de pantalla, sin desbordamiento entre 390 y 2560 px, con 320 px y zoom 200 % como regresión no bloqueante, y respeta `prefers-reduced-motion`; la acción de captura es visible sin scroll inicial en 390×844 y 1280×800; los textos visibles están en español neutro; la auditoría manual cubre contraste, etiquetas accesibles, foco, anuncios y guardado; `.env.example` y `docs/ai.md` están actualizados; el benchmark manual de 20 solicitudes de 2500 puntos queda documentado; pasan `mvn test`, `npm run test`, `npm run lint` y `npm run build`.

- [x] **T11. Bloqueo de contenido fuera de alcance.** RF-34
- Hecho cuando: el prefiltro local bloquea código/peticiones de asistente sin llamar a Groq; `isMemoraNote=false` produce 422 y descarta el contenido; el frontend abre el editor manual con aviso; no se incrementa la cuota; los tests cubren código, preguntas y notas válidas.

- [x] **T12. Título generado por tipo y fecha de solicitud.** RF-13, RF-19
- Hecho cuando: el modelo no devuelve título; el backend genera “Recordatorio/Lista/Contenido … · dd/MM/yyyy HH:mm” con prioridad recordatorio > lista > contenido, hora de inicio de la solicitud y zona del navegador (servidor como fallback); los tests cubren los tres tipos, prioridad y formato.

- [x] **T13. Cierre del modal de captura al hacer click fuera.** RF-35
- Hecho cuando: click en el backdrop cierra si el texto está vacío; con texto abre confirmación antes de descartar; durante la interpretación el backdrop no cierra; los tests cubren vacío, con texto, Escape y estado interpretando.

- [x] **T14. Pista de dictado nativo en móvil.** RF-36
- Hecho cuando: en móvil o táctil el modal de captura muestra “Puedes usar el dictado por voz de tu teclado”; el texto dictado entra por el `textarea` y sigue el flujo normal; no se muestra micrófono propio ni se envía audio.
