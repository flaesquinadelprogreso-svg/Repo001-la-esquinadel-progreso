import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Lazy loading de páginas: cada módulo (con sus dependencias como xlsx, qrcode.react, etc.)
// se carga SOLO cuando el usuario navega a esa ruta, no al inicio.
// Esto evita el "Illegal constructor" de Vite 7 + React 19 al inicializar
// módulos CJS pesados (xlsx, qrcode.react, html2pdf) en el bundle inicial.
const AnalisisFinanciero = lazy(() => import('./pages/AnalisisFinanciero'));
const Inventario         = lazy(() => import('./pages/Inventario'));
const POS                = lazy(() => import('./pages/POS'));
const HistorialVentas    = lazy(() => import('./pages/HistorialVentas'));
const Compras            = lazy(() => import('./pages/Compras'));
const NuevaCompra        = lazy(() => import('./pages/NuevaCompra'));
const Caja               = lazy(() => import('./pages/Caja'));
const Clientes           = lazy(() => import('./pages/Clientes'));
const Proveedores        = lazy(() => import('./pages/Proveedores'));
const CuentasCobrar      = lazy(() => import('./pages/CuentasCobrar'));
const CuentasPagar       = lazy(() => import('./pages/CuentasPagar'));
const Cotizaciones       = lazy(() => import('./pages/Cotizaciones'));
const NuevaCotizacion    = lazy(() => import('./pages/NuevaCotizacion'));
const Configuracion      = lazy(() => import('./pages/Configuracion'));
const Usuarios           = lazy(() => import('./pages/Usuarios'));

// Fallback mínimo mientras carga el chunk de la página
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E2E5EA', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas: Requieren Token */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Suspense fallback={<PageLoader />}><AnalisisFinanciero /></Suspense>} />
            <Route path="/analisis-financiero" element={<Suspense fallback={<PageLoader />}><AnalisisFinanciero /></Suspense>} />
            <Route path="/inventario" element={<Suspense fallback={<PageLoader />}><Inventario /></Suspense>} />
            <Route path="/pos" element={<Suspense fallback={<PageLoader />}><POS /></Suspense>} />
            <Route path="/historial-ventas" element={<Suspense fallback={<PageLoader />}><HistorialVentas /></Suspense>} />
            <Route path="/compras" element={<Suspense fallback={<PageLoader />}><Compras /></Suspense>} />
            <Route path="/nueva-compra" element={<Suspense fallback={<PageLoader />}><NuevaCompra /></Suspense>} />
            <Route path="/editar-compra/:id" element={<Suspense fallback={<PageLoader />}><NuevaCompra /></Suspense>} />
            <Route path="/cotizaciones" element={<Suspense fallback={<PageLoader />}><Cotizaciones /></Suspense>} />
            <Route path="/nueva-cotizacion" element={<Suspense fallback={<PageLoader />}><NuevaCotizacion /></Suspense>} />
            <Route path="/editar-cotizacion/:id" element={<Suspense fallback={<PageLoader />}><NuevaCotizacion /></Suspense>} />
            <Route path="/caja" element={<Suspense fallback={<PageLoader />}><Caja /></Suspense>} />
            <Route path="/clientes" element={<Suspense fallback={<PageLoader />}><Clientes /></Suspense>} />
            <Route path="/proveedores" element={<Suspense fallback={<PageLoader />}><Proveedores /></Suspense>} />
            <Route path="/cuentas-cobrar" element={<Suspense fallback={<PageLoader />}><CuentasCobrar /></Suspense>} />
            <Route path="/cuentas-pagar" element={<Suspense fallback={<PageLoader />}><CuentasPagar /></Suspense>} />
            <Route path="/configuracion" element={<Suspense fallback={<PageLoader />}><Configuracion /></Suspense>} />
            <Route path="/usuarios" element={<Suspense fallback={<PageLoader />}><Usuarios /></Suspense>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
