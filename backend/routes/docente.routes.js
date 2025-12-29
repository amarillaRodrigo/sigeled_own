import express from 'express';
import { upload, uploadCV } from '../controllers/docente.Controller.js';
import { verificarToken, soloDocente } from '../middleware/authMiddleware.js';
import { validarArchivoCV } from '../validators/docenteValidator.js';

const docenteRouter = express.Router();

/**
 * @swagger
 * /api/docente/upload-cv:
 *   post:
 *     summary: Subir CV del docente (solo docentes autenticados)
 *     tags:
 *       - Docente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: CV subido correctamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno
 */
docenteRouter.post('/upload-cv', verificarToken, soloDocente, upload.single('cv'), validarArchivoCV, uploadCV);

export default docenteRouter;