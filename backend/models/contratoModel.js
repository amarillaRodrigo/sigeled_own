import db from "./db.js";

export async function getEmpleados({
  q = "",
  perfil = [
    "Profesor",
    "Coordinador",
    "Administrativo",
    "Recursos Humanos",
    "Investigador",
  ],
  limit = 20,
  offset = 0,
}) {
  let perfilesArray = Array.isArray(perfil)
    ? perfil
    : String(perfil)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  if (!perfilesArray.length) {
    perfilesArray = ["Profesor", "Coordinador"];
  }

  const sql = `
    SELECT 
      p.id_persona,
      p.nombre,
      p.apellido,
      pi.dni,
      COALESCE(
        COUNT(c.id_contrato)
          FILTER (
            WHERE CURRENT_DATE BETWEEN c.fecha_inicio::date 
              AND COALESCE(c.fecha_fin::date, 'infinity'::date)
          ),
        0
      ) AS activos
    FROM personas p
    JOIN personas_identificacion pi ON pi.id_persona = p.id_persona
    JOIN personas_perfiles pp ON pp.id_persona = p.id_persona
    JOIN perfiles pe ON pe.id_perfil = pp.id_perfil
    LEFT JOIN contrato c ON c.id_persona = p.id_persona
    WHERE pe.nombre = ANY($1::text[])
      AND (
        $2 = '' 
        OR p.nombre ILIKE '%'||$2||'%' 
        OR p.apellido ILIKE '%'||$2||'%' 
        OR pi.dni ILIKE '%'||$2||'%'
      )
    GROUP BY p.id_persona, p.nombre, p.apellido, pi.dni
    ORDER BY p.apellido ASC, p.nombre ASC
    LIMIT $3 OFFSET $4
  `;
  const { rows } = await db.query(sql, [perfilesArray, q, limit, offset]);
  return rows;
}

export async function getAllContratos({ persona } = {}) {
  const params = [];
  let where = "";
  if (persona) {
    params.push(persona);
    where = `WHERE c.id_persona = $${params.length}`;
  }

  const query = `
    SELECT
      c.id_contrato AS id_contrato_profesor,
      c.id_contrato,
      c.id_persona,
      c.id_periodo,
      c.fecha_inicio,
      c.fecha_fin,
      c.horas_semanales,
      c.horas_mensuales,
      c.monto_hora_promedio AS monto_hora,
      c.total_importe_mensual,
      c.external_id,
      p.nombre  AS persona_nombre,
      p.apellido AS persona_apellido,
      p.sexo AS persona_sexo,
      per.descripcion AS nombre_periodo,
      per.descripcion AS periodo_descripcion,
      COALESCE(items.items, '[]') AS items
    FROM contrato c
    JOIN personas p ON c.id_persona = p.id_persona
    LEFT JOIN periodo per ON per.id_periodo = c.id_periodo
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id_contrato_item', ci.id_contrato_item,
          'id_perfil',        ci.id_perfil,
          'perfil_codigo',    pe.codigo,
          'perfil_nombre',    pe.nombre,
          'tipo_item',        ci.tipo_item,
          'id_materia',       ci.id_materia,
          'descripcion_materia', m.descripcion_materia,
          'descripcion_actividad', ci.descripcion_actividad,
          'codigo_cargo',     ci.codigo_cargo,
          'horas_semanales',  ci.horas_semanales,
          'monto_hora',       ci.monto_hora,
          'subtotal_mensual', ci.subtotal_mensual
        )
        ORDER BY ci.id_contrato_item
      ) AS items
      FROM contrato_item ci
      JOIN perfiles pe ON pe.id_perfil = ci.id_perfil
      LEFT JOIN materia m ON m.id_materia = ci.id_materia
      WHERE ci.id_contrato = c.id_contrato
    ) items ON TRUE
    ${where}
    ORDER BY c.fecha_inicio DESC, c.id_contrato DESC
  `;
  const { rows } = await db.query(query, params);
  return rows;
}

export async function getContratoById(idContrato) {
  const qGeneral = `
    SELECT
      c.id_contrato             AS id_contrato_profesor,
      c.id_contrato,
      c.id_persona,
      c.id_periodo,
      c.fecha_inicio,
      c.fecha_fin,
      c.horas_semanales,
      c.horas_mensuales,
      c.monto_hora_promedio     AS monto_hora,
      c.total_importe_mensual,
      c.external_id,

      p.nombre   AS persona_nombre,
      p.apellido AS persona_apellido,
      p.sexo     AS persona_sexo,

      pi.dni     AS persona_dni,
      dom.dir_contrato AS persona_domicilio,
      tit.nombre_titulo AS titulo_profesional,

      per.descripcion AS nombre_periodo,
      per.descripcion AS periodo_descripcion,
      COALESCE(items.items, '[]') AS items
    FROM contrato c
    JOIN personas p ON c.id_persona = p.id_persona
    LEFT JOIN personas_identificacion pi ON pi.id_persona = p.id_persona

    LEFT JOIN LATERAL (
      SELECT
        ('B° ' || db.barrio
          || COALESCE(' Mz ' || db.manzana, '')
          || COALESCE(' C '  || db.casa, '')
          || COALESCE(' Dpto ' || db.departamento, '')
          || COALESCE(' Piso ' || db.piso, '')
        ) AS dir_contrato
      FROM persona_domicilio pd
      JOIN dom_barrio db ON db.id_dom_barrio = pd.id_dom_barrio
      WHERE pd.id_persona = p.id_persona
      ORDER BY pd.id_domicilio DESC
      LIMIT 1
    ) dom ON TRUE

    LEFT JOIN LATERAL (
      SELECT pt.nombre_titulo
      FROM personas_titulos pt
      WHERE pt.id_persona = p.id_persona
      ORDER BY 
        (pt.id_estado_verificacion = 2) DESC,
        pt.verificado_en DESC NULLS LAST,
        pt.fecha_emision DESC NULLS LAST
      LIMIT 1
    ) tit ON TRUE

    LEFT JOIN periodo per ON per.id_periodo = c.id_periodo
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id_contrato_item', ci.id_contrato_item,
          'id_perfil',        ci.id_perfil,
          'perfil_codigo',    pe.codigo,
          'perfil_nombre',    pe.nombre,
          'tipo_item',        ci.tipo_item,
          'id_materia',       ci.id_materia,
          'descripcion_materia', m.descripcion_materia,
          'descripcion_actividad', ci.descripcion_actividad,
          'codigo_cargo',     ci.codigo_cargo,
          'horas_semanales',  ci.horas_semanales,
          'monto_hora',       ci.monto_hora,
          'subtotal_mensual', ci.subtotal_mensual
        )
        ORDER BY ci.id_contrato_item
      ) AS items
      FROM contrato_item ci
      JOIN perfiles pe ON pe.id_perfil = ci.id_perfil
      LEFT JOIN materia m ON m.id_materia = ci.id_materia
      WHERE ci.id_contrato = c.id_contrato
    ) items ON TRUE
    WHERE c.id_contrato = $1
  `;
  let { rows } = await db.query(qGeneral, [idContrato]);
  if (rows[0]) return rows[0];

  const qProfesor = `
    SELECT 
      cp.*, 
      cp.external_id,
      p.nombre AS persona_nombre,
      p.apellido AS persona_apellido,
      p.sexo AS persona_sexo,

      pi.dni AS persona_dni,
      dom.dir_contrato AS persona_domicilio,
      tit.nombre_titulo AS titulo_profesional,

      COALESCE(mats.materias, '[]') AS materias,
      CONCAT_WS(' ', p.apellido, p.nombre) AS nombre_profesor,
      per.descripcion AS nombre_periodo,
      per.descripcion AS periodo_descripcion
    FROM contrato_profesor cp
    JOIN personas p ON cp.id_persona = p.id_persona
    LEFT JOIN personas_identificacion pi ON pi.id_persona = p.id_persona

    LEFT JOIN LATERAL (
      SELECT
        ('B° ' || db.barrio
          || COALESCE(' Mz ' || db.manzana, '')
          || COALESCE(' C '  || db.casa, '')
          || COALESCE(' Dpto ' || db.departamento, '')
          || COALESCE(' Piso ' || db.piso, '')
        ) AS dir_contrato
      FROM persona_domicilio pd
      JOIN dom_barrio db ON db.id_dom_barrio = pd.id_dom_barrio
      WHERE pd.id_persona = p.id_persona
      ORDER BY pd.id_domicilio DESC
      LIMIT 1
    ) dom ON TRUE

    LEFT JOIN LATERAL (
      SELECT pt.nombre_titulo
      FROM personas_titulos pt
      WHERE pt.id_persona = p.id_persona
      ORDER BY 
        (pt.id_estado_verificacion = 2) DESC,
        pt.verificado_en DESC NULLS LAST,
        pt.fecha_emision DESC NULLS LAST
      LIMIT 1
    ) tit ON TRUE

    LEFT JOIN periodo per ON per.id_periodo = cp.id_periodo
    LEFT JOIN LATERAL (
      SELECT json_agg(
              json_build_object(
                'id_materia',       m.id_materia,
                'descripcion_materia', m.descripcion_materia,
                'cargo',            cpm.cargo,
                'horas_semanales',  cpm.horas_semanales,
                'monto_hora',       cpm.monto_hora
              )
              ORDER BY m.descripcion_materia
            ) AS materias
      FROM contrato_profesor_materia cpm
      JOIN materia m ON m.id_materia = cpm.id_materia
      WHERE cpm.id_contrato_profesor = cp.id_contrato_profesor
    ) mats ON TRUE
    WHERE cp.id_contrato_profesor = $1
  `;
  ({ rows } = await db.query(qProfesor, [idContrato]));
  return rows[0] || null;
}

export async function getContratoByExternalId(externalId) {
  const q = `
    SELECT
      cp.*, 
      cp.external_id,
      p.nombre AS persona_nombre,
      p.apellido AS persona_apellido,
      COALESCE(mats.materias, '[]') AS materias,
      per.descripcion AS nombre_periodo,
      per.descripcion AS periodo_descripcion
    FROM contrato_profesor cp
    JOIN personas p ON cp.id_persona = p.id_persona
    LEFT JOIN periodo per ON per.id_periodo = cp.id_periodo
    LEFT JOIN LATERAL (
    SELECT json_agg(
            json_build_object(
              'id_materia',       m.id_materia,
              'descripcion_materia', m.descripcion_materia,
              'cargo',            cpm.cargo,
              'horas_semanales',  cpm.horas_semanales,
              'monto_hora',       cpm.monto_hora
            )
            ORDER BY m.descripcion_materia
          ) AS materias
    FROM contrato_profesor_materia cpm
    JOIN materia m ON m.id_materia = cpm.id_materia
    WHERE cpm.id_contrato_profesor = cp.id_contrato_profesor
  ) mats ON TRUE
    WHERE cp.external_id = $1
  `;
  const { rows } = await db.query(q, [externalId]);
  return rows[0] || null;
}

export async function createContrato(data) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    let id_profesor = data.id_profesor;
    if (!id_profesor) {
      const { rows: profRows } = await client.query(
        "SELECT id_profesor FROM profesor WHERE id_persona = $1 LIMIT 1",
        [data.id_persona]
      );
      if (!profRows.length) {
        throw new Error("La persona no tiene registro de profesor");
      }
      id_profesor = profRows[0].id_profesor;
    }

    let items = Array.isArray(data.items) ? data.items : null;

    let idMaterias = Array.isArray(data.id_materias) ? data.id_materias : [];
    if (!idMaterias.length && data.id_materia) idMaterias = [data.id_materia];

    const isUUID = (s) => typeof s === "string" && /^[0-9a-fA-F-]{36}$/.test(s);

    if (!items || !items.length) {
      idMaterias = idMaterias.filter(isUUID);
      if (!idMaterias.length) {
        throw new Error("Debe indicar al menos una materia (UUID)");
      }

      items = idMaterias.map((id_materia) => ({
        id_materia,
        cargo: data.cargo || null,
        horas_semanales: data.horas_semanales || null,
      }));
    } else {
      items = items
        .map((it) => ({
          id_materia: it.id_materia,
          cargo: it.cargo || null,
          horas_semanales:
            it.horas_semanales !== undefined
              ? Number(it.horas_semanales)
              : null,
        }))
        .filter((it) => isUUID(it.id_materia));
      if (!items.length) {
        throw new Error("Debe indicar al menos una materia válida en items");
      }
      idMaterias = items.map((it) => it.id_materia);
    }

    if (idMaterias.length) {
      const { rows: carrerasRows } = await client.query(
        `
        SELECT DISTINCT mc.id_carrera
        FROM materia_carrera mc
        WHERE mc.id_materia = ANY($1::uuid[])
      `,
        [idMaterias]
      );

      if (carrerasRows.length > 1) {
        throw new Error(
          "Las materias seleccionadas pertenecen a distintas carreras. Cree contratos separados por carrera."
        );
      }
    }

    const { rows: tarifasRows } = await client.query(
      `
      SELECT t.codigo_cargo, t.monto_hora
      FROM personas_perfiles pp
      JOIN perfil_tarifa t 
        ON t.id_perfil = pp.id_perfil
      WHERE pp.id_persona = $1
        AND (pp.vigente IS TRUE OR pp.vigente IS NULL)
        AND t.activo = TRUE
        AND t.aplica_materias = TRUE
      `,
      [data.id_persona]
    );

    if (!tarifasRows.length) {
      throw new Error(
        "No hay tarifas configuradas para los perfiles vigentes de la persona"
      );
    }

    const tarifaPorCargo = new Map(
      tarifasRows.map((r) => [r.codigo_cargo, Number(r.monto_hora)])
    );

    items = items.map((it) => {
      if (!it.cargo) {
        throw new Error("Debe indicar el cargo para cada materia");
      }
      const montoTarifa = tarifaPorCargo.get(it.cargo);
      if (!montoTarifa) {
        throw new Error(
          `No se encontró una tarifa configurada para el cargo ${it.cargo}`
        );
      }
      return {
        ...it,
        monto_hora: montoTarifa,
      };
    });

    const totalHorasSem = items.reduce(
      (acc, it) => acc + (Number(it.horas_semanales) || 0),
      0
    );
    const horasMensuales =
      data.horas_mensuales !== undefined
        ? Number(data.horas_mensuales)
        : totalHorasSem * 4;

    const totalImporteMensual = items.reduce((acc, it) => {
      const h = Number(it.horas_semanales) || 0;
      const m = Number(it.monto_hora) || 0;
      return acc + h * 4 * m;
    }, 0);

    // monto_hora CABECERA = promedio ponderado
    let montoHoraCabecera = null;
    if (totalHorasSem > 0) {
      const totalHorasMensuales = totalHorasSem * 4;
      montoHoraCabecera =
        totalHorasMensuales > 0
          ? totalImporteMensual / totalHorasMensuales
          : null;
    }

    // Validar solapamiento (igual que antes)
    const overlapQuery = `
      SELECT 1 FROM contrato_profesor
      WHERE id_profesor = $1
        AND daterange(fecha_inicio::date, COALESCE(fecha_fin::date, 'infinity'::date)) &&
            daterange($2::date, COALESCE($3::date, 'infinity'::date))
      LIMIT 1
    `;
    const { rows: overlapRows } = await client.query(overlapQuery, [
      id_profesor,
      data.fecha_inicio,
      data.fecha_fin || null,
    ]);
    if (overlapRows.length > 0) {
      throw new Error(
        "Solapamiento detectado: el profesor ya tiene un contrato en ese rango de fechas"
      );
    }

    const insert = `
      INSERT INTO contrato_profesor (
        id_persona, id_profesor, id_materia, id_periodo,
        horas_semanales, horas_mensuales, monto_hora,
        fecha_inicio, fecha_fin, "createdAt","updatedAt"
      ) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      RETURNING * , external_id
    `;
    const values = [
      data.id_persona,
      id_profesor,
      data.id_periodo,
      totalHorasSem || null,
      horasMensuales || null,
      montoHoraCabecera,
      data.fecha_inicio,
      data.fecha_fin || null,
    ];
    const { rows } = await client.query(insert, values);
    const contrato = rows[0];

    const inserts = items.map((it) =>
      client.query(
        `
          INSERT INTO contrato_profesor_materia (
            id_contrato_profesor,
            id_materia,
            horas_semanales,
            cargo,
            monto_hora
          ) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (id_contrato_profesor, id_materia) DO NOTHING
        `,
        [
          contrato.id_contrato_profesor,
          it.id_materia,
          it.horas_semanales,
          it.cargo,
          it.monto_hora,
        ]
      )
    );
    await Promise.all(inserts);

    await client.query("COMMIT");
    return contrato;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en createContrato:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteContrato(idContrato) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows: generalRows } = await client.query(
      "SELECT * FROM contrato WHERE id_contrato = $1",
      [idContrato]
    );

    let contrato = null;

    if (generalRows.length) {
      contrato = generalRows[0];

      await client.query("DELETE FROM contrato_item WHERE id_contrato = $1", [
        idContrato,
      ]);

      await client.query("DELETE FROM contrato WHERE id_contrato = $1", [
        idContrato,
      ]);
    } else {
      const { rows: profRows } = await client.query(
        "SELECT * FROM contrato_profesor WHERE id_contrato_profesor = $1",
        [idContrato]
      );

      if (!profRows.length) {
        throw new Error("Contrato no encontrado");
      }

      contrato = profRows[0];

      await client.query(
        "DELETE FROM contrato_profesor_materia WHERE id_contrato_profesor = $1",
        [idContrato]
      );

      await client.query(
        "DELETE FROM contrato_profesor WHERE id_contrato_profesor = $1",
        [idContrato]
      );
    }

    await client.query("COMMIT");
    return contrato;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en deleteContrato:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getPersonaByDni(dni) {
  try {
    const query = `
      SELECT p.*
      FROM personas p
      JOIN personas_identificacion pi ON p.id_persona = pi.id_persona
      WHERE pi.dni = $1
    `;
    const { rows } = await db.query(query, [dni]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error en getPersonaByDni:", error);
    throw error;
  }
}

export async function getProfesorDetalles(idPersona) {
  try {
    const query = `
      SELECT 
        p.*,
        prof.id_profesor AS id_profesor,
        cg.cargo_descripcion,
        COALESCE(mats.materias, '[]') AS materias
      FROM profesor prof
      JOIN personas p                 ON p.id_persona = prof.id_persona
      LEFT JOIN cargo_materia cm      ON cm.id_cargo_materia = prof.id_cargo_materia
      LEFT JOIN cargo_profesor cg     ON cg.id_cargo_profesor = cm.id_cargo_profesor
      LEFT JOIN LATERAL (
        WITH materias_contrato AS (
          SELECT DISTINCT ON (x.id_contrato, x.id_materia)
            x.id_contrato,
            x.tipo_contrato,
            x.id_materia,
            x.codigo_cargo,
            x.horas_semanales,
            x.monto_hora,
            x.subtotal_mensual,
            x.periodo_descripcion,
            x.id_periodo,
            x.fecha_inicio,
            x.fecha_fin,
            m.descripcion_materia,
            cr.carrera_descripcion AS carrera,
            a.descripcion AS anio
          FROM (
            SELECT
              c.id_contrato,
              'GENERAL'::text AS tipo_contrato,
              ci.id_materia,
              ci.codigo_cargo,
              ci.horas_semanales,
              ci.monto_hora,
              ci.subtotal_mensual,
              per.descripcion AS periodo_descripcion,
              c.id_periodo,
              c.fecha_inicio,
              c.fecha_fin
            FROM contrato c
            JOIN contrato_item ci ON ci.id_contrato = c.id_contrato
            LEFT JOIN periodo per ON per.id_periodo = c.id_periodo
            WHERE c.id_persona = prof.id_persona
              AND ci.tipo_item = 'DOCENCIA'
              AND CURRENT_DATE BETWEEN c.fecha_inicio::date
                                  AND COALESCE(c.fecha_fin::date, 'infinity'::date)

            UNION ALL

            SELECT
              cp.id_contrato_profesor AS id_contrato,
              'PROFESOR'::text AS tipo_contrato,
              cpm.id_materia,
              cpm.cargo           AS codigo_cargo,
              cpm.horas_semanales,
              cpm.monto_hora,
              (cpm.horas_semanales * 4 * cpm.monto_hora)::numeric AS subtotal_mensual,
              per.descripcion AS periodo_descripcion,
              cp.id_periodo,
              cp.fecha_inicio,
              cp.fecha_fin
            FROM contrato_profesor cp
            JOIN contrato_profesor_materia cpm 
              ON cpm.id_contrato_profesor = cp.id_contrato_profesor
            LEFT JOIN periodo per ON per.id_periodo = cp.id_periodo
            WHERE cp.id_persona = prof.id_persona
              AND CURRENT_DATE BETWEEN cp.fecha_inicio::date
                                  AND COALESCE(cp.fecha_fin::date, 'infinity'::date)
          ) x
          JOIN materia m           ON m.id_materia = x.id_materia
          LEFT JOIN materia_carrera mc ON mc.id_materia = m.id_materia
          LEFT JOIN carrera cr     ON cr.id_carrera = mc.id_carrera
          LEFT JOIN anio a         ON a.id_anio = m.id_anio
          ORDER BY x.id_contrato, x.id_materia, cr.carrera_descripcion
        )
        SELECT json_agg(
                json_build_object(
                  'id_materia',          id_materia,
                  'descripcion_materia', descripcion_materia,
                  'carrera',             carrera,
                  'anio',                anio,
                  'id_contrato',         id_contrato,
                  'tipo_contrato',       tipo_contrato,
                  'codigo_cargo',        codigo_cargo,
                  'horas_semanales',     horas_semanales,
                  'monto_hora',          monto_hora,
                  'subtotal_mensual',    subtotal_mensual,
                  'periodo',             periodo_descripcion,
                  'id_periodo',          id_periodo,
                  'fecha_inicio',        fecha_inicio,
                  'fecha_fin',           fecha_fin
                )
                ORDER BY descripcion_materia
              ) AS materias
        FROM materias_contrato
      ) mats ON TRUE
      WHERE prof.id_persona = $1
    `;
    const { rows } = await db.query(query, [idPersona]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error en getProfesorDetalles:", error);
    throw error;
  }
}

export async function getMateriasByCarreraAnio(idCarrera, idAnio) {
  try {
    const query = `
      SELECT 
        m.*,
        c.carrera_descripcion
      FROM materia m
      JOIN materia_carrera mc ON mc.id_materia = m.id_materia
      LEFT JOIN carrera c ON c.id_carrera = mc.id_carrera
      WHERE mc.id_carrera = $1
        AND m.id_anio = $2;

    `;
    const { rows } = await db.query(query, [idCarrera, idAnio]);
    return rows;
  } catch (error) {
    console.error("Error en getMateriasByCarreraAnio:", error);
    throw error;
  }
}

export async function getAnios() {
  const { rows } = await db.query(
    "SELECT id_anio, descripcion FROM anio ORDER BY descripcion"
  );
  return rows;
}

export async function getPeriodos() {
  const { rows } = await db.query(
    "SELECT id_periodo, descripcion FROM periodo ORDER BY id_periodo"
  );
  return rows;
}

export async function getTarifasByPersona(idPersona) {
  const sql = `
    WITH perfiles_persona AS (
      SELECT pe.id_perfil, pe.nombre, pe.codigo
      FROM personas_perfiles pp
      JOIN perfiles pe ON pe.id_perfil = pp.id_perfil
      WHERE pp.id_persona = $1
        AND (pp.vigente IS TRUE OR pp.vigente IS NULL)
    )
    SELECT 
      p.id_perfil,
      p.nombre AS perfil_nombre,
      p.codigo AS perfil_codigo,
      COALESCE(
        json_agg(
          json_build_object(
            'id_tarifa',       t.id_tarifa,
            'codigo_cargo',    t.codigo_cargo,
            'descripcion',     t.descripcion,
            'aplica_materias', t.aplica_materias,
            'monto_hora',      t.monto_hora
          )
          ORDER BY t.codigo_cargo
        ) FILTER (WHERE t.id_tarifa IS NOT NULL),
        '[]'::json
      ) AS tarifas
    FROM perfiles_persona p
    LEFT JOIN perfil_tarifa t 
      ON t.id_perfil = p.id_perfil 
    AND t.activo = TRUE
    GROUP BY p.id_perfil, p.nombre, p.codigo
    ORDER BY p.nombre;
  `;
  const { rows } = await db.query(sql, [idPersona]);
  return rows;
}

export async function createContratoGeneral(data) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { id_persona, id_periodo, fecha_inicio, fecha_fin } = data;

    let items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      throw new Error("Debe indicar al menos un ítem de contrato");
    }

    items = items.map((it, idx) => ({
      idx,
      id_perfil: Number(it.id_perfil),
      tipo_item: String(it.tipo_item || "").toUpperCase(),
      id_materia: it.id_materia || null,
      descripcion_actividad: it.descripcion_actividad || null,
      codigo_cargo: (it.codigo_cargo || it.cargo || "").toUpperCase(),
      horas_semanales:
        it.horas_semanales !== undefined ? Number(it.horas_semanales) : null,
    }));

    const materiasDocencia = items
      .filter((it) => it.tipo_item === "DOCENCIA")
      .map((it) => it.id_materia)
      .filter(Boolean);

    if (materiasDocencia.length) {
      const { rows: carrerasCompatibles } = await client.query(
        `
        WITH mc AS (
          SELECT DISTINCT id_materia, id_carrera
          FROM materia_carrera
          WHERE id_materia = ANY($1::uuid[])
        )
        SELECT id_carrera
        FROM mc
        GROUP BY id_carrera
        HAVING COUNT(DISTINCT id_materia) = $2
        `,
        [materiasDocencia, materiasDocencia.length]
      );

      if (!carrerasCompatibles.length) {
        throw new Error(
          "Las materias DOCENCIA no comparten una misma carrera. Cree un contrato separado por carrera."
        );
      }
    }

    for (const it of items) {
      if (!it.id_perfil) {
        throw new Error(`items[${it.idx}].id_perfil es requerido`);
      }
      if (!it.tipo_item) {
        throw new Error(`items[${it.idx}].tipo_item es requerido`);
      }
      if (!it.codigo_cargo) {
        throw new Error(`items[${it.idx}].codigo_cargo (o cargo) es requerido`);
      }
      if (!it.horas_semanales || it.horas_semanales <= 0) {
        throw new Error(`items[${it.idx}].horas_semanales debe ser > 0`);
      }
      const isDocencia = it.tipo_item === "DOCENCIA";
      if (isDocencia && !it.id_materia) {
        throw new Error(
          `items[${it.idx}].id_materia es requerido para tipo_item=DOCENCIA`
        );
      }
      if (!isDocencia && !it.descripcion_actividad) {
        throw new Error(
          `items[${it.idx}].descripcion_actividad es requerido para tipo_item=${it.tipo_item}`
        );
      }
    }

    const perfilesIds = [
      ...new Set(items.map((i) => i.id_perfil).filter(Boolean)),
    ];

    const { rows: perfilesRows } = await client.query(
      `
      SELECT DISTINCT pp.id_perfil
      FROM personas_perfiles pp
      WHERE pp.id_persona = $1
        AND (pp.vigente IS TRUE OR pp.vigente IS NULL)
        AND pp.id_perfil = ANY($2::int[])
    `,
      [id_persona, perfilesIds]
    );

    const perfilesValidos = new Set(perfilesRows.map((r) => r.id_perfil));
    const faltantes = perfilesIds.filter((id) => !perfilesValidos.has(id));
    if (faltantes.length) {
      throw new Error(
        `La persona no tiene asignados los perfiles: ${faltantes.join(", ")}`
      );
    }

    const { rows: tarifasRows } = await client.query(
      `
      SELECT 
        pp.id_perfil,
        t.codigo_cargo,
        t.aplica_materias,
        t.monto_hora
      FROM personas_perfiles pp
      JOIN perfil_tarifa t 
        ON t.id_perfil = pp.id_perfil
      WHERE pp.id_persona = $1
        AND (pp.vigente IS TRUE OR pp.vigente IS NULL)
        AND t.activo = TRUE
    `,
      [id_persona]
    );

    if (!tarifasRows.length) {
      throw new Error(
        "No hay tarifas configuradas para los perfiles vigentes de la persona"
      );
    }

    const keyTarifa = (r) =>
      `${r.id_perfil}__${String(r.codigo_cargo).toUpperCase()}__${
        r.aplica_materias ? "M" : "A"
      }`;

    const tarifaMap = new Map(
      tarifasRows.map((r) => [keyTarifa(r), Number(r.monto_hora)])
    );

    items = items.map((it) => {
      const isDocencia = it.tipo_item === "DOCENCIA";
      const clave = `${it.id_perfil}__${it.codigo_cargo}__${
        isDocencia ? "M" : "A"
      }`;
      const tarifa = tarifaMap.get(clave);

      if (!tarifa) {
        throw new Error(
          `No se encontró tarifa para perfil=${it.id_perfil}, cargo=${it.codigo_cargo}, aplica_materias=${isDocencia}`
        );
      }

      const monto_hora = tarifa;
      const subtotal_mensual = it.horas_semanales * 4 * monto_hora;

      return {
        ...it,
        monto_hora,
        subtotal_mensual,
      };
    });

    const totalHorasSem = items.reduce(
      (acc, it) => acc + it.horas_semanales,
      0
    );
    const horasMensuales = totalHorasSem * 4;
    const totalImporteMensual = items.reduce(
      (acc, it) => acc + it.subtotal_mensual,
      0
    );
    const montoHoraPromedio =
      totalHorasSem > 0 ? totalImporteMensual / horasMensuales : null;

    const { rows: overlap } = await client.query(
      `
      SELECT 1
      FROM contrato
      WHERE id_persona = $1
        AND daterange(fecha_inicio::date, COALESCE(fecha_fin::date, 'infinity'::date))
            && daterange($2::date, COALESCE($3::date, 'infinity'::date))
      LIMIT 1
    `,
      [id_persona, fecha_inicio, fecha_fin || null]
    );

    if (overlap.length) {
      throw new Error(
        "Solapamiento detectado: la persona ya tiene un contrato en ese rango de fechas"
      );
    }

    const insertContrato = `
      INSERT INTO contrato (
        id_persona, id_periodo,
        fecha_inicio, fecha_fin,
        horas_semanales, horas_mensuales,
        monto_hora_promedio, total_importe_mensual
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const { rows: contratoRows } = await client.query(insertContrato, [
      id_persona,
      id_periodo,
      fecha_inicio,
      fecha_fin || null,
      totalHorasSem || null,
      horasMensuales || null,
      montoHoraPromedio,
      totalImporteMensual,
    ]);
    const contrato = contratoRows[0];

    // Insertar ítems
    const insertItem = `
      INSERT INTO contrato_item (
        id_contrato,
        id_perfil,
        tipo_item,
        id_materia,
        descripcion_actividad,
        codigo_cargo,
        horas_semanales,
        monto_hora,
        subtotal_mensual
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;

    for (const it of items) {
      await client.query(insertItem, [
        contrato.id_contrato,
        it.id_perfil,
        it.tipo_item,
        it.id_materia,
        it.descripcion_actividad,
        it.codigo_cargo,
        it.horas_semanales,
        it.monto_hora,
        it.subtotal_mensual,
      ]);
    }

    await client.query("COMMIT");
    return { ...contrato, items };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en createContratoGeneral:", err);
    throw err;
  } finally {
    client.release();
  }
}

export const crearContratoProfesor = createContrato;
