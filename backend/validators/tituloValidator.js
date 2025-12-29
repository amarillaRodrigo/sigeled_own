import { body } from 'express-validator';

export const tituloValidator = [
    body('nombre_titulo')
        .isString().withMessage('El nombre del título debe ser texto')
        .notEmpty().withMessage('El nombre del título es obligatorio'),
    body('institucion')
        .isString().withMessage('La institución debe ser texto')
        .notEmpty().withMessage('La institución es obligatoria'),
    body('fecha_emision')
        .isISO8601().withMessage('La fecha de emisión debe ser válida'),
    body('id_tipo_titulo')
        .isInt().withMessage('El tipo de título debe ser un ID válido'),
    body('matricula_prof')
        .optional().isString().isLength({ max: 50 }).withMessage('La matrícula debe ser texto corto'),
    body('id_archivo')
        .optional().isInt().withMessage('El archivo debe ser un ID válido'),
    body('id_estado')
        .optional().isInt().withMessage('El estado debe ser un número'),
];
