// Validaciones para gestión de roles

// Validar creación de rol
export const validarCrearRol = (req, res, next) => {
    const { nombre, descripcion, permisos } = req.body;

    // Validar campos requeridos
    if (!nombre) {
        return res.status(400).json({ 
            message: 'El nombre del rol es requerido' 
        });
    }

    // Validar nombre del rol
    if (nombre.trim().length < 2) {
        return res.status(400).json({ 
            message: 'El nombre del rol debe tener al menos 2 caracteres' 
        });
    }

    // Validar que el nombre no contenga caracteres especiales
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(nombre)) {
        return res.status(400).json({ 
            message: 'El nombre del rol solo puede contener letras y espacios' 
        });
    }

    // Validar descripción si se proporciona
    if (descripcion && descripcion.trim().length < 10) {
        return res.status(400).json({ 
            message: 'La descripción debe tener al menos 10 caracteres' 
        });
    }

    // Validar permisos si se proporcionan
    if (permisos && typeof permisos !== 'object') {
        return res.status(400).json({ 
            message: 'Los permisos deben ser un objeto válido' 
        });
    }

    next();
};

// Validar actualización de rol
export const validarActualizarRol = (req, res, next) => {
    const { nombre, descripcion, permisos } = req.body;

    // Al menos un campo debe estar presente
    if (!nombre && !descripcion && !permisos) {
        return res.status(400).json({ 
            message: 'Al menos un campo debe ser proporcionado para actualizar' 
        });
    }

    // Validar nombre si se proporciona
    if (nombre) {
        if (nombre.trim().length < 2) {
            return res.status(400).json({ 
                message: 'El nombre del rol debe tener al menos 2 caracteres' 
            });
        }

        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nombreRegex.test(nombre)) {
            return res.status(400).json({ 
                message: 'El nombre del rol solo puede contener letras y espacios' 
            });
        }
    }

    // Validar descripción si se proporciona
    if (descripcion && descripcion.trim().length < 10) {
        return res.status(400).json({ 
            message: 'La descripción debe tener al menos 10 caracteres' 
        });
    }

    // Validar permisos si se proporcionan
    if (permisos && typeof permisos !== 'object') {
        return res.status(400).json({ 
            message: 'Los permisos deben ser un objeto válido' 
        });
    }

    next();
}; 