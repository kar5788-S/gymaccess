import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  guardar: vi.fn(),
  tabla: vi.fn(),
  texto: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    lastAutoTable = { finalY: 50 };
    setFontSize() {}
    text(...argumentos) {
      mocks.texto(...argumentos);
    }
    save(nombre) {
      mocks.guardar(nombre);
    }
  },
}));

vi.mock('jspdf-autotable', () => ({
  default: (...argumentos) => mocks.tabla(...argumentos),
}));

import {
  crearContenidoCSV,
  exportarCSV,
  exportarPDF,
} from './exportacion.js';

const reporteFinanciero = {
  periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
  pagos: [{
    cliente: 'Ana López', tipo_membresia: 'Mensual',
    fecha_pago: '2026-11-05T10:00:00', monto: 850, metodo: 'efectivo',
    estado: 'confirmado',
  }],
  total_recaudado: 850,
  conteo: { total_pagos: 1, confirmados: 1, no_confirmados: 0 },
  por_tipo_membresia: [{ tipo_membresia: 'Mensual', total: 850 }],
  por_metodo: [{ metodo: 'efectivo', total: 850 }],
};

beforeEach(() => {
  mocks.guardar.mockReset();
  mocks.tabla.mockReset();
  mocks.texto.mockReset();
  mocks.tabla.mockImplementation((documento) => {
    documento.lastAutoTable = { finalY: 60 };
  });
});

describe('exportación de reportes', () => {
  it('genera PDF con encabezado, periodo, columnas y totales', async () => {
    await expect(exportarPDF(reporteFinanciero, 'financiero')).resolves.toBe(true);
    expect(mocks.texto).toHaveBeenCalledWith('GymAccess', 14, 18);
    expect(mocks.texto.mock.calls[1][0]).toContain('2026-11-01 a 2026-11-30');
    expect(mocks.guardar).toHaveBeenCalledWith(
      'reporte-financiero-2026-11-01-2026-11-30.pdf'
    );
    expect(mocks.tabla).toHaveBeenCalledTimes(2);
    expect(mocks.tabla.mock.calls[0][1].head[0]).toContain('ID');
    expect(mocks.tabla.mock.calls[1][1].body[0]).toEqual(['Total recaudado', '850.00']);
  });

  it('genera CSV con BOM UTF-8 y separador compatible con Excel', () => {
    const contenido = crearContenidoCSV(reporteFinanciero, 'financiero');

    expect(contenido.charCodeAt(0)).toBe(0xfeff);
    expect(contenido).toContain(';');
    expect(contenido).toContain('"Total recaudado";"850.00"');
    expect(contenido).toContain('"GymAccess"');
  });

  it('descarga el CSV en el navegador y libera la URL temporal', () => {
    const crearUrl = vi.fn(() => 'blob:reporte');
    const revocarUrl = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      createObjectURL: crearUrl,
      revokeObjectURL: revocarUrl,
    });

    expect(exportarCSV(reporteFinanciero, 'financiero')).toBe(true);
    expect(clic).toHaveBeenCalledOnce();
    expect(crearUrl).toHaveBeenCalledOnce();
    expect(revocarUrl).toHaveBeenCalledWith('blob:reporte');

    clic.mockRestore();
    vi.unstubAllGlobals();
  });

  it('no crea un archivo si el reporte está vacío', async () => {
    const vacio = { ...reporteFinanciero, pagos: [] };
    expect(exportarCSV(vacio, 'financiero')).toBe(false);
    await expect(exportarPDF(vacio, 'financiero')).resolves.toBe(false);
    expect(mocks.guardar).not.toHaveBeenCalled();
  });

  it('propaga errores de generación y no guarda un PDF incompleto', async () => {
    mocks.tabla.mockImplementationOnce(() => {
      throw new Error('Fallo interno');
    });

    await expect(exportarPDF(reporteFinanciero, 'financiero')).rejects.toThrow(
      'Fallo interno'
    );
    expect(mocks.guardar).not.toHaveBeenCalled();
  });
});
