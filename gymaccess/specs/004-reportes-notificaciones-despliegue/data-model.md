# Phase 1: Data Model — Reportes avanzados, alertas de vencimiento y preparación para despliegue (Sprint 4)

**Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Modelo de datos del Sprint 4 según la constitución (Principio IV). Motor
InnoDB, codificación `utf8mb4`, script versionado en
`gymaccess/database/migrations/004_sprint4.sql` (R-43). Todas las consultas
usan parámetros (R-10 heredada). **Este sprint no crea tablas nuevas**: los
reportes, las alertas y las exportaciones son datos derivados que se calculan
al consultar y no se persisten (spec, "Entidades clave"). **Sin operaciones de
borrado**: pagos, accesos y membresías solo se leen; se conserva íntegro el
historial financiero y de accesos (FR-022, RN-06 y RN-10).

## Cambios en tablas existentes (migración 004)

### `pagos` — columna `estado` (R-39, Clarifications Q5)

```sql
ALTER TABLE pagos
  ADD COLUMN estado ENUM('confirmado','pendiente','anulado') NOT NULL
    DEFAULT 'confirmado';
```

- Las filas existentes reciben el valor por defecto `confirmado`; no se
  requiere backfill y **no se altera la información previa** (FR-019).
- `POST /api/pagos` (módulo heredado) no se modifica: inserta sin la columna
  y hereda `confirmado`.
- El reporte lista todos los pagos del periodo con su estado y suma al total
  recaudado únicamente los `confirmado`; los `pendiente` y `anulado` se
  muestran pero no suman (HU1 esc. 1-2, caso límite de pagos pendientes o
  anulados).
- Este sprint **no expone endpoint para cambiar el estado**: los límites del
  alcance exigen leer los módulos existentes, no modificarlos. Los estados
  distintos de `confirmado` se insertan directamente en los datos de prueba
  para verificar el comportamiento del reporte; el enum ya queda preparado
  para una futura función de anulación (mejora fuera del MVP).

### Índices nuevos (R-43, RN-S4-04, FR-019)

| Tabla | Índice | Columnas | Propósito |
|-------|--------|----------|-----------|
| `pagos` | `idx_pagos_fecha` | `fecha_pago` | rango de fechas del reporte financiero (`fecha_pago` del insumo) |
| `pagos` | `idx_pagos_estado` | `estado` | filtro de pagos confirmados del total recaudado (`estado` del insumo) |
| `membresias` | `idx_membresias_estado` | `estado` | filtro `estado = 'activa'` del panel de alertas |
| `membresias` | `idx_membresias_vencimiento` | `fecha_vencimiento` | rango de vencimientos de 5 días (`fecha_fin` del insumo) |
| `accesos` | `idx_accesos_fecha_hora` | `fecha`, `hora` | rango de fechas y orden/agrupación por hora del reporte de accesos (`fecha_hora` del insumo) |
| `rostros` | `idx_rostros_estado` | `estado` | lista de descriptores `activo` usada por la validación facial (< 200 ms, FR-015) |

- Ya existentes y suficientes (RN-S4-04): `cliente_id` indexado en `clientes`
  (FK), `pagos`, `membresias`, `accesos` y `rostros` (UNIQUE);
  `idx_accesos_fecha` y `idx_accesos_resultado`; los tres índices de
  `auditoria`.
- `idx_accesos_fecha` se conserva: es el prefijo de
  `idx_accesos_fecha_hora` y retirarlo no aporta al alcance.
- El script se aplica una vez sobre la BD existente (convención de
  `database/README.md`) y la fila de la migración 004 se agrega allí
  (Principio IV).

## Correspondencia de nombres del insumo con el esquema real

| Nombre en `docs/sprints/sprint-4.md` | Columna real | Nota |
|---|---|---|
| `fecha_fin` (RN-S4-02) | `membresias.fecha_vencimiento` | columna existente desde el Sprint 1 |
| `fecha_hora` (RN-S4-04) | `accesos.fecha` + `accesos.hora` | sin columna `fecha_hora`; el índice compuesto equivale al índice pedido |
| `metodo_pago` | `pagos.metodo` | nombre en singular desde el Sprint 1 |
| `DATEDIFF(fecha_fin, CURDATE()) <= 5` | `fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)` | misma semántica (incluye el día de hoy) y además sargable, para que use `idx_membresias_vencimiento` |

## Entidades derivadas (no persisten)

- **Reporte de ingresos**: `periodo {desde, hasta}`, `pagos[]` (id, cliente,
  membresía, tipo de membresía, fecha, monto, método, estado),
  `total_recaudado` (solo confirmados), `por_tipo_membresia[]`,
  `por_metodo[]` (solo confirmados) y `conteo {total, confirmados,
  no_confirmados}`. Se calcula por petición; no guarda copias (FR-022).
- **Reporte de accesos**: `periodo {desde, hasta, cliente_id}`, `accesos[]`
  (fecha, hora, cliente, resultado, motivo_rechazo), `totales {total,
  autorizados, rechazados}` y `por_hora[]` (`hora` numérica, etiqueta
  "08:00–09:00", totales) ordenado de mayor a menor afluencia.
- **Alerta de vencimiento**: por cliente con membresía activa por vencer:
  `cliente_id`, `cliente`, `tipo_membresia`, `fecha_vencimiento`,
  `dias_restantes` (0 a 5), tomando el vencimiento más próximo cuando hay
  varias activas; se calcula al consultar y no se crea tabla de alertas.
- **Exportación**: archivo PDF o CSV armado en el navegador a partir del
  reporte visible (R-42); no es un dato del sistema y no se escribe en
  servidor alguno (FR-012).

## Reglas de estado y relaciones

- `pagos.estado`: `confirmado` (por defecto, suma al total) · `pendiente` ·
  `anulado` (se listan, no suman). Sin transiciones expuestas en este sprint
  (R-39). FKs `cliente_id` y `membresia_id` se conservan sin cambios.
- `membresias.estado` (heredado): solo `activa` genera alerta por vencer;
  `vencida`, `suspendida` y `cancelada` quedan fuera (FR-007).
- `accesos` (heredado): se leen tal cual, con `resultado` y
  `motivo_rechazo`; los registros de acceso no se modifican ni se borran.
- `auditoria` (heredado): solo inserciones — `modulo = 'reportes'` en cada
  generación de reporte y `modulo = 'configuracion'` en la validación de
  entorno del arranque (R-44), con `usuario_id` nullable para el caso
  sistema.

## Semillas

- **Sin seeds nuevos**: la migración 004 no necesita datos iniciales.
- Los datos de prueba del quickstart (pagos `pendiente`/`anulado`,
  membresías por vencer a 0, 3 y 5 días, accesos rechazados con motivo) se
  insertan en el propio guion de validación o en las pruebas, sin agregar
  scripts de semilla al repositorio.
