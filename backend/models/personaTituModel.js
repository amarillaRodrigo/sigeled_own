import db from './db.js';

export const getTitulosByPersona = async (id_persona) => {
    const res = await db.query(`
        SELECT 
            pt.id_titulo,
            pt.id_persona,
            pt.id_tipo_titulo,
            tt.nombre AS tipo_titulo,
            pt.nombre_titulo,
            pt.institucion,
            pt.fecha_emision,
            pt.matricula_prof,
            pt.id_archivo,
            a.nombre_original AS archivo_nombre,
            pt.id_estado_verificacion,
            ev.nombre AS estado_verificacion_nombre,
            ev.codigo AS estado_verificacion_codigo,
            pt.verificado_por_usuario,
            pt.verificado_en,
            concat_ws(', ', p.apellido, p.nombre) AS persona_nombre,
            pt.creado_en,
            ult.observacion AS observacion 
        FROM personas_titulos pt
        LEFT JOIN tipos_titulo       tt ON pt.id_tipo_titulo = tt.id_tipo_titulo
        LEFT JOIN archivos           a  ON pt.id_archivo = a.id_archivo
        LEFT JOIN estado_verificacion ev ON ev.id_estado = pt.id_estado_verificacion
        LEFT JOIN personas           p  ON p.id_persona = pt.id_persona
        LEFT JOIN LATERAL (
        SELECT v.observacion
        FROM verificacion_titulos v
        WHERE v.id_titulo = pt.id_titulo
        ORDER BY v.verificado_en DESC
        LIMIT 1
        ) AS ult ON TRUE
        WHERE pt.id_persona = $1
        ORDER BY pt.creado_en DESC;
    `, [id_persona]);

    return res.rows;
};

export const getTiposTitulo = async () => {
    const { rows } = await db.query(
        `SELECT id_tipo_titulo, codigo, nombre FROM tipos_titulo`
    );
    return rows;
}

export const createTitulo = async ({
    id_persona,
    id_tipo_titulo,
    nombre_titulo,
    institucion,
    fecha_emision,
    matricula_prof,
    id_archivo,
    id_estado_verificacion = 1,
    verificado_por_usuario = null,
    verificado_en = null,
    creado_en
    }) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const up = await client.query(
        `
        WITH upd AS (
            UPDATE personas_titulos pt
            SET
            id_tipo_titulo         = COALESCE($2, pt.id_tipo_titulo),
            id_archivo             = COALESCE($7, pt.id_archivo),
            id_estado_verificacion = $10,
            verificado_por_usuario = NULL,
            verificado_en          = NULL
            WHERE pt.id_persona = $1
            AND COALESCE(pt.institucion, '' ) = COALESCE($4, '' )
            AND pt.nombre_titulo              = $3
            AND COALESCE(pt.fecha_emision, DATE '1900-01-01')
                = COALESCE($5::date, DATE '1900-01-01')
            RETURNING pt.id_titulo
        )
        INSERT INTO personas_titulos (
            id_persona, id_tipo_titulo, nombre_titulo, institucion, fecha_emision, matricula_prof,
            id_archivo, verificado_por_usuario, verificado_en, id_estado_verificacion, creado_en
        )
        SELECT
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        WHERE NOT EXISTS (SELECT 1 FROM upd)
        RETURNING id_titulo
        `,
        [
            id_persona,               
            id_tipo_titulo,             
            nombre_titulo,              
            institucion ?? null,        
            fecha_emision ?? null,      
            matricula_prof ?? null,     
            id_archivo ?? null,         
            verificado_por_usuario,     
            verificado_en,              
            id_estado_verificacion,     
            creado_en || new Date()     
        ]
        );

        let id_titulo;
        if (up.rows.length) {
        id_titulo = up.rows[0].id_titulo;
        } else {
        const { rows } = await client.query(
            `
            SELECT id_titulo
            FROM personas_titulos
            WHERE id_persona = $1
            AND COALESCE(institucion, '' ) = COALESCE($2, '' )
            AND nombre_titulo = $3
            AND COALESCE(fecha_emision, DATE '1900-01-01')
                = COALESCE($4::date, DATE '1900-01-01')
            LIMIT 1
            `,
            [id_persona, institucion ?? null, nombre_titulo, fecha_emision ?? null]
        );
        id_titulo = rows[0].id_titulo;
        }

        const { rows: full } = await client.query(
        `
        SELECT 
            pt.id_titulo,
            pt.id_persona,
            pt.id_tipo_titulo,
            tt.nombre AS tipo_titulo,
            pt.nombre_titulo,
            pt.institucion,
            pt.fecha_emision,
            pt.matricula_prof,
            pt.id_archivo,
            a.nombre_original AS archivo_nombre,
            pt.id_estado_verificacion,
            ev.nombre AS estado_verificacion_nombre,
            ev.codigo AS estado_verificacion_codigo,
            pt.verificado_por_usuario,
            pt.verificado_en,
            concat_ws(', ', p.apellido, p.nombre) AS persona_nombre,
            pt.creado_en
        FROM personas_titulos pt
        LEFT JOIN tipos_titulo tt ON pt.id_tipo_titulo = tt.id_tipo_titulo
        LEFT JOIN archivos a      ON pt.id_archivo = a.id_archivo
        LEFT JOIN estado_verificacion ev ON ev.id_estado = pt.id_estado_verificacion
        LEFT JOIN personas p       ON p.id_persona = pt.id_persona
        WHERE pt.id_titulo = $1
        `,
        [id_titulo]
        );

        await client.query('COMMIT');
        return full[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};


export const insertVerificacionTitulo = async ({
    id_titulo,
    id_estado_verificacion,
    observacion,
    verificado_por_usuario
}) => {
    const res = await db.query(
        `
        INSERT INTO verificacion_titulos (
            id_titulo, id_estado_verificacion, observacion, verificado_por_usuario, verificado_en
        ) VALUES ($1, $2, $3, $4, now())
        `,
        [id_titulo, id_estado_verificacion, observacion || null, verificado_por_usuario || null]
    );
    return res.rows[0];
};

export const updateEstadoTitulo = async ({
    id_titulo,
    id_estado_verificacion,
    observacion,
    verificado_por_usuario
}) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE personas_titulos
            SET id_estado_verificacion = $1,
                verificado_por_usuario = $2,
                verificado_en = now()
            WHERE id_titulo = $3`,
            [id_estado_verificacion, verificado_por_usuario || null, id_titulo]
        );

        await client.query(
            `INSERT INTO verificacion_titulos (
                id_titulo, id_estado_verificacion, observacion, verificado_por_usuario, verificado_en
            ) VALUES ($1,$2,$3,$4, now())`,
            [id_titulo, id_estado_verificacion, observacion || null, verificado_por_usuario || null]
        );

        const final = await client.query(
        `
        SELECT 
            pt.id_titulo,
            pt.id_persona,
            pt.id_tipo_titulo,
            tt.nombre AS tipo_titulo,
            pt.nombre_titulo,
            pt.institucion,
            pt.fecha_emision,
            pt.matricula_prof,
            pt.id_archivo,
            a.nombre_original AS archivo_nombre,
            pt.id_estado_verificacion,
            ev.nombre AS estado_verificacion_nombre,
            ev.codigo AS estado_verificacion_codigo,
            pt.verificado_por_usuario,
            pt.verificado_en,
            concat_ws(', ', p.apellido, p.nombre) AS persona_nombre,
            pt.creado_en
        FROM personas_titulos pt
        LEFT JOIN tipos_titulo tt ON pt.id_tipo_titulo = tt.id_tipo_titulo
        LEFT JOIN archivos a      ON pt.id_archivo = a.id_archivo
        LEFT JOIN estado_verificacion ev ON ev.id_estado = pt.id_estado_verificacion
        LEFT JOIN personas p       ON p.id_persona = pt.id_persona
        WHERE pt.id_titulo = $1
        `,
        [id_titulo]
        );

        await client.query('COMMIT');
        return final.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const getTituloById = async (id_titulo) => {
    const { rows } = await db.query(
        `
        SELECT 
            pt.*,
            concat_ws(', ', p.apellido, p.nombre) AS persona_nombre
        FROM personas_titulos pt
        LEFT JOIN personas p ON p.id_persona = pt.id_persona
        WHERE pt.id_titulo = $1
        `,
        [id_titulo]
    );
    return rows[0] || null;
}

export const deleteTitulo = async (id_titulo) => {
    const q = `DELETE FROM personas_titulos WHERE id_titulo = $1 RETURNING *`;
    const r = await db.query(q, [id_titulo]);
    return r.rows[0] || null;
};

export const countArchivoReferencesInTitulos = async (id_archivo) => {
    const q = `SELECT COUNT(*)::int AS cnt FROM personas_titulos WHERE id_archivo = $1`;
    const r = await db.query(q, [id_archivo]);
    return r.rows[0]?.cnt ?? 0;
}