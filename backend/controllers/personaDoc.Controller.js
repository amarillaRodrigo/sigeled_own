import {
    getPersonasDocumentos,
    getPersonaDocumentoById,
    createPersonaDocumento,
    updateEstadoDocumento,
    getAllTiposDocumento,
    deletePersonaDocumento,
    countArchivoReferences
} from '../models/personaDocModel.js';
import { io } from '../app.js';
import { notifyUser, notifyAdminsRRHH } from '../utils/notify.js';
import { getUsuarioIdPorPersonaId } from '../models/userModel.js';
import { getEstadoById } from '../models/estadoVerificacionModel.js';
import { deleteArchivo, getArchivoById } from '../models/archivoModel.js';
import { getIdEstadoPendiente } from '../models/estadoVerificacionModel.js';

const ALLOWED_ROLES = ['ADMIN', 'RRHH', 'ADMINISTRATIVO'];

const isAdminOrRRHH = (req) => {
    const user = req.user;
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return roles.some(r => ALLOWED_ROLES.includes(String(r)));
};

export const listarPersonasDocumentos = async (req, res) => {
    try {
        const { id_persona } = req.query;
        if (typeof id_persona !== 'undefined' && String(id_persona).trim() === '') {
            return res.status(400).json({ message: 'id_persona vacío' });
        }
        const documentos = await getPersonasDocumentos({ id_persona });
        res.json(documentos);
    } catch (error) {
        console.error('Error en listarPersonasDocumentos:', error);
        res.status(500).json({ message: 'Error al obtener documentos de personas', detalle: error.message });
    }
};

export const obtenerPersonaDocumento = async (req, res) => {
    try {
        const { id_persona_doc } = req.params;
        const documento = await getPersonaDocumentoById(id_persona_doc);
        if (!documento) return res.status(404).json({ message: 'Documento no encontrado' });
        res.json(documento);
    } catch (error) {
        console.error('Error en obtenerPersonaDocumento:', error)
        res.status(500).json({ message: 'Error al obtener documento de persona' });
    }
};

export const verificarPersonaDocumento = async (req, res) => {
    try {
        const { id_persona_doc } = req.params;
        const { id_estado_verificacion, observacion } = req.body;

        const estado = await getEstadoById(Number(id_estado_verificacion));
        if(!estado) return res.status(400).json({message: 'Estado inválido'});

        const codigo = String(estado.codigo || '').toUpperCase();
        if((codigo === 'RECHAZADO' || codigo === 'OBSERVADO') && !observacion){
            return res.status(400).json({message: 'Debe indicar observación para estados Rechazado/Observado'});
        }

        const verificado_por_usuario = req.user?.id_usuario ?? req.user?.id ?? req.usuario?.id_usuario ?? req.usuario?.id ?? null;

        const actualizado = await updateEstadoDocumento({
            id_persona_doc,
            id_estado_verificacion: Number(id_estado_verificacion),
            observacion,
            verificado_por_usuario
        });

        const notifNivel =
            codigo === 'APROBADO' ? 'success'
            : (codigo === 'RECHAZADO' ? 'error'
            : (codigo === 'OBSERVADO' ? 'warning' : 'info'));

        try {
            const usuarioDestino = await getUsuarioIdPorPersonaId(actualizado.id_persona);
            if(usuarioDestino){
                const id_usuario_destino = usuarioDestino.id_usuario;
                await notifyUser(id_usuario_destino, {
                    tipo: 'DOC_ESTADO',
                    mensaje: `Tu documento "${actualizado.tipo_nombre}" ha sido ${actualizado.estado_nombre}`,
                    observacion: observacion || null,
                    link: '/dashboard/legajo',
                    meta: { id_persona_doc, estado: actualizado.estado_nombre },
                    nivel: notifNivel,
                });
            }

            await notifyAdminsRRHH({
                tipo: 'DOC_VERIFICADO',
                mensaje: `"${actualizado.tipo_nombre}" de ${actualizado.persona_nombre || actualizado.id_persona} marcado como ${actualizado.estado_nombre}`,
                link: `/dashboard/legajo?persona=${actualizado.id_persona}`,
                meta: { id_persona_doc, estado: actualizado.estado_nombre, verificado_por: verificado_por_usuario },
                nivel: notifNivel,
            });
            return res.json(actualizado);
        } catch (error) {
            console.warn('notify error:', error?.message);
        }
    } catch (error) {
        console.warn('verificarPersonaDocumento notify error:', error?.message);
        res.status(500).json({message:'Error al verificar documento', detalle: error.message});
    }
}


export const crearPersonaDocumento = async (req, res) => {
    try {
        const body = req.body || {};

        if (!body.id_persona) {
            return res.status(400).json({ message: 'id_persona es obligatorio' });
        }

        const data = { ...body };

        if (!isAdminOrRRHH(req)) {
            const idPendiente = await getIdEstadoPendiente();
            data.id_estado_verificacion = idPendiente;
            data.verificado_por_usuario = null;
            data.verificado_en = null;
        } else if (!data.id_estado_verificacion) {
            const idPendiente = await getIdEstadoPendiente();
            data.id_estado_verificacion = idPendiente;
        }

        const nuevoDocumento = await createPersonaDocumento(data);
        res.status(201).json(nuevoDocumento);
    } catch (error) {
        console.error('Error en crearPersonaDocumento:', error);
        res.status(500).json({
            message: 'Error al crear documento de persona',
            detalle: error.message,
        });
    }
};

export const deleteDocumento = async (req, res, next) => {
    try {
        console.log('[doc-delete] req.params:', req.params);
        const { id_persona, id_persona_doc } = req.params;
        
        if (!id_persona || !id_persona_doc) {
        return res.status(400).json({ success: false, message: 'id_persona e id_persona_doc requeridos' });
        }

        const doc = await getPersonaDocumentoById(id_persona_doc);
        if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

        if (String(doc.id_persona) !== String(id_persona)) {
        return res.status(400).json({ success: false, message: 'Documento no pertenece a la persona indicada' });
        }

        const archivo = doc.id_archivo ? await getArchivoById(doc.id_archivo) : null;

        const isUploader = archivo && req.user && String(req.user.id_usuario) === String(archivo.subido_por_usuario);
        if (!isAdminOrRRHH(req) && !isUploader) {
        return res.status(403).json({ success: false, message: 'No autorizado para eliminar este documento' });
        }

        const deletedDoc = await deletePersonaDocumento(id_persona_doc);

        try {
            const usuarioDestino = await getUsuarioIdPorPersonaId(doc.id_persona);
            if(usuarioDestino?.id_usuario){
                await notifyUser(usuarioDestino.id_usuario, {
                    tipo: 'DOC_ELIMINADO',
                    mensaje: `Se eliminó tu documento "${doc.tipo_nombre || 'Documento'}"`,
                    link: '/dashboard/legajo',
                    meta:{
                        id_persona_doc,
                        id_persona: doc.id_persona,
                        id_archivo:doc.id_archivo || null,
                        tipo: doc.tipo_nombre || doc.id_tipo_doc
                    },
                    nivel: 'warning'
                })
            }

            await notifyAdminsRRHH({
                tipo: 'DOC_ELIMINADO',
                mensaje: `${doc.persona_nombre || doc.id_persona}: documento eliminado (${doc.tipo_nombre || doc.id_tipo_doc})`,
                link: `/dashboard/legajo?persona=${doc.id_persona}`,
                meta: {
                    id_persona_doc,
                    id_persona: doc.id_persona,
                    id_archivo: doc.id_archivo || null,
                    tipo: doc.tipo_nombre || doc.id_tipo_doc,
                    eliminado_por: req.user?.id_usuario ?? req.user?.id ?? null
                },
                nivel: 'warning'
            });
        } catch (error) {
            console.warn('[doc-delete] notify error:', error.message);
        }

        if (archivo && archivo.id_archivo) {
        try {
            const refs = await countArchivoReferences(archivo.id_archivo);
            if (refs === 0) {
            await deleteArchivo(archivo.id_archivo);
            console.log('[doc-delete] archivo eliminado (sin referencias):', archivo.id_archivo);
            }
        } catch (e) {
            console.warn('[doc-delete] error al limpiar archivo:', e.message);
        }
        }

        return res.status(200).json({ success: true, data: deletedDoc });
    } catch (err) {
        console.error('[doc-delete] error:', err);
        return next(err);
    }
};

export const listarTiposDocumento = async(req, res) => {
    try {
        const tipos = await getAllTiposDocumento();
        res.json(tipos);
    } catch (error) {
        console.error('Error en listarTiposDocumento:', error);
        res.status(500).json({message: 'Error al obtener tipos de documento', detalle:error.message});
    }
}

export const solicitarEliminacionDocumento = async (req, res) => {
    try {
        const { id_persona_doc } = req.params;
        const doc = await getPersonaDocumentoById(id_persona_doc);
        if (!doc) return res.status(404).json({ message: 'Documento no encontrado' });

        await notifyAdminsRRHH({
            tipo: 'DOC_DELETE_SOLICITUD',
            mensaje: `${doc.persona_nombre || doc.id_persona} solicitó eliminar "${doc.tipo_nombre}"`,
            link: `/dashboard/legajo?persona=${doc.id_persona}`,
            meta: { id_persona_doc, motivo: req.body?.motivo || null },
            nivel: 'warning'
        });

        await notifyUser(req.user?.id_usuario ?? req.user?.id, {
            tipo: 'DOC_DELETE_SOLICITUD',
            mensaje: `Tu solicitud de eliminación de "${doc.tipo_nombre}" fue enviada`,
            link: '/dashboard/legajo',
            meta: { id_persona_doc }
        });

        res.json({ ok: true });
    } catch (error) {
        console.error('solicitarEliminacionDocumento:', error);
        res.status(500).json({ message: 'Error al solicitar eliminación:', detalle: error.message });
    }
}