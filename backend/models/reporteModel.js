import db from './db.js';

export const getInformeEscalafonario = async (id_persona) => {
    try {
        const query = `
            WITH datos_persona AS (
                SELECT 
                    p.id_persona,
                    p.nombre,
                    p.apellido,
                    p.fecha_nacimiento,
                    p.sexo,
                    p.telefono,
                    pi.dni,
                    pi.cuil,
                    pd.calle,
                    pd.altura,
                    b.barrio,
                    b.manzana,
                    b.casa,
                    b.departamento as barrio_depto,
                    b.piso as barrio_piso,
                    l.localidad,
                    l.codigo_postal,
                    dep.departamento as provincia,
                    u.email
                FROM personas p
                LEFT JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
                LEFT JOIN persona_domicilio pd ON p.id_persona = pd.id_persona
                LEFT JOIN dom_barrio b ON pd.id_dom_barrio = b.id_dom_barrio
                LEFT JOIN dom_localidad l ON b.id_dom_localidad = l.id_dom_localidad
                LEFT JOIN dom_departamento dep ON l.id_dom_departamento = dep.id_dom_departamento
                LEFT JOIN usuarios u ON p.id_persona = u.id_persona
                WHERE p.id_persona = $1
                LIMIT 1
            ),
            titulos_persona AS (
                SELECT 
                    pt.id_persona,
                    COALESCE(json_agg(
                        json_build_object(
                            'id_titulo', pt.id_titulo,
                            'tipo_titulo', tt.nombre,
                            'codigo_tipo', tt.codigo,
                            'nombre_titulo', pt.nombre_titulo,
                            'institucion', pt.institucion,
                            'fecha_emision', pt.fecha_emision,
                            'matricula_prof', pt.matricula_prof,
                            'estado_verificacion', ev.nombre,
                            'verificado_en', pt.verificado_en,
                            'archivo_nombre', a.nombre_original
                        ) ORDER BY 
                            CASE tt.codigo 
                                WHEN 'DOCTORADO' THEN 1
                                WHEN 'MAESTRIA' THEN 2
                                WHEN 'POSGRADO' THEN 3
                                WHEN 'GRADO' THEN 4
                                WHEN 'TERCIARIO' THEN 5
                                WHEN 'SECUNDARIO' THEN 6
                                ELSE 7
                            END,
                            pt.fecha_emision DESC NULLS LAST
                    ) FILTER (WHERE pt.id_titulo IS NOT NULL), '[]'::json) as titulos
                FROM personas p
                LEFT JOIN personas_titulos pt ON p.id_persona = pt.id_persona
                LEFT JOIN tipos_titulo tt ON pt.id_tipo_titulo = tt.id_tipo_titulo
                LEFT JOIN estado_verificacion ev ON pt.id_estado_verificacion = ev.id_estado
                LEFT JOIN archivos a ON pt.id_archivo = a.id_archivo
                WHERE p.id_persona = $1
                GROUP BY pt.id_persona, p.id_persona
            ),
            contratos_persona AS (
                SELECT 
                    cp.id_persona,
                    COALESCE(json_agg(
                        json_build_object(
                            'id_contrato', cp.id_contrato_profesor,
                            'fecha_inicio', cp.fecha_inicio,
                            'fecha_fin', cp.fecha_fin,
                            'periodo', CASE cp.id_periodo WHEN 1 THEN '1º' WHEN 2 THEN '2º' ELSE cp.id_periodo::text END,
                            'anio', EXTRACT(YEAR FROM cp.fecha_inicio),
                            'horas_semanales', cp.horas_semanales,
                            'horas_mensuales', cp.horas_mensuales,
                            'monto_hora', cp.monto_hora,
                            'estado', CASE 
                                WHEN cp.fecha_fin IS NULL OR cp.fecha_fin >= CURRENT_DATE THEN 'Vigente'
                                ELSE 'Finalizado'
                            END
                        ) ORDER BY cp.fecha_inicio DESC
                    ) FILTER (WHERE cp.id_contrato_profesor IS NOT NULL), '[]'::json) as contratos,
                    MIN(cp.fecha_inicio) as fecha_primer_contrato,
                    COUNT(*) FILTER (WHERE cp.fecha_fin IS NULL OR cp.fecha_fin >= CURRENT_DATE) as contratos_activos,
                    COUNT(*) FILTER (WHERE cp.id_contrato_profesor IS NOT NULL) as total_contratos,
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(cp.fecha_inicio))) as antiguedad_anios,
                    EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(cp.fecha_inicio))) % 12 as antiguedad_meses
                FROM personas p
                LEFT JOIN contrato_profesor cp ON p.id_persona = cp.id_persona
                WHERE p.id_persona = $1
                GROUP BY cp.id_persona, p.id_persona
            ),
            documentos_persona AS (
                SELECT 
                    pd.id_persona,
                    COALESCE(json_agg(
                        json_build_object(
                            'id_documento', pd.id_persona_doc,
                            'tipo_documento', td.nombre,
                            'nombre_documento', td.nombre,
                            'fecha_emision', pd.creado_en,
                            'archivo_nombre', a.nombre_original,
                            'estado_verificacion', ev.nombre
                        ) ORDER BY pd.creado_en DESC NULLS LAST
                    ) FILTER (WHERE pd.id_persona_doc IS NOT NULL), '[]'::json) as documentos
                FROM personas p
                LEFT JOIN personas_documentos pd ON p.id_persona = pd.id_persona
                LEFT JOIN tipos_documento td ON pd.id_tipo_doc = td.id_tipo_doc
                LEFT JOIN archivos a ON pd.id_archivo = a.id_archivo
                LEFT JOIN estado_verificacion ev ON pd.id_estado_verificacion = ev.id_estado
                WHERE p.id_persona = $1
                GROUP BY pd.id_persona, p.id_persona
            ),
            perfiles_persona AS (
                SELECT 
                    pp.id_persona,
                    COALESCE(json_agg(
                        json_build_object(
                            'perfil', pf.nombre,
                            'vigente', pp.vigente
                        )
                    ) FILTER (WHERE pp.vigente = true AND pp.id_perfil IS NOT NULL), '[]'::json) as perfiles
                FROM personas p
                LEFT JOIN personas_perfiles pp ON p.id_persona = pp.id_persona
                LEFT JOIN perfiles pf ON pp.id_perfil = pf.id_perfil
                WHERE p.id_persona = $1
                GROUP BY pp.id_persona, p.id_persona
            )
            SELECT 
                dp.*,
                COALESCE(tp.titulos, '[]'::json) as titulos,
                COALESCE(cp.contratos, '[]'::json) as contratos,
                COALESCE(docp.documentos, '[]'::json) as documentos,
                COALESCE(pfp.perfiles, '[]'::json) as perfiles,
                cp.fecha_primer_contrato,
                COALESCE(cp.contratos_activos, 0) as contratos_activos,
                COALESCE(cp.total_contratos, 0) as total_contratos,
                COALESCE(cp.antiguedad_anios, 0) as antiguedad_anios,
                COALESCE(cp.antiguedad_meses, 0) as antiguedad_meses
            FROM datos_persona dp
            LEFT JOIN titulos_persona tp ON dp.id_persona = tp.id_persona
            LEFT JOIN contratos_persona cp ON dp.id_persona = cp.id_persona
            LEFT JOIN documentos_persona docp ON dp.id_persona = docp.id_persona
            LEFT JOIN perfiles_persona pfp ON dp.id_persona = pfp.id_persona
        `;

        const { rows } = await db.query(query, [id_persona]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error en getInformeEscalafonario:', error);
        throw error;
    }
};

export const getEstadisticasGenerales = async () => {
    const query = `
        WITH stats AS (
            SELECT 
                (SELECT COUNT(*) FROM personas) as total_personas,
                (SELECT COUNT(*) FROM personas p 
                    JOIN personas_perfiles pp ON p.id_persona = pp.id_persona 
                    JOIN perfiles pf ON pp.id_perfil = pf.id_perfil 
                    WHERE pf.nombre = 'Profesor' AND pp.vigente = true) as total_profesores,
                (SELECT COUNT(*) FROM contrato_profesor) as total_contratos,
                (SELECT COUNT(*) FROM contrato_profesor 
                    WHERE fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE) as contratos_activos,
                (SELECT COUNT(*) FROM personas_titulos) as total_titulos,
                (SELECT COUNT(*) FROM personas_titulos 
                    WHERE id_estado_verificacion = 3) as titulos_verificados,
                (SELECT COUNT(*) FROM personas_documentos) as total_documentos,
                (SELECT COUNT(*) FROM usuarios WHERE activo = true) as usuarios_activos
        )
        SELECT * FROM stats
    `;

    const { rows } = await db.query(query);
    return rows[0];
};

export const getEstadisticasContratosPorPeriodo = async (anio) => {
    const query = `
        SELECT 
            EXTRACT(YEAR FROM cp.fecha_inicio) as anio,
            CASE cp.id_periodo 
                WHEN 1 THEN '1º Cuatrimestre'
                WHEN 2 THEN '2º Cuatrimestre'
                ELSE 'Otro'
            END as periodo,
            COUNT(*) as total_contratos,
            COUNT(DISTINCT cp.id_persona) as total_docentes,
            SUM(cp.horas_semanales) as total_horas,
            ROUND(AVG(cp.horas_semanales)::numeric, 2) as promedio_horas,
            ROUND(AVG(cp.monto_hora)::numeric, 2) as promedio_monto_hora
        FROM contrato_profesor cp
        WHERE ($1::int IS NULL OR EXTRACT(YEAR FROM cp.fecha_inicio) = $1)
        GROUP BY EXTRACT(YEAR FROM cp.fecha_inicio), cp.id_periodo
        ORDER BY EXTRACT(YEAR FROM cp.fecha_inicio) DESC, cp.id_periodo ASC
    `;

    const { rows } = await db.query(query, [anio || null]);
    return rows;
};

export const getEstadisticasTitulosPorTipo = async () => {
    const query = `
        SELECT 
            tt.nombre as tipo_titulo,
            tt.codigo,
            COUNT(*) as cantidad,
            COUNT(*) FILTER (WHERE pt.id_estado_verificacion = 3) as verificados,
            COUNT(*) FILTER (WHERE pt.id_estado_verificacion = 1) as pendientes,
            COUNT(*) FILTER (WHERE pt.id_estado_verificacion = 2) as rechazados
        FROM personas_titulos pt
        JOIN tipos_titulo tt ON pt.id_tipo_titulo = tt.id_tipo_titulo
        GROUP BY tt.id_tipo_titulo, tt.nombre, tt.codigo
        ORDER BY 
            CASE tt.codigo 
                WHEN 'DOCTORADO' THEN 1
                WHEN 'MAESTRIA' THEN 2
                WHEN 'POSGRADO' THEN 3
                WHEN 'GRADO' THEN 4
                WHEN 'TERCIARIO' THEN 5
                WHEN 'SECUNDARIO' THEN 6
                ELSE 7
            END
    `;

    const { rows } = await db.query(query);
    return rows;
};

export const getRankingDocentesPorAntiguedad = async (limit = 20) => {
    const query = `
        SELECT 
            p.id_persona,
            p.apellido,
            p.nombre,
            pi.dni,
            MIN(cp.fecha_inicio) as fecha_inicio,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(cp.fecha_inicio))) as antiguedad_anios,
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(cp.fecha_inicio))) % 12 as antiguedad_meses,
            COUNT(*) as total_contratos,
            COUNT(*) FILTER (WHERE cp.fecha_fin IS NULL OR cp.fecha_fin >= CURRENT_DATE) as contratos_activos
        FROM personas p
        JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
        JOIN contrato_profesor cp ON p.id_persona = cp.id_persona
        GROUP BY p.id_persona, p.apellido, p.nombre, pi.dni
        ORDER BY MIN(cp.fecha_inicio) ASC
        LIMIT $1
    `;

    const { rows } = await db.query(query, [limit]);
    return rows;
};

export const getListadoDocentesResumen = async (filtros = {}) => {
    let whereConditions = ['pp.vigente = true', "pf.nombre = 'Profesor'"];
    const params = [];
    let paramIndex = 1;

    if (filtros.search) {
        whereConditions.push(`(
            p.nombre ILIKE $${paramIndex} OR 
            p.apellido ILIKE $${paramIndex} OR 
            pi.dni ILIKE $${paramIndex}
        )`);
        params.push(`%${filtros.search}%`);
        paramIndex++;
    }

    if (filtros.tiene_contratos_activos) {
        whereConditions.push(`EXISTS (
            SELECT 1 FROM contrato_profesor cp 
            WHERE cp.id_persona = p.id_persona 
            AND (cp.fecha_fin IS NULL OR cp.fecha_fin >= CURRENT_DATE)
        )`);
    }

    const query = `
        SELECT 
            p.id_persona,
            p.apellido,
            p.nombre,
            pi.dni,
            u.email,
            (
                SELECT COUNT(*) 
                FROM personas_titulos pt 
                WHERE pt.id_persona = p.id_persona
            ) as total_titulos,
            (
                SELECT COUNT(*) 
                FROM contrato_profesor cp 
                WHERE cp.id_persona = p.id_persona
            ) as total_contratos,
            (
                SELECT COUNT(*) 
                FROM contrato_profesor cp 
                WHERE cp.id_persona = p.id_persona 
                AND (cp.fecha_fin IS NULL OR cp.fecha_fin >= CURRENT_DATE)
            ) as contratos_activos,
            (
                SELECT MIN(fecha_inicio) 
                FROM contrato_profesor cp 
                WHERE cp.id_persona = p.id_persona
            ) as fecha_primer_contrato,
            COALESCE(
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, (
                    SELECT MIN(fecha_inicio) 
                    FROM contrato_profesor cp 
                    WHERE cp.id_persona = p.id_persona
                ))), 0
            ) as antiguedad_anios
        FROM personas p
        JOIN personas_perfiles pp ON p.id_persona = pp.id_persona
        JOIN perfiles pf ON pp.id_perfil = pf.id_perfil
        LEFT JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
        LEFT JOIN usuarios u ON p.id_persona = u.id_persona
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY p.apellido ASC, p.nombre ASC
    `;

    const { rows } = await db.query(query, params);
    return rows;
};

export const getEstadisticasDocumentosPorTipo = async () => {
    const query = `
        SELECT 
            td.nombre as tipo_documento,
            COUNT(*) as cantidad,
            COUNT(*) FILTER (WHERE pd.id_estado_verificacion = 3) as verificados,
            COUNT(*) FILTER (WHERE pd.id_estado_verificacion = 1) as pendientes,
            COUNT(*) FILTER (WHERE pd.id_estado_verificacion = 2) as rechazados
        FROM personas_documentos pd
        JOIN tipos_documento td ON pd.id_tipo_doc = td.id_tipo_doc
        GROUP BY td.id_tipo_doc, td.nombre
        ORDER BY cantidad DESC
    `;

    const { rows } = await db.query(query);
    return rows;
};

export const getContratosProximosAVencer = async (dias = 30) => {
    const query = `
        SELECT 
            cp.id_contrato_profesor,
            cp.fecha_inicio,
            cp.fecha_fin,
            EXTRACT(YEAR FROM cp.fecha_inicio) as anio,
            CASE cp.id_periodo WHEN 1 THEN '1º' WHEN 2 THEN '2º' ELSE cp.id_periodo::text END as periodo,
            p.id_persona,
            p.apellido,
            p.nombre,
            pi.dni,
            u.email,
            DATE_PART('day', cp.fecha_fin - CURRENT_DATE) as dias_restantes,
            (
                SELECT json_agg(json_build_object('descripcion', m.descripcion_materia))
                FROM contrato_profesor_materia cpm
                JOIN materia m ON cpm.id_materia = m.id_materia
                WHERE cpm.id_contrato_profesor = cp.id_contrato_profesor
            ) as materias
        FROM contrato_profesor cp
        JOIN personas p ON cp.id_persona = p.id_persona
        LEFT JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
        LEFT JOIN usuarios u ON p.id_persona = u.id_persona
        WHERE cp.fecha_fin IS NOT NULL
        AND cp.fecha_fin >= CURRENT_DATE
        AND cp.fecha_fin <= CURRENT_DATE + INTERVAL '1 day' * $1
        ORDER BY cp.fecha_fin ASC
    `;

    const { rows } = await db.query(query, [dias]);
    return rows;
};

export const getDocumentosDigitalizados = async (filtros = {}) => {
    let whereConditions = ['a.id_archivo IS NOT NULL'];
    const params = [];
    let paramIndex = 1;

    if (filtros.id_persona) {
        whereConditions.push(`d.id_persona = $${paramIndex}`);
        params.push(filtros.id_persona);
        paramIndex++;
    }

    if (filtros.tipo) {
        whereConditions.push(`d.tipo_documento = $${paramIndex}`);
        params.push(filtros.tipo);
        paramIndex++;
    }

    const query = `
        SELECT 
            d.id_documento,
            d.tipo_documento,
            d.id_persona,
            p.apellido,
            p.nombre,
            d.nombre_documento,
            d.fecha_subida,
            a.nombre_original,
            a.nombre_sistema,
            a.mime_type,
            a.tamano,
            ev.nombre as estado_verificacion
        FROM (
            -- Títulos
            SELECT 
                pt.id_titulo as id_documento,
                'Título' as tipo_documento,
                pt.id_persona,
                pt.nombre_titulo as nombre_documento,
                pt.creado_en as fecha_subida,
                pt.id_archivo,
                pt.id_estado_verificacion
            FROM personas_titulos pt
            WHERE pt.id_archivo IS NOT NULL
            
            UNION ALL
            
            -- Documentos
            SELECT 
                pd.id_persona_doc as id_documento,
                td.nombre as tipo_documento,
                pd.id_persona,
                td.nombre as nombre_documento,
                pd.creado_en as fecha_subida,
                pd.id_archivo,
                pd.id_estado_verificacion
            FROM personas_documentos pd
            LEFT JOIN tipos_documento td ON pd.id_tipo_doc = td.id_tipo_doc
            WHERE pd.id_archivo IS NOT NULL
        ) d
        JOIN personas p ON d.id_persona = p.id_persona
        JOIN archivos a ON d.id_archivo = a.id_archivo
        LEFT JOIN estado_verificacion ev ON d.id_estado_verificacion = ev.id_estado
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY d.fecha_subida DESC
    `;

    const { rows } = await db.query(query, params);
    return rows;
};