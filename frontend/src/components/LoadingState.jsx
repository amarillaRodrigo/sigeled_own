import { motion } from "motion/react";
import logoCarga from "../assets/svg/logoCarga.svg"; 

export default function LoadingState({ 
    classNameContainer = "min-h-screen",
    classNameImg = "w-48 h-48"          
}) {
    return (
        <div className={`flex items-center justify-center w-full ${classNameContainer}`}>
            <motion.img 
                src={logoCarga} 
                alt="Cargando..." 
                className={classNameImg}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0, 0.71, 0.2, 1.01] }}
            />
        </div>
    );
}