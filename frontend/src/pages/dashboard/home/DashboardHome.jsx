import { useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import HomeAdmin from "./HomeAdmin";
import HomeEmpleado from "./HomeEmpleado";

const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    let dateStr = today.toLocaleDateString('es-ES', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
};

const hasAnyRole = (roles, targets = []) => {
    if (!Array.isArray(roles)) return false;
    const tset = new Set(targets.map((s) => String(s).toUpperCase()));
    return roles.some((r) => {
        const code = String(typeof r === "string" ? r : r?.codigo ?? r?.nombre ?? "").toUpperCase();
        const name = String(typeof r === "string" ? r : r?.nombre ?? r?.codigo ?? "").toUpperCase();
        return tset.has(code) || tset.has(name);
    });
};

export default function DashboardHome(){
    const { user } = useAuth();
    
    const isAdmin = useMemo(
        () => hasAnyRole(user?.roles, ["ADMIN", "RRHH", "RECURSOS HUMANOS"]),
        [user?.roles]
    );

    const nombreUsuario = (user?.nombre?.split(' ')[0] || 'Usuario');
    const fechaActual = getFormattedDate();

    return(
        <div className="p-5 space-y-6 pt-7 pl-15 pr-15">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-5xl font-bold text-white">¡Hola {nombreUsuario}!</h1>
                    <p className="text-[#19F124] mt-1">{fechaActual}</p>
                </div>
            </header>

            <div>
                {isAdmin ? <HomeAdmin /> : <HomeEmpleado />}
            </div>
        </div>
    )
}