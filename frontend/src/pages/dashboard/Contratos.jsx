import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { contratoService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
    FiPlus,
    FiSearch,
    FiFileText,
    FiCheckCircle,
    FiClock,
    FiAlertCircle,
    FiTrash2,
    FiFilter,
    FiSettings
} from "react-icons/fi";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";
import { useNavigate } from "react-router-dom";
import {
    isActiveContract,
    isUpcomingContract,
    isFinishedContract,
    getContratoEstado,
} from "../../utils/contratos";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../../components/LoadingState";

const Panel = ({ className = "", ...props }) => (
    <div className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`} {...props} />
);

const SolidBtn = ({ className = "", ...props }) => (
    <button
        className={`px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#0D1520] hover:bg-[#2af935] cursor-pointer transition ${className}`}
        {...props}
    />
);

const OutlineBtn = ({ className = "", ...props }) => (
    <button
        className={`px-3 py-2 rounded-xl border border-[#19F124] text-[#19F124] hover:bg-[#19F124] hover:text-[#0D1520] cursor-pointer transition ${className}`}
        {...props}
    />
);

const MutedBtn = ({ className = "", ...props }) => (
    <button
        className={`p-2 rounded-xl bg-red-500/5 hover:bg-red-500/20 border border-[#ff2c2c] text-[#ff2c2c] cursor-pointer transition ${className}`}
        {...props}
    />
);

const fmt = (s) => {
    if (!s) return "-";
    const fecha = new Date(s);
    return fecha.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
    });
};

const StatCard = ({ icon, label, value }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
    >
        <Panel className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#101922] flex items-center justify-center text-[#9fb2c1]">
                {icon}
            </div>
            <div>
                <div className="text-sm text-[#9fb2c1]">{label}</div>
                <div className="text-2xl font-semibold text-[#19F124]">{value}</div>
            </div>
        </Panel>
    </motion.div>
);

export default function Contratos() {
    const qc = useQueryClient();
    const toast = useToast();
    const confirm = useConfirm();
    const { user } = useAuth();
    const isAdmin = !!user?.roles?.includes("ADMIN");
    const isRRHH = !!user?.roles?.includes("RRHH");
    const canVerKpisContratos = isAdmin || isRRHH;
    const canCrearContratos = isAdmin || isRRHH;
    const canDeleteContratos = isAdmin || isRRHH;
    const navigate = useNavigate();

    const [filtroEstado, setFiltroEstado] = useState("TODOS");
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState(null);
    const selectedId = selected?.id_persona ?? null;
    const [busyId, setBusyId] = useState(null);
    const [isExporting, setIsExporting] = useState(false); 
    const [isDeleting, setIsDeleting] = useState(false);
    const [showTarifaModal, setShowTarifaModal] = useState(false);
    const [tarifasEdit, setTarifasEdit] = useState([]);
    const [isSavingTarifas, setIsSavingTarifas] = useState(false);

    const [showFiltroMenu, setShowFiltroMenu] = useState(false);
    const filtroRef = useRef(null);

    const filtroLabels = {
        TODOS: "Todos",
        ACTIVO: "Activos",
        PROXIMO: "Próximos a vencer",
        FINALIZADO: "Finalizados",
    };
    const filtroLabelActual = filtroLabels[filtroEstado] || "Todos";

    useEffect(() => {
        if (!showFiltroMenu) return;
        const handleClickOutside = (e) => {
            if (filtroRef.current && !filtroRef.current.contains(e.target)) {
                setShowFiltroMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showFiltroMenu]);

    const {
        data: contratosAllData = {
            items: [],
            kpis: { total: 0, activos: 0, proximos: 0, finalizados: 0 },
        },
    } = useQuery({
        queryKey: ["contratos", "all"],
        enabled: canVerKpisContratos,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        queryFn: async () => {
            const { data } = await contratoService.getContratos();
            const items = Array.isArray(data) ? data : [];
            const total = items.length;
            const activos = items.filter((c) => isActiveContract(c)).length;
            const proximos = items.filter((c) => isUpcomingContract(c)).length;
            const finalizados = items.filter((c) => isFinishedContract(c)).length;
            const kpis = { total, activos, proximos, finalizados };
            return { items, kpis };
        },
    });

    const allContracts = contratosAllData.items;
    const kpis = contratosAllData.kpis;

    const { data: empleados = [], isLoading: loadingEmps } = useQuery({
        queryKey: ["empleados", q],
        queryFn: async () => {
            const { data } = await contratoService.getEmpleados(q, 1, 50);
            return Array.isArray(data) ? data : [];
        },
        placeholderData: keepPreviousData,
    });

    const { data: contratosPersona = [], isLoading: loadingItems } = useQuery({
        queryKey: ["contratos", "byPersona", selectedId],
        enabled: !!selectedId,
        queryFn: async () => {
            const { data } = await contratoService.getContratos(selectedId);
            return Array.isArray(data) ? data : [];
        },
    });

    const { 
        data: tarifasConfig,
        isLoading: loadingTarifasConfig,
        isError: errorTarifasConfig,
    } = useQuery({
        queryKey: ["perfil-tarifas-config"],
        enabled: showTarifaModal,
        retry: false,
        queryFn: async () => {
            const { data } = await contratoService.getPerfilTarifasConfig();
            return Array.isArray(data) ? data : [];
        },
    });


    useEffect(() => {
        if(showTarifaModal && Array.isArray(tarifasConfig)) {
            setTarifasEdit(tarifasConfig.map((t) => ({ ...t })));
        }
    }, [showTarifaModal, tarifasConfig]);

    const updateTarifaMutation = useMutation({
    mutationFn: ({ id_tarifa, monto_hora }) =>
        contratoService.updatePerfilTarifa(id_tarifa, { monto_hora }),
});

    const handleSaveAllTarifas = async () => {
        setIsSavingTarifas(true);
        try {
            const updates = tarifasEdit
                .map((t) => ({
                    id_tarifa: t.id_tarifa,
                    monto_hora: Number(t.monto_hora),
                }))
                .filter((t) => !Number.isNaN(t.monto_hora));

            for (const payload of updates) {
                await updateTarifaMutation.mutateAsync(payload);
            }

            toast.success("Tarifas actualizadas con éxito");
            qc.invalidateQueries({ queryKey: ["perfil-tarifas-config"] });
            qc.invalidateQueries({
                predicate: ({ queryKey }) =>
                    Array.isArray(queryKey) && queryKey[0] === "tarifas-contrato",
            });
            setShowTarifaModal(false);
        } catch (error) {
            console.error(error);
            toast.error(
                error?.response?.data?.error || "No se pudo actualizar las tarifas"
            );
        } finally {
            setIsSavingTarifas(false);
        }
    };

    const handleSaveTarifa = (tarifa) => {
        updateTarifaMutation.mutate({
            id_tarifa: tarifa.id_tarifa,
            monto_hora: Number(tarifa.monto_hora),
        });
    };

    const deleteContratoMutation = useMutation({
        mutationFn: (id_contrato_profesor) => contratoService.remove(id_contrato_profesor),
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: ["contratos", "all"] });
            if (selectedId) {
                qc.setQueryData(["contratos", "byPersona", selectedId], (prev = []) =>
                    (prev || []).filter((x) => x.id_contrato_profesor !== id)
                );
            }
            toast.success("Contrato eliminado con éxito");
        },
        onError: (error) => {
            console.error(error);
            toast.error(error?.response?.data?.error || "No se pudo eliminar el contrato");
        },
    });

    const contratosFiltrados = useMemo(() => {
        if (!contratosPersona) return [];
        if (filtroEstado === "TODOS") return contratosPersona;
        return contratosPersona.filter((c) => getContratoEstado(c) === filtroEstado);
    }, [contratosPersona, filtroEstado]);

    const mostrarColMaterias = useMemo(() => {
        if (!contratosPersona || !contratosPersona.length) return false;
        return contratosPersona.some((c) => {
            if(Array.isArray(c.items) && c.items.some((it) => 
                it.tipo_item === "DOCENCIA" ||
                it.descripcion_materia ||
                it.id_materia
            )) {
                return true;
            }
            if (Array.isArray(c.materias) && c.materias.length) return true;
            return false;
        });
    }, [contratosPersona]);

    const mostrarColCargo = useMemo (() => {
        if (!contratosPersona || !contratosPersona.length) return false;
        return contratosPersona.some((c) => {
            if (Array.isArray(c.items) && c.items.some((it) => 
                it.tipo_item && it.tipo_item !== "DOCENCIA"
            )) {
                return true;
            }
            return false;
        });
    }, [contratosPersona]);

    const totalCols = useMemo(
        () => 7 + (mostrarColMaterias ? 1 : 0) + (mostrarColCargo ? 1 : 0),
        [mostrarColMaterias, mostrarColCargo]
    )

    const eliminar = async (row) => {
        if (!canDeleteContratos) return;
        const ok = await confirm({
            title: "Eliminar contrato",
            description: `¿Estás seguro que deseas eliminar el contrato #${row.id_contrato_profesor}? Esta acción no se puede deshacer.`,
            confirmtext: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        setIsDeleting(true);
        try {
            setBusyId(row.id_contrato_profesor);
            await deleteContratoMutation.mutateAsync(row.id_contrato_profesor);
        } catch (error) {
            console.error("Error al eliminar el contrato", error);
            toast.error("Error al eliminar el contrato");
        } finally {
            setBusyId(null);
            setIsDeleting(false);
        }
    };

    const exportar = async (row, format = "pdf") => {
        setIsExporting(true);
        try {
            const contratoId = row.id_contrato_profesor;
            const { url, filename } = await contratoService.exportarContrato(
            contratoId,
            format
            );

            const a = document.createElement("a");
            a.href = url;

            if (filename) {
            a.download = filename;
            } else {
            const ext = format === "word" ? "docx" : "pdf";
            a.download = `CONTRATO-${contratoId}.${ext}`;
            }

            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("Contrato exportado con éxito");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo exportar el contrato");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <motion.div
                className="p-6 flex flex-col gap-5 h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
            >
                <div className="space-y-5 shrink-0">
                    <h1 className="ml-5 text-4xl font-medium text-white">
                        Gestión de Contratos
                    </h1>

                    {canVerKpisContratos && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard icon={<FiFileText />} label="Total Contratos" value={kpis.total} />
                            <StatCard
                                icon={<FiCheckCircle />}
                                label="Contratos Activos"
                                value={kpis.activos}
                            />
                            <StatCard icon={<FiClock />} label="Próximos" value={kpis.proximos} />
                            <StatCard
                                icon={<FiAlertCircle />}
                                label="Finalizados"
                                value={kpis.finalizados}
                            />
                        </div>
                    )}

                    <div className="flex flex-row w-full gap-3">
                        <Panel className="flex items-center w-full gap-3 p-3">
                            <div className="px-3 py-2 rounded-xl bg-[#101922] flex items-center gap-2 w-full">
                                <FiSearch className="text-[#9fb2c1]" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Buscar por nombre o DNI del empleado…"
                                    className="w-full bg-transparent outline-none"
                                />
                            </div>
                        </Panel>

                        <div className="flex items-stretch gap-2">
                            <div className="relative" ref={filtroRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowFiltroMenu((v) => !v)}
                                    className="flex items-center gap-2 h-full px-3 py-2 text-sm rounded-xl bg-[#101922] border border-[#1b2a37] hover:bg-[#1b2733] cursor-pointer transition-all"
                                >
                                    <FiFilter className="text-[#9fb2c1]" size={18} />
                                    <span className="text-[#e5f2ff]">{filtroLabelActual}</span>
                                </button>

                                <AnimatePresence>
                                    {showFiltroMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 z-20 mt-2 w-56 rounded-xl bg-[#101922] transition-all border border-[#1b2a37] shadow-xl overflow-hidden"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFiltroEstado("TODOS");
                                                    setShowFiltroMenu(false);
                                                }}
                                                className={`flex transition-all w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[#e5f2ff] hover:bg-[#1b2733] ${
                                                    filtroEstado === "TODOS" ? "bg-[#1b2733]" : ""
                                                }`}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-[#9fb2c1]" />
                                                <span>Todos</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFiltroEstado("ACTIVO");
                                                    setShowFiltroMenu(false);
                                                }}
                                                className={`flex transition-all cursor-pointer w-full items-center gap-2 px-3 py-2 text-sm text-[#e5f2ff] hover:bg-[#1b2733] ${
                                                    filtroEstado === "ACTIVO" ? "bg-[#1b2733]" : ""
                                                }`}
                                            >
                                                <span className="w-2 h-2 bg-green-400 rounded-full" />
                                                <span>Activos</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFiltroEstado("PROXIMO");
                                                    setShowFiltroMenu(false);
                                                }}
                                                className={`flex transition-all w-full items-center cursor-pointer gap-2 px-3 py-2 text-sm text-[#e5f2ff] hover:bg-[#1b2733] ${
                                                    filtroEstado === "PROXIMO" ? "bg-[#1b2733]" : ""
                                                }`}
                                            >
                                                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                                                <span>Próximos a vencer</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFiltroEstado("FINALIZADO");
                                                    setShowFiltroMenu(false);
                                                }}
                                                className={`flex transition-all w-full items-center cursor-pointer gap-2 px-3 py-2 text-sm text-[#e5f2ff] hover:bg-[#1b2733] ${
                                                    filtroEstado === "FINALIZADO" ? "bg-[#1b2733]" : ""
                                                }`}
                                            >
                                                <span className="w-2 h-2 bg-red-400 rounded-full" />
                                                <span>Finalizados</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button 
                                type="button" 
                                onClick={() => setShowTarifaModal(true)} 
                                className="flex items-center gap-2 h-full px-3 py-2 text-sm rounded-xl bg-[#101922] border border-[#1b2a37] hover:bg-[#1b2733] cursor-pointer transition-all"
                                title="Configurar tarifas por perfil"
                            >
                                <FiSettings className="text-[#9fb2c1]" size={18}/>
                                <span className="hidden sm:inline text-[#e5f2ff]">
                                    Tarifas
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid flex-1 min-h-[450px] grid-cols-1 gap-4 xl:grid-cols-12">
                    <Panel className="flex flex-col h-full p-0 overflow-hidden xl:col-span-3 2xl:col-span-3">
                        <div className="p-4 border-b border-[#1b2a37] flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-semibold">Empleados</h3>
                                <div className="text-xs text-[#9fb2c1]">
                                    {(empleados || []).length} total
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            {loadingEmps && 
                                <div className="flex items-center justify-center h-full">
                                    <LoadingState
                                        classNameContainer="min-h-0"
                                        classNameImg="w-25 h-25"
                                    />
                                </div>
                            }
                            {!loadingEmps && empleados.length === 0 && (
                                <div className="p-4 opacity-70">No se encontraron empleados</div>
                            )}
                            <ul className="divide-y divide-[#1b2a37]">
                                {empleados.map((e, idx) => {
                                    const active = selected?.id_persona === e.id_persona;
                                    return (
                                        <motion.li
                                            key={e.id_persona}
                                            onClick={() => setSelected(e)}
                                            className={`
                                                p-3 cursor-pointer hover:bg-[#101922] transition
                                                ${active ? "bg-[#101922]" : ""}
                                            `}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            layout
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">
                                                        {e.apellido} {e.nombre}
                                                    </div>
                                                    <div className="text-xs text-[#9fb2c1]">
                                                        DNI: {e.dni}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[#19F124]">
                                                    Activos: {e.activos ?? 0}
                                                </div>
                                            </div>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </div>
                    </Panel>

                    <div className="flex flex-col h-full overflow-hidden xl:col-span-9 2xl:col-span-9">
                        <AnimatePresence mode="wait">
                            {!selected ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    <Panel className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <div className="mx-auto w-14 h-14 rounded-full bg-[#101922] flex items-center justify-center text-[#9fb2c1]">
                                                <FiFileText size={24} />
                                            </div>
                                            <h3 className="mt-3 text-lg font-semibold">
                                                Selecciona un empleado
                                            </h3>
                                            <p className="text-sm opacity-70">
                                                Elige una persona de la lista para ver sus contratos
                                            </p>
                                        </div>
                                    </Panel>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="detail"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    <Panel className="flex flex-col h-full overflow-hidden">
                                        <div className="flex items-center justify-between p-4 border-b border-[#1b2a37] shrink-0">
                                            <h3 className="font-semibold">
                                                Contratos de: {selected.apellido} {selected.nombre}
                                            </h3>
                                            {canCrearContratos && (
                                                <SolidBtn
                                                    onClick={() =>
                                                        navigate(
                                                            `/dashboard/contratos/nuevo/${selected.id_persona}`
                                                        )
                                                    }
                                                >
                                                    <span className="inline-flex items-center gap-2">
                                                        <FiPlus /> Nuevo Contrato
                                                    </span>
                                                </SolidBtn>
                                            )}
                                        </div>

                                        {loadingItems ? (
                                            <div className="flex items-center justify-center h-full">
                                                <LoadingState
                                                    classNameContainer="min-h-0"
                                                    classNameImg="w-30 h-30"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-auto [scrollbar-gutter:stable] min-h-0">
                                                <table className="min-w-full text-sm">
                                                    <thead className="text-[#9fb2c1] sticky top-0 bg-[#0b1420] z-10">
                                                        <tr>
                                                            <th className="p-3 text-left">#</th>

                                                            {mostrarColMaterias && (
                                                                <th className="p-3 text-left">Materias</th>
                                                            )}

                                                            {mostrarColCargo && (
                                                                <th className="p-3 text-left">Cargo</th>
                                                            )}
                                                            <th className="p-3 text-left">Período</th>
                                                            <th className="p-3 text-left">Horas (sem)</th>
                                                            <th className="p-3 text-left">Inicio</th>
                                                            <th className="p-3 text-left">Fin</th>
                                                            <th className="p-3 text-left">Estado</th>
                                                            <th className="p-3 text-right">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <AnimatePresence initial={false}>
                                                            {contratosFiltrados.map((r) => {
                                                                    const itemsRow = Array.isArray(r.items) ? r.items : [];
                                                                        let materiasEtiquetas = [];
                                                                        let cargosEtiquetas = [];

                                                                        if (itemsRow.length) {
                                                                            materiasEtiquetas = itemsRow
                                                                                .filter((it) => it.tipo_item === "DOCENCIA")
                                                                                .map((it) => {
                                                                                    const base = it.descripcion_materia || "Materia";
                                                                                    const cargo = it.codigo_cargo || it.cargo;
                                                                                    return cargo ? `${base} (${cargo})` : base;
                                                                                });

                                                                            cargosEtiquetas = itemsRow
                                                                                .filter((it) => it.tipo_item && it.tipo_item !== "DOCENCIA")
                                                                                .map((it) => {
                                                                                    const cargo = it.codigo_cargo || it.cargo;
                                                                                    const actividad = it.descripcion_actividad || "";
                                                                                    const perfil = it.perfil_codigo;
                                                                                    let texto = actividad || cargo || "Actividad";
                                                                                    if (actividad && cargo) texto = `${actividad} (${cargo})`;
                                                                                    if (perfil) texto += ` - ${perfil}`;
                                                                                    return texto;
                                                                                });
                                                                        } else if (Array.isArray(r.materias) && r.materias.length) {
                                                                            materiasEtiquetas = r.materias.map((m) => {
                                                                                const rol = m.cargo ? ` (${m.cargo})` : "";
                                                                                return `${m.descripcion_materia}${rol}`;
                                                                            });
                                                                        }

                                                                        const materiaLabel =
                                                                            materiasEtiquetas.length > 1
                                                                                ? `${materiasEtiquetas[0]} +${materiasEtiquetas.length - 1}`
                                                                                : materiasEtiquetas[0] || "—";

                                                                        const cargoLabel =
                                                                            cargosEtiquetas.length > 1
                                                                                ? `${cargosEtiquetas[0]} +${cargosEtiquetas.length - 1}`
                                                                                : cargosEtiquetas[0] || "—";

                                                                        const estado = getContratoEstado(r);
                                                                        const estadoClasses =
                                                                            estado === "ACTIVO"
                                                                                ? "bg-green-500/10 text-green-400 border border-green-500/40"
                                                                                : estado === "PROXIMO"
                                                                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/40"
                                                                                : estado === "FINALIZADO"
                                                                                ? "bg-red-500/10 text-red-400 border border-red-500/40"
                                                                                : "bg-gray-500/10 text-gray-300 border border-gray-500/40";

                                                                return (
                                                                    <motion.tr
                                                                        key={r.id_contrato_profesor}
                                                                        className="border-t border-[#15202b]"
                                                                        initial={{ opacity: 0, y: 4 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -4 }}
                                                                        transition={{ duration: 0.18 }}
                                                                    >
                                                                        <td className="p-3">
                                                                            {r.id_contrato_profesor}
                                                                        </td>
                                                                        {mostrarColMaterias && (
                                                                            <td
                                                                                className="p-3 max-w-[200px] truncate"
                                                                                title={materiasEtiquetas.join(", ")}
                                                                            >
                                                                                {materiasEtiquetas.length ? materiaLabel : "—"}
                                                                            </td>
                                                                        )}

                                                                        {mostrarColCargo && (
                                                                            <td
                                                                                className="p-3 max-w-[200px] truncate"
                                                                                title={cargosEtiquetas.join(", ")}
                                                                            >
                                                                                {cargosEtiquetas.length ? cargoLabel : "—"}
                                                                            </td>
                                                                        )}                                                                 
                                                                        <td className="p-3">
                                                                            {r.periodo_descripcion ||
                                                                                r.nombre_periodo ||
                                                                                `Período ${
                                                                                    r.id_periodo ?? "-"
                                                                                }`}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            {r.horas_semanales}
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
                                                                                {estado === "PROXIMO"
                                                                                    ? "Próximo a vencer"
                                                                                    : estado}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <OutlineBtn
                                                                                    onClick={() =>
                                                                                        exportar(r, "pdf")
                                                                                    }
                                                                                >
                                                                                    PDF
                                                                                </OutlineBtn>
                                                                                <OutlineBtn
                                                                                    onClick={() =>
                                                                                        exportar(r, "word")
                                                                                    }
                                                                                >
                                                                                    Word
                                                                                </OutlineBtn>
                                                                                {canDeleteContratos && (
                                                                                    <MutedBtn
                                                                                        disabled={
                                                                                            busyId ===
                                                                                            r.id_contrato_profesor
                                                                                        }
                                                                                        onClick={() =>
                                                                                            eliminar(r)
                                                                                        }
                                                                                        title="Eliminar contrato"
                                                                                        aria-label={`Eliminar contrato ${r.id_contrato_profesor}`}
                                                                                        className={`p-2 ${
                                                                                            busyId ===
                                                                                            r.id_contrato_profesor
                                                                                                ? "opacity-50"
                                                                                                : ""
                                                                                        }`}
                                                                                    >
                                                                                        <FiTrash2 size={18} />
                                                                                    </MutedBtn>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </motion.tr>
                                                                );
                                                            })}
                                                        </AnimatePresence>

                                                        {!contratosFiltrados.length && !loadingItems && (
                                                            <tr>
                                                                <td className="p-4 text-center opacity-70" colSpan={totalCols}>
                                                                    Sin contratos
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </Panel>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isExporting && (
                    <motion.div
                        className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-32 h-32"
                        />
                    </motion.div>
                )}
                {isDeleting && (
                    <motion.div
                        className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-32 h-32"
                        />
                    </motion.div>
                )}
                {isSavingTarifas && (
                    <motion.div
                        className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-32 h-32"
                        />
                    </motion.div>
                )}
            </AnimatePresence>



            {showTarifaModal && (
                <motion.div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowTarifaModal(false)}
                    />
                    <motion.div
                        className="relative z-10 w-[95%] max-w-4xl bg-[#0b1420] border border-[#1b2a37] rounded-2xl p-5 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[#e5f2ff]">
                                Configuración de tarifas por perfil
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowTarifaModal(false)}
                                className="px-3 py-1 text-sm rounded-xl border border-[#2B3642] hover:bg-[#1A2430] cursor-pointer transition-all"
                            >
                                Cerrar
                            </button>
                        </div>

                        {loadingTarifasConfig ? (
                            <div className="flex items-center justify-center py-10">
                                <LoadingState
                                    classNameContainer="min-h-0"
                                    classNameImg="w-24 h-24"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="max-h-[60vh] overflow-auto [scrollbar-gutter:stable]">
                                    <table className="min-w-full text-xs sm:text-sm">
                                        <thead className="sticky top-0 bg-[#0b1420] text-[#9fb2c1] z-10">
                                            <tr>
                                                <th className="p-2 text-left">Perfil</th>
                                                <th className="p-2 text-left">Monto / hora</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tarifasEdit.map((t) => (
                                                <tr
                                                    key={t.id_tarifa}
                                                    className="border-t border-[#1b2a37]"
                                                >
                                                    <td className="p-2">
                                                        {t.descripcion ||
                                                            t.perfil_nombre ||
                                                            t.perfil_codigo ||
                                                            t.id_perfil}
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full px-2 py-1 rounded-lg bg-[#151f2b] text-xs sm:text-sm"
                                                            value={t.monto_hora ?? ""}
                                                            onChange={(e) =>
                                                                setTarifasEdit((prev) =>
                                                                    prev.map((row) =>
                                                                        row.id_tarifa === t.id_tarifa
                                                                            ? {
                                                                                ...row,
                                                                                monto_hora:
                                                                                    e.target.value,
                                                                            }
                                                                            : row
                                                                    )
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ))}

                                            {!tarifasEdit.length && (
                                                <tr>
                                                    <td
                                                        colSpan={2}
                                                        className="p-4 text-center opacity-70"
                                                    >
                                                        No hay tarifas configuradas.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end mt-4">
                                    <SolidBtn
                                        type="button"
                                        className="px-6 py-2 text-sm"
                                        disabled={isSavingTarifas || !tarifasEdit.length}
                                        onClick={handleSaveAllTarifas}
                                    >
                                        {isSavingTarifas ? "Guardando..." : "Guardar"}
                                    </SolidBtn>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </>
    );
}