import db from './db.js';

export async function profesorExiste(id_persona){
    const { rowCount } = await db.query(
        'SELECT 1 FROM profesor WHERE id_persona = $1 LIMIT 1',
        [id_persona]
    );
    return rowCount > 0;
}

export async function ensureProfesorRow(id_persona) { 
    await db.query(`
            INSERT INTO profesor (id_persona)
            VALUES ($1)
            ON CONFLICT (id_persona) DO NOTHING`, 
        [id_persona]);
}

export async function deactivateProfesorIfNoProfile(id_persona) {
    const { rows } = await db.query(
        `SELECT COUNT(*)::int AS c
        FROM personas_perfiles pp
        JOIN perfiles pf ON pf.id_perfil = pp.id_perfil
        WHERE pp.id_persona = $1
        AND pp.vigente = TRUE
        AND LOWER(pf.nombre) = 'profesor'`,
        [id_persona]
    );
    if ((rows[0]?.c ?? 0) === 0) {
        await db.query(`DELETE FROM profesor WHERE id_persona = $1`, [id_persona]);
    }
}