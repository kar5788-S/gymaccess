# Tareas: Reportes avanzados, alertas de vencimiento y preparación para despliegue (Sprint 4)

**Entrada**: Documentos de diseño de `/specs/004-reportes-notificaciones-despliegue/`

**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para las historias de usuario), research.md, data-model.md, contracts/, quickstart.md

**Pruebas**: Incluidas porque la constitución (Principio X) enumera explícitamente la "Generación de reportes" entre las funciones que deben probarse, el SC-001 exige que el 100% de los escenarios pasen en pruebas funcionales, el quickstart define los comandos de prueba y los sprints anteriores ya usan Vitest + Supertest en `backend/tests/`.

**Organización**: Las tareas están agrupadas por historia de usuario para permitir implementación y pruebas independientes.

## Formato: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece (US1…US5)
- Incluir la ruta exacta del archivo en la descripción

## Convenciones de rutas

- **Web app**: rutas desde la raíz del repositorio — `gymaccess/backend/src/…`, `gymaccess/frontend/src/…`, `gymaccess/database/…`

---

## Fase 1: Preparación (Infraestructura compartida)

**Propósito**: Base de datos del Sprint 4 y su documentación

- [X] T001 Crear la migración `gymaccess/database/migrations/004_sprint4.sql` con `ALTER TABLE pagos ADD COLUMN estado ENUM('confirmado','pendiente','anulado') NOT NULL DEFAULT 'confirmado'` y los 6 índices de `data-model.md`: `idx_pagos_fecha (fecha_pago)`, `idx_pagos_estado (estado)`, `idx_membresias_estado (estado)`, `idx_membresias_vencimiento (fecha_vencimiento)`, `idx_accesos_fecha_hora (fecha, hora)` y `idx_rostros_estado (estado)` — sin tablas nuevas, sin seeds y sin backfill (las filas existentes heredan `confirmado`) — R-39, R-43, RN-S4-04
- [X] T002 [P] Documentar la migración 004 en `gymaccess/database/README.md` con su fila en la tabla de migraciones y la justificación de cada índice (Principio IV: cambios de estructura documentados; FR-019)
- [ ] T003 Ejecutar `001_initial.sql`, `002_sprint2.sql`, `003_sprint3.sql` y `004_sprint4.sql` desde cero en MySQL local y verificar con `SHOW INDEX` los 6 índices nuevos y con `DESCRIBE pagos` la columna `estado` con su valor por defecto

**Punto de control**: Base de datos del Sprint 4 aplicada: `pagos.estado` e índices disponibles

---

## Fase 2: Fundamentos (Prerrequisitos bloqueantes)

**Propósito**: Componentes compartidos por todas las historias

**⚠ CRÍTICO**: Ninguna historia de usuario puede iniciar hasta completar esta fase

- [X] T004 Ampliar `gymaccess/backend/src/middlewares/authorization.js` con la matriz del Sprint 4 definida en `contracts/api.md`: `GET /api/reports/financial` → solo `administrador`; `GET /api/reports/accesses` → solo `administrador`; `GET /api/alerts/expirations` → `administrador` y `recepcionista`
- [X] T005 [P] Ampliar `gymaccess/backend/src/utils/errors.js` y `gymaccess/backend/src/utils/responses.js` con el código nuevo `RANGO_FECHAS_INVALIDO` (`400`) con el mensaje "El rango de fechas es inválido: revisa las fechas de inicio y fin", sin detalle interno (contracts/api.md, FR-021)
- [X] T006 [P] Crear `gymaccess/backend/src/validators/reporte.validators.js` con `validarRangoFechas`: `desde` y `hasta` obligatorios con formato `YYYY-MM-DD` y `desde ≤ hasta`, rechazando el rango invertido con `RANGO_FECHAS_INVALIDO` (FR-014, HU1 esc. 6; se comparte entre US1 y US3)

**Punto de control**: Fundamento listo (matriz, código de error y validador de rango); las historias pueden empezar

---

## Fase 3: Historia de usuario 1 - Reporte financiero de ingresos (Prioridad: P1) ⭐ MVP

**Objetivo**: El administrador genera el reporte de ingresos de un rango de fechas con el listado de pagos por su estado, el total recaudado que suma solo los confirmados y el desglose por tipo de membresía y método de pago.

**Prueba independiente**: Con sesión de administrador, generar el reporte sobre un periodo con pagos `confirmado`, `pendiente` y `anulado`, verificando que el total suma solo los confirmados, que los subtotales por método coinciden con el total y que recepcionista, entrenador y cliente reciben `403`.

### Pruebas de historia de usuario 1

- [X] T007 [P] [US1] Tests contract del reporte financiero en `gymaccess/backend/tests/contract/reportes-financiero.test.js` (solo administrador → `403` en recepcionista, entrenador y cliente; rango invertido o ausente → `RANGO_FECHAS_INVALIDO`; periodo vacío → `200` con `pagos: []` y `total_recaudado: 0`; pagos `pendiente`/`anulado` listados pero fuera del total; suma de `por_metodo` y `por_tipo_membresia` = `total_recaudado`)
- [ ] T008 [P] [US1] Tests integration del reporte financiero en `gymaccess/backend/tests/integration/reportes-financiero.test.js` (pagos reales en BD con los tres estados → total correcto, auditoría registrada con `modulo='reportes'`, `accion='generacion_reporte'` y periodo en la descripción; sin datos → leyenda responsable del cliente, sin error)

### Implementación de historia de usuario 1

- [X] T009 [P] [US1] Crear `gymaccess/backend/src/models/reporte.model.js` con las consultas del reporte financiero: detalle de pagos del rango con `JOIN` a `clientes`, `membresias` y `tipos_membresia`, `total_recaudado` = `SUM(monto) WHERE estado = 'confirmado'`, desgloses `GROUP BY` tipo y método solo sobre confirmados y conteos por estado; consultas parametrizadas que usen `idx_pagos_fecha` e `idx_pagos_estado` (R-38, R-39; Clarifications Q5)
- [X] T010 [US1] Crear `gymaccess/backend/src/services/reporte.service.js` con `generarReporteFinanciero({ desde, hasta, usuario })`: valida el rango con T006, obtiene las cifras del modelo y registra auditoría `modulo='reportes'`, `accion='generacion_reporte'`, `usuario_id` de la sesión y descripción con tipo de reporte y periodo (FR-001, FR-003; HU1 esc. 5) (depende de T005, T006, T009)
- [X] T011 [US1] Crear `gymaccess/backend/src/controllers/reporte.controller.js` con la envolvente heredada (`exito`/`error`) y manejo de `RANGO_FECHAS_INVALIDO` (depende de T010)
- [X] T012 [US1] Crear `gymaccess/backend/src/routes/reportes.routes.js` con `GET /financial` (autorizado por la matriz de T004) y registrarla en `gymaccess/backend/src/app.js` bajo `/api/reports` (depende de T011)
- [X] T013 [P] [US1] Crear `gymaccess/frontend/src/services/reportes.api.js` con `obtenerReporteFinanciero(desde, hasta)` sobre el cliente `http.js` heredado
- [X] T014 [US1] Crear `gymaccess/frontend/src/pages/ReportesPage.jsx` con la sección **Financiero**: selector de rango de fechas con el mes en curso por defecto (R-46), botón "Generar reporte", tabla de pagos con su estado, `total_recaudado`, desgloses por tipo y método, leyenda "No hay registros para este periodo" y mensajes de error en español (depende de T013)
- [X] T015 [US1] Registrar la ruta `/reports` con `ProtectedRoute roles={['administrador']}` en `gymaccess/frontend/src/App.jsx`, el módulo `reports` ("Reportes", roles `['administrador']`, icono `reportes`) en `gymaccess/frontend/src/navigation/rutas.js` y el icono `reportes` en el mapa `ICONOS` de `gymaccess/frontend/src/components/Navbar.jsx` (depende de T014)

**Punto de control**: US1 funcional: reporte financiero con estados y total solo de confirmados

---

## Fase 4: Historia de usuario 2 - Panel de alertas de membresías por vencer (Prioridad: P1)

**Objetivo**: Recepcionista y administrador ven las membresías activas que vencen en 5 días o menos, con destacado amarillo en el dashboard del administrador y en el módulo de membresías; entrenador y cliente quedan denegados.

**Prueba independiente**: Registrar una membresía activa que vence en 3 días y otra que vence hoy, y verificar que aparecen con sus días restantes; una vencida, una suspendida y una cancelada no aparecen; el panel vacío muestra "Sin alertas de vencimiento próximo"; entrenador y cliente reciben `403`.

### Pruebas de historia de usuario 2

- [X] T016 [P] [US2] Tests contract de las alertas en `gymaccess/backend/tests/contract/alertas.test.js` (`GET /api/alerts/expirations` solo administrador y recepcionista → `403` en entrenador y cliente; activa a 3 días y activa con `dias_restantes: 0` aparecen; vencida, suspendida y cancelada no aparecen; dos activas del mismo cliente → una sola alerta con la fecha más próxima; sin alertas → `200` con `alertas: []`; orden por `dias_restantes` ascendente)
- [X] T017 [P] [US2] Tests del componente de alertas en `gymaccess/frontend/src/components/AlertasVencimiento.test.jsx` (lista con nombre, tipo de membresía y días restantes; estado vacío "Sin alertas de vencimiento próximo" sin errores; destacado amarillo en los casos por vencer)

### Implementación de historia de usuario 2

- [X] T018 [P] [US2] Crear `gymaccess/backend/src/models/alerta.model.js` con la consulta `JOIN` a `clientes` y `tipos_membresia` usando la condición sargable `estado = 'activa' AND fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)` (equivale a `DATEDIFF(fecha_fin, CURDATE()) <= 5` e incluye el día de hoy), agrupando por cliente con el vencimiento más próximo y ordenando por días restantes (FR-006, FR-007; RN-S4-02; R-41)
- [X] T019 [US2] Crear `gymaccess/backend/src/services/alerta.service.js` con `listarAlertasVencimiento()`: cálculo bajo demanda sin persistir alertas, sin auditoría por consulta y sin datos sensibles en la respuesta (FR-006; "Entidades clave": alerta como dato derivado) (depende de T018)
- [X] T020 [US2] Crear `gymaccess/backend/src/controllers/alerta.controller.js` con la envolvente heredada (depende de T019)
- [X] T021 [US2] Crear `gymaccess/backend/src/routes/alertas.routes.js` con `GET /` (autorizado por la matriz de T004) y registrarla en `gymaccess/backend/src/app.js` bajo `/api/alerts` (depende de T020)
- [X] T022 [P] [US2] Crear `gymaccess/frontend/src/services/alertas.api.js` con `obtenerAlertasVencimiento()`
- [X] T023 [US2] Crear `gymaccess/frontend/src/components/AlertasVencimiento.jsx` con la lista de alertas, su estado vacío y el color de alerta (amarillo) por vencimiento próximo (depende de T022)
- [X] T024 [US2] Ampliar `gymaccess/frontend/src/pages/DashboardPage.jsx` con el panel de alertas renderizado **solo para el rol `administrador`** (el panel es compartido con el entrenador, excluido en Clarifications Q3) (depende de T023)
- [X] T025 [US2] Ampliar `gymaccess/frontend/src/pages/MembresiasPage.jsx` con el destacado amarillo de los clientes con membresía activa por vencer en 5 días o menos, visible para administrador y recepcionista (FR-008, HU2 esc. 3) (depende de T022)

**Punto de control**: US2 funcional: panel y destacado solo para recepcionista y administrador

---

## Fase 5: Historia de usuario 3 - Reporte de accesos y concurrencia (Prioridad: P2)

**Objetivo**: El administrador consulta el historial consolidado de accesos con filtros por cliente y fecha, el resultado con su motivo de rechazo y el ranking de horas pico por hora exacta del día.

**Prueba independiente**: Generar el reporte sobre un periodo con accesos autorizados y rechazados, filtrar por cliente y verificar que los totales se recalculan y que `por_hora` viene ordenado de mayor a menor con etiquetas "08:00–09:00"; recepcionista, entrenador y cliente reciben `403` pero la consulta operativa del recepcionista sigue funcionando.

### Pruebas de historia de usuario 3

- [X] T026 [P] [US3] Tests contract del reporte de accesos en `gymaccess/backend/tests/contract/reportes-accesos.test.js` (solo administrador → `403` en recepcionista, entrenador y cliente; accesos autorizados y rechazados con `motivo_rechazo`; filtro `cliente_id` recalcula totales; `cliente_id` no numérico → `VALIDACION`; rango invertido → `RANGO_FECHAS_INVALIDO`; periodo vacío → listas en cero; `por_hora` ordenado por `total` descendente con etiqueta "08:00–09:00")

### Implementación de historia de usuario 3

- [X] T027 [P] [US3] Ampliar `gymaccess/backend/src/models/reporte.model.js` con las consultas del reporte de accesos: `JOIN` con `clientes`, filtros `fecha BETWEEN ? AND ?` y `cliente_id` opcional, totales (general, autorizados, rechazados) y resumen `GROUP BY HOUR(hora)` ordenado por `total` descendente con su etiqueta de rango (R-40; Clarifications Q2; sin turnos)
- [X] T028 [US3] Ampliar `gymaccess/backend/src/services/reporte.service.js` con `generarReporteAccesos({ desde, hasta, clienteId, usuario })`: valida rango con T006, valida `cliente_id` numérico, obtiene las cifras y registra auditoría `modulo='reportes'`, `accion='generacion_reporte'` con `tipo='accesos'` y el periodo (FR-003, FR-004, FR-005) (depende de T027)
- [X] T029 [US3] Ampliar `gymaccess/backend/src/controllers/reporte.controller.js` con el manejador del reporte de accesos (depende de T028)
- [X] T030 [US3] Ampliar `gymaccess/backend/src/routes/reportes.routes.js` con `GET /accesses` (autorizado por la matriz de T004) (depende de T029)
- [X] T031 [P] [US3] Ampliar `gymaccess/frontend/src/services/reportes.api.js` con `obtenerReporteAccesos(desde, hasta, clienteId)`
- [X] T032 [US3] Ampliar `gymaccess/frontend/src/pages/ReportesPage.jsx` con la sección **Accesos**: filtro por cliente, tabla de detalle con fecha, hora, cliente (o "No identificado"), resultado y motivo de rechazo, resumen `por_hora` con el ranking de horas pico y la leyenda de periodo vacío (depende de T031)

**Punto de control**: US3 funcional: reporte de accesos con horas pico y filtro por cliente

---

## Fase 6: Historia de usuario 4 - Exportación de reportes a PDF y Excel (Prioridad: P2)

**Objetivo**: El administrador descarga los reportes visibles en PDF y en CSV compatible con Excel, generado en el navegador con exactamente las mismas columnas y cifras que la pantalla y sin crear archivos en el servidor.

**Prueba independiente**: Con un reporte generado, pulsar cada botón de exportación y verificar que el PDF incluye encabezado "GymAccess", periodo, columnas y totales, y que el CSV abre en Excel con el mismo contenido; con un periodo vacío no se descarga ningún archivo y se muestra la leyenda.

### Pruebas de historia de usuario 4

- [X] T033 [P] [US4] Tests de la exportación en `gymaccess/frontend/src/services/exportacion.test.js` (PDF con encabezado "GymAccess", periodo, columnas y totales; CSV con separador `;` y BOM UTF-8 con las mismas columnas; reporte vacío → ningún archivo generado y mensaje "No hay registros para este periodo"; fallo en la generación → error claro sin archivo incompleto)
- [X] T034 [P] [US4] Smoke test de la página de reportes en `gymaccess/frontend/src/pages/ReportesPage.test.jsx` (renderiza las secciones Financiero y Accesos, muestra los botones "Exportar PDF" y "Exportar Excel (CSV)" y la leyenda de periodo vacío)

### Implementación de historia de usuario 4

- [X] T035 [US4] Agregar las dependencias `jspdf` y `jspdf-autotable` en `gymaccess/frontend/package.json` (`npm install jspdf jspdf-autotable`), justificadas en R-42 (Principio III: dependencias nuevas justificadas; única dependencia nueva del sprint)
- [X] T036 [US4] Crear `gymaccess/frontend/src/services/exportacion.js` con `exportarPDF(datos, tipo)` (encabezado "GymAccess", periodo, columnas y totales con `jspdf-autotable`) y `exportarCSV(datos, tipo)` (separador `;` y BOM UTF-8), sin archivo cuando el reporte está vacío y sin dejar temporales en el servidor (FR-010, FR-011, FR-012, FR-013; R-42; Clarifications Q1) (depende de T035)
- [X] T037 [US4] Ampliar `gymaccess/frontend/src/pages/ReportesPage.jsx` con los botones "Exportar PDF" y "Exportar Excel (CSV)" en ambas secciones, el aviso de periodo vacío al exportar y el manejo de error sin archivo incompleto (HU4 esc. 3 y 4) (depende de T036)

**Punto de control**: US4 funcional: exportación en el navegador sin archivos en el servidor

---

## Fase 7: Historia de usuario 5 - Optimización de rendimiento y preparación para despliegue (Prioridad: P3)

**Objetivo**: La validación de acceso y los reportes responden dentro de los tiempos exigidos con los índices del Sprint 4, y la configuración de producción es validada al arrancar con un proceso de compilación documentado y reproducible.

**Prueba independiente**: Medir la validación de acceso (< 200 ms en el 95%) y la generación de reportes (< 5 s para un mes de datos); arrancar con `NODE_ENV=production` y una variable faltante y verificar que el proceso no inicia con un mensaje que nombra solo las variables ausentes.

### Pruebas de historia de usuario 5

- [X] T038 [P] [US5] Tests unit de la validación de entorno en `gymaccess/backend/tests/unit/entorno.test.js` (producción sin `DB_NOMBRE`, `DB_USUARIO`, `DB_CONTRASENA` o `JWT_SECRET` → error que lista los nombres de las variables faltantes sin valores ni credenciales; desarrollo con defaults → no lanza; mensaje sin detalle interno) — R-45, HU5 esc. 5

### Implementación de historia de usuario 5

- [X] T039 [US5] Crear `gymaccess/backend/src/config/entorno.js` con `validarEntorno()`: con `NODE_ENV=production` exige `DB_NOMBRE`, `DB_USUARIO`, `DB_CONTRASENA` y `JWT_SECRET` y termina listando solo los nombres de las variables faltantes; en desarrollo conserva los defaults documentados con aviso en consola (FR-017; R-45; Principio V)
- [X] T040 [US5] Ampliar `gymaccess/backend/src/server.js` para ejecutar `validarEntorno()` antes de servir peticiones y registrar la auditoría `modulo='configuracion'`, `accion='validacion_entorno'`, `usuario_id=null` con el resultado, una vez disponible la conexión a datos (FR-020, SC-008; R-44)
- [X] T041 [P] [US5] Actualizar `gymaccess/.env.example` documentando las variables obligatorias (`DB_NOMBRE`, `DB_USUARIO`, `DB_CONTRASENA`, `JWT_SECRET`) sin valores reales ni secretos (FR-017, Principio V)
- [X] T042 [US5] Ampliar `gymaccess/README.md` con la sección "Compilación y despliegue" (migraciones 001→004, seeds, `npm test`, `npm run build` en el frontend y `npm start` en el backend, reproducible sin pasos manuales no documentados) y con los módulos nuevos de reportes y alertas (FR-018, SC-010; R-45; Principio I)
- [ ] T043 [US5] Medir el rendimiento con datos representativos: validación de acceso < 200 ms en el 95% y reportes < 5 s para un mes, verificando con `EXPLAIN` que las consultas usan los índices de `004_sprint4.sql` (FR-015, FR-016, FR-019; SC-002, SC-006)

**Punto de control**: US5 funcional: tiempos cumplidos y arranque validado en producción

---

## Fase 8: Pulido y aspectos transversales

**Propósito**: Mejoras transversales y validación final

- [ ] T044 [P] Ejecutar los 34 escenarios de `gymaccess/specs/004-reportes-notificaciones-despliegue/quickstart.md` y registrar resultados (cubre SC-001, SC-002, SC-003, SC-005, SC-006, SC-007, SC-008, SC-009 y SC-010)
- [X] T045 [P] Revisión de seguridad en `gymaccess/backend/src/`: permisos en servidor en los 3 endpoints nuevos, sin `DELETE` en la API, sin credenciales ni descriptores faciales en las respuestas de reportes (RN-S4-05) y mensajes sin detalle interno (FR-021; Principios V y VI)
- [ ] T046 [P] Ejecutar las suites completas `cd gymaccess/backend && npm test` y `cd gymaccess/frontend && npm test` y corregir fallos (Principio X)
- [X] T047 Sincronizar la documentación maestra al cierre: `docs/project-context.md`, `docs/reglas.md` y una nota de ratificación en `.specify/memory/constitution.md` (solo si aplica) con el módulo de reportes, las alertas de vencimiento y la preparación para despliegue — sin modificar principios sin aprobación del equipo (supuesto del spec; Principio I y Gobernanza)
- [ ] T048 Revisión final: mensajes en español, ES Modules sin `require`/`module.exports`, consultas parametrizadas, sin archivos de exportación en el repositorio ni en el servidor, y commits Conventional Commits en español

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — **bloquea todas** las historias
- **User Stories (Phase 3–7)**: Todas dependen del Foundational
- **Polish (Phase 8)**: Depende de las historias que se deseen entregar

### Dependencias entre historias de usuario

- **US1 (P1)**: Tras Foundational — sin dependencias de otras historias
- **US2 (P1)**: Tras Foundational — módulo propio (`alerta`), independiente de US1; solo lee `membresias`/`clientes`
- **US3 (P2)**: Necesita US1 (amplía el módulo `reporte`: modelo, servicio, controlador y ruta creados en US1)
- **US4 (P2)**: Necesita US1 (los botones operan sobre el `ReportesPage` de US1; si se exporta también el reporte de accesos, conviene completar US3 antes)
- **US5 (P3)**: Configuración y despliegue independientes; solo la medición de tiempos de reportes (T043) requiere US1 y US3 — puede avanzar en paralelo con US2–US4

### Dentro de cada historia de usuario

- Tests primero (deben fallar antes de la implementación)
- Modelo → servicio → controlador → ruta → servicio del frontend → página/componente
- Historia completa antes de pasar a la siguiente prioridad

### Oportunidades de paralelismo

- Fase Setup: T002 en paralelo (documentación)
- Fase Foundational: T005 y T006 en paralelo
- US1: T007, T008, T009 y T013 en paralelo (tests, modelo y servicio del frontend)
- US2: T016, T017, T018 y T022 en paralelo (tests, modelo y servicio del frontend)
- US3: T026 y T027 en paralelo con T031
- US4: T033 y T034 en paralelo (tras T035 las dependencias instaladas)
- US5: T038 y T041 en paralelo
- Historias sin relación (US2 ↔ US1/US3/US4) pueden avanzar en paralelo con capacidad de equipo

---

## Ejemplo de paralelismo: Historia de usuario 2

```text
Tarea: "Tests contract de las alertas en gymaccess/backend/tests/contract/alertas.test.js"        (T016)
Tarea: "Tests del componente de alertas en gymaccess/frontend/src/components/AlertasVencimiento.test.jsx" (T017)
Tarea: "Crear el modelo gymaccess/backend/src/models/alerta.model.js"                             (T018)
Tarea: "Crear gymaccess/frontend/src/services/alertas.api.js"                                     (T022)
```

---

## Estrategia de implementación

### Primero el MVP (Historia de usuario 1)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todo)
3. Completar Phase 3: US1
4. **PARAR y VALIDAR**: probar el reporte financiero de forma independiente (totales, estados, `403` y auditoría)
5. Demostrar si ya está listo

### Entrega incremental

1. Setup + Foundational → base lista (`pagos.estado`, índices, matriz y validador)
2. US1 + US2 (prioridad P1) → reporte financiero y panel de alertas ✔ demo **(flujo central del sprint)**
3. US3 (P2) → reporte de accesos con horas pico ✔ demo
4. US4 (P2) → exportación PDF/CSV en el navegador ✔ demo
5. US5 (P3) → rendimiento medido y despliegue preparado ✔ demo final

### Estrategia de equipo en paralelo

1. El equipo completa Setup + Foundational
2. Cuando termine el fundamento:
   - Desarrollador A: US1 → US3 → US4 (línea de reportes y exportación)
   - Desarrollador B: US2 → US5 (línea de alertas y despliegue)
3. Las historias se integran y prueban de forma independiente

---

## Notas

- Las tareas `[P]` usan archivos distintos y no dependen de tareas incompletas
- La etiqueta `[Story]` rastrea la tarea hasta su historia en `spec.md`
- Cada historia debe ser comprobable por separado (ver "Independent Test")
- Commits pequeños y en español según Conventional Commits (`feat(reportes): …`, `feat(alertas): …`)
- Ningún endpoint nuevo acepta `DELETE`: el historial de pagos y accesos se conserva íntegro (FR-012, FR-022)
- La exportación no tiene endpoint: los archivos se generan en el navegador (Clarifications Q1, RN-S4-03)
