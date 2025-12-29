import db from './db.js';

export async function hasPersonaCore(id_persona){
    const q = `
        SELECT nombre, apellido, fecha_nacimiento, sexo, telefono
        FROM personas
        WHERE id_persona = $1
        LIMIT 1
    `;
    const { rows } = await db.query(q, [id_persona]);
    if(!rows.length) return false;
    const p = rows[0];

    return !!(p.nombre && p.apellido && p.fecha_nacimiento && p.sexo);
}


export async function hasIdentificacion(id_persona) {
    const q = `
        SELECT dni, cuil
        FROM personas_identificacion
        WHERE id_persona = $1
        LIMIT 1
    `;
    const { rows } = await db.query(q, [id_persona]);
    if(!rows.length) return false;
    const r = rows[0];
    return !!(r.dni && r.cuil);
}

export async function hasDocsRequeridos(
        id_persona,
        codigosOblig = ['DNI','CUIL','DOM']  
    ) {
        const q = `
            SELECT COUNT(DISTINCT t.codigo) AS cnt
            FROM personas_documentos pd
            JOIN tipos_documento t ON t.id_tipo_doc = pd.id_tipo_doc
            WHERE pd.id_persona = $1
            AND t.codigo = ANY($2)
        `;
        const { rows } = await db.query(q, [id_persona, codigosOblig]);
        const cnt = Number(rows?.[0]?.cnt || 0);
        return cnt === codigosOblig.length;
}

export async function hasDomicilioYBarrio(id_persona){
    const qDom = `SELECT 1 FROM persona_domicilio WHERE id_persona = $1 LIMIT 1`;
    const qBar = `SELECT 1 FROM persona_barrio     WHERE id_persona = $1 LIMIT 1`;

    const [a, b] = await Promise.all([
        db.query(qDom, [id_persona]),
        db.query(qBar, [id_persona]),
    ]);
    return a.rows.length > 0 && b.rows.length > 0;
}

export async function hasTitulos(id_persona) {
    const q = `SELECT 1 FROM personas_titulos WHERE id_persona = $1 LIMIT 1`;
    const { rows } = await db.query(q, [id_persona]);
    return rows.length > 0;
}

export async function getEstadoIdByCodigo(codigo) {
    const { rows } = await db.query(
        `SELECT id_estado FROM estados_legajo WHERE codigo = $1 LIMIT 1`,
        [codigo]
    );
    return rows[0]?.id_estado || null;
}


export async function setEstadoLegajo(id_persona, codigo, id_usuario, motivo = null) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
        `SELECT id_estado FROM estados_legajo WHERE codigo = $1 LIMIT 1`,
        [codigo]
        );
        if (!rows.length) throw new Error(`estados_legajo inexistente: ${codigo}`);
        const id_estado = rows[0].id_estado;

        await client.query(`
        INSERT INTO personas_legajo_estado (id_persona, id_estado_legajo, actualizado_en, actualizado_por_usuario)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (id_persona) DO UPDATE
            SET id_estado_legajo = EXCLUDED.id_estado_legajo,
                actualizado_en   = NOW(),
                actualizado_por_usuario = EXCLUDED.actualizado_por_usuario
        `, [id_persona, id_estado, id_usuario]);

        await client.query(`
        INSERT INTO personas_legajo_historial (id_persona, id_estado_legajo, motivo, cambiado_por_usuario, cambiado_en)
        VALUES ($1, $2, $3, $4, NOW())
        `, [id_persona, id_estado, motivo, id_usuario]);

        await client.query('COMMIT');
        return { ok: true, codigo };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getEstadoLegajoActual(id_persona){
    const q = `
        SELECT el.codigo, el.nombre, ple.actualizado_en
        FROM personas_legajo_estado ple
        JOIN estados_legajo el ON el.id_estado = ple.id_estado_legajo
        WHERE ple.id_persona = $1
        LIMIT 1
    `;
    const { rows } = await db.query(q, [id_persona]);
    return rows[0] || null;
}

export async function setPlazoGracia(id_persona, fecha_limite, motivo, id_usuario){
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(
        `UPDATE personas_legajo_plazo
        SET activo = FALSE
        WHERE id_persona = $1 AND activo = TRUE`,
        [id_persona]
        );

        await client.query(
        `INSERT INTO personas_legajo_plazo (id_persona, fecha_limite, motivo, creado_por_usuario, activo)
        VALUES ($1, $2, $3, $4, TRUE)`,
        [id_persona, fecha_limite, motivo || null, id_usuario]
        );

        await client.query('COMMIT');
        return { ok: true };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getPlazoGraciaActivo(id_persona){
    const q = `
        SELECT fecha_limite, motivo, creado_en
        FROM personas_legajo_plazo
        WHERE id_persona = $1 AND activo = TRUE
        ORDER BY creado_en DESC
        LIMIT 1
    `;
    const { rows } = await db.query(q, [id_persona]);
    return rows[0] || null;
}

export async function getLegajoChecklist(id_persona){
    const [p, i, d, dom, tit] = await Promise.all([
        hasPersonaCore(id_persona),
        hasIdentificacion(id_persona),
        hasDocsRequeridos(id_persona),
        hasDomicilioYBarrio(id_persona),
        hasTitulos(id_persona),
    ]);

    const faltan = [];
    if (!p)   faltan.push('Datos personales');
    if (!i)   faltan.push('DNI/CUIL');
    if (!d)   faltan.push('Documentos obligatorios');
    if (!dom) faltan.push('Domicilio y barrio');
    if (!tit) faltan.push('Títulos');

    return { okPersona: p, okIdent: i, okDocs: d, okDomicilio: dom, okTitulos: tit, faltan };
}

export async function recalcularEstadoLegajo(id_persona, id_usuario) {
    const { okPersona, okIdent, okDocs, okDomicilio, okTitulos } = await getLegajoChecklist(id_persona);

    let codigo = 'INCOMPLETO';

    if(okPersona && okIdent) {
        codigo = 'PENDIENTE';
    }

    if (okPersona && okIdent && okDocs && okDomicilio && okTitulos){
        codigo = 'REVISION';
    }

    await setEstadoLegajo(id_persona, codigo, id_usuario, 'Recalculo automático');
    return codigo;
}

export async function hasPersonaCoreTx(client, id_persona) {
    const { rows } = await client.query(
        `SELECT nombre, apellido, fecha_nacimiento, sexo, telefono
        FROM personas WHERE id_persona = $1 LIMIT 1`,
        [id_persona]
    );
    if(!rows.length) return false;
    const p = rows[0];

    return !!(p.nombre && p.apellido && p.fecha_nacimiento && p.sexo);
}


export async function hasIdentificacionTx(client, id_persona) {
    const { rows } = await client.query(
        `SELECT dni, cuil FROM personas_identificacion
        WHERE id_persona = $1 LIMIT 1`,
        [id_persona]
    );
    if(!rows.length) return false;
    const r = rows[0];
    return !!(r.dni && r.cuil);
}

export async function hasDocsRequeridosTx(
    client,
    id_persona,
    codigosOblig = ['DNI','CUIL','DOM']   
) {
    const { rows } = await client.query(
        `SELECT COUNT(DISTINCT t.codigo) AS cnt
        FROM personas_documentos pd
        JOIN tipos_documento t ON t.id_tipo_doc = pd.id_tipo_doc
        WHERE pd.id_persona = $1 AND t.codigo = ANY($2)`,
        [id_persona, codigosOblig]
    );
    const cnt = Number(rows?.[0]?.cnt || 0);
    return cnt === codigosOblig.length;
}

export async function hasDomicilioYBarrioTx(client, id_persona){
    const a = await client.query(`SELECT 1 FROM persona_domicilio WHERE id_persona = $1 LIMIT 1`, [id_persona]);
    const b = await client.query(`SELECT 1 FROM persona_barrio     WHERE id_persona = $1 LIMIT 1`, [id_persona]);
    return a.rows.length > 0 && b.rows.length > 0;
}

export async function hasTitulosTx(client, id_persona) {
    const { rows } = await client.query(`SELECT 1 FROM personas_titulos WHERE id_persona = $1 LIMIT 1`, [id_persona]);
    return rows.length > 0;
}

export async function getLegajoChecklistTx(client, id_persona){
    const [p, i, d, dom, tit] = await Promise.all([
        hasPersonaCoreTx(client, id_persona),
        hasIdentificacionTx(client, id_persona),
        hasDocsRequeridosTx(client, id_persona),
        hasDomicilioYBarrioTx(client, id_persona),
        hasTitulosTx(client, id_persona),
    ]);

    const faltan = [];
    if (!p)   faltan.push('Datos personales');
    if (!i)   faltan.push('DNI/CUIL');
    if (!d)   faltan.push('Documentos obligatorios');
    if (!dom) faltan.push('Domicilio y barrio');
    if (!tit) faltan.push('Títulos');

    return { okPersona: p, okIdent: i, okDocs: d, okDomicilio: dom, okTitulos: tit, faltan };
}

export async function setEstadoLegajoTx(client, id_persona, codigo, id_usuario, motivo = null) {
    const { rows } = await client.query(
        `SELECT id_estado FROM estados_legajo WHERE codigo = $1 LIMIT 1`,
        [codigo]
    );
    if (!rows.length) throw new Error(`estados_legajo inexistente: ${codigo}`);
    const id_estado = rows[0].id_estado;

    await client.query(`
        INSERT INTO personas_legajo_estado (id_persona, id_estado_legajo, actualizado_en, actualizado_por_usuario)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (id_persona) DO UPDATE
        SET id_estado_legajo = EXCLUDED.id_estado_legajo,
            actualizado_en   = NOW(),
            actualizado_por_usuario = EXCLUDED.actualizado_por_usuario
    `, [id_persona, id_estado, id_usuario]);

    await client.query(`
        INSERT INTO personas_legajo_historial (id_persona, id_estado_legajo, motivo, cambiado_por_usuario, cambiado_en)
        VALUES ($1, $2, $3, $4, NOW())
    `, [id_persona, id_estado, motivo, id_usuario]);

    return { ok: true, codigo };
}

export async function recalcularEstadoLegajoTx(client, id_persona, id_usuario) {
    const { okPersona, okIdent, okDocs, okDomicilio, okTitulos } = await getLegajoChecklistTx(client, id_persona);
    let codigo = 'INCOMPLETO';

    if(okPersona && okIdent) {
        codigo = 'PENDIENTE';
    }

    if(okPersona && okIdent && okDocs && okDomicilio && okTitulos){
        codigo = 'REVISION';
    }

    await setEstadoLegajoTx(client, id_persona, codigo, id_usuario, 'Recalculo automático');
    return codigo;
}