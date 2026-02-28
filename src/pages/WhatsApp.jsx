import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wifi, WifiOff, Send, Phone, AlertTriangle, CheckCircle, LogOut, Loader, TestTube, Trash2, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../api/client';

export default function WhatsApp() {
    const [status, setStatus] = useState({ status: 'DISCONNECTED', qr: null });
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [destino, setDestino] = useState('');
    const [savedDestino, setSavedDestino] = useState('');
    const [resultado, setResultado] = useState(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await api.get('/configuracion');
            if (res.data?.whatsappDestino) {
                setDestino(res.data.whatsappDestino);
                setSavedDestino(res.data.whatsappDestino);
            }
        } catch (err) { /* ignore */ }
    };

    useEffect(() => {
        fetchStatus();
        fetchConfig();
        const interval = setInterval(fetchStatus, 4000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        try {
            await api.post('/whatsapp/conectar');
        } catch (err) {
            alert('Error al conectar WhatsApp');
        }
        setLoading(false);
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Desea desconectar WhatsApp?')) return;
        try {
            await api.post('/whatsapp/desconectar');
            setStatus({ status: 'DISCONNECTED', qr: null, hasSavedSession: false });
        } catch (err) {
            alert('Error al desconectar');
        }
    };

    const handleLimpiarSesion = async () => {
        if (!window.confirm('Limpiar sesion expirada y volver a vincular?')) return;
        try {
            await api.post('/whatsapp/desconectar');
            setStatus({ status: 'DISCONNECTED', qr: null, hasSavedSession: false });
            // Auto-iniciar vinculacion
            setTimeout(async () => {
                setLoading(true);
                try { await api.post('/whatsapp/conectar'); } catch (e) { /* ignore */ }
                setLoading(false);
            }, 500);
        } catch (err) {
            alert('Error al limpiar sesion');
        }
    };

    const handleSaveDestino = async () => {
        try {
            await api.put('/configuracion', { whatsappDestino: destino });
            setSavedDestino(destino);
            setResultado({ type: 'success', msg: 'Numero guardado correctamente' });
            setTimeout(() => setResultado(null), 3000);
        } catch (err) {
            setResultado({ type: 'error', msg: 'Error al guardar' });
        }
    };

    const handlePrueba = async () => {
        const num = destino || savedDestino;
        if (!num) {
            setResultado({ type: 'error', msg: 'Configure el numero destino primero' });
            return;
        }
        setSending(true);
        setResultado(null);
        try {
            const res = await api.post('/whatsapp/prueba', { numero: num });
            setResultado({ type: 'success', msg: res.data.message || 'Mensaje de prueba enviado' });
        } catch (err) {
            setResultado({ type: 'error', msg: err.response?.data?.error || 'Error al enviar prueba' });
        }
        setSending(false);
    };

    const handleNotificar = async () => {
        const num = destino || savedDestino;
        if (!num) {
            setResultado({ type: 'error', msg: 'Configure el numero destino primero' });
            return;
        }
        setSending(true);
        setResultado(null);
        try {
            const res = await api.post('/whatsapp/notificar-vencidos', { numero: num });
            const d = res.data;
            setResultado({
                type: 'success',
                msg: d.message || `Enviado. Vencidas: ${d.cuentasVencidas || 0}, Pendientes: ${d.cuentasPendientes || 0}`
            });
        } catch (err) {
            setResultado({ type: 'error', msg: err.response?.data?.error || 'Error al enviar' });
        }
        setSending(false);
    };

    const isConnected = status.status === 'CONNECTED';
    const isQR = status.status === 'QR_READY';
    const isConnecting = status.status === 'CONNECTING';
    const isSessionExpired = status.status === 'DISCONNECTED' && status.hasSavedSession;

    const statusConfig = isConnected
        ? { bg: '#DCFCE7', text: '#16A34A', border: 'rgba(22,163,74,0.3)', label: 'Conectado', sub: 'Sesion activa - listo para enviar' }
        : isQR
            ? { bg: '#FEF3C7', text: '#D97706', border: 'rgba(217,119,6,0.3)', label: 'Esperando Escaneo', sub: 'Escanea el QR con tu WhatsApp' }
            : isConnecting
                ? { bg: '#DBEAFE', text: '#2563EB', border: 'rgba(37,99,235,0.3)', label: 'Conectando...', sub: 'Reconectando sesion guardada...' }
                : isSessionExpired
                    ? { bg: '#FEF3C7', text: '#D97706', border: 'rgba(217,119,6,0.3)', label: 'Sesion expirada', sub: 'La sesion anterior ya no es valida. Limpie y vuelva a vincular.' }
                    : { bg: '#FEE2E2', text: '#DC2626', border: 'rgba(220,38,38,0.3)', label: 'Desconectado', sub: 'Vincule su dispositivo para enviar alertas' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>

            {/* Status Card */}
            <div style={{
                padding: '20px', borderRadius: '12px',
                backgroundColor: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isConnected ? <Wifi size={24} style={{ color: statusConfig.text }} />
                        : isConnecting ? <Loader size={24} style={{ color: statusConfig.text, animation: 'spin 1s linear infinite' }} />
                        : <WifiOff size={24} style={{ color: statusConfig.text }} />}
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: statusConfig.text }}>{statusConfig.label}</p>
                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{statusConfig.sub}</p>
                    </div>
                    {status.status === 'DISCONNECTED' && !isSessionExpired && (
                        <Button size="sm" onClick={handleConnect} disabled={loading}>Vincular</Button>
                    )}
                    {isSessionExpired && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button size="sm" onClick={handleConnect} disabled={loading} icon={RefreshCw}>Reintentar</Button>
                            <Button size="sm" variant="secondary" onClick={handleLimpiarSesion} icon={Trash2}>Limpiar</Button>
                        </div>
                    )}
                    {isConnected && (
                        <Button size="sm" variant="secondary" onClick={handleDisconnect} icon={LogOut}>Desconectar</Button>
                    )}
                </div>
            </div>

            {/* QR Code */}
            {isQR && status.qr && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                    padding: '32px', backgroundColor: '#fff', border: '1px solid #E2E5EA', borderRadius: '12px'
                }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>Escanea este codigo con WhatsApp:</p>
                    <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '2px solid #E5E7EB' }}>
                        <QRCodeSVG value={status.qr} size={250} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center', lineHeight: '1.5' }}>
                        Abre WhatsApp en tu celular &gt; Ajustes &gt; Dispositivos vinculados &gt; Vincular un dispositivo
                    </p>
                </div>
            )}

            {/* Numero Destino */}
            <div style={{
                padding: '24px', backgroundColor: '#fff', border: '1px solid #E2E5EA', borderRadius: '12px'
            }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', marginBottom: '4px' }}>Numero Destino de Alertas</h3>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
                    Las alertas de cuentas por cobrar se enviaran a este numero. Use codigo de pais (ej: 573001234567)
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="WhatsApp del Jefe / Empresa"
                            value={destino}
                            onChange={e => setDestino(e.target.value)}
                            placeholder="573001234567"
                            icon={Phone}
                        />
                    </div>
                    <Button
                        onClick={handleSaveDestino}
                        disabled={!destino || destino === savedDestino}
                        size="sm"
                        style={{ marginBottom: '2px' }}
                    >
                        Guardar
                    </Button>
                </div>
                {savedDestino && (
                    <p style={{ fontSize: '11px', color: '#16A34A', marginTop: '8px' }}>
                        Guardado: {savedDestino}
                    </p>
                )}
            </div>

            {/* Enviar Resumen */}
            <div style={{
                padding: '24px', backgroundColor: '#fff', border: '1px solid #E2E5EA', borderRadius: '12px'
            }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', marginBottom: '4px' }}>Enviar Resumen de Cobranza</h3>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
                    Envia un resumen de todas las cuentas por cobrar (vencidas y pendientes) al numero configurado.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button
                        onClick={handleNotificar}
                        disabled={!isConnected || sending || (!destino && !savedDestino)}
                        icon={Send}
                        style={{ flex: 1 }}
                    >
                        {sending ? 'Enviando...' : 'Enviar Resumen de Cobranza'}
                    </Button>
                    <Button
                        onClick={handlePrueba}
                        disabled={!isConnected || sending || (!destino && !savedDestino)}
                        icon={TestTube}
                        variant="secondary"
                    >
                        Prueba
                    </Button>
                </div>

                {!isConnected && (
                    <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> Conecte WhatsApp primero para enviar
                    </p>
                )}

                {resultado && (
                    <div style={{
                        marginTop: '12px', padding: '12px 16px', borderRadius: '8px',
                        backgroundColor: resultado.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                        color: resultado.type === 'success' ? '#16A34A' : '#DC2626',
                        fontSize: '13px', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        {resultado.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {resultado.msg}
                    </div>
                )}
            </div>
        </div>
    );
}
