import express from "express";
import { 
    listMyChatSessions,
    createMyChatSession,
    renameMyChatSession,
    deleteMyChatSession,
    sendChatMessage,
    listSessionMessages
} from "../controllers/aiChat.Controller.js";

import { verificarToken, soloRRHH } from "../middleware/authMiddleware.js";

const aiChatRouter = express.Router();

aiChatRouter.use(verificarToken, soloRRHH);

aiChatRouter.get("/sessions", listMyChatSessions);
aiChatRouter.post("/sessions", createMyChatSession);
aiChatRouter.get("/sessions/:id_chat/messages", listSessionMessages);
aiChatRouter.put("/sessions/:id_chat", renameMyChatSession);
aiChatRouter.delete("/sessions/:id_chat", deleteMyChatSession);
aiChatRouter.post("/message", sendChatMessage);

export default aiChatRouter;