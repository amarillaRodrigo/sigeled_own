import { createContext, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiXCircle, FiInfo, FiAlertTriangle, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";

const ToastCtx = createContext(null);

const ICON = {
    success: <FiCheck size={18} />,
    error: <FiXCircle size={18} />,
    info: <FiInfo size={18} />,
    warning: <FiAlertTriangle size={18} />,
};

const CLASSES = {
    base: "min-w-[260px] max-w-[360px] w-full rounded-xl px-3 py-2 shadow-lg border flex items-start gap-2 backdrop-blur-sm",
    success: "bg-[#0f302d]/95 border-[#095f44] text-[#19F124]",
    error: "bg-[#2d0f10]/95 border-[#7a1e22] text-[#ff8b8b]",
    info: "bg-[#101922]/95 border-[#283748] text-white",
    warning: "bg-[#30280f]/95 border-[#7a6a1e] text-[#ffd86b]",
};

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const remove = (id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
        const tm = timers.current.get(id);
        if (tm) clearTimeout(tm);
        timers.current.delete(id);
    };

    const push = (type, message, opts = {}) => {
        const id = uid();
        const toast = {
            id,
            type,
            message,
            title: opts.title,
            duration: opts.duration ?? 3500,
        };
        setToasts((t) => [toast, ...t]);
        const tm = setTimeout(() => remove(id), toast.duration);
        timers.current.set(id, tm);
        return id;
    };

    const api = useMemo(
        () => ({
            success: (m, o) => push("success", m, o),
            error: (m, o) => push("error", m, o),
            info: (m, o) => push("info", m, o),
            warning: (m, o) => push("warning", m, o),
            remove,
        }),
        []
    );

    return (
        <ToastCtx.Provider value={api}>
            {children}
            {createPortal(
                <motion.div
                    className="fixed flex flex-col gap-2 bottom-4 right-4 z-10000"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <AnimatePresence initial={false}>
                        {toasts.map((t) => (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 320,
                                    damping: 26,
                                    mass: 0.9,
                                }}
                                className={`${CLASSES.base} ${CLASSES[t.type]}`}
                            >
                                <div className="mt-0.5">{ICON[t.type]}</div>
                                <div className="flex-1">
                                    {t.title && (
                                        <div className="font-semibold leading-5">
                                            {t.title}
                                        </div>
                                    )}
                                    <div className="text-sm leading-5 opacity-90">
                                        {t.message}
                                    </div>
                                </div>
                                <button
                                    onClick={() => remove(t.id)}
                                    className="p-1 transition rounded-lg cursor-pointer hover:bg-white/10"
                                    aria-label="Cerrar"
                                >
                                    <FiX />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>,
                document.body
            )}
        </ToastCtx.Provider>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastCtx);
    if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
    return ctx;
};
