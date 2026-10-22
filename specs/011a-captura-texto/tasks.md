# Tareas 011a — Captura de notas en lenguaje natural: texto

Spec: `specs/011a-captura-texto/spec.md` (aprobada)
Plan: `specs/011a-captura-texto/plan.md`

- [ ] **T1. Spike Spring AI + Groq y configuración base.** RNF-1, RNF-9
- Hecho cuando: el BOM/starter de Spring AI está agregado, `AiProperties`/`AiConfig` arrancan con `AI_ENABLED=false` sin `GROQ_API_KEY`, un smoke test manual con clave real devuelve un JSON válido y la compatibilidad con Spring Boot 4.1.1 queda documentada en `docs/ai.md`.

- [ ] **T2. Consentimiento de IA, auditoría y perfil.** RF-4, RF-5, RF-6, RF-7, RF-8, RF-10, RF-11, RF-30, RNF-10
- Hecho cuando: `ai_consent_events` registra grant/deny/revoke con versión y fecha; `GET /users/me` devuelve `aiConsent`, `aiConsentRequired` y `aiConsentNoticeVersion`; `PUT /users/me/ai-consent` funciona solo para USER; los tests cubren versión vencida, revocación y ausencia de datos sensibles.

- [ ] **T3. Cuota diaria y errores de IA.** RF-29, RNF-2, RNF-3, RNF-4
- Hecho cuando: `ai_usage` cuenta solo operaciones exitosas por usuario y fecha local; la operación 51 responde 429; los fallos y cancelaciones no incrementan; `GlobalExceptionHandler` mapea 428/429/502/503/504 sin detalles del proveedor.

- [ ] **T4. Extracción y normalización del borrador.** RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-24, RF-25
- Hecho cuando: `NoteDraftExtractor` devuelve el contrato interno; `NoteDraftNormalizer` cubre título de respaldo, recortes, checklist sobre contenido, checklist inválida, máximo cinco etiquetas, etiquetas ajenas, fechas ambiguas/pasadas/DST y múltiples intenciones; los tests usan un extractor fake y un `Clock` fijo.

- [ ] **T5. Endpoint `POST /notes/interpret`.** RF-12..RF-25, RF-29, RF-30
- Hecho cuando: un USER con consentimiento y cuota recibe 200 con borrador y advertencias; sin consentimiento recibe 428; sin cuota recibe 429; ADMIN recibe 403; no se persiste ninguna nota; no se registra el texto en logs.

- [ ] **T6. Idempotencia en `POST /notes`.** RF-28
- Hecho cuando: `notes.idempotency_key` existe con restricción única por usuario; la misma clave no crea una segunda nota; claves distintas crean notas distintas; las notas manuales sin clave siguen funcionando; los tests de `NoteService` y `NoteController` están actualizados.

- [ ] **T7. API frontend, consentimiento y perfil.** RF-4..RF-11
- Hecho cuando: `AuthUser` incluye los campos de IA; `captureApi` interpreta y actualiza consentimiento; `AiConsentDialog` acepta/rechaza con foco y Escape; `ProfileDialog` permite habilitar y revocar; los errores de red no envían texto.

- [ ] **T8. Flujo de captura en la vista de notas.** RF-1, RF-2, RF-3, RF-9, RF-20, RF-21, RF-26, RF-27
- Hecho cuando: `CaptureBar` y el FAB abren `CaptureFlow`; el contador usa puntos de código; revisar muestra carga y permite cancelar; cancelar conserva el texto; el modo manual navega con el texto; sin IA o sin consentimiento se abre el editor manual con explicación.

- [ ] **T9. Editor con borrador, fallback e idempotencia.** RF-13, RF-17..RF-23, RF-27, RF-28
- Hecho cuando: el editor precarga el borrador, muestra advertencias y el texto original; el fallback usa los primeros 60 puntos de código como título y el texto como contenido; cancelar vuelve a la captura con el texto; la clave de idempotencia se reutiliza en reintentos; los tests de `NoteEditor`, `useNoteEditor` y `notesApi` pasan.

- [ ] **T10. Accesibilidad, responsive, documentación y cierre.** RF-31, RF-32, RF-33, RNF-1..RNF-10
- Hecho cuando: el flujo es operable con teclado y lector de pantalla, sin desbordamiento entre 390 y 2560 px, respeta `prefers-reduced-motion`, `.env.example` y `docs/ai.md` están actualizados, y pasan `mvn test`, `npm run test`, `npm run lint` y `npm run build`.
