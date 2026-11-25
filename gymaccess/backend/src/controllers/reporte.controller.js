// T011 [US1] Controlador del reporte financiero (HU1).
// Recibe `desde`/`hasta` de la consulta, delega en el servicio (T010) y
// responde con la envolvente heredada `{exito, datos, mensaje}`.
// `RANGO_FECHAS_INVALIDO` no se captura aquí: se propaga como `AppError`
// y el manejador central de errores responde 400 con el mensaje fijo del
// contrato (mismo patrón que `FUERA_DE_CARGA`).

import {
  generarReporteAccesos,
  generarReporteFinanciero,
} from '../services/reporte.service.js';
import { responderExito } from '../utils/responses.js';

export async function obtenerReporteFinanciero(req, res, next) {
  try {
    const datos = await generarReporteFinanciero({
      desde: req.query.desde,
      hasta: req.query.hasta,
      usuario: req.usuario,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtenerReporteAccesos(req, res, next) {
  try {
    const datos = await generarReporteAccesos({
      desde: req.query.desde,
      hasta: req.query.hasta,
      clienteId: req.query.cliente_id,
      usuario: req.usuario,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
