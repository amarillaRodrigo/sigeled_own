import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { contratoService } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import {
    FiBook,
    FiLayers,
    FiClock,
    FiDollarSign,
    FiCalendar,
    FiTarget,
} from "react-icons/fi";

const Panel = ({ className = "", ...props }) => (
    <div
        className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`}
        {...props}
    />
);

const safeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const formatDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("es-AR");
};

const getPeriodo = (m) =>
    m.periodo_descripcion ||
    m.nombre_periodo ||
    m.periodo ||
    (m.id_periodo != null ? `Período ${m.id_periodo}` : null);

const cargoNormalizado = (codigo) => {
    const code = String(codigo || "").toUpperCase();
    switch (code) {
        case "TITULAR":
        return "Profesor Titular";
        case "JTP":
        return "Jefe de Trabajos Prácticos";
        case "AUXILIAR":
        return "Auxiliar de cátedra";
        default:
        return codigo || "Sin cargo";
    }
};

export default function Profesor() {
    const { user } = useAuth();

    const idPersona =
        user?.id_persona ||
        user?.persona?.id_persona ||
        user?.persona_id ||
        user?.personaId ||
        null;

    const {
        data: detalles,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["profesor-detalles", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
        const { data } = await contratoService.getProfesorDetalles(idPersona);
        return data;
        },
    });

    const materias = Array.isArray(detalles?.materias) ? detalles.materias : [];

    const totalMaterias = materias.length;
    const carrerasSet = new Set(materias.map((m) => m.carrera).filter(Boolean));
    const aniosSet = new Set(materias.map((m) => m.anio).filter(Boolean));

    return (
        <motion.div
        className="text-white mt-7"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        >
        <motion.div
            className="flex flex-col gap-2 ml-16"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <h1 className="text-4xl font-medium">
            Mis <span className="font-black">Materias</span>
            </h1>

            {detalles && (
            <p className="text-sm text-[#9fb2c1]">
                Profesor:{" "}
                <span className="font-semibold text-white">
                {detalles.apellido} {detalles.nombre}
                </span>
                {detalles.cargo_descripcion && (
                <>
                    {" · Cargo: "}
                    <span className="text-[#19F124]">
                    {detalles.cargo_descripcion}
                    </span>
                </>
                )}
            </p>
            )}

            {!isLoading && !isError && (
            <div className="flex flex-wrap gap-2 mt-1 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Total de materias:{" "}
                <span className="font-semibold text-white">{totalMaterias}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Carreras distintas:{" "}
                <span className="font-semibold text-white">
                    {carrerasSet.size}
                </span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Años académicos:{" "}
                <span className="font-semibold text-white">{aniosSet.size}</span>
                </span>
            </div>
            )}
        </motion.div>

        <motion.div
            className="px-10 mt-5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Panel className="p-5 mb-5 bg-[#101922]">
            <h2 className="pb-2 pl-2 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                Materias asignadas
            </h2>

            {isLoading && (
                <div className="flex items-center justify-center h-40">
                <LoadingState
                    classNameContainer="min-h-0"
                    classNameImg="w-20 h-20"
                />
                </div>
            )}

            {isError && (
                <div className="flex items-center justify-center h-40 px-4 text-sm text-center text-red-400">
                No se pudieron cargar tus materias.
                <br />
                {error?.response?.data?.error || error?.message}
                </div>
            )}

            {!isLoading && !isError && !materias.length && (
                <div className="flex items-center justify-center h-40 px-4 text-sm text-center opacity-70">
                No tenés materias asignadas.
                </div>
            )}

            {!isLoading && !isError && materias.length > 0 && (
                <section className="grid grid-cols-1 gap-4 mt-2 lg:grid-cols-2">
                {materias.map((m, index) => {
                    const key =
                    m.id_contrato && m.id_materia
                        ? `${m.id_contrato}-${m.id_materia}`
                        : m.id_materia ||
                        `${m.descripcion_materia ?? "materia"}-${index}`;

                    const horasSem = safeNumber(m.horas_semanales);
                    const horasMensuales = safeNumber(
                    m.horas_mensuales ?? (horasSem != null ? horasSem * 4 : null)
                    );
                    const montoHora = safeNumber(m.monto_hora);
                    const subtotalMensual = safeNumber(
                    m.subtotal_mensual ??
                        (horasMensuales != null && montoHora != null
                        ? horasMensuales * montoHora
                        : null)
                    );

                    const fechaInicio = formatDate(m.fecha_inicio);
                    const fechaFin = formatDate(m.fecha_fin);

                    return (
                    <motion.div
                        key={key}
                        className="flex flex-col gap-3 p-4 mb-1 font-semibold bg-[#10242a] border border-[#19f12423] rounded-xl"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ y: -2, scale: 1.01 }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#212e3a] border border-[#283746] rounded-xl">
                                    <FiBook className="text-[#19F124]" size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-bg opacity-70">Materia</span>
                                    <span className="text-xl text-white">
                                        {m.descripcion_materia || "Materia sin nombre"}
                                    </span>
                                    {m.carrera && (
                                        <span className="text-bg text-[#9fb2c1] mt-0.5">
                                        Carrera: {m.carrera}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {m.anio && (
                                <span className="px-4 w-40 text-center justify-center py-1 text-bg rounded-full bg-[#142033] text-[#9fb2c1] flex items-center gap-1">
                                    <FiLayers size={14} />
                                    {m.anio}
                                </span>
                            )}
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-bg text-[#9fb2c1]">
                            {m.codigo_cargo && (
                                <div className="flex items-center gap-2">
                                <FiLayers size={16} />
                                <span>
                                    Cargo en esta materia:{" "}
                                    <span className="text-white">
                                    {cargoNormalizado(m.codigo_cargo)}
                                    </span>
                                </span>
                                </div>
                            )}

                            {horasSem != null && (
                                <div className="flex items-center gap-2">
                                <FiClock size={16} />
                                <span>
                                    Horas semanales:{" "}
                                    <span className="text-white">{horasSem}</span>
                                </span>
                                </div>
                            )}

                            {horasMensuales != null && (
                                <div className="flex items-center gap-2">
                                <FiClock size={16} />
                                <span>
                                    Horas mensuales:{" "}
                                    <span className="text-white">{horasMensuales}</span>
                                </span>
                                </div>
                            )}

                            {montoHora != null && (
                                <div className="flex items-center gap-2">
                                <FiDollarSign size={16} />
                                <span>
                                    Monto por hora:{" "}
                                    <span className="text-[#19F124]">
                                    $ {montoHora.toFixed(2)}
                                    </span>
                                </span>
                                </div>
                            )}

                            {subtotalMensual != null && (
                                <div className="flex items-center gap-2">
                                <FiDollarSign size={16} />
                                <span>
                                    Subtotal mensual (horas_mensuales × monto_hora):{" "}
                                    <span className="text-[#19F124] font-bold">
                                    $ {subtotalMensual.toFixed(2)}
                                    </span>
                                </span>
                                </div>
                            )}

                            {getPeriodo(m) && (
                                <div className="flex items-center gap-2">
                                <FiTarget size={16} />
                                <span>
                                    Período:{" "}
                                    <span className="text-white">{getPeriodo(m)}</span>
                                </span>
                                </div>
                            )}

                            {(fechaInicio || fechaFin) && (
                                <div className="flex items-center gap-2">
                                <FiCalendar size={16} />
                                <span>
                                    Vigencia:{" "}
                                    <span className="text-white">
                                    {fechaInicio || "¿sin inicio?"} {"  →  "}
                                    {fechaFin || "¿sin fin?"}
                                    </span>
                                </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                    );
                })}
                </section>
            )}
            </Panel>
        </motion.div>
        </motion.div>
    );
}
