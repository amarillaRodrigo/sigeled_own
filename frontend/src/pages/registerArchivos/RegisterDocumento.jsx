import { useEffect, useMemo, useState } from "react";
import {
    tipoDocService,
    archivoService,
    personaDocService,
} from "../../services/api";
import { BiSolidError } from "react-icons/bi";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../../components/LoadingState";

const FALLBACK_TIPOS = [
    { id_tipo_doc: 1, codigo: "DNI", nombre: "Documento Nacional de Identidad" },
    { id_tipo_doc: 2, codigo: "CUIL", nombre: "Código único de identificación" },
    { id_tipo_doc: 3, codigo: "DOM", nombre: "Constancia de domicilio" },
    { id_tipo_doc: 4, codigo: "TIT", nombre: "Título habilitante" },
    { id_tipo_doc: 5, codigo: "CV", nombre: "Curriculum Vitae" },
    { id_tipo_doc: 6, codigo: "CON_SER", nombre: "Constancia de servicio" },
];

export default function RegisterDocumento({
        idPersona,
        uploadedCodes = [],
        onUploaded,
    }) {
    const [tipos, setTipos] = useState(FALLBACK_TIPOS);
    const [loading, setLoading] = useState(true);

    const [code, setCode] = useState("");
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const run = async () => {
        setLoading(true);
        try {
            const t = await tipoDocService.getAllDocTypes().catch(() => null);
            if (Array.isArray(t?.data) && t.data.length) setTipos(t.data);
        } finally {
            setLoading(false);
        }
        };
        run();
    }, []);

    const opciones = useMemo(
        () => tipos.map((t) => ({ ...t, disabled: uploadedCodes.includes(t.codigo) })),
        [tipos, uploadedCodes]
    );

    const subir = async () => {
        if (saving) return;
        try {
            setError("");
            if (!code) return setError("Elegí un tipo de documento.");
            if (!file) return setError("Seleccioná un archivo.");
            if (!idPersona) return setError("Falta idPersona");

            setSaving(true);

            const up = await archivoService.uploadForPersona(idPersona, file);
            const id_archivo =
                up?.data?.id_archivo ?? up?.data?.archivo?.id_archivo;
            if (!id_archivo) return setError("No se pudo subir el archivo.");

            const tipo = tipos.find((t) => t.codigo === code);
            if (!tipo) return setError("Tipo de documento inválido");

            await personaDocService.createDoc({
                id_persona: idPersona,
                id_tipo_doc: Number(tipo.id_tipo_doc),
                id_archivo,
                id_estado_verificacion: 1,
                vigente: true,
            });

            if (typeof onUploaded === "function") {
                await onUploaded();
            }

            setFile(null);
            setCode("");
        } catch (e) {
            console.error("[RegisterDocumento.subir] ERROR:", e);
            setError(
                e?.response?.data?.detalle ||
                e?.response?.data?.message ||
                e?.message ||
                "Error al subir el documento."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
        <motion.div
            className="w-full bg-[#101922] rounded-2xl p-6 text-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            <h3 className="text-2xl font-semibold text-[#19F124] mb-4">
            Documentos
            </h3>

            {loading ? (
            <p className="opacity-70">Cargando…</p>
            ) : (
            <div className="space-y-4">
                <div>
                <label className="block mb-1 text-sm opacity-80">
                    Tipo de documento
                </label>
                <select
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-14 px-5 rounded-xl bg-[#0E1F30] text-white text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
                >
                    <option value="">Seleccionar…</option>
                    {opciones.map((t) => (
                    <option
                        key={t.id_tipo_doc}
                        value={t.codigo}
                        disabled={t.disabled}
                    >
                        {t.nombre} {t.disabled ? "• ya subido" : ""}
                    </option>
                    ))}
                </select>
                </div>

                <div>
                <label className="block mb-1 text-sm opacity-80">Archivo</label>
                <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full h-14 px-5 rounded-xl bg-[#0E1F30] text-white/90 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#16293d] file:text-white hover:file:bg-[#1e3954] cursor-pointer"
                />
                </div>

                {error && (
                <motion.div
                    className="p-3 text-[1.1rem] text-[#0a0000] font-semibold rounded-xl bg-[#f48383] flex items-center"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                >
                    <BiSolidError className="w-6 h-6 mr-2" /> {error}
                </motion.div>
                )}

                <div className="flex justify-end">
                <button
                    type="button"
                    onClick={subir}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922] disabled:opacity-50"
                >
                    {saving ? "Subiendo…" : "Agregar documento"}
                </button>
                </div>

                {uploadedCodes.length > 0 && (
                <p className="mt-2 text-sm opacity-70">
                    Ya agregados:{" "}
                    <span className="opacity-100">
                    {uploadedCodes.join(", ")}
                    </span>
                </p>
                )}

                <p className="text-sm opacity-70">
                Podés agregar más de a uno. También podrás cargar otros desde “Mi
                legajo”.
                </p>
            </div>
            )}
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
