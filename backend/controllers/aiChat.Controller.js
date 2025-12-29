import axios from 'axios';
import { 
    createChatSession,
    getChatSessionsByUser,
    getChatSessionByIdForUser,
    renameChatSession,
    touchChatSession,
    deleteChatSession,
    createChatMessage,
    getMessagesBySession,
} from '../models/aiChatModel.js';

const N8N_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL;

if (!N8N_WEBHOOK_URL){
    console.warn(
        "[AI-CHAT] Falta la variable N8N_CHAT_WEBHOOK_URL en el .env" 
    )
}

export async function listMyChatSessions(req, res) {
    try {
        const id_usuario = req.user?.id_usuario ?? req.user?.id;
        if (!id_usuario){
            return res.status(401).json({ message: "Usuario no identificado" });
        }

        const sesiones = await getChatSessionsByUser(id_usuario);
        return res.json(sesiones);
    } catch (error) {
        console.error("Error en listMyChatSessions:", error);
        return res.status(500).json({message: "Error al obtener sesions", detalle: error.message})
    }
}

export async function createMyChatSession(req, res) {
    try {
        const id_usuario = req.user?.id_usuario ?? req.user?.id;
        if (!id_usuario){
            return res.status(401).json({ message: "Usuario no identificado" });
        }

        const titulo = String(req.body?.titulo || "").trim() || "Nueva consulta";

        const session = await createChatSession({ id_usuario, titulo });
        return res.status(201).json(session);
    } catch (error) {
        console.error("Error en createMyChatSession:", error);
        return res.status(500).json({message: "Error al crear session", detalle: error.message})
    }
}

export async function renameMyChatSession(req, res) {
    try {
        const id_usuario = req.user?.id_usuario ?? req.user?.id;
        const { id_chat } = req.params;
        const titulo = String(req.body?.titulo || "").trim();

        if(!titulo) {
            return res.status(400).json({ message: "El título no puede estar vacío" });
        }

        const session = await renameChatSession({ id_chat, id_usuario, titulo });
        if (!session) {
            return res.status(404).json({ message: "Sesión no encontrada o no pertenece al usuario" });
        }

        return res.json(session);
    } catch (error) {
        console.error("Error en renameMyChatSession:", error);
        return res.status(500).json({message: "Error al renombrar session", detalle: error.message})
    }
}

export async function deleteMyChatSession(req, res) {
    try {
        const id_usuario = req.user?.id_usuario ?? req.user?.id;
        const { id_chat } = req.params;
        
        const deleted = await deleteChatSession({ id_chat, id_usuario });
        if (!deleted) {
            return res.status(404).json({ message: "Sesión no encontrada o no pertenece al usuario" });
        }

        return res.json({ ok: true });
    } catch (error) {
        console.error("Error en deleteMyChatSession:", error);
        return res.status(500).json({message: "Error al eliminar session", detalle: error.message})
    }
}

export async function sendChatMessage(req, res) {
    try {
        if (!N8N_WEBHOOK_URL) {
            return res.status(500).json({ message: "El servicio de chat no está disponible" });
        }

        const id_usuario = req.user?.id_usuario ?? req.user?.id;
        const { id_chat, message } = req.body;

        if (!id_usuario) {
            return res.status(401).json({ message: "Usuario no identificado" });
        }

        if (!id_chat || !message) {
            return res.status(400).json({
                message: "Faltan parámetros obligatorios (id_chat y message)",
            });
        }

        const session = await getChatSessionByIdForUser(id_chat, id_usuario);
        if (!session) {
            return res.status(404).json({
                message: "Sesión no encontrada o no pertenece al usuario",
            });
        }

        await touchChatSession(id_chat);

        await createChatMessage({
            id_chat,
            role: "user",
            content: message,
        });

        const n8nRes = await axios.post(N8N_WEBHOOK_URL, {
            message,
            session_id: id_chat,
            user_id: id_usuario,
        });

        const data = n8nRes.data || {};

        let reply =
            data.reply ||
            data.text ||
            data.answer ||
            data.result ||
            data.output ||
            (typeof data === "string" ? data : "");

        if (!reply) {
            reply =
                "Lo siento, no pude generar una respuesta para esta consulta.";
        }

        await createChatMessage({
            id_chat,
            role: "assistant",
            content: reply,
        });

        return res.json({ reply, raw: data });
    } catch (error) {
        console.error("Error en sendChatMessage:", error?.response?.data || error);
        const status = error?.response?.status || 500;
        const msg =
            error?.response?.data?.message ||
            error.message ||
            "Error al enviar el mensaje";
            return res.status(status).json({ message: msg });
    }
}

export async function listSessionMessages(req, res) {
    try {
        const id_usuario = req.user?.id_usuario ?? req.user?.id;
        const { id_chat } = req.params;

        if(!id_usuario) {
            return res.status(401).json({ message: "Usuario no identificado" });
        }

        const session = await getChatSessionByIdForUser(id_chat, id_usuario);
        if (!session) {
            return res.status(404).json({ message: "Sesión no encontrada o no pertenece al usuario" });
        }

        const messages = await getMessagesBySession(id_chat);
        return res.json(messages);
    } catch (error) {
        console.error("Error en listSessionMessages:", error);
        return res.status(500).json({message: "Error al obtener mensajes", detalle: error.message});
    }
}