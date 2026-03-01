import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogIn, AlertCircle, Lock } from 'lucide-react';
import api from '../api/client';
import logoSrc from '../Logo/logo.png';

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
                // Almacenar token en localStorage
                localStorage.setItem('token', response.data.token);
                // Redirigir al dashboard principal u original solicitado
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
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F3F4F6',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img
                        src={logoSrc}
                        alt="Logo REFRIELECTRIC"
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: '3px solid #BFDBFE',
                            objectFit: 'cover',
                            margin: '0 auto 16px auto',
                            display: 'block',
                            boxShadow: '0 4px 6px -1px rgba(30, 58, 95, 0.2)'
                        }}
                    />
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1A2E', margin: '0 0 4px 0' }}>REFRIELECTRIC</h1>
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontWeight: 500, letterSpacing: '0.5px' }}>THE COMPANY</p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #F87171',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#B91C1C',
                        fontSize: '13px',
                        fontWeight: 500
                    }}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} method="post" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Usuario</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
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
                                    padding: '12px 14px 12px 42px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    backgroundColor: '#F9FAFB'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#1E3A5F'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
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
                                    padding: '12px 14px 12px 42px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    backgroundColor: '#F9FAFB'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#1E3A5F'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !username || !password}
                        style={{
                            marginTop: '8px',
                            backgroundColor: (loading || !username || !password) ? '#9CA3AF' : '#1E3A5F',
                            color: 'white',
                            padding: '14px',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: (loading || !username || !password) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s, transform 0.1s'
                        }}
                        onMouseDown={(e) => { if (!loading && username && password) e.currentTarget.style.transform = 'scale(0.98)' }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        {loading ? (
                            'Iniciando sesión...'
                        ) : (
                            <>
                                <LogIn size={18} />
                                Iniciar Sesión
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Pequeño footer */}
            <div style={{ position: 'absolute', bottom: '24px', textAlign: 'center', width: '100%', color: '#9CA3AF', fontSize: '12px' }}>
                REFRIELECTRIC © {new Date().getFullYear()} - THE COMPANY
            </div>
        </div>
    );
}
