import bcrypt from 'bcrypt';
import { getAllUsers, getUserById, findUserByEmail, createUser } from '../models/userModel.js';
import { getRolesByUserId } from '../models/roleModel.js';
import db from '../models/db.js';
import { getPersonaById } from '../models/personaModel.js';
import { notifyUser, notifyAdminsRRHH } from '../utils/notify.js';
import { sendAccountStatusEmail } from '../utils/email.js';

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Obtener usuario por ID
export const getUser = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const user = await getUserById(id_usuario);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

export const getUserByIdController = async (req,res) => {
    try {
        const { id_usuario } = req.params;
        const user = await getUserById(id_usuario);

        if(!user)
            return res.status(404).json({message:"Usuario no encontrado"})

        if (!user.id_persona){
            return res.status(400).json({message:"El usuario no tiene persona asociada"});
        }

        const persona = await getPersonaById(user.id_persona);

        const identificaciones = await db.query(
            "SELECT * FROM personas_identificacion WHERE id_persona = $1",
            [user.id_persona]
        ).then(r => r.rows);

        const roles = await db.query(
            `SELECT r. * FROM roles r INNER JOIN usuarios_roles ur ON r.id_rol = ur.id_rol WHERE ur.id_usuario = $1`,
            [id_usuario]
        ).then(r => r.rows);

        const perfiles = await db.query(
            `SELECT p.* FROM perfiles p INNER JOIN personas_perfiles pp ON p.id_perfil = pp.id_perfil WHERE pp.id_persona = $1`,
            [user.id_persona]
        ).then(r => r.rows);

        res.json({
            ...user,
            persona,
            identificaciones,
            roles,
            perfiles
        });
    } catch (error) {
        console.error("Error al obtener datos del usuario", error);
        res.status(500).json({message:"Error interno del servidor", error: error.message});
    }
};

// Crear nuevo usuario
export const createUserController = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await createUser({ email, password_hash });
        res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

export const toggleUser = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const resultUser = await db.query(
            'SELECT activo FROM usuarios WHERE id_usuario = $1',
            [id_usuario]
        );

        if (resultUser.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const nuevoEstado = !resultUser.rows[0].activo;

        const resultaUpdate = await db.query(
            'UPDATE usuarios SET activo = $1 WHERE id_usuario = $2 RETURNING id_usuario, email, activo',
            [nuevoEstado, id_usuario]
        );

        const respUser = resultaUpdate.rows[0];

        let usuarioCompleto = null;
        try {
        usuarioCompleto = await getUserById(id_usuario); 
        } catch (e) {
        console.warn('toggleUser: no se pudo obtener usuario completo para el email:', e.message);
        }

        const nombreParaMail =
        usuarioCompleto?.nombre
            ? `${usuarioCompleto.nombre} ${usuarioCompleto.apellido || ''}`.trim()
            : 'Usuario';
        res.json({
        user: respUser,
        });

        try {
        await notifyUser(id_usuario, {
            tipo: nuevoEstado ? 'CUENTA_HABILITADA' : 'CUENTA_DESHABILITADA',
            mensaje: nuevoEstado
            ? 'Tu cuenta fue habilitada con éxito'
            : 'Tu cuenta fue deshabilitada',
            link: nuevoEstado ? '/login' : null,
            nivel: nuevoEstado ? 'success' : 'warning',
        });

        await notifyAdminsRRHH({
            tipo: 'USUARIO_TOGGLE',
            mensaje: `${respUser.email} fue ${nuevoEstado ? 'activado' : 'desactivado'}`,
            link: `/dashboard/usuarios/${id_usuario}`,
            meta: { id_usuario, activo: nuevoEstado },
        });

        if (respUser.email) {
            await sendAccountStatusEmail({
            to: respUser.email,
            nombre: nombreParaMail,
            estadoActivo: nuevoEstado,
            });
        } else {
            console.warn(`toggleUser: usuario ${id_usuario} no tiene email, no se envía correo.`);
        }
        } catch (error) {
            console.warn('toggleUser notify/email error:', error.message);
        }
    } catch (error) {
        console.error('Error al cambiar el estado del usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


// Obtener roles de un usuario
export const getUserRoles = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const roles = await getRolesByUserId(id_usuario);
        res.json(roles);
    } catch (error) {
        console.error('Error al obtener roles del usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};