import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pallets from './pages/Pallets';
import PalletDetail from './pages/PalletDetail';
import IngresoPallet from './pages/IngresoPallet';
import Validacion from './pages/Validacion';
import AsignarPosicion from './pages/AsignarPosicion';
import Posiciones from './pages/Posiciones';
import Movimientos from './pages/Movimientos';
import Historial from './pages/Historial';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/pallets" element={<Pallets />} />
            <Route path="/pallets/:codigo" element={<PalletDetail />} />
            <Route path="/ingreso" element={<ProtectedRoute permission="pallets.crear"><IngresoPallet /></ProtectedRoute>} />
            <Route path="/validacion" element={<ProtectedRoute permission="pallets.validar"><Validacion /></ProtectedRoute>} />
            <Route path="/posiciones" element={<Posiciones />} />
            <Route path="/posiciones/asignar" element={<ProtectedRoute permission="posiciones.asignar"><AsignarPosicion /></ProtectedRoute>} />
            <Route path="/movimientos" element={<ProtectedRoute permission="pallets.mover"><Movimientos /></ProtectedRoute>} />
            <Route path="/historial" element={<ProtectedRoute permission="historial.ver"><Historial /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute permission="reportes.ver"><Reportes /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute permission="config.admin"><Configuracion /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
