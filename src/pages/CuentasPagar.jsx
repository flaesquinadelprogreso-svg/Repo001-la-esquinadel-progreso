import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronRight, FileText, CheckCircle, Clock, AlertTriangle, Wallet, Building, CreditCard, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { formatPesos } from '../utils/currency';

import api from '../api/client';
import '../styles/cuentas-mobile.css';

const metodosPago = [
    { id: 'efectivo', label: 'Efectivo', icon: Wallet, color: '#16A34A' },
    { id: 'transferencia', label: 'Transferencia', icon: Building, color: '#F2A900' }
];

export default function CuentasPagar() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAdmin = currentUser.role === 'admin';
    const [cuentas, setCuentas] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('pendientes');
    const [showModal, setShowModal] = useState(false);
    const [showDetalleModal, setShowDetalleModal] = useState(null);

    // Estado para el pago dentro del modal de detalle
    const [pagoMonto, setPagoMonto] = useState('');
    const [metodoSeleccionado, setMetodoSeleccionado] = useState('efectivo');
    const [cuentasFinancieras, setCuentasFinancieras] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [isCajaOpen, setIsCajaOpen] = useState(true);

    const [nuevaCuenta, setNuevaCuenta] = useState({
        proveedorId: '',
        descripcion: '',
        monto: '',
        fechaVencimiento: ''
    });

    // Fetch data from API
    const fetchData = async () => {
        try {
            setLoading(true);
            const [cuentasRes, proveedoresRes, finRes] = await Promise.all([
                api.get('/cuentas-pagar'),
                api.get('/proveedores'),
                api.get('/cuentas-financieras')
            ]);

            const cuentasData = cuentasRes.data;
            const proveedoresData = proveedoresRes.data;
            const finData = finRes.data;

            setCuentas(cuentasData);
            setProveedores(proveedoresData);
            setCuentasFinancieras(finData);

            // Default select first caja
            const defaultCaja = finData.find(c => c.tipo === 'caja');
            if (defaultCaja) {
                setSelectedAccountId(defaultCaja.id);
                const cierreRes = await api.get(`/cierres/hoy?cuentaId=${defaultCaja.id}`).catch(() => null);
                if (cierreRes && cierreRes.data) {
                    setIsCajaOpen(!!cierreRes.data.activo);
                } else {
                    setIsCajaOpen(false);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Preparar cuentas individuales ordenadas y con cálculos listos
    const cuentasMapeadas = React.useMemo(() => {
        return cuentas.map(cuenta => {
            const proveedorNombre = cuenta.proveedor?.nombre || 'Sin proveedor';
            const saldo = cuenta.monto - (cuenta.abonado || 0);
            const fechaVenc = new Date(cuenta.fechaVencimiento);
            const hoy = new Date();
            const tieneVencidas = fechaVenc < hoy && saldo > 0;
            return {
                ...cuenta,
                proveedorNombre,
                saldoPendiente: saldo,
                tieneVencidas
            };
        }).sort((a, b) => new Date(b.fechaCreacion || b.createdAt) - new Date(a.fechaCreacion || a.createdAt));
    }, [cuentas]);

    const filteredCuentas = cuentasMapeadas.filter(c => {
        const matchSearch = c.proveedorNombre.toLowerCase().includes(search.toLowerCase()) ||
            c.id.toString().includes(search) ||
            (c.descripcion && c.descripcion.toLowerCase().includes(search.toLowerCase()));

        const matchStatus = filterStatus === 'todas' ||
            (filterStatus === 'pendientes' && c.saldoPendiente > 0) ||
            (filterStatus === 'vencidas' && c.tieneVencidas) ||
            (filterStatus === 'pagadas' && c.saldoPendiente <= 0);
        return matchSearch && matchStatus;
    });

    // Resumen
    const resumen = {
        total: cuentas.reduce((sum, c) => sum + c.monto, 0),
        abonado: cuentas.reduce((sum, c) => sum + (c.abonado || 0), 0),
        pendiente: cuentas.reduce((sum, c) => sum + (c.monto - (c.abonado || 0)), 0),
        vencidas: cuentas.filter(c => {
            const fechaVenc = new Date(c.fechaVencimiento);
            const hoy = new Date();
            const saldo = c.monto - (c.abonado || 0);
            return fechaVenc < hoy && saldo > 0;
        }).length
    };

    // Crear nueva cuenta
    const handleCrearCuenta = async () => {
        if (!nuevaCuenta.proveedorId || !nuevaCuenta.monto) {
            alert('Por favor complete el proveedor y monto');
            return;
        }

        try {
            await api.post('/cuentas-pagar', {
                proveedorId: parseInt(nuevaCuenta.proveedorId),
                descripcion: nuevaCuenta.descripcion,
                monto: parseInt(nuevaCuenta.monto),
                fechaVencimiento: nuevaCuenta.fechaVencimiento || null
            });

            fetchData();
            setShowModal(false);
            setNuevaCuenta({ proveedorId: '', descripcion: '', monto: '', fechaVencimiento: '' });
        } catch (error) {
            console.error('Error creating cuenta:', error);
            alert(error.response?.data?.error || 'Error al crear cuenta');
        }
    };

    // Registrar pago (abono FIFO)
    const handleRegistrarPago = async () => {
        if (!showDetalleModal || !pagoMonto || parseInt(pagoMonto) <= 0) {
            alert('Ingrese un monto válido');
            return;
        }

        const cuentaActiva = cuentasMapeadas.find(c => c.id === showDetalleModal.id) || showDetalleModal;
        if (parseInt(pagoMonto) > cuentaActiva.saldoPendiente) {
            alert(`El monto no puede superar la deuda total de ${formatPesos(cuentaActiva.saldoPendiente)}`);
            return;
        }

        try {
            await api.post(`/proveedores/${cuentaActiva.proveedorId}/abono-fifo`, {
                monto: parseInt(pagoMonto),
                metodo: metodoSeleccionado,
                cuentaId: parseInt(selectedAccountId)
            });

            await fetchData();
            setPagoMonto('');
            alert('Abono registrado exitosamente');
            setShowDetalleModal(null);
        } catch (error) {
            console.error('Error registering payment:', error);
            alert(error.response?.data?.error || 'Error al registrar pago');
        }
    };

    // Helper to format currency on input
    const handleCurrencyInput = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (showDetalleModal) {
            const cuentaActiva = cuentasMapeadas.find(c => c.id === showDetalleModal.id) || showDetalleModal;
            if (parseInt(val) > cuentaActiva.saldoPendiente) {
                val = cuentaActiva.saldoPendiente.toString();
            }
        }
        setPagoMonto(val);
    };

    const handleEliminarCuenta = async (cuentaId) => {
        if (!window.confirm('¿Está seguro de eliminar esta cuenta por pagar? Se eliminarán todos los abonos y movimientos asociados. Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/cuentas-pagar/${cuentaId}`);
            setShowDetalleModal(null);
            fetchData();
            alert('Cuenta eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting cuenta:', error);
            alert(error.response?.data?.error || 'Error al eliminar cuenta');
        }
    };

    return (
        <div id="cuentas-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="cuentas-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Cuentas por Pagar</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Gestión de cuentas por pagar a proveedores</p>
                </div>
                <Button onClick={() => setShowModal(true)}><Plus size={16} style={{ marginRight: '6px' }} />Nueva Cuenta</Button>
            </div>

            {/* Resumen */}
            <div id="cuentas-resumen" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total por Pagar</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#1A1A2E' }}>{formatPesos(resumen.total)}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Abonado</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A' }}>{formatPesos(resumen.abonado)}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Pendiente</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>{formatPesos(resumen.pendiente)}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Vencidas</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626' }}>{resumen.vencidas}</div>
                </div>
            </div>

            {/* Filtros */}
            <div id="cuentas-filters" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff' }}
                >
                    <option value="todas">Todas</option>
                    <option value="pendientes">Pendientes</option>
                    <option value="vencidas">Vencidas</option>
                    <option value="pagadas">Pagadas</option>
                </select>
            </div>

            {/* Lista de Cuentas Individuales */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                    Cargando cuentas...
                </div>
            ) : (
                <div id="cuentas-lista" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredCuentas.map((cuenta, idx) => (
                        <div
                            key={idx}
                            onClick={() => setShowDetalleModal(cuenta)}
                            style={{
                                backgroundColor: cuenta.saldoPendiente <= 0 ? '#F0FDF4' : '#fff',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: cuenta.saldoPendiente <= 0 ? '#BBF7D0' : '#E5E7EB',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s',
                                opacity: cuenta.saldoPendiente <= 0 ? 0.8 : 1
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: cuenta.saldoPendiente <= 0 ? '#DCFCE7' : (cuenta.tieneVencidas ? '#FEE2E2' : '#F3F4F6'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {cuenta.saldoPendiente <= 0
                                        ? <CheckCircle size={24} color="#16A34A" />
                                        : (cuenta.tieneVencidas ? <AlertTriangle size={24} color="#DC2626" /> : <FileText size={24} color="#6B7280" />)
                                    }
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F2A900', backgroundColor: '#FFF8E7', padding: '2px 6px', borderRadius: '4px' }}>
                                            CXP-{cuenta.id.toString().padStart(4, '0')}
                                        </span>
                                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {cuenta.proveedorNombre}
                                        </span>
                                        {cuenta.saldoPendiente <= 0 && (
                                            <span style={{ fontSize: '10px', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                                PAGADA
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
                                        {(() => {
                                            const firstLine = (cuenta.descripcion || '').split('|')[0].trim();
                                            const parts = firstLine.replace(/^PAGADA\s*/i, '').split(' - ');
                                            const recibo = parts[0]?.trim() || '';
                                            const totalLines = (cuenta.descripcion || '').split('|').length;
                                            return recibo.length > 25 ? recibo.substring(0, 25) + '...' + (totalLines > 1 ? ` (+${totalLines - 1})` : '') : recibo + (totalLines > 1 ? ` (+${totalLines - 1} más)` : '');
                                        })()}
                                    </div>
                                    <div style={{ fontSize: '12px', color: cuenta.tieneVencidas && cuenta.saldoPendiente > 0 ? '#DC2626' : '#9CA3AF', marginTop: '4px' }}>
                                        Vence: {cuenta.fechaVencimiento ? new Date(cuenta.fechaVencimiento).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0, marginLeft: '16px' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                        Balance {cuenta.saldoPendiente <= 0 ? '' : 'Pendiente'}
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: cuenta.saldoPendiente > 0 ? '#D97706' : '#16A34A' }}>
                                        {formatPesos(cuenta.saldoPendiente)}
                                    </div>
                                </div>
                                <ChevronRight size={20} color="#9CA3AF" />
                            </div>
                        </div>
                    ))}

                    {filteredCuentas.length === 0 && (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                            No se encontraron cuentas
                        </div>
                    )}
                </div>
            )}

            {/* Modal Nueva Cuenta */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Cuenta por Pagar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Proveedor *</label>
                        <select
                            value={nuevaCuenta.proveedorId}
                            onChange={(e) => setNuevaCuenta(prev => ({ ...prev, proveedorId: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                        >
                            <option value="">Seleccionar proveedor...</option>
                            {proveedores.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descripción</label>
                        <input
                            type="text"
                            value={nuevaCuenta.descripcion}
                            onChange={(e) => setNuevaCuenta(prev => ({ ...prev, descripcion: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Concepto de la deuda"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Monto *</label>
                        <input
                            type="number"
                            value={nuevaCuenta.monto}
                            onChange={(e) => setNuevaCuenta(prev => ({ ...prev, monto: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Fecha de Vencimiento</label>
                        <input
                            type="date"
                            value={nuevaCuenta.fechaVencimiento}
                            onChange={(e) => setNuevaCuenta(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleCrearCuenta}>Crear Cuenta</Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Detalle Cuenta */}
            {showDetalleModal && (() => {
                const cuentaActiva = cuentasMapeadas.find(c => c.id === showDetalleModal.id) || showDetalleModal;

                return (
                    <Modal isOpen={true} onClose={() => setShowDetalleModal(null)} title="Estado de Cuenta por Pagar" size="lg">
                        <div id="cuentas-modal-bg" style={{ padding: '4px' }}>
                            <div id="cuentas-modal-paper" style={{
                                backgroundColor: '#fff',
                                padding: '16px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                {/* Header compacto */}
                                <div id="cuentas-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#F2A900', backgroundColor: '#FFF8E7', padding: '3px 8px', borderRadius: '4px' }}>CXP-{cuentaActiva.id.toString().padStart(4, '0')}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>{cuentaActiva.proveedorNombre}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', color: '#6B7280' }}>Vence: {cuentaActiva.fechaVencimiento ? new Date(cuentaActiva.fechaVencimiento).toLocaleDateString() : 'N/A'}</span>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleEliminarCuenta(cuentaActiva.id)}
                                                title="Eliminar cuenta"
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '28px', height: '28px', borderRadius: '6px',
                                                    border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}
                                            >
                                                <Trash2 size={14} color="#DC2626" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Summary compacto en línea */}
                                <div style={{ display: 'flex', gap: '16px', padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px', fontSize: '13px' }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ color: '#6B7280', fontSize: '11px' }}>Deuda</span>
                                        <div style={{ fontWeight: 700 }}>{formatPesos(cuentaActiva.monto)}</div>
                                    </div>
                                    <div style={{ flex: 1, borderLeft: '1px solid #E5E7EB', paddingLeft: '16px' }}>
                                        <span style={{ color: '#6B7280', fontSize: '11px' }}>Abonado</span>
                                        <div style={{ fontWeight: 700, color: '#16A34A' }}>{formatPesos((cuentaActiva.abonado || 0) + (parseInt(pagoMonto) || 0))}</div>
                                    </div>
                                    <div style={{ flex: 1, borderLeft: '1px solid #E5E7EB', paddingLeft: '16px' }}>
                                        <span style={{ color: '#6B7280', fontSize: '11px' }}>Pendiente</span>
                                        <div style={{ fontWeight: 700, color: '#DC2626' }}>{formatPesos(cuentaActiva.saldoPendiente - (parseInt(pagoMonto) || 0))}</div>
                                    </div>
                                </div>

                                {/* Detailed Table with FIFO logic */}
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>Detalle de facturas</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 0', fontWeight: 600, color: '#6B7280' }}>Descripción</th>
                                                <th style={{ padding: '8px 0', fontWeight: 600, color: '#6B7280' }}>Vence</th>
                                                <th style={{ padding: '8px 0', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>Total</th>
                                                <th style={{ padding: '8px 0', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>Pdt.</th>
                                                <th style={{ padding: '8px 7px', fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>Abonar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const lines = cuentaActiva.descripcion ? cuentaActiva.descripcion.split('|') : [];
                                                let abonoYaAplicado = (cuentaActiva.abonado || 0);
                                                const nuevoAbono = parseInt(pagoMonto) || 0;

                                                const itemsData = lines.map((line) => {
                                                    const cleanLine = line.trim();
                                                    const parts = cleanLine.replace(/^PAGADA\s*/i, '').split(' - ');
                                                    const detail = parts[0]?.trim() || 'Compra';
                                                    const date = parts.length >= 2 ? parts[1]?.trim() : (cuentaActiva.fechaVencimiento ? new Date(cuentaActiva.fechaVencimiento).toLocaleDateString() : '-');
                                                    let itemAmount = 0;
                                                    if (parts.length >= 3) {
                                                        const valStr = parts[2].replace(/[^0-9]/g, '');
                                                        itemAmount = parseInt(valStr) || 0;
                                                    } else {
                                                        itemAmount = lines.length === 1 ? cuentaActiva.monto : 0;
                                                    }
                                                    const pagadoPrevio = Math.min(abonoYaAplicado, itemAmount);
                                                    const pendienteAntes = itemAmount - pagadoPrevio;
                                                    abonoYaAplicado -= pagadoPrevio;
                                                    return { detail, date, itemAmount, pendienteAntes };
                                                });

                                                let abonoNuevoRestante = nuevoAbono;
                                                return itemsData.map((item, idx) => {
                                                    const abonarEsteItem = Math.min(abonoNuevoRestante, item.pendienteAntes);
                                                    const pendienteDespues = item.pendienteAntes - abonarEsteItem;
                                                    abonoNuevoRestante -= abonarEsteItem;
                                                    const isItemPagada = pendienteDespues <= 0 && item.itemAmount > 0;

                                                    return (
                                                        <tr key={idx} style={{
                                                            backgroundColor: isItemPagada ? '#F0FDF4' : 'transparent',
                                                            borderBottom: '1px solid #F3F4F6'
                                                        }}>
                                                            <td style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {isItemPagada ? (
                                                                    <span style={{ fontSize: '10px', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>PAGADA</span>
                                                                ) : (
                                                                    <span style={{ fontSize: '10px', color: '#F2A900', backgroundColor: '#FFF8E7', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>CXP-{cuentaActiva.id.toString().padStart(4, '0')}</span>
                                                                )}
                                                                <span style={{ fontWeight: 500, color: isItemPagada ? '#166534' : '#111827' }}>{item.detail}</span>
                                                            </td>
                                                            <td style={{ padding: '12px 0', color: isItemPagada ? '#166534' : '#6B7280' }}>{item.date}</td>
                                                            <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: isItemPagada ? '#166534' : '#111827' }}>{formatPesos(item.itemAmount)}</td>
                                                            <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: isItemPagada ? '#16A34A' : '#111827' }}>{formatPesos(pendienteDespues)}</td>
                                                            <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: abonarEsteItem > 0 ? '#DC2626' : '#9CA3AF' }}>
                                                                {abonarEsteItem > 0 ? formatPesos(abonarEsteItem) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Payment Interface compacto */}
                                {cuentaActiva.saldoPendiente > 0 ? (
                                    <div style={{ padding: '10px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Pagar:</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {metodosPago.map(metodo => (
                                                    <button
                                                        key={metodo.id}
                                                        onClick={() => setMetodoSeleccionado(metodo.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '4px',
                                                            padding: '5px 10px', borderRadius: '4px', border: '1px solid',
                                                            borderColor: metodoSeleccionado === metodo.id ? '#1A1A2E' : '#D1D5DB',
                                                            backgroundColor: metodoSeleccionado === metodo.id ? '#1A1A2E' : '#fff',
                                                            color: metodoSeleccionado === metodo.id ? '#fff' : '#4B5563',
                                                            cursor: 'pointer', fontWeight: 600, fontSize: '11px', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <metodo.icon size={12} color={metodoSeleccionado === metodo.id ? '#fff' : metodo.color} />
                                                        {metodo.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <select
                                                value={selectedAccountId}
                                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                                style={{ padding: '5px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none', backgroundColor: '#fff', minWidth: '140px' }}
                                            >
                                                <option value="">Cuenta...</option>
                                                {cuentasFinancieras.filter(c => metodoSeleccionado === 'efectivo' ? c.tipo === 'caja' : c.tipo === 'banco').map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={pagoMonto ? formatPesos(pagoMonto) : ''}
                                                onChange={handleCurrencyInput}
                                                style={{ width: '130px', padding: '5px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', fontWeight: 700, color: '#1A1A2E' }}
                                                placeholder="$ 0"
                                            />
                                            <Button
                                                onClick={handleRegistrarPago}
                                                style={{ padding: '5px 16px', height: '30px', fontSize: '12px', fontWeight: 700, backgroundColor: '#1A365D' }}
                                                disabled={!selectedAccountId || !pagoMonto || (!isCajaOpen && metodoSeleccionado === 'efectivo')}
                                            >
                                                {isCajaOpen || metodoSeleccionado !== 'efectivo' ? 'Aplicar' : 'Caja Cerrada'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '6px', fontWeight: 700, fontSize: '13px' }}>
                                            <CheckCircle size={16} />
                                            <span>Cuenta pagada en su totalidad</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Modal>
                );
            })()}
        </div>
    );
}
