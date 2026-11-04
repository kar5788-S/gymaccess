import { Router } from 'express';
import { obtenerAlertasVencimiento } from '../controllers/alerta.controller.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);
router.get(
  '/expirations',
  autorizar(...rolesPermitidos('GET /api/alerts/expirations')),
  obtenerAlertasVencimiento
);

export default router;
