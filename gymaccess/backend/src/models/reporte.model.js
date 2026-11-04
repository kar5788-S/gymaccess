// T009 [US1] Modelo del reporte financiero (FR-001, R-38, R-39;
// Clarifications Q5): solo lectura, sin operaciones de borrado (FR-022).
// - Detalle de pagos del rango con JOIN a `clientes`, `membresias` y
//   `tipos_membresia`.
// - `total_recaudado` suma SOLO pagos `confirmado`; los demás estados se
//   listan con su estado pero no suman.
// - Desgloses `GROUP BY` por tipo de membresía y método, también solo
//   sobre confirmados, para que sus sumas coincidan con el total.
// - El rango se aplica como `fecha_pago >= ? AND fecha_pago < ? + 1 día`
//   (semiabierto): incluye el día `hasta` completo sin envolver la columna
//   en funciones, de modo que se usan los índices `idx_pagos_fecha` e
//   `idx_pagos_estado` de la migración 004 (R-43).
// - Todas las consultas usan parámetros `?` (R-10, Principio V).

import { consultar } from '../config/db.js';

// Filtro de rango semiabierto sobre `fecha_pago` (DATETIME) reutilizado
// por el detalle, el resumen y los desgloses (alias `p`).
const RANGO_FECHAS = 'p.fecha_pago >= ? AND p.fecha_pago < DATE_ADD(?, INTERVAL 1 DAY)';

// Detalle de los pagos del periodo con los campos del contrato.
// `DATE_FORMAT` fija la forma `AAAA-MM-DDTHH:MM:SS` de `fecha_pago`.
export async function listarPagosPeriodo(desde, hasta) {
  return consultar(
    `SELECT p.id, p.cliente_id, c.nombre_completo AS cliente,
            p.membresia_id, t.nombre AS tipo_membresia,
            DATE_FORMAT(p.fecha_pago, '%Y-%m-%dT%H:%i:%s') AS fecha_pago,
            p.monto, p.metodo, p.estado
       FROM pagos p
       LEFT JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN membresias m ON m.id = p.membresia_id
       LEFT JOIN tipos_membresia t ON t.id = m.tipo_membresia_id
      WHERE ${RANGO_FECHAS}
      ORDER BY p.fecha_pago DESC, p.id DESC`,
    [desde, hasta]
  );
}

// Cifras agregadas: total recaudado (solo confirmados) y conteos por
// estado del periodo completo. SUM de DECIMAL llega como texto: se
// normaliza a número aquí para que el servicio solo arme la respuesta.
export async function resumenFinanciero(desde, hasta) {
  const filas = await consultar(
    `SELECT COALESCE(SUM(CASE WHEN p.estado = 'confirmado' THEN p.monto END), 0)
              AS total_recaudado,
            COUNT(*) AS total_pagos,
            COALESCE(SUM(CASE WHEN p.estado = 'confirmado' THEN 1 ELSE 0 END), 0)
              AS confirmados,
            COALESCE(SUM(CASE WHEN p.estado <> 'confirmado' THEN 1 ELSE 0 END), 0)
              AS no_confirmados
       FROM pagos p
      WHERE ${RANGO_FECHAS}`,
    [desde, hasta]
  );
  const fila = filas[0] ?? {};
  return {
    total_recaudado: Number(fila.total_recaudado ?? 0),
    total_pagos: Number(fila.total_pagos ?? 0),
    confirmados: Number(fila.confirmados ?? 0),
    no_confirmados: Number(fila.no_confirmados ?? 0),
  };
}

// Desgloses por método de pago y por tipo de membresía, SOLO sobre pagos
// confirmados (HU1 esc. 2): sus sumas coinciden con `total_recaudado`.
export async function desglosesFinancieros(desde, hasta) {
  const [porMetodo, porTipo] = await Promise.all([
    consultar(
      `SELECT p.metodo, COALESCE(SUM(p.monto), 0) AS total
         FROM pagos p
        WHERE p.estado = 'confirmado' AND ${RANGO_FECHAS}
        GROUP BY p.metodo
        ORDER BY total DESC, p.metodo`,
      [desde, hasta]
    ),
    consultar(
      `SELECT t.nombre AS tipo_membresia, COALESCE(SUM(p.monto), 0) AS total
         FROM pagos p
         JOIN membresias m ON m.id = p.membresia_id
         JOIN tipos_membresia t ON t.id = m.tipo_membresia_id
        WHERE p.estado = 'confirmado' AND ${RANGO_FECHAS}
        GROUP BY t.id, t.nombre
        ORDER BY total DESC, t.nombre`,
      [desde, hasta]
    ),
  ]);

  return {
    por_metodo: porMetodo.map((f) => ({
      metodo: f.metodo,
      total: Number(f.total),
    })),
    por_tipo_membresia: porTipo.map((f) => ({
      tipo_membresia: f.tipo_membresia,
      total: Number(f.total),
    })),
  };
}

function condicionesAccesos(desde, hasta, clienteId) {
  const condiciones = ['a.fecha BETWEEN ? AND ?'];
  const params = [desde, hasta];
  if (clienteId !== null) {
    condiciones.push('a.cliente_id = ?');
    params.push(clienteId);
  }
  return { where: condiciones.join(' AND '), params };
}

export async function listarAccesosPeriodo(desde, hasta, clienteId = null) {
  const { where, params } = condicionesAccesos(desde, hasta, clienteId);
  return consultar(
    `SELECT a.id, DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
            TIME_FORMAT(a.hora, '%H:%i:%s') AS hora,
            a.cliente_id, c.nombre_completo AS cliente,
            a.resultado, a.motivo_rechazo
       FROM accesos a
       LEFT JOIN clientes c ON c.id = a.cliente_id
      WHERE ${where}
      ORDER BY a.fecha DESC, a.hora DESC, a.id DESC`,
    params
  );
}

export async function resumenAccesos(desde, hasta, clienteId = null) {
  const { where, params } = condicionesAccesos(desde, hasta, clienteId);
  const filas = await consultar(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(a.resultado = 'autorizado'), 0) AS autorizados,
            COALESCE(SUM(a.resultado = 'rechazado'), 0) AS rechazados
       FROM accesos a
      WHERE ${where}`,
    params
  );
  const fila = filas[0] ?? {};
  return {
    total: Number(fila.total ?? 0),
    autorizados: Number(fila.autorizados ?? 0),
    rechazados: Number(fila.rechazados ?? 0),
  };
}

export async function accesosPorHora(desde, hasta, clienteId = null) {
  const { where, params } = condicionesAccesos(desde, hasta, clienteId);
  const filas = await consultar(
    `SELECT HOUR(a.hora) AS hora, COUNT(*) AS total,
            COALESCE(SUM(a.resultado = 'autorizado'), 0) AS autorizados,
            COALESCE(SUM(a.resultado = 'rechazado'), 0) AS rechazados
       FROM accesos a
      WHERE ${where}
      GROUP BY HOUR(a.hora)
      ORDER BY total DESC, hora ASC`,
    params
  );
  return filas.map((fila) => {
    const hora = Number(fila.hora);
    const inicio = String(hora).padStart(2, '0');
    const fin = String((hora + 1) % 24).padStart(2, '0');
    return {
      hora,
      etiqueta: `${inicio}:00–${fin}:00`,
      total: Number(fila.total),
      autorizados: Number(fila.autorizados),
      rechazados: Number(fila.rechazados),
    };
  });
}
