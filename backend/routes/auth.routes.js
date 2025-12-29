import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models/db.js';
import { getRolesByUserId } from '../models/roleModel.js';
import { notifyAdminsRRHH } from '../utils/notify.js';
import express from 'express';
import { changePassword, login, register } from '../controllers/auth.Controller.js';
import { validarRegistro, validarLogin, registerFullValidators, handleValidation } from '../validators/authValidator.js';
import { verificarToken, requireActivo } from '../middleware/authMiddleware.js';

const authRouter = express.Router();

export const registerFull = async (req, res) => {
    const { email, password, nombre, apellido, fecha_nacimiento, sexo, telefono, dni, cuil } = req.body;
    const cleanEmail = String(email).trim().toLowerCase();

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const selUser = await client.query(
        'SELECT id_usuario, id_persona, activo FROM usuarios WHERE email = $1 LIMIT 1',
        [cleanEmail]
        );

        let id_usuario;
        if (selUser.rowCount) {
        const u = selUser.rows[0];
        if (u.id_persona) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'El email ya está registrado' });
        }
        id_usuario = u.id_usuario;
        const hash = await bcrypt.hash(password, 10);
        await client.query('UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2', [hash, id_usuario]);
        } else {
        const hash = await bcrypt.hash(password, 10);
        const insUser = await client.query(
            `INSERT INTO usuarios(email, password_hash, activo)
            VALUES ($1, $2, false) RETURNING id_usuario`,
            [cleanEmail, hash]
        );
        id_usuario = insUser.rows[0].id_usuario;
        }

        const insPersona = await client.query(
        `INSERT INTO personas (nombre, apellido, fecha_nacimiento, sexo, telefono)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING id_persona, nombre, apellido`,
        [nombre, apellido, fecha_nacimiento, sexo, telefono]
        );
        const id_persona = insPersona.rows[0].id_persona;

        await client.query(
        `INSERT INTO personas_identificacion (id_persona, dni, cuil)
        VALUES ($1,$2,$3)
        ON CONFLICT (id_persona)
        DO UPDATE SET dni = EXCLUDED.dni, cuil = EXCLUDED.cuil`,
        [id_persona, dni, cuil]
        );

        await client.query(
        'UPDATE usuarios SET id_persona = $1 WHERE id_usuario = $2',
        [id_persona, id_usuario]
        );

        await client.query('COMMIT');

        const roles = await getRolesByUserId(id_usuario);
        const roleNames = roles.map(r => r.codigo.toUpperCase());

        const payload = { id: id_usuario, id_usuario, id_persona, email: cleanEmail, roles: roleNames, perfiles: [], activo: false };
        const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

        try {
        await notifyAdminsRRHH({
            tipo: 'USUARIO_REGISTRADO',
            mensaje: `Nuevo usuario registrado: ${cleanEmail}. Requiere activación`,
            link: `/dashboard/usuarios/${id_usuario}`,
            meta: { id_usuario }
        });
        } catch (notifErr) {
        console.error('Error al notificar admins:', notifErr.message);
        }

        return res.status(201).json({
        token,
        user: { id: id_usuario, id_usuario, id_persona, email: cleanEmail, nombre, apellido, roles: roleNames, perfiles: [], activo: false }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registerFull:', error);
        if (error?.code === '23505') return res.status(400).json({ message: 'El email ya está registrado' });
        return res.status(500).json({ message: 'Error del servidor' });
    } finally {
        client.release();
    }
};



/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Credenciales incorrectas
 */
authRouter.post('/login', validarLogin, login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado
 *       400:
 *         description: Datos inválidos
 */
authRouter.post('/register', validarRegistro, register);

authRouter.post('/register-full', registerFullValidators, handleValidation, registerFull);

authRouter.post('/change-password', verificarToken, requireActivo, changePassword);

export default authRouter;