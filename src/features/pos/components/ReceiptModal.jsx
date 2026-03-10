import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPesos } from '../../../utils/currency';
import logoSrc from '../../../Logo/Logo1.jpg';
import api from '../../../api/client';
import { Send, CheckCircle, AlertTriangle, Phone } from 'lucide-react';

export default function ReceiptModal({ sale, onClose, onDownloadPDF }) {
    const [config, setConfig] = useState({ nombreEmpresa: '', nit: '' });
    const [waConnected, setWaConnected] = useState(false);
    const [waPhone, setWaPhone] = useState('');
    const [waSending, setWaSending] = useState(false);
    const [waResult, setWaResult] = useState(null);
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    useEffect(() => {
        api.get('/configuracion').then(r => {
            if (r.data) setConfig(r.data);
        }).catch(() => {});

        api.get('/whatsapp/status').then(r => {
            setWaConnected(r.data?.status === 'CONNECTED');
        }).catch(() => {});
    }, []);

    // Descargar PDF automáticamente al mostrar el recibo
    useEffect(() => {
        if (sale && onDownloadPDF) {
            const timer = setTimeout(() => {
                onDownloadPDF();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [sale]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pre-fill phone from client data if available
    useEffect(() => {
        if (sale?.cliente?.telefono) {
            setWaPhone(sale.cliente.telefono);
        }
    }, [sale]);

    const handleSendWhatsApp = async () => {
        const cleanPhone = waPhone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 7) {
            setWaResult({ type: 'error', msg: 'Ingrese un número válido (ej: 573001234567)' });
            return;
        }
        setWaSending(true);
        setWaResult(null);
        try {
            // Verificar que el recibo esté renderizado
            const element = document.getElementById('receipt-content');
            if (!element) {
                setWaResult({ type: 'error', msg: 'Error: recibo no disponible' });
                setWaSending(false);
                return;
            }

            // Generar PDF como base64
            const { default: html2pdf } = await import('html2pdf.js');
            const pdfBlob = await html2pdf().set({
                margin: 0,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: [80, 250], orientation: 'portrait' }
            }).from(element).outputPdf('blob');

            // Convertir blob a base64
            const pdfBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) resolve(reader.result.split(',')[1]);
                    else reject(new Error('Error al leer PDF'));
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(pdfBlob);
            });

            await api.post('/whatsapp/enviar-recibo', {
                numero: cleanPhone,
                pdfBase64,
                filename: `Recibo_${sale.receiptNumber}.pdf`,
                recibo: {
                    receiptNumber: sale.receiptNumber,
                    total: sale.total,
                    ivaTasa: sale.ivaTasa
                }
            });
            setWaResult({ type: 'success', msg: 'Recibo PDF enviado por WhatsApp' });
        } catch (err) {
            setWaResult({ type: 'error', msg: err.response?.data?.error || 'Error al generar o enviar el recibo' });
        }
        setWaSending(false);
    };

    if (!sale) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title="Recibo">
            <div>
                <div id="receipt-content" style={{ width: '260px', padding: '15px', backgroundColor: '#fff', margin: '0 auto', color: '#000', fontFamily: "'Courier New', Courier, monospace" }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <img
                            src={logoSrc}
                            alt="Logo"
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                border: '2px solid #BFDBFE',
                                objectFit: 'cover',
                                marginBottom: '8px'
                            }}
                        />
                        <h2 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px 0', lineHeight: '1.3' }}>FERRETERIA LA ESQUINA DEL PROGRESO</h2>
                        <p style={{ fontSize: '11px', margin: '0 0 1px 0', color: '#000', fontWeight: 600 }}>NIT 19.591.012-2</p>
                        <p style={{ fontSize: '11px', margin: '0 0 1px 0', color: '#000', fontWeight: 600 }}>CALLE 9A #10-37</p>
                        <p style={{ fontSize: '11px', margin: '0 0 1px 0', color: '#000', fontWeight: 600 }}>Algarrobo - Tel. 3014147802</p>
                        <p style={{ fontSize: '11px', margin: '0 0 1px 0', color: '#000', fontWeight: 600 }}>flaesquinadelprogreso@gmail.com</p>
                        <p style={{ fontSize: '14px', fontWeight: 800, margin: '8px 0 0 0', letterSpacing: '1px' }}>FACTURACIÓN</p>
                        <p style={{ fontSize: '12px', fontWeight: 700, margin: '4px 0 0 0' }}>No. {sale.receiptNumber}</p>
                        {sale.cliente?.nombre && (
                            <p style={{ fontSize: '12px', fontWeight: 700, margin: '6px 0 0 0', color: '#000' }}>Cliente: {sale.cliente.nombre}</p>
                        )}
                    </div>

                    <div style={{ borderTop: '1px dashed #E5E7EB', borderBottom: '1px dashed #E5E7EB', padding: '12px 0 8px 0', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', fontWeight: 800, fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                            <div style={{ width: '35px' }}>CANT</div>
                            <div style={{ flex: 1, paddingLeft: '8px' }}>DESCRIPCION</div>
                            <div style={{ width: '70px', textAlign: 'right' }}>TOTAL</div>
                        </div>

                        {sale.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', marginBottom: '8px', fontSize: '11px', fontWeight: 600 }}>
                                <div style={{ width: '35px', paddingTop: '2px' }}>{item.qty}</div>
                                <div style={{ flex: 1, paddingLeft: '8px', paddingRight: '4px', wordBreak: 'break-word' }}>
                                    {item.name}
                                </div>
                                <div style={{ width: '70px', textAlign: 'right', paddingTop: '2px' }}>
                                    {formatPesos(item.price * item.qty)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                            <span>SUBTOTAL:</span>
                            <span>{formatPesos(sale.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                            <span>IVA:</span>
                            <span>{formatPesos(sale.iva)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '8px' }}>
                            <span>TOTAL:</span>
                            <span>{formatPesos(sale.total)}</span>
                        </div>
                    </div>

                    {sale.paymentMethod === 'efectivo' && sale.cashReceived > 0 && (
                        <div style={{ backgroundColor: '#F3F4F6', padding: '8px', borderRadius: '4px', fontSize: '12px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '4px' }}>
                                <span>EFECTIVO:</span>
                                <span>{formatPesos(sale.cashReceived)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                                <span>CAMBIO:</span>
                                <span>{formatPesos(sale.change)}</span>
                            </div>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', fontWeight: 600 }}>
                        {currentUser.name && (
                            <p style={{ margin: '0 0 4px 0', color: '#000' }}>Nombre del vendedor: {currentUser.name}</p>
                        )}
                        <p style={{ margin: '0 0 4px 0' }}>¡GRACIAS POR SU COMPRA!</p>
                        <p style={{ margin: 0 }}>{new Date().toLocaleString()}</p>
                    </div>
                </div>

                {/* WhatsApp send section */}
                {waConnected && (
                    <div style={{
                        margin: '16px 20px 0',
                        padding: '14px',
                        backgroundColor: '#F0FDF4',
                        border: '1px solid rgba(22,163,74,0.2)',
                        borderRadius: '10px'
                    }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#15803D', margin: '0 0 10px 0' }}>
                            Enviar recibo por WhatsApp
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                                <input
                                    type="tel"
                                    value={waPhone}
                                    onChange={e => { setWaPhone(e.target.value.replace(/\D/g, '')); setWaResult(null); }}
                                    placeholder="573001234567"
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 30px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={waSending || !waPhone.trim()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 14px',
                                    backgroundColor: waSending || !waPhone.trim() ? '#9CA3AF' : '#25D366',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: waSending || !waPhone.trim() ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Send size={14} />
                                {waSending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                        {waResult && (
                            <div style={{
                                marginTop: '8px', fontSize: '12px', fontWeight: 500,
                                color: waResult.type === 'success' ? '#16A34A' : '#DC2626',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                {waResult.type === 'success' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                                {waResult.msg}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', padding: '0 20px', paddingBottom: '20px' }}>
                    <Button onClick={onDownloadPDF} style={{ flex: 1, backgroundColor: '#10B981', color: '#fff', borderColor: '#10B981' }}>
                        Descargar PDF
                    </Button>
                    <Button onClick={onClose} style={{ flex: 1 }} variant="secondary">Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
}
