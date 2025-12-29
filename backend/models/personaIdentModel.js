import db from './db.js';

// Obtener identificaciones por persona
export const getIdentificacionByPersona = async (id_persona) => {
    const res = await db.query('SELECT * FROM personas_identificacion WHERE id_persona = $1', [id_persona]);
    return res.rows;
};

// Crear identificación (DNI/CUIL)
export const createIdentificacion = async ({ id_persona, dni, cuil }) => {
    const now = new Date();
    const res = await db.query(
        `INSERT INTO personas_identificacion (
            id_persona, dni, cuil, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id_persona, dni, cuil, now, now]
    );
    return res.rows[0];
};
