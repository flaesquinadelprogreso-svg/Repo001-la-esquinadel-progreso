import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Wallet, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import Dropdown, { DropdownItem } from '../ui/Dropdown';
import Badge from '../ui/Badge';
import api from '../../api/client';

export default function Topbar() {
    const [searchFocused, setSearchFocused] = useState(false);
    const [currentUser, setCurrentUser] = useState(
        JSON.parse(localStorage.getItem('currentUser')) || { name: 'Cargando...', role: '...' }
    );
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleLogout = () => {
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
                    name: perfilRes.data.nombre || 'Administrador',
                    role: perfilRes.data.rol || 'Propietario'
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
            borderBottom: '1px solid #E2E5EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            flexShrink: 0,
            width: '100%',
            zIndex: 50
        }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: searchFocused ? '480px' : '380px', transition: 'max-width 200ms ease' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                    type="text"
                    placeholder="Buscar productos, clientes, ventas..."
                    style={{
                        width: '100%', paddingLeft: '40px', paddingRight: '16px',
                        paddingTop: '9px', paddingBottom: '9px',
                        fontSize: '13px', backgroundColor: '#F0F2F5',
                        border: '1px solid #E2E5EA', borderRadius: '8px',
                        outline: 'none', fontFamily: 'inherit',
                        transition: 'all 200ms ease'
                    }}
                    onFocus={(e) => {
                        setSearchFocused(true);
                        e.target.style.backgroundColor = '#FFFFFF';
                        e.target.style.borderColor = '#3B82F6';
                        e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                        setSearchFocused(false);
                        e.target.style.backgroundColor = '#F0F2F5';
                        e.target.style.borderColor = '#E2E5EA';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
                <button style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', fontSize: '12px', fontWeight: 600,
                    color: 'white', backgroundColor: '#1E3A5F',
                    borderRadius: '8px', border: 'none', cursor: 'pointer',
                    transition: 'background 150ms'
                }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2C4F7C'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1E3A5F'}
                >
                    <Wallet size={14} /><span>Caja</span>
                </button>

                <Dropdown trigger={
                    <button style={{
                        position: 'relative', padding: '8px', borderRadius: '8px',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        color: '#6B7280', transition: 'all 150ms'
                    }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF0F7'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Bell size={18} />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '8px', height: '8px', borderRadius: '50%',
                                backgroundColor: '#DC2626'
                            }} />
                        )}
                    </button>
                }>
                    {(close) => (
                        <div style={{ width: '300px' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E5EA', backgroundColor: '#EBF0F7' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notificaciones</h4>
                            </div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                                    No hay notificaciones nuevas
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} onClick={close} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5', transition: 'background 100ms' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF0F7'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: n.type === 'danger' ? '#DC2626' : '#1A1A2E' }}>{n.title}</p>
                                            <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{n.time}</span>
                                        </div>
                                        <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{n.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Dropdown>

                <Dropdown trigger={
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '6px 10px', borderRadius: '8px',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        transition: 'all 150ms'
                    }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF0F7'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            backgroundColor: '#1E3A5F', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>
                                {userInitials}
                            </span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A2E' }}>{currentUser.name}</p>
                            <p style={{ fontSize: '10px', color: '#9CA3AF' }}>{currentUser.role}</p>
                        </div>
                        <ChevronDown size={12} style={{ color: '#9CA3AF' }} />
                    </button>
                }>
                    {(close) => (
                        <>
                            <DropdownItem icon={User} onClick={close}>Mi Perfil</DropdownItem>
                            <DropdownItem icon={Settings} onClick={close}>Configuración</DropdownItem>
                            <div style={{ borderTop: '1px solid #E2E5EA', margin: '4px 0' }} />
                            <DropdownItem icon={LogOut} danger onClick={() => { close(); handleLogout(); }}>Cerrar Sesión</DropdownItem>
                        </>
                    )}
                </Dropdown>
            </div>
        </header>
    );
}
