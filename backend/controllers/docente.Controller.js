import multer from 'multer';
import path from 'path';
import { createArchivo } from '../models/archivoModel.js';
import { createPersonaDocumento } from '../models/personaDocModel.js';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage: storage });

export const uploadCV = async (req, res) => {
    try {
        const id_persona = req.user.id_persona;
        const file = req.file;

        const archivo = await createArchivo({
            nombre_original: file.originalname,
            content_type: file.mimetype,
            size_bytes: file.size,
            sha256_hex: '',
            storage_provider: 'local',
            storage_bucket: null,
            storage_key: file.filename,
            subido_por: id_persona
        });

        await createPersonaDocumento({
            id_persona,
            id_tipo_doc: 5,
            id_archivo: archivo.id_archivo,
            id_estado: 1,
            vigente: true
        });

        res.status(200).json({ message: 'CV subido correctamente', archivo });
    } catch (error) {
        res.status(500).json({ message: 'Error al subir el CV', error: error.message });
    }
};