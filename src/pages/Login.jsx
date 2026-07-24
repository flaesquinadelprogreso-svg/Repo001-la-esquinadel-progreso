import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogIn, AlertCircle, Lock, Wrench } from 'lucide-react';
import api from '../api/client';
import logoSrc from '../Logo/Logo1.jpg';
import backLoginSrc from '../Logo/backlogin.png';

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
            position: 'relative',
            display: 'flex',
            backgroundColor: '#0F172A',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden'
        }}>
            {/* Imagen de fondo a pantalla completa, para que se transparente detrás del formulario */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${backLoginSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0) 28%, rgba(15,23,42,0) 62%, rgba(15,23,42,0.6) 100%)',
                zIndex: 0
            }} />

            {/* Panel izquierdo - Contenido de marca sobre la imagen */}
            <div className="login-brand-panel" style={{
                flex: '1.15',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Emblema del logo, arriba a la izquierda para no tapar el texto de la imagen */}
                <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid rgba(245,180,0,0.6)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
                        flexShrink: 0
                    }}>
                        <img src={logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ lineHeight: 1.25 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>LA ESQUINA</div>
                        <div style={{ color: '#F5B400', fontWeight: 600, fontSize: '11px', letterSpacing: '1.5px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>DEL PROGRESO</div>
                    </div>
                </div>

                {/* Badge inferior, alejado del texto principal de la imagen */}
                <div style={{
                    position: 'absolute',
                    bottom: '32px',
                    left: '32px',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 18px',
                    backgroundColor: 'rgba(15,23,42,0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '30px',
                    border: '1px solid rgba(245,180,0,0.25)'
                }}>
                    <Wrench size={14} color="#F5B400" />
                    <span style={{ fontSize: '12px', color: '#ECECEC', fontWeight: 500, letterSpacing: '0.3px' }}>
                        Sistema de Gestión Integral &bull; Algarrobo, Colombia
                    </span>
                </div>
            </div>

            {/* Panel derecho - Formulario (hoja flotante translúcida tipo vidrio esmerilado) */}
            <div className="login-form-panel" style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(22px) saturate(150%)',
                WebkitBackdropFilter: 'blur(22px) saturate(150%)',
                padding: '40px',
                position: 'relative',
                borderRadius: '48px 0 0 48px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), -28px 0 60px rgba(15,23,42,0.25)',
                zIndex: 2
            }}>
                <div style={{ width: '100%', maxWidth: '380px' }}>
                    {/* Mobile logo (hidden on desktop) */}
                    <div className="login-mobile-logo" style={{ display: 'none', textAlign: 'center', marginBottom: '24px' }}>
                        <img src={logoSrc} alt="Logo" style={{
                            width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid #F5B400', margin: '0 auto 12px auto', display: 'block'
                        }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>LA ESQUINA DEL PROGRESO</h2>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                            Bienvenido
                        </h2>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                            Ingresa tus credenciales para acceder al sistema
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#FDECEC',
                            border: '1px solid rgba(220,38,38,0.35)',
                            borderRadius: '14px',
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
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
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
                                        border: '2px solid #ECECEC',
                                        borderRadius: '14px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: '#F9FAFB',
                                        color: '#111827'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#F5B400';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(245,180,0,0.1)';
                                        e.target.style.backgroundColor = '#FFFFFF';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#ECECEC';
                                        e.target.style.boxShadow = 'none';
                                        e.target.style.backgroundColor = '#F9FAFB';
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
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
                                        border: '2px solid #ECECEC',
                                        borderRadius: '14px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: '#F9FAFB',
                                        color: '#111827'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#F5B400';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(245,180,0,0.1)';
                                        e.target.style.backgroundColor = '#FFFFFF';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#ECECEC';
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
                                    ? '#ECECEC'
                                    : 'linear-gradient(135deg, #F5B400 0%, #D69A00 100%)',
                                backgroundColor: (loading || !username || !password) ? '#ECECEC' : '#F5B400',
                                color: (loading || !username || !password) ? 'white' : '#111827',
                                padding: '14px',
                                borderRadius: '14px',
                                fontSize: '15px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: (loading || !username || !password) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: (loading || !username || !password) ? 'none' : '0 4px 12px rgba(245,180,0,0.3)',
                                letterSpacing: '0.3px'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && username && password) {
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,180,0,0.4)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = (loading || !username || !password) ? 'none' : '0 4px 12px rgba(245,180,0,0.3)';
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
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#ECECEC' }} />
                        <Wrench size={14} color="#ECECEC" />
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#ECECEC' }} />
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
                    .login-form-panel {
                        flex: unset !important;
                        width: 100% !important;
                        min-height: 100vh !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }
                    .login-mobile-logo { display: block !important; }
                }
            `}</style>
        </div>
    );
}
