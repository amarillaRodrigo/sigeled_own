import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { contratoService } from "../../services/api";
import {
    FiFileText,
    FiCheckCircle,
    FiClock,
    FiAlertCircle,
} from "react-icons/fi";
import { useToast } from "../../components/ToastProvider";
import {
    isActiveContract,
    isUpcomingContract,
    isFinishedContract,
    getContratoEstado,
    daysDiff,
} from "../../utils/contratos";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "../../components/LoadingState";

const Panel = ({ className = "", ...props }) => (
    <div
        className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`}
        {...props}
    />
);

const OutlineBtn = ({ className = "", ...props }) => (
    <button
        className={`px-3 py-2 rounded-xl border border-[#19F124] text-[#19F124] hover:bg-[#19F124] hover:text-[#0D1520] cursor-pointer transition ${className}`}
        {...props}
    />
);

const fmt = (s) => {
    if (!s) return "-";
    const fecha = s instanceof Date ? s : new Date(s);
    if (Number.isNaN(fecha.getTime())) return "-";

    const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    };
    return fecha.toLocaleDateString(undefined, options);
};

const fmtMoney = (value) => {
    if (value == null || value === "" || Number.isNaN(Number(value))) return "-";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(Number(value));
};

const buildMateriaEtiquetas = (r = {}) => {
    if (Array.isArray(r.items) && r.items.length) {
        return r.items.map((it) => {
            const base =
                it.tipo_item === "DOCENCIA"
                    ? (it.descripcion_materia || it.descripcion_actividad)
                    : (it.descripcion_actividad || it.descripcion_materia);

            const cargo = it.codigo_cargo || it.cargo;
            const perfil = it.perfil_codigo;
            const rolPart = cargo ? ` (${cargo})` : "";
            const perfilPart = perfil ? ` - ${perfil}` : "";

            return `${base || "Actividad"}${rolPart}${perfilPart}`;
        });
    }

    if (Array.isArray(r.materias) && r.materias.length) {
        return r.materias.map((m) => {
            const base =
                m.descripcion_materia ||
                m.nombre_materia ||
                m.materia_descripcion ||
                m.descripcion ||
                "Materia";

            const cargo = m.cargo;
            const rolPart = cargo ? ` (${cargo})` : "";

            return `${base}${rolPart}`;
        });
    }

    if (r.descripcion_materia) return [r.descripcion_materia];
    if (r.materia?.descripcion_materia)
        return [r.materia.descripcion_materia];
    if (r.nombre_materia) return [r.nombre_materia];

    return [];
};

const StatCard = ({ icon, label, value }) => (
    <Panel className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-xl bg-[#101922] flex items-center justify-center text-[#9fb2c1]">
            {icon}
        </div>
        <div>
            <div className="text-sm text-[#9fb2c1]">{label}</div>
            <div className="text-2xl font-semibold text-[#19F124]">
                {value}
            </div>
        </div>
    </Panel>
);

export default function MisContratos() {
    const toast = useToast();
    const { user } = useAuth();

    const {
        data: contratos = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["contratos", "mios"],
        queryFn: async () => {
            const { data } = await contratoService.getMisContratos();
            return Array.isArray(data) ? data : [];
        },
    });

    const kpis = useMemo(() => {
        const total = contratos.length;
        const activos = contratos.filter((c) => isActiveContract(c)).length;
        const proximos = contratos.filter((c) => isUpcomingContract(c)).length;
        const finalizados = contratos.filter((c) => isFinishedContract(c)).length;
        return { total, activos, proximos, finalizados };
    }, [contratos]);

    const getSubtotalMensual = (row) => {
        const stored =
            row?.subtotal_mensual ??
            row?.monto_mensual ??
            row?.subtotal_mensual_estimado;

        if (stored != null && !Number.isNaN(Number(stored))) {
            return Number(stored);
        }

        const horasSem = Number(
            row?.horas_semanales ?? row?.horas_por_semana ?? 0
        );
        const montoHora = Number(
            row?.monto_hora ??
                row?.monto_hora_promedio ??
                row?.montoHora ??
                0
        );

        if (!horasSem || !montoHora) return null;

        return horasSem * montoHora * 4;
    };

    const exportar = async (row, format = "pdf") => {
        try {
            const contratoId =
                row.id_contrato_profesor ??
                row.id_contrato ??
                row.contrato_id ??
                row.id;

            if (!contratoId) {
                toast.error("No se encontró el identificador del contrato");
                return;
            }

            const { url, filename } = await contratoService.exportarContrato(
                contratoId,
                format
            );

            const a = document.createElement("a");
            a.href = url;

            if (filename) {
                a.download = filename;
            } else {
                const apellido = user?.apellido || "";
                const nombre = user?.nombre || "";
                const baseNombre = [apellido, nombre].filter(Boolean).join(" ").trim();
                const ext = format === "word" ? "docx" : "pdf";

                a.download = baseNombre
                    ? `CONTRATO DE ${baseNombre}.${ext}`
                    : `CONTRATO-${contratoId}.${ext}`;
            }

            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("Contrato exportado con éxito");
        } catch (err) {
            console.error(err);
            toast.error("No se pudo exportar el contrato");
        }
    };


    return (
        <motion.div
            className="p-6 space-y-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
        >
            <motion.h1
                className="ml-5 text-4xl font-medium text-white"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
            >
                Mis Contratos
            </motion.h1>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.06 }}
                >
                    <StatCard
                        icon={<FiFileText />}
                        label="Total Contratos"
                        value={kpis.total}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.08 }}
                >
                    <StatCard
                        icon={<FiCheckCircle />}
                        label="Activos"
                        value={kpis.activos}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                >
                    <StatCard
                        icon={<FiClock />}
                        label="Próximos a vencer"
                        value={kpis.proximos}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.12 }}
                >
                    <StatCard
                        icon={<FiAlertCircle />}
                        label="Finalizados"
                        value={kpis.finalizados}
                    />
                </motion.div>
            </div>

            <Panel className="overflow-auto">
                {isLoading && (
                    <div className="flex items-center justify-center min-h-[70vh]">
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-30 h-30"
                        />
                    </div>
                )}

                {isError && (
                    <div className="p-6 text-center text-red-400">
                        Ocurrió un error al cargar tus contratos.
                        <div className="mt-1 text-xs opacity-60">
                            {String(error?.message || "")}
                        </div>
                    </div>
                )}

                {!isLoading &&
                    !isError &&
                    (contratos.length ? (
                        <table className="min-w-full text-sm">
                            <thead className="text-[#9fb2c1]">
                                <tr>
                                    <th className="p-3 text-left">#</th>
                                    <th className="p-3 text-left">Materia</th>
                                    <th className="p-3 text-left">Periodo</th>
                                    <th className="p-3 text-left">
                                        Horas (sem)
                                    </th>
                                    <th className="p-3 text-left">
                                        Monto hora
                                    </th>
                                    <th className="p-3 text-left">
                                        Subtotal mensual
                                    </th>
                                    <th className="p-3 text-left">Inicio</th>
                                    <th className="p-3 text-left">Fin</th>
                                    <th className="p-3 text-left">Estado</th>
                                    <th className="p-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence initial={false}>
                                    {contratos.map((r, idx) => {
                                        const estado = getContratoEstado(r);
                                        const fechaFin = r.fecha_fin
                                            ? new Date(r.fecha_fin)
                                            : null;

                                        const dias = fechaFin
                                            ? daysDiff(
                                                    new Date(),
                                                    fechaFin
                                                )
                                            : NaN;

                                        const mostrarDias =
                                            Number.isFinite(dias) && dias >= 0;

                                        const estadoClasses =
                                            estado === "ACTIVO"
                                                ? "bg-green-500/10 text-green-400 border border-green-500/40"
                                                : estado === "PROXIMO"
                                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/40"
                                                : estado === "FINALIZADO"
                                                ? "bg-red-500/10 text-red-400 border border-red-500/40"
                                                : "bg-gray-500/10 text-gray-300 border border-gray-500/40";

                                        const contratoKey =
                                            r.id_contrato_profesor ??
                                            r.id_contrato ??
                                            r.contrato_id ??
                                            idx;

                                        const horasSem =
                                            r.horas_semanales ??
                                            r.horas_por_semana ??
                                            "-";

                                        const montoHora =
                                            r.monto_hora ??
                                            r.monto_hora_promedio ??
                                            r.montoHora ??
                                            null;

                                        const subtotalMensual =
                                            getSubtotalMensual(r);

                                        const etiquetas =
                                            buildMateriaEtiquetas(r);

                                        const materiaLabel =
                                            etiquetas.length > 1
                                                ? `${etiquetas[0]} +${
                                                    etiquetas.length - 1
                                                }`
                                                : etiquetas[0] || "—";

                                        const periodoLabel =
                                            r.periodo_descripcion ||
                                            r.nombre_periodo ||
                                            r.periodo?.descripcion ||
                                            r.periodo?.nombre ||
                                            (r.id_periodo
                                                ? `Período ${r.id_periodo}`
                                                : "-");

                                        const estadoLabel =
                                            estado === "ACTIVO"
                                                ? "Activo"
                                                : estado === "PROXIMO"
                                                ? "Próximo a vencer"
                                                : estado === "FINALIZADO"
                                                ? "Finalizado"
                                                : estado || "-";

                                        return (
                                            <motion.tr
                                                key={contratoKey}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{
                                                    duration: 0.18,
                                                    delay: idx * 0.02,
                                                }}
                                                className="border-t border-[#15202b]"
                                            >
                                                <td className="p-3">
                                                    {contratoKey}
                                                </td>

                                                <td
                                                    className="p-3 whitespace-normal wrap-break-word"
                                                    title={etiquetas.join(", ")}
                                                >
                                                    {materiaLabel}
                                                </td>

                                                <td className="p-3">
                                                    {periodoLabel}
                                                </td>

                                                <td className="p-3">
                                                    {horasSem}
                                                </td>

                                                <td className="p-3">
                                                    {fmtMoney(montoHora)}
                                                </td>

                                                <td className="p-3">
                                                    {fmtMoney(subtotalMensual)}
                                                </td>

                                                <td className="p-3">
                                                    {fmt(r.fecha_inicio)}
                                                </td>

                                                <td className="p-3">
                                                    {fmt(r.fecha_fin)}
                                                </td>

                                                <td className="p-3">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${estadoClasses}`}
                                                    >
                                                        {estadoLabel}
                                                    </span>
                                                    {estado === "PROXIMO" &&
                                                        mostrarDias && (
                                                            <div className="mt-1 text-xs text-yellow-400">
                                                                Vence en {dias}{" "}
                                                                día
                                                                {dias === 1
                                                                    ? ""
                                                                    : "s"}
                                                            </div>
                                                        )}
                                                </td>

                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <OutlineBtn
                                                            onClick={() =>
                                                                exportar(
                                                                    r,
                                                                    "pdf"
                                                                )
                                                            }
                                                        >
                                                            PDF
                                                        </OutlineBtn>
                                                        <OutlineBtn
                                                            onClick={() =>
                                                                exportar(
                                                                    r,
                                                                    "word"
                                                                )
                                                            }
                                                        >
                                                            WORD
                                                        </OutlineBtn>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-6 text-center opacity-70">
                            No tenés contratos asignados
                        </div>
                    ))}
            </Panel>
        </motion.div>
    );
}
