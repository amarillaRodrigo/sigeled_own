import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

export function autorizarEdicion(req, res, next) {
  const usuario = req.usuario;
  const id_persona = req.params.id_persona;
  if (usuario.rol === 'RRHH' || usuario.rol === 'ADMINISTRATIVO') {
    return next();
  }
  if (usuario.id_usuario && usuario.id_usuario.toString() === id_persona.toString()) {
    return next();
  }
  return res.status(403).json({ error: 'No tienes permisos para modificar este legajo.' });
}

export function autorizarVerificacion(req, res, next) {
  const usuario = req.usuario;
  if (usuario.rol === 'RRHH' || usuario.rol === 'ADMINISTRATIVO') {
    return next();
  }
  return res.status(403).json({ error: 'Solo RRHH o Administrativo pueden verificar datos.' });
}

export const manejarErroresValidacion = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    next();
};

