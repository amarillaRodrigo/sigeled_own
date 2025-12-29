import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BotonesInicio = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isActive = user?.activo === true;

  const displayName = user?.nombre || user?.email;

  return (
    <div className="flex flex-col items-center w-full md:items-start">
      
      {!user && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-black text-xl leading-none bg-[#19F124] text-[#030C14] hover:bg-white hover:scale-105 transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            Iniciar Sesión
          </Link>

          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-black text-xl leading-none bg-transparent text-white border-2 border-white hover:bg-white hover:text-[#020c14] transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            Registrarse
          </Link>
        </div>
      )}

      {user && isActive && (
        <div className="flex flex-col items-center gap-4 md:items-start">
          <span className="text-2xl text-center text-white/90 md:text-left">
            Hola, <span className="font-bold text-[#19F124]">{displayName}</span>
          </span>

          {!isDashboard && (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-xl bg-[#19F124] text-[#030C14] hover:bg-white transition-all duration-300"
            >
              Ir al Dashboard
            </Link>
          )}
        </div>
      )}

      {user && !isActive && (
        <div className="flex flex-col items-center gap-4 md:items-start">
          <span className="text-xl font-medium text-center text-yellow-400 md:text-left">
            Tu cuenta está en revisión
          </span>

          <button
            onClick={logout}
            className="px-6 py-3 font-semibold text-red-500 transition-all border border-red-500 rounded-full hover:bg-red-500 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default BotonesInicio;