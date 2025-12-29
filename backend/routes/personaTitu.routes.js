import express from 'express';
import { verificarToken, soloRRHH } from '../middleware/authMiddleware.js';
import { crearTitulo, encontrarTituloPersona, listarTiposTitulo, verificarTitulo, eliminarTitulo, solicitarEliminacionTitulo } from "../controllers/personaTitu.Controller.js";

const personaTituRouter = express.Router();
personaTituRouter.use(verificarToken);

personaTituRouter.get('/persona/:id_persona', encontrarTituloPersona);

personaTituRouter.post('/:id_titulo/solicitar_eliminacion', verificarToken, solicitarEliminacionTitulo);

personaTituRouter.get('/tipos', listarTiposTitulo);

personaTituRouter.post('/', crearTitulo);

personaTituRouter.patch('/:id_titulo/estado', soloRRHH, verificarTitulo);

personaTituRouter.delete('/personas/:id_persona/titulos/:id_titulo', eliminarTitulo);

export default personaTituRouter;