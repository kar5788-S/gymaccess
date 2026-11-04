// T007 [US1] Contrato del reporte financiero (contracts/api.md, HU1):
// - Solo administrador: 403 en recepcionista, entrenador y cliente
//   (HU1 esc. 3, FR-002, clarify Q4).
// - Rango invertido, ausente o mal formado → 400 `RANGO_FECHAS_INVALIDO`
//   con el mensaje fijo del contrato (HU1 esc. 6).
// - Periodo vacío → 200 con `pagos: []` y `total_recaudado: 0`
//   (la leyenda de pantalla es responsabilidad del cliente, FR-013).
// - Pagos `pendiente`/`anulado` se listan con su estado pero NO suman
//   (Clarifications Q5).
// - Suma de `por_metodo` y de `por_tipo_membresia` = `total_recaudado`
//   (HU1 esc. 2).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  pagos: [],
  auditorias: [],
}));

// Modelo con lógica en memoria equivalente a las consultas de T009:
// filtra por rango, suma solo confirmados y agrupa desgloses igual.
vi.mock('../../src/models/reporte.model.js', () => {
  function enRango(p, desde, hasta) {
    const dia = String(p.fecha_pago).slice(0, 10);
    return dia >= desde && dia <= hasta;
  }
  function delPeriodo(desde, hasta) {
    return estado.pagos.filter((p) => enRango(p, desde, hasta));
  }
  function agrupar(filas, clave) {
    const grupos = new Map();
    for (const fila of filas) {
      const k = fila[clave];
      grupos.set(k, (grupos.get(k) ?? 0) + Number(fila.monto));
    }
    return [...grupos].map(([k, total]) => ({ [clave]: k, total }));
  }

  return {
    listarPagosPeriodo: vi.fn(async (desde, hasta) =>
      delPeriodo(desde, hasta).map((p) => ({ ...p }))
    ),
    resumenFinanciero: vi.fn(async (desde, hasta) => {
      const pagos = delPeriodo(desde, hasta);
      const confirmados = pagos.filter((p) => p.estado === 'confirmado');
      return {
        total_recaudado: confirmados.reduce((s, p) => s + Number(p.monto), 0),
        total_pagos: pagos.length,
        confirmados: confirmados.length,
        no_confirmados: pagos.length - confirmados.length,
      };
    }),
    desglosesFinancieros: vi.fn(async (desde, hasta) => {
      const confirmados = delPeriodo(desde, hasta).filter(
        (p) => p.estado === 'confirmado'
      );
      return {
        por_metodo: agrupar(confirmados, 'metodo'),
        por_tipo_membresia: agrupar(confirmados, 'tipo_membresia'),
      };
    }),
  };
});

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async (registro) => {
    estado.auditorias.push(registro);
    return estado.auditorias.length;
  }),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 2, nombre: 'Ana', email: 'r@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 3, nombre: 'Eva', email: 'e@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 4, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });

const RANGO = 'desde=2026-10-01&hasta=2026-10-31';

beforeEach(() => {
  estado.auditorias = [];
  // Cuatro pagos: tres dentro del rango (uno por estado) y uno fuera,
  // para comprobar el filtro del periodo.
  estado.pagos = [
    {
      id: 1,
      cliente_id: 3,
      cliente: 'Ana López',
      membresia_id: 5,
      tipo_membresia: 'Mensual',
      fecha_pago: '2026-10-05T10:24:00',
      monto: 850,
      metodo: 'efectivo',
      estado: 'confirmado',
    },
    {
      id: 2,
      cliente_id: 4,
      cliente: 'Luis Ruiz',
      membresia_id: 6,
      tipo_membresia: 'Trimestral',
      fecha_pago: '2026-10-06T12:00:00',
      monto: 2300,
      metodo: 'efectivo',
      estado: 'anulado',
    },
    {
      id: 3,
      cliente_id: 3,
      cliente: 'Ana López',
      membresia_id: 5,
      tipo_membresia: 'Mensual',
      fecha_pago: '2026-10-07T09:15:00',
      monto: 150,
      metodo: 'efectivo',
      estado: 'pendiente',
    },
    {
      id: 4,
      cliente_id: 4,
      cliente: 'Luis Ruiz',
      membresia_id: 6,
      tipo_membresia: 'Trimestral',
      fecha_pago: '2026-11-15T10:00:00',
      monto: 999,
      metodo: 'efectivo',
      estado: 'confirmado',
    },
  ];
});

describe('GET /api/reports/financial — permisos', () => {
  it('el administrador recibe 200 con la estructura del contrato', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/financial?${RANGO}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.periodo).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-31',
    });
    expect(respuesta.body.datos).toHaveProperty('pagos');
    expect(respuesta.body.datos).toHaveProperty('total_recaudado');
    expect(respuesta.body.datos).toHaveProperty('por_tipo_membresia');
    expect(respuesta.body.datos).toHaveProperty('por_metodo');
    expect(respuesta.body.datos).toHaveProperty('conteo');
  });

  it.each([
    ['recepcionista', tokenRecep],
    ['entrenador', tokenEntrena],
    ['cliente', tokenCliente],
  ])('el %s recibe 403 SIN_PERMISO', async (_rol, token) => {
    const respuesta = await request(app)
      .get(`/api/reports/financial?${RANGO}`)
      .set('Authorization', `Bearer ${token()}`);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('sin token recibe 401 NO_AUTENTICADO', async () => {
    const respuesta = await request(app).get(`/api/reports/financial?${RANGO}`);

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('NO_AUTENTICADO');
  });
});

describe('GET /api/reports/financial — rango de fechas', () => {
  it('un rango invertido responde 400 RANGO_FECHAS_INVALIDO', async () => {
    const respuesta = await request(app)
      .get('/api/reports/financial?desde=2026-10-31&hasta=2026-10-01')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.error.codigo).toBe('RANGO_FECHAS_INVALIDO');
    expect(respuesta.body.error.mensaje).toBe(
      'El rango de fechas es inválido: revisa las fechas de inicio y fin'
    );
  });

  it('sin parámetros responde 400 RANGO_FECHAS_INVALIDO', async () => {
    const respuesta = await request(app)
      .get('/api/reports/financial')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('RANGO_FECHAS_INVALIDO');
  });

  it('una fecha inexistente en el calendario responde 400 RANGO_FECHAS_INVALIDO', async () => {
    const respuesta = await request(app)
      .get('/api/reports/financial?desde=2026-02-30&hasta=2026-03-01')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('RANGO_FECHAS_INVALIDO');
  });
});

describe('GET /api/reports/financial — cifras del periodo', () => {
  it('lista los pagos del periodo con su estado y excluye los de afuera', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/financial?${RANGO}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    const { pagos } = respuesta.body.datos;
    expect(pagos).toHaveLength(3); // el pago del 2026-11-15 queda fuera
    expect(pagos.map((p) => p.estado).sort()).toEqual([
      'anulado',
      'confirmado',
      'pendiente',
    ]);
  });

  it('el total recaudado suma solo los pagos confirmados (Q5)', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/financial?${RANGO}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    const { total_recaudado, conteo } = respuesta.body.datos;
    expect(total_recaudado).toBe(850); // 2300 anulado + 150 pendiente no suman
    expect(conteo).toEqual({ total_pagos: 3, confirmados: 1, no_confirmados: 2 });
  });

  it('las sumas de por_metodo y por_tipo_membresia coinciden con el total', async () => {
    const respuesta = await request(app)
      .get(`/api/reports/financial?${RANGO}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    const { total_recaudado, por_metodo, por_tipo_membresia } = respuesta.body.datos;
    const sumaMetodo = por_metodo.reduce((s, f) => s + Number(f.total), 0);
    const sumaTipo = por_tipo_membresia.reduce((s, f) => s + Number(f.total), 0);

    expect(sumaMetodo).toBe(total_recaudado);
    expect(sumaTipo).toBe(total_recaudado);
    expect(por_metodo).toEqual([{ metodo: 'efectivo', total: 850 }]);
    expect(por_tipo_membresia).toEqual([
      { tipo_membresia: 'Mensual', total: 850 },
    ]);
  });

  it('un periodo sin pagos responde 200 con lista vacía y total en cero', async () => {
    const respuesta = await request(app)
      .get('/api/reports/financial?desde=2025-01-01&hasta=2025-01-31')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.pagos).toEqual([]);
    expect(respuesta.body.datos.total_recaudado).toBe(0);
    expect(respuesta.body.datos.conteo).toEqual({
      total_pagos: 0,
      confirmados: 0,
      no_confirmados: 0,
    });
    expect(respuesta.body.datos.por_metodo).toEqual([]);
    expect(respuesta.body.datos.por_tipo_membresia).toEqual([]);
  });
});
