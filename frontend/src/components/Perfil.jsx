import { useState } from "react"
import { useAuth } from "../context/AuthContext"

export default function Perfil(){
    const {user} = useAuth()
    const [activeSection, setActiveSection] = useState("perfil")

    return(
        <div className="w-full">
            {/*<h1 className="text-white text-5xl mb-5 font-extrabold">Ajustes de Perfil</h1>*/}
            <div className="flex flex-row h-[80vh]">
                <aside className="w-6/12 flex justify-center items-center border-r-2 border-white">
                    <div className="flex flex-col max-w-96 text-[1.8rem] font-medium">
                        <BotonPerfil onClick={() => setActiveSection("perfil")} activo={activeSection === "perfil"}>Mi Perfil</BotonPerfil>
                        <BotonPerfil onClick={() => setActiveSection("informacion")} activo={activeSection === "informacion"}>Información Personal</BotonPerfil>
                        <BotonPerfil onClick={() => setActiveSection("seguridad")} activo={activeSection === "seguridad"}>Seguridad</BotonPerfil>   
                        <BotonPerfil onClick={() => setActiveSection("notificaciones")} activo={activeSection === "notificaciones"}>Notificaciones</BotonPerfil>
                        <BotonPerfil onClick={() => setActiveSection("actividad")} activo={activeSection === "actividad"}>Historial de Actividad</BotonPerfil>
                        <BotonPerfil onClick={() => setActiveSection("eliminar-cuenta")} activo={activeSection === "eliminar-cuenta"} >Eliminar Cuenta</BotonPerfil>
                    </div>
                </aside>

                <main className="w-full font-medium text-white">
                    {activeSection === "perfil" && (
                        <div className="text-2xl w-[90%] h-[90%] m-h-[90%] m-auto flex items-center mt-6">
                            <div className="ml-20">
                                <div className="flex flex-col items-center justify-center border-b-2 border-white w-[200%] mb-5 pb-5">
                                    <h1 className="mr-5">foto de perfil</h1>
                                    <h1>¡Bienvenido a tu perfil, {user.nombre}!</h1>
                                </div>
                                <h1>Datos Principales</h1>
                                <div className="ml-10">
                                    <h1>Nombre Completo:</h1>
                                    <h1>Rol:</h1>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "informacion" && (
                        <div className="text-2xl w-[90%] h-[90%] m-h-[90%] m-auto flex items-center mt-6">
                            <div className="ml-20">
                                <h1>Información Personal</h1>
                                <div className="ml-10">
                                    <h1>Teléfono:</h1>
                                    <h1>Domicilio:</h1>
                                    <h1>Fecha de Nacimiento:</h1>
                                    <h1>DNI:</h1>
                                    <h1>CUIL:</h1>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "seguridad" && (
                        <h1>SEGURIDAD</h1>
                    )}

                    {activeSection === "notificaciones" && (
                        <h1>NOTIFICACIONES</h1>
                    )}

                    {activeSection === "actividad" && (
                        <h1>HISTORIAL DE ACTIVIDAD</h1>
                    )}
                </main>
            </div>
        </div>
    )
}