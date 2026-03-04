import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, CheckCircle, Clock, XCircle, Send as SendIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatPesos } from '../utils/currency';
import api from '../api/client';

const estadoConfig = {
    borrador: { label: 'Borrador', color: '#6B7280', bg: '#F3F4F6' },
    enviada: { label: 'Enviada', color: '#2563EB', bg: '#EFF6FF' },
    aceptada: { label: 'Aceptada', color: '#16A34A', bg: '#F0FDF4' },
    rechazada: { label: 'Rechazada', color: '#DC2626', bg: '#FEF2F2' }
};

export default function Cotizaciones() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAdmin = currentUser.role === 'admin';

    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('todas');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/cotizaciones');
            setCotizaciones(res.data || []);
        } catch (error) {
            console.error('Error fetching cotizaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = cotizaciones.filter(c => {
        const matchSearch = (c.cliente?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
            c.numeroCotizacion.toLowerCase().includes(search.toLowerCase());
        const matchEstado = filterEstado === 'todas' || c.estado === filterEstado;
        return matchSearch && matchEstado;
    });

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta cotización?')) return;
        try {
            await api.delete(`/cotizaciones/${id}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al eliminar');
        }
    };

    const handleEstado = async (id, estado) => {
        try {
            await api.patch(`/cotizaciones/${id}/estado`, { estado });
            fetchData();
        } catch (error) {
            alert('Error al cambiar estado');
        }
    };

    // Summary
    const resumen = {
        total: cotizaciones.length,
        borrador: cotizaciones.filter(c => c.estado === 'borrador').length,
        enviada: cotizaciones.filter(c => c.estado === 'enviada').length,
        aceptada: cotizaciones.filter(c => c.estado === 'aceptada').length
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Cotizaciones</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Gestión de presupuestos y cotizaciones</p>
                </div>
                <Button onClick={() => navigate('/nueva-cotizacion')}>
                    <Plus size={16} style={{ marginRight: '6px' }} />Nueva Cotización
                </Button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                    { label: 'Total', value: resumen.total, color: '#1A1A2E' },
                    { label: 'Borradores', value: resumen.borrador, color: '#6B7280' },
                    { label: 'Enviadas', value: resumen.enviada, color: '#2563EB' },
                    { label: 'Aceptadas', value: resumen.aceptada, color: '#16A34A' }
                ].map((card, i) => (
                    <div key={i} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>{card.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o número..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                    />
                </div>
                <select
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff' }}
                >
                    <option value="todas">Todas</option>
                    <option value="borrador">Borrador</option>
                    <option value="enviada">Enviada</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="rechazada">Rechazada</option>
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Cargando...</div>
            ) : (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>#</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Cliente</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Fecha</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Válida hasta</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Total</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Estado</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(cot => {
                                const est = estadoConfig[cot.estado] || estadoConfig.borrador;
                                return (
                                    <tr key={cot.id} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                                        onClick={() => navigate(`/editar-cotizacion/${cot.id}`)}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1E3A5F' }}>{cot.numeroCotizacion}</td>
                                        <td style={{ padding: '12px 16px' }}>{cot.cliente?.nombre || 'Sin cliente'}</td>
                                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>{new Date(cot.createdAt).toLocaleDateString('es-CO')}</td>
                                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>{cot.validaHasta ? new Date(cot.validaHasta + 'T12:00:00').toLocaleDateString('es-CO') : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{formatPesos(cot.total)}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: est.color, backgroundColor: est.bg, padding: '3px 10px', borderRadius: '12px' }}>
                                                {est.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                {cot.estado === 'borrador' && (
                                                    <button onClick={() => handleEstado(cot.id, 'enviada')} title="Marcar como enviada"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', padding: '4px' }}>
                                                        <SendIcon size={14} />
                                                    </button>
                                                )}
                                                {cot.estado === 'enviada' && (
                                                    <>
                                                        <button onClick={() => handleEstado(cot.id, 'aceptada')} title="Aceptada"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A', padding: '4px' }}>
                                                            <CheckCircle size={14} />
                                                        </button>
                                                        <button onClick={() => handleEstado(cot.id, 'rechazada')} title="Rechazada"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '4px' }}>
                                                            <XCircle size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(cot.id)} title="Eliminar"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                                        No se encontraron cotizaciones
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
