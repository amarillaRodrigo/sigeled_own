import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const {
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM_NAME = "SIGELED",
    FRONTEND_URL = "http://localhost:5173",
    EMAIL_LOGO_URL,
} = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let transporter = null;

if (!SMTP_USER || !SMTP_PASS) {
        console.warn("SMTP_USER o SMTP_PASS no están configuradas.");
    } else {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
            },
    });

    transporter.verify((err, success) => {
        if (err) {
        console.error("Error verificando transporte de email:", err.message);
        } else {
        console.log("Transporte de email listo para enviar correos");
        }
    });
}

const COLORS = {
    bg: "#030C14",
    accent: "#19F124",
    text: "#ffffff",
};

const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("es-AR");
};

const buildContratoConceptosHtml = (contrato) => {
    let rows = [];
    let modo = null;

    if (Array.isArray(contrato.items) && contrato.items.length) {
        rows = contrato.items;
        modo = "GENERAL";
    } else if (Array.isArray(contrato.materias) && contrato.materias.length) {
        rows = contrato.materias;
        modo = "PROFESOR";
    } else {
        return "";
    }

    let htmlRows = "";
    const max = 10;

    rows.forEach((it, idx) => {
        if (idx >= max) return;

        let tipoLabel = "Actividad";

        const tipoRaw = (it.tipo_item || "").toString().toUpperCase();
        if (modo === "PROFESOR") {
        tipoLabel = "Docencia";
        } else if (tipoRaw === "DOCENCIA") {
        tipoLabel = "Docencia";
        } else if (tipoRaw === "COORDINACION") {
        tipoLabel = "Coordinación";
        } else if (tipoRaw) {
        tipoLabel = tipoRaw.charAt(0) + tipoRaw.slice(1).toLowerCase();
        }

        const nombreConcepto =
        it.descripcion_materia ||
        it.descripcion_actividad ||
        "Sin descripción";

        const carrera = it.carrera || null;
        const anio = it.anio || null;

        const cargo = it.codigo_cargo || it.cargo || null;
        const horas =
        it.horas_semanales != null
            ? `${Number(it.horas_semanales)} h/sem`
            : null;
        const montoHora =
        it.monto_hora != null
            ? `$ ${Number(it.monto_hora).toFixed(2)}/h`
            : null;

        htmlRows += `
        <tr>
            <td style="padding:6px 0; font-size:13px; color:${COLORS.text};">
            <span style="color:${COLORS.accent}; font-weight:600;">${tipoLabel}</span>
            · ${nombreConcepto}
            ${carrera ? ` · ${carrera}` : ""}
            ${anio ? ` · ${anio}` : ""}
            ${cargo ? ` · <span style="color:${COLORS.accent};">${cargo}</span>` : ""}
            ${horas ? ` · ${horas}` : ""}
            ${montoHora ? ` · ${montoHora}` : ""}
            </td>
        </tr>
        `;
    });

    if (rows.length > max) {
        htmlRows += `
        <tr>
            <td style="padding-top:4px; font-size:12px; color:rgba(255,255,255,0.7);">
            + ${rows.length - max} conceptos adicionales...
            </td>
        </tr>
        `;
    }

    return `
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:12px;">
        <tbody>
            ${htmlRows}
        </tbody>
        </table>
    `;
};


export const buildContratoAsignadoEmail = ({ nombre = "Usuario", contrato }) => {
    const subject = "Se te asignó un nuevo contrato en SIGELED";

    const logoUrl = EMAIL_LOGO_URL;
    const idVisible =
        contrato.id_contrato_profesor || contrato.id_contrato || contrato.id;
    const contratoUrl = `${FRONTEND_URL}/dashboard/contratos/${idVisible}`;

    const fechaInicio = formatDate(contrato.fecha_inicio);
    const fechaFin = formatDate(contrato.fecha_fin);
    const periodo =
        contrato.periodo_descripcion || contrato.nombre_periodo || null;

    const horasSem =
        contrato.horas_semanales != null
        ? `${Number(contrato.horas_semanales)} h/sem`
        : null;
    const horasMens =
        contrato.horas_mensuales != null
        ? `${Number(contrato.horas_mensuales)} h/mes`
        : null;
    const montoPromedio =
        contrato.monto_hora != null
        ? `$ ${Number(contrato.monto_hora).toFixed(2)}/h`
        : null;

    const conceptosHtml = buildContratoConceptosHtml(contrato);

    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
    </head>
    <body style="margin:0; padding:0; background-color:${COLORS.bg}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg}; padding:24px 0;">
        <tr>
        <td align="center">
            <table width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg}; border-radius:16px; border:1px solid #0f2535; padding:24px 32px 32px 32px;">
            
            <!-- Logo -->
            <tr>
                <td align="left" style="padding-bottom:16px;">
                ${
                    logoUrl
                    ? `<img src="${logoUrl}" alt="SIGELED" style="display:block; height:50px; width:auto;" />`
                    : ""
                }
                </td>
            </tr>

            <tr>
                <td align="center" style="padding-bottom:16px;">
                <h1 style="margin:0; font-size:24px; color:${COLORS.accent};">
                    SIGELED · Nuevo contrato asignado
                </h1>
                </td>
            </tr>

            <tr>
                <td style="font-size:16px; line-height:1.6; color:${COLORS.text};">
                <p style="margin:0 0 12px 0;">Hola <strong style="color:${COLORS.accent};">${nombre}</strong>,</p>
                <p style="margin:0 0 12px 0;">
                    Te informamos que se te asignó un nuevo contrato en 
                    <strong style="color:${COLORS.accent};">SIGELED</strong>.
                </p>

                <p style="margin:12px 0 8px 0; font-weight:600; color:${COLORS.accent};">
                    Resumen del contrato:
                </p>

                <ul style="margin:0 0 16px 20px; padding:0; font-size:14px; color:${COLORS.text};">
                    ${
                    periodo
                        ? `<li style="margin-bottom:4px;">Período: <strong style="color:${COLORS.accent};">${periodo}</strong></li>`
                        : ""
                    }
                    ${
                    fechaInicio || fechaFin
                        ? `<li style="margin-bottom:4px;">Vigencia: <strong style="color:${COLORS.accent};">${fechaInicio || "Sin inicio definido"}</strong> → <strong style="color:${COLORS.accent};">${fechaFin || "Sin fecha de fin"}</strong></li>`
                        : ""
                    }
                    ${
                    horasSem
                        ? `<li style="margin-bottom:4px;">Carga horaria: <strong style="color:${COLORS.accent};">${horasSem}${
                            horasMens ? ` (${horasMens})` : ""
                        }</strong></li>`
                        : ""
                    }
                    ${
                    montoPromedio
                        ? `<li style="margin-bottom:4px;">Monto promedio /hora: <strong style="color:${COLORS.accent};">${montoPromedio}</strong></li>`
                        : ""
                    }
                </ul>

                ${
                    conceptosHtml
                    ? `<p style="margin:0 0 4px 0; font-size:14px; color:${COLORS.text};">
                        Principales conceptos del contrato:
                        </p>
                        ${conceptosHtml}`
                    : ""
                }
                </td>
            </tr>

            <tr>
                <td align="center" style="padding:20px 0 8px 0;">
                <a href="${contratoUrl}"
                    style="display:inline-block; padding:12px 24px; border-radius:999px; background-color:${COLORS.accent}; color:${COLORS.bg}; font-weight:600; text-decoration:none; font-size:14px;">
                    Ver contrato en SIGELED
                </a>
                </td>
            </tr>

            <tr>
                <td style="font-size:13px; line-height:1.6; color:${COLORS.text}; padding-top:16px;">
                <p style="margin:0 0 8px 0;">
                    Si tenés dudas sobre los detalles o necesitás realizar alguna corrección, comunicate con el área de RRHH o administración del IPF.
                </p>
                <p style="margin:0;">
                    <strong style="color:${COLORS.accent};">Equipo SIGELED</strong>
                </p>
                </td>
            </tr>

            <tr>
                <td align="center" style="padding-top:24px; font-size:11px; color:rgba(255,255,255,0.6);">
                Este mensaje fue enviado automáticamente por <strong style="color:${COLORS.accent};">SIGELED</strong>.
                </td>
            </tr>

            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>`;

    const text = `
    Hola ${nombre},

    Se te asignó un nuevo contrato en SIGELED.

    ${
    periodo
        ? `Período: ${periodo}
    `
        : ""
    }${
        fechaInicio || fechaFin
        ? `Vigencia: ${fechaInicio || "Sin inicio definido"} → ${
            fechaFin || "Sin fecha de fin"
            }
    `
        : ""
    }${horasSem ? `Carga horaria: ${horasSem}${horasMens ? ` (${horasMens})` : ""}\n` : ""}${
        montoPromedio ? `Monto promedio /hora: ${montoPromedio}\n` : ""
    }

    Podés ver el contrato en: ${contratoUrl}

    Equipo SIGELED
    `.trim();

    return { subject, html, text };
    };

    export const sendContratoAsignadoEmail = async ({ to, nombre, contrato }) => {
    if (!to) return;
    const { subject, html, text } = buildContratoAsignadoEmail({
        nombre,
        contrato,
    });
    await sendEmail({ to, subject, html, text });
};

export const buildContratoPorVencerEmail = ({
        nombre = "Usuario",
        fechaFin,
        diasRestantes,
        contratoId,
    }) => {
        const fechaFinFmt = formatDate(fechaFin);
        const subject =
            diasRestantes === 0
            ? "Tu contrato en SIGELED vence hoy"
            : `Tu contrato en SIGELED vence el ${fechaFinFmt}`;

        const logoUrl = EMAIL_LOGO_URL;
        const contratoUrl = `${FRONTEND_URL}/dashboard/contratos/${contratoId}`;

        const mensajeDias =
            diasRestantes === 0
            ? "tu contrato tiene fecha de finalización hoy."
            : `tu contrato tiene fecha de finalización el ${fechaFinFmt} (faltan ${diasRestantes} día(s)).`;

        const html = `<!DOCTYPE html>
        <html lang="es">
        <head>
        <meta charset="UTF-8" />
        <title>${subject}</title>
        </head>
        <body style="margin:0; padding:0; background-color:${COLORS.bg}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg}; padding:24px 0;">
            <tr>
            <td align="center">
                <table width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg}; border-radius:16px; border:1px solid #0f2535; padding:24px 32px 32px 32px;">
                
                <tr>
                    <td align="left" style="padding-bottom:16px;">
                    ${
                        logoUrl
                        ? `<img src="${logoUrl}" alt="SIGELED" style="display:block; height:50px; width:auto;" />`
                        : ""
                    }
                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding-bottom:16px;">
                    <h1 style="margin:0; font-size:24px; color:${COLORS.accent};">
                        SIGELED · Aviso de vencimiento de contrato
                    </h1>
                    </td>
                </tr>

                <tr>
                    <td style="font-size:16px; line-height:1.6; color:${COLORS.text};">
                    <p style="margin:0 0 12px 0;">Hola <strong style="color:${COLORS.accent};">${nombre}</strong>,</p>
                    <p style="margin:0 0 12px 0;">
                        Te recordamos que ${mensajeDias}
                    </p>

                    <p style="margin:0 0 16px 0; font-size:14px;">
                        Si necesitás consultas sobre renovación, continuidad u otros cambios, comunicate con el área de RRHH o administración del IPF.
                    </p>
                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding:20px 0 8px 0;">
                    <a href="${contratoUrl}"
                        style="display:inline-block; padding:12px 24px; border-radius:999px; background-color:${COLORS.accent}; color:${COLORS.bg}; font-weight:600; text-decoration:none; font-size:14px;">
                        Ver contrato en SIGELED
                    </a>
                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding-top:24px; font-size:11px; color:rgba(255,255,255,0.6);">
                    Este mensaje fue enviado automáticamente por <strong style="color:${COLORS.accent};">SIGELED</strong>.
                    </td>
                </tr>

                </table>
            </td>
            </tr>
        </table>
        </body>
        </html>`;

        const text = `
        Hola ${nombre},

        Te recordamos que ${mensajeDias}

        Podés ver los detalles del contrato en:
        ${contratoUrl}

        Equipo SIGELED
        `.trim();

        return { subject, html, text };
        };

export const sendContratoPorVencerEmail = async ({
        to,
        nombre,
        fechaFin,
        diasRestantes,
        contratoId,
    }) => {
    if (!to) return;
        const { subject, html, text } = buildContratoPorVencerEmail({
            nombre,
            fechaFin,
            diasRestantes,
            contratoId,
        });
    await sendEmail({ to, subject, html, text });
};


export const sendEmail = async ({
    to,
    subject,
    html,
    text,
    attachments = [],
    }) => {
    if (!transporter) {
        console.warn("Envío de email omitido: transporter no está configurado");
        return;
    }

    try {
        await transporter.sendMail({
        from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
        to,
        subject,
        html,
        text,
        attachments,
        });
    } catch (error) {
        console.error("Error al enviar email:", error.message);
    }
    };

export const buildAccountStatusEmail = ({ nombre = 'Usuario', estadoActivo }) => {
    const subject = estadoActivo
        ? 'Tu cuenta en SIGELED fue activada'
        : 'Tu cuenta en SIGELED cambió de estado';

    const estadoTexto = estadoActivo ? 'ACTIVADA' : 'DESACTIVADA';
    const mensajePrincipal = estadoActivo
        ? 'A partir de este momento podés ingresar al sistema con tu cuenta habilitada.'
        : 'Por el momento tu cuenta fue deshabilitada. Si creés que se trata de un error, contactá con el área de RRHH o administración del IPF.';

    const loginUrl = `${FRONTEND_URL}/login`;

    const logoUrl = EMAIL_LOGO_URL;

const html = `<!DOCTYPE html>
    <html lang="es">
        <head>
        <meta charset="UTF-8" />
        <title>${subject}</title>
        </head>
        <body style="margin:0; padding:0; background-color:#030C14; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#030C14; padding:24px 0;">
            <tr>
            <td align="center">
                <table width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#030C14; border-radius:16px; border:1px solid #0f2535; padding:24px 32px 32px 32px;">
                
                <tr>
                    <td align="left" style="padding-bottom:16px;">
                    ${
                        logoUrl
                        ? `<img src="${logoUrl}" alt="SIGELED" style="display:block; height:50px; width:auto;" />`
                        : ''
                    }
                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding-bottom:16px;">
                    <h1 style="margin:0; font-size:24px; color:#19F124;">
                        SIGELED · Estado de tu cuenta
                    </h1>
                    </td>
                </tr>

                <tr>
                    <td style="font-size:16px; line-height:1.6; color:#ffffff;">
                    <p style="margin:0 0 12px 0;">Hola <strong style="color:#19F124;">${nombre}</strong>,</p>
                    <p style="margin:0 0 12px 0;">
                        Te informamos que el estado de tu cuenta en
                        <strong style="color:#19F124;"> SIGELED </strong> ha cambiado.
                    </p>
                    <p style="margin:0 0 12px 0;">
                        Estado actual de tu cuenta:
                        <strong style="color:#19F124;">${estadoTexto}</strong>
                    </p>
                    <p style="margin:0 0 16px 0;">
                        ${mensajePrincipal}
                    </p>
                    </td>
                </tr>

                ${
                    estadoActivo
                    ? `
                <tr>
                    <td align="center" style="padding:20px 0 8px 0;">
                    <a href="${loginUrl}"
                        style="display:inline-block; padding:12px 24px; border-radius:999px; background-color:#19F124; color:#030C14; font-weight:600; text-decoration:none; font-size:14px; ">
                        Ir al inicio de sesión
                    </a>
                    </td>
                </tr>
                `
                    : ''
                }

                <tr>
                    <td style="font-size:13px; line-height:1.6; color:#ffffff; padding-top:16px;">
                    <p style="margin:0 0 8px 0;">
                        Si no reconocés este cambio o tenés dudas, respondé a este correo o comunicate con el área correspondiente del IPF.
                    </p>
                    <p style="margin:0;">
                        <strong style="color:#19F124;">Equipo SIGELED</strong>
                    </p>
                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding-top:24px; font-size:11px; color:rgba(255,255,255,0.6);">
                    Este mensaje fue enviado automáticamente por <strong style="color:#19F124;">SIGELED</strong>. Por favor, no respondas a este correo si no es necesario.
                    </td>
                </tr>

                </table>
            </td>
            </tr>
        </table>
        </body>
    </html>`;

        const text = `
    Hola ${nombre},

    El estado de tu cuenta en SIGELED ha cambiado.

    Estado actual: ${estadoTexto}

    ${mensajePrincipal}

    Si no reconocés este cambio o tenés dudas, comunicate con el área de RRHH o administración del IPF.

    Equipo SIGELED
    `.trim();

    return { subject, html, text };
};


export const sendAccountStatusEmail = async ({ to, nombre, estadoActivo }) => {
    const { subject, html, text } = buildAccountStatusEmail({
        nombre,
        estadoActivo,
    });

    await sendEmail({
        to,
        subject,
        html,
        text,
    });
};
