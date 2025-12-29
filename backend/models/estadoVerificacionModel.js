import db from './db.js';

export const getEstadosVerificacion = async () => {
    const res = await db.query('SELECT id_estado, codigo, nombre FROM estado_verificacion ORDER BY id_estado');
    return res.rows;
};

export const getEstadoById = async(id) => {
    const res = await db.query('SELECT id_estado, codigo, nombre FROM estado_verificacion WHERE id_estado = $1', [id]);
    return res.rows[0];
}

export const getEstadoByCodigo = async (codigo) => {
    const res = await db.query('SELECT id_estado, codigo FROM estado_verificacion WHERE UPPER(codigo) = UPPER($1) LIMIT 1', [codigo]);
    return res.rows[0];
}

export const getIdEstadoPendiente = async () => {
    const row = await getEstadoByCodigo('PENDIENTE');
    return row?.id_estado ?? 1;
};
