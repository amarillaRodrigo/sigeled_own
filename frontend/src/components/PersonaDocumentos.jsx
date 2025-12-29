import { useMemo, useState } from "react";
import { IoClose } from "react-icons/io5";
import {
    FiTrash2,
    FiUpload,
    FiFileText,
    FiEye,
    FiRefreshCcw,
    FiCheck,
    FiX,
    FiAlertTriangle,
    FiClock,
} from "react-icons/fi";
import {
    personaDocService,
    estadoVerificacionService,
    tipoDocService,
    archivoService,
    legajoService,
} from "../services/api";
import PdfPreviewModal from "./PdfPreviewModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RequestDeleteModal from "./SolicitarEliminacionModal";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "./LoadingState";


const FALLBACK_TIPOS = [
    { id_tipo_doc: 1, codigo: "DNI", nombre: "Documento Nacional de Identidad" },
    { id_tipo_doc: 2, codigo: "CUIL", nombre: "Código único de identificación" },
    { id_tipo_doc: 3, codigo: "DOM", nombre: "Constancia de domicilio" },
    { id_tipo_doc: 4, codigo: "TIT", nombre: "Título habilitante" },
    { id_tipo_doc: 5, codigo: "CV", nombre: "Curriculum Vitae" },
    { id_tipo_doc: 6, codigo: "CON_SER", nombre: "Constancia de servicio" },
];

const FALLBACK_ESTADOS = [
    { id_estado: 1, codigo: "PENDIENTE", nombre: "Pendiente de Revisión" },
    { id_estado: 2, codigo: "APROBADO", nombre: "Aprobado" },
    { id_estado: 3, codigo: "RECHAZADO", nombre: "Rechazado" },
    { id_estado: 4, codigo: "OBSERVADO", nombre: "Observado" },
];

export default function PersonaDocumentos({
    idPersona,
    onClose,
    asModal = true,
    showPersonaId = true,
    canDelete = true,
    canChangeState = true,
}) {
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState(null);
    const [verificacion, setVerificacion] = useState({
        open: false,
        doc: null,
        estado: "",
        obs: "",
    });
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingEstado, setSavingEstado] = useState(false);

    const [loadingPreview, setLoadingPreview] = useState(false);

    const [id_tipo_doc, setIdTipoDoc] = useState("");
    const [id_estado, setIdEstado] = useState("");
    const [vigente, setVigente] = useState(true);
    const [file, setFile] = useState(null);
    const [archivoSubiendo, setArchivoSubiendo] = useState(false);
    const [archivoInfo, setArchivoInfo] = useState(null);
    const [reqDelDoc, setReqDelDoc] = useState({ open: false, target: null });

    const toast = useToast();
    const confirm = useConfirm();

    const [preview, setPreview] = useState({ open: false, url: "", title: "" });

    const showOverlay = loadingPreview || saving || archivoSubiendo || savingEstado;

    const recalcularLegajo = async () => {
        if (!idPersona) return;
        try {
            await legajoService.recalcular(idPersona);
            queryClient.invalidateQueries({ queryKey: ["legajo", "estado", idPersona] });
        } catch (error) {
            console.error("No se pudo recalcular legajo:", error);
        }
    };

    const {
        data: docs = [],
        isLoading: isLoadingDocs,
    } = useQuery({
        queryKey: ["documentos", idPersona],
        queryFn: async () => {
            if (!idPersona) return [];
            const { data } = await personaDocService.listarDocumentos(idPersona);
            const arr = Array.isArray(data) ? data : [];
            return arr.filter((x) => String(x.id_persona) === String(idPersona));
        },
        enabled: !!idPersona,
    });

    const { data: tipos = FALLBACK_TIPOS } = useQuery({
        queryKey: ["tiposDocumento"],
        queryFn: () => tipoDocService.getAllDocTypes().then((res) => res.data),
        staleTime: 1000 * 60 * 60,
        initialData: FALLBACK_TIPOS,
    });

    const { data: estados = FALLBACK_ESTADOS } = useQuery({
        queryKey: ["estadosVerificacion"],
        queryFn: () => estadoVerificacionService.getAll().then((res) => res.data),
        staleTime: 1000 * 60 * 60,
        enabled: canChangeState,
        initialData: FALLBACK_ESTADOS,
    });

    const handleAskDelete = (doc) => {
        const tipo = tipoById(doc.id_tipo_doc);
        const label = `${tipo?.nombre || "Documento"}${
            doc.archivo_nombre ? ` · ${doc.archivo_nombre}` : ""
        }`;
        setReqDelDoc({ open: true, target: { id: doc.id_persona_doc, label } });
    };

    const createDocMutation = useMutation({
        mutationFn: (payload) => personaDocService.createDoc(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos", idPersona] });
            queryClient.invalidateQueries({ queryKey: ["adminStats"] });
            queryClient.invalidateQueries({ queryKey: ["documentosPendientes"] });
            resetForm();
            setShowNew(false);
            toast.success("Documento creado correctamente");
        },
        onError: (err) => {
            console.error("Error al crear documento:", err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detalle ||
                "No se pudo crear el documento";
            toast.error(msg);
        },
        onSettled: () => {
            setSaving(false);
            setArchivoSubiendo(false);
        },
    });

    const deleteDocMutation = useMutation({
        mutationFn: (doc) => personaDocService.deleteDoc(idPersona, doc.id_persona_doc),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos", idPersona] });
            recalcularLegajo();
            toast.success("Documento eliminado con éxito");
        },
        onError: (error) => {
            console.error("No se pudo eliminar el documento:", error?.response?.data || error.message);
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.detalle ||
                "No se pudo eliminar el documento";
            toast.error(message);
        },
        onSettled: () => {
            setDeletingId(null);
        },
    });

    const changeStateMutation = useMutation({
        mutationFn: ({ docId, payload }) => personaDocService.cambiarEstado(docId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos", idPersona] });
            queryClient.invalidateQueries({ queryKey: ["adminStats"] });
            queryClient.invalidateQueries({ queryKey: ["documentosPendientes"] });
            recalcularLegajo();
            toast.success("Estado actualizado con éxito");
            closeCambiarEstado();
        },
        onError: (error) => {
            console.error("Error al cambiar estado:", error);
            toast.error("No se pudo cambiar el estado");
        },
        onSettled: () => {
            setSavingEstado(false);
        },
    });

    const resetForm = () => {
        setIdTipoDoc("");
        setIdEstado("");
        setVigente(true);
        setFile(null);
        setArchivoInfo(null);
    };

    const openPreview = async (doc) => {
        if (!doc.id_archivo) return;

        setLoadingPreview(true);
        try {
            const { data } = await archivoService.getSignedUrl(doc.id_archivo);
            const tipo = tipoById(doc.id_tipo_doc);
            setPreview({
                open: true,
                url: data.url ?? data.signedUrl,
                title: tipo?.nombre || "Documento",
            });
        } catch (error) {
            console.error("No se pudo abrir el documento:", error);
            toast.error("No se pudo abrir el documento");
        } finally {
            setLoadingPreview(false);
        }
    };

    const closePreview = () => setPreview({ open: false, url: "", title: "" });

    const docsOrdenados = useMemo(
        () => [...docs].sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)),
        [docs]
    );

    const handleUploadArchivo = async () => {
        if (!file) return null;
        try {
            setArchivoSubiendo(true);
            const { data } = await archivoService.uploadForPersona(idPersona, file);
            setArchivoInfo(data.archivo);
            return data.archivo?.id_archivo ?? null;
        } catch (e) {
            console.error("Error subiendo archivo:", e);
            toast.error("No se pudo subir el archivo");
            setArchivoSubiendo(false);
            return null;
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        if (!id_tipo_doc) {
            toast.warning("Elegí tipo de documento");
            return;
        }

        const estadoSeleccionado = canChangeState ? Number(id_estado) : 1;

        if (canChangeState && !id_estado) {
            toast.warning("Elegí el estado del documento");
            return;
        }

        setSaving(true);
        let id_archivo = null;

        if (file) {
            id_archivo = await handleUploadArchivo();
            if (file && !id_archivo) {
                setSaving(false);
                return;
            }
        }

        const payload = {
            id_persona: idPersona,
            id_tipo_doc: Number(id_tipo_doc),
            id_archivo,
            id_estado_verificacion: estadoSeleccionado,
            vigente: Boolean(vigente),
        };

        createDocMutation.mutate(payload);
    };

    const handleDelete = async (doc) => {
        const tipo = tipoById(doc.id_tipo_doc);
        const ok = await confirm({
            title: "Eliminar documento",
            description: `¿Estas seguro que deseas eliminar "${
                tipo?.nombre || "Documento"
            }"? Esta acción no se puede deshacer`,
            confirmtext: "Eliminar",
            tone: "danger",
        });

        if (!ok) return;

        setLoadingPreview(true);

        try {
            await deleteDocMutation.mutateAsync(doc);
        } catch (error) {
        } finally {
            setLoadingPreview(false);
        }
    };

    const tipoById = (id) => tipos.find((t) => Number(t.id_tipo_doc) === Number(id));
    const estadoById = (id) => estados.find((e) => Number(e.id_estado) === Number(id));

    const requiereObs = (id_estado) => {
        const code = String(estadoById(id_estado)?.codigo || "").toUpperCase();
        return code === "RECHAZADO" || code === "OBSERVADO";
    };

    const openCambiarEstado = (doc) => {
        const current = doc.id_estado ?? doc.id_estado_verificacion ?? "";
        setVerificacion({ open: true, doc, estado: String(current), obs: "" });
    };

    const closeCambiarEstado = () =>
        setVerificacion({ open: false, doc: null, estado: "", obs: "" });

    const submitCambiarEstado = async (e) => {
        e.preventDefault();
        if (!verificacion.doc) return;
        const id_estado_verificacion = Number(verificacion.estado);
        if (requiereObs(id_estado_verificacion) && !verificacion.obs.trim()) {
            toast.warning("Debés indicar una observación para Rechazado/Observado");
            return;
        }
        const payload = {
            id_estado_verificacion,
            observacion: verificacion.obs.trim() || null,
        };

        setSavingEstado(true);

        changeStateMutation.mutate({ docId: verificacion.doc.id_persona_doc, payload });
    };


    const renderPanel = () => (
        <motion.div
            className="w-full max-w-none bg-[#101922] rounded-2xl p-6 shadow-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
        >
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-semibold text-[#19F124]">Documentos Personales</h3>
                {onClose && asModal && (
                    <button
                        onClick={onClose}
                        className="cursor-pointer p-1 rounded-lg hover:bg-[#1A2430]"
                        aria-label="Cerrar"
                    >
                        <IoClose size={24} />
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
                    className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] hover:bg-[#2af935] text-[#101922] transition flex items-center gap-2"
                >
                    <FiUpload size={18} /> Agregar Documento
                </button>
            </div>

            <div className="max-h-[50vh] overflow-auto pr-1">
                {isLoadingDocs ? (
                    <div className="flex items-center justify-center min-h-[260px]">
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-30 h-30"
                        />
                    </div>
                ) : docsOrdenados.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[260px]">
                        <p className="opacity-70">Sin documentos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {docsOrdenados.map((d) => {
                            const tipo = tipoById(d.id_tipo_doc);
                            const estado = estadoById(d.id_estado_verificacion || d.id_estado);

                            const estadoIcon =
                                estado?.codigo === "APROBADO" ? (
                                    <FiCheck size={20} />
                                ) : estado?.codigo === "RECHAZADO" ? (
                                    <FiX size={20} />
                                ) : estado?.codigo === "OBSERVADO" ? (
                                    <FiAlertTriangle size={20} />
                                ) : (
                                    <FiClock size={20} />
                                );

                            const getEstadoClasses = (codigo) => {
                                switch (codigo) {
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

                            return (
                                <motion.div
                                    key={d.id_persona_doc}
                                    layout
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.16 }}
                                    className="bg-[#0D1520] p-6 rounded-2xl shadow-md flex flex-col justify-between border border-white/10 hover:border-white/30 transition"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="bg-[#0f302d] p-3 rounded-xl">
                                            <FiFileText size={28} className="text-[#19F124]" />
                                        </div>

                                        <div
                                            className={`flex items-center pt-1 pb-1 pl-3 pr-3 rounded-3xl gap-1 transition ${getEstadoClasses(
                                                estado?.codigo
                                            )}`}
                                        >
                                            {estadoIcon}
                                            <span className="text-sm font-medium">
                                                {estado?.nombre}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 mb-3 text-sm">
                                        <p className="text-2xl font-semibold">
                                            {tipo?.nombre ?? "Tipo desconocido"}
                                        </p>
                                        <p className="text-xl opacity-80">
                                            {d.archivo_nombre ?? "Sin archivo adjunto"}
                                        </p>
                                        <p className="text-xs opacity-60">
                                            Subido el: {d.creado_en?.split("T")[0] ?? " — "}
                                        </p>

                                        {d.observacion && (
                                            <p className="mt-1 text-xs italic opacity-80">
                                                Observación: {d.observacion}
                                            </p>
                                        )}
                                    </div>

                                    <div className="w-full m-auto border border-white/10" />

                                    <div className="flex justify-between gap-2 mt-3">
                                        <button
                                            onClick={() => openPreview(d)}
                                            className="flex-1 flex items-center cursor-pointer justify-center gap-2 bg-[#0f302d] border border-[#095f44] hover:bg-[#104e3a] text-[#19F124] rounded-lg py-1 text-sm font-semibold transition"
                                        >
                                            <FiEye size={16} /> Ver
                                        </button>
                                        {canChangeState && (
                                            <button
                                                onClick={() => openCambiarEstado(d)}
                                                className="flex items-center pl-3 pr-3 cursor-pointer justify-center gap-2 bg-[#0f302d] border border-[#095f44] hover:bg-[#104e3a] text-[#19F124] rounded-lg py-1 text-sm font-semibold transition"
                                            >
                                                <FiRefreshCcw size={16} /> Cambiar estado
                                            </button>
                                        )}
                                        {canDelete ? (
                                            <button
                                                onClick={() => handleDelete(d)}
                                                disabled={deletingId === d.id_persona_doc}
                                                className="flex items-center cursor-pointer justify-center bg-red-500/5 hover:bg-red-500/20 border border-[#ff2c2c] text-[#ff2c2c] rounded-lg p-2 transition"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleAskDelete(d)}
                                                className="flex items-center cursor-pointer justify-center border border-[#19F124]/40 text-[#19F124] rounded-lg px-3 py-1 hover:bg-[#0f302d] transition"
                                                title="Solicitar eliminación"
                                            >
                                                Solicitar eliminación
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {preview.open && (
                <PdfPreviewModal url={preview.url} title={preview.title} onClose={closePreview} />
            )}

            <AnimatePresence>
                {canChangeState && verificacion.open && (
                    <motion.div
                        className="fixed inset-0 z-80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/60"
                            onClick={closeCambiarEstado}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <motion.div
                                className="w-[92%] max-w-md bg-[#101922] rounded-2xl p-6 shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h4 className="text-xl font-semibold text-[#19F124]">
                                        Cambiar estado
                                    </h4>
                                    <button
                                        onClick={closeCambiarEstado}
                                        className="p-1 cursor-pointer rounded-lg hover:bg-[#1A2430]"
                                        aria-label="Cerrar"
                                    >
                                        <IoClose size={22} />
                                    </button>
                                </div>

                                <form className="space-y-4" onSubmit={submitCambiarEstado}>
                                    <div>
                                        <label className="block mb-1 text-sm opacity-80">Estado</label>
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
                                                <option key={e.id_estado} value={e.id_estado}>
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
                                            required={requiereObs(Number(verificacion.estado))}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3">
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
                        className="fixed inset-0 z-70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setShowNew(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <motion.div
                                className="relative z-10 w-[92%] max-w-lg bg-[#101922] rounded-2xl p-6 shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h4 className="text-xl font-semibold text-[#19F124]">
                                        Nuevo documento
                                    </h4>
                                    <button
                                        onClick={() => setShowNew(false)}
                                        className="p-1 rounded-lg cursor-pointer hover:bg-[#1A2430] transition-all"
                                        aria-label="Cerrar"
                                    >
                                        <IoClose size={22} />
                                    </button>
                                </div>

                                <form className="space-y-4" onSubmit={handleCreate}>
                                    <div>
                                        <label className="block mb-1 text-sm opacity-80">
                                            Tipo de documento
                                        </label>
                                        <select
                                            value={id_tipo_doc}
                                            onChange={(e) => setIdTipoDoc(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                            required
                                        >
                                            <option value="">Seleccionar...</option>
                                            {tipos.map((t) => (
                                                <option key={t.id_tipo_doc} value={t.id_tipo_doc}>
                                                    {t.nombre}{" "}
                                                    {t.obligatorio ? "• (Obligatorio)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {canChangeState && (
                                        <div>
                                            <label className="block mb-1 text-sm opacity-80">
                                                Estado de verificación
                                            </label>
                                            <select
                                                value={id_estado}
                                                onChange={(e) => setIdEstado(e.target.value)}
                                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                required={canChangeState}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {estados.map((e) => (
                                                    <option key={e.id_estado} value={e.id_estado}>
                                                        {e.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block mb-1 text-sm opacity-80">
                                            Archivo (opcional)
                                        </label>
                                        <input
                                            type="file"
                                            onChange={(ev) =>
                                                setFile(ev.target.files?.[0] ?? null)
                                            }
                                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl hover:bg-[#354453] transition cursor-pointer"
                                            accept="application/pdf,image/*"
                                        />
                                        {archivoInfo && (
                                            <p className="mt-1 text-xs opacity-70">
                                                Subido: {archivoInfo.nombre_original} • ID{" "}
                                                {archivoInfo.id_archivo}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            id="vigente"
                                            type="checkbox"
                                            checked={vigente}
                                            onChange={(e) => setVigente(e.target.checked)}
                                            className="w-5 h-5 accent-[#19F124] cursor-pointer"
                                        />
                                        <label htmlFor="vigente" className="select-none">
                                            Vigente
                                        </label>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="submit"
                                            disabled={saving || archivoSubiendo}
                                            className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922] disabled:opacity-50"
                                        >
                                            {saving || archivoSubiendo ? "Guardando..." : "Guardar"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    const content = renderPanel();

    return (
        <>
            {asModal ? (
                <div className="fixed inset-0 z-60">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={onClose}
                        aria-hidden="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    />
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            className="relative z-10 w-[95%] max-w-3xl"
                            initial={{ opacity: 0, y: 10, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        >
                            {content}
                        </motion.div>
                    </div>
                </div>
            ) : (
                content
            )}

            <RequestDeleteModal
                open={reqDelDoc.open}
                onClose={() => setReqDelDoc({ open: false, target: null })}
                kind="documento"
                target={reqDelDoc.target}
                onSubmit={async ({ motivo }) => {
                    if (!reqDelDoc.target?.id) return;

                    setLoadingPreview(true);

                    try {
                        await personaDocService.solicitarEliminacion(
                            reqDelDoc.target.id, 
                            { motivo }
                        );
                        await queryClient.invalidateQueries({
                            queryKey: ["documentos", idPersona],
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
