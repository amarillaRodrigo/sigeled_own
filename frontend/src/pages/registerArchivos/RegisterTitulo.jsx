import {
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { useDropzone } from "react-dropzone";
import {
    FiUploadCloud,
    FiCheck,
    FiAlertCircle,
    FiFileText,
    FiX,
} from "react-icons/fi";
import { archivoService, tituloService } from "../../services/api";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../../components/LoadingState";

function DropBox({ disabled, state, fileName, onDrop, onClear }) {
    const onDropCb = useCallback(
        (files) => {
            if (!files?.length || disabled) return;
            onDrop(files[0]);
        },
        [onDrop, disabled]
    );

    const { getRootProps, getInputProps, isDragActive, isDragReject } =
        useDropzone({
            multiple: false,
            accept: { "application/pdf": [] },
            onDrop: onDropCb,
            disabled,
        });

    const border =
        state === "done"
            ? "border-emerald-400"
            : state === "error"
            ? "border-red-400"
            : isDragReject
            ? "border-red-400"
            : isDragActive
            ? "border-[#19F124]"
            : "border-[#2d3b48]";

    const hoverAnim = disabled ? {} : { scale: 1.02 };
    const tapAnim = disabled ? {} : { scale: 0.98 };

    return (
        <div className="flex flex-col space-y-2 w-full sm:w-[520px]">
            <p className="text-sm opacity-80">Archivo del título</p>

            <motion.div
                {...getRootProps()}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={hoverAnim}
                whileTap={tapAnim}
                transition={{ duration: 0.15 }}
                className={`rounded-2xl hover:bg-[#19F124] hover:text-[#030C14] hover:border-[#19F124]
                border-2 border-dashed p-6 bg-[#0E1F30] text-white transition-all ${border}
                ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <input {...getInputProps()} />
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl">
                        {state === "done" ? (
                            <FiCheck className="w-6 h-6" />
                        ) : (
                            <FiUploadCloud className="w-6 h-6" />
                        )}
                    </div>
                    <div>
                        <p className="text-lg">
                            {state === "uploading"
                                ? "Subiendo…"
                                : state === "done"
                                ? "¡Subido!"
                                : "Arrastrá o hacé click para subir"}
                        </p>
                        <p className="text-sm opacity-70">PDF</p>
                    </div>
                </div>
            </motion.div>

            {state === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-300">
                    <FiAlertCircle /> Error al subir
                </div>
            )}

            {fileName && (
                <div className="flex items-center justify-between mt-1 px-3 py-2 rounded-xl bg-[#0E1F30] border border-white/10">
                    <div className="flex items-center gap-2">
                        <FiFileText className="w-4 h-4 opacity-80" />
                        <span className="text-sm">{fileName}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClear}
                        className="inline-flex items-center gap-1 text-xs cursor-pointer opacity-80 hover:opacity-100"
                        title="Quitar archivo"
                    >
                        <FiX /> Quitar
                    </button>
                </div>
            )}
        </div>
    );
}

export default function RegisterTitulo({
    idPersona,
    onBack,
    onFinish,
    onDraftChange,
    saving,
}) {
    const [tipos, setTipos] = useState([]);
    const [id_tipo_titulo, setIdTipoTitulo] = useState("");
    const [nombre_titulo, setNombreTitulo] = useState("");
    const [institucion, setInstitucion] = useState("");
    const [fecha_emision, setFechaEmision] = useState("");
    const [matricula_prof, setMatriculaProf] = useState("");

    const [uploadState, setUploadState] = useState("idle");
    const [fileName, setFileName] = useState(null);
    const [id_archivo, setIdArchivo] = useState(null);

    const doneTimerRef = useRef(null);

    useEffect(() => {
        (async () => {
            const tTipos = await tituloService.getTiposTitulos();
            setTipos(Array.isArray(tTipos.data) ? tTipos.data : []);
        })();
    }, []);

    useEffect(() => {
        onDraftChange?.({
            id_tipo_titulo: id_tipo_titulo ? Number(id_tipo_titulo) : null,
            nombre_titulo: nombre_titulo || null,
            institucion: institucion || null,
            fecha_emision: fecha_emision || null,
            matricula_prof: matricula_prof || null,
            id_archivo: id_archivo || null,
        });
    }, [
        id_tipo_titulo,
        nombre_titulo,
        institucion,
        fecha_emision,
        matricula_prof,
        id_archivo,
        onDraftChange,
    ]);

    const handleDrop = async (file) => {
        try {
            setUploadState("uploading");
            setFileName(file.name);
            const up = await archivoService.uploadForPersona(idPersona, file);
            const _id =
                up?.data?.archivo?.id_archivo ?? up?.data?.id_archivo ?? null;
            if (!_id) throw new Error("No se obtuvo id_archivo");
            setIdArchivo(_id);
            setUploadState("done");
        } catch {
            setUploadState("error");
            setIdArchivo(null);
        }
    };

    useEffect(() => {
        if (uploadState !== "done") return;
        if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
        doneTimerRef.current = setTimeout(() => {
            setUploadState("idle");
            doneTimerRef.current = null;
        }, 2000);
        return () => {
            if (doneTimerRef.current) {
                clearTimeout(doneTimerRef.current);
                doneTimerRef.current = null;
            }
        };
    }, [uploadState]);

    const clearFile = () => {
        if (doneTimerRef.current) {
            clearTimeout(doneTimerRef.current);
            doneTimerRef.current = null;
        }
        setUploadState("idle");
        setFileName(null);
        setIdArchivo(null);
    };

    return (
        <>
            <motion.div
                className="w-full bg-[#101922] rounded-2xl p-6 text-white"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                <h3 className="pt-2 pl-5 pr-5 mb-5 text-3xl font-semibold text-white">
                    Completá los datos sobre tu título
                </h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 text-sm opacity-80">
                                Tipo de título *
                            </label>
                            <select
                                value={id_tipo_titulo}
                                onChange={(e) => setIdTipoTitulo(e.target.value)}
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                required
                            >
                                <option value="">Seleccionar…</option>
                                {tipos.map((t) => (
                                    <option
                                        key={t.id_tipo_titulo}
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
                                onChange={(e) => setFechaEmision(e.target.value)}
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block mb-1 text-sm opacity-80">
                                Nombre del título *
                            </label>
                            <input
                                value={nombre_titulo}
                                onChange={(e) => setNombreTitulo(e.target.value)}
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm opacity-80">
                                Institución
                            </label>
                            <input
                                value={institucion}
                                onChange={(e) => setInstitucion(e.target.value)}
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm opacity-80">
                                Matrícula profesional
                            </label>
                            <input
                                value={matricula_prof}
                                onChange={(e) => setMatriculaProf(e.target.value)}
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <DropBox
                            disabled={saving}
                            state={uploadState}
                            fileName={fileName}
                            onDrop={handleDrop}
                            onClear={clearFile}
                        />
                    </div>
                </div>

                <div className="flex justify-between mt-6">
                    <button
                        type="button"
                        onClick={() => onBack?.()}
                        className="cursor-pointer text-xl rounded-full border hover:bg-[#162a3e] px-6 py-1 transition-all font-black bg-[#0E1F30] text-white border-white/10"
                    >
                        Atrás
                    </button>
                    <button
                        type="button"
                        onClick={() => onFinish?.()}
                        disabled={saving || uploadState === "uploading"}
                        className="px-6 py-1 text-xl rounded-full font-bold bg-[#0D1520] text-[#19F124] border-3 border-[#19F124] disabled:opacity-50 cursor-pointer disabled:cursor-default hover:bg-[#19F124] hover:text-[#0D1520] transition-all disabled:pointer-events-none"
                        title={
                            uploadState === "uploading"
                                ? "Esperá a que termine la subida"
                                : undefined
                        }
                    >
                        {saving ? "Guardando…" : "Finalizar y enviar a revisión"}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {saving && (
                    <motion.div
                        className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
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
        </>
    );
}
