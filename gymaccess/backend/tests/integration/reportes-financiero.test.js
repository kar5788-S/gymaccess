// T008 [US1] Integración del reporte financiero (HU1 esc. 1, 2 y 5;
// SC-001, FR-003): flujo completo por HTTP con pagos en los tres estados
// (confirmado, pendiente, anulado) → total recaudado correcto, auditoría
// registrada con `modulo='reportes'`, `accion='generacion_reporte'` y el
// periodo en la descripción; periodo sin datos → 200 sin error (la
// leyenda "No hay registros para este periodo" la pinta el cliente,
// FR-013). El SQL real de T009 se ejercita además en el quickstart
// (T044) contra una base temporal con la migración 004.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  pagos: [],
  auditorias: [],
}));

// Modelo en memoria con la misma semántica de las consultas de T009:
// filtra por rango, suma solo `confirmado` y agrupa los desgloses.
vi.mock('../../src/models/reporte.model.js', () => {
  function delPeriodo(desde, hasta) {
    return estado.pagos.filter((p) => {
      const dia = String(p.fecha_pago).slice(0, 10);
      return dia >= desde && dia <= hasta;
    });
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
      const porMetodo = new Map();
      const porTipo = new Map();
      for (const p of confirmados) {
        porMetodo.set(p.metodo, (porMetodo.get(p.metodo) ?? 0) + Number(p.monto));
        porTipo.set(
          p.tipo_membresia,
          (porTipo.get(p.tipo_membresia) ?? 0) + Number(p.monto)
        );
      }
      return {
        por_metodo: [...porMetodo].map(([metodo, total]) => ({ metodo, total })),
        por_tipo_membresia: [...porTipo].map(([tipo_membresia, total]) => ({
          tipo_membresia,
          total,
        })),
      };
    }),
  };
});

// La auditoría se escribe en la base real del flujo: aquí se captura cada
// registro para verificar accion/modulo/usuario/descripción (T010).
vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async (registro) => {
    estado.auditorias.push(registro);
    return estado.auditorias.length;
  }),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 7, nombre: 'Admin', email: 'admin@g.test', rol: 'administrador' });

// Pagos del periodo con los tres estados (2026-10-01 a 2026-10-31).
const PAGOS_DEL_PERIODO = [
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
    fecha_pago: '2026-10-20T18:40:00',
    monto: 150,
    metodo: 'efectivo',
    estado: 'pendiente',
  },
];

beforeEach(() => {
  estado.auditorias = [];
  estado.pagos = PAGOS_DEL_PERIODO.map((p) => ({ ...p }));
});

describe('flujo del reporte financiero', () => {
  it('con los tres estados, el total recaudado suma solo los confirmados', async () => {
    const respuesta = await request(app)
      .get('/api/reports/financial?desde=2026-10-01&hasta=2026-10-31')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(200);
    const { pagos, total_recaudado, conteo, por_metodo, por_tipo_membresia } =
      respuesta.body.datos;

    expect(pagos).toHaveLength(3);
    expect(total_recaudado).toBe(850);
    expect(conteo).toEqual({ total_pagos: 3, confirmados: 1, no_confirmados: 2 });
    expect(por_metodo.reduce((s, f) => s + Number(f.total), 0)).toBe(850);
    expect(por_tipo_membresia.reduce((s, f) => s + Number(f.total), 0)).toBe(850);
  });

  it('registra la auditoría con tipo de reporte y periodo en la descripción', async () => {
    await request(app)
      .get('/api/reports/financial?desde=2026-10-01&hasta=2026-10-31')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(estado.auditorias).toHaveLength(1);
    const registro = estado.auditorias[0];
    expect(registro.modulo).toBe('reportes');
    expect(registro.accion).toBe('generacion_reporte');
    expect(registro.usuario_id).toBe(7); // usuario de la sesión (token sub)
    expect(registro.resultado).toBe('exitoso');
    expect(registro.descripcion).toContain('2026-10-01');
    expect(registro.descripcion).toContain('2026-10-31');
    expect(registro.descripcion).toContain('Reporte financiero');
  });

  it('sin pagos en el periodo responde 200 sin error (leyenda del cliente)', async () => {
    estado.pagos = [];

    const respuesta = await request(app)
      .get('/api/reports/financial?desde=2026-10-01&hasta=2026-10-31')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.pagos).toEqual([]);
    expect(respuesta.body.datos.total_recaudado).toBe(0);
    expect(respuesta.body.error).toBeUndefined();
  });

  it('un rango inválido no genera reporte ni auditoría', async () => {
    const respuesta = await request(app)
      .get('/api/reports/financial?desde=2026-10-31&hasta=2026-10-01')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('RANGO_FECHAS_INVALIDO');
    expect(estado.auditorias).toHaveLength(0);
  });
});
