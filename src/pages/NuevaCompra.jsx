import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, AlertCircle, Search, X, Wallet, Building, CreditCard, ClipboardList, Layers } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { formatPesos } from '../utils/currency';
import { usePersistedState, clearPersistedModule } from '../hooks/usePersistedState';

import api from '../api/client';
import '../styles/compras-mobile.css';

export default function NuevaCompra() {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const isEditing = !!editId;

    // Header state (persisted only in create mode, not edit mode)
    const [tipoDocumento, setTipoDocumento] = usePersistedState(isEditing ? null : 'compra_tipoDocumento', 'FC - Factura de compra');
    const [fechaElaboracion, setFechaElaboracion] = usePersistedState(isEditing ? null : 'compra_fechaElaboracion', new Date().toISOString().split('T')[0]);
    const [proveedorId, setProveedorId] = usePersistedState(isEditing ? null : 'compra_proveedorId', '');
    const [proveedorSearch, setProveedorSearch] = usePersistedState(isEditing ? null : 'compra_proveedorSearch', '');
    const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
    const [contacto, setContacto] = usePersistedState(isEditing ? null : 'compra_contacto', '');
    const [numeroFactura, setNumeroFactura] = usePersistedState(isEditing ? null : 'compra_numeroFactura', '');

    // Nuevo proveedor modal
    const [showNewProveedor, setShowNewProveedor] = useState(false);
    const [newProveedor, setNewProveedor] = useState({ nombre: '', nit: '', telefono: '', email: '', direccion: '' });

    // Global Totals and Observations
    const [observaciones, setObservaciones] = usePersistedState(isEditing ? null : 'compra_observaciones', '');
    const [metodoPago, setMetodoPago] = usePersistedState(isEditing ? null : 'compra_metodoPago', 'credito');
    const [fechaVencimiento, setFechaVencimiento] = usePersistedState(isEditing ? null : 'compra_fechaVencimiento', '');
    const [multiplePayments, setMultiplePayments] = usePersistedState(isEditing ? null : 'compra_multiPayments', [{ id: Date.now(), metodo: 'efectivo', monto: 0, cuentaId: '' }]);

    // Dependencies
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [ubicaciones, setUbicaciones] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [cuentaId, setCuentaId] = usePersistedState(isEditing ? null : 'compra_cuentaId', '');
    const [isCajaOpen, setIsCajaOpen] = useState(true);

    // Quick product creation modal
    const [showQuickProduct, setShowQuickProduct] = useState(false);
    const [quickProductRow, setQuickProductRow] = useState(null);
    const [quickProduct, setQuickProduct] = useState({ nombre: '', codigo: '', costo: '', precio: '' });

    useEffect(() => {
        // Fetch Proveedores
        api.get('/proveedores')
            .then(res => res.data)
            .then(data => setProveedores(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching proveedores:', err));

        // Fetch Productos
        api.get('/productos')
            .then(res => res.data)
            .then(data => setProductos(Array.isArray(data) ? data : []))
            .catch(console.error);

        // Fetch Ubicaciones (Bodegas)
        api.get('/ubicaciones')
            .then(res => res.data)
            .then(data => setUbicaciones(data))
            .catch(console.error);

        // Fetch Cuentas Financieras
        api.get('/cuentas-financieras')
            .then(res => res.data)
            .then(async data => {
                const cuentasArray = Array.isArray(data) ? data : [];
                setCuentas(cuentasArray);

                // Check if caja is open
                const defaultCaja = cuentasArray.find(c => c.tipo === 'caja');
                if (defaultCaja) {
                    const cierreRes = await api.get(`/cierres/hoy?cuentaId=${defaultCaja.id}`).catch(() => null);
                    if (cierreRes && cierreRes.data) {
                        setIsCajaOpen(!!cierreRes.data.activo);
                    } else {
                        setIsCajaOpen(false);
                    }
                }
            })
            .catch(console.error);
    }, []);

    // Load existing purchase data when editing
    useEffect(() => {
        if (!editId) return;
        api.get(`/compras/${editId}`)
            .then(res => res.data)
            .then(compra => {
                setTipoDocumento(compra.tipoDocumento || 'FC - Factura de compra');
                setFechaElaboracion(compra.fechaElaboracion ? new Date(compra.fechaElaboracion).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                setProveedorId(compra.proveedorId || '');
                setProveedorSearch(compra.proveedor?.nombre || '');
                setContacto(compra.contacto || '');
                setNumeroFactura(compra.numeroFactura || '');
                setObservaciones(compra.observaciones || '');
                if (compra.items && compra.items.length > 0) {
                    setItems(compra.items.map(item => {
                        const numCant = parseFloat(item.cantidad) || 0;
                        const numPrecio = parseFloat(item.precioUnit) || 0;
                        const numDesc = parseFloat(item.descuento) || 0;
                        const subtotalLinea = numCant * numPrecio - numDesc;
                        return {
                            id: item.id,
                            tipoItem: item.tipoItem || 'Producto',
                            productoId: item.productoId || '',
                            productoSearch: item.producto?.nombre || item.nombre || '',
                            showProductoDropdown: false,
                            descripcion: item.nombre || '',
                            ubicacionId: item.ubicacionId || '',
                            cantidad: item.cantidad,
                            precioUnit: item.precioUnit,
                            descuento: item.descuento || 0,
                            valor: subtotalLinea
                        };
                    }));
                }
            })
            .catch(err => {
                console.error('Error loading compra:', err);
                alert('Error al cargar la compra');
                navigate('/compras');
            });
    }, [editId]);

    // Line items state
    const emptyRow = {
        id: Date.now(),
        tipoItem: 'Producto',
        productoId: '',
        productoSearch: '',
        showProductoDropdown: false,
        descripcion: '',
        ubicacionId: '',
        cantidad: 1,
        precioUnit: 0,
        descuento: 0,
        valor: 0
    };

    const [items, setItems] = usePersistedState(isEditing ? null : 'compra_items', [{ ...emptyRow }]);

    const addRow = () => {
        setItems([...items, { ...emptyRow, id: Date.now() }]);
    };

    const removeRow = (id) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Clear productoId when searching
                if (field === 'productoSearch') {
                    updated.productoId = '';
                }

                // Auto-fill description if product is selected
                if (field === 'productoId' && updated.tipoItem === 'Producto' && value) {
                    const prod = productos.find(p => p.id === parseInt(value));
                    if (prod) {
                        updated.descripcion = prod.nombre;
                        updated.precioUnit = prod.costo || 0;
                        updated.productoSearch = prod.nombre;
                    }
                }

                // Math logic according to requirement
                const numCant = parseFloat(updated.cantidad) || 0;
                const numPrecio = parseFloat(updated.precioUnit) || 0;
                const numDesc = parseFloat(updated.descuento) || 0;

                let subtotalLinea = numCant * numPrecio;

                // Aplicar descuento como valor fijo
                subtotalLinea = subtotalLinea - numDesc;
                updated.valor = subtotalLinea;

                return updated;
            }
            return item;
        }));
    };

    // Calculate totals
    const totales = items.reduce((acc, item) => {
        const numCant = parseFloat(item.cantidad) || 0;
        const numPrecio = parseFloat(item.precioUnit) || 0;
        const subtotalBase = numCant * numPrecio;

        const neto = parseFloat(item.valor) || 0;
        let descCalculado = parseFloat(item.descuento) || 0;

        acc.bruto += subtotalBase;
        acc.descuentos += descCalculado;
        acc.neto += neto;

        return acc;
    }, { bruto: 0, descuentos: 0, neto: 0 });

    const subtotalCalc = totales.bruto - totales.descuentos;

    const [guardando, setGuardando] = useState(false);

    const handleCreateProveedor = async () => {
        if (!newProveedor.nombre || !newProveedor.nit) {
            return alert('Por favor complete el nombre y NIT');
        }
        try {
            const res = await api.post('/proveedores', newProveedor);
            if (res.data) {
                setProveedores(prev => [...prev, res.data]);
                setProveedorId(res.data.id);
                setProveedorSearch(res.data.nombre);
                setShowNewProveedor(false);
                setNewProveedor({ nombre: '', nit: '', telefono: '', email: '', direccion: '' });
            }
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al crear proveedor');
        }
    };

    const handleQuickProductSave = async () => {
        if (!quickProduct.nombre || !quickProduct.codigo) {
            return alert('Nombre y código son requeridos');
        }
        try {
            const res = await api.post('/productos', {
                nombre: quickProduct.nombre,
                codigo: quickProduct.codigo,
                costo: parseInt(quickProduct.costo) || 0,
                precio: parseInt(quickProduct.precio) || 0,
                stockMinimo: 5
            });
            if (res.data) {
                setProductos(prev => [...prev, res.data]);
                if (quickProductRow) {
                    handleItemChange(quickProductRow, 'productoId', res.data.id);
                    handleItemChange(quickProductRow, 'showProductoDropdown', false);
                }
                setShowQuickProduct(false);
                setQuickProduct({ nombre: '', codigo: '', costo: '', precio: '' });
            }
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al crear producto');
        }
    };

    const handleGuardar = async () => {
        if (!proveedorId) return alert('Por favor selecciona un proveedor.');

        // Validar que todos los items tengan producto seleccionado
        const itemsSinProducto = items.filter(i => !i.productoId);
        if (itemsSinProducto.length > 0) {
            return alert('Todos los ítems deben tener un producto seleccionado. Elimine las filas vacías o seleccione un producto.');
        }

        if (metodoPago === 'multiple') {
            const sum = multiplePayments.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
            if (sum !== totales.neto) {
                alert(`La suma de los pagos múltiples (${formatPesos(sum)}) no coincide con el total neto (${formatPesos(totales.neto)})`);
                return;
            }
            let hasCreditInMultiple = false;
            for (const p of multiplePayments) {
                if ((p.metodo === 'efectivo' || p.metodo === 'banco') && !p.cuentaId) {
                    alert('Debe seleccionar una cuenta para cada pago en efectivo o banco');
                    return;
                }
                if ((parseFloat(p.monto) || 0) <= 0) {
                    alert('Todos los pagos múltiples deben tener un monto mayor a 0');
                    return;
                }
                if (p.metodo === 'credito') hasCreditInMultiple = true;
            }
            if (hasCreditInMultiple && !fechaVencimiento) {
                return alert('Por favor selecciona una fecha de vencimiento para la parte a crédito.');
            }
        } else if (metodoPago === 'credito' && !fechaVencimiento) {
            return alert('Por favor selecciona una fecha de vencimiento del crédito.');
        } else if (metodoPago !== 'credito' && !cuentaId) {
            return alert('Por favor selecciona una cuenta de origen.');
        }

        setGuardando(true);
        try {
            const payload = {
                tipoDocumento,
                fechaElaboracion,
                proveedorId,
                contacto,
                numeroFactura,
                observaciones,
                metodoPago: metodoPago === 'banco' ? 'transferencia' : metodoPago,
                fechaVencimiento: (metodoPago === 'credito' || (metodoPago === 'multiple' && multiplePayments.some(p => p.metodo === 'credito'))) ? fechaVencimiento : null,
                cuentaId: (metodoPago !== 'credito' && metodoPago !== 'multiple') && cuentaId ? parseInt(cuentaId) : undefined,
                pagos: metodoPago === 'multiple' ? multiplePayments.map(p => ({
                    metodo: p.metodo,
                    monto: parseFloat(p.monto) || 0,
                    cuentaId: (p.metodo !== 'credito' && p.cuentaId) ? parseInt(p.cuentaId) : undefined
                })) : undefined,
                subtotal: subtotalCalc,
                descuentoGlobal: totales.descuentos,
                iva: 0,
                reteIca: 0, // Placeholder
                reteIva: 0, // Placeholder
                total: totales.neto,
                items: items.map(i => ({
                    ...i,
                    codigo: i.tipoItem === 'Producto' ? (productos.find(p => p.id === parseInt(i.productoId))?.codigo || 'N/A') : 'N/A',
                    nombre: i.tipoItem === 'Producto' ? (i.descripcion || 'Sin descripción') : (i.productoSearch || i.descripcion || 'Sin descripción')
                }))
            };

            if (isEditing) {
                await api.put(`/compras/${editId}`, payload);
            } else {
                await api.post('/compras', payload);
                clearPersistedModule('compra');
            }
            navigate('/compras');
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión o servidor');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div id="nueva-compra-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
            {/* Header / Actions */}
            <div id="nueva-compra-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/compras')} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F3F4F6', color: '#4B5563', transition: 'background 0.2s' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#3B82F6' }}>{isEditing ? 'Editar orden de compra' : 'Nueva orden de compra'}</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={() => navigate('/compras')}>Cancelar</Button>
                    <Button
                        onClick={handleGuardar}
                        disabled={guardando || (!isCajaOpen && (metodoPago === 'efectivo' || (metodoPago === 'multiple' && multiplePayments.some(p => p.metodo === 'efectivo'))))}
                    >
                        {guardando ? 'Guardando...' : (!isCajaOpen && (metodoPago === 'efectivo' || (metodoPago === 'multiple' && multiplePayments.some(p => p.metodo === 'efectivo'))) ? 'Caja Cerrada' : (isEditing ? 'Actualizar compra' : 'Guardar'))}
                    </Button>
                </div>
            </div>

            {/* Formulario Principal Blanco */}
            <div id="nueva-compra-form-bg" style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>

                {/* Cabecera del Documento */}
                <div id="nueva-compra-doc-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Tipo</label>
                            <Select value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} options={[
                                { value: 'FC - Factura de compra', label: 'FC - Factura de compra' }
                            ]} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Fecha elaboración</label>
                            <Input type="date" value={fechaElaboracion} onChange={e => setFechaElaboracion(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Proveedor</label>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar proveedor..."
                                        value={proveedorId ? proveedores.find(p => p.id === proveedorId)?.nombre || proveedorSearch : proveedorSearch}
                                        onChange={e => {
                                            setProveedorSearch(e.target.value);
                                            setProveedorId('');
                                            setShowProveedorDropdown(true);
                                        }}
                                        onFocus={() => setShowProveedorDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowProveedorDropdown(false), 200)}
                                        style={{ width: '100%', padding: '8px 32px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                                    />
                                    {proveedorId && (
                                        <button onClick={() => { setProveedorId(''); setProveedorSearch(''); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                {showProveedorDropdown && proveedores.filter(p => !proveedorSearch || (p.nombre || p.name || '').toLowerCase().includes(proveedorSearch.toLowerCase())).length > 0 && !proveedorId && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                        {proveedores.filter(p => !proveedorSearch || (p.nombre || p.name || '').toLowerCase().includes(proveedorSearch.toLowerCase())).map(p => (
                                            <div key={p.id} onClick={() => { setProveedorId(p.id); setProveedorSearch(p.nombre || p.name || ''); setShowProveedorDropdown(false); }} style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #F3F4F6' }} onMouseOver={e => e.target.style.backgroundColor = '#F3F4F6'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>
                                                {p.nombre || p.name || 'Sin nombre'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowNewProveedor(true)}
                                title="Crear nuevo proveedor"
                                style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '6px',
                                    border: '1px solid #D1D5DB',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    color: '#4F46E5',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EEF2FF'; e.currentTarget.style.borderColor = '#4F46E5'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                            >
                                <Plus size={16} />
                            </button>
                            </div>
                        </div>

                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Número / Ref</label>
                            <Input placeholder="Numeración estandar o manual" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Método de Pago</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                    { value: 'efectivo', label: 'Efectivo', icon: Wallet },
                                    { value: 'banco', label: 'Banco', icon: Building },
                                    { value: 'credito', label: 'Crédito', icon: ClipboardList },
                                    { value: 'multiple', label: 'Múltiple', icon: Layers }
                                ].map(m => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => { setMetodoPago(m.value); if (m.value === 'credito') setCuentaId(''); }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 6px',
                                            borderRadius: '6px',
                                            border: metodoPago === m.value ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                            backgroundColor: metodoPago === m.value ? '#EFF6FF' : '#fff',
                                            color: metodoPago === m.value ? '#1D4ED8' : '#4B5563',
                                            fontSize: '11px',
                                            fontWeight: metodoPago === m.value ? 600 : 400,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '2px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <m.icon size={16} />
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {metodoPago === 'multiple' && (
                            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', gridColumn: '1 / -1', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>Pagos Múltiples</span>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: multiplePayments.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0) === totales.neto ? '#10B981' : '#EF4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                        Total cubierto: {formatPesos(multiplePayments.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0))} / {formatPesos(totales.neto)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', minWidth: 0 }}>
                                    {multiplePayments.map((pago, index) => (
                                        <div key={pago.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                            <select
                                                value={pago.metodo}
                                                onChange={(e) => {
                                                    const newMetodo = e.target.value;
                                                    const targetCuenta = cuentas.find(c => newMetodo === 'efectivo' ? c.tipo === 'caja' : c.tipo === 'banco');
                                                    setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, metodo: newMetodo, cuentaId: targetCuenta ? targetCuenta.id : '' } : p));
                                                }}
                                                style={{ flex: '1 1 0px', minWidth: 0, padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                                            >
                                                <option value="efectivo">Efectivo</option>
                                                <option value="banco">Banco / Transferencia</option>
                                                <option value="credito">Cuenta por Pagar (Crédito)</option>
                                            </select>

                                            {(pago.metodo === 'efectivo' || pago.metodo === 'banco') && (
                                                <select
                                                    value={pago.cuentaId}
                                                    onChange={(e) => setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, cuentaId: e.target.value } : p))}
                                                    style={{ flex: '2 1 0px', minWidth: 0, padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                                                >
                                                    <option value="">Seleccionar cuenta...</option>
                                                    {cuentas.filter(c => pago.metodo === 'efectivo' ? c.tipo === 'caja' : c.tipo === 'banco').map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre} — {formatPesos(c.saldoActual)}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {pago.metodo === 'credito' && (
                                                <div style={{ flex: '2 1 0px', minWidth: 0, padding: '8px', fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                                                    Cuenta por pagar al proveedor
                                                </div>
                                            )}

                                            <input
                                                type="number"
                                                value={pago.monto}
                                                onChange={(e) => setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, monto: e.target.value } : p))}
                                                placeholder="Monto"
                                                style={{ flex: '1 1 0px', minWidth: 0, padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                                            />

                                            <button
                                                onClick={() => setMultiplePayments(prev => prev.filter((_, i) => i !== index))}
                                                style={{ padding: '8px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', opacity: multiplePayments.length > 1 ? 1 : 0.5 }}
                                                disabled={multiplePayments.length === 1}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        const defaultCaja = cuentas.find(c => c.tipo === 'caja');
                                        setMultiplePayments(prev => [...prev, { id: Date.now(), metodo: 'efectivo', monto: 0, cuentaId: defaultCaja ? defaultCaja.id : '' }]);
                                    }}
                                    style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#4F46E5', backgroundColor: '#EEF2FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    <Plus size={14} /> Agregar línea de pago
                                </button>
                            </div>
                        )}
                        {(metodoPago === 'efectivo' || metodoPago === 'banco') && (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Cuenta de origen</label>
                                <select
                                    value={cuentaId}
                                    onChange={e => setCuentaId(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                                >
                                    <option value="">Seleccionar cuenta...</option>
                                    {cuentas.filter(c => metodoPago === 'efectivo' ? c.tipo === 'caja' : c.tipo === 'banco').map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre} — {formatPesos(c.saldoActual)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {(metodoPago === 'credito' || (metodoPago === 'multiple' && multiplePayments.some(p => p.metodo === 'credito'))) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>Fecha Vencimiento</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {[30, 60, 90].map(days => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => {
                                                    const date = new Date(fechaElaboracion || new Date());
                                                    date.setDate(date.getDate() + days);
                                                    setFechaVencimiento(date.toISOString().split('T')[0]);
                                                }}
                                                style={{
                                                    flex: 1, padding: '4px', fontSize: '11px',
                                                    backgroundColor: '#F3F4F6', color: '#374151',
                                                    border: '1px solid #D1D5DB', borderRadius: '4px',
                                                    cursor: 'pointer', fontWeight: 600
                                                }}
                                            >
                                                +{days} días
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid Detalle Ítems */}
                <div id="nueva-compra-table-container" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px', paddingBottom: '150px', overflowX: 'auto' }}>
                    <table style={{ minWidth: '1200px', width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#1F2937', fontWeight: 600 }}>
                                <th style={{ padding: '8px', textAlign: 'left', width: '40px' }}>#</th>
                                <th style={{ padding: '8px', textAlign: 'left', minWidth: '200px' }}>Ítem</th>
                                <th style={{ padding: '8px', textAlign: 'left', minWidth: '150px' }}>Descripción</th>
                                <th style={{ padding: '8px', textAlign: 'left', minWidth: '120px' }}>Bodegas</th>
                                <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>Cant.</th>
                                <th style={{ padding: '8px', textAlign: 'right', minWidth: '120px' }}>Vr.Unitario</th>
                                <th style={{ padding: '8px', textAlign: 'right', width: '100px' }}>Descuento</th>
                                <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>Precio Ponderado</th>
                                <th style={{ padding: '8px', textAlign: 'right', minWidth: '140px' }}>Valor</th>
                                <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '8px', color: '#6B7280' }}>{index + 1}</td>
                                    <td style={{ padding: '4px', position: 'relative' }}>
                                        {item.tipoItem === 'Producto' ? (
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar producto..."
                                                    value={item.productoId ? productos.find(p => p.id === parseInt(item.productoId))?.nombre || item.productoSearch : item.productoSearch || ''}
                                                    onChange={e => handleItemChange(item.id, 'productoSearch', e.target.value)}
                                                    onFocus={() => handleItemChange(item.id, 'showProductoDropdown', true)}
                                                    onBlur={() => setTimeout(() => handleItemChange(item.id, 'showProductoDropdown', false), 200)}
                                                    style={{ width: '100%', padding: '6px 24px 6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                                                />
                                                {item.productoId && (
                                                    <button onClick={() => { handleItemChange(item.id, 'productoId', ''); handleItemChange(item.id, 'productoSearch', ''); }} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}>
                                                        <X size={12} />
                                                    </button>
                                                )}
                                                {item.showProductoDropdown && productos.filter(p => !item.productoSearch || (p.nombre || '').toLowerCase().includes((item.productoSearch || '').toLowerCase()) || (p.codigo || '').toLowerCase().includes((item.productoSearch || '').toLowerCase())).length > 0 && !item.productoId && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #D1D5DB', borderRadius: '4px', marginTop: '2px', maxHeight: '150px', overflowY: 'auto', zIndex: 30, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                                                        {productos.filter(p => !item.productoSearch || (p.nombre || '').toLowerCase().includes((item.productoSearch || '').toLowerCase()) || (p.codigo || '').toLowerCase().includes((item.productoSearch || '').toLowerCase())).map(p => (
                                                            <div key={p.id} onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent input from losing focus immediately
                                                                handleItemChange(item.id, 'productoId', p.id);
                                                                handleItemChange(item.id, 'showProductoDropdown', false);
                                                            }} style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #F3F4F6', userSelect: 'none' }} onMouseOver={e => e.target.style.backgroundColor = '#F3F4F6'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>
                                                                <div style={{ fontWeight: 600, color: '#111827', pointerEvents: 'none' }}>{p.nombre}</div>
                                                                <div style={{ fontSize: '10px', color: '#6B7280', pointerEvents: 'none' }}>Código: {p.codigo || 'N/A'}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setQuickProductRow(item.id);
                                                        setQuickProduct({ nombre: item.productoSearch || '', codigo: '', costo: '', precio: '' });
                                                        setShowQuickProduct(true);
                                                    }}
                                                    title="Crear producto rápido"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '26px', height: '26px', borderRadius: '4px', flexShrink: 0,
                                                        border: '1px solid #D1D5DB', backgroundColor: '#F9FAFB',
                                                        cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#1E3A5F'
                                                    }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Nombre ítem"
                                                value={item.productoSearch || ''}
                                                onChange={e => handleItemChange(item.id, 'productoSearch', e.target.value)}
                                                style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                                            />
                                        )}
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input type="text" value={item.descripcion} onChange={e => handleItemChange(item.id, 'descripcion', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none' }} />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <select value={item.ubicacionId} onChange={e => handleItemChange(item.id, 'ubicacionId', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none' }}>
                                            <option value="">Destino...</option>
                                            {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input type="number" min="1" value={item.cantidad} onChange={e => handleItemChange(item.id, 'cantidad', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', textAlign: 'right', outline: 'none' }} />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input
                                            type="text"
                                            value={item.precioUnit ? formatPesos(item.precioUnit) : ''}
                                            onChange={e => {
                                                const numericValue = e.target.value.replace(/\D/g, '');
                                                handleItemChange(item.id, 'precioUnit', numericValue ? parseInt(numericValue, 10) : 0);
                                            }}
                                            style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', textAlign: 'right', outline: 'none' }}
                                        />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input type="number" value={item.descuento} onChange={e => handleItemChange(item.id, 'descuento', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', textAlign: 'right', outline: 'none' }} />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        {(() => {
                                            if (item.tipoItem !== 'Producto' || !item.productoId) return null;
                                            const prod = productos.find(p => p.id === parseInt(item.productoId));
                                            if (!prod) return null;

                                            // Compute weighted average price
                                            const stockActual = prod.stockUbicaciones?.reduce((sum, u) => sum + u.stock, 0) || 0;
                                            const costoUnitarioActual = prod.costo || 0;
                                            const cantidadNueva = parseFloat(item.cantidad) || 0;
                                            const costoUnitarioNuevo = parseFloat(item.precioUnit) || 0;

                                            const nuevoStock = stockActual + cantidadNueva;
                                            const nuevoCostoTotal = (stockActual * costoUnitarioActual) + (cantidadNueva * costoUnitarioNuevo);
                                            const precioPonderado = nuevoStock > 0 ? (nuevoCostoTotal / nuevoStock) : costoUnitarioNuevo;

                                            return (
                                                <input type="text" readOnly value={formatPesos(precioPonderado)} style={{ width: '100%', padding: '6px', border: '1px solid transparent', backgroundColor: 'transparent', fontSize: '12px', textAlign: 'right', color: '#6B7280' }} title="Cálculo automático: (Stock Actual × Costo Actual + Nueva Cantidad × Nuevo Costo) / Nuevo Stock" />
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input type="text" readOnly value={item.valor.toLocaleString('es-CO')} style={{ width: '100%', padding: '6px', border: '1px solid transparent', backgroundColor: 'transparent', fontSize: '12px', textAlign: 'right', fontWeight: 600, color: '#111827' }} />
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'center' }}>
                                        <button onClick={() => removeRow(item.id)} style={{ padding: '4px', color: items.length > 1 ? '#EF4444' : '#D1D5DB', background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'default' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '12px 0' }}>
                    <button onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}>
                        <Plus size={14} /> Fila adicional
                    </button>
                </div>

                {/* Footer Totals */}
                <div id="nueva-compra-footer" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginTop: '32px', borderTop: '1px solid #E5E7EB', paddingTop: '24px' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '8px' }}>Observaciones</label>
                        <textarea
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            style={{ width: '100%', height: '120px', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', resize: 'none', fontSize: '13px', outlineColor: '#3B82F6' }}
                            placeholder="Escribe aquí las observaciones del documento..."
                        ></textarea>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ color: '#4B5563' }}>Total bruto</span>
                            <span style={{ fontWeight: 500 }}>{formatPesos(totales.bruto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ color: '#4B5563' }}>Descuentos</span>
                            <span style={{ fontWeight: 500, color: '#EF4444' }}>- {formatPesos(totales.descuentos)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
                            <span style={{ color: '#4B5563' }}>Subtotal</span>
                            <span style={{ fontWeight: 600 }}>{formatPesos(subtotalCalc)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: '8px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Total neto</span>
                            <span style={{ fontWeight: 800, fontSize: '16px', color: '#1E3A5F' }}>{formatPesos(totales.neto)}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Nuevo Proveedor */}
            <Modal isOpen={showNewProveedor} onClose={() => setShowNewProveedor(false)} title="Nuevo Proveedor">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre *</label>
                        <input type="text" value={newProveedor.nombre} onChange={e => setNewProveedor(prev => ({ ...prev, nombre: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="Nombre del proveedor" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>NIT *</label>
                        <input type="text" value={newProveedor.nit} onChange={e => setNewProveedor(prev => ({ ...prev, nit: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="Número de NIT" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                        <input type="text" value={newProveedor.telefono} onChange={e => setNewProveedor(prev => ({ ...prev, telefono: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="Número de teléfono" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                        <input type="email" value={newProveedor.email} onChange={e => setNewProveedor(prev => ({ ...prev, email: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Dirección</label>
                        <input type="text" value={newProveedor.direccion} onChange={e => setNewProveedor(prev => ({ ...prev, direccion: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="Dirección" />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowNewProveedor(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProveedor}>Crear Proveedor</Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Producto Rápido */}
            <Modal isOpen={showQuickProduct} onClose={() => setShowQuickProduct(false)} title="Producto Rápido">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre *</label>
                        <input type="text" value={quickProduct.nombre} onChange={e => setQuickProduct(prev => ({ ...prev, nombre: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="Nombre del producto" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Código *</label>
                        <input type="text" value={quickProduct.codigo} onChange={e => setQuickProduct(prev => ({ ...prev, codigo: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="Código del producto" />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Costo</label>
                            <input type="number" value={quickProduct.costo} onChange={e => setQuickProduct(prev => ({ ...prev, costo: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="0" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Precio Venta</label>
                            <input type="number" value={quickProduct.precio} onChange={e => setQuickProduct(prev => ({ ...prev, precio: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }} placeholder="0" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowQuickProduct(false)}>Cancelar</Button>
                        <Button onClick={handleQuickProductSave}>Crear</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
