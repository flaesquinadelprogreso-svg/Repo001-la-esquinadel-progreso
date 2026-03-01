import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
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
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchCompras = () => {
        api.get('/compras')
            .then(res => res.data)
            .then(data => setCompras(Array.isArray(data) ? data : []))
            .catch(console.error);
    };

    useEffect(() => { fetchCompras(); }, []);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/compras/${deleteId}`);
            setDeleteId(null);
            fetchCompras();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al eliminar compra');
        } finally {
            setDeleting(false);
        }
    };

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
                            {['#', 'Proveedor', 'Fecha', 'Total', 'Estado', 'Registrado por', 'Acciones'].map(h => (
                                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {compras.length > 0 ? compras.map((p, idx) => {
                            const sc = statusColors[p.estado] || { bg: '#F3F4F6', text: '#4B5563' };
                            return (
                                <tr key={p.id} style={{ borderBottom: idx < compras.length - 1 ? '1px solid #F0F2F5' : 'none', transition: 'background 100ms' }}
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
                                    <td data-label="Registrado por" style={{ padding: '14px 20px', fontSize: '13px', color: '#1A1A2E', fontWeight: 500 }}>
                                        {p.usuario?.username || '-'}
                                    </td>
                                    <td data-label="Acciones" style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => navigate(`/editar-compra/${p.id}`)}
                                                title="Editar"
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EEF2FF'; e.currentTarget.style.borderColor = '#4F46E5'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(p.id)}
                                                title="Eliminar"
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.borderColor = '#EF4444'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                                    No hay compras registradas aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete confirmation modal */}
            {deleteId && (
                <Modal isOpen={true} onClose={() => setDeleteId(null)} title="Eliminar Compra">
                    <div style={{ minWidth: '400px' }}>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '20px' }}>
                            ¿Está seguro de eliminar esta compra? Se revertirán el stock y los movimientos financieros asociados. Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
                            <Button onClick={handleDelete} disabled={deleting} style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}>
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
