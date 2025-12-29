import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle } from "react-icons/fi";

const map = {
    success: { cls: "bg-[#0f302d] border-[#095f44] text-[#19F124]", Icon: FiCheckCircle },
    error:   { cls: "bg-[#2d0f10] border-[#7a1e22] text-[#ff8b8b]", Icon: FiXCircle },
    info:    { cls: "bg-[#101922] border-[#283748] text-white",     Icon: FiInfo },
    warning: { cls: "bg-[#30280f] border-[#7a6a1e] text-[#ffd86b]", Icon: FiAlertTriangle },
};

export default function ResultBanner({ type = "success", title, children }) {
    const { cls, Icon } = map[type] ?? map.info;
    return (
        <div className={`rounded-xl px-3 py-2 border flex items-start gap-2 ${cls}`}>
        <Icon size={18} className="mt-[2px]" />
        <div className="flex-1">
            {title && <div className="font-semibold">{title}</div>}
            <div className="text-sm opacity-90">{children}</div>
        </div>
        </div>
    );
}
