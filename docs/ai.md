# IA en Memora

## Compatibilidad

- Spring Boot 4.1.1.
- Spring AI 2.0.0, BOM `spring-ai-bom` y starter `spring-ai-starter-model-openai`.
- El starter declara Spring Boot 4.1.0 como base; compila y arranca con 4.1.1.
- La autoconfiguración de OpenAI queda desactivada con `spring.ai.model.*=none` para evitar que el arranque dependa de una clave. `AiConfig` crea el `ChatModel` solo cuando `memora.ai.enabled=true`.

## Proveedor

- Proveedor: Groq, API compatible con OpenAI.
- Base URL: `https://api.groq.com/openai/v1`.
- Modelo de texto: `openai/gpt-oss-20b`.
- El cliente oficial de OpenAI que usa Spring AI agrega `/chat/completions`; por eso la base URL incluye `/v1`. El smoke test manual confirma la URL final.
- `openai/gpt-oss-20b` consume tokens de razonamiento. Con 512 tokens el JSON se truncaba; el valor por defecto es 2048.
- `ChatClient.entity(...)` devolvió contenido vacío con Groq. La aplicación parsea `call().content()` como JSON con Jackson y limpia cercas Markdown.
- El modelo no devuelve título. El backend genera “Recordatorio/Lista/Contenido … · dd/MM/yyyy HH:mm” con la hora de inicio de la solicitud y prioridad recordatorio > lista > contenido.
- El modelo solo interpreta notas, recordatorios, tareas y checklists. `NoteScopeGuard` bloquea código/preguntas evidentes antes de Groq y `isMemoraNote=false` produce 422 sin devolver contenido ni consumir cuota.
- El modelo no calcula fechas relativas: devuelve la expresión literal y `SpanishReminderResolver` la resuelve en servidor con `Clock` y `ZoneId`. “Este viernes” incluye hoy; “el/próximo viernes” usa la siguiente ocurrencia. Una fecha sin hora usa 00:00 local; “quincena de <mes>” se interpreta como el día 15.

## Variables

```
AI_ENABLED=false
GROQ_API_KEY=
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_CHAT_MODEL=openai/gpt-oss-20b
GROQ_MAX_OUTPUT_TOKENS=2048
AI_TEMPERATURE=0.2
AI_TIMEOUT_MS=20000
AI_DAILY_LIMIT=50
AI_MAX_INPUT_CODE_POINTS=2500
AI_NOTICE_VERSION=1
```

`AI_ENABLED=false` no requiere `GROQ_API_KEY`. Si `AI_ENABLED=true`, la aplicación exige `GROQ_API_KEY` y `GROQ_BASE_URL`.

## Smoke test manual

Con una clave real en el entorno:

```bash
export GROQ_API_KEY=...
./scripts/groq-smoke.sh
```

El script llama a Groq, valida que la respuesta sea JSON y la imprime. No se ejecuta en CI ni en `mvn test`.

## Pruebas automáticas

- `AiPropertiesTest`: defaults y binding de valores.
- `AiConfigTest`: sin `ChatModel` con IA desactivada, con `ChatModel` cuando está activa y fallo explícito sin clave.
- `EnvVarValidatorTest`: variables de Groq solo obligatorias con IA activa.
- `ApplicationConfigTest`: variables y autoconfiguración desactivada en `application.yaml`.

## Privacidad

- No se registra el texto, el borrador, las etiquetas, la zona horaria ni la respuesta del proveedor.
- La clave solo vive en el backend y en variables de entorno.
- El modo manual no llama al proveedor.

## Benchmark manual de interpretación

Procedimiento para verificar RNF-1 fuera de CI:

1. Configurar `AI_ENABLED=true` y una `GROQ_API_KEY` real.
2. Ejecutar 20 solicitudes consecutivas a `POST /notes/interpret` con un texto de 2500 puntos de código.
3. Medir en el servidor desde la recepción de la solicitud hasta el envío de la respuesta.
4. Registrar el percentil 95; el objetivo es <= 8 segundos con el proveedor disponible.
5. No usar este procedimiento como prueba automática de CI.
