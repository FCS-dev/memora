# Plan — Spec 001: Backend inicial

## 1. Archivos y responsabilidades

| Archivo | Responsabilidad | RF cubiertos |
|---|---|---|
| `backend/pom.xml` | Definir el proyecto Maven, Java 21, dependencias de Spring Boot, driver PostgreSQL, Lombok y dependencias de test. | RF-1, RF-4, RNF-1 |
| `backend/src/main/java/fcs/memora/Application.java` | Punto de entrada de la aplicación Spring Boot. | RF-1 |
| `backend/src/main/resources/application.yaml` | Cargar configuración sensible (URL, usuario, contraseña de BD, puerto) desde variables de entorno. Sin secretos hardcodeados. | RF-3, RF-4, RNF-1, RNF-2 |
| `backend/src/main/java/fcs/memora/health/HealthController.java` | Exponer el endpoint HTTP `/health`. | RF-2 |
| `backend/src/main/java/fcs/memora/health/HealthService.java` | Contener la lógica pura de respuesta de salud. | RF-2 |
| `backend/src/main/java/fcs/memora/health/HealthResponse.java` | DTO record con el campo `status`. | RF-2 |
| `docker-compose.yaml` | Levantar PostgreSQL en desarrollo, crear la base de datos si no existe, usando variables de entorno. | RF-1, RF-5, RNF-1 |
| `.env` | Contener valores locales de variables de entorno (no versionado). | RF-4, RNF-1 |
| `.env.example` | Documentar las variables requeridas sin valores secretos reales. | RNF-2 |
| `backend/src/test/java/fcs/memora/health/HealthControllerTest.java` | Verificar que `/health` responde `200 OK {"status":"ok"}`. | RF-2 |
| `backend/src/test/java/fcs/memora/config/EnvVarValidatorTest.java` | Verificar la validación de variables de entorno requeridas. | RF-3, RF-4 |

## 2. Funciones puras de lógica

No hay lógica dependiente de la fecha en esta spec, por lo que no se requiere el parámetro `hoy`. Las funciones puras identificadas son:

- `isHealthy(): boolean` → retorna `true` para esta spec.
- `buildHealthResponse(): HealthResponse` → retorna `new HealthResponse("ok")`.
- `validateRequiredEnvVars(vars: Map<String,String>): List<String>` → recibe un mapa con las variables requeridas y retorna la lista de nombres faltantes o vacíos.

## 3. Algoritmo en pseudocódigo

### Arranque del backend
```
función iniciarBackend():
    vars = leerVariablesDeEntorno()
    faltantes = validateRequiredEnvVars(vars)
    si faltantes no está vacía:
        registrarError("Faltan variables de entorno requeridas: " + faltantes)
        detenerConError()
    
    configurarDatasource(vars.url, vars.usuario, vars.password)
    configurarPuerto(vars.puerto)
    iniciarAplicaciónSpringBoot()
    exponerEndpointHealth()
```

### Respuesta de `/health`
```
función manejarHealth():
    response = buildHealthResponse()
    retornar HTTP 200 OK con body response
```

### Entorno local con base de datos
```
función iniciarEntornoLocal():
    cargarArchivoEnv()
    si PostgreSQL no está corriendo:
        levantarContenedorPostgreSQL(
            nombreBD = vars.dbName,
            usuario = vars.dbUser,
            password = vars.dbPassword
        )
        esperarQueBD esté lista
        # La BD se crea automáticamente si no existe gracias a POSTGRES_DB
```

## 4. Interfaz

Esta spec no tiene interfaz de usuario frontend. La "interfaz" es:

- **Línea de comandos del desarrollador:**
  - `docker compose up -d` para levantar la base de datos.
  - `./mvnw spring-boot:run` para levantar el backend.
- **API HTTP:**
  - `GET /health` → respuesta `200 OK {"status":"ok"}`.

## 5. Decisiones técnicas justificadas

### 5.1. Maven en lugar de Gradle
- **Decisión:** Usar Maven con `pom.xml`.
- **Justificación:** `AGENTS.md` ya define Maven como gestor de dependencias del backend.
- **Alternativa descartada:** Gradle. Añadiría una alternativa de stack sin beneficio claro y violaría el principio de stack simple.

### 5.2. `application.yaml` en lugar de `application.properties`
- **Decisión:** Usar YAML para la configuración.
- **Justificación:** Es más legible para configuraciones jerárquicas (datasource, server, logging).
- **Alternativa descartada:** Properties. Menos legible para estructuras anidadas.

### 5.3. Docker Compose para PostgreSQL en lugar de instalación local
- **Decisión:** Usar `docker-compose.yaml` para levantar PostgreSQL.
- **Justificación:** Entorno reproducible entre desarrolladores; la base de datos se crea automáticamente; alineado con `AGENTS.md`.
- **Alternativa descartada:** Que cada desarrollador instale PostgreSQL localmente. No es reproducible y dificulta la onboarding.

### 5.4. Variables de entorno + `.env` en lugar de secretos en código
- **Decisión:** Usar variables de entorno cargadas desde `.env` para configuración sensible.
- **Justificación:** Cumple RF-4, RNF-1, RNF-2 y el principio de datos protegidos de la constitución.
- **Alternativa descartada:** Hardcodear valores en `application.yaml`. Expone secretos y viola la constitución.

### 5.5. JUnit 5 + MockMvc en lugar de `node --test`
- **Decisión:** Usar JUnit 5 y MockMvc para los tests.
- **Justificación:** El backend es Java/Spring Boot. `node --test` implicaría agregar Node.js como dependencia solo para probar Java, violando el principio de stack simple. MockMvc permite testear el endpoint sin levantar el servidor real.
- **Alternativa descartada:** `node --test`. Mencionada en la plantilla SDD, pero no aplica al stack Java.

### 5.6. `@WebMvcTest` para `/health` en lugar de `@SpringBootTest`
- **Decisión:** Usar `@WebMvcTest` con `MockMvc` para el test de `/health`.
- **Justificación:** Es más rápido y no requiere levantar la base de datos para probar un endpoint estático.
- **Alternativa descartada:** `@SpringBootTest`. Levanta todo el contexto y es más lento; innecesario para este caso.

## 6. Estrategia de tests

Aunque la plantilla SDD menciona `node --test`, el stack de MEMORA es Java/Spring Boot. Se usa JUnit 5 + MockMvc.

### Tests propuestos

1. **`HealthControllerTest`** — RF-2
   - Anotación `@WebMvcTest(HealthController.class)`.
   - Inyectar `MockMvc`.
   - Ejecutar `mockMvc.perform(get("/health"))`.
   - Verificar `status().isOk()` y `jsonPath("$.status", is("ok"))`.

2. **`EnvVarValidatorTest`** — RF-3, RF-4
   - Probar `validateRequiredEnvVars` con:
     - Todas las variables presentes → lista vacía.
     - Una variable ausente → lista con el nombre faltante.
     - Una variable vacía → lista con el nombre considerado faltante.

3. **Verificación manual del entorno** — RF-1, RF-5
   - Ejecutar `docker compose up -d`.
   - Verificar que el contenedor está healthy.
   - Verificar que la base de datos se creó si no existía.
   - Levantar el backend y comprobar que se conecta.

### Comandos de ejecución

- Compilar y ejecutar tests: `./mvnw test` (o `mvn test`).
- Validar manualmente el endpoint: `curl http://localhost:${SERVER_PORT}/health`.
