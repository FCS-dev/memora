# AGENTS.md — Memora

Archivo de instrucciones para sesiones de OpenCode en este repositorio.

## Qué es este proyecto

Agenda-memoria informatizada tipo *smart* para gestionar y consultar notas, recordatorios (eventos), tareas y —en una segunda fase— documentos `.pdf | .txt | .md`, usando lenguaje natural mediante MCP y RAG con LLM externo (a futuro, opción de LLM local).

- **Backend:** API REST en Java 21 + Spring Boot 4.1.1, Hibernate/JPA, Maven, OpenAPI.
- **Frontend:** React + TypeScript + Vite, TailwindCSS + DaisyUI, ChartJS.
- **Base de datos:** PostgreSQL, levantada inicialmente mediante Docker Compose.
- **Documentación:** español neutro, salvo términos técnicos propios.

## Estructura

```
./backend/     # API Spring Boot
./frontend/    # Aplicación React con Vite
```

## Backend (`./backend/`)

### Entorno de desarrollo

- **Java 21** es requisito para compilar y ejecutar el backend.
- Se recomienda usar **SDKMAN** para gestionar múltiples versiones de Java sin tocar el sistema:
  ```bash
  curl -s "https://get.sdkman.io" | bash
  sdk install java 21.0.12+1.1-tem
  sdk install java 17.0.20-tem
  sdk default java 17.0.20-tem
  sdk config  # habilitar sdkman_auto_env=true
  ```
- El archivo `.sdkmanrc` en la raíz del proyecto fija Java 21 para Memora.
- Al entrar al directorio del proyecto, SDKMAN activará Java 21 automáticamente si `sdkman_auto_env=true`. De lo contrario, ejecutar manualmente:
  ```bash
  sdk env
  ```
- Las variables de entorno requeridas deben cargarse desde `.env` antes de ejecutar Maven o la aplicación:
  ```bash
  set -a && source .env && set +a
  ```

### Arquitectura

- Organizar por **funcionalidad/módulo**, manteniendo juntas las clases relacionadas.
- Capas obligatorias: **Controller → Service → Repository**. Los controllers nunca acceden directamente a repositories.
- Los controllers **no contienen lógica de negocio**.
- DTOs como **Java records**; entidades con Lombok si se usa.
- Endpoints exponen DTOs de request/response, **nunca entidades JPA**.
- Paquete base: `fcs.memora`.

### API

- Documentar endpoints con OpenAPI.
- Validar requests con Jakarta Validation.
- Error estándar manejado por un `ExceptionHandler`:
  ```json
  {
    "title": "Solicitud inválida",
    "status": 400,
    "detail": "El request contiene campos inválidos"
  }
  ```
- Mantener idempotencia cuando una operación pueda recibir reintentos que causen duplicados.

### Seguridad

- JWT + refresh token con mayor validez.
- Validar y sanear entradas; aplicar mínimo privilegio; comprobar permisos en servidor.
- No construir consultas mediante concatenación de strings.
- No exponer información sensible en errores ni logs.

### IA, MCP y RAG

- Fase 2: Spring AI para documentos y RAG.
- No exponer la base de datos directamente al LLM.
- Validar y autorizar operaciones MCP en backend.
- Las decisiones de autorización, validación y reglas de negocio deben ejecutarse en backend, no depender de respuestas del LLM.

## Frontend (`./frontend/`)

- **Mobile First**. Breakpoints con `min-width`:
  - Base: `0px` a `639px`
  - `sm`: `@media (min-width: 640px) { ... }`
  - `md`: `@media (min-width: 768px) { ... }`
  - `lg`: `@media (min-width: 1024px) { ... }`
  - `xl`: `@media (min-width: 1280px) { ... }`
- Preferir elementos HTML semánticos sobre `div`.
- Evitar cadenas innecesarias de `div`; minimizar profundidad (KISS).
- Estructura de archivos separada por módulos.
- Considerar estados de carga, error y vacío; mantener accesibilidad.

## Convenciones de código

- Código en **inglés descriptivo** (variables, métodos, clases).
- `camelCase` para variables y métodos.
- `PascalCase` para clases.
- `kebab-case` para URLs, CSS y HTML.
- `UPPER_SNAKE_CASE` para constantes.
- Texto visible para usuarios, títulos y descripciones en **español neutro**.

## Base de datos

- PostgreSQL creada inicialmente con Docker Compose.
- En desarrollo se usa `ddl-auto: update` temporalmente; no cambiar sin justificación.
- Los cambios de esquema definitivos deben hacerse mediante el mecanismo de migraciones que se establezca.

## Tests

- Agregar o modificar tests acordes al cambio.
- Ejecutar tests relacionados, y la suite completa cuando sea razonable.
- No dar por válido un cambio si introduce errores.

## Documentación externa

- Cuando necesites información sobre una librería, framework o API externa que pueda haber cambiado entre versiones, consulta la documentación oficial o utiliza Context7 cuando esté disponible antes de implementar basándote en suposiciones.

## Dependencias

- Antes de agregar una dependencia: verificar si existe una alternativa ya disponible, confirmar compatibilidad y justificar la necesidad.
- No sustituir ni introducir tecnologías alternativas sin una justificación explícita.

## Configuración y secretos

- Nunca incluir claves API, credenciales, tokens ni secretos en el código, tests o fixtures.
- Usar variables de entorno o mecanismos de gestión de secretos del entorno.
- Si existe `.env`, no versionarlo; usar `.env.example` para documentar variables requeridas sin valores sensibles.

## Comandos

- Frontend (Vite):
  - `npm run dev`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- Backend:
  - `cd backend && mvn test`
  - `cd backend && mvn package -DskipTests`
  - `cd backend && mvn spring-boot:run`
  - Requieren Java 21 (ver entorno de desarrollo del backend) y variables de entorno cargadas.
- Base de datos: `docker compose up -d` levanta PostgreSQL desde `docker-compose.yaml`.

Antes de finalizar una tarea, ejecutar lint, tests y build cuando apliquen.

## Reglas de Trabajo para Agentes (SDD + Memoria)

Mantén `MEMORY.md` y el estado de las specs como fuente de verdad compacta del proyecto.

### 1. Protocolo Pre-Implementación y Lectura
- **Lectura obligatoria:** Lee `/docs/constitution.md`, la spec activa en `/specs/NNN-*.md` y `MEMORY.md` antes de escribir o modificar código para situarte en el estado actual y conocer las decisiones previas.

### 2. Actualización de Tareas y Memoria
- **Al completar tareas:**
  1. Marca `[x]` la tarea específica dentro de su archivo en `specs/NNN-*.md`.
  2. Actualiza brevemente el avance en la sección **Estado actual** de `MEMORY.md`.
- **Al finalizar un cambio/sesión:** Registra en `MEMORY.md` solo hechos concretos, decisiones técnicas y aprendizajes clave.

### 3. Regla de Brevedad, Podado (*Pruning*) y Archivado
- **Límite:** `MEMORY.md` **nunca debe superar ~50 líneas**.
- **Concisión:** Usa viñetas de 1 línea. Prohibido incluir diffs, código extenso o respuestas detalladas. Usa referencias a archivos (ej. `specs/001-auth.md`).
- **Archivado:** Cuando una spec/hito se complete, o cuando las secciones **Estado actual**, **Decisiones** o **Aprendizajes** rocen las 50 líneas:
  * Traslada los bloques a `docs/memory-archive/YYYY-MM-DD-<nombre-hito-o-num>.md` (ej. `2026-10-06-spec-001.md`).
  * Conserva en `MEMORY.md` únicamente el estado activo, las decisiones vigentes y los próximos pasos inmediatos.

## Checklist antes de terminar

1. El cambio cumple los requisitos solicitados.
2. Se siguieron las convenciones y arquitectura existentes.
3. Se agregaron/actualizaron los tests necesarios y pasan.
4. No se introdujeron secretos.
5. Se actualizó la documentación si cambió comportamiento público, variables de entorno, instalación, comandos o arquitectura.
6. Se evitaron cambios no relacionados.

## Cuándo preguntar al usuario

- Cuando una decisión no esté especificada en este archivo, en el texto de la tarea o en el código existente.
- Antes de cambiar autenticación, autorización, datos de usuario o seguridad.
- Antes de agregar una tecnología alternativa o una nueva dependencia.
