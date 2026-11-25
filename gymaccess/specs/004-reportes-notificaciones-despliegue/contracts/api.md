# Contracts — API REST (Sprint 4)

**Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Contrato de interfaces expuestas por el sistema en el Sprint 4. Hereda las
convenciones, los códigos de error y la matriz de permisos de los sprints
anteriores (`specs/001-sprint1-auth-clientes/contracts/api.md`,
`specs/002-sprint2-membresias-pagos-acceso-facial/contracts/api.md` y
`specs/003-entrenadores-rutinas-dashboard/contracts/api.md`) y las amplía con
los reportes y el panel de alertas. La exportación no expone endpoints: es un
comportamiento del cliente (R-42).

## Convenciones

- Base: `/api`; recursos en plural (`/api/reports`, `/api/alerts`).
- Autenticación: encabezado `Authorization: Bearer <token>` (JWT de 8 h). El
  token se obtiene en `POST /api/auth/login`.
- Envolvente de respuesta (JSON) heredada del Sprint 1:

```json
{ "exito": true, "datos": {}, "mensaje": "" }
{ "exito": false, "error": { "codigo": "CODIGO", "mensaje": "Mensaje claro sin detalle interno" } }
```

- Códigos HTTP: `200` ok · `400` validación · `401` sin autenticación ·
  `403` sin permiso para el rol · `404` no encontrado · `500` error interno.
- Todas las consultas usan parámetros; ninguna respuesta incluye
  credenciales, secretos ni descriptores faciales (RN-S4-05): los reportes
  solo exponen los campos enumerados en este contrato.

## Códigos de error nuevos del Sprint 4

| Código | HTTP | Cuándo | Mensaje para el usuario |
|--------|------|--------|-------------------------|
| `RANGO_FECHAS_INVALIDO` | `400` | faltan `desde`/`hasta`, no son fechas `YYYY-MM-DD` o `desde` es posterior a `hasta` | "El rango de fechas es inválido: revisa las fechas de inicio y fin" |

Se reutilizan `VALIDACION` (por ejemplo `cliente_id` no numérico),
`SIN_PERMISO`, `NO_AUTENTICADO` y `ERROR_INTERNO`.

## Matriz de permisos por rol (ampliación del Sprint 4)

| Método y ruta | administrador | recepcionista | entrenador | cliente |
|---|---|---|---|---|
| `GET /api/reports/financial` | ✅ | ❌ `403` | ❌ `403` | ❌ `403` |
| `GET /api/reports/accesses` | ✅ | ❌ `403` | ❌ `403` | ❌ `403` |
| `GET /api/alerts/expirations` | ✅ | ✅ | ❌ `403` | ❌ `403` |

- El recepcionista **no** accede a ningún reporte (clarify Q4) y conserva su
  consulta operativa existente `GET /api/accesos` sin cambios (HU3 esc. 6).
- El entrenador y el cliente no acceden a reportes ni al panel de alertas
  (clarify Q3, FR-009); ocultar los controles en la interfaz es solo
  complemento, la autoridad es el servidor (Principio V).
- La exportación se niega en el servidor de forma indirecta: sin el `200` de
  `/api/reports/*` no existen datos que exportar y la ruta `/reports` solo
  está permitida para `administrador` (HU4 esc. 5).

## Reportes

### `GET /api/reports/financial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`

Genera el reporte financiero de ingresos para el rango indicado. Auditoría:
registra `modulo='reportes'`, `accion='generacion_reporte'` con el periodo y
el resultado (FR-003, HU1 esc. 5).

**200 OK** (HU1 esc. 1-2, Clarifications Q5):

```json
{
  "exito": true,
  "datos": {
    "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31" },
    "pagos": [
      { "id": 12, "cliente_id": 3, "cliente": "Ana López", "membresia_id": 5,
        "tipo_membresia": "Mensual", "fecha_pago": "2026-10-05T10:24:00",
        "monto": 850.00, "metodo": "efectivo", "estado": "confirmado" },
      { "id": 13, "cliente_id": 4, "cliente": "Luis Ruiz", "membresia_id": 6,
        "tipo_membresia": "Trimestral", "fecha_pago": "2026-10-06T12:00:00",
        "monto": 2300.00, "metodo": "efectivo", "estado": "anulado" }
    ],
    "total_recaudado": 850.00,
    "por_tipo_membresia": [ { "tipo_membresia": "Mensual", "total": 850.00 } ],
    "por_metodo": [ { "metodo": "efectivo", "total": 850.00 } ],
    "conteo": { "total_pagos": 2, "confirmados": 1, "no_confirmados": 1 }
  },
  "mensaje": ""
}
```

- `total_recaudado` = suma de `pagos` con `estado = 'confirmado'`; los pagos
  no confirmados aparecen en `pagos[]` con su estado pero no suman.
- La suma de `por_metodo[].total` y de `por_tipo_membresia[].total` coincide
  con `total_recaudado` (HU1 esc. 2).
- Un periodo sin pagos responde `200` con `pagos: []` y `total_recaudado: 0`;
  la leyenda de pantalla es responsabilidad del cliente (FR-013).

**400 `RANGO_FECHAS_INVALIDO`** — rango ausente, mal formado o invertido
(HU1 esc. 6, caso límite). **403 `SIN_PERMISO`** — recepcionista, entrenador
o cliente (HU1 esc. 3, FR-002). **401 `NO_AUTENTICADO`** sin token.

### `GET /api/reports/accesses?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cliente_id=N`

Reporte consolidado de accesos del rango; `cliente_id` es opcional. Auditoría:
igual que el reporte financiero con `tipo = 'accesos'`.

**200 OK** (HU3 esc. 1-4):

```json
{
  "exito": true,
  "datos": {
    "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31", "cliente_id": null },
    "accesos": [
      { "id": 88, "fecha": "2026-10-05", "hora": "08:12:33", "cliente_id": 3,
        "cliente": "Ana López", "resultado": "autorizado", "motivo_rechazo": null },
      { "id": 89, "fecha": "2026-10-05", "hora": "19:40:02", "cliente_id": null,
        "cliente": null, "resultado": "rechazado", "motivo_rechazo": "Rostro no identificado" }
    ],
    "totales": { "total": 40, "autorizados": 35, "rechazados": 5 },
    "por_hora": [
      { "hora": 8, "etiqueta": "08:00–09:00", "total": 12, "autorizados": 10, "rechazados": 2 }
    ]
  },
  "mensaje": ""
}
```

- `por_hora` agrupa por hora exacta del día (`HOUR(hora)`), con etiqueta
  "08:00–09:00", y viene ordenado de mayor a menor `total` (horas pico,
  Clarifications Q2). No existe agrupación por turnos.
- `cliente: null` indica un intento no identificado; la interfaz lo muestra
  como "No identificado".
- Con `cliente_id`, `accesos[]` y `totales[]` se recalculan solo para ese
  cliente (HU3 esc. 3).
- Periodo vacío: `200` con `accesos: []`, `totales` en cero y `por_hora: []`.

**400 `RANGO_FECHAS_INVALIDO`** o `VALIDACION` (`cliente_id` inválido) ·
**403 `SIN_PERMISO`** para recepcionista, entrenador y cliente (HU3 esc. 6,
clarify Q4) · **401** sin token.

## Alertas

### `GET /api/alerts/expirations`

Panel de membresías activas que vencen en 5 días o menos (inclusive hoy).
No requiere parámetros; usa la fecha del servidor. No registra auditoría por
consulta (no es una acción sensible) y no persiste resultados.

**200 OK** (HU2 esc. 1, 6):

```json
{
  "exito": true,
  "datos": {
    "alertas": [
      { "cliente_id": 3, "cliente": "Ana López", "tipo_membresia": "Mensual",
        "fecha_vencimiento": "2026-11-07", "dias_restantes": 3 }
    ]
  },
  "mensaje": ""
}
```

- Solo membresías con `estado = 'activa'`; `vencida`, `suspendida` y
  `cancelada` no aparecen (HU2 esc. 2, FR-007).
- `dias_restantes` entre 0 y 5; con varias membresías activas se muestra la
  fecha más próxima (HU2 esc. 6).
- Sin alertas: `200` con `alertas: []` y la interfaz muestra "Sin alertas de
  vencimiento próximo" (HU2 esc. 5), sin error.
- Orden: `dias_restantes` ascendente.

**403 `SIN_PERMISO`** para entrenador y cliente (HU2 esc. 4, clarify Q3) ·
**401** sin token.

## Auditoría visible

Los eventos nuevos se consultan con el endpoint heredado
`GET /api/auditoria?fecha=&modulo=` (solo administrador):

| `modulo` | `accion` | `usuario_id` | `descripcion` |
|---|---|---|---|
| `reportes` | `generacion_reporte` | usuario de la sesión | tipo de reporte y periodo consultado |
| `configuracion` | `validacion_entorno` | `null` (sistema) | variables validadas al arranque y resultado (R-44) |

## Contrato de exportación (cliente, sin endpoint)

- Los botones "Exportar PDF" y "Exportar Excel (CSV)" solo existen en
  `/reports` (rol administrador) y operan sobre el reporte ya cargado.
- **PDF**: encabezado "GymAccess", tipo de reporte, periodo, las mismas
  columnas y el mismo `total_recaudado`/`totales` que la pantalla (FR-011,
  HU4 esc. 1 y 6). Generado con `jspdf` + `jspdf-autotable` (R-42).
- **CSV**: separador `;` y BOM UTF-8 (abre en Excel sin configuración),
  mismas columnas y cifras que la pantalla (HU4 esc. 2).
- Reporte vacío: no se descarga ningún archivo y se informa "No hay registros
  para este periodo" (FR-013, HU4 esc. 3).
- Fallo durante la generación: mensaje claro y sin archivo incompleto
  (HU4 esc. 4). El servidor no recibe, almacena ni entrega archivos de
  exportación (FR-012, RN-S4-03, Clarifications Q1).

## Ejemplo de intercambio (reporte financiero)

```json
> GET /api/reports/financial?desde=2026-10-01&hasta=2026-10-31
> Authorization: Bearer <token de administrador>

< 200 OK
< { "exito": true, "datos": { "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31" },
<   "pagos": [ … ], "total_recaudado": 124500.00,
<   "por_tipo_membresia": [ … ], "por_metodo": [ … ],
<   "conteo": { "total_pagos": 37, "confirmados": 35, "no_confirmados": 2 } },
<   "mensaje": "" }
```

```json
> GET /api/reports/financial?desde=2026-10-31&hasta=2026-10-01
> Authorization: Bearer <token de administrador>

< 400 Bad Request
< { "exito": false, "error": { "codigo": "RANGO_FECHAS_INVALIDO",
<   "mensaje": "El rango de fechas es inválido: revisa las fechas de inicio y fin" } }
```

```json
> GET /api/reports/financial?desde=2026-10-01&hasta=2026-10-31
> Authorization: Bearer <token de recepcionista>

< 403 Forbidden
< { "exito": false, "error": { "codigo": "SIN_PERMISO",
<   "mensaje": "No tienes permiso para realizar esta acción" } }
```
