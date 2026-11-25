// T010 [US1] Servicio del reporte financiero (FR-001, FR-003; HU1 esc. 5).
// - Valida el rango de fechas con el validador compartido T006
//   (`RANGO_FECHAS_INVALIDO` 400) ANTES de consultar la base.
// - Obtiene detalle, resumen y desgloses del modelo (T009) en paralelo.
// - Toda generación audita con `modulo='reportes'`,
//   `accion='generacion_reporte'`, el `usuario_id` de la sesión y una
//   descripción con el tipo de reporte y el periodo consultado (R-22,
//   FR-003). La auditoría es best-effort: un fallo al auditar no rompe la
//   consulta (patrón heredado de `auditoria.service`).
// - Solo lectura: no escribe ni borra datos del historial (FR-022).

import * as reporteModelo from '../models/reporte.model.js';
import { validarRangoFechas } from '../validators/reporte.validators.js';
import { AppError, codigosError } from '../utils/errors.js';
import { registrar } from './auditoria.service.js';

const MODULO = 'reportes';

// Forma pública de un pago del reporte: solo los campos enumerados en
// `contracts/api.md` (RN-S4-05) y `monto` como número (SUM/DECIMAL
// llega como texto desde mysql2).
function pagoPublico(pago) {
  return {
    id: pago.id,
    cliente_id: pago.cliente_id,
    cliente: pago.cliente,
    membresia_id: pago.membresia_id,
    tipo_membresia: pago.tipo_membresia,
    fecha_pago: pago.fecha_pago,
    monto: Number(pago.monto),
    metodo: pago.metodo,
    estado: pago.estado,
  };
}

export async function generarReporteFinanciero({ desde, hasta, usuario = null }) {
  validarRangoFechas(desde, hasta);

  const [pagos, resumen, desgloses] = await Promise.all([
    reporteModelo.listarPagosPeriodo(desde, hasta),
    reporteModelo.resumenFinanciero(desde, hasta),
    reporteModelo.desglosesFinancieros(desde, hasta),
  ]);

  const datos = {
    periodo: { desde, hasta },
    pagos: pagos.map(pagoPublico),
    total_recaudado: resumen.total_recaudado,
    por_tipo_membresia: desgloses.por_tipo_membresia,
    por_metodo: desgloses.por_metodo,
    conteo: {
      total_pagos: resumen.total_pagos,
      confirmados: resumen.confirmados,
      no_confirmados: resumen.no_confirmados,
    },
  };

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'generacion_reporte',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion:
      `Reporte financiero generado: periodo ${desde} a ${hasta}, ` +
      `${datos.conteo.total_pagos} pago(s), total recaudado ` +
      `$${datos.total_recaudado.toFixed(2)}.`,
  });

  return datos;
}

function validarClienteId(clienteId) {
  if (clienteId === undefined || clienteId === null || clienteId === '') return null;
  const valor = String(clienteId);
  if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
    throw new AppError(
      codigosError.VALIDACION,
      'El identificador del cliente debe ser un número entero positivo.',
      400
    );
  }
  return Number(valor);
}

export async function generarReporteAccesos({
  desde,
  hasta,
  clienteId,
  usuario = null,
}) {
  validarRangoFechas(desde, hasta);
  const id = validarClienteId(clienteId);

  const [filas, totales, porHora] = await Promise.all([
    reporteModelo.listarAccesosPeriodo(desde, hasta, id),
    reporteModelo.resumenAccesos(desde, hasta, id),
    reporteModelo.accesosPorHora(desde, hasta, id),
  ]);
  const accesos = filas.map((fila) => ({
    id: fila.id,
    fecha:
      typeof fila.fecha === 'string'
        ? fila.fecha.slice(0, 10)
        : new Date(fila.fecha).toISOString().slice(0, 10),
    hora: fila.hora,
    cliente_id: fila.cliente_id,
    cliente: fila.cliente,
    resultado: fila.resultado,
    motivo_rechazo: fila.motivo_rechazo,
  }));
  const datos = {
    periodo: { desde, hasta, cliente_id: id },
    accesos,
    totales,
    por_hora: porHora,
  };

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'generacion_reporte',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion:
      `Reporte de accesos generado: periodo ${desde} a ${hasta}` +
      `${id === null ? '' : `, cliente ${id}`}, ${totales.total} acceso(s).`,
  });

  return datos;
}
