import { useState } from "react";
import { motion } from "motion/react";
import BotonAside from "./BotonAside";
import {
    FiHome,
    FiArchive,
    FiClipboard,
    FiUsers,
    FiFileText,
    FiChevronsLeft,
    FiChevronsRight,
    FiBookOpen,
    FiBarChart2,
} from "react-icons/fi";
import { MdLogout } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/svg/logoAncho.svg";
import logoPlegado from "../assets/svg/logo.svg";
import clampyIcono from "../assets/svg/clampyIcono.svg";

export default function Aside() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);

    const isAdmin =
        Array.isArray(user?.roles) &&
        user.roles.some((r) => {
            const code = String(
                typeof r === "string" ? r : r?.codigo ?? r?.nombre ?? ""
            ).toUpperCase();
            return code === "ADMIN" || code === "RRHH";
        });

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const perfilNames = {
        Profesor: "Profesor",
        Coordinador: "Coordinador",
        Administrador: "Administrador",
        "Recursos Humanos": "RRHH",
        Investigador: "Investigador",
    };

    if (!user) {
        return (
            <div className="w-[20%] h-screen flex items-center justify-center text-white">
                Cargando...
            </div>
        );
    }

    const perfilesFormateados =
        user?.perfiles && user.perfiles.length > 0
            ? user.perfiles
                    .map((perfil) => perfilNames[perfil?.nombre] || perfil?.nombre)
                    .join(" • ")
            : "Sin perfil asignado";
    
    const perfiles = Array.isArray(user?.perfiles) ? user.perfiles : [];

    const tienePerfilProfesor = perfiles.some(
        (p) => p?.nombre === "Profesor"
    );
    const tienePerfilesNoProfesor = perfiles.some(
        (p) => p?.nombre && p.nombre !== "Profesor"
    );

    let asignacionesRoute = null;
    let asignacionesLabel = null;

    if (tienePerfilProfesor && tienePerfilesNoProfesor) {
        asignacionesRoute = "/dashboard/mis-materias-cargos";
        asignacionesLabel = "Mis Materias y Cargos";
    } else if (tienePerfilProfesor) {
        asignacionesRoute = "/dashboard/mis-materias";
        asignacionesLabel = "Mis Materias";
    } else if (tienePerfilesNoProfesor) {
        asignacionesRoute = "/dashboard/mis-cargos";
        asignacionesLabel = "Mis Cargos";
    }


    const getActiveSection = () => {
        const path = location.pathname;

        if (path.startsWith("/dashboard/mi-perfil")) return "mi-perfil";
        if (path.startsWith("/dashboard/clampy")) return "clampy";
        if (path.startsWith("/dashboard/reportes")) return "reportes";
        if (path.startsWith("/dashboard/legajo")) return "legajo";
        if (path.startsWith("/dashboard/mis-contratos")) return "mis-contratos";
        if (path.startsWith("/dashboard/contratos")) return "contratos";
        if (path.startsWith("/dashboard/usuarios")) return "usuarios";

        if (
            path.startsWith("/dashboard/mis-materias") ||
            path.startsWith("/dashboard/mis-cargos") ||
            path.startsWith("/dashboard/mis-materias-cargos")
        ) {
            return "asignaciones";
        }

        if (path === "/dashboard" || path === "/dashboard/") return "dashboard";

        return "dashboard";
    };

    const activeSection = getActiveSection();
    const isPerfilActive = activeSection === "mi-perfil";

    const initials =
        (user.apellido?.[0] || "") + (user.nombre?.[0] || "") || "U";

    const COLLAPSED_WIDTH = 80;  
    const EXPANDED_WIDTH = 260; 

    return (
        <motion.aside
            initial={false}
            animate={{
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                borderRadius: collapsed ? 40 : 0,
                height: collapsed ? "90vh" : "100vh",
                marginTop: collapsed ? "5vh" : 0,
                marginBottom: collapsed ? "5vh" : 0,
                marginLeft: collapsed ? 20 : 0,
            }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={`relative shrink-0 flex flex-col bg-[#101922] z-20 ${
                collapsed ? "items-center self-center" : ""
            }`}
        >
            <motion.button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`cursor-pointer transition-all absolute z-999 -right-3 top-90 flex items-center justify-center w-6 h-6 rounded-sm ${
                    collapsed
                        ? "hover:bg-[#19F124] border-2 border-[#19F124] bg-[#030C14] text-[#19F124] hover:text-[#030C14]"
                        : "hover:bg-[#3af743] border-2 border-[#19F124] bg-[#19F124] text-[#030C14]"
                }`}
            >
                {collapsed ? <FiChevronsRight size={19} /> : <FiChevronsLeft size={19} />}
            </motion.button>

            <div className="flex items-center justify-center mt-6 mb-6">
                <motion.img
                    key={collapsed ? "logo-plegado" : "logo-ancho"}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    src={collapsed ? logoPlegado : logo}
                    alt="logo"
                    className={collapsed ? "h-10 w-auto" : "h-15 w-auto"}
                />
            </div>

            <div className="w-[85%] m-auto rounded-full h-[0.1rem] bg-white/10" />

            {collapsed ? (
                <motion.button
                    type="button"
                    onClick={() => navigate("/dashboard/mi-perfil")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className={`flex items-center cursor-pointer justify-center p-2 mt-1 mb-1 rounded-xl transition-all ${
                        isPerfilActive
                            ? "bg-[#13293c] border border-white/10"
                            : "hover:bg-[#21303f]"
                    }`}
                    title={`${user.apellido} ${user.nombre} · ${perfilesFormateados}`}
                >
                            <div className="w-12 h-12 rounded-full bg-[#030C14] flex items-center justify-center text-white text-lg font-semibold">
                                {initials}
                            </div>
                </motion.button>
            ) : (
                <motion.button
                    type="button"
                    onClick={() => navigate("/dashboard/mi-perfil")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className={`flex flex-row items-center cursor-pointer justify-center gap-3 p-3 ml-3 mr-3 m-auto mt-3 mb-3 rounded-xl transition-all ${
                        isPerfilActive
                            ? "bg-[#13293c] border border-white/10"
                            : "hover:bg-[#21303f]"
                    }`}
                    title={`${user.apellido} ${user.nombre} · ${perfilesFormateados}`}
                >
                    <div className="w-15 h-15 rounded-full bg-[#030C14] flex items-center justify-center text-white text-lg font-semibold">
                        {initials}
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col text-start"
                    >
                        <h1 className="text-2xl font-semibold text-white">
                            {user.apellido} {user?.nombre}
                        </h1>
                        <p className="text-[0.82rem] text-[#19F124] font-medium text-start">
                            {perfilesFormateados}
                        </p>
                    </motion.div>
                </motion.button>
            )}

            <div className="w-[90%] m-auto rounded-full h-[0.1rem] bg-white/10" />

            <div
                className={`flex flex-col flex-1 mt-4 font-medium ${
                    collapsed ? "items-center gap-4" : "px-2 space-y-2"
                }`}
            >
                <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-full"
                >
                    <BotonAside
                        onClick={() => navigate("/dashboard")}
                        activo={activeSection === "dashboard"}
                        collapsed={collapsed}
                    >
                        <FiHome size={24} className="shrink-0 currentColor" />
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                Dashboard
                            </motion.span>
                        )}
                    </BotonAside>
                </motion.div>

                <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-full"
                >
                    <BotonAside
                        onClick={() => navigate("/dashboard/legajo")}
                        activo={activeSection === "legajo"}
                        collapsed={collapsed}
                    >
                        <FiArchive size={24} className="shrink-0 currentColor" />
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                Mi Legajo
                            </motion.span>
                        )}
                    </BotonAside>
                </motion.div>

                <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-full"
                >
                    <BotonAside
                        onClick={() => navigate("/dashboard/mis-contratos")}
                        activo={activeSection === "mis-contratos"}
                        collapsed={collapsed}
                    >
                        <FiFileText size={24} className="shrink-0 currentColor" />
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                Mis Contratos
                            </motion.span>
                        )}
                    </BotonAside>
                </motion.div>

                {asignacionesRoute && (
                    <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full"
                    >
                        <BotonAside
                            onClick={() => navigate(asignacionesRoute)}
                            activo={activeSection === "asignaciones"}
                            collapsed={collapsed}
                        >
                            <FiBookOpen size={24} className="shrink-0 currentColor" />
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {asignacionesLabel}
                                </motion.span>
                            )}
                        </BotonAside>
                    </motion.div>
                )}


                {isAdmin && (
                    <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full"
                    >
                        <BotonAside
                            onClick={() => navigate("/dashboard/contratos")}
                            activo={activeSection === "contratos"}
                            collapsed={collapsed}
                        >
                            <FiClipboard size={24} className="shrink-0 currentColor" />
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Contratos
                                </motion.span>
                            )}
                        </BotonAside>
                    </motion.div>
                )}

                {isAdmin && (
                    <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full"
                    >
                        <BotonAside
                            onClick={() => navigate("/dashboard/usuarios")}
                            activo={activeSection === "usuarios"}
                            collapsed={collapsed}
                        >
                            <FiUsers size={24} className="shrink-0 currentColor" />
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Usuarios
                                </motion.span>
                            )}
                        </BotonAside>
                    </motion.div>
                )}

                {isAdmin && (
                    <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full"
                    >
                        <BotonAside
                            onClick={() => navigate("/dashboard/reportes")}
                            activo={activeSection === "reportes"}
                            collapsed={collapsed}
                        >
                            <FiBarChart2 size={24} className="shrink-0 currentColor" />
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Reportes
                                </motion.span>
                            )}
                        </BotonAside>
                    </motion.div>
                )}

                {isAdmin && (
                    <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full"
                    >
                        <BotonAside
                            onClick={() => navigate("/dashboard/clampy")}
                            activo={activeSection === "clampy"}
                            collapsed={collapsed}
                        >
                            <img src={clampyIcono} />
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Clampy
                                </motion.span>
                            )}
                        </BotonAside>
                    </motion.div>
                )}
            </div>

            <div className={collapsed ? "mb-4 flex justify-center" : "px-2 mt-auto mb-4"}>
                <motion.div
                    whileHover={{ x: 2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-full"
                >
                    <BotonAside onClick={handleLogout} variant="logout" collapsed={collapsed}>
                        <MdLogout size={24} className="shrink-0" />
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                Cerrar Sesión
                            </motion.span>
                        )}
                    </BotonAside>
                </motion.div>
            </div>
        </motion.aside>
    );
}
