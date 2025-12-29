import express from 'express';
import {
    listarPersonasDocumentos,
    obtenerPersonaDocumento,
    crearPersonaDocumento,
    listarTiposDocumento,
    verificarPersonaDocumento,
    deleteDocumento,
    solicitarEliminacionDocumento
} from '../controllers/personaDoc.Controller.js';
import { getUsuarioIdPorPersonaId } from '../models/userModel.js';
import { verificarToken } from '../middleware/authMiddleware.js';
import { getPersonasDocumentos } from '../models/personaDocModel.js';
import { soloRRHH } from '../middleware/authMiddleware.js';

const personaDocRouter = express.Router();
personaDocRouter.use(verificarToken);

personaDocRouter.get('/tipos-documento', listarTiposDocumento);

personaDocRouter.patch('/:id_persona_doc/estado', soloRRHH, verificarPersonaDocumento);

personaDocRouter.post('/:id_persona_doc/solicitar_eliminacion', solicitarEliminacionDocumento)

const esPropietarioOPrivilegiado = async (req,res,next) => {
    const idParam = req.params.id_persona || req.query.id_persona;
    const roles = (req.user?.roles || [])
        .map(r => (typeof r === 'string' ? r : r?.codigo || r?.nombre))
        .map(x => String(x).toUpperCase());
    if(roles.includes('RRHH') || roles.includes('ADMIN')) return next();
    if(!idParam) return res.status(400).json({ error: 'id_persona requerido' });

    if (req.user?.id_persona && String(req.user.id_persona) === String(idParam)) return next();

    if(req.user?.id_usuario){
        try {
            const row = await getUsuarioIdPorPersonaId(idParam);
            const esOwner = row?.id_usuario && String(row.id_usuario) === String(req.user.id_usuario);
            if(esOwner) return next();
        } catch (error) {
            console.warn('[EsPropietarioOPrivilegiado] fallback error:', error.message);
        }
    }
    return res.status(403).json({ error: 'Acceso denegado'});
};

personaDocRouter.get('/', soloRRHH, listarPersonasDocumentos);

personaDocRouter.get('/personas/:id_persona/documentos', esPropietarioOPrivilegiado, async (req,res) => {
    const docs = await getPersonasDocumentos({ id_persona: req.params.id_persona });
    res.json(docs);
});

/**
 * @swagger
 * /api/persona-doc/{id_persona_doc}:
 *   get:
 *     summary: Obtener documento de persona por ID
 *     tags:
 *       - PersonaDoc
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_persona_doc
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Documento encontrado
 *       404:
 *         description: Documento no encontrado
 */
personaDocRouter.get('/:id_persona_doc', obtenerPersonaDocumento);

/**
 * @swagger
 * /api/persona-doc:
 *   post:
 *     summary: Crear documento de persona
 *     tags:
 *       - PersonaDoc
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_persona:
 *                 type: integer
 *               tipo_documento:
 *                 type: string
 *               numero_documento:
 *                 type: string
 *     responses:
 *       201:
 *         description: Documento creado
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno
 */
personaDocRouter.post('/', crearPersonaDocumento);

/**
 * @swagger
 * /api/persona-doc/personas/{id_persona}/documentos/{id_persona_doc}:
 *   delete:
 *     summary: Eliminar documento personal
 *     tags:
 *       - PersonaDoc
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_persona
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la persona propietaria del documento
 *       - name: id_persona_doc
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del documento a eliminar
 *     responses:
 *       200:
 *         description: Documento eliminado correctamente
 *       400:
 *         description: Parámetros inválidos o documento no pertenece a la persona
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Documento no encontrado
 */
personaDocRouter.delete('/personas/:id_persona/documentos/:id_persona_doc', deleteDocumento);

export default personaDocRouter;