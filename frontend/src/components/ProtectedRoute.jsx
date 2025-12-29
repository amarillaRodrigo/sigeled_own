import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const hasToken = !!localStorage.getItem('token');
  
  if (loading) return <div className='p-8 mx-auto text-lg text-center'>Cargando...</div>

  if(!hasToken) return <Navigate to="/" replace/>

  if(!user) return <div className='p-8 mx-auto text-lg text-center'>Iniciando sesión...</div>

  const isActive = user?.activo === true;

  if(!isActive) return <Navigate to="/revision" replace/>
  
  return children;
};

export default ProtectedRoute;