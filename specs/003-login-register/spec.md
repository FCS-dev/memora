# Spec 003 — Login y registro

Estado: implementada

## Contexto y objetivo

El backend ya ofrece registro, inicio de sesión, renovación de sesión y cierre. Todavía no existe la aplicación frontend. Se necesita que una persona pueda crear su cuenta e iniciar sesión desde el navegador, que su sesión permanezca activa hasta que la cierre explícitamente o caduque por inactividad, y que, al entrar, llegue a una pantalla de inicio acorde a su rol. Esta spec define la base de la aplicación frontend y las pantallas de acceso, con las longitudes de campos alineadas con la Spec 002.

## Usuarios

- **Visitante:** persona sin sesión que puede registrarse o iniciar sesión.
- **Usuario (USER):** persona autenticada que accede a la pantalla de inicio de usuario.
- **Administrador (ADMIN):** persona autenticada que accede a la pantalla de inicio de administración.

## Historias de usuario

- HU-1. Como visitante, quiero registrarme con nombre, email, contraseña y confirmación de contraseña para crear mi cuenta.
- HU-2. Como visitante, quiero iniciar sesión con mi email y contraseña para acceder a la aplicación.
- HU-3. Como usuario autenticado, quiero que mi sesión siga activa al recargar o reabrir el navegador para no iniciar sesión cada vez.
- HU-4. Como usuario autenticado, quiero cerrar sesión para terminar mi acceso de forma segura.
- HU-5. Como USER, quiero llegar a mi pantalla de inicio de usuario al entrar.
- HU-6. Como ADMIN, quiero llegar a mi pantalla de inicio de administración al entrar.

## Definiciones

- **Sesión activa:** estado en el que el navegador conserva lo necesario para operar sin volver a introducir email y contraseña.
- **Cierre de sesión explícito:** acción voluntaria del usuario que finaliza su sesión.
- **Inactividad:** periodo durante el cual el usuario no utiliza la aplicación. La sesión caduca tras 30 días de inactividad.
- **Pantalla de inicio:** primera pantalla tras autenticarse. Muestra el nombre del usuario, un encabezado que identifica su rol (por ejemplo, "Inicio" para USER y "Panel de administración" para ADMIN) y la opción de cerrar sesión. Es provisional y no incluye funcionalidad de negocio.
- **Formato de email válido:** dirección con parte local y dominio separados por "@", sin espacios y con un dominio que contenga al menos un punto. Es el mismo criterio en registro y en inicio de sesión.

## Requisitos funcionales

### Registro

- RF-1: EL SISTEMA debe ofrecer una pantalla de registro accesible sin sesión, con campos de nombre, email, contraseña y confirmación de contraseña.
- RF-2: CUANDO el visitante envíe el registro con datos válidos y ambas contraseñas coincidentes, EL SISTEMA debe crear la cuenta e iniciar sesión automáticamente, encadenando registro e inicio de sesión.
- RF-3: SI el visitante envía el registro con algún campo obligatorio vacío o compuesto solo por espacios, ENTONCES EL SISTEMA debe impedir el envío y señalar el campo correspondiente.
- RF-4: SI el email no respeta el formato de email válido, ENTONCES EL SISTEMA debe impedir el envío y mostrar un mensaje en español junto al campo de email.
- RF-5: SI la contraseña tiene menos de 8 o más de 20 caracteres, ENTONCES EL SISTEMA debe impedir el envío y mostrar un mensaje en español junto al campo de contraseña.
- RF-6: SI la confirmación de contraseña no coincide con la contraseña, ENTONCES EL SISTEMA debe impedir el envío y mostrar un mensaje en español junto al campo de confirmación.
- RF-7: SI el nombre tiene menos de 3 o más de 150 caracteres, o el email tiene menos de 5 o más de 150 caracteres, ENTONCES EL SISTEMA debe impedir el envío y mostrar un mensaje en español junto al campo correspondiente.
- RF-8: SI el email ya está registrado, ENTONCES EL SISTEMA debe mostrar un mensaje claro en español sin exponer datos internos de la cuenta.
- RF-9: MIENTRAS una solicitud de registro esté en curso, EL SISTEMA debe impedir envíos duplicados deshabilitando el control de envío.
- RF-10: EL SISTEMA debe eliminar los espacios externos del email antes de enviarlo al registro.

### Inicio de sesión

- RF-11: EL SISTEMA debe ofrecer una pantalla de inicio de sesión accesible sin sesión, con campos de email y contraseña.
- RF-12: CUANDO el visitante envíe credenciales válidas, EL SISTEMA debe iniciar la sesión y llevarlo a la pantalla de inicio según su rol.
- RF-13: SI las credenciales (email o contraseña) son incorrectas, ENTONCES EL SISTEMA debe mostrar un mensaje genérico en español sin indicar cuál dato es incorrecto, con independencia del estado de la cuenta.
- RF-14: SI las credenciales son correctas pero la cuenta está BLOCKED o DISABLED, ENTONCES EL SISTEMA debe mostrar un mensaje claro en español indicando que la cuenta no permite iniciar sesión, sin exponer datos internos.
- RF-15: MIENTRAS una solicitud de inicio de sesión esté en curso, EL SISTEMA debe impedir envíos duplicados deshabilitando el control de envío.
- RF-16: EL SISTEMA debe eliminar los espacios externos del email antes de enviarlo al inicio de sesión.

### Sesión

- RF-17: CUANDO un visitante se autentique, EL SISTEMA debe mantener la sesión activa a través de recargas y del cierre y reapertura del navegador.
- RF-18: MIENTRAS la sesión esté activa y el usuario use la aplicación, EL SISTEMA debe renovarla automáticamente sin pedir credenciales; SI transcurren 30 días de inactividad, ENTONCES EL SISTEMA debe caducar la sesión y exigir un nuevo inicio de sesión.
- RF-19: CUANDO se abra la aplicación con una sesión previamente activa, EL SISTEMA debe intentar restaurarla y mostrar la pantalla de inicio del rol; SI ya no es válida, ENTONCES EL SISTEMA debe llevar al login.
- RF-20: SI la sesión deja de ser válida (expirada o revocada) al realizar una operación, ENTONCES EL SISTEMA debe finalizarla y llevar al visitante al login.
- RF-21: CUANDO el usuario cierre sesión explícitamente, EL SISTEMA debe revocar la sesión en el servidor, eliminar el estado persistido y llevarlo al login.
- RF-22: MIENTRAS la sesión esté activa, EL SISTEMA debe ofrecer una forma visible de cerrar sesión en todo momento.
- RF-23: SI al abrir la aplicación con una sesión persistida falla la conexión, ENTONCES EL SISTEMA debe mostrar un mensaje de error en español y permitir reintentar, sin eliminar la sesión persistida.

### Acceso por rol y navegación

- RF-24: CUANDO un USER esté autenticado, EL SISTEMA debe mostrarle la pantalla de inicio de usuario, con encabezado que lo identifique como usuario.
- RF-25: CUANDO un ADMIN esté autenticado, EL SISTEMA debe mostrarle la pantalla de inicio de administración, con encabezado que lo identifique como administrador.
- RF-26: SI un rol autenticado intenta acceder por URL a la pantalla de inicio del otro rol, ENTONCES EL SISTEMA debe impedirlo y redirigirlo a su propia pantalla de inicio, sin mostrar la ajena.
- RF-27: CUANDO una persona con sesión activa visite las pantallas de login o registro, incluso mediante el botón "atrás" del navegador, EL SISTEMA debe redirigirla a la pantalla de inicio de su rol.
- RF-28: SI una persona sin sesión intenta acceder a una pantalla protegida, ENTONCES EL SISTEMA debe llevarla al login.

### Errores

- RF-29: SI el servicio responde con un error 5xx, no responde o falla la conexión durante el registro o el inicio de sesión, ENTONCES EL SISTEMA debe mostrar un mensaje de error en español y permitir reintentar.

## Requisitos no funcionales

- RNF-1: EL SISTEMA debe presentar todos los textos visibles al usuario en español neutro.
- RNF-2: EL SISTEMA no debe mostrar ni registrar contraseñas ni datos sensibles; los mensajes de error no deben exponer datos internos.
- RNF-3: EL SISTEMA debe presentarse sin desbordamiento horizontal y con todos los controles usables en anchos de 320 px a 1280 px.
- RNF-4: EL SISTEMA debe permitir alcanzar todos los controles mediante teclado, mostrar el foco de forma visible y asociar cada mensaje de error a su campo, anunciándolo a lectores de pantalla.
- RNF-5: EL SISTEMA debe aplicar la validación en el navegador como complemento, sin sustituir al servidor, que sigue siendo la autoridad de validación y autorización.
- RNF-6: EL SISTEMA debe mostrar un indicador de carga visible durante las solicitudes y mensajes por campo cuando exista error.

## Casos límite

- Registro con email ya existente, incluidas variaciones de mayúsculas o espacios externos.
- Registro con contraseñas que no coinciden.
- Registro con contraseña de 8 y de 20 caracteres (válidas) y de 7 y de 21 (inválidas).
- Registro con nombre de 3 y de 150 caracteres (válidos) y de 2 y de 151 (inválidos).
- Registro con email de 5 y de 150 caracteres (válidos) y de 4 y de 151 (inválidos).
- Campos obligatorios compuestos únicamente por espacios.
- Email con formato inválido.
- Doble clic en enviar durante registro o login.
- Credenciales incorrectas con cuenta inactiva: debe mostrarse el mensaje genérico.
- Credenciales correctas con cuenta BLOCKED o DISABLED: debe mostrarse el mensaje específico.
- Sesión revocada mientras el usuario navega (por ejemplo, el ADMIN deshabilita la cuenta): debe llevar al login.
- Acceso directo a una pantalla protegida sin sesión.
- Cierre de sesión seguido de recarga: la sesión no debe reaparecer.
- USER accediendo por URL a la pantalla de administración, y ADMIN a la de usuario.
- Recargar la pantalla de login estando ya autenticado o usar el botón "atrás" hacia ella.
- Múltiples pestañas abiertas: el cierre de sesión o la revocación en una pestaña afecta a las demás en su siguiente operación.
- Caducidad de la sesión por 30 días de inactividad.
- Falla de red al restaurar una sesión persistida: mensaje con opción de reintentar, sin perder la sesión.
- Respuesta 5xx del servidor durante registro o login.
- Restauración de la sesión cuando el navegador no conserva la cookie del servidor (por ejemplo, en desarrollo local sobre HTTP).
- Contraseña con caracteres no ASCII o espacios internos.
- Uso de mostrar/ocultar contraseña y autocompletado del navegador.
- Envío del formulario con la tecla Enter.

## Fuera de alcance

- Recuperación y restablecimiento de contraseña.
- Verificación de email por correo.
- Inicio de sesión con proveedores externos (Google, GitHub, etc.).
- Edición de perfil (nombre o contraseña) desde el frontend.
- Registro del ADMIN desde un formulario: el ADMIN se aprovisiona por el sistema y usa el mismo login.
- Funcionalidad de negocio tras el acceso (notas, tags, tareas, eventos, documentos).
- Notificaciones, selección de idioma o temas alternativos.
- Existencia de más de un ADMIN.

## Criterios de finalización

- [ ] La aplicación frontend arranca en desarrollo y muestra el login a un visitante. (RF-1, RF-11)
- [ ] El registro exige nombre, email, contraseña y confirmación, e impide el envío con mensajes en español ante campos obligatorios vacíos o solo con espacios, email con formato inválido, contraseña fuera de 8–20 y confirmación distinta. (RF-3, RF-4, RF-5, RF-6)
- [ ] El registro impide nombre fuera de 3–150 caracteres y email fuera de 5–150 caracteres. (RF-7)
- [ ] El email se normaliza quitando espacios externos antes de enviarse en registro y login. (RF-10, RF-16)
- [ ] Un registro válido crea la cuenta e inicia sesión automáticamente encadenando registro e inicio de sesión. (RF-2)
- [ ] Un email ya registrado muestra un mensaje claro sin exponer datos internos. (RF-8)
- [ ] Registro y login impiden envíos duplicados mientras la solicitud está en curso. (RF-9, RF-15)
- [ ] El login autentica credenciales válidas y lleva a la pantalla de inicio del rol correspondiente. (RF-12, RF-24, RF-25)
- [ ] Credenciales incorrectas muestran un mensaje genérico, incluso si la cuenta está inactiva. (RF-13)
- [ ] Credenciales correctas con cuenta BLOCKED o DISABLED muestran un mensaje específico. (RF-14)
- [ ] La sesión persiste a través de recargas y del cierre y reapertura del navegador, y se renueva automáticamente con el uso. (RF-17, RF-18)
- [ ] Una sesión con 30 días de inactividad caduca y exige de nuevo iniciar sesión. (RF-18)
- [ ] Al abrir la aplicación con sesión previa válida se restaura y muestra la pantalla del rol; si ya no es válida, se va al login. (RF-19, RF-20)
- [ ] Si falla la red al restaurar la sesión, se muestra un error y se permite reintentar sin eliminar la sesión persistida. (RF-23)
- [ ] El cierre de sesión explícito revoca la sesión, elimina el estado persistido y lleva al login. (RF-21)
- [ ] Existe una forma visible de cerrar sesión mientras la sesión está activa. (RF-22)
- [ ] Un rol no puede acceder por URL a la pantalla de inicio del otro y se le redirige a la suya. (RF-26)
- [ ] Con sesión activa, visitar login o registro, incluso con el botón "atrás", redirige a la pantalla de inicio del rol. (RF-27)
- [ ] Sin sesión, acceder a una pantalla protegida lleva al login. (RF-28)
- [ ] Los errores 5xx o de conexión muestran un mensaje en español y permiten reintentar. (RF-29)
- [ ] Todos los textos visibles están en español neutro. (RNF-1)
- [ ] Los mensajes de error no exponen datos internos ni contraseñas. (RNF-2)
- [ ] Las pantallas se usan sin desbordamiento horizontal entre 320 px y 1280 px. (RNF-3)
- [ ] Todos los controles son alcanzables por teclado con foco visible, y los errores se asocian a su campo y se anuncian a lectores de pantalla. (RNF-4)
- [ ] Las validaciones del navegador son complementarias y el servidor sigue siendo la autoridad. (RNF-5)
- [ ] Los formularios muestran indicador de carga y mensajes por campo. (RNF-6)
- [ ] Los tests correspondientes pasan.

## Dudas abiertas

- Ninguna.
