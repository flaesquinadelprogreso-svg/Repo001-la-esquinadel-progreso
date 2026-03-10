import { useState, useEffect } from 'react';
import { Search, History, RotateCcw, Calendar, Filter, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

import api from '../api/client';
import '../styles/historial-mobile.css';

const formatPesos = (num) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
};

export default function HistorialVentas() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedHistoryId, setExpandedHistoryId] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    // Return State (Inline)
    const [returnItems, setReturnItems] = useState({});
    const [returnReason, setReturnReason] = useState('');
    const [refundMethod, setRefundMethod] = useState({}); // mapped by ventaId
    const [selectedAccountId, setSelectedAccountId] = useState({}); // mapped by ventaId
    const [isReturning, setIsReturning] = useState(false);
    const [isCajaOpen, setIsCajaOpen] = useState(true);
    const [cuentas, setCuentas] = useState([]);

    useEffect(() => {
        fetchHistory();
        fetchCuentas();
    }, []);

    const fetchCuentas = async () => {
        try {
            const response = await api.get('/cuentas-financieras');
            if (response.data) {
                const data = response.data;
                setCuentas(data);

                // Check if caja is open
                const defaultCaja = data.find(c => c.tipo === 'caja');
                if (defaultCaja) {
                    const cierreRes = await api.get(`/cierres/hoy?cuentaId=${defaultCaja.id}`).catch(() => null);
                    if (cierreRes && cierreRes.data) {
                        setIsCajaOpen(!!cierreRes.data.activo);
                    } else {
                        setIsCajaOpen(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching cuentas:', error);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ventas/historial');
            if (response.data) {
                const data = response.data;
                setHistory(data);
            }
        } catch (error) {
            console.error('Error fetching global history:', error);
        } finally {
            setLoading(false);
        }
    };

    // Derived values for filters
    const availableMonths = [...new Set(history.map(v => {
        const d = new Date(v.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse();

    const filteredHistory = history.filter(venta => {
        const matchesSearch =
            venta.numeroRecibo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (venta.cliente?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

        const saleMonth = new Date(venta.createdAt).toISOString().slice(0, 7); // format YYYY-MM
        const matchesMonth = selectedMonth ? saleMonth === selectedMonth : true;

        const matchesMethod = selectedPaymentMethod ? venta.metodoPago === selectedPaymentMethod : true;

        return matchesSearch && matchesMonth && matchesMethod;
    });

    const handleExpandToggle = (venta) => {
        if (expandedHistoryId === venta.id) {
            setExpandedHistoryId(null);
        } else {
            setExpandedHistoryId(venta.id);
            // Reset return state for this sale
            setReturnItems({});
            setReturnReason('');
            setRefundMethod(prev => ({ ...prev, [venta.id]: venta.metodoPago === 'credito' ? 'credito' : 'efectivo' }));
            setSelectedAccountId(prev => ({ ...prev, [venta.id]: '' }));
        }
    };

    const calculateReturnTotals = (venta) => {
        if (!venta) return { subtotal: 0, iva: 0, total: 0 };
        let total = 0;

        Object.entries(returnItems).forEach(([itemId, qty]) => {
            if (qty > 0) {
                const item = venta.items.find(i => i.id === parseInt(itemId));
                if (item) {
                    // El precio unitario ya incluye el IVA
                    const lineTotal = item.precioUnit * qty;
                    total += lineTotal;
                }
            }
        });

        // Calcular el IVA implícito para mostrar
        const iva = total - (total / (1 + (venta.ivaTasa / 100)));
        const subtotal = total - iva;

        return { subtotal, iva, total };
    };

    const processReturn = async (venta) => {
        const totals = calculateReturnTotals(venta);
        if (totals.total <= 0) {
            alert('Debe seleccionar al menos un producto para devolver usando los botones +');
            return;
        }

        const rm = refundMethod[venta.id];
        const acc = selectedAccountId[venta.id];

        if (rm !== 'credito' && !acc && rm === 'banco') {
            alert('Seleccione la cuenta bancaria de la cual descontar el dinero para el reembolso');
            return;
        }

        setIsReturning(true);
        try {
            const itemsToSend = Object.entries(returnItems)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => ({ itemVentaId: parseInt(id), cantidad: qty }));

            // Motivo opcional o genérico si no se llena
            const finalMotivo = returnReason.trim() || 'Devolución estándar procesada desde historial';

            // Usar el nuevo endpoint que crea Venta con tipo DEVOLUCION y valores negativos
            const response = await api.post('/devoluciones-venta', {
                ventaId: venta.id,
                items: itemsToSend,
                motivo: finalMotivo,
                metodoReembolso: rm,
                cuentaId: acc || null,
                esDevolucionFisica: true // Restaurar stock al inventario
            });

            const result = response.data;
            alert(`Devolución procesada exitosamente.\n\nDocumento: ${result.devolucion.numeroRecibo}\nReferencia: ${result.devolucion.referencia}\nTotal devuelto: $${Math.abs(result.resumen.total).toLocaleString('es-CO')}`);
            fetchHistory(); // Refresh history
            handleExpandToggle(venta); // Collapse
        } catch (error) {
            console.error('Error generating return:', error);
            alert('Error crítico registrando devolución');
        } finally {
            setIsReturning(false);
        }
    };

    return (
        <div id="historial-ventas-root" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1A1A2E' }}>Historial de Ventas</h1>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                        Consulta ventas pasadas, busca por recibo o cliente y gestiona devoluciones.
                    </p>
                </div>
            </div>

            {/* Filters Bar */}
            <div id="historial-filtros" style={{
                display: 'flex', gap: '16px', marginBottom: '24px', backgroundColor: '#FFFFFF',
                padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', flexWrap: 'wrap'
            }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Buscar por recibo o nombre del cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Calendar size={18} color="#6B7280" />
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', minWidth: '150px' }}
                    >
                        <option value="">Todos los meses</option>
                        {availableMonths.map(month => {
                            const [y, m] = month.split('-');
                            const date = new Date(y, parseInt(m) - 1);
                            return <option key={month} value={month}>{date.toLocaleString('es-CO', { month: 'long', year: 'numeric' })}</option>
                        })}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Filter size={18} color="#6B7280" />
                    <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', minWidth: '180px' }}
                    >
                        <option value="">Todos los métodos</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="banco">Banco / Transferencia</option>
                        <option value="credito">Crédito (Abonos)</option>
                    </select>
                </div>

                {(searchTerm || selectedMonth || selectedPaymentMethod) && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedMonth('');
                            setSelectedPaymentMethod('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 16px', border: 'none', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                        <X size={16} /> Limpiar Filtros
                    </button>
                )}
            </div>

            {/* List */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
                        Cargando historial de ventas...
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
                        <History size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: '16px', fontWeight: 500, color: '#374151' }}>No se encontraron ventas</p>
                        <p style={{ fontSize: '14px', marginTop: '8px' }}>Intente ajustar o limpiar los filtros de búsqueda.</p>
                    </div>
                ) : (
                    <div>
                        {filteredHistory.map((venta) => (
                            <div key={venta.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                {/* Sale Header onClick */}
                                <div
                                    className="historial-venta-row-header"
                                    onClick={() => handleExpandToggle(venta)}
                                    style={{
                                        backgroundColor: expandedHistoryId === venta.id ? '#F8FAFC' : '#FFFFFF',
                                        padding: '10px 16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        borderLeft: expandedHistoryId === venta.id ? '4px solid #F2A900' : '4px solid transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            transform: expandedHistoryId === venta.id ? 'rotate(90deg)' : 'none',
                                            transition: 'transform 0.2s',
                                            color: '#9CA3AF',
                                            fontSize: '12px'
                                        }}>
                                            ▶
                                        </span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span>Recibo: {venta.numeroRecibo}</span>
                                                <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#4338CA', fontWeight: 500 }}>
                                                    {venta.cliente?.nombre || 'Cliente General'}
                                                </span>
                                                {venta.usuario?.username && (
                                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: 500 }}>
                                                        {venta.usuario.username}
                                                    </span>
                                                )}
                                                {venta.totalDevuelto > 0 && (
                                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 500 }}>
                                                        Con Devoluciones
                                                    </span>
                                                )}
                                                {venta.estado === 'anulada' && (
                                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F3F4F6', color: '#4B5563', fontWeight: 500 }}>
                                                        Devolución Total
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                                                {new Date(venta.createdAt).toLocaleString('es-CO', {
                                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
                                            {formatPesos(venta.total)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'capitalize', marginTop: '2px' }}>
                                            {venta.metodoPago === 'credito' ? 'Cuenta por Cobrar' : venta.metodoPago}
                                        </div>
                                    </div>
                                </div>

                                {/* Items & Inline Return (Only if expanded) */}
                                {expandedHistoryId === venta.id && (
                                    <div className="historial-venta-detalle" style={{ padding: '12px 16px 16px 40px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Detalle de Artículos{venta.tipo !== 'DEVOLUCION' ? ' y Devolución' : ''}</span>
                                            {venta.tipo !== 'DEVOLUCION' && venta.estado !== 'anulada' && (
                                                <button
                                                    onClick={() => {
                                                        const all = {};
                                                        venta.items.forEach(item => {
                                                            const disponible = item.cantidad - (item.cantidadDevuelta || 0);
                                                            if (disponible > 0) all[item.id] = disponible;
                                                        });
                                                        setReturnItems(all);
                                                    }}
                                                    style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '4px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 500 }}
                                                >
                                                    Devolver Factura Completa
                                                </button>
                                            )}
                                        </div>

                                        <div className="historial-venta-tabla-container">
                                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                                                <thead>
                                                    <tr style={{ color: '#6B7280', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                                                        <th style={{ textAlign: 'left', padding: '6px 10px' }}>Producto</th>
                                                        <th style={{ textAlign: 'center', padding: '6px 10px', width: '70px' }}>{venta.tipo === 'DEVOLUCION' ? 'Cantidad' : 'Comprado'}</th>
                                                        {venta.tipo !== 'DEVOLUCION' && <th style={{ textAlign: 'center', padding: '6px 10px', width: '70px' }}>Devuelto</th>}
                                                        {venta.tipo !== 'DEVOLUCION' && venta.estado !== 'anulada' && <th style={{ textAlign: 'center', padding: '6px 10px', width: '110px' }}>Cantidad a Devolver</th>}
                                                        <th style={{ textAlign: 'right', padding: '6px 10px', width: '90px' }}>Precio Ud.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {venta.items.map((item, i) => {
                                                        const disponible = item.cantidad - (item.cantidadDevuelta || 0);
                                                        const currentReturn = returnItems[item.id] || 0;

                                                        return (
                                                            <tr key={item.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '8px 10px' }}>
                                                                    <div style={{ fontWeight: 500, color: '#1A1A2E' }}>{item.nombre}</div>
                                                                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '1px' }}>{item.codigo}</div>
                                                                </td>
                                                                <td style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600 }}>{item.cantidad}</td>
                                                                {venta.tipo !== 'DEVOLUCION' && (
                                                                    <td style={{ textAlign: 'center', padding: '8px 10px', color: item.cantidadDevuelta > 0 ? '#DC2626' : '#9CA3AF', fontWeight: item.cantidadDevuelta > 0 ? 600 : 400 }}>
                                                                        {item.cantidadDevuelta || 0}
                                                                    </td>
                                                                )}
                                                                {venta.tipo !== 'DEVOLUCION' && venta.estado !== 'anulada' && (
                                                                    <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                                                                        {disponible > 0 ? (
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                                                                <button
                                                                                    onClick={() => setReturnItems(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                                                                    style={{ padding: '1px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#F3F4F6', cursor: 'pointer', fontSize: '12px' }}
                                                                                >-</button>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max={disponible}
                                                                                    value={currentReturn || ''}
                                                                                    onChange={(e) => {
                                                                                        const val = Math.min(parseInt(e.target.value) || 0, disponible);
                                                                                        setReturnItems(prev => ({ ...prev, [item.id]: val || 0 }));
                                                                                    }}
                                                                                    style={{ width: '36px', padding: '2px', border: '1px solid #D1D5DB', borderRadius: '4px', textAlign: 'center', fontSize: '12px', MozAppearance: 'textfield' }}
                                                                                />
                                                                                <button
                                                                                    onClick={() => setReturnItems(prev => ({ ...prev, [item.id]: Math.min(disponible, (prev[item.id] || 0) + 1) }))}
                                                                                    style={{ padding: '1px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#F3F4F6', cursor: 'pointer', fontSize: '12px' }}
                                                                                >+</button>
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>No disponible</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 500 }}>{formatPesos(item.precioUnit)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {venta.totalDevuelto > 0 && (
                                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#991B1B', fontWeight: 600, fontSize: '14px' }}>Dinero total reembolsado previamente:</span>
                                                <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '16px' }}>{formatPesos(venta.totalDevuelto)}</span>
                                            </div>
                                        )}

                                        {/* Inline Return Controls */}
                                        {(calculateReturnTotals(venta).total > 0 || Object.values(returnItems).some(qty => qty > 0)) && (
                                            <div className="historial-devolucion-controles" style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', display: 'flex', gap: '20px' }}>

                                                {/* Left: Settings */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#1A1A2E' }}>Destino del Reembolso</label>
                                                        <select
                                                            value={refundMethod[venta.id] || 'efectivo'}
                                                            onChange={(e) => {
                                                                setRefundMethod(prev => ({ ...prev, [venta.id]: e.target.value }));
                                                                setSelectedAccountId(prev => ({ ...prev, [venta.id]: '' }));
                                                            }}
                                                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }}
                                                        >
                                                            <option value="efectivo">Regresar en Efectivo</option>
                                                            <option value="banco">Transferencia Bancaria</option>
                                                            <option value="credito" disabled={venta.metodoPago !== 'credito'}>
                                                                Abonar a la Cuenta por Cobrar {venta.metodoPago !== 'credito' && '(No disponible)'}
                                                            </option>
                                                        </select>
                                                    </div>

                                                    {refundMethod[venta.id] !== 'credito' && (
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#4B5563' }}>Cuenta de Pago (Salida)</label>
                                                            <select
                                                                value={selectedAccountId[venta.id] || ''}
                                                                onChange={(e) => setSelectedAccountId(prev => ({ ...prev, [venta.id]: e.target.value }))}
                                                                style={{ width: '100%', padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }}
                                                            >
                                                                <option value="">Seleccione cuenta financiera...</option>
                                                                {cuentas.filter(c => c.tipo === (refundMethod[venta.id] === 'efectivo' ? 'caja' : 'banco')).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.nombre} (- {formatPesos(c.saldo)})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#1A1A2E' }}>Motivo (Opcional)</label>
                                                        <input
                                                            type="text"
                                                            value={returnReason}
                                                            onChange={(e) => setReturnReason(e.target.value)}
                                                            placeholder="Ej: Producto dañado..."
                                                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Right: Totals & Action */}
                                                <div className="historial-devolucion-totales" style={{ width: '220px', backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '6px', border: '1px solid #BBF7D0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                                        <div style={{ fontSize: '10px', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto a Reembolsar</div>
                                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                                                            {formatPesos(calculateReturnTotals(venta).total)}
                                                        </div>
                                                    </div>

                                                    <Button
                                                        onClick={() => processReturn(venta)}
                                                        disabled={isReturning || (!isCajaOpen && refundMethod[venta.id] === 'efectivo')}
                                                        style={{ width: '100%', padding: '8px', fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '6px' }}
                                                    >
                                                        <RotateCcw size={14} />
                                                        {isCajaOpen || refundMethod[venta.id] !== 'efectivo' ? 'Confirmar Devolución' : 'Caja Cerrada'}
                                                    </Button>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
