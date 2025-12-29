import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useEffect } from "react";

export default function Revision(){
    const { logout } = useAuth();

    useEffect(() => {
        logout();
    }, [logout]);

    return(
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="mb-4 text-center text-white text-7xl">Tu cuenta esta en revisión</h1>
            <p className="mb-10 text-3xl text-center text-white w-2xl">Tu cuenta ha sido creada pero aún no está activa. Por favor sea paciente hasta que activemos tu cuenta.</p>

            <Link to="/">
            <button
                className="w-xl h-16 rounded-full text-4xl font-black leading-none bg-transparent mt-2 text-[#19F124] border-[3px] border-[#19F124] hover:bg-[#19F124] hover:text-[#020c14] cursor-pointer transition-colors"
            >
                Volver al Inicio
            </button>
            </Link>
        </div>
    )
}