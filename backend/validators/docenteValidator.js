export const validarArchivoCV = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se subió ningún archivo.' });
    }
    // Solo permitir PDF
    if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'Solo se permite subir archivos PDF.' });
    }
    next();
}; 