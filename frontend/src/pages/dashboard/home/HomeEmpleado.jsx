import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
    contratoService,
    legajoService,
    personaDocService,
} from "../../../services/api";
import {
    KpiCard,
    BentoPanel,
    QuickLinkButton,
} from "../../../components/HomeComponents";
import {
    FiArchive,
    FiFileText,
    FiCheckCircle,
    FiAlertCircle,
    FiClock,
    FiList,
} from "react-icons/fi";
import DonutChart from "../../../components/DonutChart";
import { motion } from "motion/react";

const toDate = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

const fmt = (s) => {
    if (!s) return "-";
    const d = s instanceof Date ? s : new Date(s);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

const getStatusIcon = (id_estado) => {
    switch (id_estado) {
        case 1:
            return <FiClock className="text-yellow-400" />;
        case 2:
            return <FiCheckCircle className="text-green-500" />;
        case 3:
            return <FiAlertCircle className="text-red-500" />;
        case 4:
            return <FiAlertCircle className="text-amber-400" />;
        default:
            return <FiList className="text-gray-500" />;
    }
};

const ESTADOS_LEGAJO_LABELS = {
    INCOMPLETO: "Legajo incompleto",
    PENDIENTE: "Pendiente de verificación",
    REVISION: "En revisión",
    VALIDADO: "Legajo validado",
    BLOQUEADO: "Legajo bloqueado",
};

const ESTADO_CONTRATO_LABELS = {
    ACTIVO: "Activo",
    PROXIMO: "Próximo a vencer",
    FINALIZADO: "Finalizado",
    DESCONOCIDO: "Sin estado",
};

const DOC_ESTADO_LABELS = {
    PENDIENTE: "Pendiente de revisión",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
    OBSERVADO: "Con observaciones",
};

const humanizeMaybeCode = (text) => {
    if (!text || typeof text !== "string") return "";
    const clean = text.trim();
    if (!clean) return "";

    const hasUnderscore = clean.includes("_");
    const isUpper = clean === clean.toUpperCase();

    if (!hasUnderscore && !isUpper) return clean;

    const words = clean.replace(/[_-]+/g, " ").toLowerCase().split(" ");
    return words
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
};

const getLegajoClasses = (codigo) => {
    switch (codigo) {
        case "VALIDADO":
            return "bg-green-500/10 border border-green-500/40 text-green-400";
        case "PENDIENTE":
            return "bg-yellow-500/15 border border-yellow-500/40 text-yellow-300";
        case "BLOQUEADO":
            return "bg-gray-500/15 border border-gray-500/40 text-gray-300";
        case "REVISION":
            return "bg-amber-500/15 border border-amber-500/40 text-amber-300";
        case "INCOMPLETO":
        default:
            return "bg-red-500/15 border border-red-500/40 text-red-400";
    }
};


const getContratoEstadoLocal = (c) => {
    const inicio =
        toDate(c.fecha_inicio || c.fechaInicio || c.inicio || c.desde) || null;
    const fin =
        toDate(c.fecha_fin || c.fechaFin || c.fin || c.hasta) || null;

    const hoy = new Date();

    if (inicio && hoy < inicio) return "PROXIMO";
    if (fin && hoy > fin) return "FINALIZADO";
    if (inicio && (!fin || hoy <= fin)) return "ACTIVO";
    if (!inicio && !fin) return "DESCONOCIDO";
    if (!inicio && fin && hoy <= fin) return "ACTIVO";

    return "DESCONOCIDO";
};

const isActiveContractLocal = (c) =>
    getContratoEstadoLocal(c) === "ACTIVO";

const isUpcomingContractLocal = (c) =>
    getContratoEstadoLocal(c) === "PROXIMO";

const isFinishedContractLocal = (c) =>
    getContratoEstadoLocal(c) === "FINALIZADO";


export default function HomeEmpleado() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const idPersona = useMemo(
        () =>
            user?.id_persona ??
            user?.persona?.id_persona ??
            user?.persona_id ??
            null,
        [user]
    );

    const nombrePersona = user?.persona?.nombre ?? user?.nombre ?? "";
    const apellidoPersona = user?.persona?.apellido ?? user?.apellido ?? "";
    const displayName =
        nombrePersona || apellidoPersona
            ? `${nombrePersona ?? ""} ${apellidoPersona ?? ""}`.trim()
            : user?.email ?? "Empleado";

    const {
        data: legajoInfo,
        isLoading: loadingLegajo,
    } = useQuery({
        queryKey: ["legajo", "estado", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await legajoService.getEstado(idPersona);

            const rawEstado = data?.estado || data || {};

            const codigoRaw =
                rawEstado?.codigo ||
                data?.codigo ||
                rawEstado?.estado_codigo ||
                data?.estado_codigo ||
                "INCOMPLETO";

            const codigo = String(codigoRaw || "INCOMPLETO").toUpperCase();

            const nombreBase =
                rawEstado?.nombre ||
                data?.nombre ||
                rawEstado?.estado_nombre ||
                data?.estado_nombre ||
                codigo;

            const nombre =
                ESTADOS_LEGAJO_LABELS[codigo] ||
                humanizeMaybeCode(nombreBase);

            const checklist =
                rawEstado?.checklist ||
                data?.checklist || {
                    okPersona:
                        rawEstado?.okPersona ??
                        rawEstado?.ok_persona ??
                        data?.okPersona ??
                        data?.ok_persona,
                    okIdent:
                        rawEstado?.okIdent ??
                        rawEstado?.ok_ident ??
                        data?.okIdent ??
                        data?.ok_ident,
                    okDocs:
                        rawEstado?.okDocs ??
                        rawEstado?.ok_docs ??
                        data?.okDocs ??
                        data?.ok_docs,
                    okDomicilio:
                        rawEstado?.okDomicilio ??
                        rawEstado?.ok_domicilio ??
                        data?.okDomicilio ??
                        data?.ok_domicilio,
                    okTitulos:
                        rawEstado?.okTitulos ??
                        rawEstado?.ok_titulos ??
                        data?.okTitulos ??
                        data?.ok_titulos,
                };

            const flags = [
                checklist?.okPersona,
                checklist?.okIdent,
                checklist?.okDocs,
                checklist?.okDomicilio,
                checklist?.okTitulos,
            ].filter((v) => typeof v === "boolean");

            const total = flags.length || 5;
            const cumplidos = flags.filter(Boolean).length;

            const porcentaje =
                typeof rawEstado?.porcentaje === "number"
                    ? Math.round(rawEstado.porcentaje)
                    : typeof data?.porcentaje === "number"
                    ? Math.round(data.porcentaje)
                    : total
                    ? Math.round((cumplidos / total) * 100)
                    : 0;

            return { codigo, nombre, checklist, total, cumplidos, porcentaje };
        },
        staleTime: 5 * 60 * 1000,
    });

    const legajoCodigo = String(
        legajoInfo?.codigo || "INCOMPLETO"
    ).toUpperCase();
    const legajoLabel =
        legajoInfo?.nombre ||
        ESTADOS_LEGAJO_LABELS[legajoCodigo] ||
        humanizeMaybeCode(legajoCodigo);

    const {
        data: contratosInfo = {
            list: [],
            activos: 0,
            proximos: 0,
            finalizados: 0,
            proximoVenc: "-",
        },
        isLoading: loadingContratos,
    } = useQuery({
        queryKey: ["misContratos", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await contratoService.getMisContratos();

            let list = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data?.items)) list = data.items;
            else if (Array.isArray(data?.contratos)) list = data.contratos;
            else if (Array.isArray(data?.rows)) list = data.rows;
            else if (Array.isArray(data?.data)) list = data.data;

            const activos = list.filter(isActiveContractLocal);
            const proximos = list.filter(isUpcomingContractLocal);
            const finalizados = list.filter(isFinishedContractLocal);

            const finDates = activos
                .map((c) =>
                    toDate(c.fecha_fin || c.fechaFin || c.fin || c.hasta)
                )
                .filter(Boolean);
            const minTs = finDates.length
                ? Math.min(...finDates.map((d) => d.getTime()))
                : null;

            return {
                list,
                activos: activos.length,
                proximos: proximos.length,
                finalizados: finalizados.length,
                proximoVenc: minTs ? fmt(new Date(minTs)) : "-",
            };
        },
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
    });

    const {
        data: documentos = [],
        isLoading: loadingDocs,
    } = useQuery({
        queryKey: ["personaDocs", idPersona, { limit: 5 }],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await personaDocService.listarDocumentos(
                idPersona
            );

            let arr = [];
            if (Array.isArray(data)) arr = data;
            else if (Array.isArray(data?.items)) arr = data.items;
            else if (Array.isArray(data?.documentos)) arr = data.documentos;
            else if (Array.isArray(data?.rows)) arr = data.rows;

            return arr.slice(0, 5);
        },
        keepPreviousData: true,
        staleTime: 60 * 1000,
    });

    const loading = loadingContratos || loadingLegajo || loadingDocs;

    const checklistItems = [
        { key: "okPersona", label: "Datos personales completos" },
        { key: "okIdent", label: "Identificación (DNI/CUIL)" },
        { key: "okDocs", label: "Documentos obligatorios cargados" },
        { key: "okDomicilio", label: "Domicilio cargado" },
        { key: "okTitulos", label: "Títulos declarados" },
    ].map((item) => ({
        ...item,
        value: legajoInfo?.checklist?.[item.key],
    }));

    const pendientes = checklistItems.filter(
        (i) => i.value === false || typeof i.value === "undefined"
    );
    const completado =
        legajoInfo?.cumplidos ?? (checklistItems.length - pendientes.length);
    const totalChecklist =
        legajoInfo?.total ??
        (checklistItems.filter((i) => typeof i.value === "boolean").length ||
            checklistItems.length);


    return (
        <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.02 }}
                >
                    <KpiCard
                        label="Contratos activos"
                        value={loading ? "..." : contratosInfo.activos ?? 0}
                        helperText={
                            !loading && contratosInfo.proximos
                                ? `${contratosInfo.proximos} próximos a iniciar`
                                : undefined
                        }
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.06 }}
                >
                    <KpiCard
                        label="Próximo vencimiento"
                        value={
                            loading ? "..." : contratosInfo.proximoVenc
                        }
                        helperText={
                            !loading && contratosInfo.finalizados
                                ? `${contratosInfo.finalizados} contratos finalizados`
                                : undefined
                        }
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                >
                    <KpiCard
                        label="Estado del legajo"
                        value={loadingLegajo ? "..." : legajoLabel}
                        helperText={
                            !loadingLegajo
                                ? `${legajoInfo?.porcentaje ?? 0}% completo`
                                : undefined
                        }
                        badgeClassName={getLegajoClasses(legajoCodigo)}
                    />
                </motion.div>

                <motion.div
                    className="lg:col-span-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.15 }}
                >
                    <BentoPanel className="p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-white">
                            Estado de documentos
                        </h2>
                        <div className="space-y-2">
                            {loadingDocs && (
                                <p className="text-gray-400">
                                    Cargando documentos...
                                </p>
                            )}

                            {!loadingDocs && documentos.length === 0 && (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-gray-400">
                                        Todavía no tenés documentos cargados
                                        en tu legajo.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/dashboard/mi-legajo?tab=docs"
                                            )
                                        }
                                        className="text-sm font-semibold text-[#19F124] underline underline-offset-4 cursor-pointer"
                                    >
                                        Cargar documentos
                                    </button>
                                </div>
                            )}

                            {documentos.map((doc) => {
                                const rawTipo =
                                    doc?.tipo_nombre ||
                                    doc?.tipo_codigo ||
                                    doc?.tipo_documento?.descripcion ||
                                    doc?.tipo_documento?.nombre ||
                                    doc?.tipo?.descripcion ||
                                    doc?.tipo?.nombre ||
                                    doc?.tipo_codigo ||
                                    doc?.codigo ||
                                    "Documento";

                                const tipo = humanizeMaybeCode(rawTipo);

                                const estadoObj =
                                    doc?.estado_verificacion ||
                                    doc?.estado ||
                                    {};

                                const idEstado =
                                    doc?.id_estado_verificacion ??
                                    doc?.id_estado ??
                                    estadoObj?.id_estado_verificacion ??
                                    estadoObj?.id ??
                                    null;

                                let estadoCode =
                                    typeof doc?.estado_codigo === "string"
                                        ? doc.estado_codigo
                                        : typeof estadoObj?.codigo ===
                                            "string"
                                        ? estadoObj.codigo
                                        : typeof estadoObj?.estado ===
                                            "string"
                                        ? estadoObj.estado
                                        : "";

                                let estadoDesc =
                                    doc?.estado_nombre ||
                                    estadoObj?.descripcion ||
                                    estadoObj?.nombre ||
                                    estadoObj?.detalle ||
                                    "";

                                if (!estadoDesc && estadoCode) {
                                    estadoDesc = estadoCode;
                                }

                                const upperEstadoCode =
                                    typeof estadoCode === "string"
                                        ? estadoCode.toUpperCase()
                                        : "";

                                const estadoLabel =
                                    DOC_ESTADO_LABELS[upperEstadoCode] ||
                                    estadoDesc ||
                                    (upperEstadoCode
                                        ? humanizeMaybeCode(
                                            upperEstadoCode
                                        )
                                    : "Sin estado");

                                return (
                                    <motion.div
                                        key={
                                            doc.id_persona_doc ??
                                            `${tipo}-${idEstado}-${Math.random()}`
                                        }
                                        layout
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                        }}
                                        transition={{ duration: 0.15 }}
                                        className="flex items-center justify-between p-2 bg-[#101922] rounded-md"
                                    >
                                        <span className="text-sm truncate text-white/90">
                                            {tipo}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs">
                                            {getStatusIcon(idEstado)}
                                            <span className="w-32 text-right text-gray-200 truncate">
                                                {estadoLabel}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </BentoPanel>
                </motion.div>

                <motion.div
                    className="lg:col-span-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.18 }}
                >
                    <BentoPanel className="p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-white">
                            Accesos rápidos
                        </h2>
                        <QuickLinkButton
                            label="Ver mi legajo"
                            icon={<FiArchive />}
                            onClick={() =>
                                navigate("/dashboard/mi-legajo")
                            }
                        />
                        <QuickLinkButton
                            label="Ver mis contratos"
                            icon={<FiFileText />}
                            onClick={() =>
                                navigate("/dashboard/mis-contratos")
                            }
                        />
                    </BentoPanel>
                </motion.div>

                <motion.div
                    className="lg:col-span-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.21 }}
                >
                    <BentoPanel className="p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-white">
                            Progreso de mi legajo
                        </h2>
                        {loadingLegajo ? (
                            <p className="text-sm text-gray-400">
                                Cargando datos...
                            </p>
                        ) : (
                            <DonutChart
                                items={[
                                    {
                                        label: "Completado",
                                        value: completado || 0,
                                    },
                                    {
                                        label: "Pendiente",
                                        value: Math.max(
                                            (totalChecklist || 0) -
                                                (completado || 0),
                                            0
                                        ),
                                    },
                                ]}
                                height={180}
                            />
                        )}
                        {!loadingLegajo && (
                            <p className="text-xs text-center text-gray-400">
                                {legajoInfo?.porcentaje ?? 0}% completo
                            </p>
                        )}
                    </BentoPanel>
                </motion.div>

                {/* Qué me falta + resumen contratos */}
                <motion.div
                    className="lg:col-span-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.24 }}
                >
                    <BentoPanel className="p-4 mb-10 space-y-4">
                        <h2 className="text-lg font-semibold text-white">
                            ¿Qué me falta para completar mi legajo?
                        </h2>
                        {loadingLegajo && (
                            <p className="text-sm text-gray-400">
                                Cargando checklist...
                            </p>
                        )}

                        {!loadingLegajo && (
                            <div className="space-y-2">
                                {pendientes.length === 0 ? (
                                    <p className="text-sm text-[#19F124]">
                                        ¡Tu legajo está completo! 🎉
                                    </p>
                                ) : (
                                    pendientes.map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#101922]"
                                        >
                                            <span className="text-sm text-white/80">
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-red-400">
                                                Pendiente
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </BentoPanel>

                    <BentoPanel className="p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-white">
                            Resumen de mis contratos
                        </h2>
                        {loadingContratos ? (
                            <p className="text-sm text-gray-400">
                                Cargando contratos...
                            </p>
                        ) : contratosInfo.list.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                No tenés contratos asociados actualmente.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {contratosInfo.list
                                    .slice(0, 3)
                                    .map((c) => {
                                        const tipoBase =
                                            c?.tipo_contrato?.nombre ||
                                            c?.tipo_contrato?.descripcion ||
                                            c?.tipo ||
                                            c?.tipo_codigo ||
                                            "Contrato";

                                        const tipoLabel =
                                            humanizeMaybeCode(
                                                tipoBase
                                            );

                                        const estadoCode =
                                            getContratoEstadoLocal(
                                                c
                                            );

                                        const estadoLabel =
                                            ESTADO_CONTRATO_LABELS[
                                                estadoCode
                                            ] ||
                                            humanizeMaybeCode(
                                                estadoCode
                                            );

                                        const inicio = fmt(
                                            c.fecha_inicio
                                        );
                                        const fin = fmt(c.fecha_fin);

                                        return (
                                            <div
                                                key={
                                                    c.id_contrato ??
                                                    c.id_contrato_profesor ??
                                                    `${tipoBase}-${inicio}-${fin}`
                                                }
                                                className="flex flex-col justify-between gap-1 px-3 py-2 rounded-xl bg-[#101922] md:flex-row md:items-center"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {tipoLabel}
                                                    </p>
                                                    <p className="text-xs text-white/60">
                                                        {inicio} — {fin}
                                                    </p>
                                                </div>
                                                <span className="inline-flex items-center px-3 py-1 mt-1 text-xs border rounded-full border-white/10 bg-white/5 text-white/80 md:mt-0">
                                                    {estadoLabel}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </BentoPanel>
                </motion.div>
            </div>
        </motion.div>
    );
}
