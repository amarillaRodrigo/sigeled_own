import { getRoleById } from '../models/roleModel.js';

export const validarCrearUsuario = async (req, res, next) => {
    const { nombre, email, contraseña, rol, dni, cuil, domicilio, titulo } = req.body;

    if (!nombre || !email || !contraseña || !rol) {
        return res.status(400).json({ 
            message: 'Campos requeridos: nombre, email, contraseña, rol' 
        });
    }

    if (nombre.trim().length < 2) {
        return res.status(400).json({ 
            message: 'El nombre debe tener al menos 2 caracteres' 
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            message: 'El formato del email no es válido' 
        });
    }

    if (contraseña.length < 8) {
        return res.status(400).json({ 
            message: 'La contraseña debe tener al menos 8 caracteres' 
        });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;
    if (!passwordRegex.test(contraseña)) {
        return res.status(400).json({ 
            message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un símbolo' 
        });
    }

    if (dni && !/^\d{7,8}$/.test(dni)) {
        return res.status(400).json({ 
            message: 'El DNI debe tener 7 u 8 dígitos' 
        });
    }

    if (cuil && !/^\d{2}-\d{8}-\d{1}$/.test(cuil)) {
        return res.status(400).json({ 
            message: 'El CUIL debe tener el formato XX-XXXXXXXX-X' 
        });
    }

    if (isNaN(rol) || rol <= 0) {
        return res.status(400).json({ 
            message: 'El rol debe ser un ID válido' 
        });
    }

    const role = await getRoleById(rol);
    if (!role) {
        return res.status(400).json({ 
            message: 'El rol proporcionado no existe' 
        });
    }

    next();
};

export const validarActualizarUsuario = (req, res, next) => {
    const { nombre, email, dni, cuil, domicilio, titulo } = req.body;

    if (!nombre && !email && !dni && !cuil && !domicilio && !titulo) {
        return res.status(400).json({ 
            message: 'Al menos un campo debe ser proporcionado para actualizar' 
        });
    }

    if (nombre && nombre.trim().length < 2) {
        return res.status(400).json({ 
            message: 'El nombre debe tener al menos 2 caracteres' 
        });
    }

    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'El formato del email no es válido' 
            });
        }
    }

    if (dni && !/^\d{7,8}$/.test(dni)) {
        return res.status(400).json({ 
            message: 'El DNI debe tener 7 u 8 dígitos' 
        });
    }

    if (cuil && !/^\d{2}-\d{8}-\d{1}$/.test(cuil)) {
        return res.status(400).json({ 
            message: 'El CUIL debe tener el formato XX-XXXXXXXX-X' 
        });
    }

    next();
};

export const validarAsignarRol = async (req, res, next) => {
    const { roleId } = req.body;

    if (!roleId) {
        return res.status(400).json({ 
            message: 'El ID del rol es requerido' 
        });
    }

    if (isNaN(roleId) || roleId <= 0) {
        return res.status(400).json({ 
            message: 'El ID del rol debe ser un número válido' 
        });
    }

    const role = await getRoleById(roleId);
    if (!role) {
        return res.status(400).json({ 
            message: 'El rol proporcionado no existe' 
        });
    }

    next();
};

export const validarCambiarContraseña = (req, res, next) => {
    const { contraseñaActual, nuevaContraseña } = req.body;

    if (!contraseñaActual || !nuevaContraseña) {
        return res.status(400).json({ 
            message: 'Contraseña actual y nueva contraseña son requeridas' 
        });
    }

    if (nuevaContraseña.length < 8) {
        return res.status(400).json({ 
            message: 'La nueva contraseña debe tener al menos 8 caracteres' 
        });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(nuevaContraseña)) {
        return res.status(400).json({ 
            message: 'La nueva contraseña debe contener al menos una letra mayúscula, una minúscula y un número' 
        });
    }

    next();
}; 