import { FiUser, FiClipboard, FiHome, FiArchive } from "react-icons/fi";
import { motion, LayoutGroup } from "motion/react";

export default function SegmentedTabs({ value, onChange, tabs, className = "" }) {
    const items = [
        { key: tabs.INFO, label: "Información Personal", Icon: FiUser },
        { key: tabs.DOCS, label: "Documentos", Icon: FiClipboard },
        { key: tabs.DOM, label: "Domicilios", Icon: FiHome },
        { key: tabs.TIT, label: "Títulos", Icon: FiArchive },
    ];

    return (
        <LayoutGroup>
            <div
                className={`inline-flex items-center gap-1 rounded-full bg-[#0D1520] p-2 border border-white/5 shadow-lg/30 ${className}`}
                role="tablist"
                aria-label="Secciones del usuario"
            >
                {items.map((item) => {
                    const active = value === item.key;
                    const Icon = item.Icon;

                    return (
                        <motion.button
                            key={item.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(item.key)}
                            title={item.label}
                            layout
                            className={[
                                "relative group flex items-center justify-center rounded-full outline-none",
                                "focus-visible:ring-2 focus-visible:ring-[#19F124]/60",
                                "px-3 h-10 cursor-pointer select-none text-2xl",
                                "transition-colors duration-150"
                            ].join(" ")}
                        >
                            {active && (
                                <motion.div
                                    layoutId="segmentedTabsActiveBg"
                                    className="absolute inset-0 rounded-full shadow-inner bg-white/10"
                                    transition={{
                                        type: "spring",
                                        stiffness: 450,
                                        damping: 30,
                                        mass: 0.4,
                                    }}
                                />
                            )}

                            <div className="relative flex items-center justify-center">
                                <Icon
                                    size={26}
                                    className={
                                        active
                                            ? "text-[#19F124]"
                                            : "text-white/85 group-hover:text-white"
                                    }
                                />

                                <span
                                    className={[
                                        "ml-2 font-semibold whitespace-nowrap",
                                        "overflow-hidden",
                                        "transition-[max-width,opacity,transform] duration-150",
                                        active
                                            ? "max-w-[220px] opacity-100 translate-x-0"
                                            : "max-w-0 opacity-0 -translate-x-1"
                                    ].join(" ")}
                                >
                                    {item.label}
                                </span>

                                <span className="sr-only">{item.label}</span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}
