import { createIdentificacion, updateEstadoIdentificacion, getIdentificacionByPersona } from '../models/personaIdentModel.js';
import { createArchivo } from '../models/archivoModel.js';
import { notifyUser, notifyAdminsRRHH } from '../utils/notify.js';
import { getPersonaById } from '../models/personaModel.js';

export const subirIdentificacion = async (req, res) => {
    try {
        const { tipo_doc, numero } = req.body;
        const id_persona = req.user.id_persona || req.body.id_persona;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Debe adjuntar un archivo comprobatorio.' });
        }

        // Guardar el archivo en la base de datos
        const archivo = await createArchivo({
            nombre_original: file.originalname,
            content_type: file.mimetype,
            size_bytes: file.size,
            storage_key: file.filename,
            subido_por_usuario: req.user?.id_usuario ?? req.user?.id ?? null
        });

        const id_estado = 1;

        const identificacion = await createIdentificacion({
            id_persona,
            tipo_doc,
            numero,
            id_archivo: archivo.id_archivo,
            id_estado
        });

        res.status(201).json({ identificacion, archivo });
        try {
            const persona = await getPersonaById(id_persona);
            await notifyAdminsRRHH({
                tipo: 'DOC_SUBIDO',
                mensaje: `${persona?.nombre || ''} ${persona?.apellido || ''} subió identificación "${file.originalname}"`,
                link: `/dashboard/legajo?persona=${id_persona}`,
                meta: { id_archivo: archivo.id_archivo, id_persona }
            });
            const uid = req.user?.id_usuario ?? req.user?.id;
            if(uid) {
                await notifyUser(uid, {
                    tipo: 'ARCHIVO_RECIBIDO',
                    mensaje: `Recibimos tu identificación "${file.originalname}". Está en revisión`,
                    link: '/dashboard/legajo',
                    meta: { id_archivo: archivo.id_archivo }
                });
            }
        } catch (error) {
            console.warn('subirIdentificacion notify error:', error.message);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al subir identificación', detalle: error.message });
    }
};

// Actualizar estado de verificación de una identificación (solo RRHH/Admin)
export const actualizarEstadoIdentificacion = async (req, res) => {
    try {
        const { id_identificacion, estado_verificacion } = req.body;
        await updateEstadoIdentificacion(id_identificacion, estado_verificacion);
        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar estado de verificación', detalle: error.message });
    }
};

// Obtener identificaciones de una persona
export const obtenerIdentificacion = async (req, res) => {
    try {
        const { id_persona } = req.params;
        const identificaciones = await getIdentificacionByPersona(id_persona);
        res.json(identificaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener identificaciones', detalle: error.message });
    }
};