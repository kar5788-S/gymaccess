// Consulta bajo demanda; las alertas no se almacenan ni generan auditoría.

import { listarVencimientosProximos } from '../models/alerta.model.js';

export async function listarAlertasVencimiento() {
  const filas = await listarVencimientosProximos();
  return filas.map((fila) => ({
    cliente_id: fila.cliente_id,
    cliente: fila.cliente,
    tipo_membresia: fila.tipo_membresia,
    fecha_vencimiento: fila.fecha_vencimiento,
    dias_restantes: Number(fila.dias_restantes),
  }));
}
