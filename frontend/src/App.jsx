import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layout/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Inicio from './pages/Inicio';
import Perfil from './components/Perfil';
import Revision from './pages/Revision';
import RegisterArchivos from './pages/RegisterArchivos';
import OnBoardingRoute from './components/OnBoardingRoute';
import Notificaciones from './pages/dashboard/Notificaciones';

const queryClient = new QueryClient({
  defaultOptions:{
    queries: {
      staleTime: 1000 * 60 * 5,

      gcTime: 1000 * 60 * 15,

      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="relative flex flex-col w-full min-h-screen app-container">
            <div className="box-border flex-1 w-full">
              <Routes>
                <Route path="/" element={<Inicio />}/>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/revision" element={ <Revision /> }/>
                <Route path="/registro/archivos" element={<OnBoardingRoute><RegisterArchivos /></OnBoardingRoute>}/>
                
                <Route element={<DashboardLayout/>}>
                  <Route 
                    path="/dashboard/*" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                </Route>  

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;