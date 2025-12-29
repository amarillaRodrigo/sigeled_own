import multer from 'multer';

const tiposPermitidos = new Set([
        'application/pdf',
        'application/x-pdf', 
        'application/octet-stream',
        'image/jpeg', 
        'image/png'
    ]
);
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

export const archivoValidator = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO },
    fileFilter: (req, file, cb) => {
        const esPermitido =
            tiposPermitidos.has(file.mimetype) ||
            (file.mimetype === 'application/octet-stream' &&
                /\.(pdf|jpg|jpeg|png)$/i.test(file.originalName));
            if(esPermitido) cb(null, true);
            else cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG y PNG'), false);
    }
});
