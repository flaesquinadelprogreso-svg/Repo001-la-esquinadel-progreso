import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogIn, AlertCircle, Lock, Wrench } from 'lucide-react';
import api from '../api/client';
import logoSrc from '../Logo/Logo1.jpg';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', { username, password });

            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                navigate('/');
            }
        } catch (err) {
            console.error('Error en login:', err);
            setError(err.response?.data?.error || 'Error de conexión con el servidor. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundColor: '#0F172A',
            fontFamily: "'Inter', system-ui, sans-serif"
        }}>
            {/* Panel izquierdo - Branding */}
            <div className="login-brand-panel" style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1A1A2E 0%, #0F172A 50%, #1E293B 100%)',
                position: 'relative',
                overflow: 'hidden',
                padding: '40px'
            }}>
                {/* Decorative elements */}
                <div style={{
                    position: 'absolute',
                    top: '-80px',
                    right: '-80px',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(242,169,0,0.15) 0%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-60px',
                    left: '-60px',
                    width: '250px',
                    height: '250px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(242,169,0,0.1) 0%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    border: '1px solid rgba(242,169,0,0.08)',
                }} />

                {/* Logo grande */}
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        margin: '0 auto 28px auto',
                        border: '3px solid rgba(242,169,0,0.4)',
                        boxShadow: '0 0 40px rgba(242,169,0,0.2), 0 0 80px rgba(242,169,0,0.1)',
                    }}>
                        <img src={logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        color: '#F2A900',
                        margin: '0 0 6px 0',
                        letterSpacing: '1px',
                        textShadow: '0 2px 10px rgba(242,169,0,0.3)'
                    }}>
                        LA ESQUINA
                    </h1>
                    <p style={{
                        fontSize: '16px',
                        color: '#F2A900',
                        margin: '0 0 8px 0',
                        fontWeight: 600,
                        letterSpacing: '3px',
                        opacity: 0.8
                    }}>
                        DEL PROGRESO
                    </p>

                    <div style={{
                        width: '60px',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #F2A900, transparent)',
                        margin: '20px auto',
                    }} />

                    <p style={{
                        fontSize: '13px',
                        color: '#94A3B8',
                        margin: 0,
                        fontWeight: 400,
                        letterSpacing: '0.5px',
                        lineHeight: '1.6'
                    }}>
                        Ferreteria &bull; Algarrobo, Colombia
                    </p>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '32px',
                        padding: '10px 20px',
                        backgroundColor: 'rgba(242,169,0,0.08)',
                        borderRadius: '30px',
                        border: '1px solid rgba(242,169,0,0.15)',
                    }}>
                        <Wrench size={14} color="#F2A900" />
                        <span style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 500, letterSpacing: '0.5px' }}>
                            Sistema de Gestión Integral
                        </span>
                    </div>
                </div>
            </div>

            {/* Panel derecho - Formulario */}
            <div className="login-form-panel" style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                padding: '40px',
                position: 'relative'
            }}>
                <div style={{ width: '100%', maxWidth: '380px' }}>
                    {/* Mobile logo (hidden on desktop) */}
                    <div className="login-mobile-logo" style={{ display: 'none', textAlign: 'center', marginBottom: '24px' }}>
                        <img src={logoSrc} alt="Logo" style={{
                            width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid #F2A900', margin: '0 auto 12px auto', display: 'block'
                        }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A2E', margin: 0 }}>LA ESQUINA DEL PROGRESO</h2>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px 0' }}>
                            Bienvenido
                        </h2>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                            Ingresa tus credenciales para acceder al sistema
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#DC2626',
                            fontSize: '13px',
                            fontWeight: 500
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} method="post" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                Usuario
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#9CA3AF', display: 'flex', alignItems: 'center'
                                }}>
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Ingresa tu usuario"
                                    autoComplete="username"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '13px 14px 13px 44px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: '#F9FAFB',
                                        color: '#1A1A2E'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#F2A900';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(242,169,0,0.1)';
                                        e.target.style.backgroundColor = '#FFFFFF';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#E5E7EB';
                                        e.target.style.boxShadow = 'none';
                                        e.target.style.backgroundColor = '#F9FAFB';
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#9CA3AF', display: 'flex', alignItems: 'center'
                                }}>
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '13px 14px 13px 44px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: '#F9FAFB',
                                        color: '#1A1A2E'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#F2A900';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(242,169,0,0.1)';
                                        e.target.style.backgroundColor = '#FFFFFF';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#E5E7EB';
                                        e.target.style.boxShadow = 'none';
                                        e.target.style.backgroundColor = '#F9FAFB';
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            style={{
                                marginTop: '8px',
                                background: (loading || !username || !password)
                                    ? '#D1D5DB'
                                    : 'linear-gradient(135deg, #F2A900 0%, #D4950A 100%)',
                                backgroundColor: (loading || !username || !password) ? '#D1D5DB' : '#F2A900',
                                color: 'white',
                                padding: '14px',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: (loading || !username || !password) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: (loading || !username || !password) ? 'none' : '0 4px 12px rgba(242,169,0,0.3)',
                                letterSpacing: '0.3px'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && username && password) {
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(242,169,0,0.4)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = (loading || !username || !password) ? 'none' : '0 4px 12px rgba(242,169,0,0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onMouseDown={(e) => { if (!loading && username && password) e.currentTarget.style.transform = 'scale(0.98)'; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '18px', height: '18px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite'
                                    }} />
                                    Iniciando sesión...
                                </div>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    {/* Línea decorativa */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '32px'
                    }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                        <Wrench size={14} color="#D1D5DB" />
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                    </div>

                    <p style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginTop: '16px'
                    }}>
                        FERRETERIA LA ESQUINA DEL PROGRESO &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>

            {/* Responsive styles */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 768px) {
                    .login-brand-panel { display: none !important; }
                    .login-form-panel { flex: unset !important; width: 100% !important; min-height: 100vh !important; }
                    .login-mobile-logo { display: block !important; }
                }
            `}</style>
        </div>
    );
}
