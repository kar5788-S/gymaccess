// T012 [US1] Rutas de reportes (contracts/api.md).
// - `GET /api/reports/financial`: exclusivo del administrador (clarify Q4,
//   HU1 esc. 3, FR-002); el permiso sale de la matriz de T004.
// - `GET /api/reports/accesses` se agrega en US3 (T030) sobre este mismo
//   router.
// - El rango de fechas NO se valida con express-validator: el servicio
//   (T006/T010) lanza `RANGO_FECHAS_INVALIDO` (400) con el mensaje fijo
//   del contrato, porque `validar` responde siempre `VALIDACION`.
// La validación de permisos ocurre ANTES que la de negocio: un rol sin
// permiso recibe 403 aunque envíe un rango inválido (HU1 esc. 3).

import { Router } from 'express';
import {
  obtenerReporteAccesos,
  obtenerReporteFinanciero,
} from '../controllers/reporte.controller.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/financial',
  autorizar(...rolesPermitidos('GET /api/reports/financial')),
  obtenerReporteFinanciero
);
router.get(
  '/accesses',
  autorizar(...rolesPermitidos('GET /api/reports/accesses')),
  obtenerReporteAccesos
);

export default router;
