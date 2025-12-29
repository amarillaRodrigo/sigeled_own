import { FiArrowRight } from "react-icons/fi";

export const BentoPanel = ({ className = "", ...props }) => (
    <div 
        className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`} 
        {...props} 
    />
);

export const KpiCard = ({ label, value, icon }) => (
    <BentoPanel className="p-4 shadow-lg">
        <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-[#9fb2c1]">{label}</div>
            {icon && <div className="text-[#9fb2c1]">{icon}</div>}
        </div>
        <div className="text-2xl font-semibold text-[#19F124]">
            {value}
        </div>
    </BentoPanel>
);

export const QuickLinkButton = ({ label, icon, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-3 bg-[#101922] hover:bg-[#15222f] rounded-lg transition-colors"
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium">{label}</span>
        </div>
        <FiArrowRight className="text-[#9fb2c1]"/>
    </button>
)