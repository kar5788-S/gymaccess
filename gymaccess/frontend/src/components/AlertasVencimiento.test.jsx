import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AlertasVencimiento from './AlertasVencimiento.jsx';

vi.mock('../services/reportes.api.js', () => ({
  obtenerAlertasVencimiento: vi.fn(),
}));

import { obtenerAlertasVencimiento } from '../services/reportes.api.js';

beforeEach(() => {
  obtenerAlertasVencimiento.mockReset();
});

describe('AlertasVencimiento', () => {
  it('muestra el nombre, plan y días restantes con destacado amarillo', async () => {
    obtenerAlertasVencimiento.mockResolvedValue({
      alertas: [{
        cliente_id: 3,
        cliente: 'Ana López',
        tipo_membresia: 'Mensual',
        fecha_vencimiento: '2026-11-07',
        dias_restantes: 3,
      }],
    });

    render(<AlertasVencimiento token="token-prueba" />);

    expect(await screen.findByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('Mensual')).toBeInTheDocument();
    expect(screen.getByText('Vence en 3 días')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveClass('alerta-vencimiento');
  });

  it('muestra el mensaje vacío sin mostrar errores', async () => {
    obtenerAlertasVencimiento.mockResolvedValue({ alertas: [] });

    render(<AlertasVencimiento token="token-prueba" />);

    expect(
      await screen.findByText('Sin alertas de vencimiento próximo')
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('presenta explícitamente los fallos al consultar las alertas', async () => {
    obtenerAlertasVencimiento.mockRejectedValue(new Error('No se pudo consultar.'));

    render(<AlertasVencimiento token="token-prueba" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo consultar.'
    );
  });
});
