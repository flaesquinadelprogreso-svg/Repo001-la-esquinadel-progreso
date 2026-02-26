import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import AnalisisFinanciero from './pages/AnalisisFinanciero';
import Inventario from './pages/Inventario';
import POS from './pages/POS';
import Compras from './pages/Compras';
import Caja from './pages/Caja';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Configuracion from './pages/Configuracion';
import CuentasCobrar from './pages/CuentasCobrar';
import CuentasPagar from './pages/CuentasPagar';
import NuevaCompra from './pages/NuevaCompra';
import HistorialVentas from './pages/HistorialVentas';
import Login from './pages/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas: Requieren Token */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<AnalisisFinanciero />} />
            <Route path="/analisis-financiero" element={<AnalisisFinanciero />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/historial-ventas" element={<HistorialVentas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/nueva-compra" element={<NuevaCompra />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/cuentas-cobrar" element={<CuentasCobrar />} />
            <Route path="/cuentas-pagar" element={<CuentasPagar />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
