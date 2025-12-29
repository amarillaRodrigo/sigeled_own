import db from './db.js';

// Obtener todos los roles
export const getAllRoles = async () => {
    const res = await db.query('SELECT * FROM roles');
    return res.rows;
};

// Obtener rol por ID
export const getRoleById = async (id_rol) => {
    const res = await db.query('SELECT * FROM roles WHERE id_rol = $1', [id_rol]);
    return res.rows[0];
};

// Crear nuevo rol
export const createRole = async ({ codigo, nombre }) => {
    const res = await db.query(
        'INSERT INTO roles (codigo, nombre) VALUES ($1, $2) RETURNING *',
        [codigo, nombre]
    );
    return res.rows[0];
};

// Actualizar rol
export const updateRole = async (id_rol, { codigo, nombre }) => {
    const res = await db.query(
        'UPDATE roles SET codigo = $1, nombre = $2 WHERE id_rol = $3 RETURNING *',
        [codigo, nombre, id_rol]
    );
    return res.rows[0];
};

// Eliminar rol (solo si no hay usuarios asignados)
export const deleteRole = async (id_rol) => {
    // Verifica si hay usuarios asignados a este rol
    const usuarios = await db.query(
        'SELECT * FROM usuarios_roles WHERE id_rol = $1',
        [id_rol]
    );
    if (usuarios.rows.length > 0) {
        throw new Error('No se puede eliminar el rol porque hay usuarios asignados');
    }
    const res = await db.query(
        'DELETE FROM roles WHERE id_rol = $1 RETURNING *',
        [id_rol]
    );
    return res.rows[0];
};

// Obtener roles de un usuario
export const getRolesByUserId = async (id_usuario) => {
    const res = await db.query(
        `SELECT r.* FROM usuarios_roles ur
            JOIN roles r ON ur.id_rol = r.id_rol
            WHERE ur.id_usuario = $1`,
        [id_usuario]
    );
    return res.rows;
};

// Asignar un rol a un usuario
export const assignRoleToUser = async (id_usuario, id_rol, asignado_por) => {
    const res = await db.query(
        `INSERT INTO usuarios_roles (id_usuario, id_rol, asignado_por) VALUES ($1, $2, $3) RETURNING *`,
        [id_usuario, id_rol, asignado_por]
    );
    return res.rows[0];
};

export const unassignRoleFromUser = async (id_usuario, id_rol) => {
    const res = await db.query(
        'DELETE FROM usuarios_roles WHERE id_usuario = $1 AND id_rol = $2 RETURNING *',
        [id_usuario, id_rol]
    );
    return res.rows[0];
}