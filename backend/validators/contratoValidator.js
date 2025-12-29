import { body, validationResult } from "express-validator";

const isUUID = (s) =>
    typeof s === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        s
    );

export const createContratoValidators = [
    body('id_persona')
        .isUUID()
        .withMessage('id_persona UUID requerido'),

    body('id_profesor')
        .optional()
        .isUUID()
        .withMessage('id_profesor debe ser UUID'),

    body('id_periodo')
        .toInt()
        .isInt({ min: 1, max: 2 })
        .withMessage('id_periodo debe ser 1 o 2'),

    body('fecha_inicio')
        .isISO8601()
        .withMessage('fecha_inicio inválida'),

    body('fecha_fin')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('fecha_fin inválida'),

    body('items')
        .isArray({ min: 1 })
        .withMessage('items debe ser un arreglo con al menos un elemento'),

    body('items.*.id_materia')
        .isUUID()
        .withMessage('items[*].id_materia debe ser UUID'),

    body('items.*.cargo')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('items[*].cargo es requerido'),

    body('items.*.horas_semanales')
        .toInt()
        .isInt({ min: 1 })
        .withMessage('items[*].horas_semanales debe ser >= 1'),


    body().custom((value, { req }) => {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        if (!items.length) {
        throw new Error('Debe indicar al menos una materia en items');
        }
        return true;
    }),
    ];

export const createContratoGeneralValidators = [
    body('id_persona')
        .isUUID()
        .withMessage('id_persona UUID requerido'),

    body('id_periodo')
        .toInt()
        .isInt({ min: 1 })
        .withMessage('id_periodo debe ser entero >= 1'),

    body('fecha_inicio')
        .isISO8601()
        .withMessage('fecha_inicio inválida'),

    body('fecha_fin')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('fecha_fin inválida'),

    body('items')
        .isArray({ min: 1 })
        .withMessage('items debe ser un arreglo con al menos un elemento'),

    body('items.*.id_perfil')
        .toInt()
        .isInt({ min: 1 })
        .withMessage('items[*].id_perfil requerido'),

    body('items.*.tipo_item')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('items[*].tipo_item requerido'),

    body('items.*.horas_semanales')
        .toInt()
        .isInt({ min: 1 })
        .withMessage('items[*].horas_semanales debe ser >= 1'),

    body().custom((value, { req }) => {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        if (!items.length) {
        throw new Error('Debe indicar al menos un ítem en items');
        }
        items.forEach((it, idx) => {
        const tipo = String(it.tipo_item || '').toUpperCase();

        if (!it.codigo_cargo && !it.cargo) {
            throw new Error(`items[${idx}].codigo_cargo (o cargo) requerido`);
        }

        if (tipo === 'DOCENCIA') {
            if (!isUUID(it.id_materia || '')) {
            throw new Error(
                `items[${idx}].id_materia UUID requerido para tipo_item=DOCENCIA`
            );
            }
        } else {
            if (
            !it.descripcion_actividad ||
            typeof it.descripcion_actividad !== 'string'
            ) {
            throw new Error(
                `items[${idx}].descripcion_actividad requerido para tipo_item=${tipo}`
            );
            }
        }
        });
        return true;
    }),
];

    export const handleValidation = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
            .status(422)
            .json({ error: "Validación fallida", detalle: errors.array() });
        }
    next();
};
