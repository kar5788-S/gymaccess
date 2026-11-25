// Llamadas de reportes y alertas (contracts/api.md).

import { apiFetch } from './http.js';

// Reporte financiero: { periodo, pagos, total_recaudado,
// por_tipo_membresia, por_metodo, conteo } (HU1).
export async function obtenerReporteFinanciero(token, desde, hasta) {
  const parametros = new URLSearchParams({ desde, hasta });
  const cuerpo = await apiFetch(`/api/reports/financial?${parametros}`, { token });
  return cuerpo.datos;
}

// Reporte consolidado de accesos: `clienteId` es opcional.
export async function obtenerReporteAccesos(token, desde, hasta, clienteId) {
  const parametros = new URLSearchParams({ desde, hasta });
  if (clienteId !== undefined && String(clienteId).trim() !== '') {
    parametros.set('cliente_id', String(clienteId).trim());
  }
  const cuerpo = await apiFetch(`/api/reports/accesses?${parametros}`, { token });
  return cuerpo.datos;
}

export async function obtenerAlertasVencimiento(token) {
  const cuerpo = await apiFetch('/api/alerts/expirations', { token });
  return cuerpo.datos;
}
