import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    KpiCard,
    BentoPanel,
    QuickLinkButton,
} from "../../../components/HomeComponents";
import {
    FiUsers,
    FiClipboard,
    FiFileText,
    FiAlertOctagon,
} from "react-icons/fi";
import { dashboardService, userService } from "../../../services/api";
import DonutChart from "../../../components/DonutChart";
import BarChartSimple from "../../../components/BarChartSimple";
import { motion } from "motion/react";

export default function HomeAdmin() {
    const navigate = useNavigate();

    const {
        data: stats = { usuarios: 0, contratos: 0, pendientes: 0 },
        isLoading: loadingStats,
    } = useQuery({
        queryKey: ["adminStats"],
        queryFn: async () => {
            const { data } = await dashboardService.getAdminStats();
            return {
                usuarios:
                    data?.total_usuarios ??
                    data?.totalUsuarios ??
                    data?.totalusuarios ??
                    data?.usuarios ??
                    0,
                contratos:
                    data?.contratos_activos ??
                    data?.contratosActivos ??
                    data?.contratosactivos ??
                    data?.contratos ??
                    0,
                pendientes:
                    data?.documentos_pendientes ??
                    data?.documentosPendientes ??
                    data?.documentospendientes ??
                    data?.pendientes ??
                    0,
            };
        },
        staleTime: 60 * 1000,
    });

    const {
        data: documentosPendientes = [],
        isLoading: loadingPend,
    } = useQuery({
        queryKey: ["admin", "pendientes", { limit: 5 }],
        queryFn: async () => {
            const { data } = await dashboardService.getDocumentosPendientes(5);
            return Array.isArray(data) ? data : [];
        },
        keepPreviousData: true,
        staleTime: 30 * 1000,
    });

    // 🔹 Traemos todos los usuarios para mapear id_persona -> id_usuario
    const {
        data: usuarios = [],
        isLoading: loadingUsuarios,
    } = useQuery({
        queryKey: ["usuariosAll"],
        queryFn: async () => {
            const { data } = await userService.getUsuarios();
            return Array.isArray(data) ? data : [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const {
        data: legajoEstadosRaw = [],
        isLoading: loadingLegajosEstados,
    } = useQuery({
        queryKey: ["admin", "legajos-estados"],
        queryFn: async () => {
            const { data } = await dashboardService.getLegajoEstados();
            if (Array.isArray(data)) return data;
            if (data && typeof data === "object") {
                return Object.entries(data).map(([codigo, cantidad]) => ({
                    codigo,
                    cantidad: Number(cantidad) || 0,
                }));
            }
            return [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const legajoEstadosItems = useMemo(
        () =>
            legajoEstadosRaw.map((item) => ({
                label:
                    item.descripcion ||
                    item.codigo ||
                    item.nombre ||
                    "Sin estado",
                value: Number(item.cantidad || item.total || 0),
            })),
        [legajoEstadosRaw]
    );

    const {
        data: documentosEstadosRaw = [],
        isLoading: loadingDocsEstados,
    } = useQuery({
        queryKey: ["admin", "documentos-estados"],
        queryFn: async () => {
            const { data } = await dashboardService.getDocumentosEstados();
            if (Array.isArray(data)) return data;
            if (data && typeof data === "object") {
                return Object.entries(data).map(([codigo, cantidad]) => ({
                    codigo,
                    cantidad: Number(cantidad) || 0,
                }));
            }
            return [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const documentosEstadosItems = useMemo(
        () =>
            documentosEstadosRaw.map((item) => ({
                label:
                    item.descripcion ||
                    item.codigo ||
                    item.nombre ||
                    "Sin estado",
                value: Number(item.cantidad || item.total || 0),
            })),
        [documentosEstadosRaw]
    );

    // 👉 Usa id_persona para buscar el usuario y navegar con id_usuario
    const handleRevisarClick = (item) => {
        if (!item?.id_persona) return;

        const usuario = usuarios.find(
            (u) =>
                u.id_persona === item.id_persona ||
                u.id_persona === item.idPersona
        );

        if (!usuario) {
            console.error(
                "No se encontró usuario para la persona de este documento pendiente",
                item
            );
            return;
        }

        navigate(`/dashboard/usuarios/${usuario.id_usuario}`);
    };

    return (
        <motion.div
            className="grid items-start grid-cols-1 gap-4 lg:grid-cols-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.02 }}
            >
                <KpiCard
                    label="Usuarios Activos"
                    value={loadingStats ? "..." : stats.usuarios}
                    icon={<FiUsers />}
                />
            </motion.div>

            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.06 }}
            >
                <KpiCard
                    label="Contratos Activos"
                    value={loadingStats ? "..." : stats.contratos}
                    icon={<FiClipboard />}
                />
            </motion.div>

            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
            >
                <KpiCard
                    label="Documentos Pendientes"
                    value={loadingStats ? "..." : stats.pendientes}
                    icon={<FiAlertOctagon />}
                />
            </motion.div>

            <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.15 }}
            >
                <BentoPanel className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-white">
                            Documentos pendientes de revisión
                        </h2>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#0f302d] border border-[#19F124]/40 text-[#19F124]">
                            {loadingStats
                                ? "Cargando..."
                                : `${stats.pendientes} en cola`}
                        </span>
                    </div>

                    <div className="pr-1 space-y-2 overflow-y-auto max-h-40">
                        {loadingPend && (
                            <p className="text-sm text-gray-400">
                                Cargando tareas...
                            </p>
                        )}

                        {!loadingPend && documentosPendientes.length === 0 && (
                            <p className="text-sm text-gray-400">
                                No hay tareas pendientes.
                            </p>
                        )}

                        {documentosPendientes.map((item, index) => (
                            <motion.div
                                key={
                                    item.id ??
                                    `${item.tipo_item || "doc"}-${
                                        item.item_id || index
                                    }`
                                }
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-linear-to-r from-[#101922] to-[#0b1924] border border-white/5 hover:border-[#19F124]/50 transition"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white">
                                        {item.descripcion || "Documento pendiente"}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {item.nombre || item.apellido
                                            ? `de ${item.nombre || ""} ${
                                                item.apellido || ""
                                            }`
                                        : ""}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleRevisarClick(item)}
                                    disabled={loadingUsuarios}
                                    className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0f302d] border border-[#19F124]/60 text-[#19F124] hover:bg-[#19F124] hover:text-[#020c14] disabled:opacity-60 disabled:cursor-not-allowed transition"
                                >
                                    <FiClipboard className="w-3 h-3" />
                                    Revisar
                                </button>
                            </motion.div>
                        ))}
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
                        Administración
                    </h2>
                    <QuickLinkButton
                        label="Gestionar Usuarios"
                        icon={<FiUsers />}
                        onClick={() => navigate("/dashboard/usuarios")}
                    />
                    <QuickLinkButton
                        label="Gestionar Contratos"
                        icon={<FiFileText />}
                        onClick={() => navigate("/dashboard/contratos")}
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
                        Estados de Legajo
                    </h2>
                    {loadingLegajosEstados ? (
                        <p className="text-sm text-gray-400">
                            Cargando datos...
                        </p>
                    ) : legajoEstadosItems.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            Sin datos para mostrar.
                        </p>
                    ) : (
                        <div className="flex items-center justify-center">
                            <div className="origin-center scale-[0.8] sm:scale-90 md:scale-100">
                                <DonutChart items={legajoEstadosItems} />
                            </div>
                        </div>
                    )}
                </BentoPanel>
            </motion.div>

            <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.24 }}
            >
                <BentoPanel className="p-2 space-y-3">
                    <h2 className="text-lg font-semibold text-white">
                        Documentos por Estado
                    </h2>
                    {loadingDocsEstados ? (
                        <p className="text-sm text-gray-400">
                            Cargando datos...
                        </p>
                    ) : documentosEstadosItems.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            Sin datos para mostrar.
                        </p>
                    ) : (
                        <BarChartSimple items={documentosEstadosItems} />
                    )}
                </BentoPanel>
            </motion.div>
        </motion.div>
    );
}
