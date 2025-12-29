import { useAuth } from "../context/AuthContext";
import React, { useRef, useEffect } from "react";
import {
    FiInbox,
    FiInfo,
    FiCheck,
    FiAlertTriangle,
    FiXCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return "Recién";
}

const LEVEL = {
    info: {
        text: "text-blue-400",
        bg: "bg-blue-400",
        ring: "ring-blue-900/50",
        chip: "bg-blue-500/15 border-blue-500/40 text-blue-300",
        Icon: FiInfo,
    },
    success: {
        text: "text-green-400",
        bg: "bg-green-400",
        ring: "ring-green-400/30",
        chip: "bg-green-500/15 border-green-500/40 text-green-300",
        Icon: FiCheck,
    },
    warning: {
        text: "text-yellow-400",
        bg: "bg-yellow-400",
        ring: "ring-yellow-400/30",
        chip: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
        Icon: FiAlertTriangle,
    },
    error: {
        text: "text-red-400",
        bg: "bg-red-400",
        ring: "ring-red-400/30",
        chip: "bg-red-500/15 border-red-500/40 text-red-300",
        Icon: FiXCircle,
    },
};

const levelUi = (lvl) => LEVEL[(lvl || "info").toLowerCase()] ?? LEVEL.info;

const MAX_DROPDOWN_ITEMS = 8;

export default function DropdownNotificaciones({ onClose, anchorRef }) {
    const { notifications = [] } = useAuth();
    const containerRef = useRef(null);

    const visibleNotifications = notifications.slice(0, MAX_DROPDOWN_ITEMS);

    useEffect(() => {
        const handleClickOutside = (e) => {
            const target = e.target;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                (!anchorRef?.current || !anchorRef.current.contains(target))
            ) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose, anchorRef]);

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                className="absolute top-16 right-9 w-80 max-w-sm bg-[#101922] border border-[#1b2a37] rounded-lg shadow-lg overflow-hidden z-2000"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                }}
            >
                <div className="p-3 border-b border-[#1b2a37]">
                    <h3 className="font-semibold text-white">Notificaciones</h3>
                </div>

                <div className="overflow-x-hidden overflow-y-auto max-h-80">
                    {visibleNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-400">
                            <FiInbox className="w-8 h-8 mx-auto mb-2" />
                            No tienes notificaciones
                        </div>
                    ) : (
                        <div className="divide-y divide-[#1b2a37]">
                            <AnimatePresence initial={false}>
                                {visibleNotifications.map((notif) => {
                                    const ui = levelUi(notif.nivel);
                                    return (
                                        <motion.div
                                            key={notif.id_notificacion}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.18 }}
                                            className={`relative p-3 pl-4 flex items-start gap-3 cursor-default transition
                                                hover:bg-[#1A2430] ${
                                                    notif.leido
                                                        ? "opacity-70"
                                                        : "opacity-100"
                                                } 
                                                ring-1 ${ui.ring}`}
                                        >
                                            <div
                                                className={`absolute left-0 top-0 bottom-0 w-1 ${ui.bg}`}
                                            />
                                            <div className="shrink-0 mt-0.5">
                                                {React.createElement(ui.Icon, {
                                                    size: 18,
                                                    className: ui.text,
                                                })}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <p
                                                        className={`text-sm ${
                                                            notif.leido
                                                                ? "text-gray-300"
                                                                : "text-white font-semibold"
                                                        }`}
                                                    >
                                                        {notif.mensaje}
                                                    </p>
                                                    {!notif.leido && (
                                                        <span
                                                            className={`ml-2 mt-0.5 w-2 h-2 rounded-full ${ui.bg}`}
                                                        />
                                                    )}
                                                </div>
                                                {notif.observacion && (
                                                    <p className="mt-1 text-xs italic text-gray-400">
                                                        "{notif.observacion}"
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    {notif.tipo && (
                                                        <span
                                                            className={`text-[10px] px-2 py-0.5 rounded-full border ${ui.chip}`}
                                                        >
                                                            {notif.tipo}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-[#9ccfaa] opacity-80">
                                                        {timeAgo(
                                                            notif.fecha_creacion
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="p-2 text-center bg-[#0b1420] border-t border-[#1b2a37]">
                    <button
                        onClick={() => {
                            window.location.href =
                                "/dashboard/notificaciones";
                            onClose();
                        }}
                        className="cursor-pointer text-sm font-medium text-[#19F124] border p-1 px-3 rounded-full hover:text-white transition-all hover:border-white"
                    >
                        Ver todas
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
