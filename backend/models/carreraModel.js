import db from './db.js';

export async function getCarreras() {
    const { rows } = await db.query(`SELECT id_carrera, carrera_descripcion FROM carrera ORDER BY carrera_descripcion ASC`);
    return rows;
}