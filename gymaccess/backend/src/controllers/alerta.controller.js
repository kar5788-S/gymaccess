import { listarAlertasVencimiento } from '../services/alerta.service.js';
import { responderExito } from '../utils/responses.js';

export async function obtenerAlertasVencimiento(req, res, next) {
  try {
    const alertas = await listarAlertasVencimiento();
    return responderExito(res, { alertas });
  } catch (error) {
    return next(error);
  }
}
