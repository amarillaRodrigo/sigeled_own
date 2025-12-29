export default function BotonAside({
    children,
    onClick,
    activo,
    variant,
    collapsed = false,
}) {
    let className = "";

    if (variant === "logout") {
        if (collapsed) {
        className =
            "cursor-pointer flex items-center justify-center w-11 h-11 hover:text-[#0c141b] rounded-full border border-[#ff2c2c] text-[#ff2c2c] transition-colors duration-200 hover:bg-[#ff2c2c]";
        } else {
        className = `
            text-2xl grid grid-cols-[1.75rem_auto] w-full items-center gap-3
            rounded-xl px-4 py-3 leading-none transition duration-200 text-left
            text-[#ff2c2c] font-medium hover:text-[#ff1010] hover:bg-[#13293c] hover:cursor-pointer 
        `;
        }
    } else if (collapsed) {
        className =
        "flex items-center justify-center m-auto transition-colors duration-200 rounded-full w-9 h-9";

        if (activo) {
        className +=
            " bg-[#21303f] text-[#19F124]";
        } else {
        className +=
            " bg-[#111c27] text-white hover:bg-[#243343] hover:text-[#19F124] cursor-pointer";
        }
    } else {
        className = `
        text-xl grid grid-cols-[1.75rem_auto] items-center gap-2 
        rounded-xl px-4 py-3 leading-none transition duration-200 text-left w-full
        `;

        if (activo) {
            className += "text-[#19F124] font-black bg-[#21303f]";
        } else {
            className +=
                "text-white font-medium hover:bg-[#13293c] hover:text-[#19F124] hover:cursor-pointer";
        }
    }

    return (
        <button type="button" onClick={onClick} className={className}>
            {children}
        </button>
    );
}
