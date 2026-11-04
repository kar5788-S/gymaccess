import { describe, expect, it, vi } from 'vitest';
import { validarEntorno } from '../../src/config/entorno.js';

describe('validación del entorno', () => {
  it('rechaza producción e informa solo los nombres de variables faltantes', () => {
    expect(() =>
      validarEntorno({ NODE_ENV: 'production', DB_NOMBRE: 'gimnasio' })
    ).toThrow(
      'DB_USUARIO, DB_CONTRASENA, JWT_SECRET'
    );
  });

  it('permite desarrollo con valores predeterminados y emite una advertencia', () => {
    const advertir = vi.fn();
    const resultado = validarEntorno({ NODE_ENV: 'development' }, advertir);

    expect(resultado.modo).toBe('desarrollo');
    expect(advertir).toHaveBeenCalledOnce();
    expect(advertir.mock.calls[0][0]).toContain('DB_NOMBRE');
    expect(advertir.mock.calls[0][0]).not.toContain('secreto-real');
  });

  it('acepta producción con las variables obligatorias', () => {
    const resultado = validarEntorno({
      NODE_ENV: 'production',
      DB_NOMBRE: 'gimnasio',
      DB_USUARIO: 'app',
      DB_CONTRASENA: 'clave',
      JWT_SECRET: 'secreto',
    });

    expect(resultado).toEqual({ modo: 'produccion', faltantes: [] });
  });
});
