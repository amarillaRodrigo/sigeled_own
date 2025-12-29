import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import {
    AlignmentType,
    Document,
    Header,
    ImageRun,
    Packer,
    Paragraph,
    TextRun,
} from "docx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEADER_IMAGE_PATH = path.resolve(__dirname, "encabezado-contrato.jpg");

const DEFAULT_FONT = "Times New Roman";
const DEFAULT_SIZE = 24;

function sanitizeText(text) {
    if (text === null || text === undefined) return "";

    let str = String(text);

    str = str
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    const badChars = str.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g);
    if (badChars) {
        console.warn(
            "[documentGenerator] Caracteres de control eliminados:",
            badChars.map((c) => c.charCodeAt(0).toString(16))
        );
    }

    str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

    return str;
}



function R(text, opts = {}) {
    return new TextRun({
        text: sanitizeText(text),
        font: DEFAULT_FONT,
        size: DEFAULT_SIZE,
        ...opts,
    });
}

function loadHeaderImage() {
    try {
        const buf = fs.readFileSync(HEADER_IMAGE_PATH);

        if (!buf || buf.length < 100) {
            console.warn("[documentGenerator] Imagen de encabezado demasiado pequeña o vacía");
            return null;
        }

        return buf;
    } catch (err) {
        console.warn(
            "[documentGenerator] No se encontró la imagen de encabezado en:",
            HEADER_IMAGE_PATH,
            err.message
        );
        return null;
    }
}


function buildHeader() {
    const imgBuffer = loadHeaderImage();
    if (!imgBuffer) {
        return new Header({
            children: [
                new Paragraph({
                    children: [R("INSTITUTO POLITÉCNICO FORMOSA", { bold: true })],
                    alignment: AlignmentType.CENTER,
                }),
            ],
        });
    }

    return new Header({
        children: [
            new Paragraph({
                children: [
                    new ImageRun({
                        data: imgBuffer,
                        transformation: {
                            width: 600,
                            height: 90,
                        },
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
        ],
    });
}


const MESES_LARGO = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];

function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatFechaActa(fecha) {
    const d = toDate(fecha) || new Date();
    const dia = d.getDate();
    const mes = MESES_LARGO[d.getMonth()];
    const anio = d.getFullYear();
    return `${dia} días del mes de ${mes} del año ${anio}`;
}

function formatFechaCortaTexto(fecha) {
    const d = toDate(fecha);
    if (!d) return "__ de ______";
    const dia = pad2(d.getDate());
    const mes = MESES_LARGO[d.getMonth()];
    return `${dia} de ${mes}`;
}

function formatFechaRangoClausula2(fechaInicio, fechaFin) {
    const ini = toDate(fechaInicio);
    const fin = toDate(fechaFin);
    if (!ini || !fin) {
        return "desde __ de ______ al __ de ______ del año ____";
    }
    const iniTxt = formatFechaCortaTexto(ini);
    const finTxt = formatFechaCortaTexto(fin);
    const anio = fin.getFullYear();
    return `desde ${iniTxt} al ${finTxt} del año ${anio}`;
}

function calcularCuotasMensuales(fechaInicio, fechaFin) {
    const ini = toDate(fechaInicio);
    const fin = toDate(fechaFin);
    if (!ini || !fin) return 1;
    let months =
        (fin.getFullYear() - ini.getFullYear()) * 12 +
        (fin.getMonth() - ini.getMonth()) +
        1;
    if (months < 1) months = 1;
    return months;
}

function formatMoneyAr(num) {
    const n = Number(num || 0);
    return n.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function normalizeItems(rawContrato) {
    let items = rawContrato?.items;

    if (typeof items === "string") {
        try {
            items = JSON.parse(items);
        } catch {
            items = [];
        }
    }

    if (!Array.isArray(items) || !items.length) {
        let materias = rawContrato?.materias;
        if (typeof materias === "string") {
            try {
                materias = JSON.parse(materias);
            } catch {
                materias = [];
            }
        }

        if (Array.isArray(materias) && materias.length) {
            items = materias.map((m) => {
                const horas = Number(m.horas_semanales) || 0;
                const monto = Number(m.monto_hora) || 0;
                const subtotal = horas * 4 * monto; 

                return {
                    tipo_item: "DOCENCIA",
                    descripcion_materia: m.descripcion_materia,
                    descripcion_actividad: null,
                    codigo_cargo: m.cargo || null,
                    horas_semanales: horas,
                    monto_hora: monto,
                    subtotal_mensual: subtotal,
                    perfil_codigo: null,
                    perfil_nombre: null,
                };
            });
        } else {
            items = [];
        }
    }

    return items.map((it) => {
        const horas = Number(it.horas_semanales) || 0;
        const monto = Number(it.monto_hora) || 0;
        const subtotal =
            it.subtotal_mensual != null
                ? Number(it.subtotal_mensual)
                : horas * 4 * monto;

        return {
            tipo_item: String(it.tipo_item || "").toUpperCase(),
            descripcion_materia: it.descripcion_materia || it.descripcion || null,
            descripcion_actividad: it.descripcion_actividad || null,
            codigo_cargo: it.codigo_cargo || it.cargo || null,
            horas_semanales: horas,
            monto_hora: monto,
            subtotal_mensual: subtotal,
            perfil_codigo: it.perfil_codigo || null,
            perfil_nombre: it.perfil_nombre || null,
        };
    });
}


function computeContratoData(raw) {
    const items = normalizeItems(raw);

    const nombreCompleto =
        `${raw.persona_apellido ?? ""} ${raw.persona_nombre ?? ""}`
            .trim()
            .replace(/\s+/g, " ") || "................................";

    let totalHorasSem =
        raw.horas_semanales != null
            ? Number(raw.horas_semanales)
            : items.reduce(
                (acc, it) => acc + (Number(it.horas_semanales) || 0),
                0
            );

    if (!Number.isFinite(totalHorasSem)) totalHorasSem = 0;

    let totalHorasMens =
        raw.horas_mensuales != null
            ? Number(raw.horas_mensuales)
            : totalHorasSem * 4;

    if (!Number.isFinite(totalHorasMens)) totalHorasMens = 0;

    let totalImporteMensual;
    if (raw.total_importe_mensual != null) {
        totalImporteMensual = Number(raw.total_importe_mensual);
    } else if (items.length) {
        totalImporteMensual = items.reduce(
            (acc, it) => acc + (Number(it.subtotal_mensual) || 0),
            0
        );
    } else if (raw.horas_mensuales != null && raw.monto_hora != null) {
        totalImporteMensual =
            Number(raw.horas_mensuales) * Number(raw.monto_hora || 0);
    } else {
        totalImporteMensual = 0;
    }

    if (!Number.isFinite(totalImporteMensual)) totalImporteMensual = 0;

    return {
        nombreCompleto,
        items,
        totalHorasSem,
        totalHorasMens,
        totalImporteMensual,
    };
}



function buildTemplateData(raw) {
    const data = computeContratoData(raw);

    const fechaInicio = toDate(raw.fecha_inicio);
    const fechaFin = toDate(raw.fecha_fin);
    const fechaActaTexto = formatFechaActa(fechaInicio || new Date());
    const rangoDuracion = formatFechaRangoClausula2(fechaInicio, fechaFin);
    const cuotasMensuales = calcularCuotasMensuales(fechaInicio, fechaFin);

    const montoMensual = data.totalImporteMensual || 0;
    const montoTotalContrato = montoMensual * cuotasMensuales;
    const montoTotalNumero = formatMoneyAr(montoTotalContrato);

    const idContratoBase = raw.id_contrato ?? raw.id_contrato_profesor ?? 0;
    const yearShort = (fechaInicio || new Date())
        .getFullYear()
        .toString()
        .slice(-2);
    const numeroContrato = `${idContratoBase}/${yearShort}`;

    const nombrePersona =
        data.nombreCompleto.toUpperCase() || "................................";

    const dni =
        raw.dni || raw.persona_dni || raw.documento || null;
    const domicilio =
        raw.domicilio || raw.persona_domicilio || null;
    const tituloProfesional =
        raw.titulo_profesional || raw.titulo || null;

    const partesPrestador = [];

    if (dni) {
        partesPrestador.push(`titular del DNI Nº ${dni}`);
    }
    if (domicilio) {
        partesPrestador.push(`con domicilio en ${domicilio}`);
    }
    if (tituloProfesional) {
        partesPrestador.push(`en su carácter de ${tituloProfesional}`);
    }

    let prestadorFrase;

    if (
        nombrePersona === "................................" &&
        partesPrestador.length === 0
    ) {
        prestadorFrase =
            ".................................................................";
    } else {
        prestadorFrase = `${nombrePersona}${
            partesPrestador.length ? `, ${partesPrestador.join(", ")}` : ""
        }`;
    }

    let cuotasTexto;
    if (cuotasMensuales === 5) {
        cuotasTexto = "cinco (5)";
    } else {
        cuotasTexto = `${cuotasMensuales} (${cuotasMensuales})`;
    }

    return {
        numeroContrato,
        fechaActaTexto,
        prestadorFrase,
        rangoDuracion,
        montoTotalNumero,
        cuotasTexto,
    };
}


const CLAUSULA_1_TEXTO =
    "EL PRESTADOR llevará a cabo la función de coordinador de la Tecnicatura Superior en Mecatrónica, y, entre otras actividades asignadas por EL COMITENTE, deberá encargarse de la gestión y control de la preinscripción y del cursillo de ingreso, modalidad y evaluaciones, organizar y coordinar el cronograma del ciclo lectivo, a saber, clases, exámenes ordinarios y recuperatorios, proponer docentes, verificar que las materias se dicten conforme a los programas aprobados y contenidos mínimos, mantener actualizados los contenidos de la carrera de acuerdo al diseño curricular, controlar asistencia de docentes y de alumnos a través de los preceptores, mantener vinculo constante con preceptores y docentes y entre los docentes y la coordinadora de carreras, solicitar y recabar toda la información y documentación a cargo de docentes y mantener informado a EL COMITENTE acerca de toda circunstancia vinculada con sus funciones. Asimismo, EL PRESTADOR realizará toda otra actividad encomendada por EL COMITENTE que esté vinculada con el objeto del presente contrato. Siendo su obligación cumplir con la carga horaria fijada (horas reloj) para el cursado de la/s asignatura/s y mantener informado a EL COMITENTE acerca de todos los hechos que se susciten con relación a los alumnos en el contexto del dictado de las materias, debiendo conducirse en todo momento con diligencia, buena fe, respeto, decoro y colaboración de acuerdo al Acuerdo Institucional de Convivencia aprobado. EL PRESTADOR cumplirá con las tareas asignadas bajo la supervisión técnica de EL COMITENTE y, específicamente, de la Coordinadora de Carreras del Instituto Politécnico Formosa, Dra. Alicia Noemí Alcaraz, quien estará encargada de certificar la entrega y aprobación de los servicios prestados, conforme a las pautas que fije el procedimiento y organización administrativa vigente.";

const CLAUSULA_4_TEXTO =
    "EL PRESTADOR es responsable de su empadronamiento en legal tiempo y forma en los organismos de la seguridad social y de recaudación nacional, provincial y municipal que correspondieren, estando a su exclusivo cargo el pago de los aportes, contribuciones y tributos respectivos. Asimismo, EL PRESTADOR declara poseer los seguros obligatorios y que los mismos están vigentes, liberando en tal sentido a EL COMITENTE y a la Provincia de Formosa de toda responsabilidad por accidentes ocurridos y daños generados en el marco de los servicios encomendados. EL PRESTADOR es responsable exclusivo de la contratación y pago de los cánones correspondientes a la obra social, asistencia médica u otra cobertura de salud que opte.";

const CLAUSULA_5_TEXTO =
    "En ningún caso EL PRESTADOR será considerado funcionario y/o agente de EL COMITENTE o de la Administración Pública Provincial y no le serán aplicables sus estatutos o reglamentos del personal. Este contrato y su ejecución, tampoco importarán o configurarán una relación jurídica laboral o de dependencia con la provincia de Formosa.";

const CLAUSULA_6_TEXTO =
    "El COMITENTE puede desistir del contrato por su sola voluntad y sin invocación de causa, aunque la ejecución haya comenzado, debiendo notificar fehacientemente a EL PRESTADOR con cinco (5) días hábiles de anticipación. En caso de que EL PRESTADOR se vea imposibilitado de cumplir con los términos del presente contrato, deberá notificar fehacientemente y con una anticipación no menor a diez (10) días hábiles a EL COMITENTE a los efectos de la rescisión contractual y la reorganización oportuna de las actividades objeto del presente. Frente al incumplimiento de EL PRESTADOR a las condiciones pautadas en el presente contrato y/u obligaciones asumidas, EL COMITENTE podrá rescindir unilateralmente el contrato mediante una comunicación fehaciente, operando la extinción del contrato desde la notificación. A los fines de evaluar y efectivizar el pago final al que pueda tener derecho EL PRESTADOR, se resolverá sobre la base del informe que elaborará el responsable de su certificación (tiempo de prestación de servicios), el cumplimiento de las obligaciones asumidas y los motivos que dieron lugar a la rescisión. Una vez notificada la voluntad extintiva, EL PRESTADOR deberá restituir a EL COMITENTE los bienes recibidos en razón del contrato.";

const CLAUSULA_7_TEXTO =
    "EL PRESTADOR pondrá en conocimiento de EL COMITENTE toda ocupación, empleo o actividad profesional que haya ejercido o que ejerza, aun encontrándose en uso de licencia de cualquier tipo con el/los Estado/s Nacional, Provincial/es o Municipal/es, Organismos Descentralizados y/u Organismos Internacionales. Esta declaración se hará en los términos y con los alcances legales de una declaración jurada. De resultar falsos o erróneos los datos brindados e insertados en este contrato en carácter de declaración jurada, o si tales actividades a juicio de la Provincia de Formosa resultan incompatibles, El COMITENTE podrá resolver el presente contrato, sin derecho a compensación o indemnización alguna a favor de EL PRESTADOR, reservándose el derecho de accionar legalmente por los daños o perjuicios provocados por la información proporcionada en violación a la presente clausula.";

const CLAUSULA_8_TEXTO =
    "EL PRESTADOR no estará exento de ningún tributo en virtud del presente contrato, actuando EL COMITENTE como agente de retención en los casos que corresponda.";

const CLAUSULA_9_TEXTO =
    "El presente contrato es intuitu personae, quedando expresamente prohibida la cesión total o parcial del mismo, reservándose EL COMITENTE los derechos de accionar legalmente ante la violación de la presente obligación.";

const CLAUSULA_10_TEXTO =
    "Toda subcontratación que demande la ejecución del contrato será responsabilidad exclusiva de EL PRESTADOR. EL COMITENTE y la provincia de Formosa no tendrán ninguna responsabilidad, ni relación de dependencia con el personal subcontratado por EL PRESTADOR. Todo reclamo que pudieran presentar EL PRESTADOR y/o terceros, resultante de la ejecución del presente contrato, deberá dirigirse a la provincia de Formosa. EL PRESTADOR exonera expresamente a EL COMITENTE de cualquier responsabilidad directa o indirecta que pudiera derivarse de la ejecución del presente contrato.";

const CLAUSULA_11_TEXTO =
    "EL PRESTADOR se compromete a mantener en estricta reserva toda la información obtenida con motivo de la ejecución del presente contrato y de las demás actividades académicas, de investigación, desarrollo y/u organizativas de EL COMITENTE a las que tuviere acceso o participación, estándole vedado revelar o difundir cualquier dato, documento o información no clasificada como pública, sin el consentimiento previo escrito de EL COMITENTE, como así también, a observar y adoptar cuantas medidas de seguridad sean necesarias para asegurar la confidencialidad, secreto e integridad de estos datos, documentos e información. Esta obligación de reserva y confidencialidad seguirá en vigencia aún después del vencimiento del plazo del presente contrato o su extinción por cualquier motivo que fuere. Asimismo, EL PRESTADOR asume la responsabilidad penal, civil y/o administrativa a que pudiera dar lugar la violación a esta cláusula.";

const CLAUSULA_12_TEXTO =
    "EL PRESTADOR declara conocer y aceptar los términos del art. 53 del CCyCN, se compromete a respetar sus alcances y colaborar en la promoción y difusión de las actividades organizadas por EL COMITENTE o en las que participe.";

const CLAUSULA_13A_TEXTO =
    "EL COMITENTE será titular exclusivo de los derechos de propiedad intelectual a que pudieran dar lugar las creaciones y los desarrollos obtenidos en el marco del presente contrato y, en este carácter, tendrá la facultad de efectuar los depósitos y/o registros ante los organismos competentes, sin perjuicio del derecho al reconocimiento del/los autores/es y/o inventor/es previsto en las leyes respectivas. Quedando expresamente prohibido a EL PRESTADOR realizar todo acto que implique divulgar los proyectos, trabajos, obras y/o desarrollos en cuestión, sin la expresa autorización de EL COMITENTE.";

const CLAUSULA_13B_TEXTO =
    "Para cualquier divergencia que pudiera surgir en la interpretación y aplicación del presente contrato, las partes se someten a la jurisdicción de los tribunales ordinarios de la ciudad de Formosa, renunciando expresamente a cualquier otro fuero que pudiera corresponder, constituyendo domicilio especial en los domicilios indicados más arriba; donde se considerarán válidas todas las notificaciones.";

const CIERRE_TEXTO =
    "En un todo de conformidad, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto.";

    function buildClausulaPrimeraTexto(rawContrato) {
        const { items } = computeContratoData(rawContrato);

        if (!items || !items.length) {
            return CLAUSULA_1_TEXTO;
        }

        const docencia = items.filter((it) => it.tipo_item === "DOCENCIA");
        const noDocencia = items.filter((it) => it.tipo_item !== "DOCENCIA");

        const partes = [];

        if (docencia.length) {
            const materias = Array.from(
                new Set(
                    docencia
                        .map((it) => it.descripcion_materia)
                        .filter(Boolean)
                )
            );

            let materiasTexto = "";
            if (materias.length === 1) {
                materiasTexto = materias[0];
            } else if (materias.length === 2) {
                materiasTexto = materias.join(" y ");
            } else if (materias.length > 2) {
                materiasTexto =
                    materias.slice(0, -1).join(", ") +
                    " y " +
                    materias[materias.length - 1];
            }

            partes.push(
                `EL PRESTADOR llevará a cabo funciones de docencia, estando a cargo del dictado de la/s siguiente/s asignatura/s: ${materiasTexto}.`
            );
    }

    if (noDocencia.length) {
        const porPerfil = noDocencia.reduce((acc, it) => {
            const key = it.perfil_nombre || it.perfil_codigo || it.tipo_item;
            if (!acc[key]) acc[key] = [];
            acc[key].push(it);
            return acc;
        }, {});

        Object.entries(porPerfil).forEach(([perfil, list]) => {
            const tipo = (list[0].tipo_item || "")
                .toLowerCase()
                .replace(/_/g, " ");
            const descripciones = Array.from(
                new Set(
                    list
                        .map((l) => l.descripcion_actividad)
                        .filter(Boolean)
                )
            );

            if (descripciones.length) {
                partes.push(
                    `Asimismo, EL PRESTADOR realizará actividades de ${tipo} (${perfil}), consistentes en: ${descripciones.join(
                        "; "
                    )}.`
                );
            } else {
                partes.push(
                    `Asimismo, EL PRESTADOR realizará actividades de ${tipo} (${perfil}), según las necesidades que determine EL COMITENTE.`
                );
            }
        });
    }

    const textoCola =
        "En todos los casos, EL PRESTADOR deberá cumplir con la carga horaria fijada (horas reloj) para el dictado de la/s asignatura/s y/o la realización de las actividades contratadas y mantener informado a EL COMITENTE acerca de todos los hechos que se susciten en el marco de las mismas, debiendo conducirse en todo momento con diligencia, buena fe, respeto, decoro y colaboración de acuerdo al Acuerdo Institucional de Convivencia aprobado. EL PRESTADOR cumplirá con las tareas asignadas bajo la supervisión técnica de EL COMITENTE y de las autoridades del Instituto Politécnico Formosa, quienes estarán encargados de certificar la entrega y aprobación de los servicios prestados, conforme a las pautas que fije el procedimiento y organización administrativa vigente.";

    return `${partes.join(" ")} ${textoCola}`;
}


function buildContratoBodyDocx(contrato) {
    const {
        numeroContrato,
        fechaActaTexto,
        prestadorFrase,
        rangoDuracion,
        montoTotalNumero,
        cuotasTexto,
    } = buildTemplateData(contrato);

    const clausula1Texto = buildClausulaPrimeraTexto(contrato);

    const paragraphs = [];

    paragraphs.push(
        new Paragraph({
            children: [
                R(
                    `CONTRATO DE PRESTACIÓN SERVICIOS N° ${numeroContrato}`,
                    { bold: true }
                ),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
        })
    );

    const introTexto =
        `En la ciudad de Formosa, a los ${fechaActaTexto}, ` +
        `entre el INSTITUTO POLITÉCNICO FORMOSA “Dr. Alberto Marcelo Zorrilla”, representado en este acto por el Dr. Horacio Adrián Gorostegui, titular del DNI Nº 28.827.715, en su carácter de DIRECTOR a cargo, constituyendo domicilio contractual en calle Ruta Nacional 81 km 1190 de la provincia de Formosa, República Argentina, en adelante “EL COMITENTE” y ${prestadorFrase}, en adelante “EL PRESTADOR”, se conviene en celebrar el presente contrato de prestación de servicios, el que quedará encuadrado en las previsiones del Código Civil y Comercial de la Nación y se regirá por las cláusulas que se disponen a continuación:`;

    paragraphs.push(
        new Paragraph({
            children: [R(introTexto)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA PRIMERA: OBJETO Y NATURALEZA DE LOS SERVICIOS", {
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(clausula1Texto)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    const clausula2Texto =
        `EL PRESTADOR deberá cumplir en tiempo y forma con todas las actividades mencionadas en la cláusula primera, ${rangoDuracion}.`;

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA SEGUNDA: DURACIÓN", {
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(clausula2Texto)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    const clausula3Texto =
        `El precio por todo concepto es de PESOS ${montoTotalNumero} ($${montoTotalNumero}). ` +
        `El pago se hará en ${cuotasTexto} cuotas mensuales.`;

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA TERCERA: PRECIO DEL CONTRATO Y FORMAS DE PAGO", {
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(clausula3Texto)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                    R("CLÁUSULA CUARTA: APORTES PREVISIONALES",{
                    bold: true,
                })
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_4_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA QUINTA: CONDICIÓN JURÍDICA", {
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_5_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA SEXTA: EXTINCIÓN",{
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_6_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA SEPTIMA: DECLARACIÓN",{
                bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_7_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA OCTAVA: OBLIGACIÓN FISCAL",{
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_8_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA NOVENA: CESIÓN DEL CONTRATO",{
                bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_9_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA DÉCIMA: RESPONSABILIDADES EMERGENTES",{
                bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_10_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA DECIMA PRIMERA: CONFIDENCIALIDAD",{
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_11_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA DÉCIMA SEGUNDA: PROMOCIÓN Y DIFUSIÓN.",{
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_12_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                R("CLÁUSULA DÉCIMA TERCERA: PROPIEDAD INTELECTUAL. TITULARIDAD",{
                    bold: true,
                }),
            ],
            spacing: { after: 80 },
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [R(CLAUSULA_13A_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [R(CIERRE_TEXTO)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
        })
    );

    return paragraphs;
}

export async function generateWordDocument(contrato) {
    const doc = new Document({
        sections: [
            {
                headers: {
                    default: buildHeader(),
                },
                properties: {
                    page: {
                        margin: {
                            top: 2693,
                            right: 1701,
                            bottom: 1701,
                            left: 1417,
                        },
                    },
                },
                children: buildContratoBodyDocx(contrato),
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);

    return buffer;
}

export async function generatePdfDocument(contrato) {
    const {
        numeroContrato,
        fechaActaTexto,
        prestadorFrase,
        rangoDuracion,
        montoTotalNumero,
        cuotasTexto,
    } = buildTemplateData(contrato);

    const clausula1Texto = buildClausulaPrimeraTexto(contrato);
    return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        margin: 72,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    function drawHeader() {
        try {
            if (fs.existsSync(HEADER_IMAGE_PATH)) {
            const width =
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right;

            doc.image(HEADER_IMAGE_PATH, doc.page.margins.left, 20, {
                width,
            });
            doc.moveDown(3);
            }
        } catch (e) {
            console.warn(
                "[documentGenerator] Error al dibujar encabezado PDF:",
                e.message
            );
        } 
    }

    drawHeader();
    doc.on("pageAdded", drawHeader);

    const introTexto =
        `En la ciudad de Formosa, a los ${fechaActaTexto}, ` +
        `entre el INSTITUTO POLITÉCNICO FORMOSA “Dr. Alberto Marcelo Zorrilla”, representado en este acto por el Dr. Horacio Adrián Gorostegui, titular del DNI Nº 28.827.715, en su carácter de DIRECTOR a cargo, constituyendo domicilio contractual en calle Ruta Nacional 81 km 1190 de la provincia de Formosa, República Argentina, en adelante “EL COMITENTE” y ${prestadorFrase}, en adelante “EL PRESTADOR”, se conviene en celebrar el presente contrato de prestación de servicios, el que quedará encuadrado en las previsiones del Código Civil y Comercial de la Nación y se regirá por las cláusulas que se disponen a continuación:`;

    const clausula2Texto =
        `EL PRESTADOR deberá cumplir en tiempo y forma con todas las actividades mencionadas en la cláusula primera, ${rangoDuracion}.`;

    const clausula3Texto =
        `El precio por todo concepto es de PESOS ${montoTotalNumero} ($${montoTotalNumero}). ` +
        `El pago se hará en ${cuotasTexto} cuotas mensuales.`;

    doc.moveDown(2);
    doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(
        `CONTRATO DE PRESTACIÓN SERVICIOS N° ${numeroContrato}`,
        { align: "center" }
    );
    doc.moveDown(1);

    doc
        .fontSize(11)
        .font("Helvetica")
        .text(introTexto, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA PRIMERA: OBJETO Y NATURALEZA DE LOS SERVICIOS");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(clausula1Texto, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA SEGUNDA: DURACIÓN");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(clausula2Texto, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA TERCERA: PRECIO DEL CONTRATO Y FORMAS DE PAGO");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(clausula3Texto, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA CUARTA: APORTES PREVISIONALES");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_4_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA QUINTA: CONDICIÓN JURÍDICA");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_5_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA SEXTA: EXTINCIÓN");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_6_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA SEPTIMA: DECLARACIÓN");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_7_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA OCTAVA: OBLIGACIÓN FISCAL");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_8_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA NOVENA: CESIÓN DEL CONTRATO");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_9_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA DÉCIMA: RESPONSABILIDADES EMERGENTES");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_10_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA DÉCIMA PRIMERA: CONFIDENCIALIDAD");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_11_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA DÉCIMA SEGUNDA: PROMOCIÓN Y DIFUSIÓN.");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_12_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA DÉCIMA TERCERA: PROPIEDAD INTELECTUAL. TITULARIDAD");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_13A_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc
        .font("Helvetica-Bold")
        .text("CLÁUSULA DÉCIMA TERCERA: JURISDICCIÓN");
    doc.moveDown(0.3);
    doc
        .font("Helvetica")
        .text(CLAUSULA_13B_TEXTO, { align: "justify" });
    doc.moveDown(0.75);

    doc.font("Helvetica").text(CIERRE_TEXTO, { align: "justify" });

    doc.end();
    });
}
