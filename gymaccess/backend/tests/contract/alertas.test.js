import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ alertas: [] }));

vi.mock('../../src/models/alerta.model.js', () => ({
  listarVencimientosProximos: vi.fn(async () => estado.alertas),
}));

import app from '../../src/app.js';

const token = (rol) =>
  firmarToken({ sub: 1, nombre: 'Usuario', email: 'u@g.test', rol });

beforeEach(() => {
  estado.alertas = [
    {
      cliente_id: 3,
      cliente: 'Ana López',
      tipo_membresia: 'Mensual',
      fecha_vencimiento: '2026-11-07',
      dias_restantes: 3,
    },
    {
      cliente_id: 4,
      cliente: 'Luis Ruiz',
      tipo_membresia: 'Trimestral',
      fecha_vencimiento: '2026-11-04',
      dias_restantes: 0,
    },
  ];
});

describe('GET /api/alerts/expirations', () => {
  it('permite alertas a administrador y recepcionista', async () => {
    for (const rol of ['administrador', 'recepcionista']) {
      const respuesta = await request(app)
        .get('/api/alerts/expirations')
        .set('Authorization', `Bearer ${token(rol)}`);

      expect(respuesta.status, `Debe permitir a ${rol}`).toBe(200);
      expect(respuesta.body.datos.alertas).toHaveLength(2);
      expect(respuesta.body.datos.alertas[0].dias_restantes).toBe(3);
      expect(respuesta.body.datos.alertas[1].dias_restantes).toBe(0);
    }
  });

  it.each(['entrenador', 'cliente'])('deniega el acceso al rol %s', async (rol) => {
    const respuesta = await request(app)
      .get('/api/alerts/expirations')
      .set('Authorization', `Bearer ${token(rol)}`);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('devuelve una lista vacía si no hay vencimientos próximos', async () => {
    estado.alertas = [];
    const respuesta = await request(app)
      .get('/api/alerts/expirations')
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.alertas).toEqual([]);
  });
});
