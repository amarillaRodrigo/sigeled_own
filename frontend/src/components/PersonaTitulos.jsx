import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    tituloService,
    archivoService,
    estadoVerificacionService,
    legajoService,
} from "../services/api";
import { IoClose } from "react-icons/io5";
import {
    FiTrash2,
    FiCalendar,
    FiEye,
    FiRefreshCcw,
    FiCheck,
    FiX,
    FiAlertTriangle,
    FiClock,
} from "react-icons/fi";
import { LuBuilding } from "react-icons/lu";
import { IoSchoolOutline } from "react-icons/io5";
import PdfPreviewModal from "./PdfPreviewModal";
import RequestDeleteModal from "./SolicitarEliminacionModal";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "./LoadingState";

const estadoIconEl = (codigo) => {
    switch (String(codigo).toUpperCase()) {
        case "APROBADO":
        return <FiCheck size={20} />;
        case "RECHAZADO":
        return <FiX size={20} />;
        case "OBSERVADO":
        return <FiAlertTriangle size={20} />;
        default:
        return <FiClock size={20} />;
    }   
};

const getEstadoClasses = (codigo) => {
    switch (String(codigo).toUpperCase()) {
        case "APROBADO":
        return "bg-green-500/15 border border-green-500/40 text-green-400";
        case "RECHAZADO":
        return "bg-red-500/15 border border-red-500/40 text-red-400";
        case "OBSERVADO":
        return "bg-gray-500/15 border border-gray-500/40 text-gray-400";
        default:
        return "bg-yellow-500/15 border border-yellow-500/40 text-yellow-300";
    }
};

const FALLBACK_ESTADOS = [
    { id_estado: 1, codigo: "PENDIENTE", nombre: "Pendiente de Revisión" },
    { id_estado: 2, codigo: "APROBADO", nombre: "Aprobado" },
    { id_estado: 3, codigo: "RECHAZADO", nombre: "Rechazado" },
    { id_estado: 4, codigo: "OBSERVADO", nombre: "Observado" },
];

export default function PersonaTitulos({
        idPersona,
        onClose,
        asModal = true,
        showPersonaId = true,
        canDelete = true,
        canChangeState = true,
        onRequestDelete,
    }) {
    const toast = useToast();
    const confirm = useConfirm();
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [savingEstado, setSavingEstado] = useState(false); 

    const queryClient = useQueryClient();

    const recalcularLegajo = async () => {
        if (!idPersona) return;
        try {
        await legajoService.recalcular(idPersona);
        queryClient.invalidateQueries({ queryKey: ["legajo", "estado", idPersona] });
        } catch (error) {
        console.error("No se pudo recalcular legajo:", error);
        }
    };

    const [verificacion, setVerificacion] = useState({
        open: false,
        titulo: null,
        estado: "",
        obs: "",
    });

    const [deletingId, setDeletingId] = useState(null);

    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [id_tipo_titulo, setIdTipoTitulo] = useState("");
    const [nombre_titulo, setNombreTitulo] = useState("");
    const [institucion, setInstitucion] = useState("");
    const [fecha_emision, setFechaEmision] = useState("");
    const [matricula_prof, setMatriculaProf] = useState("");
    const [archivo, setArchivo] = useState(null);

    const [reqDelTit, setReqDelTit] = useState({ open: false, target: null });

    const [preview, setPreview] = useState({ open: false, url: "", title: "" });
    const showOverlay = loadingPreview || saving || savingEstado;

    const {
        data: titulos = [],
        isLoading: isLoadingTitulos,
    } = useQuery({
        queryKey: ["titulos", idPersona],
        queryFn: async () => {
        if (!idPersona) return [];
        const { data } = await tituloService.findTituloByPersona(idPersona);
        return Array.isArray(data) ? data : [];
        },
        enabled: !!idPersona,
    });

    const { data: tipos = [] } = useQuery({
        queryKey: ["tiposTitulo"],
        queryFn: () => tituloService.getTiposTitulos().then((res) => res.data),
        staleTime: 1000 * 60 * 60,
    });

    const { data: estados = FALLBACK_ESTADOS } = useQuery({
        queryKey: ["estadosVerificacion"],
        queryFn: () => estadoVerificacionService.getAll().then((res) => res.data),
        staleTime: 1000 * 60 * 60,
        initialData: FALLBACK_ESTADOS,
    });

    const createTituloMutation = useMutation({
        mutationFn: async (body) => {
        let id_archivo = null;
        if (archivo) {
            const up = await archivoService.uploadForPersona(idPersona, archivo);
            id_archivo =
            up?.data?.id_archivo ?? up?.data?.archivo?.id_archivo ?? null;
        }
        return tituloService.createTitulo({ ...body, id_archivo });
        },
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["titulos", idPersona] });
        resetForm();
        setShowNew(false);
        toast.success("Título creado con éxito");
        },
        onError: (error) => {
        console.error("Error al crear título:", error);
        toast.error("No se pudo crear el título");
        },
        onSettled: () => {
        setSaving(false);
        },
    });

    const deleteTituloMutation = useMutation({
        mutationFn: (t) => tituloService.deleteTitulo(idPersona, t.id_titulo),
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["titulos", idPersona] });
        recalcularLegajo();
        toast.success("Título eliminado con éxito");
        },
        onError: (error) => {
        console.error(
            "No se pudo eliminar el título:",
            error?.response?.data || error.message
        );
        const message =
            error?.response?.data?.message ||
            error?.response?.data?.detalle ||
            "No se pudo eliminar el título";
        toast.error(message);
        },
        onSettled: () => {
        setDeletingId(null);
        },
    });

    const changeStateMutation = useMutation({
        mutationFn: ({ tituloId, payload }) =>
            tituloService.cambiarEstado(tituloId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["titulos", idPersona] });
            queryClient.invalidateQueries({ queryKey: ["adminStats"] });
            queryClient.invalidateQueries({ queryKey: ["documentosPendientes"] });
            recalcularLegajo();
            closeCambiarEstado();
            toast.success("Estado cambiado con éxito");
        },
        onError: (error) => {
            console.error("Error al cambiar estado:", error);
            toast.error("No se pudo cambiar el estado");
        },
        onSettled: () => {
            setSavingEstado(false);
        },
    });

    const tipoById = (id) =>
        tipos.find((t) => Number(t.id_tipo_titulo) === Number(id));

    const estadoById = (id) =>
        estados.find((e) => Number(e.id_estado) === Number(id));

    const requiereObs = (id_estado) => {
        const code = String(estadoById(id_estado)?.codigo || "").toUpperCase();
        return code === "RECHAZADO" || code === "OBSERVADO";
    };

    const openCambiarEstado = (t) => {
        const current = t.id_estado_verificacion ?? "";
        setVerificacion({ open: true, titulo: t, estado: String(current), obs: "" });
    };

    const closeCambiarEstado = () =>
        setVerificacion({ open: false, titulo: null, estado: "", obs: "" });

    const submitCambiarEstado = async (e) => {
        e.preventDefault();
        if (!verificacion.titulo) return;
        const id_estado_verificacion = Number(verificacion.estado);

        if (requiereObs(id_estado_verificacion) && !verificacion.obs.trim()) {
            toast.warning(
                "Debés indicar una observación para Rechazado/Observado"
            );
            return;
        }
        const payload = {
            id_estado_verificacion,
            observacion: verificacion.obs.trim() || null,
        };

        setSavingEstado(true); 

        changeStateMutation.mutate({
            tituloId: verificacion.titulo.id_titulo,
            payload,
        });
    };


    const openPreview = async (doc) => {
        if (!doc.id_archivo) return;
        setLoadingPreview(true);
        try {
            const { data } = await archivoService.getSignedUrl(doc.id_archivo);
            setPreview({
                open: true,
                url: data.url ?? data.signedUrl,
                title: doc.archivo_nombre || data.nombre_original || "Documento",
            });
            } catch (error) {
                console.error(
                    "No se pudo abrir el documento:",
                    error?.response?.data || error.message
            );
            toast.error("No se pudo abrir el documento");
        } finally {
            setLoadingPreview(false);
        }
    };

    const closePreview = () =>
        setPreview({ open: false, url: "", title: "" });

    const titulosOrdenados = useMemo(
        () =>
        [...titulos].sort((a, b) =>
            String(b.id_titulo).localeCompare(String(a.id_titulo))
        ),
        [titulos]
    );

    const resetForm = () => {
        setIdTipoTitulo("");
        setNombreTitulo("");
        setInstitucion("");
        setFechaEmision("");
        setMatriculaProf("");
        setArchivo(null);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!id_tipo_titulo || !nombre_titulo) {
        toast.warning("Completá tipo de título y nombre de titulo");
        return;
        }
        setSaving(true);
        const body = {
        id_persona: idPersona,
        id_tipo_titulo: Number(id_tipo_titulo),
        nombre_titulo,
        institucion: institucion || null,
        fecha_emision: fecha_emision || null,
        matricula_prof: matricula_prof || null,
        id_estado_verificacion: 1,
        };
        createTituloMutation.mutate(body);
    };

    const handleDelete = async (t) => {
        const ok = await confirm({
            title: "Eliminar título",
            description: `¿Estas seguro que deseas eliminar "${t.nombre_titulo}"? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;

        setLoadingPreview(true);
        
        try {
            await deleteTituloMutation.mutateAsync(t);
        } catch (error) {
        } finally {
            setLoadingPreview(false);
        }
    };
    const handleAskDelete = (t) => {
        const label = t.nombre_titulo || `Título #${t.id_titulo}`;
        setReqDelTit({ open: true, target: { id: t.id_titulo, label } });
    };

    const renderPanel = () => (
        <div className="w-full max-w-none rounded-2xl bg-[#101922] p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
            <h3 className="text-2xl font-semibold text-[#19F124]">Títulos</h3>
            {onClose && asModal && (
            <button
                className="p-1 rounded-lg hover:bg-[#1A2430] cursor-pointer"
                onClick={onClose}
            >
                <IoClose size={22} />
            </button>
            )}
        </div>

        <div className="flex items-center justify-between mb-3">
            {showPersonaId && (
            <p className="text-lg opacity-80">
                Persona: <span className="font-semibold">{idPersona}</span>
            </p>
            )}
            <button
            onClick={() => setShowNew(true)}
            className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] hover:bg-[#2af935] text-[#101922] transition"
            >
            Agregar título +
            </button>
        </div>

        {isLoadingTitulos ? (
            <div className="pt-20 pb-20">
                <LoadingState classNameContainer="" classNameImg="w-30 h-30"/>
            </div>
        ) : titulosOrdenados.length === 0 ? (
            <p className="opacity-70">Sin títulos cargados.</p>
        ) : (
            <ul className="space-y-3">
            <AnimatePresence initial={false}>
                {titulosOrdenados.map((t) => {
                const estado =
                    estadoById(t.id_estado_verificacion || t.id_estado);

                return (
                    <motion.li
                    key={`t-${t.id_titulo ?? t.nombre_titulo}`}
                    className="flex gap-4 px-5 py-4 rounded-2xl bg-[#0D1520] shadow-md hover:shadow-lg transition"
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                        mass: 0.6,
                    }}
                    >
                    <div className="w-20 h-20 rounded-xl bg-[#19F124]/10 flex items-center justify-center">
                        <IoSchoolOutline
                        size={45}
                        className="text-[#19F124]"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 text-lg font-semibold text-white">
                        <span className="truncate">
                            {t.nombre_titulo}
                        </span>
                        {estado && (
                            <div
                            className={`flex items-center pt-1 pb-1 pl-3 pr-3 rounded-3xl gap-1 ${getEstadoClasses(
                                estado.codigo
                            )}`}
                            >
                            {estadoIconEl(estado.codigo)}
                            <span className="text-sm font-medium">
                                {estado.nombre}
                            </span>
                            </div>
                        )}
                        </div>

                        <div className="flex items-center mb-1 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                            <LuBuilding size={20} />
                            <span className="opacity-90">
                            {t.institucion || "—"}
                            </span>
                        </div>
                        </div>

                        <div className="flex flex-wrap mb-2 text-sm text-gray-400 gap-x-6">
                        <div className="flex items-center font-normal gap-1 bg-[#39793c] text-white p-1 rounded-xl pl-2 pr-2 text-lg">
                            <span>{t.tipo_titulo || "Sin tipo"}</span>
                        </div>
                        {t.fecha_emision && (
                            <div className="flex items-center gap-1">
                            <span className="text-[#19F124]/80">
                                <FiCalendar size={20} />
                            </span>
                            <span>
                                {new Date(
                                t.fecha_emision
                                ).toLocaleDateString()}
                            </span>
                            </div>
                        )}
                        </div>

                        {t.observacion && (
                        <p className="mt-1 text-sm italic text-gray-300">
                            Observación: {t.observacion}
                        </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                        {t.id_archivo && (
                            <button
                            type="button"
                            onClick={() => openPreview(t)}
                            className="flex w-30 items-center cursor-pointer justify-center gap-2 bg-[#0f302d] border border-[#095f44] hover:bg-[#104e3a] text-[#19F124] rounded-lg py-1 text-sm font-semibold transition"
                            title="Ver Título"
                            >
                            <FiEye size={16} /> Ver
                            </button>
                        )}

                        {canChangeState && (
                            <button
                            type="button"
                            onClick={() => openCambiarEstado(t)}
                            className="flex w-40 items-center cursor-pointer justify-center gap-2 bg-[#0f302d] border border-[#095f44] hover:bg-[#104e3a] text-[#19F124] rounded-lg py-1 text-sm font-semibold transition"
                            title="Cambiar estado"
                            >
                            <FiRefreshCcw size={16} /> Cambiar estado
                            </button>
                        )}

                        {canDelete ? (
                            <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            disabled={deletingId === t.id_titulo}
                            className="flex items-center cursor-pointer justify-center bg-red-500/5 hover:bg-red-500/20 border border-[#ff2c2c] text-[#ff2c2c] rounded-lg p-2 transition"
                            title="Eliminar título"
                            >
                            <FiTrash2 size={18} />
                            </button>
                        ) : (
                            <button
                            type="button"
                            onClick={() => handleAskDelete(t)}
                            className="flex items-center cursor-pointer justify-center border border-[#19F124]/40 text-[#19F124] rounded-lg px-3 py-1 hover:bg-[#0f302d] transition"
                            title="Solicitar eliminación"
                            >
                            Solicitar eliminación
                            </button>
                        )}
                        </div>
                    </div>
                    </motion.li>
                );
                })}
            </AnimatePresence>
            </ul>
        )}

        {preview.open && (
            <PdfPreviewModal
            url={preview.url}
            title={preview.title}
            onClose={closePreview}
            />
        )}

        <AnimatePresence>
            {canChangeState && verificacion.open && (
            <motion.div
                className="fixed inset-0 z-80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div
                className="absolute inset-0 bg-black/60"
                onClick={closeCambiarEstado}
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                <motion.div
                    className="w-[92%] max-w-md bg-[#101922] rounded-2xl p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                    }}
                >
                    <div className="flex items-start justify-between mb-4">
                    <h4 className="text-xl font-semibold text-[#19F124]">
                        Cambiar estado
                    </h4>
                    <button
                        onClick={closeCambiarEstado}
                        className="p-1 rounded-lg hover:bg-[#1A2430]"
                        aria-label="Cerrar"
                    >
                        <IoClose size={22} />
                    </button>
                    </div>

                    <form
                    className="space-y-4"
                    onSubmit={submitCambiarEstado}
                    >
                    <div>
                        <label className="block mb-1 text-sm opacity-80">
                        Estado
                        </label>
                        <select
                        value={verificacion.estado}
                        onChange={(e) =>
                            setVerificacion((v) => ({
                            ...v,
                            estado: e.target.value,
                            }))
                        }
                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                        required
                        >
                        <option value="">Seleccionar...</option>
                        {estados.map((e) => (
                            <option
                            key={e.id_estado}
                            value={e.id_estado}
                            >
                            {e.nombre}
                            </option>
                        ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm opacity-80">
                        Observación{" "}
                        {requiereObs(Number(verificacion.estado))
                            ? "(obligatoria)"
                            : "(opcional)"}
                        </label>
                        <textarea
                        value={verificacion.obs}
                        onChange={(e) =>
                            setVerificacion((v) => ({
                            ...v,
                            obs: e.target.value,
                            }))
                        }
                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                        rows={3}
                        placeholder="Motivo, comentarios, etc."
                        required={requiereObs(
                            Number(verificacion.estado)
                        )}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                        type="button"
                        onClick={closeCambiarEstado}
                        className="cursor-pointer px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430]"
                        >
                        Cancelar
                        </button>
                        <button
                        type="submit"
                        className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922]"
                        >
                        Guardar
                        </button>
                    </div>
                    </form>
                </motion.div>
                </div>
            </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showNew && (
            <motion.div
                className="fixed inset-0 z-80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowNew(false)}
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                <motion.div
                    className="w-full max-w-xl bg-[#101922] rounded-2xl p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                    }}
                >
                    <div className="flex items-start justify-between mb-4">
                    <h4 className="text-xl font-semibold text-[#19F124]">
                        Nuevo título
                    </h4>
                    <button
                        onClick={() => setShowNew(false)}
                        className="p-1 rounded-lg hover:bg-[#1A2430]"
                    >
                        <IoClose size={22} />
                    </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleCreate}>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                        <label className="block mb-1 text-sm opacity-80">
                            Tipo de título *
                        </label>
                        <select
                            value={id_tipo_titulo}
                            onChange={(e) =>
                            setIdTipoTitulo(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                            required
                        >
                            <option value="">Seleccionar...</option>
                            {tipos.map((t) => (
                            <option
                                key={`tip-${t.id_tipo_titulo ?? t.codigo}`}
                                value={t.id_tipo_titulo}
                            >
                                {t.nombre}
                            </option>
                            ))}
                        </select>
                        </div>

                        <div>
                        <label className="block mb-1 text-sm opacity-80">
                            Fecha de emisión
                        </label>
                        <input
                            type="date"
                            value={fecha_emision}
                            onChange={(e) =>
                            setFechaEmision(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                        />
                        </div>

                        <div className="col-span-2">
                        <label className="block mb-1 text-sm opacity-80">
                            Nombre del título *
                        </label>
                        <input
                            value={nombre_titulo}
                            onChange={(e) =>
                            setNombreTitulo(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                            required
                        />
                        </div>

                        <div className="col-span-2">
                        <label className="block mb-1 text-sm opacity-80">
                            Institución
                        </label>
                        <input
                            value={institucion}
                            onChange={(e) =>
                            setInstitucion(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                        />
                        </div>

                        <div>
                        <label className="block mb-1 text-sm opacity-80">
                            Matrícula profesional
                        </label>
                        <input
                            value={matricula_prof}
                            onChange={(e) =>
                            setMatriculaProf(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                        />
                        </div>

                        <div>
                        <label className="block mb-1 text-sm opacity-80">
                            Archivo
                        </label>
                        <input
                            type="file"
                            onChange={(e) =>
                            setArchivo(e.target.files?.[0] || null)
                            }
                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                        />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                        type="button"
                        onClick={() => setShowNew(false)}
                        className="cursor-pointer px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430] transition"
                        >
                        Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922] disabled:opacity-50"
                        >
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                    </form>
                </motion.div>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
        </div>
    );

    const content = renderPanel();

    return (
        <>
        {asModal ? (
            <div className="fixed inset-0 z-70">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div
                className="absolute inset-0 flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full max-w-3xl">{content}</div>
            </div>
            </div>
        ) : (
            content
        )}

        <RequestDeleteModal
                open={reqDelTit.open}
                onClose={() => setReqDelTit({ open: false, target: null })}
                kind="titulo"
                target={reqDelTit.target}
                onSubmit={async ({ motivo }) => {
                    if (!reqDelTit.target?.id) return;

                    setLoadingPreview(true);

                    try {
                        await tituloService.solicitarEliminacion(
                            reqDelTit.target.id,
                            { motivo }
                        );
                        await queryClient.invalidateQueries({
                            queryKey: ["titulos", idPersona],
                        });
                        toast.success("Solicitud de eliminación de documento enviada con éxito");
                    } catch (error) {
                        console.error("Error al solicitar eliminación:", error);
                        toast.error("No se pudo enviar la solicitud");
                    } finally {
                        setLoadingPreview(false);
                    }
                }}
            />

        <AnimatePresence>
            {showOverlay && (
                <motion.div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <LoadingState classNameContainer="min-h-0" classNameImg="w-32 h-32" />
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
