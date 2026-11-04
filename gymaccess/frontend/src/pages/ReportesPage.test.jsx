import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportesPage from './ReportesPage.jsx';

const api = vi.hoisted(() => ({
  financiero: null,
  accesos: null,
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: { token: 'token-prueba' } }),
}));

vi.mock('../services/reportes.api.js', () => ({
  obtenerReporteFinanciero: vi.fn(async () => api.financiero),
  obtenerReporteAccesos: vi.fn(async () => api.accesos),
}));

vi.mock('../services/exportacion.js', () => ({
  exportarPDF: vi.fn(() => true),
  exportarCSV: vi.fn(() => true),
}));

beforeEach(() => {
  api.financiero = {
    periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
    pagos: [{
      id: 1, cliente: 'Ana López', tipo_membresia: 'Mensual',
      fecha_pago: '2026-11-05T10:00:00', monto: 850, metodo: 'efectivo',
      estado: 'confirmado',
    }],
    total_recaudado: 850,
    conteo: { total_pagos: 1, confirmados: 1, no_confirmados: 0 },
    por_tipo_membresia: [{ tipo_membresia: 'Mensual', total: 850 }],
    por_metodo: [{ metodo: 'efectivo', total: 850 }],
  };
  api.accesos = {
    periodo: { desde: '2026-11-01', hasta: '2026-11-30', cliente_id: null },
    accesos: [{
      id: 2, fecha: '2026-11-05', hora: '08:15:00', cliente_id: null,
      cliente: null, resultado: 'rechazado',
      motivo_rechazo: 'rostro_no_identificado',
    }],
    totales: { total: 1, autorizados: 0, rechazados: 1 },
    por_hora: [{
      hora: 8, etiqueta: '08:00–09:00', total: 1, autorizados: 0, rechazados: 1,
    }],
  };
});

describe('ReportesPage', () => {
  it('presenta los dos reportes y los controles de exportación', async () => {
    render(<ReportesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte financiero' }));
    expect(await screen.findByText('Ana López')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte de accesos' }));
    expect(await screen.findByText('No identificado')).toBeInTheDocument();
    expect(screen.getByText('08:00–09:00')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Exportar PDF' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Exportar Excel (CSV)' })).toHaveLength(2);
  });

  it('muestra el estado vacío y no ofrece exportar reportes vacíos', async () => {
    api.financiero = {
      periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
      pagos: [], total_recaudado: 0,
      conteo: { total_pagos: 0, confirmados: 0, no_confirmados: 0 },
      por_tipo_membresia: [], por_metodo: [],
    };
    api.accesos = {
      periodo: { desde: '2026-11-01', hasta: '2026-11-30', cliente_id: null },
      accesos: [], totales: { total: 0, autorizados: 0, rechazados: 0 },
      por_hora: [],
    };
    render(<ReportesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte financiero' }));
    expect(
      await screen.findByText('No hay registros para este periodo.')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generar reporte de accesos' })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte de accesos' }));
    await waitFor(() =>
      expect(screen.getAllByText('No hay registros para este periodo.')).toHaveLength(2)
    );
    expect(screen.queryByRole('button', { name: 'Exportar PDF' })).not.toBeInTheDocument();
  });
});
