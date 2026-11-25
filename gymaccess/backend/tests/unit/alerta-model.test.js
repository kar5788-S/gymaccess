import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  consultar: vi.fn(),
}));

import { consultar } from '../../src/config/db.js';
import { listarVencimientosProximos } from '../../src/models/alerta.model.js';

beforeEach(() => {
  consultar.mockReset();
});

describe('consulta de alertas de vencimiento', () => {
  it('filtra por fechas indexables, toma una membresía por cliente y ordena por días', async () => {
    consultar.mockResolvedValue([]);

    await listarVencimientosProximos();

    const [sql, parametros] = consultar.mock.calls[0];
    expect(sql).toContain("m.estado = 'activa'");
    expect(sql).toContain('m.fecha_vencimiento BETWEEN CURDATE()');
    expect(sql).toContain('DATE_ADD(CURDATE(), INTERVAL 5 DAY)');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('anterior.fecha_vencimiento < m.fecha_vencimiento');
    expect(sql).toContain('ORDER BY dias_restantes ASC');
    expect(parametros).toEqual([]);
  });
});
