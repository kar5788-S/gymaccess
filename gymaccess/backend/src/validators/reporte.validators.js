// T006 [Foundational] Validación del rango de fechas de los reportes
// (FR-014, HU1 esc. 6 y HU3, contracts/api.md): `desde` y `hasta` son
// obligatorios, con formato `YYYY-MM-DD` real (calendario) y `desde`
// anterior o igual a `hasta`. Se comparte entre el reporte financiero
// (US1) y el reporte de accesos (US3). Cualquier incumplimiento lanza
// `RANGO_FECHAS_INVALIDO` (400) con el mensaje fijo del contrato.

import { AppError, codigosError } from '../utils/errors.js';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Valida formato y que la fecha exista en el calendario (02-30 → false).
function fechaReal(valor) {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

export function validarRangoFechas(desde, hasta) {
  const formatoValido = fechaReal(desde) && fechaReal(hasta);
  const ordenValido = formatoValido && desde <= hasta; // ISO compara bien
  if (!formatoValido || !ordenValido) {
    throw new AppError(
      codigosError.RANGO_FECHAS_INVALIDO,
      'El rango de fechas es inválido: revisa las fechas de inicio y fin',
      400
    );
  }
  return { desde, hasta };
}
