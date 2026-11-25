const VARIABLES_OBLIGATORIAS = [
  'DB_NOMBRE',
  'DB_USUARIO',
  'DB_CONTRASENA',
  'JWT_SECRET',
];

export function validarEntorno(entorno = process.env, advertir = console.warn) {
  const faltantes = VARIABLES_OBLIGATORIAS.filter(
    (nombre) => !entorno[nombre]?.trim()
  );
  const produccion = entorno.NODE_ENV === 'production';

  if (produccion && faltantes.length > 0) {
    throw new Error(
      `Configuración de producción incompleta. Faltan estas variables: ${faltantes.join(', ')}.`
    );
  }

  if (!produccion && faltantes.length > 0) {
    advertir(
      `Configuración de desarrollo: se usarán valores predeterminados donde falte: ${faltantes.join(', ')}.`
    );
  }

  return {
    modo: produccion ? 'produccion' : 'desarrollo',
    faltantes,
  };
}
