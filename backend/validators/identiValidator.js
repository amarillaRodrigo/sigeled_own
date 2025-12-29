import { body } from 'express-validator';

export const identificacionValidator = [
  body('dni')
    .isNumeric().withMessage('El DNI debe ser numérico')
    .isLength({ min: 7, max: 8 }).withMessage('El DNI debe tener 7 u 8 dígitos'),
  body('cuil')
    .isNumeric().withMessage('El CUIL debe ser numérico')
    .isLength({ min: 11, max: 11 }).withMessage('El CUIL debe tener 11 dígitos'),
  body('id_estado')
    .optional().isInt().withMessage('El estado debe ser un número'),
  body('verificado_por')
    .optional().isInt().withMessage('El verificador debe ser un id de usuario'),
  body('verificado_en')
    .optional().isISO8601().withMessage('La fecha de verificación debe ser válida'),
  body('actualizado_en')
    .optional().isISO8601().withMessage('La fecha de actualización debe ser válida'),
  body('observacion')
    .optional().isString().isLength({ max: 255 }).withMessage('La observación debe ser texto corto'),
];
