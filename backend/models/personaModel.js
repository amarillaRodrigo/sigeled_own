import db from './db.js';

export const getAllPersonas = async () => {
    const res = await db.query('SELECT * FROM personas');
    return res.rows;
};

export const buscarPersonasPorNombrePerfil = async (nombre_perfil) => {
    const query = `
        SELECT p.*
        FROM personas p
        JOIN personas_perfiles pp ON p.id_persona = pp.id_persona
        JOIN perfiles pf ON pp.id_perfil = pf.id_perfil
        WHERE LOWER(pf.nombre) = LOWER($1)
        AND pp.vigente = true
    `;
    const res = await db.query(query, [nombre_perfil]);
    return res.rows;
};

export const buscarPersonasPorNombresPerfiles = async (nombres_perfiles) => {
    const placeholders = nombres_perfiles.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
        SELECT DISTINCT p.*
        FROM personas p
        JOIN personas_perfiles pp ON p.id_persona = pp.id_persona
        JOIN perfiles pf ON pp.id_perfil = pf.id_perfil
        WHERE LOWER(pf.nombre) IN (${placeholders})
        AND pp.vigente = true
    `;
    const res = await db.query(query, nombres_perfiles.map(n => n.toLowerCase()));
    return res.rows;
};

export const buscarPersonaPorDNI = async (dni) => {
    const query = `
        SELECT p.*
        FROM personas p
        JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
        WHERE pi.dni = $1
    `;
    const res = await db.query(query, [dni]);
    return res.rows;
};

export const getPersonasFiltros = async (filtros) => {
    let query = `SELECT
                p.id_persona, p.nombre, p.apellido, p.fecha_nacimiento, p.sexo, p.telefono,
                u.id_usuario, u.email, u.activo,
                pi.dni,
                (
                    SELECT json_agg(r)
                    FROM (
                        SELECT r.nombre FROM usuarios_roles ur
                        JOIN roles r ON ur.id_rol = r.id_rol
                        WHERE ur.id_usuario = u.id_usuario
                    ) as r
                ) as rolesAsignados,
                (
                    SELECT json_agg(pf)
                    FROM(
                        SELECT pf.nombre FROM personas_perfiles pp
                        JOIN perfiles pf ON pp.id_perfil = pf.id_perfil
                        WHERE pp.id_persona = p.id_persona AND pp.vigente = true
                    ) as pf
                ) as perfilesAsignados
            FROM personas p
            LEFT JOIN usuarios u ON p.id_persona = u.id_persona
            LEFT JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
            LEFT JOIN personas_perfiles pp_filter ON p.id_persona = pp_filter.id_persona AND pp_filter.vigente = true
            LEFT JOIN perfiles pf_filter ON pp_filter.id_perfil = pf_filter.id_perfil
            WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if(filtros.search) {
        query += ` AND (
            p.nombre ILIKE $${idx} OR
            p.apellido ILIKE $${idx} OR
            pi.dni ILIKE $${idx} OR
            u.email ILIKE $${idx}
        )`;
        params.push(`%${filtros.search}%`);
        idx++;
    }

    if(filtros.perfil){
        query += ` AND pf_filter.nombre = $${idx}`;
        params.push(filtros.perfil);
        idx++;
    }

    query += ` GROUP BY
                    p.id_persona, p.nombre, p.apellido, p.fecha_nacimiento, p.sexo, p.telefono,
                    u.id_usuario, u.email, u.activo,
                    pi.dni`;

    try {
        const res = await db.query(query, params);
        return res.rows;
    } catch (sqlError) {
        console.error("Error en getPersonasFiltros:", sqlError);
        throw sqlError;
    }
}


// Obtener persona por ID
export const getPersonaById = async (id_persona) => {
    const res = await db.query('SELECT * FROM personas WHERE id_persona = $1', [id_persona]);
    return res.rows[0];
};

// Crear persona
export const createPersona = async ({ nombre, apellido, fecha_nacimiento, sexo, telefono }) => {
    const res = await db.query(
        `INSERT INTO personas (nombre, apellido, fecha_nacimiento, sexo, telefono)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [nombre, apellido, fecha_nacimiento, sexo, telefono]
    );
    return res.rows[0];
};

// Asignar un perfil a una persona
export const asignarPerfilPersona = async (id_persona, id_perfil, usuario_editor) => {
    const up = await db.query(
        `UPDATE personas_perfiles 
        SET vigente = true, 
            asignado_por_usuario = $3,
            asignado_en = NOW(),
            actualizado_por_usuario = $3,
            actualizado_en = NOW()
        WHERE id_persona = $1 
            AND id_perfil = $2 
        RETURNING *`,
        [id_persona, id_perfil, usuario_editor]
    );

    if(up.rowCount > 0) return up.rows[0];

    const ins = await db.query(
        `INSERT INTO personas_perfiles
            (id_persona, id_perfil, vigente, asignado_por_usuario, asignado_en)
        VALUES ($1, $2, true, $3, NOW())
        RETURNING *`,
        [id_persona, id_perfil, usuario_editor]
    );

    return ins.rows[0];
};

export const obtenerPerfiles = async() => {
    const res = await db.query('SELECT * FROM perfiles');
    return res.rows;
}

export const desasignarPerfilPersona = async (id_persona, id_perfil, _usuario_editor) => {
    const res = await db.query(
        `DELETE FROM personas_perfiles
            WHERE id_persona = $1
            AND id_perfil = $2
         RETURNING *`,
        [id_persona, id_perfil]
    );
    return res.rowCount ? res.rows[0] : null;
};

export const getPerfilesDePersona = async (id_persona) => {
    const res = await db.query(
        `SELECT pf.*
        FROM perfiles pf
        JOIN personas_perfiles pp ON pf.id_perfil = pp.id_perfil
        WHERE pp.id_persona = $1 AND pp.vigente = true`,
        [id_persona]
    );
    return res.rows;
};

export const updatePersonaBasica = async (id_persona, campos) => {
    const permitidos = ["nombre", "apellido", "fecha_nacimiento", "sexo", "telefono"];
    const keys = permitidos.filter((k) => campos[k] !== undefined);

    if (keys.length === 0) {
        const res = await db.query("SELECT * FROM personas WHERE id_persona = $1", [id_persona]);
        return res.rows[0] || null;
    }

    const sets = keys.map((k, idx) => `${k} = $${idx + 1}`);
    const values = keys.map((k) => campos[k]);
    values.push(id_persona);

    const query = `
        UPDATE personas
        SET ${sets.join(", ")}
        WHERE id_persona = $${keys.length + 1}
        RETURNING *
    `;

    const res = await db.query(query, values);
    return res.rows[0] || null;
};
