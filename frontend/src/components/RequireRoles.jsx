import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const U = (s = "") => String(s).toUpperCase();
const getUserRoles = (u) => (u?.roles || []).map((r) => U(r?.codigo ?? r?.nombre ?? r));

const hasAnyRole = (user, roles = []) => {
    if (!roles.length) return true;            
    const mine = new Set(getUserRoles(user));  
    return roles.some((r) => mine.has(U(r)));
    };

    export default function RequireRoles({ anyOf = [] }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="p-8 text-center">Cargando…</div>;
    if (!user) return <Navigate to="/" replace />;

    if (!hasAnyRole(user, anyOf)) {
        return <Navigate to="/dashboard?e=forbidden" state={{ from: location }} replace />;
    }

    return <Outlet />;
}
