import db from './db.js';

// Buscar usuario por email
export const findUserByEmail = async (email) => {
    const res = await db.query(
        `SELECT * FROM usuarios WHERE email = $1`,
        [email]
    );
    return res.rows[0];
};

// Crear usuario
export const createUser = async ({ email, password_hash }) => {
    const res = await db.query(
        `INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING *`,
        [email, password_hash]
    );
    return res.rows[0];
};

// Buscar usuario por id
export const getUserById = async (id_usuario) => {
    const query =
        `SELECT u.id_usuario, u.email, u.activo, p.id_persona, p.nombre, p.apellido 
        FROM usuarios u 
        LEFT JOIN personas p ON u.id_persona = p.id_persona WHERE u.id_usuario = $1`;
    const res = await db.query(query, [id_usuario]);
    return res.rows[0];
};

// Obtener todos los usuarios
export const getAllUsers = async () => {
    const res = await db.query(
        `SELECT * FROM usuarios`
    );
    return res.rows;
};

export const getUsuarioIdPorPersonaId = async (id_persona) => {
    const res = await db.query('SELECT id_usuario, email FROM usuarios WHERE id_persona = $1 LIMIT 1', [id_persona]);
    return res.rows[0];
}

export const getUserAuthById = async (id_usuario) => {
    const res = await db.query(
        'SELECT id_usuario, email, password_hash, activo FROM usuarios WHERE id_usuario = $1',
        [id_usuario]
    );
    return res.rows[0];
};

export const updateUserPassword = async (id_usuario, password_hash) => {
    await db.query(
        'UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2',
        [password_hash, id_usuario]
    );
};
