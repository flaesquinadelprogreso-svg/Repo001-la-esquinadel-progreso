import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPesos } from '../../../utils/currency';
import logoSrc from '../../../Logo/logo.png';
import api from '../../../api/client';

export default function ReceiptModal({ sale, onClose, onDownloadPDF }) {
    const [config, setConfig] = useState({ nombreEmpresa: '', nit: '' });

    useEffect(() => {
        api.get('/configuracion').then(r => {
            if (r.data) setConfig(r.data);
        }).catch(() => {});
    }, []);

    // Descargar PDF automáticamente al mostrar el recibo
    useEffect(() => {
        if (sale && onDownloadPDF) {
            // Esperar a que el DOM renderice el recibo
            const timer = setTimeout(() => {
                onDownloadPDF();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [sale]); // eslint-disable-line react-hooks/exhaustive-deps

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
                                border: '2px solid #BFDBFE', // Soft blue border
                                objectFit: 'cover',
                                marginBottom: '8px'
                            }}
                        />
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>{config.nombreEmpresa || 'MI NEGOCIO'}</h2>
                        {config.nit && <p style={{ fontSize: '11px', margin: 0 }}>NIT: {config.nit}</p>}
                        <p style={{ fontSize: '13px', fontWeight: 700, margin: '8px 0 0 0' }}>Recibo #{sale.receiptNumber}</p>
                    </div>

                    <div style={{ borderTop: '1px dashed #E5E7EB', borderBottom: '1px dashed #E5E7EB', padding: '12px 0 8px 0', marginBottom: '12px' }}>
                        {/* Table Header */}
                        <div style={{ display: 'flex', fontWeight: 800, fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                            <div style={{ width: '35px' }}>CANT</div>
                            <div style={{ flex: 1, paddingLeft: '8px' }}>DESCRIPCION</div>
                            <div style={{ width: '70px', textAlign: 'right' }}>TOTAL</div>
                        </div>

                        {/* Items */}
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
                        <p style={{ margin: '0 0 4px 0' }}>¡GRACIAS POR SU COMPRA!</p>
                        <p style={{ margin: 0 }}>{new Date().toLocaleString()}</p>
                    </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', padding: '0 20px', paddingBottom: '20px' }}>
                    <Button onClick={onDownloadPDF} style={{ flex: 1, backgroundColor: '#10B981', color: '#fff', borderColor: '#10B981' }}>
                        Descargar PDF
                    </Button>
                    <Button onClick={onClose} style={{ flex: 1 }} variant="secondary">Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
}
