import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Wallet, User, LogOut, Settings, ChevronDown, Menu } from 'lucide-react';
import Dropdown, { DropdownItem } from '../ui/Dropdown';
import Badge from '../ui/Badge';
import api from '../../api/client';
import { clearPersistedModule } from '../../hooks/usePersistedState';

export default function Topbar({ isMobile, onMenuToggle }) {
    const [currentUser, setCurrentUser] = useState(
        JSON.parse(localStorage.getItem('currentUser')) || { name: 'Cargando...', role: '...' }
    );
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleLogout = () => {
        clearPersistedModule(''); // Limpiar todos los borradores (carrito, compras, etc.)
        localStorage.removeItem('token');
        navigate('/login');
    };

    const fetchData = async () => {
        try {
            const [perfilRes, notifRes] = await Promise.all([
                api.get('/perfil').catch(() => null),
                api.get('/notificaciones').catch(() => null)
            ]);

            if (perfilRes && perfilRes.data) {
                const newProfile = {
                    name: perfilRes.data.username || perfilRes.data.nombre || 'Administrador',
                    role: perfilRes.data.role || perfilRes.data.rol || 'Propietario'
                };
                setCurrentUser(newProfile);
                localStorage.setItem('currentUser', JSON.stringify(newProfile));
            }

            if (notifRes && notifRes.data) {
                setNotifications(notifRes.data);
            }
        } catch (error) {
            console.error('Error fetching topbar data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Refresh notifications every 5 minutes
        const interval = setInterval(fetchData, 300000);
        return () => clearInterval(interval);
    }, []);

    const userInitials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

    return (
        <header style={{
            height: '60px',
            minHeight: '60px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #ECECEC',
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '0 12px' : '0 28px',
            flexShrink: 0,
            width: '100%',
            zIndex: 50,
            gap: isMobile ? '8px' : undefined
        }}>
            {/* Hamburger (mobile only) */}
            {isMobile && (
                <button
                    onClick={onMenuToggle}
                    style={{
                        padding: '8px', borderRadius: '10px',
                        border: 'none', background: 'transparent',
                        cursor: 'pointer', color: '#F5B400',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <Menu size={22} strokeWidth={2} />
                </button>
            )}

            {/* Navbar Branding */}
            <div style={{ display: 'none', lg: 'block' }} className="topbar-branding">
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827', letterSpacing: '0.2px' }}>
                    LA ESQUINA DEL PROGRESO
                </span>
            </div>

            {/* Left side: Caja + Notificaciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: isMobile ? undefined : '20px' }}>
                <button style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 16px', fontSize: '13px', fontWeight: 600,
                    color: '#111827', backgroundColor: '#F5B400',
                    borderRadius: '10px', border: 'none', cursor: 'pointer',
                    transition: 'background 150ms'
                }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E6A800'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F5B400'}
                >
                    <Wallet size={16} strokeWidth={2} /><span>Caja</span>
                </button>

                <Dropdown trigger={
                    <button style={{
                        position: 'relative', padding: '8px', borderRadius: '10px',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        color: '#6B7280', transition: 'all 150ms'
                    }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Bell size={20} strokeWidth={2} />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '8px', height: '8px', borderRadius: '50%',
                                backgroundColor: '#DC2626'
                            }} />
                        )}
                    </button>
                } align="left">
                    {(close) => (
                        <div style={{ width: '300px' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #ECECEC' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notificaciones</h4>
                            </div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                                    No hay notificaciones nuevas
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} onClick={close} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F3F3F3', transition: 'background 100ms' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: n.type === 'danger' ? '#DC2626' : '#111827' }}>{n.title}</p>
                                            <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{n.time}</span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{n.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Dropdown>
            </div>

            {/* Right side: Admin */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <Dropdown trigger={
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '6px 10px', borderRadius: '10px',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        transition: 'all 150ms'
                    }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            backgroundColor: '#F5B400', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>
                                {userInitials}
                            </span>
                        </div>
                        {!isMobile && (
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{currentUser.name}</p>
                                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{currentUser.role}</p>
                            </div>
                        )}
                        {!isMobile && <ChevronDown size={14} strokeWidth={2} style={{ color: '#9CA3AF' }} />}
                    </button>
                }>
                    {(close) => (
                        <>
                            <DropdownItem icon={Settings} onClick={() => { close(); navigate('/configuracion'); }}>Configuración</DropdownItem>
                            <div style={{ borderTop: '1px solid #ECECEC', margin: '4px 0' }} />
                            <DropdownItem icon={LogOut} danger onClick={() => { close(); handleLogout(); }}>Cerrar Sesión</DropdownItem>
                        </>
                    )}
                </Dropdown>
            </div>
        </header>
    );
}
