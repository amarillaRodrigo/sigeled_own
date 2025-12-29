import express from 'express';
import { verificarToken, soloRRHH } from '../middleware/authMiddleware.js';
import { obtenerEstadoLegajo, recalcularEstadoLegajoCtrl, asignarPlazoGracia, asignarEstadoManual } from '../controllers/legajo.Controller.js';

const legajoRouter = express.Router();

legajoRouter.get('/:id_persona/estado', verificarToken, obtenerEstadoLegajo);

legajoRouter.post('/persona/:id_persona/recalcular', verificarToken, recalcularEstadoLegajoCtrl);

legajoRouter.post('/:id_persona/estado', verificarToken, soloRRHH, asignarEstadoManual);

legajoRouter.post('/:id_persona/plazo', verificarToken, soloRRHH, asignarPlazoGracia);

export default legajoRouter;