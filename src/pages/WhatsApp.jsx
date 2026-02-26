import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Plus, Wifi, WifiOff, Send, Edit, Trash2, Phone, LinkIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../api/client';

const tabs = ['API / Config', 'Plantillas', 'Mensajes'];

export default function WhatsApp() {
    const [tab, setTab] = useState(0);
    const [status, setStatus] = useState({ status: 'DISCONNECTED', qr: null });
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ sent: 0, templates: 0 });

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            const data = res.data;
            setStatus(data);
        } catch (err) {
            console.error('Error fetching WhatsApp status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Polling cada 5s
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = () => {
        if (status.status === 'CONNECTED') return { bg: '#DCFCE7', text: '#16A34A', border: 'rgba(22,163,74,0.3)', label: 'Conectado' };
        if (status.status === 'QR_READY') return { bg: '#FEF3C7', text: '#D97706', border: 'rgba(217,119,6,0.3)', label: 'Esperando Escaneo (QR Listo)' };
        return { bg: '#FEE2E2', text: '#DC2626', border: 'rgba(220,38,38,0.3)', label: 'Desconectado' };
    };

    const sTheme = getStatusColor();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
                <Button icon={Send}>Enviar Mensaje</Button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[
                    { label: 'Mensajes Enviados', value: stats.sent, icon: Send },
                    { label: 'Plantillas', value: stats.templates, icon: MessageCircle },
                    { label: 'Estado API', value: status.status === 'CONNECTED' ? 'Conectado' : 'Desconectado', icon: status.status === 'CONNECTED' ? Wifi : WifiOff },
                ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px' }}>
                        <div><span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>{s.label}</span><p style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E', marginTop: '4px' }}>{s.value}</p></div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EBF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.icon size={20} style={{ color: '#1E3A5F' }} /></div>
                    </div>
                ))}
            </div>

            {/* Tabs + content */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '2px solid #E2E5EA' }}>
                    {tabs.map((t, i) => (
                        <button key={t} onClick={() => setTab(i)} style={{
                            padding: '14px 24px', fontSize: '13px', fontWeight: tab === i ? 600 : 500,
                            color: tab === i ? '#1E3A5F' : '#6B7280', backgroundColor: 'transparent', border: 'none',
                            borderBottom: tab === i ? '2px solid #1E3A5F' : '2px solid transparent',
                            marginBottom: '-2px', cursor: 'pointer', transition: 'all 150ms'
                        }}>{t}</button>
                    ))}
                </div>

                <div style={{ padding: '24px' }}>
                    {tab === 0 && (
                        <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '10px',
                                backgroundColor: sTheme.bg,
                                border: `1px solid ${sTheme.border}`
                            }}>
                                {status.status === 'CONNECTED' ? <Wifi size={20} style={{ color: sTheme.text }} /> : <WifiOff size={20} style={{ color: sTheme.text }} />}
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', fontWeight: 700, color: sTheme.text }}>{sTheme.label}</p>
                                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{status.status === 'CONNECTED' ? 'Sesión activa' : 'Vincule su dispositivo'}</p>
                                </div>
                                {status.status === 'DISCONNECTED' && (
                                    <Button size="sm" onClick={handleConnect} disabled={loading}>Vincular Teléfono</Button>
                                )}
                            </div>

                            {status.status === 'QR_READY' && status.qr && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '24px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #E2E5EA',
                                    borderRadius: '12px'
                                }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Escanea este código en tu WhatsApp:</p>
                                    <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                                        <QRCodeSVG value={status.qr} size={250} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#6B7280', textAlign: 'center' }}>
                                        Ve a Configuración {" > "} Dispositivos vinculados {" > "} Vincular un dispositivo
                                    </p>
                                </div>
                            )}

                            {status.status === 'CONNECTED' && (
                                <div style={{ padding: '20px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px' }}>
                                    <p style={{ fontSize: '13px', color: '#0369A1' }}>
                                        ✅ WhatsApp está listo para enviar notificaciones automáticas de cobranza.
                                    </p>
                                </div>
                            )}

                            <Input label="Estado del Webhook" value="Activo (Simulado)" readOnly icon={LinkIcon} />
                        </div>
                    )}

                    {tab === 1 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                <Button variant="secondary" size="sm" icon={Plus}>Nueva Plantilla</Button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E2E5EA' }}>
                                        {['Plantilla', 'Mensaje', 'Estado', ''].map(h => (
                                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Real rows would go here */}
                                    <tr>
                                        <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>No hay plantillas configuradas</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 2 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #E2E5EA' }}>
                                    {['Destino', 'Plantilla', 'Fecha', 'Estado'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Real rows would go here */}
                                <tr>
                                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>No hay mensajes recientes</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
