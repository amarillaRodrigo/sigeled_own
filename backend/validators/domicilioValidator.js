import { body } from 'express-validator';

export const domicilioValidator = [
    body('calle')
        .exists({ checkFalsy: true }).withMessage('La calle es obligatoria')
        .isString().withMessage('La calle debe ser texto')
        .trim()
        .isLength({ max: 120 }).withMessage('calle demasiado larga'),

    body('altura')
        .exists({ checkFalsy: true }).withMessage('La altura es obligatoria')
        .trim()
        .isInt({ min: 1 }).withMessage('La altura debe ser un número positivo')
        .toInt(), 

    body('id_dom_barrio')
        .optional({ nullable: true })
        .trim()
        .isInt({ min: 1 }).withMessage('El barrio debe ser un ID válido')
        .toInt(), 
];
