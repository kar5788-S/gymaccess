import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  consultar: vi.fn(),
}));

import { consultar } from '../../src/config/db.js';
import {
  accesosPorHora,
  desglosesFinancieros,
  listarAccesosPeriodo,
  listarPagosPeriodo,
  resumenAccesos,
  resumenFinanciero,
} from '../../src/models/reporte.model.js';

beforeEach(() => {
  consultar.mockReset();
});

describe('consultas de reportes', () => {
  it('lista todos los pagos del periodo y parametriza las fechas', async () => {
    consultar.mockResolvedValue([]);

    await listarPagosPeriodo('2026-10-01', '2026-10-31');

    expect(consultar.mock.calls[0][0]).toContain('LEFT JOIN membresias');
    expect(consultar.mock.calls[0][0]).toContain('p.fecha_pago >= ?');
    expect(consultar.mock.calls[0][0]).toContain('DATE_ADD(?, INTERVAL 1 DAY)');
    expect(consultar.mock.calls[0][1]).toEqual(['2026-10-01', '2026-10-31']);
  });

  it('normaliza el resumen financiero y suma únicamente pagos confirmados', async () => {
    consultar.mockResolvedValue([{
      total_recaudado: '850.00',
      total_pagos: 3,
      confirmados: 1,
      no_confirmados: 2,
    }]);

    const resumen = await resumenFinanciero('2026-10-01', '2026-10-31');

    expect(consultar.mock.calls[0][0]).toContain(
      "CASE WHEN p.estado = 'confirmado' THEN p.monto END"
    );
    expect(resumen).toEqual({
      total_recaudado: 850,
      total_pagos: 3,
      confirmados: 1,
      no_confirmados: 2,
    });
  });

  it('agrupa los desgloses únicamente por pagos confirmados', async () => {
    consultar
      .mockResolvedValueOnce([{ metodo: 'efectivo', total: '850.00' }])
      .mockResolvedValueOnce([{ tipo_membresia: 'Mensual', total: '850.00' }]);

    const desgloses = await desglosesFinancieros('2026-10-01', '2026-10-31');

    expect(consultar.mock.calls[0][0]).toContain("p.estado = 'confirmado'");
    expect(consultar.mock.calls[0][0]).toContain('GROUP BY p.metodo');
    expect(consultar.mock.calls[1][0]).toContain('GROUP BY t.id, t.nombre');
    expect(desgloses.por_metodo[0].total).toBe(850);
    expect(desgloses.por_tipo_membresia[0].total).toBe(850);
  });

  it('parametriza el filtro opcional de cliente en los accesos', async () => {
    consultar.mockResolvedValue([]);

    await listarAccesosPeriodo('2026-10-01', '2026-10-31', 9);

    expect(consultar.mock.calls[0][0]).toContain('a.fecha BETWEEN ? AND ?');
    expect(consultar.mock.calls[0][0]).toContain('a.cliente_id = ?');
    expect(consultar.mock.calls[0][1]).toEqual(['2026-10-01', '2026-10-31', 9]);
  });

  it('normaliza totales y etiquetas de la agrupación por hora', async () => {
    consultar
      .mockResolvedValueOnce([{
        total: '2',
        autorizados: '1',
        rechazados: '1',
      }])
      .mockResolvedValueOnce([{
        hora: 8,
        total: '2',
        autorizados: '1',
        rechazados: '1',
      }]);

    const totales = await resumenAccesos('2026-10-01', '2026-10-31');
    const horas = await accesosPorHora('2026-10-01', '2026-10-31');

    expect(totales).toEqual({ total: 2, autorizados: 1, rechazados: 1 });
    expect(consultar.mock.calls[1][0]).toContain('GROUP BY HOUR(a.hora)');
    expect(consultar.mock.calls[1][0]).toContain('ORDER BY total DESC');
    expect(horas[0]).toEqual({
      hora: 8,
      etiqueta: '08:00–09:00',
      total: 2,
      autorizados: 1,
      rechazados: 1,
    });
  });
});
