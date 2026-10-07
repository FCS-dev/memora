# Spec 001 — Backend inicial

Estado: aprobada

## Contexto y objetivo
El proyecto aún no tiene código implementado. Se necesita un backend ejecutable en desarrollo local junto con su base de datos, de forma que el equipo pueda levantar el entorno y verificar que el servicio responde antes de agregar funcionalidades de negocio.

## Usuarios
- Desarrollador del proyecto MEMORA.

## Historias de usuario
- HU-1. Como desarrollador, quiero levantar la base de datos y el backend localmente para poder trabajar en nuevas funcionalidades.
- HU-2. Como desarrollador, quiero verificar que el servicio está respondiendo para saber si el entorno arrancó correctamente.

## Definiciones
- Entorno local: la ejecución del backend y la base de datos en la máquina del desarrollador.
- Configuración sensible: contraseñas, URLs, puertos, nombres de usuario y cualquier dato que pueda variar entre entornos.
- Variables de entorno requeridas: URL de la base de datos, usuario de la base de datos, contraseña de la base de datos y puerto de la aplicación.

## Requisitos funcionales
- RF-1: CUANDO el desarrollador inicie el entorno local, EL SISTEMA debe permitir levantar la base de datos y el backend de forma que el backend pueda conectarse a la base de datos.
- RF-2: CUANDO el backend haya terminado de iniciar y se solicite el endpoint de verificación de salud, EL SISTEMA debe responder con HTTP 200 OK y un cuerpo `{"status":"ok"}`.
- RF-3: SI alguna variable de entorno requerida está ausente al iniciar el backend, ENTONCES EL SISTEMA debe fallar al arrancar y registrar un mensaje que indique qué variable falta.
- RF-4: EL SISTEMA debe leer la configuración sensible desde variables de entorno.
- RF-5: CUANDO el entorno local se inicie y la base de datos no exista, EL SISTEMA debe crearla automáticamente.

## Requisitos no funcionales
- RNF-1: EL SISTEMA debe permitir que cualquier configuración sensible se modifique sin cambiar el código fuente.
- RNF-2: EL SISTEMA debe proporcionar una plantilla de variables de entorno requeridas sin valores secretos reales.

## Casos límite
- El backend se consulta antes de terminar de iniciar: el endpoint de salud no responde porque el puerto aún no está abierto.
- El servicio de base de datos no está disponible: el backend debe registrar el error y reintentar la conexión.
- Una variable de entorno requerida está ausente: el backend no debe iniciar.
- Una variable de entorno requerida tiene un valor vacío: debe considerarse ausente.
- El puerto configurado para la aplicación está ocupado: el backend debe fallar al arrancar con un mensaje claro.

## Fuera de alcance
- Autenticación y autorización de usuarios.
- Gestión de notas, tareas, eventos o tags.
- Endpoints de negocio.
- Interfaz de usuario frontend.
- Configuración de producción.

## Criterios de finalización
- [ ] El backend compila sin errores.
- [ ] El contenedor de base de datos levanta correctamente y crea la base de datos si no existe.
- [ ] La aplicación inicia sin errores cuando todas las variables de entorno requeridas están presentes.
- [ ] La aplicación falla al arrancar con un mensaje claro cuando falta alguna variable de entorno requerida.
- [ ] Existe un test automatizado que verifica que `/health` responde `HTTP 200 OK {"status":"ok"}`, y pasa.

## Dudas abiertas
- [NECESITA ACLARACIÓN] Ninguna por el momento.
