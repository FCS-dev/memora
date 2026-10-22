# Tareas 011b — Captura de notas por voz

Spec: `specs/011b-captura-voz/spec.md` (aprobada)
Plan: `specs/011b-captura-voz/plan.md`

- [ ] **T1. Spike de transcripción con Groq Whisper.** RNF-1, RNF-2, RNF-4
- Hecho cuando: se confirma el endpoint, modelo, formatos de audio, tamaño y latencia con una clave real; `AiProperties` incluye la configuración de transcripción; el cliente puede sustituirse por un fake y la compatibilidad queda documentada en `docs/ai.md`.

- [ ] **T2. Backend de transcripción.** RF-3, RF-4, RF-5, RF-10, RF-11, RF-14, RF-15, RF-19, RF-20, RNF-1..RNF-6
- Hecho cuando: `POST /ai/transcribe` valida archivo, formato, tamaño y `zoneId`; aplica consentimiento y cuota; devuelve `{text}`; un texto vacío no cuenta cuota; los errores 400/413/428/429/502/503/504 están mapeados; no se persiste ni se registra audio.

- [ ] **T3. HTTP multipart y API frontend.** RF-6, RF-8, RF-9
- Hecho cuando: `requestMultipart` conserva auth, refresh y manejo de 401; `transcribeAudio` envía `FormData` con audio y `zoneId`; los tests cubren éxito, error y refresh.

- [ ] **T4. Hook de grabación.** RF-4, RF-6, RF-7, RF-10, RF-11, RF-12, RF-13, RF-15
- Hecho cuando: `useAudioRecorder` selecciona MIME, pide permiso, graba, detiene a los 60 s, construye el blob, limpia stream/timers al desmontar y expone errores de permiso/soporte; los tests usan un `MediaRecorder` falso.

- [ ] **T5. MicButton, consentimiento y accesibilidad.** RF-1, RF-2, RF-3, RF-14, RF-16, RF-21
- Hecho cuando: el micrófono solo aparece con puntero fino y ancho >=768; respeta consentimiento e IA activa; es operable con teclado; anuncia grabación/transcripción/error; en móvil no se muestra y aparece la pista de dictado nativo.

- [ ] **T6. Integración con CaptureSheet y reintentos.** RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-17, RF-18
- Hecho cuando: la transcripción se inserta en cursor/selección o al final; no se envía automáticamente; si supera 2500 puntos de código se advierte y se bloquea la revisión; si falla se conserva el blob para reintentar; cancelar/abandonar/revocar descarta el audio; los tests cubren todos los caminos.

- [ ] **T7. Responsive, móvil y movimiento reducido.** RF-16, RF-22, RF-23
- Hecho cuando: el flujo no desborda entre 390 y 2560 px; el micrófono se oculta en táctil; los estados respetan `prefers-reduced-motion`; los tests de media query y teclado pasan.

- [ ] **T8. Cierre de la spec.** RNF-7, RNF-8, RNF-9
- Hecho cuando: `.env.example` y `docs/ai.md` incluyen la transcripción; pasan `mvn test`, `npm run test`, `npm run lint` y `npm run build`; se actualiza `MEMORY.md` y se verifica manualmente el flujo en escritorio y móvil.
