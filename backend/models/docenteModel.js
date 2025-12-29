import db from './db.js';

// Obtener todos los docentes
export const getAllDocentes = async () => {
    const res = await db.query(
        'SELECT * FROM personas WHERE id_tipo_empleado = $1',
        [1]
    );
    return res.rows;
};

// Obtener docente por ID de persona
export const getDocenteById = async (id_persona) => {
    const res = await db.query(
        'SELECT * FROM personas WHERE id_persona = $1 AND id_tipo_empleado = $2',
        [id_persona, 1]
    );
    return res.rows[0];
};

// Crear docente
export const createDocente = async (data) => {
    const { nombre, apellido, fecha_nacimiento, sexo } = data;
    const res = await db.query(
        `INSERT INTO personas (nombre, apellido, fecha_nacimiento, sexo, id_tipo_empleado)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [nombre, apellido, fecha_nacimiento, sexo, 1]
    );
    return res.rows[0];
};