# Especificación de la funcionalidad: Reportes avanzados, alertas de vencimiento y preparación para despliegue (Sprint 4)

**Feature Branch**: `004-reportes-notificaciones-despliegue`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "docs/sprints/sprint-4.md" (fuente: `docs/sprints/sprint-4.md`)

## Clarifications

### Session 2026-11-04

- Q: ¿Dónde deben generarse los archivos PDF y CSV que se exportan desde los reportes: en el navegador del usuario o en el servidor? → A: En el navegador (frontend), a partir de los datos ya cargados del reporte; el servidor no crea archivos de exportación (RN-S4-03).
- Q: ¿Cómo debe agrupar el reporte de accesos las asistencias para identificar las horas pico: por hora exacta del día o por turnos? → A: Por hora exacta del día (08:00–09:00), con ranking de horas de mayor afluencia; sin agrupación por turnos.
- Q: ¿Debe poder el entrenador consultar el panel de alertas de membresías por vencer, o debe quedarse solo para recepción y administración? → A: Solo recepcionista y administrador; el entrenador y el cliente no ven el panel ni el destacado.
- Q: ¿Puede el recepcionista usar el nuevo reporte consolidado de accesos con filtros y horas pico, o sigue limitado a la consulta operativa de accesos que ya tiene? → A: No; el reporte consolidado es exclusivo del administrador y el recepcionista conserva su consulta operativa actual.
- Q: ¿Qué pagos debe considerar el total recaudado del reporte financiero cuando un registro de pago tiene un estado distinto de confirmado? → A: Se listan todos los pagos del periodo con su estado y el total recaudado suma únicamente los confirmados.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Reporte financiero de ingresos (Prioridad: P1)

Como administrador, quiero consultar un reporte detallado de ingresos por
rango de fechas y método de pago, para auditar las finanzas del gimnasio.

**Por qué esta prioridad**: Es el núcleo del sprint: sin el reporte de
ingresos no existe auditoría financiera ni insumo para la exportación. Entrega
valor por sí sola al permitir ver cuánto se recaudó, cuándo y por qué medio.

**Prueba independiente**: Puede probarse de forma independiente generando el
reporte desde una cuenta administradora sobre un periodo con pagos registrados
y verificando que los totales coincidan con los pagos del periodo, y que un
rol sin permiso reciba denegación.

**Escenarios de aceptación**:

1. **Dado** una sesión de administrador, **Cuando** selecciona un rango de
   fechas y solicita el reporte de ingresos, **Entonces** el sistema lista
   los pagos del periodo con su estado y muestra el total recaudado (que
   suma únicamente los pagos confirmados) desglosado por tipo de membresía y
   por método de pago.
2. **Dado** un periodo con pagos registrados, **Cuando** se genera el
   reporte, **Entonces** cada método de pago presenta su subtotal sobre los
   pagos confirmados y la suma de los subtotales coincide con el total
   general del periodo.
3. **Dado** una sesión de recepcionista o entrenador, **Cuando** intenta
   consultar o exportar el reporte de ingresos, **Entonces** el sistema
   deniega la operación con respuesta `403 Forbidden` y no expone cifras
   financieras.
4. **Dado** un rango de fechas sin pagos registrados, **Cuando** se genera el
   reporte, **Entonces** se muestra una tabla vacía con la leyenda "No hay
   registros para este periodo", sin errores en pantalla.
5. **Dado** una sesión de administrador, **Cuando** genera un reporte
   financiero, **Entonces** la generación queda registrada en la auditoría
   con usuario, periodo consultado, fecha y resultado.
6. **Dado** un rango con fecha de inicio posterior a la fecha de fin,
   **Cuando** se solicita el reporte, **Entonces** el sistema rechaza la
   solicitud e indica que el rango de fechas es inválido, sin generar el
   reporte.

---

### Historia de usuario 2 - Panel de alertas de membresías por vencer (Prioridad: P1)

Como recepcionista o administrador, quiero visualizar un panel de alertas con
los clientes cuya membresía vencerá en los próximos 5 días, para gestionar su
renovación oportuna.

**Por qué esta prioridad**: Impacta directamente los ingresos del gimnasio:
cada renovación olvidada es un ingreso perdido y un cliente que puede quedar
sin acceso. Es una consulta de uso diario del personal, por lo que aporta
valor desde el primer día.

**Prueba independiente**: Puede probarse de forma independiente registrando
una membresía activa que vence en 3 días, abriendo el panel como
recepcionista y verificando que el cliente aparezca, y que una membresía ya
vencida o suspendida no aparezca.

**Escenarios de aceptación**:

1. **Dado** una membresía activa cuyo vencimiento ocurre dentro de 5 días o
   menos (incluido el día de hoy), **Cuando** el recepcionista o el
   administrador abre el panel de alertas, **Entonces** el cliente aparece en
   la lista con su nombre, tipo de membresía y días restantes.
2. **Dado** una membresía vencida, suspendida o cancelada, **Cuando** se
   consulta el panel de alertas, **Entonces** esa membresía no se lista como
   alerta por vencer.
3. **Dado** un panel principal o módulo de membresías con clientes por vencer
   en 5 días o menos, **Cuando** el recepcionista o el administrador lo
   abre, **Entonces** esos clientes se destacan visualmente con color de
   alerta (amarillo) junto a su información.
4. **Dado** una sesión de entrenador o cliente, **Cuando** intenta consultar
   el panel de alertas o el destacado de vencimiento, **Entonces** el sistema
   deniega la consulta.
5. **Dado** que no existen membresías por vencer, **Cuando** se abre el panel
   de alertas, **Entonces** se muestra un mensaje claro "Sin alertas de
   vencimiento próximo", sin errores.
6. **Dado** un cliente con más de una membresía activa, **Cuando** se evalúa
   su vencimiento, **Entonces** la alerta refleja la fecha de vencimiento más
   próxima de sus membresías activas.

---

### Historia de usuario 3 - Reporte de accesos y concurrencia (Prioridad: P2)

Como administrador, quiero consultar el historial consolidado de accesos
autorizados y rechazados con filtros por cliente y fecha, para analizar horas
pico y patrones de asistencia.

**Por qué esta prioridad**: Aporta la lectura operativa del gimnasio (cuándo
hay más afluencia y quién asiste), pero depende de los accesos ya registrados
en sprints anteriores y complementa al reporte financiero; puede construirse
después de la historia 1.

**Prueba independiente**: Puede probarse de forma independiente generando el
reporte sobre un periodo con accesos autorizados y rechazados, filtrando por
un cliente y verificando que solo aparezcan sus accesos, con el motivo de
rechazo cuando corresponda.

**Escenarios de aceptación**:

1. **Dado** una sesión de administrador, **Cuando** consulta el reporte de
   accesos sin filtros adicionales, **Entonces** muestra los accesos
   autorizados y rechazados del periodo con fecha, hora, cliente y resultado.
2. **Dado** un periodo con accesos registrados, **Cuando** se genera el
   reporte, **Entonces** agrupa los accesos por hora exacta del día (por
   ejemplo, 08:00–09:00) e identifica las horas pico de mayor afluencia del
   periodo.
3. **Dado** un filtro por cliente, **Cuando** se aplica al reporte,
   **Entonces** solo se muestran los accesos de ese cliente y sus totales se
   recalculan.
4. **Dado** un acceso rechazado, **Cuando** se muestra en el reporte,
   **Entonces** incluye el motivo de rechazo registrado.
5. **Dado** un rango de fechas sin accesos, **Cuando** se genera el reporte,
   **Entonces** se muestra la tabla vacía con la leyenda "No hay registros
   para este periodo".
6. **Dado** una sesión de recepcionista, entrenador o cliente, **Cuando**
   intenta consultar el reporte consolidado de accesos, **Entonces** el
   sistema deniega la operación; el recepcionista conserva su consulta
   operativa de accesos existente.

---

### Historia de usuario 4 - Exportación de reportes a PDF y Excel (Prioridad: P2)

Como administrador, quiero descargar los reportes de finanzas y asistencias
en formato PDF y/o CSV (Excel), para archivado o presentación externa.

**Por qué esta prioridad**: Multiplica el valor de las historias 1 y 3 al
permitir entregar comprobantes fuera del sistema; depende de que los reportes
existan, por lo que se construye después de ellas.

**Prueba independiente**: Puede probarse de forma independiente generando un
reporte con datos, pulsando cada botón de exportación y verificando que el
archivo descargado contenga el mismo periodo, columnas y totales que la
pantalla.

**Escenarios de aceptación**:

1. **Dado** un reporte generado, **Cuando** el administrador pulsa
   "Exportar PDF", **Entonces** se descarga un documento con el encabezado
   de GymAccess, el periodo, los datos y los totales correspondientes.
2. **Dado** un reporte generado, **Cuando** el administrador pulsa
   "Exportar Excel (CSV)", **Entonces** se descarga un archivo con las
   mismas columnas y cifras mostradas en pantalla.
3. **Dado** un rango sin registros, **Cuando** el administrador intenta
   exportar, **Entonces** el sistema informa que no hay registros para el
   periodo y no entrega un archivo vacío.
4. **Dado** el proceso de exportación, **Cuando** finaliza correctamente o
   falla, **Entonces** no quedan archivos temporales almacenados de forma
   permanente en el servidor y nunca se entrega un archivo incompleto.
5. **Dado** una sesión de recepcionista, entrenador o cliente, **Cuando**
   intenta exportar el reporte de ingresos, **Entonces** el sistema deniega
   la operación.
6. **Dado** un reporte con datos, **Cuando** se exporta, **Entonces** el
   archivo contiene exactamente los mismos datos del periodo mostrado en
   pantalla, sin cifras distintas.

---

### Historia de usuario 5 - Optimización de rendimiento y preparación para despliegue (Prioridad: P3)

Como sistema y desarrollador, quiero consultas rápidas y una configuración de
producción lista, para que la validación de acceso y los reportes respondan
con estabilidad antes del despliegue.

**Por qué esta prioridad**: Es la condición de estabilidad previa a la puesta
en producción; se apoya en las historias anteriores (sus flujos ya operan) y
sin ella el sistema no está listo para desplegarse, aunque su valor se
percibe como calidad y no como una función visible.

**Prueba independiente**: Puede probarse de forma independiente midiendo el
tiempo de la validación de acceso y de la generación de reportes con datos de
prueba volumétricos, y verificando que la configuración de producción provenga
del entorno sin secretos en el repositorio.

**Escenarios de aceptación**:

1. **Dado** un cliente registrado con información facial y membresía activa,
   **Cuando** se realiza la validación de acceso por reconocimiento facial,
   **Entonces** el sistema resuelve la identificación del cliente y el estado
   de su membresía en menos de 200 milisegundos.
2. **Dado** un periodo de hasta un mes con datos representativos de pagos y
   accesos, **Cuando** el administrador genera los reportes, **Entonces** se
   muestran en menos de 5 segundos, sin degradación visible en usos
   consecutivos.
3. **Dado** el entorno de producción, **Cuando** se despliega el sistema,
   **Entonces** la configuración sensible proviene de variables de entorno y
   el repositorio no contiene secretos, credenciales ni información sensible.
4. **Dado** el repositorio del proyecto, **Cuando** se ejecuta el proceso de
   compilación documentado, **Entonces** la aplicación queda lista para
   desplegarse sin pasos manuales no documentados.
5. **Dado** una configuración de producción incompleta (variable de entorno
   faltante), **Cuando** se intenta iniciar el sistema, **Entonces** muestra
   un mensaje claro de configuración ausente sin filtrar credenciales ni
   datos internos.
6. **Dado** que las consultas frecuentes se optimizan, **Cuando** se ejecutan
   los scripts de datos correspondientes, **Entonces** los cambios quedan
   documentados y no alteran la información existente.

---

### Casos límite

- ¿Qué ocurre cuando el rango de fechas seleccionado no contiene registros?
  Se muestra una tabla vacía con la leyenda "No hay registros para este
  periodo" y la exportación no entrega un archivo vacío.
- ¿Qué ocurre si el rango de fechas está invertido (fin anterior a inicio)?
  Se rechaza la solicitud indicando el dato incorrecto, sin generar reporte.
- ¿Qué ocurre si la membresía vence hoy mismo? Se lista en el panel de
  alertas: el criterio de 5 días incluye el día actual (diferencia de 0
  días).
- ¿Qué ocurre con membresías vencidas, suspendidas o canceladas? No entran
  al panel de alertas por vencer; se atienden en sus módulos de estado.
- ¿Qué ocurre si un cliente tiene más de una membresía activa? La alerta
  refleja la fecha de vencimiento más próxima entre sus membresías activas.
- ¿Qué ocurre si no hay alertas vigentes? El panel muestra un mensaje claro
  de "sin alertas", sin error.
- ¿Qué ocurre si un usuario sin permiso intenta acceder a los reportes
  financieros, al reporte de accesos o a la exportación? Recibe denegación
  (`403 Forbidden`) validada en el servidor, sin exponer datos.
- ¿Qué ocurre si la exportación falla a mitad de proceso? Se informa el
  error con un mensaje claro y no se entrega un archivo incompleto.
- ¿Qué ocurre si el periodo consultado es muy amplio (histórico)? Se
  responde dentro del tiempo establecido para los reportes; si el volumen lo
  impide, se indica al usuario que acote el rango.
- ¿Qué ocurre si cambia el día del sistema mientras el panel está abierto?
  Las alertas se recalculan al volver a consultar el panel.
- ¿Qué ocurre si falta una variable de entorno en producción? El sistema no
  arranca con valores por defecto ni credenciales embebidas; informa la
  configuración ausente.
- ¿Qué ocurre si un pago del periodo está pendiente o anulado? Se lista con
  su estado dentro del reporte, pero no suma al total recaudado; la
  información financiera no se elimina de manera ordinaria. Si un acceso es
  corregido, el reporte refleja el estado vigente del registro.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir al administrador generar el reporte
  de ingresos para un rango de fechas, listando los pagos del periodo con su
  estado y mostrando el total recaudado —que suma únicamente los pagos
  confirmados— desglosado por tipo de membresía y por método de pago.
- **FR-002**: El sistema DEBE validar en el servidor que únicamente el
  administrador consulte y exporte información financiera, respondiendo con
  `403 Forbidden` a recepcionista, entrenador y cliente.
- **FR-003**: El sistema DEBE registrar en la auditoría la generación de
  reportes sensibles (usuario, periodo, fecha y resultado).
- **FR-004**: El sistema DEBE permitir al administrador —y únicamente a él—
  generar el reporte consolidado de accesos con filtros por cliente y rango
  de fechas, mostrando los accesos autorizados y rechazados con su
  resultado y, en su caso, el motivo de rechazo.
- **FR-005**: El sistema DEBE agrupar los accesos por hora exacta del día
  (por ejemplo, 08:00–09:00) e identificar las horas pico de mayor afluencia
  dentro del periodo consultado.
- **FR-006**: El sistema DEBE mostrar un panel de alertas con los clientes
  cuya membresía activa vence en 5 días o menos respecto a la fecha actual
  (incluido el día de hoy), visible para recepcionista y administrador.
- **FR-007**: El sistema DEBE excluir del panel de alertas las membresías
  vencidas, suspendidas o canceladas.
- **FR-008**: El sistema DEBE destacar visualmente con color de alerta a los
  clientes con membresía por vencer en 5 días o menos en el panel principal
  y en el módulo de membresías.
- **FR-009**: El sistema DEBE denegar el acceso al panel de alertas y a los
  reportes a los roles entrenador y cliente, validando el permiso en el
  servidor.
- **FR-010**: El sistema DEBE permitir exportar los reportes de ingresos y
  de accesos en formato PDF y en formato CSV compatible con hojas de
  cálculo (Excel).
- **FR-011**: El sistema DEBE incluir en cada exportación el encabezado de
  GymAccess, el periodo, las columnas mostradas y los totales, coincidiendo
  con lo presentado en pantalla.
- **FR-012**: El sistema NO DEBE almacenar archivos de exportación de forma
  permanente en el servidor, y NUNCA DEBE entregar un archivo vacío ni
  incompleto.
- **FR-013**: El sistema DEBE mostrar la leyenda "No hay registros para este
  periodo" cuando el rango consultado no contenga datos, en pantalla y al
  intentar exportar, sin errores.
- **FR-014**: El sistema DEBE validar los datos de entrada (rango de fechas
  y filtros), rechazando rangos inválidos indicando el dato incorrecto y sin
  generar el reporte.
- **FR-015**: El sistema DEBE resolver la validación de acceso por
  reconocimiento facial (identificación del cliente y estado de su
  membresía) en un tiempo menor a 200 milisegundos.
- **FR-016**: El sistema DEBE mostrar los reportes en menos de 5 segundos
  para periodos de hasta un mes con datos representativos.
- **FR-017**: El sistema DEBE entregar la configuración sensible de
  producción mediante variables de entorno, mantener fuera del repositorio
  el archivo de credenciales y conservar un archivo de ejemplo sin
  información sensible.
- **FR-018**: El sistema DEBE proporcionar un proceso de compilación
  documentado y reproducible que deje la aplicación lista para el despliegue
  sin pasos manuales no documentados.
- **FR-019**: El sistema DEBE optimizar las consultas frecuentes (búsqueda
  por cliente, fechas y estado) y documentar los cambios en los scripts de
  datos, sin alterar la información existente.
- **FR-020**: El sistema DEBE registrar en la auditoría los cambios de
  configuración relevantes para el despliegue, con usuario, fecha y
  resultado.
- **FR-021**: El sistema DEBE confirmar cada operación con mensajes claros
  de éxito o error, sin revelar información técnica interna ni credenciales.
- **FR-022**: El sistema DEBE generar los reportes consultando la
  información existente, sin crear copias históricas de reportes ni
  eliminar información financiera o de accesos.

### Entidades clave *(incluye si la funcionalidad maneja datos)*

- **Reporte de ingresos**: vista agregada de los pagos de un periodo con su
  total y su desglose por tipo de membresía y método de pago; se deriva de
  los pagos registrados y no almacena datos nuevos.
- **Reporte de accesos**: historial consolidado de los intentos de acceso de
  un periodo con filtros por cliente y fecha, su resultado, su motivo de
  rechazo y la agrupación por hora que permite identificar horas pico.
- **Alerta de vencimiento**: dato derivado de una membresía activa con su
  fecha de fin próxima; asocia al cliente, su tipo de membresía y los días
  restantes; se calcula al consultar y no se persiste como registro propio.
- **Exportación de reportes**: archivo derivado (PDF o CSV) generado bajo
  demanda a partir del reporte visible; no es un dato persistente del
  sistema.
- **Configuración de despliegue**: parámetros sensibles del entorno
  (conexión a datos, credenciales y valores de producción) que se manejan
  fuera del código y nunca deben quedar en el repositorio.
- **Auditoría**: registro existente de acciones importantes; en este sprint
  recibe la generación de reportes sensibles y los cambios de configuración
  relevantes.

### Límites del alcance

- Quedan fuera: envío de correos electrónicos, SMS o WhatsApp; las
  notificaciones se limitan a alertas visuales en la interfaz.
- Quedan fuera: pasarelas de pago en línea y integraciones con plataformas
  externas de pago.
- Quedan fuera: aplicación móvil nativa para iOS o Android.
- Quedan fuera: gráficas avanzadas del módulo financiero; los reportes se
  presentan como tablas y cifras.
- No se almacena historial de reportes generados ni se crea una copia
  histórica de los mismos.
- No se agregan roles nuevos ni se amplían permisos: el reporte financiero
  y el consolidado de accesos siguen siendo exclusivos del administrador.
- No se modifican los módulos de clientes, membresías, pagos, acceso
  facial, entrenamiento ni dashboard, salvo su lectura para alimentar los
  reportes y el destacado de vencimientos, y la documentación de la
  optimización de consultas.
- No se define programación de alertas diferidas ni notificaciones push.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Al cierre del sprint, el 100% de los escenarios de aceptación
  de las 5 historias de usuario pasan en pruebas funcionales.
- **SC-002**: El administrador genera el reporte financiero de un mes con
  datos y lo consulta en pantalla en menos de 5 segundos, sin ayuda de
  soporte técnico.
- **SC-003**: En pruebas de seguridad, el 100% de los intentos de
  recepcionistas, entrenadores y clientes por consultar o exportar
  información financiera reciben denegación; 0 usuarios sin permiso obtienen
  cifras financieras.
- **SC-004**: El panel de alertas refleja el 100% de las membresías activas
  que vencen en 5 días o menos (0 falsos negativos en las pruebas) y excluye
  el 100% de las vencidas, suspendidas y canceladas.
- **SC-005**: El 100% de las exportaciones a PDF y a CSV descargan archivos
  legibles con el mismo periodo, columnas y totales que la pantalla; 0
  archivos temporales permanentes y 0 archivos vacíos entregados.
- **SC-006**: El 95% de las validaciones de acceso resuelven en menos de
  200 milisegundos durante las pruebas con datos representativos.
- **SC-007**: El 100% de los periodos sin registros muestran la leyenda
  "No hay registros para este periodo" y 0 pantallas presentan errores por
  falta de datos.
- **SC-008**: El 100% de las generaciones de reportes financieros y de los
  cambios de configuración relevantes quedan registrados en la auditoría con
  usuario, fecha y resultado.
- **SC-009**: El 90% del personal probado completa sin ayuda el flujo:
  generar reporte financiero → exportarlo → revisar alertas de vencimiento →
  consultar reporte de accesos.
- **SC-010**: El sistema queda listo para despliegue: 0 secretos en el
  repositorio y el proceso de compilación se ejecuta de principio a fin sin
  pasos manuales no documentados.

## Supuestos

- El alcance de este sprint está autorizado por el documento de insumo
  `docs/sprints/sprint-4.md`; al cierre del sprint, la documentación maestra
  (`project-context.md`, `reglas.md` y la constitución) DEBE sincronizarse
  para reflejar el módulo de reportes, las alertas de vencimiento y la
  preparación para despliegue, conforme a la regla de gobernanza que exige
  documentar cambios de alcance y reglas de negocio.
- El sistema reutiliza la autenticación, los cuatro roles, los clientes,
  membresías, pagos, accesos, reconocimiento facial, auditoría y dashboard
  construidos en los sprints anteriores; este sprint los lee pero no modifica
  sus reglas.
- El reporte de ingresos y el reporte consolidado de accesos son
  exclusivos del administrador (según las historias del insumo, la RN-S4-01
  y la decisión registrada en Clarifications); el recepcionista conserva su
  consulta operativa de accesos existente y no accede a cifras financieras.
- El panel de alertas es visible para recepcionista y administrador; el
  entrenador (que sí consulta estados de membresías en sus módulos) y el
  cliente no acceden al panel ni al destacado de vencimientos (decisión
  registrada en Clarifications).
- El criterio de vencimiento considera únicamente membresías **activas** con
  una diferencia de 5 días o menos entre la fecha de vencimiento y la fecha
  actual, incluyendo el día de hoy; las membresías vencidas, suspendidas o
  canceladas no generan alerta por vencer.
- La exportación se genera bajo demanda en el navegador del usuario a
  partir de los datos ya cargados del reporte visible, sin crear archivos
  en el servidor (decisión registrada en Clarifications, RN-S4-03); el PDF y
  el CSV se construyen del lado del cliente con una librería de exportación
  que deberá justificarse ante el equipo conforme a la constitución.
- "Excel" se interpreta como archivo CSV compatible con hojas de cálculo,
  por ser el formato abierto de exportación tabular.
- El reporte de accesos agrupa por hora exacta del día (por ejemplo,
  08:00–09:00) y señala las horas de mayor afluencia del periodo (decisión
  registrada en Clarifications); en este sprint no se agrupa por turnos
  (mañana, tarde, noche).
- Los tiempos de respuesta (< 200 ms en validación de acceso y < 5 s en
  reportes) se miden en el entorno de pruebas con datos representativos.
- La optimización de consultas se implementa con los mecanismos de
  búsqueda optimizada del motor de datos (por ejemplo, índices sobre
  cliente, fechas y estado), descritos en los scripts de datos del proyecto
  y sin alterar la información existente (RN-S4-04).
- La configuración de producción usa variables de entorno; el archivo de
  credenciales sigue fuera del repositorio y se mantiene actualizado el
  archivo de ejemplo, conforme a la constitución (Principio V).
- Las alertas se calculan al consultar: no hay envío de mensajes ni
  programación de avisos diferidos en este sprint.
- No se crea historial de reportes generados: cada consulta es bajo
  demanda y refleja el estado vigente de los datos.
- El reporte financiero excluye la eliminación de registros: los pagos y
  accesos se conservan íntegros (RN-06 y RN-10); el total recaudado suma
  únicamente los pagos confirmados y los no confirmados se listan con su
  estado (decisión registrada en Clarifications).
