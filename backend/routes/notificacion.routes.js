import express from "express";
import { verificarToken } from "../middleware/authMiddleware.js";
import { getMisNotificaciones, marcarComoLeido, testPush, marcarTodasComoLeidas, eliminarNotificacion } from "../controllers/notificacion.Controller.js";

const notificacionRouter = express.Router();
notificacionRouter.use(verificarToken);

notificacionRouter.post('/test', testPush);

notificacionRouter.get('/mis-notificaciones', getMisNotificaciones);

notificacionRouter.patch('/:id_notificacion/leido', marcarComoLeido);

notificacionRouter.post('/marcar-todas-leidas', marcarTodasComoLeidas);

notificacionRouter.delete('/:id_notificacion', eliminarNotificacion);

export default notificacionRouter;