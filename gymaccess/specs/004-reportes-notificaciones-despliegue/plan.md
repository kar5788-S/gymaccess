# Implementation Plan: Reportes avanzados, alertas de vencimiento y preparación para despliegue (Sprint 4)

**Branch**: `004-reportes-notificaciones-despliegue` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-reportes-notificaciones-despliegue/spec.md`

## Summary

Completar sobre la base de los Sprints 1 a 3 la capa de reportes y la
preparación para despliegue: reporte financiero de ingresos exclusivo del
administrador (listado de los pagos del periodo con su estado, total
recaudado que suma únicamente los pagos confirmados y desglose por tipo de
membresía y método de pago), reporte consolidado de accesos con filtros por
cliente y fecha con ranking de horas pico por hora exacta del día, panel de
alertas de membresías que vencen en 5 días o menos para recepcionista y
administrador con destacado amarillo en el dashboard y en el módulo de
membresías, exportación de los reportes a PDF y CSV generada en el navegador,
índices de optimización sobre las consultas frecuentes y validación de la
configuración de producción con proceso de compilación documentado.

Enfoque técnico (según [research.md](research.md)): se conserva la
arquitectura heredada (React + Express con ES Modules, API REST, JWT, MySQL
local versionado); los reportes y las alertas son consultas agregadas
parametrizadas en dos módulos backend nuevos (`reporte` y `alerta`) sin tablas
nuevas ni copias históricas; la migración `004_sprint4.sql` agrega la columna
`pagos.estado` y 6 índices (R-39, R-43); la exportación se construye en el
frontend con `jspdf` + `jspdf-autotable` y CSV manual, sin crear archivos en
el servidor (R-42); el arranque valida las variables de entorno obligatorias
en producción y deja un proceso de compilación reproducible documentado
(R-45).

## Technical Context

**Language/Version**: JavaScript (ES Modules) — Node.js 20+ con Express 4;
React 18 con Vite 6.

**Primary Dependencies**: backend heredado: `express`, `mysql2`,
`jsonwebtoken`, `bcrypt`, `express-validator`, `cors`, `dotenv`; frontend
heredado: `react`, `react-router-dom`. Dependencias nuevas justificadas en
R-42: `jspdf` y `jspdf-autotable` (exportación PDF en el navegador). Pruebas
heredadas: `vitest`, `supertest`, `@testing-library/react`.

**Storage**: MySQL 8 local sin ORM (mysql2 con consultas parametrizadas);
migración `gymaccess/database/migrations/004_sprint4.sql` (1 columna nueva y
6 índices); sin seeds nuevos; sin operaciones de borrado.

**Testing**: Vitest en backend (unit, contract con Supertest e integration) y
en frontend (React Testing Library); [quickstart.md](quickstart.md) con más
de 30 escenarios manuales de validación.

**Target Platform**: aplicación web local (navegador moderno + servidor Node y
MySQL en la misma máquina); preparada para despliegue mediante el proceso
documentado de FR-018.

**Project Type**: Web application (`frontend/` + `backend/` + `database/`).

**Performance Goals**: validación de acceso por rostro en menos de 200 ms en
el 95% de los intentos (SC-006); reportes en menos de 5 segundos para
periodos de hasta un mes (SC-002, FR-016); panel de alertas en menos de 2
segundos; exportación sin pasos visibles de espera superiores a 5 segundos.

**Constraints**: RN-S4-01…RN-S4-05 (información financiera solo para
administrador; alertas solo de membresías activas con 5 días o menos;
exportación sin archivos permanentes en el servidor; índice explícito para
cada columna de filtrado frecuente; sin credenciales ni descriptores faciales
en las respuestas); decisiones del `/speckit.clarify` 2026-11-04 (Q1
exportación en el navegador, Q2 agrupación por hora exacta sin turnos, Q3
alertas solo para recepcionista y administrador, Q4 reportes consolidados
exclusivos del administrador, Q5 total recaudado solo de pagos confirmados);
sin `DELETE` en la API; permisos y validación de entradas en el servidor;
producción sin valores por defecto para secretos (Principio V).

**Scale/Scope**: 1 sede; ~20 usuarios y ~500 clientes heredados; 0 tablas
nuevas, 1 columna y 6 índices; 3 endpoints nuevos; 2 módulos backend nuevos;
1 página, 1 componente y 3 módulos de servicio frontend; 5 historias de
usuario, 22 FR, 10 criterios de éxito y 12 casos límite.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución: `.specify/memory/constitution.md` v1.1.0.

| Principio | Requisito clave | Evidencia en el plan | Estado |
|-----------|-----------------|----------------------|--------|
| I. Alcance y MVP (NC) | Solo alcance del sprint, relación requisito→implementación | Los límites del spec (sin correos/SMS, sin pasarelas, sin app móvil, sin gráficas avanzadas, sin historial de reportes ni roles nuevos) gobiernan el diseño; el supuesto de sincronización documental al cierre del sprint queda registrado en el spec | PASS |
| II. Arquitectura separada (NC) | Frontend/Backend/BD separados; backend modular | Módulos `reporte` y `alerta` con patrón ruta→controlador→servicio→modelo→validador; el frontend solo consume la API y genera los archivos en el navegador sobre datos ya servidos (R-42); la BD solo se toca desde el backend | PASS |
| III. Stack tecnológico | React/JS, Node+Express/JS, MySQL, REST, JWT; dependencias justificadas | Technical Context: 2 dependencias nuevas (`jspdf`, `jspdf-autotable`) justificadas en R-42; CSV sin dependencia; agregados en SQL puro | PASS |
| IV. Base de datos (NC) | Cambos de estructura documentados; frontend nunca toca MySQL | [data-model.md](data-model.md); `004_sprint4.sql` sin tablas nuevas (1 columna + 6 índices) y documentado en `database/README.md`; RN-S4-04 exige los índices; cambio estructural justificado en Complexity Tracking | PASS (justificado) |
| V. Seguridad (NC) | Permisos en servidor, entradas validadas, sin secretos ni errores internos | FR-002/FR-009/FR-017/FR-021; matriz ampliada con `403` (R-41); `RANGO_FECHAS_INVALIDO` sin detalle interno (contracts/api.md); validación de entorno en producción (R-45); respuestas de reportes sin credenciales ni descriptores (RN-S4-05) | PASS |
| VI. Roles y permisos | 4 roles con alcances definidos; sin ampliación de permisos | Matriz ampliada en `contracts/api.md`: reportes solo `administrador` (clarify Q4), alertas `administrador` + `recepcionista` (clarify Q3), entrenador y cliente denegados; sin roles nuevos | PASS |
| VII. Integridad de reglas (NC) | Historial conservado; sin borrado ordinario | [data-model.md](data-model.md): `pagos.estado` con valor por defecto sin alterar filas existentes; alertas derivadas sin persistir; reportes bajo demanda sin copias; sin `DELETE` en endpoints (clarify Q5) | PASS |
| VIII. Facial y acceso | Solo identificar/validar acceso; sin vigilancia indebida | No se modifica el módulo facial; solo se añade `idx_rostros_estado` para que la validación cumpla < 200 ms (FR-015, R-43) | PASS |
| IX. API y errores | JSON, códigos HTTP, middleware auth/authz, errores centralizados | contracts/api.md: envolvente y validadores heredados, 1 código nuevo (`RANGO_FECHAS_INVALIDO`), auditoría de generación de reportes y de validación de entorno (R-44) | PASS |
| X. Pruebas | Funciones principales probadas antes de terminar | El Principio X lista explícitamente "Generación de reportes"; suites contract/integration para `reporte` y `alerta` + quickstart con más de 30 escenarios | PASS |
| XI. UX/UI | Estados claros, mensajes de éxito/error, destacados útiles | Leyenda "No hay registros para este periodo", mensaje "Sin alertas de vencimiento próximo", destacado amarillo de vencimientos, mensajes de error de exportación sin detalle técnico (spec HU1–HU4) | PASS |

**Re-check post-Phase 1 (diseño)**: PASS. [data-model.md](data-model.md),
[contracts/api.md](contracts/api.md) y [quickstart.md](quickstart.md) no
introducen violaciones: los índices y la columna nuevos son cambios
documentados exigidos por RN-S4-04 y por la aclaración Q5, la matriz de
permisos mantiene toda la autorización en el servidor, no hay borrados ni
persistencia de alertas o reportes, y los escenarios del quickstart cubren la
lista mínima del Principio X (registro de pagos heredado, validación de
roles, autorización y rechazo de accesos, registro de accesos y generación de
reportes). Revisión específica de las 5 aclaraciones del 2026-11-04: la
exportación en el navegador no crea archivos en el servidor (Q1, Principios
III y V); la agrupación por hora exacta se resuelve con `HOUR(hora)` sin
modelar turnos (Q2, Principio I); el panel y el destacado se ocultan a
entrenador y cliente con `403` en el servidor (Q3, Principio V); los reportes
financieros y el consolidado quedan solo para administrador con `403` (Q4,
Principio VI); el total recaudado suma solo pagos confirmados sin eliminar
registros (Q5, Principio VII). Única justificación registrada: el cambio
estructural sobre `pagos` y los índices (ver Complexity Tracking). Sin otras
violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/004-reportes-notificaciones-despliegue/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── api.md           # Contrato REST: endpoints, permisos, códigos, exportación
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/src/
├── pages/
│   ├── ReportesPage.jsx        # reportes financiero y de accesos + botones de exportación (HU1, HU3, HU4)
│   ├── ReportesPage.test.jsx   # pruebas de la página de reportes
│   ├── DashboardPage.jsx       # + panel de alertas para administrador (HU2, FR-006/FR-008)
│   └── MembresiasPage.jsx      # + destacado amarillo de vencimientos (HU2, FR-008)
├── components/
│   └── AlertasVencimiento.jsx  # panel de alertas reutilizable (HU2)
├── services/
│   ├── reportes.api.js         # GET /api/reports/financial | /api/reports/accesses
│   ├── alertas.api.js          # GET /api/alerts/expirations
│   ├── exportacion.js          # PDF (jspdf + autotable) y CSV en el navegador (HU4)
│   └── exportacion.test.js     # pruebas de la generación de archivos
└── navigation/rutas.js         # + módulo "Reportes" (solo administrador) y su ruta /reports

backend/src/
├── config/
│   └── entorno.js              # validación de variables de entorno al arranque (FR-017, HU5)
├── routes/
│   ├── reportes.routes.js      # GET /api/reports/financial, /api/reports/accesses (mount en app.js)
│   └── alertas.routes.js       # GET /api/alerts/expirations
├── controllers/ + services/ + models/ + validators/
│   └── reporte.* / alerta.*    # patrón heredado; agregados SQL parametrizados (R-38…R-41)
├── middlewares/authorization.js# MATRIZ_PERMISOS ampliada con los 3 endpoints (R-41)
├── services/auditoria.service.js # reutilizado: generación de reportes y validación de entorno (R-44)
└── server.js / app.js          # validación de entorno antes de servir y registro de auditoría (FR-020)

backend/tests/
├── contract/reportes.test.js   # permisos, parámetros y forma de los reportes
├── contract/alertas.test.js    # permisos y contenido del panel de alertas
└── integration/reportes.test.js# generación con datos reales, estados de pago y horas pico

gymaccess/
├── database/
│   ├── migrations/004_sprint4.sql  # ALTER pagos ADD estado + 6 índices (R-39, R-43)
│   └── README.md                   # + fila de la migración 004 y justificación de índices
├── .env.example                    # + variables obligatorias documentadas (R-45)
└── README.md                       # + sección "Compilación y despliegue" (FR-018, R-45)

docs/                               # al cierre del sprint: project-context.md, reglas.md, constitución (Supuestos)
```

**Structure Decision**: se conserva la estructura de tres piezas y el backend
modular de los sprints anteriores; cada módulo nuevo replica el patrón
ruta→controlador→servicio→modelo→validador. Los reportes se separan en dos
módulos de lectura (`reporte` para los dos reportes del administrador y
`alerta` para las membresías por vencer) para que la matriz de permisos y la
auditoría distingan cifras financieras de avisos operativos, y para no tocar
los módulos de `pago` y `membresia` que el límite de alcance protege. La
exportación es un módulo de servicio del frontend que trabaja sobre los datos
ya autorizados que devolvió el backend (R-42), y la validación de entorno es
un módulo de configuración que se ejecuta antes de servir peticiones (R-45).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principio IV enumera las tablas de los sprints 1 y 2; el Sprint 4 altera `pagos` (columna `estado`) y añade índices sobre tablas existentes | RN-S4-04 exige índices explícitos sobre `cliente_id`, `fecha_pago`, `fecha_hora` y `estado`, y la aclaración Q5 exige distinguir el estado de cada pago para calcular el total recaudado; el Sprint 2 ya aplicó `ALTER TABLE` sobre estas mismas tablas (precedente en `002_sprint2.sql`) y el principio IV obliga a documentar el cambio, no a prohibirlo | Derivar el estado del pago no es posible (el adeudo se calcula como precio menos pagado y no expresa estado), y una tabla aparte de anulaciones añadiría joins, riesgo de pérdida de historial y una operación de escritura fuera del alcance; la columna con valor por defecto `confirmado` conserva intactas las filas existentes y cumple la aclaración Q5 |
