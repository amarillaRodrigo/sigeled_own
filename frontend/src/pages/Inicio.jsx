import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import BotonesInicio from "../components/BotonesInicio"
import logo from "../assets/svg/logoLetras.svg";

export default function Inicio() {
    const [mostrarBotones, setMostrarBotones] = useState(false)

    const variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen bg-[#030C14] text-white overflow-hidden">
            <div className="container flex flex-col items-center h-screen px-6 mx-auto md:px-12 md:flex-row">
                
                <div className="z-10 flex flex-col items-center justify-center flex-1 space-y-10 md:items-start">
                    <h1 className="max-w-4xl text-5xl font-bold leading-tight text-center md:text-left md:text-7xl lg:text-7xl">
                        <span className="text-[#19F124]">Digitalizá</span> y ordená tu{" "}
                        <span className="text-[#19F124]">documentación</span>{" "}
                        profesional en un solo lugar.
                    </h1>

                    <div className="w-full min-h-[120px] flex items-start justify-center md:justify-start">
                        <AnimatePresence mode="wait">
                            {!mostrarBotones ? (
                                <motion.button
                                    key="boton-empezar"
                                    variants={variants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onClick={() => setMostrarBotones(true)}
                                    className="group relative px-10 py-5 rounded-full border-[3px] border-[#19F124] text-[#19F124] text-2xl md:text-3xl font-bold hover:bg-[#19F124] hover:text-[#020c14] transition-all duration-300 cursor-pointer"
                                >
                                    ¡Empezar a gestionar!
                                </motion.button>
                            ) : (
                                <motion.div
                                    key="componente-botones"
                                    variants={variants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="w-full"
                                >
                                    <BotonesInicio />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="relative flex items-center justify-center flex-1 mt-16 md:mt-0">
                    <motion.img
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        src={logo}
                        alt="Logo SIGELED"
                        className="object-contain w-auto h-3/4 md:h-36 lg:h-[90%] drop-shadow-2xl"
                    />
                </div>
            </div>
        </div>
    )
}