import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OnBoardingRoute({ children }) {
    const { user, loading } = useAuth();
    const hasToken = !!localStorage.getItem('token');

    if(loading) return <div className="p-8 text-center">Cargando...</div>
    if(!hasToken) return <Navigate to="/login" replace/>
    if(!user) return <div className="p-8 text-center">Iniciando sesión...</div>
    
    return children;
}