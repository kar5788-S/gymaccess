# Quickstart — Validación del Sprint 4

**Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/api.md](contracts/api.md) | **Data model**: [data-model.md](data-model.md)

Guía de ejecución y validación de extremo a extremo. No incluye código de
implementación ni migraciones completas; los escenarios referencian el
contrato y el modelo de datos.

## Previos requisitos

- Node.js 20 o superior (backend con ES Modules, `type: module`).
- MySQL 8 local, con acceso de administrador para crear la base de datos.
- Un navegador moderno (Chrome, Edge o Firefox actualizados).
- **Este sprint no requiere cámara** en la mayoría de escenarios; solo el
  escenario de rendimiento de validación facial (28) usa el módulo del
  Sprint 2 con datos ya registrados.

## Puesta en marcha

1. Copiar `.env.example` a `.env` en la raíz y en `backend/`, y completar:
   credenciales de MySQL, `JWT_SECRET` y credenciales del administrador del
   seed (heredado de los sprints anteriores).
2. Ejecutar en orden los scripts de `gymaccess/database/migrations/`:
   `001_initial.sql`, `002_sprint2.sql`, `003_sprint3.sql` y el nuevo
   **`004_sprint4.sql`**, más los seeds `001_admin_inicial.sql` y
   `002_tipos_membresia.sql`.
3. Levantar el backend: `cd gymaccess/backend && npm install && npm run dev`
   (o `npm start`).
4. Levantar el frontend: `cd gymaccess/frontend && npm install && npm run dev`
   → <http://localhost:5173>.
5. Cargar datos de prueba del sprint (SQL de apoyo, sin semillas en el
   repositorio): pagos del periodo con `estado` `confirmado`, `pendiente` y
   `anulado`; membresías activas que vencen en 0, 3 y 5 días; una vencida,
   una suspendida y una cancelada; accesos autorizados y rechazados con
   motivo en varias horas del día.

## Comandos de prueba

```bash
cd gymaccess/backend && npm test     # Vitest: unit, contract (Supertest) e integration
cd gymaccess/frontend && npm test    # Vitest + React Testing Library
cd gymaccess/frontend && npm run build   # proceso de compilación (FR-018)
```

Verificación de índices en MySQL (R-43):

```sql
SHOW INDEX FROM pagos;        -- idx_pagos_fecha, idx_pagos_estado
SHOW INDEX FROM membresias;   -- idx_membresias_estado, idx_membresias_vencimiento
SHOW INDEX FROM accesos;      -- idx_accesos_fecha_hora
SHOW INDEX FROM rostros;      -- idx_rostros_estado
```

## Escenarios de validación

| # | Escenario | Acción | Resultado esperado | Referencia |
|---|-----------|--------|--------------------|------------|
| 1 | **Reporte financiero completo** | Admin: abrir `/reports` (periodo por defecto: mes en curso), generar el reporte de ingresos | Lista de pagos del periodo con su estado, `total_recaudado`, desglose por tipo de membresía y por método de pago | HU1 esc.1, FR-001 |
| 2 | **Pagos no confirmados** | Con los datos de prueba, revisar un pago `anulado` y uno `pendiente` en el reporte | Aparecen con su estado, no suman al total y el conteo los separa | Clarifications Q5, HU1 esc.1 |
| 3 | Suma de subtotales | Sumar `por_metodo` y `por_tipo_membresia` del reporte | Ambas sumas coinciden exactamente con `total_recaudado` | HU1 esc.2 |
| 4 | Rango invertido | Solicitar el reporte con `desde` posterior a `hasta` | `400 RANGO_FECHAS_INVALIDO` con mensaje claro; sin reporte generado | HU1 esc.6, FR-014 |
| 5 | Periodo sin registros | Generar el reporte en un rango sin pagos | Tabla vacía con la leyenda "No hay registros para este periodo", sin errores | HU1 esc.4, FR-013, SC-007 |
| 6 | **Denegación financiera** | Recepcionista, entrenador y cliente llaman a `GET /api/reports/financial` con su token; además revisar la interfaz | `403 SIN_PERMISO` en los tres; la interfaz no ofrece el módulo Reportes a esos roles | HU1 esc.3, FR-002, SC-003 |
| 7 | Auditoría de reportes | Admin: `GET /api/auditoria?modulo=reportes` | Registro `generacion_reporte` con usuario, periodo, fecha y resultado | HU1 esc.5, FR-003, SC-008 |
| 8 | **Membresía por vencer** | Recepcionista: abrir el módulo de membresías con una membresía activa que vence en 3 días | El cliente aparece con nombre, tipo de membresía y días restantes | HU2 esc.1, FR-006 |
| 9 | Vence hoy mismo | Consultar el panel con una membresía activa cuyo vencimiento es hoy | Aparece con `dias_restantes: 0` (criterio incluido) | Caso límite, RN-S4-02 |
| 10 | Estados que no alertan | Consultar el panel con membresías vencida, suspendida y cancelada | Ninguna se lista como alerta por vencer | HU2 esc.2, FR-007 |
| 11 | Varias membresías activas | Registrar dos membresías activas para el mismo cliente con vencimientos distintos | Una sola alerta con la fecha más próxima | HU2 esc.6 |
| 12 | Panel sin alertas | Abrir el panel en una instalación sin membresías por vencer | Mensaje "Sin alertas de vencimiento próximo", sin error | HU2 esc.5 |
| 13 | **Destacado amarillo** | Admin: abrir el dashboard; admin y recepcionista: abrir membresías | Los clientes por vencer en 5 días o menos se resaltan en amarillo junto a su información | HU2 esc.3, FR-008 |
| 14 | **Roles denegados en alertas** | Entrenador: abrir su dashboard y llamar a `GET /api/alerts/expirations`; cliente: llamar al mismo endpoint | Dashboard del entrenador sin panel de alertas; `403` en ambos | HU2 esc.4, clarify Q3, FR-009 |
| 15 | **Reporte de accesos** | Admin: generar el reporte de accesos sobre un periodo con intentos autorizados y rechazados | Detalle con fecha, hora, cliente, resultado y motivo de rechazo cuando corresponde | HU3 esc.1 y 4, FR-004 |
| 16 | Horas pico | Revisar el resumen por hora del reporte | Agrupación por hora exacta con etiqueta "08:00–09:00", ordenada de mayor a menor afluencia; sin turnos | HU3 esc.2, FR-005, clarify Q2 |
| 17 | Filtro por cliente | Aplicar `cliente_id` al reporte | Solo los accesos de ese cliente y totales recalculados | HU3 esc.3 |
| 18 | Intento no identificado | Revisar un acceso con `cliente_id` nulo | Se muestra como "No identificado" con su motivo de rechazo | FR-004 |
| 19 | Accesos sin datos | Generar el reporte en un rango vacío | Leyenda "No hay registros para este periodo" | HU3 esc.5, SC-007 |
| 20 | **Recepcionista sin reporte** | Recepcionista: llamar a `GET /api/reports/accesses` y luego usar su consulta operativa `GET /api/accesos` | `403` en el reporte consolidado; su consulta operativa sigue funcionando | HU3 esc.6, clarify Q4 |
| 21 | Entrenador y cliente sin reporte | Ambos roles llaman a `GET /api/reports/accesses` | `403 SIN_PERMISO` | HU3 esc.6, FR-009 |
| 22 | **Exportar PDF** | Admin: generar un reporte con datos y pulsar "Exportar PDF" | Archivo con encabezado "GymAccess", periodo, columnas y totales idénticos a la pantalla | HU4 esc.1 y 6, FR-011, SC-005 |
| 23 | **Exportar CSV (Excel)** | Pulsar "Exportar Excel (CSV)" | Archivo con las mismas columnas y cifras; abre en Excel sin configuración | HU4 esc.2, SC-005 |
| 24 | Exportar sin registros | Intentar exportar un reporte vacío | Mensaje "No hay registros para este periodo" y **ningún** archivo descargado | HU4 esc.3, FR-013 |
| 25 | Sin archivos en el servidor | Revisar que la exportación no deja archivos nuevos en el proyecto y que no existe endpoint de exportación | Cero archivos temporales permanentes; el backend solo entrega JSON | HU4 esc.4, FR-012, RN-S4-03, Clarifications Q1 |
| 26 | Roles sin exportación | Recepcionista, entrenador y cliente intentan acceder a la exportación | Sin datos que exportar (`403` en los reportes) y sin ruta `/reports` en la interfaz | HU4 esc.5, FR-002 |
| 27 | **Rendimiento de reportes** | Cronometrar la generación del reporte financiero de un mes con datos representativos | Visible en pantalla en menos de 5 segundos, sin degradación en usos consecutivos | SC-002, FR-016 |
| 28 | Validación facial | Cronometrar accesos por rostro con datos representativos (datos de prueba volumétricos) | 95% de las validaciones en menos de 200 ms | SC-006, FR-015 |
| 29 | **Producción incompleta** | Ejecutar el backend con `NODE_ENV=production` y sin `DB_NOMBRE` (o `JWT_SECRET`) | El proceso no arranca: mensaje claro que nombra la variable faltante, sin valores ni credenciales | HU5 esc.5, FR-017 |
| 30 | Sin secretos en el repositorio | Revisar `.env` ignorado por Git y `.env.example` sin valores reales | 0 secretos en el repositorio; el ejemplo documenta las variables obligatorias | HU5 esc.3, SC-010 |
| 31 | **Proceso de compilación** | Seguir la sección "Compilación y despliegue" de `gymaccess/README.md` de principio a fin | Migraciones 001→004, pruebas, `npm run build` y arranque sin pasos manuales no documentados | FR-018, SC-010 |
| 32 | Índices creados | Ejecutar los `SHOW INDEX` anteriores | Presentes los 6 índices nuevos y las FK consultadas sin rastreo completo | FR-019, RN-S4-04 |
| 33 | Pruebas automatizadas | Ejecutar `npm test` en backend y frontend | Suites verdes, incluidas las de reportes y alertas | Principio X |
| 34 | **Demostración completa** | Recorrer el flujo: generar reporte financiero → exportar PDF y CSV → revisar alertas → consultar reporte de accesos | Todo funciona sin errores; el 90% del personal lo completa sin ayuda | SC-001, SC-009 |

## Verificación de constitución (resumen)

| Principio | Evidencia en este guion |
|-----------|-------------------------|
| I. Alcance y MVP | Escenarios 1-26 cubren solo las 5 HU del sprint; sin correos, pasarelas ni gráficas |
| II. Arquitectura separada | Todo pasa por la API (escenarios 6, 14, 20, 21) y la exportación es del cliente (25) |
| III. Stack y dependencias | Sin tecnología nueva más allá de `jspdf`/`jspdf-autotable` justificados (22-23) |
| IV. Base de datos | Migración 004 documentada; sin borrados; índices verificados (32) |
| V. Seguridad | Permisos y parámetros validados en el servidor (4, 6, 14, 20, 21, 26); producción sin defaults (29, 30) |
| VI. Roles y permisos | Matriz ampliada sin roles nuevos (6, 14, 20, 21, 26) |
| VII. Integridad de reglas | Pagos no confirmados listados sin eliminarse (2); alertas derivadas sin persistir (8-12) |
| VIII. Facial y acceso | Sin cambios funcionales en el módulo; solo medición de rendimiento (28) |
| IX. API y errores | Envolvente y códigos heredados + `RANGO_FECHAS_INVALIDO` (4) |
| X. Pruebas | Generación de reportes probada de extremo a extremo (1-7, 15-18, 33) |
| XI. UX/UI | Estados vacíos, mensajes claros y destacado visual (5, 12, 13, 24) |
