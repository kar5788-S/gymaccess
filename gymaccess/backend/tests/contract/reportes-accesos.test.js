import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  accesos: [],
  auditorias: [],
  totales: { total: 0, autorizados: 0, rechazados: 0 },
  porHora: [],
}));

vi.mock('../../src/models/reporte.model.js', () => ({
  listarPagosPeriodo: vi.fn(async () => []),
  resumenFinanciero: vi.fn(async () => ({
    total_recaudado: 0,
    total_pagos: 0,
    confirmados: 0,
    no_confirmados: 0,
  })),
  desglosesFinancieros: vi.fn(async () => ({
    por_metodo: [],
    por_tipo_membresia: [],
  })),
  listarAccesosPeriodo: vi.fn(async (_desde, _hasta, clienteId) =>
    estado.accesos.filter((acceso) => clienteId === null || acceso.cliente_id === clienteId)
  ),
  resumenAccesos: vi.fn(async (_desde, _hasta, clienteId) =>
    clienteId === null
      ? { ...estado.totales }
      : { total: 1, autorizados: 1, rechazados: 0 }
  ),
  accesosPorHora: vi.fn(async (_desde, _hasta, clienteId) =>
    clienteId === null ? [...estado.porHora] : [{
      hora: 8,
      etiqueta: '08:00–09:00',
      total: 1,
      autorizados: 1,
      rechazados: 0,
    }]
  ),
}));

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async (registro) => {
    estado.auditorias.push(registro);
    return estado.auditorias.length;
  }),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const token = (rol) =>
  firmarToken({ sub: 1, nombre: 'Usuario', email: 'u@g.test', rol });
const rango = 'desde=2026-10-01&hasta=2026-10-31';

beforeEach(() => {
  estado.auditorias = [];
  estado.accesos = [
    {
      id: 1,
      fecha: '2026-10-05',
      hora: '08:15:00',
      cliente_id: 3,
      cliente: 'Ana López',
      resultado: 'autorizado',
      motivo_rechazo: null,
    },
    {
      id: 2,
      fecha: '2026-10-05',
      hora: '08:30:00',
      cliente_id: null,
      cliente: null,
      resultado: 'rechazado',
      motivo_rechazo: 'rostro_no_identificado',
    },
  ];
  estado.totales = { total: 2, autorizados: 1, rechazados: 1 };
  estado.porHora = [
    {
      hora: 8,
      etiqueta: '08:00–09:00',
      total: 2,
      autorizados: 1,
      rechazados: 1,
    },
  ];
});

describe('GET /api/reports/accesses', () => {
  it('permite el reporte solo al administrador y entrega motivos de rechazo', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/accesses?${rango}`)
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.accesos).toHaveLength(2);
    expect(respuesta.body.datos.accesos[1].motivo_rechazo).toBe(
      'rostro_no_identificado'
    );
    expect(respuesta.body.datos.por_hora[0].etiqueta).toBe('08:00–09:00');
    expect(estado.auditorias[0].descripcion).toContain('2026-10-01');
  });

  it.each(['recepcionista', 'entrenador', 'cliente'])(
    'deniega el reporte al rol %s',
    async (rol) => {
      const respuesta = await request(app)
        .get(`/api/reports/accesses?${rango}`)
        .set('Authorization', `Bearer ${token(rol)}`);

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    }
  );

  it('filtra por cliente y recalcula el periodo enviado a las consultas', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/accesses?${rango}&cliente_id=3`)
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.accesos).toHaveLength(1);
    expect(respuesta.body.datos.periodo.cliente_id).toBe(3);
    expect(respuesta.body.datos.totales).toEqual({
      total: 1,
      autorizados: 1,
      rechazados: 0,
    });
  });

  it('rechaza un identificador de cliente no numérico', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/accesses?${rango}&cliente_id=abc`)
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('rechaza un rango invertido y acepta un periodo sin registros', async () => {
    const rangoInvalido = await request(app)
      .get('/api/reports/accesses?desde=2026-10-31&hasta=2026-10-01')
      .set('Authorization', `Bearer ${token('administrador')}`);
    expect(rangoInvalido.status).toBe(400);
    expect(rangoInvalido.body.error.codigo).toBe('RANGO_FECHAS_INVALIDO');

    estado.accesos = [];
    estado.totales = { total: 0, autorizados: 0, rechazados: 0 };
    estado.porHora = [];
    const vacio = await request(app)
      .get(`/api/reports/accesses?${rango}`)
      .set('Authorization', `Bearer ${token('administrador')}`);
    expect(vacio.status).toBe(200);
    expect(vacio.body.datos.accesos).toEqual([]);
    expect(vacio.body.datos.por_hora).toEqual([]);
    expect(vacio.body.datos.totales.total).toBe(0);
  });
});
