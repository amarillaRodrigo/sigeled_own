import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { FiEdit2 } from "react-icons/fi";

export default function RenameChatModal({
        open,
        initialTitle,
        onCancel,
        onConfirm,
    }) {
    const [title, setTitle] = useState(initialTitle || "");

    useEffect(() => {
        if (open) {
        setTitle(initialTitle || "");
        }
    }, [open, initialTitle]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        onConfirm(trimmed);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10050]">
            <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                className="w-[92%] max-w-md bg-[#101922] rounded-2xl p-6 shadow-xl border border-[#1b2a37]"
                onClick={(e) => e.stopPropagation()}
                >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                    <FiEdit2 className="text-[#19F124]" size={22} />
                    <h3 className="text-xl font-semibold text-white">
                        Renombrar chat
                    </h3>
                    </div>
                    <button
                    onClick={onCancel}
                    className="cursor-pointer transition-all p-1 rounded-lg text-white hover:bg-[#1A2430]"
                    aria-label="Cerrar"
                    >
                    <IoClose size={20} />
                    </button>
                </div>

                <p className="mb-3 text-sm text-white/80">
                    Elegí un nombre descriptivo para esta conversación.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[#0b1823] border border-[#2B3642] text-white outline-none focus:ring-2 focus:ring-[#19F124]"
                    placeholder="Ej: Consultas de contratos de marzo"
                    />

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430] transition-all text-white/90 cursor-pointer"
                            onClick={onCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="cursor-pointer px-4 py-2 rounded-xl transition-all font-bold bg-[#19F124] text-[#101922] hover:bg-[#2af935] border border-[#095f44]"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
