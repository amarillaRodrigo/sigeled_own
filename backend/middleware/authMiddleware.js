import jwt from 'jsonwebtoken';
import { verificarTokenJWT } from '../utils/jwt.js';

// Middleware para verificar el token JWT
export const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }
    try {
        const decoded = verificarTokenJWT(token.replace('Bearer ', ''));
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// Middleware para permitir solo a usuarios con rol específico
export const permitirRoles = (...roles) => (req, res, next) => {
    if (req.user && req.user.roles && req.user.roles.some(rol => roles.includes(rol))) {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
    }
};

// Middleware para permitir solo a usuarios con rol "docente" (compatibilidad)
export const soloDocente = (req, res, next) => {
    if (req.user && req.user.rol === 'docente') {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso solo para docentes' });
    }
};

// Middleware para permitir solo a usuarios con rol "administrador"
export const soloAdministrador = (req, res, next) => {
    const rolesUsuario = req.user?.roles || [];

    if (rolesUsuario.includes('ADMIN')) {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso solo para administradores' });
    }
};

// Middleware para permitir solo a usuarios con rol "rrhh" o "administrador"
export const soloRRHH = (req, res, next) => {
    const rolesUsuario = req.user?.roles || [];

    if (rolesUsuario.includes('RRHH') || (rolesUsuario.includes('ADMIN'))) {
        return next();
    }

    return res.status(403).json({ message: 'Acceso denegado: solo RRHH o Administrador' });
};

export const requireActivo = (req, res, next) => {
    const activo = !!req.user?.activo;
    if(activo) return next();
    return res.status(403).json({ message: 'Cuenta en revisión' });
}