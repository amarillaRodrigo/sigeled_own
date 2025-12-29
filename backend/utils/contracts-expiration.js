import cron from "node-cron";
import db from "../models/db.js";
import { notifyUser, notifyAdminsRRHH } from "./notify.js";
import { sendContratoPorVencerEmail } from "./email.js";

function parseDateOnly(value) {
    if (!value) return null;

    if (value instanceof Date) {
            return new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate()
        );
    }

    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]) - 1; 
        const day = Number(m[3]);
        return new Date(year, month, day);
    }

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

cron.schedule("0 9 * * *", async () => {
    const dias = 30;
    console.log("[CRON CONTRATOS] Chequeando contratos por vencer en", dias, "días...");

    try {
        const { rows } = await db.query(
        `
        WITH rango AS (
            SELECT 
            CURRENT_DATE AS hoy,
            CURRENT_DATE + $1 * INTERVAL '1 day' AS hasta
        )
        SELECT 
            c.id_contrato                           AS id_contrato,
            c.fecha_fin,
            c.id_persona,
            u.id_usuario,
            u.email,
            p.nombre,
            p.apellido,
            'GENERAL'                               AS tipo_contrato
        FROM contrato c
        JOIN personas p ON p.id_persona = c.id_persona
        LEFT JOIN usuarios u ON u.id_persona = c.id_persona
        CROSS JOIN rango r
        WHERE c.fecha_fin IS NOT NULL
            AND c.fecha_fin::date BETWEEN r.hoy AND r.hasta

        UNION ALL

        SELECT 
            cp.id_contrato_profesor                AS id_contrato,
            cp.fecha_fin,
            cp.id_persona,
            u.id_usuario,
            u.email,
            p.nombre,
            p.apellido,
            'PROFESOR'                             AS tipo_contrato
        FROM contrato_profesor cp
        JOIN personas p ON p.id_persona = cp.id_persona
        LEFT JOIN usuarios u ON u.id_persona = cp.id_persona
        CROSS JOIN rango r
        WHERE cp.fecha_fin IS NOT NULL
            AND cp.fecha_fin::date BETWEEN r.hoy AND r.hasta
        `,
        [dias]
        );

        console.log(
        `[CRON CONTRATOS] Encontrados ${rows.length} contratos por vencer (<= ${dias} días)`
        );

        if (!rows.length) return;

        for (const c of rows) {
            const hoy = parseDateOnly(new Date());
            const fechaFin = parseDateOnly(c.fecha_fin);

            if (!fechaFin || !hoy) {
                console.warn("[CRON CONTRATOS] No se pudo parsear fecha_fin para contrato", c.id_contrato, c.fecha_fin);
                continue;
            }

            const diffMs = fechaFin.getTime() - hoy.getTime();
            const diasRestantes = Math.max(
                0,
                Math.round(diffMs / (1000 * 60 * 60 * 24))
            );

            const nombreCompleto = [c.nombre, c.apellido].filter(Boolean).join(" ") || "Empleado";

            if (c.id_usuario) {
                await notifyUser(c.id_usuario, {
                tipo: "CONTRATO_POR_VENCER",
                mensaje: `Tu contrato vence el ${fechaFin.toLocaleDateString("es-AR")}`,
                link: `/dashboard/contratos/${c.id_contrato}`,
                meta: {
                    id_contrato: c.id_contrato,
                    fecha_fin: c.fecha_fin,
                    dias_restantes: diasRestantes,
                    tipo_contrato: c.tipo_contrato,
                },
                nivel: "warning",
                });
            }

            if (c.email) {
                await sendContratoPorVencerEmail({
                to: c.email,
                nombre: nombreCompleto,
                fechaFin,
                diasRestantes,
                contratoId: c.id_contrato,
                });
            }
        }

        await notifyAdminsRRHH({
        tipo: "CONTRATOS_POR_VENCER_RESUMEN",
        mensaje: `Contratos por vencer en ${dias} días: ${rows.length}`,
        link: `/dashboard/contratos?vencenEn=${dias}`,
        meta: { dias, cantidad: rows.length },
        nivel: "warning",
        });
    } catch (err) {
        console.error("[CRON CONTRATOS] Error en job de vencimientos:", err.message);
    }
});
