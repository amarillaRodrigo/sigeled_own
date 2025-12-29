import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { contratoService } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import {
    FiBriefcase,
    FiDollarSign,
    FiLayers,
    FiTarget,
    FiBook,
    FiClock,
    FiCalendar,
} from "react-icons/fi";

const Panel = ({ className = "", ...props }) => (
    <div
        className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`}
        {...props}
    />
);

const MotionPanel = motion.create(Panel);

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

const esPerfilProfesor = (p) => {
    const nombre = String(p.perfil_nombre || p.nombre || "").toLowerCase();
    const codigo = String(p.perfil_codigo || p.codigo || "").toLowerCase();
    return nombre.includes("profesor") || codigo === "prof" || p.id_perfil === 1;
};

const esPerfilCoordinador = (p) => {
    const nombre = String(p.perfil_nombre || p.nombre || "").toLowerCase();
    const codigo = String(p.perfil_codigo || p.codigo || "").toLowerCase();
    return (
        nombre.includes("coordinador") || codigo === "coor" || p.id_perfil === 2
    );
};

const normalizeTarifas = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

export default function Cargos() {
    const { user } = useAuth();

    const idPersona =
        user?.id_persona ||
        user?.persona?.id_persona ||
        user?.persona_id ||
        user?.personaId ||
        null;

    const {
        data: perfilesTarifas = [],
        isLoading: loadingCargos,
        isError: errorCargos,
        error: cargosError,
    } = useQuery({
        queryKey: ["tarifas-persona", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await contratoService.getTarifasByPersona(idPersona);
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.perfiles)) return data.perfiles;
            return [];
        },
    });

    const {
        data: misContratos = [],
        isLoading: loadingContratos,
        isError: errorContratos,
        error: contratosError,
    } = useQuery({
        queryKey: ["mis-contratos"],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await contratoService.getMisContratos();
            return Array.isArray(data) ? data : [];
        },
    });

    const perfilesNormalizados = perfilesTarifas.map((p) => ({
        ...p,
        tarifas: normalizeTarifas(p.tarifas),
    }));

    const perfilesConCargos = perfilesNormalizados.filter((p) => {
        if (esPerfilProfesor(p)) return false;
        const tarifas = Array.isArray(p.tarifas) ? p.tarifas : [];
        return tarifas.length > 0;
    });

    const totalCargos = perfilesConCargos.reduce((acc, p) => {
        const tarifas = Array.isArray(p.tarifas) ? p.tarifas : [];
        return acc + tarifas.length;
    }, 0);

    const montos = perfilesConCargos
        .flatMap((p) => p.tarifas || [])
        .map((t) => Number(t.monto_hora))
        .filter((n) => !Number.isNaN(n));

    const montoPromedio = montos.length
        ? montos.reduce((a, b) => a + b, 0) / montos.length
        : null;

    const carrerasCoordinadasSet = new Set();
    const cargosStatsByPerfilCargo = new Map();

    if (Array.isArray(misContratos)) {
        const hoy = new Date();

        const parseDate = (value) => {
            if (!value) return null;
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? null : d;
        };

        misContratos.forEach((c) => {
            const items = Array.isArray(c.items) ? c.items : [];
            const fechaInicio = parseDate(c.fecha_inicio);
            const fechaFin = parseDate(c.fecha_fin);
            const contratoActivo =
                (!fechaInicio || hoy >= fechaInicio) &&
                (!fechaFin || hoy <= fechaFin);

            items.forEach((it) => {
                const tipo = String(it.tipo_item || "").toUpperCase();
                const codCargo = String(it.codigo_cargo || "").toUpperCase();

                // Carreras coordinadas (como antes)
                if (tipo === "COORDINACION" && codCargo === "COORDINADOR_CARRERA") {
                    let carrera = it.descripcion_actividad || "";

                    const match =
                        carrera.match(/de la\s+(.+)/i) ||
                        carrera.match(/de el\s+(.+)/i) ||
                        carrera.match(/de\s+(.+)/i);

                    if (match && match[1]) {
                        carrera = match[1].trim();
                    }

                    if (carrera) {
                        carrerasCoordinadasSet.add(carrera);
                    }
                }

                // Stats por perfil + cargo (para mostrar datos tipo Profesor.jsx)
                const idPerfil = it.id_perfil;
                if (!idPerfil || !codCargo) return;

                const key = `${idPerfil}__${codCargo}`;
                let stats = cargosStatsByPerfilCargo.get(key);
                if (!stats) {
                    stats = {
                        id_perfil: idPerfil,
                        codigo_cargo: codCargo,
                        horasSemanalesTotal: 0,
                        subtotalMensualTotal: 0,
                        contratosIds: new Set(),
                        contratosActivosIds: new Set(),
                        periodos: new Set(),
                        fechaInicioMin: null,
                        fechaFinMax: null,
                    };
                    cargosStatsByPerfilCargo.set(key, stats);
                }

                const hs = safeNumber(it.horas_semanales) || 0;
                const montoHoraItem = safeNumber(it.monto_hora);
                let subtotal = safeNumber(it.subtotal_mensual);
                if (subtotal == null && montoHoraItem != null && hs > 0) {
                    subtotal = hs * 4 * montoHoraItem;
                }

                stats.horasSemanalesTotal += hs;
                if (subtotal != null) {
                    stats.subtotalMensualTotal += subtotal;
                }

                if (c.id_contrato != null) {
                    stats.contratosIds.add(c.id_contrato);
                    if (contratoActivo) {
                        stats.contratosActivosIds.add(c.id_contrato);
                    }
                }

                if (c.periodo_descripcion) {
                    stats.periodos.add(c.periodo_descripcion);
                }

                if (fechaInicio) {
                    if (!stats.fechaInicioMin || fechaInicio < stats.fechaInicioMin) {
                        stats.fechaInicioMin = fechaInicio;
                    }
                }

                if (fechaFin) {
                    if (!stats.fechaFinMax || fechaFin > stats.fechaFinMax) {
                        stats.fechaFinMax = fechaFin;
                    }
                }
            });
        });
    }

    const carrerasCoordinadas = Array.from(carrerasCoordinadasSet);

    const loadingAll = loadingCargos || loadingContratos;

    return (
        <motion.div
            className="p-6 flex flex-col gap-5 h-[calc(100vh-2rem)] lg:h-[calc(100vh)]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="space-y-1 shrink-0">
                <h1 className="ml-5 text-4xl font-medium text-white">
                    Mis <span className="font-black">Cargos</span>
                </h1>

                {!loadingAll && !errorCargos && !errorContratos && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-5 text-xs">
                        <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                            Perfiles con cargos (sin profesor):{" "}
                            <span className="font-semibold text-white">
                                {perfilesConCargos.length}
                            </span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                            Cargos totales:{" "}
                            <span className="font-semibold text-white">{totalCargos}</span>
                        </span>
                        {montoPromedio != null && (
                            <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                                Promedio global $/hora:{" "}
                                <span className="font-semibold text-[#19F124]">
                                    {montoPromedio.toFixed(2)}
                                </span>
                            </span>
                        )}
                        {carrerasCoordinadas.length > 0 && (
                            <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1] flex items-center gap-1">
                                <FiBook size={12} />
                                <span>
                                    Carrera(s) coordinadas:{" "}
                                    <span className="font-semibold text-white">
                                        {carrerasCoordinadas.join(" · ")}
                                    </span>
                                </span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {loadingAll && (
                <Panel className="flex items-center justify-center flex-1">
                    <LoadingState
                        classNameContainer="min-h-0"
                        classNameImg="w-28 h-28"
                    />
                </Panel>
            )}

            {!loadingAll && (
                <Panel className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 border-b border-[#1b2a37]">
                        <h2 className="flex items-center gap-2 text-3xl font-semibold text-[#19F124]">
                            <FiBriefcase className="text-[#FFD54F]" />
                            Mis Cargos
                        </h2>
                    </div>

                    {errorCargos && (
                        <div className="flex items-center justify-center flex-1 px-4 text-sm text-center text-red-400">
                            No se pudieron cargar tus cargos.
                            <br />
                            {cargosError?.response?.data?.error || cargosError?.message}
                        </div>
                    )}

                    {errorContratos && (
                        <div className="flex items-center justify-center flex-1 px-4 text-xs text-center text-yellow-400">
                            No se pudieron cargar tus contratos para determinar carreras
                            coordinadas.
                            <br />
                            {contratosError?.response?.data?.error ||
                                contratosError?.message}
                        </div>
                    )}

                    {!errorCargos && !totalCargos ? (
                        <div className="flex items-center justify-center flex-1 px-4 text-sm text-center opacity-70">
                            No tenés cargos asignados (distintos de profesor).
                        </div>
                    ) : (
                        !errorCargos && (
                            <div className="flex-1 overflow-auto [scrollbar-gutter:stable] p-3 space-y-3">
                                {perfilesConCargos.map((perfil, idxPerfil) => {
                                    const tarifas = Array.isArray(perfil.tarifas)
                                        ? perfil.tarifas
                                        : [];
                                    if (!tarifas.length) return null;

                                    const nombrePerfil =
                                        perfil.perfil_nombre ||
                                        perfil.perfil_codigo ||
                                        "Perfil sin nombre";

                                    const esCoordinadorPerfil = esPerfilCoordinador(perfil);

                                    return (
                                        <MotionPanel
                                            key={perfil.id_perfil ?? idxPerfil}
                                            className="flex flex-col gap-3 p-4 mb-5 font-semibold bg-[#10242a] border border-[#19f12423] rounded-xl"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            whileHover={{ y: -2, scale: 1.01 }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-[#212e3a] border border-[#283746] rounded-xl">
                                                        <FiLayers size={24} className="text-[#4FC3F7]" />
                                                    </div>
                                                    <h3 className="text-xl font-semibold text-white text:white">
                                                        {nombrePerfil}
                                                    </h3>
                                                </div>
                                            </div>

                                            {esCoordinadorPerfil &&
                                                carrerasCoordinadas.length > 0 && (
                                                    <div className="mt-1 mb-2 text-bg text-[#d0e1f2] flex items-center gap-1.5">
                                                        <FiBook size={11} />
                                                        <span>
                                                            Carrera(s) que coordinás:{" "}
                                                            <span className="text-white">
                                                                {carrerasCoordinadas.join(" · ")}
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}

                                            <div className="mt-2 text-[0.72rem] text-[#e3edf7] space-y-1.5">
                                                {tarifas.map((t, idxT) => {
                                                    const key = t.id_tarifa ?? idxT;
                                                    const montoHoraTarifa = safeNumber(t.monto_hora);

                                                    const codigoCargo = String(
                                                        t.codigo_cargo || ""
                                                    ).toUpperCase();
                                                    const statsKey = perfil.id_perfil
                                                        ? `${perfil.id_perfil}__${codigoCargo}`
                                                        : null;
                                                    const stats =
                                                        statsKey &&
                                                        cargosStatsByPerfilCargo.get(statsKey);
                                                    const horasMensualesTotales =
                                                        stats &&
                                                        stats.horasSemanalesTotal &&
                                                        stats.horasSemanalesTotal > 0
                                                            ? stats.horasSemanalesTotal * 4
                                                            : null;

                                                    return (
                                                        <div
                                                            key={key}
                                                            className="pt-2 border-t border-[#2a3a4a] first:pt-0 first:border-t-0 px-2 py-2 -mx-2 rounded-xl "
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FiBriefcase
                                                                        size={16}
                                                                        className="text-[#FFE082]"
                                                                    />
                                                                    <span className="text-xl font-semibold text-white">
                                                                        {t.descripcion ||
                                                                            "Cargo sin descripción"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-3 mt-3 text-sm">
                                                                <span className="flex items-center gap-1.5">
                                                                    <FiTarget size={16} />
                                                                    <span>
                                                                        Aplica a:{" "}
                                                                        <span className="text-white">
                                                                            {t.aplica_materias
                                                                                ? "Materias / Docencia"
                                                                                : "Otras actividades"}
                                                                        </span>
                                                                    </span>
                                                                </span>

                                                                {montoHoraTarifa != null && (
                                                                    <span className="flex items-center gap-1.5">
                                                                        <FiDollarSign size={11} />
                                                                        <span>
                                                                            Monto / hora:{" "}
                                                                            <span className="text-[#19F124] font-semibold">
                                                                                $ {montoHoraTarifa.toFixed(2)}
                                                                            </span>
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {stats && (
                                                                <div className="mt-3 text-sm text-[#ffffff] space-y-1.5">
                                                                    {stats.horasSemanalesTotal > 0 && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <FiClock size={11} />
                                                                            <span>
                                                                                Horas semanales totales en
                                                                                contratos:{" "}
                                                                                <span className="text-white">
                                                                                    {
                                                                                        stats.horasSemanalesTotal
                                                                                    }
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    )}

                                                                    {horasMensualesTotales != null && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <FiClock size={11} />
                                                                            <span>
                                                                                Horas mensuales (aprox.):{" "}
                                                                                <span className="text-white">
                                                                                    {
                                                                                        horasMensualesTotales
                                                                                    }
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    )}

                                                                    {stats.subtotalMensualTotal > 0 && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <FiDollarSign size={11} />
                                                                            <span>
                                                                                Importe mensual total en
                                                                                contratos:{" "}
                                                                                <span className="text-[#19F124] font-semibold">
                                                                                    {"$ "}
                                                                                    {stats.subtotalMensualTotal.toFixed(
                                                                                        2
                                                                                    )}
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    )}

                                                                    {stats.contratosIds &&
                                                                        stats.contratosIds.size > 0 && (
                                                                            <span className="flex items-center gap-1.5">
                                                                                <FiLayers size={11} />
                                                                                <span>
                                                                                    Contratos asociados:{" "}
                                                                                    <span className="text-white">
                                                                                        {stats.contratosIds.size}
                                                                                        {stats.contratosActivosIds &&
                                                                                            stats
                                                                                                .contratosActivosIds
                                                                                                .size > 0
                                                                                            ? ` (activos: ${stats.contratosActivosIds.size})`
                                                                                            : ""}
                                                                                    </span>
                                                                                </span>
                                                                            </span>
                                                                        )}

                                                                    {(stats.fechaInicioMin ||
                                                                        stats.fechaFinMax) && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <FiCalendar size={11} />
                                                                            <span>
                                                                                Vigencia global en contratos:{" "}
                                                                                <span className="text-white">
                                                                                    {stats.fechaInicioMin
                                                                                        ? formatDate(
                                                                                            stats.fechaInicioMin
                                                                                        )
                                                                                        : "¿sin inicio?"}{" "}
                                                                                    {"  →  "}
                                                                                    {stats.fechaFinMax
                                                                                        ? formatDate(
                                                                                            stats.fechaFinMax
                                                                                        )
                                                                                        : "¿sin fin?"}
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    )}

                                                                    {stats.periodos &&
                                                                        stats.periodos.size > 0 && (
                                                                            <span className="flex items-center gap-1.5">
                                                                                <FiTarget size={11} />
                                                                                <span>
                                                                                    Período(s) académicos:{" "}
                                                                                    <span className="text-white">
                                                                                        {Array.from(
                                                                                            stats.periodos
                                                                                        ).join(" · ")}
                                                                                    </span>
                                                                                </span>
                                                                            </span>
                                                                        )}
                                                                </div>
                                                            )}

                                                            {t.observaciones && (
                                                                <p className="mt-1 text-[0.65rem] text-[#d0e1f2]/90">
                                                                    {t.observaciones}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </MotionPanel>
                                    );
                                })}
                            </div>
                        )
                    )}
                </Panel>
            )}
        </motion.div>
    );
}
