# Spec 002 — Autenticación, autorización y entidades de dominio

Estado: aprobada

## Contexto y objetivo

El proyecto necesita proteger el acceso, distinguir entre el administrador único y los usuarios regulares, y disponer de las entidades de dominio que sostendrán la funcionalidad principal. Esta spec define cómo se autentican los usuarios, cómo se autorizan las acciones, cómo se inicializa el sistema cuando aún no hay datos, y qué información deben guardar usuarios, notas y tags.

## Usuarios

- **Visitante:** persona no autenticada que puede crear una cuenta de usuario.
- **Usuario autenticado (USER):** puede gestionar sus propias notas y tags, y modificar su nombre y contraseña.
- **Administrador (ADMIN):** rol único en el sistema; puede cambiar el estado de cualquier usuario. No gestiona notas ni tags.

## Historias de usuario

- HU-1. Como visitante, quiero registrarme como USER para empezar a usar la aplicación.
- HU-2. Como usuario autenticado, quiero iniciar sesión para obtener un access token y un refresh token.
- HU-3. Como usuario autenticado, quiero renovar mi sesión para no tener que volver a iniciar sesión frecuentemente.
- HU-4. Como usuario autenticado, quiero modificar mi nombre y mi contraseña para mantener mis datos actualizados.
- HU-5. Como ADMIN, quiero que solo exista una cuenta ADMIN para mantener el control centralizado del sistema.
- HU-6. Como ADMIN, quiero bloquear, deshabilitar o activar cuentas de usuario para gestionar el acceso.
- HU-7. Como usuario autenticado, quiero crear notas con título, contenido, recordatorio, estado pinned/archived, tags y casillas de verificación para organizar mi información.
- HU-8. Como usuario autenticado, quiero crear tags para clasificar mis notas.

## Definiciones

- **Instalación limpia:** situación en la que, al iniciar la aplicación, no existe la tabla de usuarios o esta no contiene ningún usuario.
- **Access token:** token JWT de corta duración que identifica a un usuario ante los recursos protegidos.
- **Refresh token:** token de larga duración entregado al cliente en una cookie `HttpOnly`, usado para obtener nuevos access tokens.
- **ADMIN:** rol único en todo el sistema; tiene control sobre el estado de las cuentas.
- **USER:** rol estándar; cada usuario solo puede acceder a sus propios datos.
- **ACTIVE:** estado normal de una cuenta; permite iniciar sesión.
- **BLOCKED:** estado impuesto por el ADMIN; impide iniciar sesión y debe devolver HTTP 403.
- **DISABLED:** estado impuesto por el ADMIN; impide iniciar sesión y debe devolver HTTP 403.

## Requisitos funcionales

- RF-1: SI al iniciar la aplicación no existe la tabla de usuarios O la tabla no contiene usuarios, ENTONCES EL SISTEMA debe considerar que se trata de una instalación limpia.
- RF-2: DADA una instalación limpia, CUANDO falten las credenciales `ADMIN_EMAIL` u `ADMIN_PASSWORD` en el entorno, ENTONCES EL SISTEMA debe fallar al arrancar y mostrar un mensaje claro en los logs de Spring Boot.
- RF-3: DADA una instalación limpia, CUANDO las credenciales `ADMIN_EMAIL` y `ADMIN_PASSWORD` estén presentes, ENTONCES EL SISTEMA debe crear el usuario ADMIN con esas credenciales y estado ACTIVE.
- RF-4: EL SISTEMA debe permitir que cualquier visitante se registre como usuario con rol USER por defecto.
- RF-5: CUANDO un visitante se registre, EL SISTEMA debe validar que el email (normalizado a minúsculas y sin espacios externos) sea único, que los campos obligatorios estén presentes, que la contraseña tenga entre 8 y 20 caracteres y que se respeten las longitudes definidas en RF-REF-1.
- RF-6: CUANDO un usuario inicie sesión con credenciales válidas, EL SISTEMA debe emitir un access token JWT y un refresh token en una cookie `HttpOnly`.
- RF-7: SI las credenciales son inválidas, ENTONCES EL SISTEMA debe rechazar el inicio de sesión sin revelar qué dato fue incorrecto.
- RF-8: SI el usuario está BLOCKED O DISABLED, ENTONCES EL SISTEMA debe rechazar el inicio de sesión con HTTP 403 y sin revelar qué dato fue incorrecto.
- RF-9: CUANDO un usuario presente un refresh token válido, EL SISTEMA debe emitir un nuevo access token.
- RF-10: CUANDO un refresh token sea inválido, esté expirado o la cookie esté ausente, ENTONCES EL SISTEMA debe rechazar la renovación.
- RF-11: EL SISTEMA debe permitir que un usuario USER modifique únicamente su propio nombre y su propia contraseña, siendo esta última válida solo cuando tenga entre 8 y 20 caracteres.
- RF-12: EL SISTEMA debe garantizar que solo pueda existir un único usuario con rol ADMIN en todo momento.
- RF-13: EL SISTEMA debe permitir que el ADMIN cambie el estado `userStatus` de cualquier usuario entre ACTIVE, BLOCKED y DISABLED, excepto el propio ADMIN.
- RF-14: EL SISTEMA debe almacenar notas asociadas a un único usuario, exigiendo un título obligatorio que no esté vacío ni compuesto únicamente por espacios.
- RF-15: El identificador público y el orden de las notas se rigen por la Spec 004 (identificador público y orden manual por grupo); el contador global `lastNotePosition` queda derogado.
- RF-16: CUANDO una nota tenga activado el modo de casillas de verificación (`checklistMode = true`), EL SISTEMA debe almacenar el contenido de texto como cadena vacía (`""`) y persistir el listado como pares `{text: string, checked: boolean}` en `contentJson`, almacenado como `jsonb` y con al menos un ítem cuya clave tenga longitud mayor o igual a 1 y suma de longitudes de claves de hasta 2500 caracteres.
- RF-17: EL SISTEMA debe permitir asociar múltiples tags a una misma nota.
- RF-18: EL SISTEMA debe almacenar tags asociados a un único usuario y garantizar que el nombre de tag sea único dentro de cada usuario, comparando en minúsculas y sin espacios externos.
- RF-19: EL SISTEMA debe registrar automáticamente las fechas de creación y modificación de usuarios, notas y tags.
- RF-20: EL SISTEMA debe generar automáticamente un identificador visible único para cada usuario, con formato UUID v4 con guiones (36 caracteres).
- RF-21: EL SISTEMA debe asignar rol USER y estado ACTIVE por defecto a los nuevos usuarios.
- RF-22: CUANDO un visitante se registre enviando un rol distinto a USER, EL SISTEMA debe ignorar dicho rol y crear el usuario con rol USER.
- RF-23: EL SISTEMA debe impedir que el ADMIN modifique su propio estado.
- RF-24: CUANDO un usuario cambie su contraseña, EL SISTEMA debe revocar todos sus refresh tokens, incluido el de la sesión actual.
- RF-25: CUANDO el ADMIN cambie el estado de un usuario a BLOCKED o DISABLED, EL SISTEMA debe revocar todos los access tokens y refresh tokens activos de ese usuario.
- RF-26: CUANDO se cree o actualice una nota, EL SISTEMA debe permitir opcionalmente una fecha y hora de recordatorio (`rememberAt`).
- RF-27: EL SISTEMA debe permitir marcar una nota como fijada (`isPinned`), con valor por defecto `false`.
- RF-28: EL SISTEMA debe permitir archivar una nota (`isArchived`), con valor por defecto `false`.
- RF-REF-1: EL SISTEMA debe aplicar las siguientes reglas de validación y valores por defecto:
  - Email: obligatorio, mínimo 5, máximo 150 caracteres.
  - Nombre de usuario (`name`): obligatorio, mínimo 3, máximo 150 caracteres.
  - Contraseña: obligatoria, mínimo 8, máximo 20 caracteres de entrada; almacenada únicamente como hash BCRYPT en `passwordHash` (máximo 256 caracteres).
  - Título de nota: obligatorio, mínimo 1, máximo 200 caracteres.
  - Contenido de nota: opcional, mínimo 0, máximo 2500 caracteres; cuando no se envía se almacena como cadena vacía (`""`).
  - Contenido de casillas (`contentJson`): almacenado como `jsonb`; `null` cuando `checklistMode = false`; cuando `checklistMode = true` debe tener al menos un ítem y la suma de longitudes de las claves no puede superar 2500 caracteres. No se valida como String de 0–2500.
  - Modo casillas (`checklistMode`): booleano, opcional, por defecto `false`.
  - Recordatorio (`rememberAt`): `LocalDateTime`, opcional, por defecto `null`.
  - Nota fijada (`isPinned`): booleano, opcional, por defecto `false`.
  - Nota archivada (`isArchived`): booleano, opcional, por defecto `false`.
  - Nombre de tag: obligatorio, mínimo 1, máximo 25 caracteres.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe almacenar las contraseñas únicamente como hash BCRYPT.
- RNF-2: EL SISTEMA debe asegurar que un usuario solo pueda acceder a sus propias notas y tags, y que el ADMIN no acceda a notas ni tags de ningún usuario.
- RNF-3: EL SISTEMA debe usar identificadores internos numéricos que nunca sean visibles en las respuestas públicas.
- RNF-4: EL refresh token debe tener una duración de 30 días.
- RNF-5: EL SISTEMA debe exponer el identificador visible del usuario como su identificador público.
- RNF-6: EL SISTEMA debe validar longitudes máximas, obligatoriedad y formatos en las entradas.

## Casos límite

- Un visitante intenta registrarse con un email que ya existe (incluyendo variaciones de mayúsculas o espacios externos).
- Un visitante envía `role: ADMIN` en el registro; el sistema lo ignora y crea un USER.
- Se intenta crear un segundo usuario con rol ADMIN.
- El único ADMIN intenta cambiarse a sí mismo a rol USER o modificar su propio estado.
- Un usuario con estado BLOCKED intenta iniciar sesión.
- Un usuario con estado DISABLED intenta iniciar sesión.
- El refresh token está expirado, ausente o no coincide con el almacenado.
- Un usuario intenta crear un tag con un nombre que el mismo usuario ya tiene (incluyendo variaciones de mayúsculas o espacios externos).
- Una nota se crea con el modo de casillas activado pero sin ninguna línea.
- Una nota se crea con modo de casillas y una suma de longitudes de claves superior a 2500.
- Una nota se crea con título vacío o compuesto únicamente por espacios, o con más de 200 caracteres.
- Se registra un nombre de usuario con menos de 3 caracteres o un email con menos de 5.
- La aplicación arranca en instalación limpia sin las credenciales de admin configuradas.
- Un usuario cambia su contraseña y todos sus refresh tokens quedan revocados.
- El ADMIN cambia el estado de un usuario a BLOCKED o DISABLED mientras este tiene sesiones activas.

## Fuera de alcance

- Recuperación de contraseña.
- Verificación de email.
- Roles intermedios entre ADMIN y USER.
- Interfaz de usuario frontend.
- Reordenamiento manual de notas.
- Envío de notificaciones de recordatorio.
- Compartir notas entre usuarios.
- Adjuntos o archivos asociados a notas.
- Auditoría detallada de cambios.
- Contador de intentos fallidos de inicio de sesión y bloqueo automático de cuentas.
- Estados distintos de ACTIVE, BLOCKED y DISABLED.
- Eliminación física de usuarios, notas o tags.

## Criterios de finalización

- [ ] El sistema crea el ADMIN inicial en una instalación limpia cuando las credenciales están presentes.
- [ ] El sistema falla al arrancar en instalación limpia si faltan `ADMIN_EMAIL` o `ADMIN_PASSWORD`, mostrando el error en los logs.
- [ ] El registro público de usuarios funciona, valida email único (normalizado), obligatoriedad, contraseña entre 8 y 20 caracteres y longitudes definidas en RF-REF-1.
- [ ] El registro ignora cualquier rol distinto a USER enviado en el request.
- [ ] El login emite access token JWT y refresh token en cookie `HttpOnly` de 30 días.
- [ ] El login rechaza credenciales inválidas con HTTP 401 sin revelar detalles.
- [ ] El login rechaza usuarios BLOCKED y DISABLED con HTTP 403.
- [ ] La renovación de access token funciona con un refresh token válido.
- [ ] Un USER puede modificar únicamente su propio nombre y contraseña.
- [ ] Al cambiar la contraseña se revocan todos los refresh tokens del usuario.
- [ ] Se impide la existencia de más de un ADMIN.
- [ ] El ADMIN puede cambiar el estado de cualquier usuario entre ACTIVE, BLOCKED y DISABLED, excepto el propio ADMIN.
- [ ] Al cambiar el estado de un usuario a BLOCKED o DISABLED se revocan sus tokens activos.
- [ ] Las entidades de usuario, nota y tag persisten con los campos, relaciones y restricciones definidos.
- [ ] El identificador público y el orden de las notas se rigen por la Spec 004.
- [ ] Una nota con casillas de verificación almacena el contenido de texto como cadena vacía y el listado como pares `{text, checked}` en `contentJson` (`jsonb`), nulo sin checklist y validado por cantidad y suma de claves cuando hay checklist.
- [ ] El nombre de tag es único dentro de cada usuario, comparando en minúsculas y sin espacios externos.
- [ ] Una nota puede tener `rememberAt`, `isPinned` e `isArchived` con los valores por defecto definidos.
- [ ] Se aplica RF-REF-1 (longitudes máximas, valores por defecto y campos obligatorios exactos).
- [ ] Los tests correspondientes pasan.

## Dudas abiertas

- Ninguna.
