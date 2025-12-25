import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Pisos from '@/pages/Pisos';
import Habitaciones from '@/pages/Habitaciones';
import Inquilinos from '@/pages/Inquilinos';
import Contratos from '@/pages/Contratos';
import Pagos from '@/pages/Pagos';
import Gastos from '@/pages/Gastos';
import Usuarios from '@/pages/Usuarios';
import Ajustes from '@/pages/Ajustes';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pisos" element={<Pisos />} />
            <Route path="inquilinos" element={<Inquilinos />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="gastos" element={<Gastos />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
