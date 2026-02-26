import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
    const token = localStorage.getItem('token');

    if (!token) {
        // Redirige al login si no hay token en localStorage
        return <Navigate to="/login" replace />;
    }

    // Si hay token, renderiza las subrutas (MainLayout y demas)
    return <Outlet />;
}
