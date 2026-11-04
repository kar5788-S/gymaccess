# Phase 0: Research — Reportes avanzados, alertas de vencimiento y preparación para despliegue (Sprint 4)

**Date**: 2026-11-04 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

Resolución de los unknowns del Technical Context del Sprint 4 y de las
decisiones que el insumo (`docs/sprints/sprint-4.md`, sección 9) dejaba
pendientes, ya respondidas en la sección `Clarifications` del spec (2026-11-04).
Las decisiones R-01…R-12 del Sprint 1, R-13…R-27 del Sprint 2 y R-28…R-37 del
Sprint 3 se heredan sin cambios (ver `specs/001-sprint1-auth-clientes/research.md`,
`specs/002-sprint2-membresias-pagos-acceso-facial/research.md` y
`specs/003-entrenadores-rutinas-dashboard/research.md`). El Technical Context
de este sprint **no contiene NEEDS CLARIFICATION**: el stack está fijado por la
constitución (Principio III) y reutiliza la arquitectura ya construida.
Formato: Decisión / Rationale / Alternatives considered.

## R-38: Cálculo del reporte financiero de ingresos

- **Decision**: agregados SQL parametrizados en `reporte.service` /
  `reporte.model`: detalle de los pagos del rango (`JOIN` con `clientes`,
  `membresias` y `tipos_membresia`), `total_recaudado` como
  `SUM(monto) WHERE estado = 'confirmado'`, desglose por tipo de membresía y
  por método de pago calculado también solo sobre confirmados, y conteos de
  pagos confirmados y no confirmados. Sin tablas ni vistas nuevas y sin
  copias históricas: cada consulta refleja el estado vigente (FR-022).
- **Rationale**: el spec define el reporte como una vista agregada que "se
  deriva de los pagos registrados y no almacena datos nuevos"; SQL puro
  mantiene el backend sin dependencias nuevas (Principio III), permite auditar
  cada cifra y reutiliza los índices de la migración 004 (R-43). Los totales
  se recalculan en cada petición, de modo que una corrección posterior se
  refleja de inmediato.
- **Alternatives considered**: tabla materializada de reportes (rechazada:
  crearía el historial de reportes que el spec prohíbe y exigiría
  sincronización); librería de BI o gráficas (rechazada: fuera de alcance, el
  spec limita los reportes a tablas y cifras); calcular las cifras en el
  frontend a partir de los pagos crudos (rechazada: traslada la regla de
  negocio fuera del backend y hace el `403` de RN-S4-01 insuficiente, ya que
  los datos viajarían a roles sin permiso).

## R-39: Estado de los pagos y criterio del total recaudado

- **Decision**: `ALTER TABLE pagos ADD COLUMN estado ENUM('confirmado',
  'pendiente', 'anulado') NOT NULL DEFAULT 'confirmado'` en
  `004_sprint4.sql`. Las filas existentes quedan `confirmado` (no se altera
  información). `POST /api/pagos` sigue insertando sin columna y hereda el
  valor por defecto. El reporte lista todos los pagos del periodo con su
  estado y suma al total únicamente los confirmados (Clarifications Q5).
- **Rationale**: es la única forma de distinguir estados sin destruir el
  historial financiero (Principio VII, RN-06); el valor por defecto conserva
  intacta la información existente y alinea la implementación con
  `docs/project-context.md` (sección 14.3), que ya documenta `pagos.estado`
  como parte del modelo. Se agrega el índice `idx_pagos_estado` (R-43).
- **Alternatives considered**: derivar el estado del adeudo (rechazada: el
  adeudo se calcula como precio menos pagado y no expresa el estado de un
  pago); tabla separada de anulaciones (rechazada: añade joins, más
  superficie de escritura y el mismo riesgo de borrado); no distinguir
  estados (rechazada: incumple la aclaración Q5 y el caso límite de pagos
  pendientes o anulados). **Fuera de alcance**: no se crea endpoint para
  cambiar el estado de un pago en este sprint (los límites del alcance
  exigen leer los módulos existentes, no modificarlos); los estados
  distintos de `confirmado` se cargan directamente en los datos de prueba
  para verificar el comportamiento del reporte.

## R-40: Reporte consolidado de accesos y horas pico

- **Decision**: `reporte.model` consulta `accesos` con `JOIN` a `clientes`,
  filtros `fecha BETWEEN ? AND ?` (y `cliente_id` opcional) sobre el índice
  `idx_accesos_fecha_hora`; devuelve el detalle con `resultado` y
  `motivo_rechazo`, los totales (general, autorizados, rechazados)
  recalculados con el filtro aplicado y un resumen agrupado por hora exacta
  (`HOUR(hora)` → etiqueta "08:00–09:00") ordenado de mayor a menor afluencia
  para identificar las horas pico (Clarifications Q2, FR-005).
- **Rationale**: la columna real es `fecha DATE` + `hora TIME` (el insumo la
  nombra `fecha_hora`; ver mapeo en [data-model.md](data-model.md)); agrupar
  con `HOUR(hora)` en SQL mantiene la lógica en el backend y usa el índice
  compuesto; el orden descendente por total entrega el ranking sin lógica en
  el cliente.
- **Alternatives considered**: agrupar por turnos mañana/tarde/noche
  (rechazada por la aclaración Q2: el spec prohíbe modelar turnos en este
  sprint); vista SQL `vista_accesos_hora` (rechazada: una vista más que
  mantener para una agrupación puntual); agrupar en JavaScript sobre el
  detalle completo (rechazada: trasfiere carga al cliente, agranda la
  respuesta y complica el contrato).

## R-41: Panel de alertas de vencimiento y destacado visual

- **Decision**: módulo `alerta` con `GET /api/alerts/expirations`, permitido
  a `administrador` y `recepcionista` en la matriz (403 para `entrenador` y
  `cliente`). La consulta une `membresias` + `clientes` + `tipos_membresia`
  con la condición sargable `estado = 'activa' AND fecha_vencimiento BETWEEN
  CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)` (equivale a
  `DATEDIFF(fecha_fin, CURDATE()) <= 5` de RN-S4-02 e incluye el día de hoy),
  tomando por cliente la membresía activa con el vencimiento más próximo
  (MIN) y ordenando por días restantes. Las alertas se calculan al consultar
  y no se persisten. En el frontend, el componente `AlertasVencimiento` se
  renderiza en `DashboardPage` **solo para administrador** (el panel es
  compartido con el entrenador, que fue excluido en la aclaración Q3) y el
  destacado amarillo se muestra en `MembresiasPage` (administrador y
  recepcionista).
- **Rationale**: clarify Q3 fija los roles; el EARS del insumo pide el
  destacado al abrir "el dashboard o el módulo de membresías", y la
  recepcionista no tiene ruta de dashboard en la navegación existente, por lo
  que su acceso a las alertas ocurre desde el módulo de membresías; ocultar
  el panel en el cliente es solo complemento — la denegación real es el `403`
  del servidor (Principio V).
- **Alternatives considered**: endpoint dentro del módulo `membresia`
  (rechazada: mezclaría la consulta operativa con las alertas y obligaría a
  modificar un módulo que el límite de alcance protege); persistir una tabla
  `alertas` (rechazada: genera estados obsoletos y el spec define la alerta
  como dato derivado); correos, SMS o push (fuera de alcance, spec y RN-S4-05
  del insumo §8).

## R-42: Exportación a PDF y CSV en el navegador

- **Decision**: dependencias nuevas del frontend `jspdf` y
  `jspdf-autotable` más el módulo `services/exportacion.js`. El PDF se
  construye con encabezado "GymAccess", periodo, las mismas columnas y
  totales que la pantalla (las tablas las dibuja `jspdf-autotable`). El CSV se
  genera a mano con separador `;` y BOM UTF-8 (compatible con Excel en
  español) y reproduce exactamente las columnas visibles. No hay endpoint de
  exportación: los archivos se arman en el navegador con los datos ya
  autorizados que devolvió el backend (Clarifications Q1, RN-S4-03). Si el
  reporte está vacío no se descarga nada y se muestra la leyenda del spec
  (FR-013); cualquier fallo se informa con mensaje claro y sin archivo
  incompleto (HU4 esc. 4).
- **Rationale**: la aclaración Q1 fija el lado cliente y prohíbe que el
  servidor cree archivos; jsPDF es una librería ligera, sin proceso externo,
  compatible con React/Vite y cubre el caso "documento estructurado" del EARS;
  el CSV no justifica dependencia alguna (Principio III: mínimas
  dependencias). La denegación de exportación a otros roles (HU4 esc. 5) se
  resuelve en el servidor: sin el `200` de `/api/reports/*` no hay datos que
  exportar y la página de reportes ni siquiera es accesible para esos roles.
- **Alternatives considered**: `pdfmake` (rechazado: más pesado y exige
  empaquetar fuentes para el mismo resultado); stream de PDF desde Express
  (rechazado explícitamente por la aclaración Q1 y por RN-S4-03); generar el
  CSV en el servidor (rechazado: crearía archivos o lógica de archivo en el
  backend); `window.print()` (rechazado: no entrega un archivo estructurado
  con las columnas y totales que exige HU4).

## R-43: Índices y consultas sargables (migración 004)

- **Decision**: `004_sprint4.sql` agrega 6 índices sobre las tablas
  existentes: `pagos (fecha_pago)`, `pagos (estado)`, `membresias (estado)`,
  `membresias (fecha_vencimiento)`, `accesos (fecha, hora)` y `rostros
  (estado)`. Las columnas `cliente_id` ya están indexadas en `clientes`,
  `pagos`, `membresias`, `accesos` y `rostros` (UNIQUE), y `auditoria` ya
  tiene sus tres índices, por lo que RN-S4-04 queda satisfecho. Las
  condiciones de alertas y de total se escriben de forma sargable
  (`fecha_vencimiento BETWEEN …`, `fecha_pago BETWEEN … AND estado = …`) para
  que el motor use los índices; `HOUR(hora)` se aplica sobre el subconjunto
  ya filtrado por fecha.
- **Rationale**: RN-S4-04 pide índice explícito para `cliente_id`,
  `fecha_pago`, `fecha_hora` y `estado`; `idx_rostros_estado` cubre la única
  consulta de la validación facial que filtra por `estado` y sostiene el
  objetivo de < 200 ms (FR-015, RN-S4-04); los índices sobre `membresias`
  aceleran el panel de alertas del EARS. El script se aplica una vez sobre la
  BD existente (convención de `database/README.md`) y queda documentado allí
  (Principio IV, FR-019).
- **Alternatives considered**: índices compuestos `(fecha_pago, estado)` y
  `(estado, fecha_vencimiento)` (posibles, pero se prefieren índices simples
  por columna para cumplir RN-S4-04 de forma literal y dejar la selección al
  optimizador, que ya elige entre ellos según el filtro); crear una columna
  `fecha_hora` calculada (rechazada: duplicaría `fecha` + `hora`, obligaría a
  mantenerla sincronizada y alteraría más el esquema); reindexar tablas de
  sprints anteriores completas (rechazada: fuera de alcance y sin medición que
  lo justifique).

## R-44: Auditoría de generación de reportes y de configuración

- **Decision**: reutilizar `auditoria.service.registrar` (mejor esfuerzo, sin
  datos sensibles). Cada generación de reporte exitosa registra
  `modulo = 'reportes'`, `accion = 'generacion_reporte'`, `usuario_id` de la
  sesión, `resultado = 'exitoso'` y una descripción con tipo de reporte y
  periodo (FR-003, HU1 esc. 5). La validación de variables de entorno del
  arranque registra `modulo = 'configuracion'`, `accion = 'validacion_entorno'`,
  `usuario_id = null` (sistema) y `resultado` `exitoso`/`incompleto`, una vez
  que la conexión a datos está disponible (FR-020, SC-008); si la configuración
  falta en producción, el proceso termina antes de poder auditar y el mensaje
  claro de consola cumple HU5 esc. 5.
- **Rationale**: ya existe una tabla de auditoría con `usuario_id` nullable y
  un servicio con la firma adecuada; registrar la generación de reportes
  sensibles es exigido por el spec y la auditoría de la configuración de
  arranque es el único "cambio de configuración relevante" observable, dado
  que el MVP no incluye una interfaz de edición de configuración (los límites
  del alcance prohíben tocar otros módulos).
- **Alternatives considered**: middleware de auditoría genérico para todas las
  rutas (rechazado: ruido y coste sin necesidad; la auditoría existente es
  por evento); tabla nueva de logs de sistema (rechazada: duplica
  `auditoria`; el `modulo` ya distingue el origen); omitir FR-020 por no
  existir pantalla de configuración (rechazado: el requisito es explícito en
  el spec y SC-008 lo mide).

## R-45: Validación de variables de entorno y proceso de compilación

- **Decision**: módulo `config/entorno.js` con `validarEntorno()` ejecutado
  al arrancar el servidor: con `NODE_ENV=production` exige `DB_NOMBRE`,
  `DB_USUARIO`, `DB_CONTRASENA` y `JWT_SECRET` (ya exigido en `config/jwt.js`);
  si falta alguna, termina el proceso con un mensaje que lista los **nombres**
  de las variables faltantes, sin valores ni credenciales. En desarrollo
  conserva los defaults actuales documentados en `.env.example`, con aviso en
  consola. El proceso de compilación y despliegue queda documentado en
  `gymaccess/README.md` (sección "Compilación y despliegue"): migraciones en
  orden 001→004, seeds, `npm test`, `npm run build` en el frontend y
  `npm start` en el backend, reproducible de principio a fin (FR-018).
- **Rationale**: HU5 esc. 5 y FR-017 exigen no arrancar en producción con
  valores por defecto ni credenciales embebidas; el resto de la configuración
  sensible ya vive en variables de entorno fuera del repositorio (Principio V);
  FR-018 pide un proceso documentado, no una herramienta nueva de CI.
- **Alternatives considered**: validar en todos los entornos sin excepción
  (rechazado: rompería el flujo local que ya funciona con defaults
  documentados y el spec acota el requisito a la configuración de
  producción); script orquestador nuevo de despliegue (rechazado: añade
  tooling innecesario, Principio III; la documentación reproducible cumple
  FR-018); agregar un pipeline de CI (rechazado: fuera del alcance del
  sprint y de un proyecto académico local).

## R-46: Vistas, navegación y periodo por defecto

- **Decision**: nuevo módulo `reports` en `navigation/rutas.js` con etiqueta
  "Reportes", ruta `/reports` y roles `['administrador']`, protegido con
  `ProtectedRoute`; `ReportesPage` presenta dos secciones — Financiero y
  Accesos — con selector de rango de fechas (por defecto el **mes en curso**,
  coherente con el periodo "mes" del dashboard del Sprint 3), botones de
  exportación y las tablas de resultado; los servicios siguen el patrón
  `*.api.js` (`reportes.api.js`, `alertas.api.js`) y la exportación vive en
  `services/exportacion.js`. El destacado de vencimientos se resuelve con el
  mismo endpoint `GET /api/alerts/expirations` consumido por
  `AlertasVencimiento` y por `MembresiasPage`.
- **Rationale**: `navigation/rutas.js` es la fuente de verdad de módulos,
  rutas y roles (R-37 heredada); el periodo por defecto cierra el ítem
  diferido del `/speckit.clarify` sin necesidad de una sexta pregunta; un
  solo endpoint de alertas evita duplicar la regla de 5 días en dos pantallas
  (Principio II).
- **Alternatives considered**: módulo visible para recepcionista en el navbar
  (rechazado: no tiene permiso sobre los reportes y ocultar no es seguridad,
  Principio V); dos páginas separadas por reporte (rechazada: duplica
  controles de periodo y exportación sin valor adicional); parámetro de
  periodo del dashboard para los reportes (rechazado: el dashboard es un
  módulo existente que el alcance protege y sus periodos no son rangos
  arbitrarios).
