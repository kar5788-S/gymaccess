# Requisitos Generales y de Arquitectura (project-context.md)

- El propósito del sistema es centralizar la información del gimnasio y administrar clientes, membresías, pagos y accesos mediante reconocimiento facial.

- La arquitectura del sistema está separada en tres capas: Frontend (React + JavaScript), Backend (Node.js + Express) y Base de datos (MySQL local con InnoDB y utf8mb4).

- La seguridad incluye autenticación basada en tokens JWT, protección de contraseñas con bcrypt, uso de variables de entorno y validación estricta de permisos en el servidor.

- El sistema contempla cuatro roles principales de usuario: Administrador, Recepcionista, Entrenador y Cliente.

## 2. Sprint 1: Base del Sistema, Usuarios y Clientes (spec.md)

- El sistema debe permitir a un usuario registrado autenticarse mediante correo y contraseña.

- El sistema debe rechazar credenciales inválidas con un mensaje claro que no revele detalles internos, bloqueando la cuenta por 15 minutos tras 5 intentos fallidos consecutivos.

- El sistema debe restringir las acciones de cada usuario según su rol asignado, aplicando la validación directamente en el servidor.

- El sistema debe permitir al administrador registrar nuevos usuarios con un rol asignado.

- El sistema debe permitir al administrador modificar usuarios existentes y cambiar su rol.

- La administración de usuarios y roles debe ser exclusiva del rol administrador.

- El sistema debe permitir a administradores y recepcionistas crear registros de clientes, advirtiendo sobre posibles duplicados si coincide el nombre con el teléfono o correo.

- El sistema debe permitir a administradores y recepcionistas actualizar los registros de los clientes.

- El sistema debe permitir consultar información de clientes según los permisos del rol, mostrando a los entrenadores únicamente el nombre completo y datos de contacto.

- El sistema debe permitir a un cliente consultar exclusivamente su propia información.

- El sistema debe validar los datos ingresados por el usuario antes de almacenarlos.

- El sistema no debe almacenar contraseñas en texto plano y debe exigir al menos 8 caracteres con una letra mayúscula y un número.

- El sistema debe proteger los datos almacenados contra entradas maliciosas.

- El sistema no debe realizar eliminaciones físicas de registros de usuarios o clientes en este alcance.

- El sistema debe confirmar el resultado de cada operación con un mensaje claro.

- El sistema debe finalizar la sesión tras 8 horas de inactividad o cuando el usuario cierre sesión.

- El sistema debe establecer la estructura de datos necesaria para membresías y pagos sin habilitar funcionalidad operativa en este sprint.

- El sistema debe dejar preparada la estructura para relacionar información facial con un cliente sin procesarla en este sprint.

## 3. Sprint 2: Membresías, Pagos, Reconocimiento Facial y Control de Acceso (spec copy.md)

- El sistema debe permitir al administrador registrar tipos de membresía con nombre, descripción, duración y precio.

- El sistema debe permitir consultar y modificar tipos de membresía sin alterar las membresías ya asignadas.

- El sistema debe permitir asignar una membresía a un cliente activo, registrando fecha de inicio y finalización calculada, con estado inicial activa.

- El sistema debe permitir una única membresía activa por cliente.

- El sistema debe permitir renovar membresías activas o vencidas extendiendo la fecha de finalización a partir de la vigencia actual.

- El sistema debe identificar y mostrar el estado de cada membresía (activa, vencida, suspendida o cancelada) de forma inclusiva por fechas.

- El sistema debe permitir registrar pagos con monto positivo, fecha y método en efectivo, asociando cada pago a un cliente y a una membresía.

- El sistema no debe permitir la eliminación ordinaria de los registros de pagos para conservar el historial financiero.

- El sistema debe calcular y mostrar el saldo pendiente de una membresía como la diferencia entre el precio y la suma de pagos registrados.

- El sistema debe permitir al administrador consultar el historial completo de pagos y adeudos, y al cliente sus propios pagos y adeudos.

- El sistema debe permitir registrar información facial únicamente de clientes previamente registrados, reemplazando el registro anterior si ya existía.

- El sistema debe identificar a un cliente mediante su rostro en el punto de acceso antes de validar la membresía.

- El sistema debe autorizar el acceso únicamente cuando exista una coincidencia facial válida y una membresía activa y vigente.

- El sistema debe rechazar el acceso cuando la membresía no sea válida o el rostro no sea identificado, indicando un motivo claro.

- El sistema debe registrar todo intento de acceso (autorizado o rechazado) con fecha, hora, resultado y motivo de rechazo.

- El sistema debe tratar la información facial como un dato sensible, utilizándose exclusivamente para identificación y control de acceso.

- El sistema debe validar los datos de entrada antes de procesarlos y confirmar los resultados con mensajes claros.

- El sistema debe registrar acciones críticas en la auditoría de forma exclusiva para el administrador.

- El sistema debe permitir al entrenador consultar clientes, el estado de sus membresías y la asistencia sin acceso a información financiera.

- El sistema debe eliminar la información facial cuando un cliente se dé de baja o pase a estado inactivo.

- El sistema debe impedir asignar o renovar membresías a clientes con adeudos pendientes.

- El sistema debe permitir al cliente consultar en modo solo lectura su propia membresía.

## 4. Sprint 3: Entrenadores, Rutinas y Dashboard Administrativo (spec copy 2.md)

- El sistema debe permitir registrar entrenadores asociándolos a una cuenta de usuario existente con rol de entrenador activo.

- El sistema debe impedir asociar perfiles de entrenador a usuarios inexistentes, inactivos o con otro rol.

- El sistema debe permitir consultar y modificar los datos de los entrenadores sin perder sus asignaciones ni sus rutinas.

- El sistema debe permitir asignar un entrenador a un cliente activo registrando la fecha de asignación.

- El sistema debe mantener un solo entrenador principal activo por cliente, cerrando la asignación anterior con su fecha de fin.

- El sistema no debe permitir asignaciones hacia clientes inactivos o usuarios sin perfil de entrenador válido.

- El sistema debe permitir consultar los clientes asignados a cada entrenador y el conteo de su carga de trabajo.

- El sistema debe permitir al entrenador crear y modificar rutinas para los clientes de su carga, y al administrador consultarlas y editarlas en supervisión.

- El sistema debe exigir que cada rutina tenga nombre y al menos un ejercicio válido con series, repeticiones e instrucciones.

- El sistema debe conservar rutinas con estado activa o archivada, manteniendo una única rutina activa por cliente.

- El sistema debe permitir registrar objetivos de entrenamiento (descripción, meta y estado) para los clientes de la carga.

- El sistema debe permitir registrar progresos del cliente con fecha, medición y comentario, conservando el historial completo.

- El sistema debe garantizar que modificar o cumplir un objetivo no altere los progresos ya registrados.

- El sistema debe permitir al cliente consultar en modo solo lectura su propia rutina activa y su evolución.

- El sistema debe mostrar al cliente un mensaje claro cuando no tenga una rutina activa registrada.

- El sistema debe proporcionar al administrador un dashboard completo con indicadores globales (clientes, membresías, ingresos, accesos, entrenadores, rutinas, objetivos).

- El sistema debe permitir filtrar los indicadores del dashboard por periodo (mes actual, últimos 30 días e histórico).

- El sistema debe ofrecer al entrenador un panel reducido con los indicadores de su propia carga, denegando el acceso a recepcionistas y clientes.

- El sistema debe presentar los indicadores como cifras y resúmenes agregados sin exponer información sensible detallada.

- El sistema debe permitir al recepcionista consultar el personal, asignaciones y rutinas en modo solo lectura, denegándole los progresos y la edición.

- El sistema debe validar los permisos de cada operación en el servidor.

- El sistema debe validar los datos de entrada y rechazar operaciones inválidas indicando el error específico.

- El sistema debe registrar en la auditoría cambios relevantes de entrenadores, asignaciones, rutinas, objetivos y progresos.

- El sistema debe confirmar el resultado de cada operación con mensajes claros.

- El sistema debe conservar la información de entrenamiento al desactivar entrenadores o clientes.

- El sistema debe utilizar la información de entrenamiento exclusivamente para el seguimiento deportivo y apoyo operativo del gimnasio.
