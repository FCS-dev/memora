# Tareas — Spec 001: Backend inicial

- [x] **T1. Bootstrap del proyecto Maven.** RF-1, RF-4, RNF-1
  - Hecho cuando: `backend/pom.xml` existe con Java 21, Spring Boot Web, Validation, PostgreSQL driver, Lombok y dependencias de test; y `./mvnw compile` (o `mvn compile`) pasa sin errores.

- [x] **T2. Crear plantilla de variables de entorno.** RF-4, RNF-2
  - Hecho cuando: `.env.example` documenta `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `SERVER_PORT` sin valores secretos reales; y `.env` existe localmente sin versionarse.

- [x] **T3. Crear Docker Compose para PostgreSQL.** RF-1, RF-5, RNF-1
  - Hecho cuando: `docker compose up -d` levanta el servicio, `docker compose ps` muestra el contenedor healthy, y la base de datos se crea automáticamente si no existe.

- [x] **T4. Crear configuración de la aplicación.** RF-3, RF-4, RNF-1
  - Hecho cuando: `application.yaml` lee `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `SERVER_PORT` desde variables de entorno, no contiene secretos hardcodeados, y la app inicia con `.env` cargado.

- [x] **T5. Validar variables de entorno requeridas.** RF-3, RF-4
  - Hecho cuando: existe `EnvVarValidator` con test unitario que pasa para variables presentes, ausentes y vacías.

- [x] **T6. Implementar endpoint `/health` (test first).** RF-2
  - Hecho cuando: `HealthControllerTest` pasa verificando que `GET /health` responde `HTTP 200 OK {"status":"ok"}`.

- [x] **T7. Crear punto de entrada de la aplicación.** RF-1
  - Hecho cuando: `Application.java` existe y `mvn spring-boot:run` inicia el backend en el puerto configurado.

- [x] **T8. Verificar fallo por variable de entorno faltante.** RF-3
  - Hecho cuando: al iniciar la app sin una variable requerida, el proceso falla y el log indica claramente qué variable falta.

- [x] **T9. Verificar entorno local end-to-end.** RF-1, RF-2, RF-5
  - Hecho cuando: con `docker compose up -d` y el backend corriendo, `curl http://localhost:${SERVER_PORT}/health` devuelve `HTTP 200 OK {"status":"ok"}`.
