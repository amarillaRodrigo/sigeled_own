import { body } from 'express-validator';

export const validarDatosPersona = [
    body('nombre')
        .notEmpty().withMessage('El nombre es obligatorio'),
    body('apellido')
        .notEmpty().withMessage('El apellido es obligatorio'),
    body('fecha_nacimiento')
        .notEmpty().withMessage('La fecha de nacimiento es obligatoria')
        .isDate().withMessage('Debe ser una fecha válida'),
    body('sexo')
        .notEmpty().withMessage('El sexo es obligatorio'),
    body('telefono')
        .optional()
        .isString().withMessage('El teléfono debe ser un texto')
        .matches(/^\+?\d{7,15}$/).withMessage('El teléfono debe ser válido (solo números, puede incluir +, entre 7 y 15 dígitos)')
];