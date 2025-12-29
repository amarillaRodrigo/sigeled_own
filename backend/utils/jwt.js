import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_ACCESS_SECRET || 'miRORO_FIRORO';

export const crearToken = (usuario) => {
    return jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        SECRET,
        { expiresIn: '1d' }
    );
};

export const verificarTokenJWT = (token) => {
    return jwt.verify(token, SECRET);
}; 