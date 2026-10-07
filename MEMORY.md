# MEMORY.md — MEMORA

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Spec 001 (backend inicial) implementada al 100% (T1-T9 marcadas).
- Backend Spring Boot 4.1.1 con Java 21, Maven, endpoint `/health`, configuración por variables de entorno y validación de env vars.
- PostgreSQL 16 levantado mediante Docker Compose; base de datos creada y accesible.
- Test suite del backend: 6 tests, todos en verde; `mvn package -DskipTests` y `mvn spring-boot:run` verifican `GET /health` 200 `{"status":"ok"}`.

## Decisiones (y por qué)
- Java 21 gestionado por SDKMAN (`21.0.12+1.1-tem`); Java 17 (`17.0.20-tem`) permanece como default global.
- `.sdkmanrc` en la raíz del proyecto fija Java 21; `sdkman_auto_env=true` lo activa al entrar a la carpeta.
- Carga manual de `.env` mediante `source .env` antes de ejecutar Maven o la aplicación; Spring no carga `.env` automáticamente.
- `application.yaml` usa placeholders sin valores por defecto para DB_URL, DB_USERNAME, DB_PASSWORD y SERVER_PORT, forzando fallo si faltan.
- Validación explícita de variables requeridas en `Application.main` para mostrar un mensaje claro antes de que Spring falle por binding.
- Spring Boot 4.1.1 requiere `spring-boot-webmvc-test` y `@MockitoBean` en `@WebMvcTest`; `@MockBean` fue eliminado.

## Aprendizajes y errores a evitar
- `@WebMvcTest` necesita una clase `@SpringBootConfiguration` (p. ej. `Application`) para detectar el contexto.
- Sin variables de entorno exportadas, el contexto de Spring falla al resolver `${SERVER_PORT}` como entero.
- Evitar dejar procesos de `mvn spring-boot:run` en background sin control de grupo de procesos; usar `kill -- -$PGID`.

## Próximos pasos
- [x] Implementar T1-T9 de `specs/001-backend-init`.
- [ ] Definir y aprobar `specs/002-*.md` (autenticación JWT o dominio de notas/eventos).
