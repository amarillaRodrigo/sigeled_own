import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { getArchivoById } from '../models/archivoModel.js';
import { verificarToken } from '../middleware/authMiddleware.js';

const archivosRouter = express.Router();
archivosRouter.use(verificarToken);

archivosRouter.get('/:id_archivo/signed-url', async (req, res) => {
    try {
        const { id_archivo } = req.params;
        const archivo = await getArchivoById(id_archivo);
        if(!archivo) return res.status(404).json({message: 'Archivo no encontrado'});

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
        const { data, error } = await supabase
            .storage
            .from(archivo.storage_bucket)
            .createSignedUrl(archivo.storage_key, 60 * 10);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ message: 'No se pudo generar la URL', detalle: error.message });
        }

        return res.json({
            url: data.signedUrl,
            content_type: archivo.content_type,
            nombre_original: archivo.nombre_original,
        });
    } catch (e) {
        res.status(500).json({message:'No se pudo generar la URL', detalle: e.message});
    }
});

export default archivosRouter;