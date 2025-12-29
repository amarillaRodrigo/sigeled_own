import db from './db.js';

export const createNotificacion = async ({
    id_usuario,
    tipo,
    mensaje,
    link,
    observacion,
    meta,
    nivel
    }) => {
    const q = `
        INSERT INTO notificaciones (id_usuario, tipo, mensaje, link, observacion, meta, nivel)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        RETURNING *;
    `;
    const params = [
        id_usuario,
        tipo || null,
        mensaje,
        link || null,
        observacion || null,
        meta ? JSON.stringify(meta) : '{}',
        nivel || 'info'
    ];
    const { rows } = await db.query(q, params);
    return rows[0];
};

export const getNotificacionesByUsuario = async (id_usuario) => {
    const q = `
        SELECT id_notificacion, id_usuario, tipo, mensaje, link, observacion, meta, nivel, fecha_creacion, leido
        FROM notificaciones
        WHERE id_usuario = $1
        ORDER BY fecha_creacion DESC
        LIMIT 50;
    `;
    const { rows } = await db.query(q, [id_usuario]);
    return rows;
};

export const markAsRead = async (id_notificacion, id_usuario) => {
    const q = `
        UPDATE notificaciones
        SET leido = true
        WHERE id_notificacion = $1 AND id_usuario = $2
        RETURNING *;
    `;
    const { rows } = await db.query(q, [id_notificacion, id_usuario]);
    return rows[0];
};

export const getAdminAndRRHHIds = async () => {
    const q = `
        SELECT DISTINCT ur.id_usuario
        FROM usuarios_roles ur
        JOIN roles r ON ur.id_rol = r.id_rol
        WHERE r.codigo IN ('ADMIN','RRHH');
    `;
    const { rows } = await db.query(q);
    return rows.map(r => r.id_usuario);
};

export const markAllAsReadByUser = async (id_usuario) => {
    const q = ` UPDATE notificaciones
                SET leido = true
                WHERE id_usuario = $1
                    AND leido = false
                RETURNING *;
    `;
    const { rows } = await db.query(q, [id_usuario]);
    return rows;
}

export const deleteNotificacion = async (id_notificacion, id_usuario) => {
    const q = `
        DELETE FROM notificaciones
        WHERE id_notificacion = $1 AND id_usuario = $2
        RETURNING *;
    `;
    const { rows } = await db.query(q, [id_notificacion, id_usuario]);
    return rows[0];
};