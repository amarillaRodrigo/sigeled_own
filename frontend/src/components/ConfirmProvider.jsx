import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { FiAlertTriangle } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";

const Ctx = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({
        open: false,
        title: "",
        description: "",
        confirmText: "Confirmar",
        cancelText: "Cancelar",
        tone: "default",
        resolve: null,
    });

    const confirm = (opts = {}) =>
        new Promise((resolve) => {
            setState({
                open: true,
                title: opts.title ?? "¿Confirmar acción?",
                description: opts.description ?? "",
                confirmText: opts.confirmText ?? "Confirmar",
                cancelText: opts.cancelText ?? "Cancelar",
                tone: opts.tone ?? "default",
                resolve,
            });
        });

    const close = (value) => {
        state.resolve?.(value);
        setState((s) => ({ ...s, open: false, resolve: null }));
    };

    const confirmBtnCls =
        state.tone === "danger"
            ? "bg-red-500 text-white hover:bg-red-600 border border-red-400"
            : "bg-[#19F124] text-[#101922] hover:bg-[#2af935] border border-[#095f44]";

    return (
        <Ctx.Provider value={{ confirm }}>
            {children}

            {createPortal(
                <AnimatePresence>
                    {state.open && (
                        <motion.div
                            className="fixed inset-0 z-10050"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-black/60"
                                onClick={() => close(false)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <motion.div
                                    className="w-[92%] max-w-md bg-[#101922] rounded-2xl p-6 shadow-xl border border-[#1b2a37]"
                                    onClick={(e) => e.stopPropagation()}
                                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 280,
                                        damping: 24,
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <FiAlertTriangle
                                                className={
                                                    state.tone === "danger"
                                                        ? "text-red-400"
                                                        : "text-[#19F124]"
                                                }
                                                size={22}
                                            />
                                            <h3 className="text-xl font-semibold text-white">
                                                {state.title}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => close(false)}
                                            className="cursor-pointer transition-all p-1 rounded-lg text-white hover:bg-[#1A2430]"
                                            aria-label="Cerrar"
                                        >
                                            <IoClose size={20} />
                                        </button>
                                    </div>

                                    {state.description && (
                                        <p className="mb-4 text-sm text-white/80">
                                            {state.description}
                                        </p>
                                    )}

                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430] transition-all text-white/90 cursor-pointer"
                                            onClick={() => close(false)}
                                        >
                                            {state.cancelText}
                                        </button>
                                        <button
                                            className={`cursor-pointer px-4 py-2 rounded-xl transition-all font-bold ${confirmBtnCls}`}
                                            onClick={() => close(true)}
                                        >
                                            {state.confirmText}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </Ctx.Provider>
    );
}

export const useConfirm = () => {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
    return ctx.confirm;
};
