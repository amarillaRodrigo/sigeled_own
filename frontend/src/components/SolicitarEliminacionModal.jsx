import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { FiSend } from "react-icons/fi";

const PRESETS = {
    documento: [
        "Documento cargado por error",
        "Documento desactualizado / vencido",
        "Datos sensibles: solicito retiro",
    ],
    domicilio: [
        "Cambio de domicilio",
        "Domicilio cargado por error",
        "Información desactualizada",
    ],
    titulo: [
        "Título incorrecto",
        "Título duplicado",
        "A solicitud de corrección",
    ],
};

export default function RequestDeleteModal({
    open,
    onClose,
    kind, 
    target,
    onSubmit,
    busy = false,
    }) {
    const [motivo, setMotivo] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const textareaRef = useRef(null);

    const title = useMemo(() => {
        const map = { documento: "documento", domicilio: "domicilio", titulo: "título" };
        return `Solicitar eliminación de ${map[kind] || "registro"}`;
    }, [kind]);

    useEffect(() => {
        if (open) {
        setMotivo("");
        setError(null);
        setSubmitting(false);
        setTimeout(() => textareaRef.current?.focus(), 60);
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
            if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) && !submitting && !busy) {
            handleSubmit();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        }
    }, [open, submitting, busy, onClose]);

    if (!open) return null;

    const maxLen = 300;
    const presets = PRESETS[kind] || [];

    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);
        try {
        await onSubmit?.({ motivo: motivo?.trim() || null });
        onClose?.();
        } catch (e) {
        const m = e?.response?.data?.message || e?.response?.data?.detalle || e?.message || "Error al enviar solicitud";
        setError(m);
        } finally {
        setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-120">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={submitting ? undefined : onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-[92%] max-w-lg bg-[#101922] rounded-2xl shadow-xl border border-[#1b2a37]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2a37]">
                <h3 className="text-lg font-semibold text-[#19F124]">{title}</h3>
                <button
                onClick={onClose}
                disabled={submitting || busy}
                className="p-2 rounded-lg hover:bg-[#1A2430] text-white/80 disabled:opacity-50"
                aria-label="Cerrar (Esc)"
                >
                <IoClose size={22} />
                </button>
            </div>

            <div className="px-5 py-4 space-y-4">
                {target?.label && (
                <div className="text-sm bg-[#0D1520] border border-white/10 rounded-xl px-3 py-2 text-white/90">
                    <span className="opacity-70">Elemento:</span> <span className="font-medium">{target.label}</span>
                </div>
                )}

                {presets.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm text-white/80">Motivos frecuentes</div>
                    <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                        <button
                        key={p}
                        type="button"
                        onClick={() => setMotivo((prev) => (prev ? `${prev} — ${p}` : p))}
                        className="text-xs px-2 py-1 rounded-full border border-[#2B3642] text-white/80 hover:bg-[#1A2430]"
                        >
                        {p}
                        </button>
                    ))}
                    </div>
                </div>
                )}

                <div>
                <label htmlFor="motivo" className="block mb-1 text-sm text-white/80">
                    Motivo (opcional)
                </label>
                <textarea
                    id="motivo"
                    ref={textareaRef}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value.slice(0, maxLen))}
                    rows={4}
                    className="w-full px-3 py-2 bg-[#242E38] text-white rounded-xl outline-none focus:ring-2 focus:ring-[#19F124] disabled:opacity-50"
                    placeholder="Contanos por qué querés eliminar este elemento…"
                    disabled={submitting || busy}
                />
                <div className="mt-1 text-xs text-right text-white/50">{motivo.length}/{maxLen}</div>
                </div>

                {error && (
                <div className="px-3 py-2 text-sm text-red-300 border rounded-md bg-red-500/10 border-red-500/30">
                    {error}
                </div>
                )}
            </div>
            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#1b2a37] flex items-center justify-end gap-2">
                <button
                type="button"
                onClick={onClose}
                disabled={submitting || busy}
                className="px-4 py-2 rounded-xl border-2 border-[#2B3642] text-white hover:bg-[#1A2430] disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-[#19F124] text-[#101922] disabled:opacity-60"
                >
                    <FiSend size={16} />
                {submitting || busy ? "Enviando…" : "Enviar solicitud"}
                <span className="text-xs opacity-70">(Ctrl/⌘+Enter)</span>
                </button>
            </div>
            </div>
        </div>
        </div>
    );
}
