import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificacionService } from "../../services/api";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";
import { useAuth } from "../../context/AuthContext";
import {
    FiInbox,
    FiInfo,
    FiCheck,
    FiAlertTriangle,
    FiEye,
    FiXCircle,
    FiTrash2,
} from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../../components/LoadingState";

function timeAgo(date) {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return "Recién";
}

const LEVEL = {
    info: {
        text: "text-blue-400",
        bg: "bg-blue-400",
        ring: "ring-blue-900/50",
        chip: "bg-blue-500/15 border-blue-500/40 text-blue-300",
        Icon: FiInfo,
    },
    success: {
        text: "text-green-400",
        bg: "bg-green-400",
        ring: "ring-green-400/30",
        chip: "bg-green-500/15 border-green-500/40 text-green-300",
        Icon: FiCheck,
    },
    warning: {
        text: "text-yellow-400",
        bg: "bg-yellow-400",
        ring: "ring-yellow-400/30",
        chip: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
        Icon: FiAlertTriangle,
    },
    error: {
        text: "text-red-400",
        bg: "bg-red-400",
        ring: "ring-red-400/30",
        chip: "bg-red-500/15 border-red-500/40 text-red-300",
        Icon: FiXCircle,
    },
};

const levelUi = (lvl) => LEVEL[(lvl || "info").toLowerCase()] ?? LEVEL.info;
const PAGE_SIZE = 10;

export default function Notificaciones() {
    const toast = useToast();
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [filterEstado, setFilterEstado] = useState("TODAS");
    const [filterNivel, setFilterNivel] = useState("TODOS");
    const [page, setPage] = useState(1);

    const roles = useMemo(() => {
        const raw = user?.roles || user?.perfiles || [];
        return raw
            .map((r) =>
                typeof r === "string" ? r : r.codigo || r.nombre
            )
            .filter(Boolean)
            .map((x) => String(x).toUpperCase());
    }, [user]);

    const isAdminView = roles.includes("ADMIN") || roles.includes("RRHH");

    const {
        data: notificaciones = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["notificaciones"],
        queryFn: () => notificacionService.listar(),
    });

    const marcarLeidaMutation = useMutation({
        mutationFn: (id) => notificacionService.marcarLeida(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
        },
        onError: (error) => {
            toast.error(
                error.message ||
                    "Error al marcar la notificación como leída."
            );
        },
    });

    const marcarTodasMutation = useMutation({
        mutationFn: () => notificacionService.marcarTodasLeidas(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
        },
        onError: (error) => {
            toast.error(
                error.message ||
                    "Error al marcar todas las notificaciones como leídas."
            );
        },
    });

    const eliminarMutation = useMutation({
        mutationFn: (id) => notificacionService.eliminar(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
            toast.success("Notificación eliminada con éxito");
        },
        onError: (error) => {
            toast.error(
                error?.message || "Error al eliminar la notificación."
            );
        },
    });

    const filtradas = useMemo(() => {
        let arr = Array.isArray(notificaciones)
            ? [...notificaciones]
            : [];

        if (filterEstado === "NO_LEIDAS") {
            arr = arr.filter((n) => !n.leido);
        } else if (filterEstado === "LEIDAS") {
            arr = arr.filter((n) => n.leido);
        }

        if (filterNivel !== "TODOS") {
            arr = arr.filter(
                (n) =>
                    (n.nivel || "info").toLowerCase() ===
                    filterNivel.toLowerCase()
            );
        }
        return arr;
    }, [notificaciones, filterEstado, filterNivel]);

    const totalPages = Math.max(
        1,
        Math.ceil(filtradas.length / PAGE_SIZE)
    );
    const pageSafe = Math.min(page, totalPages);
    const start = (pageSafe - 1) * PAGE_SIZE;
    const currentPageItems = filtradas.slice(
        start,
        start + PAGE_SIZE
    );

    if (isLoading) {
        return (
                <LoadingState />
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <p className="text-sm text-red-400">
                    Error al cargar las notificaciones.
                </p>
            </div>
        );
    }

    if (!notificaciones.length) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                    <FiInbox className="w-8 h-8" />
                    <p className="text-sm">
                        No hay notificaciones por ahora.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="p-6 space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div>
                    <h1 className="text-2xl font-semibold text-white">
                        Notificaciones
                    </h1>
                    <p className="text-xs text-gray-400">
                        {notificaciones.length} en total · mostrando{" "}
                        {filtradas.length}{" "}
                        {filtradas.length === 1
                            ? "coincidencia"
                            : "coincidencias"}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-2">
                <div>
                    <label className="block mb-1 text-xs font-medium text-gray-400">
                        Estado
                    </label>
                    <select
                        value={filterEstado}
                        onChange={(e) => {
                            setFilterEstado(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-1.5 cursor-pointer text-sm rounded-lg bg-[#101922] border border-[#1b2a37] text-gray-200"
                    >
                        <option value="TODAS">Todas</option>
                        <option value="NO_LEIDAS">
                            Solo no leídas
                        </option>
                        <option value="LEIDAS">Solo leídas</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-1 text-xs font-medium text-gray-400">
                        Nivel
                    </label>
                    <select
                        value={filterNivel}
                        onChange={(e) => {
                            setFilterNivel(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-1.5 cursor-pointer text-sm rounded-lg bg-[#101922] border border-[#1b2a37] text-gray-200"
                    >
                        <option value="TODOS">Todos</option>
                        <option value="info">Info</option>
                        <option value="success">Éxito</option>
                        <option value="warning">Advertencia</option>
                        <option value="error">Error</option>
                    </select>
                    <button
                        onClick={() =>
                            marcarTodasMutation.mutate()
                        }
                        disabled={
                            marcarTodasMutation.isPending ||
                            notificaciones.length === 0
                        }
                        className="px-3 ml-3 py-2 cursor-pointer text-sm rounded-xl border border-[#19F124] text-[#19F124]
                            hover:bg-[#19F124] hover:text-[#0D1520] disabled:opacity-40 transition"
                    >
                        Marcar todas como leídas
                    </button>
                </div>
            </div>

            {filtradas.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400 bg-[#101922] rounded-xl border border-[#1b2a37]">
                    No hay notificaciones que coincidan con el filtro
                    seleccionado.
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {currentPageItems.map((n) => {
                            const ui = levelUi(n.nivel);
                            const Icon = ui.Icon;
                            return (
                                <motion.div
                                    key={n.id_notificacion}
                                    layout
                                    initial={{
                                        opacity: 0,
                                        y: 8,
                                        scale: 0.98,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -6,
                                        scale: 0.98,
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 22,
                                    }}
                                    className={`relative p-4 pl-5 flex items-start gap-3 rounded-lg border border-[#1b2a37] bg-[#101922]
                                            transition hover:bg-[#1A2430]
                                            ${
                                                n.leido
                                                    ? "opacity-70"
                                                    : "opacity-100"
                                            } ring-1 ${ui.ring}`}
                                >
                                    <div
                                        className={`absolute left-0 top-0 bottom-0 w-1 ${ui.bg}`}
                                    />

                                    <div className="shrink-0 mt-0.5">
                                        <Icon
                                            size={18}
                                            className={ui.text}
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p
                                                className={`text-sm ${
                                                    n.leido
                                                        ? "text-gray-300"
                                                        : "text-white font-semibold"
                                                }`}
                                            >
                                                {n.mensaje}
                                            </p>
                                            {!n.leido && (
                                                <span
                                                    className={`mt-1 w-2 h-2 rounded-full ${ui.bg}`}
                                                />
                                            )}
                                        </div>

                                        {n.observacion && (
                                            <p className="mt-1 text-xs italic text-gray-400">
                                                "{n.observacion}"
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                            {isAdminView && n.tipo && (
                                                <span
                                                    className={`px-2 py-0.5 rounded-full border ${ui.chip}`}
                                                >
                                                    {n.tipo}
                                                </span>
                                            )}
                                            {n.fecha_creacion && (
                                                <span className="text-[#9ccfaa] opacity-80">
                                                    {timeAgo(
                                                        n.fecha_creacion
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-row items-end gap-2 ml-3">
                                        {!n.leido && (
                                            <button
                                                onClick={() =>
                                                    marcarLeidaMutation.mutate(
                                                        n.id_notificacion
                                                    )
                                                }
                                                className="px-2 py-2 cursor-pointer text-xs rounded-md border border-[#19F124] text-[#19F124]
                                                    hover:bg-[#19F124] hover:text-[#0D1520] transition"
                                            >
                                                <FiEye size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={async () => {
                                                const ok =
                                                    await confirm({
                                                        title: "Eliminar notificación",
                                                        description:
                                                            "¿Estás seguro de que querés eliminar esta notificación?",
                                                        confirmtext:
                                                            "Eliminar",
                                                        tone: "danger",
                                                    });

                                                if (!ok) return;
                                                eliminarMutation.mutate(
                                                    n.id_notificacion
                                                );
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-2 text-xs text-red-500 transition-all border border-red-500 rounded-md cursor-pointer hover:bg-red-500/10"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {filtradas.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-400">
                        Página {pageSafe} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setPage((p) => Math.max(1, p - 1))
                            }
                            disabled={pageSafe === 1}
                            className="px-2 py-1 cursor-pointer text-xs rounded-lg border border-[#1b2a37] text-gray-300
                                    disabled:opacity-40 hover:bg-[#101922]"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() =>
                                setPage((p) =>
                                    Math.min(totalPages, p + 1)
                                )
                            }
                            disabled={pageSafe === totalPages}
                            className="px-2 py-1 text-xs cursor-pointer rounded-lg border border-[#1b2a37] text-gray-300
                                    disabled:opacity-40 hover:bg-[#101922]"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
