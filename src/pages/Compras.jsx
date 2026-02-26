import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatPesos } from '../utils/currency';

import api from '../api/client';
import '../styles/compras-mobile.css';

const statusColors = {
    recibida: { bg: '#DCFCE7', text: '#16A34A' },
    pagada: { bg: '#DBEAFE', text: '#1E40AF' },
    anulada: { bg: '#FEE2E2', text: '#DC2626' }
};

export default function Compras() {
    const navigate = useNavigate();
    const [compras, setCompras] = useState([]);

    useEffect(() => {
        api.get('/compras')
            .then(res => res.data)
            .then(data => setCompras(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    return (
        <div id="compras-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="compras-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Compras</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Registro y seguimiento de compras</p>
                </div>
                <Button onClick={() => navigate('/nueva-compra')}><Plus size={16} style={{ marginRight: '6px' }} />Nueva Compra</Button>
            </div>

            {/* Purchases table */}
            <div id="compras-table-container" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            {['#', 'Proveedor', 'Fecha', 'Total', 'Estado'].map(h => (
                                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {compras.length > 0 ? compras.map((p, idx) => {
                            const sc = statusColors[p.estado] || { bg: '#F3F4F6', text: '#4B5563' };
                            return (
                                <tr key={p.id} style={{ borderBottom: idx < compras.length - 1 ? '1px solid #F0F2F5' : 'none', transition: 'background 100ms', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFBFC'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td data-label="Factura" style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
                                        {p.numeroFactura || `OC-${p.id}`}
                                    </td>
                                    <td data-label="Proveedor" style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: '#1A1A2E' }}>
                                        {p.proveedor?.nombre || p.contacto || 'Sin Proveedor'}
                                    </td>
                                    <td data-label="Fecha" style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>
                                        {new Date(p.createdAt).toLocaleDateString()}
                                    </td>
                                    <td data-label="Total" style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#1E3A5F' }}>
                                        {formatPesos(p.total)}
                                    </td>
                                    <td data-label="Estado" style={{ padding: '14px 20px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', backgroundColor: sc.bg, color: sc.text, textTransform: 'capitalize' }}>
                                            {p.estado}
                                        </span>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                                    No hay compras registradas aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
