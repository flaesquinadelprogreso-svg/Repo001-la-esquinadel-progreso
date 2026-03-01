import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, Receipt, Wallet,
    Users, Truck, MessageCircle, Shield, BarChart3, Settings,
    ChevronLeft, Store, CreditCard, Banknote, Landmark, ReceiptText
} from 'lucide-react';
import api from '../../api/client';
import logo from '../../Logo/logo.png';

const navItems = [
    { path: '/analisis-financiero', label: 'Análisis Financiero', icon: BarChart3 },
    { path: '/inventario', label: 'Inventario', icon: Package },
    { path: '/pos', label: 'POS Ventas', icon: ShoppingCart },
    { path: '/historial-ventas', label: 'Historial Ventas', icon: ReceiptText },
    { path: '/compras', label: 'Compras', icon: Receipt },
    { path: '/caja', label: 'Caja y Bancos', icon: Landmark },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/proveedores', label: 'Proveedores', icon: Truck },
    { path: '/cuentas-cobrar', label: 'Cuentas por Cobrar', icon: CreditCard },
    { path: '/cuentas-pagar', label: 'Cuentas por Pagar', icon: Banknote },
    { path: '/usuarios', label: 'Usuarios y Roles', icon: Shield },
    { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }) {
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState({ name: 'Cargando...', role: '...', permisos: [] });
    const [businessName, setBusinessName] = useState(localStorage.getItem('businessName') || 'Cargando...');

    const fetchData = async () => {
        try {
            const perfilRes = await api.get('/perfil').catch(() => null);
            if (perfilRes && perfilRes.data) {
                setCurrentUser({
                    name: perfilRes.data.username || perfilRes.data.nombre || 'Usuario',
                    role: perfilRes.data.role || perfilRes.data.rol || 'Administrador',
                    permisos: perfilRes.data.permisos || []
                });
            }

            const configRes = await api.get('/configuracion').catch(() => null);
            if (configRes && configRes.data && configRes.data.nombreEmpresa) {
                setBusinessName(configRes.data.nombreEmpresa);
                localStorage.setItem('businessName', configRes.data.nombreEmpresa);
            } else if (businessName === 'Cargando...') {
                setBusinessName('Mi Negocio');
            }
        } catch (error) {
            console.error('Error fetching sidebar data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter nav items based on user permissions
    const isAdmin = currentUser.role === 'admin' || (currentUser.permisos && currentUser.permisos.includes('all'));
    const filteredNavItems = isAdmin ? navItems : navItems.filter(item => {
        // /usuarios is admin-only
        if (item.path === '/usuarios') return false;
        // Check if user has permission for this module
        const moduleKey = item.path.replace('/', '');
        return currentUser.permisos && currentUser.permisos.includes(moduleKey);
    });

    const userInitials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    const width = collapsed ? 72 : 250;

    // Transition for hiding sidebar on mobile
    const showSidebar = isMobile ? mobileOpen : true;
    const sidebarStyle = {
        position: 'fixed', left: 0, top: 0, height: '100vh',
        width: isMobile ? '250px' : `${width}px`, backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E5EA',
        display: 'flex', flexDirection: 'column',
        zIndex: 100, transition: 'all 300ms ease',
        boxShadow: showSidebar ? '2px 0 8px rgba(0,0,0,0.08)' : '2px 0 8px rgba(0,0,0,0.04)',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        visibility: isMobile ? (mobileOpen ? 'visible' : 'hidden') : 'visible'
    };

    return (
        <>
        {/* Overlay oscuro en móvil */}
        {isMobile && mobileOpen && (
            <div
                onClick={onMobileClose}
                style={{
                    position: 'fixed', inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    zIndex: 99, transition: 'opacity 300ms ease'
                }}
            />
        )}
        <aside style={sidebarStyle}>
            {/* Logo */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '0 16px', height: '60px',
                borderBottom: '1px solid #E2E5EA', flexShrink: 0
            }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: '#fff', border: '1px solid #EEF2FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden'
                }}>
                    <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                {!collapsed && (
                    <div style={{ overflow: 'hidden' }}>
                        <h1 style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E', whiteSpace: 'nowrap' }}>
                            REFRIELECTRIC
                        </h1>
                        <p style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap', fontWeight: 500 }}>THE COMPANY</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0 }}>
                    {filteredNavItems.map(({ path, label, icon: Icon }) => {
                        const isActive = path === '/analisis-financiero' ? location.pathname === '/analisis-financiero' || location.pathname === '/' : location.pathname.startsWith(path);
                        return (
                            <li key={path}>
                                <NavLink
                                    to={path}
                                    onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                                    title={collapsed ? label : undefined}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: collapsed ? '10px' : '10px 14px',
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        borderRadius: '8px', textDecoration: 'none',
                                        fontSize: '13px', fontWeight: isActive ? 600 : 500,
                                        backgroundColor: isActive ? '#1E3A5F' : 'transparent',
                                        color: isActive ? '#FFFFFF' : '#6B7280',
                                        transition: 'all 150ms ease'
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = '#EBF0F7';
                                            e.currentTarget.style.color = '#1A1A2E';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#6B7280';
                                        }
                                    }}
                                >
                                    <Icon size={20} style={{ flexShrink: 0, color: isActive ? '#FFFFFF' : '#9CA3AF' }} />
                                    {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User */}
            <div style={{ padding: '10px', borderTop: '1px solid #E2E5EA', flexShrink: 0 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px',
                    backgroundColor: '#EBF0F7',
                    justifyContent: collapsed ? 'center' : 'flex-start'
                }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        backgroundColor: '#1E3A5F', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>
                            {userInitials}
                        </span>
                    </div>
                    {!collapsed && (
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{currentUser.name}</p>
                            <p style={{ fontSize: '10px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{currentUser.role}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse toggle (desktop only) */}
            {!isMobile && (
                <button
                    onClick={onToggle}
                    style={{
                        position: 'absolute', right: '-12px', top: '72px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 40,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 150ms ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EBF0F7'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                >
                    <ChevronLeft size={14} style={{ color: '#9CA3AF', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 300ms ease' }} />
                </button>
            )}
        </aside>
        </>
    );
}
