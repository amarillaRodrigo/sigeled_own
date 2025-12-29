import db from "./db.js";

export async function findAllPerfilTarifas() {
    const { rows } = await db.query(
        `SELECT pt.id_tarifa,
                pt.id_perfil,
                p.codigo AS perfil_codigo,
                p.nombre AS perfil_nombre,
                pt.codigo_cargo,
                pt.descripcion,
                pt.aplica_materias,
                pt.monto_hora,
                pt.activo
        FROM perfil_tarifa pt
        JOIN perfiles p ON p.id_perfil = pt.id_perfil
        ORDER BY p.codigo, pt.id_tarifa`
    );
    return rows;
}

export async function updatePerfilTarifa(id_tarifa, { monto_hora }) {
    const { rows } = await db.query(
        `UPDATE perfil_tarifa
            SET monto_hora = $1
            WHERE id_tarifa = $2
         RETURNING *`,
        [monto_hora, id_tarifa]
    );
    return rows[0];
}