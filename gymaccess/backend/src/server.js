// Punto de entrada del backend (ES Modules, sin CommonJS).

import 'dotenv/config';
import app from './app.js';
import { registrar } from './services/auditoria.service.js';
import { validarEntorno } from './config/entorno.js';

const puerto = Number(process.env.PORT || 4000);

let configuracion;
try {
  configuracion = validarEntorno();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

if (configuracion) {
  app.listen(puerto, () => {
    console.log(`API escuchando en http://localhost:${puerto}`);
    registrar({
      usuarioId: null,
      accion: 'validacion_entorno',
      modulo: 'configuracion',
      resultado: 'exitoso',
      descripcion:
        `Configuración ${configuracion.modo} validada; ` +
        `${configuracion.faltantes.length} variable(s) sin definir.`,
    });
  });
}
