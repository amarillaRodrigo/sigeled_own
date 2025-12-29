import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken'

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRouter from './routes/auth.routes.js';
import docenteRouter from './routes/docente.routes.js';
import userRouter from './routes/user.routes.js';
import roleRouter from './routes/role.routes.js';
import contratoRouter from './routes/contrato.routes.js';
import personaDocRouter from './routes/personaDoc.routes.js'; 
import personaRouter from './routes/persona.routes.js';
import swaggerUI from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import archivosRouter from './routes/archivos.routes.js';
import personaTituRouter from './routes/personaTitu.routes.js';
import legajoRouter from './routes/legajo.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import notificacionRouter from './routes/notificacion.routes.js';
import aiChatRouter from './routes/aiChat.routes.js';
import reporteRouter from './routes/reporte.routes.js';
import './utils/contracts-expiration.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SIGELED API',
    version: '1.0.0',
    description: 'Documentación de la API para SIGELED',
  },
  servers: [
  {
    url: "https://sigeled.onrender.com",
    description: "Servidor de producción"
  }
],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const app = express();

import './utils/contracts-expiration.js'

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if(!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    socket.user = payload;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const idSala = socket.user.id_usuario.toString();
  socket.join(idSala);
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

  const roles = Array.isArray(socket.user.roles) ? socket.user.roles.map(r => String(r).toUpperCase()) : [];
  if (roles.includes('ADMIN') || roles.includes('RRHH')){
    socket.join('ADMIN_ROOM');
  }

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  })
})

export { io };

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/docente', docenteRouter);
app.use('/api/users', userRouter);
app.use('/api/roles', roleRouter);
app.use('/uploads', express.static('uploads'));
app.use('/api/contratos', contratoRouter);
app.use('/api/persona-doc', personaDocRouter); 
app.use('/api/archivos', archivosRouter); 
app.use('/api/persona', personaRouter);
app.use('/api/titulos', personaTituRouter);
app.use('/api/legajo', legajoRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notificaciones', notificacionRouter);
app.use('/api/ai-chat', aiChatRouter);
app.use('/api/reportes', reporteRouter);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Servidor (y Socket.IO) corriendo en el puerto ${PORT}`);
});