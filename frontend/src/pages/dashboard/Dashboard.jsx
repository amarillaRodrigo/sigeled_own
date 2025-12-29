import { useAuth } from '../../context/AuthContext';
import Nav from '../../components/Nav';
import { Suspense, lazy } from 'react';
import Contratos from './Contratos';
import RequireRoles from '../../components/RequireRoles';
import UsuariosSection from './UsuariosSection';
import UsuarioDetalle from './UsuarioDetalle';
import MiLegajo from './MiLegajo';
import DashboardHome from './home/DashboardHome';
import MisContratos from './MisContratos';
import Notificaciones from './Notificaciones';
import ContratoNuevo from './ContratoNuevo';
import AiChat from './AiChat';
import MiPerfil from './MiPerfil';
import Profesor from './Profesor';
import Cargos from './Cargos';
import MisMateriasYCargos from './MisMateriasYCargos';
import Reportes from './Reportes';
import { Routes, Route } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-[#020c14] text-white">
      <div className='relative flex-1'> 
        <Nav/>
        <main>
          <Suspense fallback={<div className='p-6'>Cargando página...</div>}>
            <Routes>
              <Route path = "/" element={<DashboardHome />}/>
              <Route path = "legajo" element={<MiLegajo />}/>
              <Route path = "mis-contratos" element={<MisContratos />}/>
              <Route path="notificaciones" element={<Notificaciones />}/>
              <Route path="mi-perfil" element={<MiPerfil />}/>
              <Route path="mis-materias" element={<Profesor />} />
              <Route path="mis-cargos" element={<Cargos />} />
              <Route path="mis-materias-cargos" element={<MisMateriasYCargos />} />

              <Route element={<RequireRoles anyOf={["ADMIN", "RRHH", "RECURSOS HUMANOS", "ADMINISTRADOR"]}/>}>
                <Route path = "usuarios" element={<UsuariosSection user={user} />}/>
                <Route path = "usuarios/:id" element={<UsuarioDetalle />}/>
                <Route path = "contratos" element={<Contratos />}/>
                <Route path = "contratos/nuevo/:idPersona" element={<ContratoNuevo />}/>
                <Route path="clampy" element={<AiChat/>}/>
                <Route path="reportes" element={<Reportes/>}/>
              </Route>
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;