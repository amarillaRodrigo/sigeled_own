import db from './db.js'

export async function createChatSession({ id_usuario, titulo }) {
    const { rows } = await db.query(
        `INSERT INTO ai_chat_sessions (id_usuario, titulo)
            VALUES ($1, $2)
         RETURNING *`,
        [id_usuario, titulo]
    );
    return rows[0];
}

export async function getChatSessionsByUser(id_usuario) {
    const { rows } = await db.query(
        `SELECT * FROM ai_chat_sessions
            WHERE id_usuario = $1
            ORDER BY actualizado_en DESC, creado_en DESC`,
        [id_usuario]
    );
    return rows;
}

export async function getChatSessionByIdForUser(id_chat, id_usuario) {
    const { rows } = await db.query(
        `SELECT * FROM ai_chat_sessions
            WHERE id_chat = $1 AND id_usuario = $2`,
        [id_chat, id_usuario]
    );
    return rows[0];
}

export async function renameChatSession({ id_chat, id_usuario, titulo }) {
    const { rows } = await db.query(
        `UPDATE ai_chat_sessions
            SET titulo = $3, actualizado_en = NOW()
            WHERE id_chat = $1 AND id_usuario = $2
         RETURNING *`,
        [id_chat, id_usuario, titulo]
    );
    return rows[0];
}

export async function touchChatSession(id_chat) {
    await db.query(
        `UPDATE ai_chat_sessions
            SET actualizado_en = NOW()
            WHERE id_chat = $1`,
        [id_chat]
    );
}

export async function deleteChatSession({ id_chat, id_usuario }) {
    const { rows } = await db.query(
        `DELETE FROM ai_chat_sessions
            WHERE id_chat = $1 AND id_usuario = $2
         RETURNING *`,
        [id_chat, id_usuario]
    );
    return rows[0];
}

export async function createChatMessage({ id_chat, role, content }){
    const { rows } = await db.query(
        `INSERT INTO ai_chat_messages (id_chat, role, content)
        VALUES( $1, $2, $3 )
        RETURNING *`,
        [id_chat, role, content]
    );
    return rows[0];
}

export async function getMessagesBySession(id_chat){
    const { rows } = await db.query(
        `SELECT id_message, id_chat, role, content, created_at
            FROM ai_chat_messages
            WHERE id_chat = $1
            ORDER BY created_at ASC, id_message ASC`,
        [id_chat]
    );
    return rows;
}