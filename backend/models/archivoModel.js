import db from './db.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
)

// Obtener todos los archivos
export const getAllArchivos = async () => {
    const res = await db.query('SELECT * FROM archivos');
    return res.rows;
};

// Obtener archivo por ID
export const getArchivoById = async (id_archivo) => {
    const res = await db.query('SELECT * FROM archivos WHERE id_archivo = $1', [id_archivo]);
    return res.rows[0];
};

// Crear archivo
export const createArchivo = async (data) => {
    const {
        nombre_original, content_type, size_bytes, sha256_hex,
        storage_provider, storage_bucket, storage_key, subido_por_usuario
    } = data;
    const res = await db.query(
        `INSERT INTO archivos (
            nombre_original, content_type, size_bytes, sha256_hex,
            storage_provider, storage_bucket, storage_key, subido_por_usuario
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
            nombre_original, 
            content_type, 
            size_bytes, 
            sha256_hex,
            storage_provider, 
            storage_bucket, 
            storage_key, 
            subido_por_usuario
        ]
    );
    return res.rows[0];
};

export const deleteArchivo = async (id_archivo) => {
    const res = await db.query('SELECT * FROM archivos WHERE id_archivo = $1', [id_archivo]);
    const archivo = res.rows[0];
    if(!archivo) return null;

    try {
        if(archivo.storage_provider === 'supabase' && archivo.storage_bucket && archivo.storage_key) {
            const { error } = await supabase.storage
                .from(archivo.storage_bucket)
                .remove([archivo.storage_key]);

            if(error){
                console.warn(`[deleteArchivo] Error al eliminar de Supabase: ${error.message}`);
            } else {
                console.log(`[deleteArchivo] Archivo eliminado del bucket ${archivo.storage_bucket}: ${archivo.storage_key}`);
            }
        }
    } catch (error) {
        console.error('[deleteArchivo] Error inesperado al borrar del bucket:', error.message);
    }

    const q = `DELETE FROM archivos WHERE id_archivo = $1 RETURNING *`;
    const r = await db.query(q, [id_archivo]);
    return r.rows[0] || null;
};