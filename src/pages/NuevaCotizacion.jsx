import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, Search, X, Send, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { formatPesos, parseCurrency } from '../utils/currency';
import { usePersistedState, clearPersistedModule } from '../hooks/usePersistedState';
import logoSrc from '../Logo/Logo1.jpg';

import api from '../api/client';

export default function NuevaCotizacion() {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const isEditing = !!editId;

    // Header state
    const [clienteId, setClienteId] = usePersistedState(isEditing ? null : 'cot_clienteId', '');
    const [clienteSearch, setClienteSearch] = usePersistedState(isEditing ? null : 'cot_clienteSearch', '');
    const [showClienteDropdown, setShowClienteDropdown] = useState(false);
    const [validaHasta, setValidaHasta] = usePersistedState(isEditing ? null : 'cot_validaHasta', '');
    const [encabezado, setEncabezado] = usePersistedState(isEditing ? null : 'cot_encabezado', '');
    const [condiciones, setCondiciones] = usePersistedState(isEditing ? null : 'cot_condiciones',
`Para la realización del servicio nos permitimos solicitar el 100% de los materiales y 70% de mano de obra.
Esta cotización NO incluye costos de alquiler de andamios, escaleras, arnés en caso de ser requeridos para trabajos en alturas.
Esta sujeto a verificación de precios, plazo máximo 15 días.`);

    // IVA
    const [ivaTasa, setIvaTasa] = usePersistedState(isEditing ? null : 'cot_ivaTasa', 19);

    // Dependencies
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [config, setConfig] = useState({});

    // Combined catalog: productos + servicios
    const catalogoItems = [
        ...productos.map(p => ({ ...p, tipo: 'producto' })),
        ...servicios.map(s => ({ ...s, tipo: 'servicio' }))
    ];

    // New client modal
    const [showNewClient, setShowNewClient] = useState(false);
    const [newClient, setNewClient] = useState({ nombre: '', documento: '', telefono: '', email: '', direccion: '' });

    const handleCreateClient = async () => {
        if (!newClient.nombre || !newClient.documento) {
            return alert('Por favor complete el nombre y documento');
        }
        try {
            const response = await api.post('/clientes', newClient);
            const created = response.data;
            setClientes(prev => [...prev, created]);
            setClienteId(created.id);
            setClienteSearch(created.nombre);
            if (created.telefono) { const t = created.telefono.replace(/\D/g, ''); setWaPhone(t.startsWith('57') ? t : '57' + t); }
            setShowNewClient(false);
            setNewClient({ nombre: '', documento: '', telefono: '', email: '', direccion: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Error al crear cliente');
        }
    };

    // PDF/WhatsApp state
    const [showPreview, setShowPreview] = useState(false);
    const [waPhone, setWaPhone] = useState('57');
    const [waSending, setWaSending] = useState(false);
    const [waConnected, setWaConnected] = useState(false);

    useEffect(() => {
        api.get('/clientes').then(r => setClientes(Array.isArray(r.data) ? r.data : [])).catch(console.error);
        api.get('/productos').then(r => setProductos(Array.isArray(r.data) ? r.data : [])).catch(console.error);
        api.get('/servicios').then(r => setServicios(Array.isArray(r.data) ? r.data : [])).catch(console.error);
        api.get('/configuracion').then(r => { if (r.data) setConfig(r.data); }).catch(() => {});
        api.get('/whatsapp/status').then(r => setWaConnected(r.data?.status === 'CONNECTED')).catch(() => {});
    }, []);

    // Load existing cotizacion when editing
    useEffect(() => {
        if (!editId) return;
        api.get(`/cotizaciones/${editId}`)
            .then(r => r.data)
            .then(cot => {
                setClienteId(cot.clienteId || '');
                setClienteSearch(cot.cliente?.nombre || '');
                setEncabezado(cot.encabezado || '');
                setCondiciones(cot.condiciones || `Para la realización del servicio nos permitimos solicitar el 100% de los materiales y 70% de mano de obra.
Esta cotización NO incluye costos de alquiler de andamios, escaleras, arnés en caso de ser requeridos para trabajos en alturas.
Esta sujeto a verificación de precios, plazo máximo 15 días.`);
                setIvaTasa(cot.ivaTasa ?? 19);
                setValidaHasta(cot.validaHasta || '');
                if (cot.items && cot.items.length > 0) {
                    setItems(cot.items.map(item => ({
                        id: item.id,
                        productoId: item.productoId || '',
                        servicioId: item.servicioId || '',
                        tipo: item.servicioId ? 'servicio' : 'producto',
                        productoSearch: item.producto?.nombre || item.servicio?.nombre || item.nombre || '',
                        showProductoDropdown: false,
                        descripcion: item.descripcion || item.nombre || '',
                        cantidad: item.cantidad,
                        precioUnit: item.precioUnit,
                        descuento: item.descuento || 0,
                        valor: (item.cantidad * item.precioUnit) - (item.descuento || 0)
                    })));
                }
                // Pre-fill phone from client
                if (cot.cliente?.telefono) { const t = cot.cliente.telefono.replace(/\D/g, ''); setWaPhone(t.startsWith('57') ? t : '57' + t); }
            })
            .catch(() => { alert('Error al cargar la cotización'); navigate('/cotizaciones'); });
    }, [editId]);

    // Line items
    const emptyRow = {
        id: Date.now(),
        productoId: '',
        servicioId: '',
        tipo: '',
        productoSearch: '',
        showProductoDropdown: false,
        descripcion: '',
        cantidad: 1,
        precioUnit: 0,
        descuento: 0,
        valor: 0
    };

    const [items, setItems] = usePersistedState(isEditing ? null : 'cot_items', [{ ...emptyRow }]);

    const addRow = () => setItems([...items, { ...emptyRow, id: Date.now() }]);

    const removeRow = (id) => {
        if (items.length === 1) {
            setItems([{ ...emptyRow, id: Date.now() }]);
            return;
        }
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };

            if (field === 'productoSearch') { updated.productoId = ''; updated.servicioId = ''; updated.tipo = ''; }

            if (field === 'catalogoSelect' && value) {
                const cat = catalogoItems.find(c => `${c.tipo}-${c.id}` === value);
                if (cat) {
                    updated.descripcion = cat.nombre;
                    updated.precioUnit = cat.precio || 0;
                    updated.productoSearch = cat.nombre;
                    updated.showProductoDropdown = false;
                    updated.tipo = cat.tipo;
                    if (cat.tipo === 'producto') { updated.productoId = cat.id; updated.servicioId = ''; }
                    else { updated.servicioId = cat.id; updated.productoId = ''; }
                }
            }

            const numCant = parseFloat(updated.cantidad) || 0;
            const numPrecio = parseFloat(updated.precioUnit) || 0;
            const numDesc = parseFloat(updated.descuento) || 0;
            updated.valor = numCant * numPrecio - numDesc;

            return updated;
        }));
    };

    // Totals (same IVA logic as POS: prices include IVA, we extract it)
    const totalesBruto = items.reduce((acc, item) => {
        const numCant = parseFloat(item.cantidad) || 0;
        const numPrecio = parseFloat(item.precioUnit) || 0;
        acc.bruto += numCant * numPrecio;
        acc.descuentos += parseFloat(item.descuento) || 0;
        acc.neto += parseFloat(item.valor) || 0;
        return acc;
    }, { bruto: 0, descuentos: 0, neto: 0 });

    const netoConDescuento = totalesBruto.neto;
    const subtotalSinIva = Math.round(netoConDescuento / (1 + (ivaTasa / 100)));
    const ivaValor = netoConDescuento - subtotalSinIva;

    const totales = {
        bruto: totalesBruto.bruto,
        descuentos: totalesBruto.descuentos,
        subtotal: subtotalSinIva,
        iva: ivaValor,
        neto: netoConDescuento
    };

    const [guardando, setGuardando] = useState(false);

    const handleGuardar = async () => {
        if (!clienteId) {
            return alert('Debe seleccionar un cliente');
        }
        if (!validaHasta) {
            return alert('Debe indicar la fecha de validez');
        }
        if (items.length === 0 || !items.some(i => i.productoId || i.servicioId)) {
            return alert('Debe agregar al menos un producto o servicio');
        }
        setGuardando(true);
        try {
            const payload = {
                clienteId: clienteId || null,
                encabezado,
                condiciones,
                validaHasta: validaHasta || null,
                subtotal: Math.round(totales.subtotal),
                descuentoTotal: Math.round(totales.descuentos),
                iva: Math.round(totales.iva),
                ivaTasa: ivaTasa,
                total: Math.round(totales.neto),
                items: items.filter(i => i.productoId || i.servicioId).map(i => {
                    const catItem = catalogoItems.find(c =>
                        (i.productoId && c.tipo === 'producto' && c.id === parseInt(i.productoId)) ||
                        (i.servicioId && c.tipo === 'servicio' && c.id === parseInt(i.servicioId))
                    );
                    return {
                        productoId: i.productoId ? parseInt(i.productoId) : null,
                        servicioId: i.servicioId ? parseInt(i.servicioId) : null,
                        nombre: i.descripcion || i.productoSearch,
                        codigo: catItem?.codigo || null,
                        descripcion: i.descripcion,
                        cantidad: parseInt(i.cantidad) || 1,
                        precioUnit: Math.round(parseFloat(i.precioUnit) || 0),
                        descuento: Math.round(parseFloat(i.descuento) || 0),
                        subtotal: Math.round(parseFloat(i.valor) || 0)
                    };
                })
            };

            if (isEditing) {
                await api.put(`/cotizaciones/${editId}`, payload);
                alert('Cotización actualizada');
            } else {
                const res = await api.post('/cotizaciones', payload);
                clearPersistedModule('cot');
                // Redirigir a editar para mostrar botón PDF/WhatsApp
                navigate(`/editar-cotizacion/${res.data.id}`, { replace: true });
                return;
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar cotización');
        } finally {
            setGuardando(false);
        }
    };

    // PDF generation
    const handleDownloadPDF = async () => {
        const element = document.getElementById('cotizacion-pdf-content');
        if (!element) return;
        const { default: html2pdf } = await import('html2pdf.js');
        html2pdf().set({
            margin: 10,
            filename: `Cotizacion_${isEditing ? editId : 'nueva'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        }).from(element).save();
    };

    // WhatsApp send
    const handleSendWhatsApp = async () => {
        const cleanPhone = waPhone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 7) {
            return alert('Ingrese un número válido (ej: 573001234567)');
        }
        setWaSending(true);
        try {
            const element = document.getElementById('cotizacion-pdf-content');
            if (!element) { setWaSending(false); return alert('Error: vista previa no disponible'); }

            const { default: html2pdf } = await import('html2pdf.js');
            const pdfBlob = await html2pdf().set({
                margin: 10,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
            }).from(element).outputPdf('blob');

            const pdfBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(pdfBlob);
            });

            await api.post('/whatsapp/enviar-recibo', {
                numero: cleanPhone,
                pdfBase64,
                filename: `Cotizacion_${isEditing ? editId : 'nueva'}.pdf`,
                tipo: 'cotizacion',
                recibo: { receiptNumber: `COT-${editId || 'nueva'}`, total: totales.neto, ivaTasa }
            });

            alert('Cotización enviada por WhatsApp');
        } catch (err) {
            alert(err.response?.data?.error || 'Error al enviar');
        }
        setWaSending(false);
    };

    const selectedCliente = clientes.find(c => c.id === parseInt(clienteId));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate('/cotizaciones')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <ArrowLeft size={20} color="#6B7280" />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>
                            {isEditing ? 'Editar Cotización' : 'Nueva Cotización'}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                            {new Date().toLocaleDateString('es-CO')}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isEditing && (
                        <Button variant="secondary" onClick={() => setShowPreview(true)}>
                            <Download size={14} style={{ marginRight: '6px' }} />PDF / WhatsApp
                        </Button>
                    )}
                    <Button onClick={handleGuardar} disabled={guardando}>
                        <Check size={14} style={{ marginRight: '6px' }} />
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </div>

            {/* Form Header */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Cliente */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Cliente <span style={{ color: '#EF4444' }}>*</span></label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={clienteId ? (clientes.find(c => c.id === parseInt(clienteId))?.nombre || clienteSearch) : clienteSearch}
                                    onChange={e => { setClienteSearch(e.target.value); setClienteId(''); setShowClienteDropdown(e.target.value.length >= 2); }}
                                    onFocus={() => { if (clienteSearch.length >= 2) setShowClienteDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                                    style={{ width: '100%', padding: '10px 30px 10px 32px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            {clienteId && (
                                <button onClick={() => { setClienteId(''); setClienteSearch(''); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                    <X size={14} />
                                </button>
                            )}
                            {showClienteDropdown && !clienteId && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', marginTop: '2px', maxHeight: '200px', overflowY: 'auto', zIndex: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                                    {clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || (c.documento || '').includes(clienteSearch)).map(c => (
                                        <div key={c.id} onMouseDown={e => { e.preventDefault(); setClienteId(c.id); setClienteSearch(c.nombre); setShowClienteDropdown(false); if (c.telefono) { const t = c.telefono.replace(/\D/g, ''); setWaPhone(t.startsWith('57') ? t : '57' + t); } }}
                                            style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #F3F4F6' }}
                                            onMouseOver={e => e.target.style.backgroundColor = '#F3F4F6'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>
                                            <div style={{ fontWeight: 600, pointerEvents: 'none' }}>{c.nombre}</div>
                                            <div style={{ fontSize: '11px', color: '#6B7280', pointerEvents: 'none' }}>{c.documento} {c.telefono ? `• ${c.telefono}` : ''}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </div>
                            <button
                                onClick={() => setShowNewClient(true)}
                                title="Nuevo Cliente"
                                style={{ padding: '0 12px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                    {/* Válida hasta */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Válida hasta <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                            type="date"
                            value={validaHasta}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setValidaHasta(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
            </div>

            {/* Encabezado */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Encabezado</label>
                <textarea
                    value={encabezado}
                    onChange={e => setEncabezado(e.target.value)}
                    placeholder="Texto de presentación para la cotización..."
                    rows={4}
                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
            </div>

            {/* Items Table */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#1F2937', fontWeight: 600 }}>
                            <th style={{ padding: '8px', textAlign: 'left', width: '40px' }}>#</th>
                            <th style={{ padding: '8px', textAlign: 'left', minWidth: '220px' }}>Ítem</th>
                            <th style={{ padding: '8px', textAlign: 'left', minWidth: '150px' }}>Descripción</th>
                            <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>Cant.</th>
                            <th style={{ padding: '8px', textAlign: 'right', minWidth: '130px' }}>Vr.Unitario</th>
                            <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>Descuento</th>
                            <th style={{ padding: '8px', textAlign: 'right', minWidth: '130px' }}>Valor</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px', color: '#6B7280' }}>{index + 1}</td>
                                <td style={{ padding: '4px', position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Buscar producto o servicio..."
                                            value={(item.productoId || item.servicioId) ? item.productoSearch : (item.productoSearch || '')}
                                            onChange={e => handleItemChange(item.id, 'productoSearch', e.target.value)}
                                            onClick={() => handleItemChange(item.id, 'showProductoDropdown', true)}
                                            onBlur={() => setTimeout(() => handleItemChange(item.id, 'showProductoDropdown', false), 200)}
                                            style={{ width: '100%', padding: '6px 24px 6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        {(item.productoId || item.servicioId) && (
                                            <button onClick={() => { handleItemChange(item.id, 'productoSearch', ''); }}
                                                style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}>
                                                <X size={12} />
                                            </button>
                                        )}
                                        {item.showProductoDropdown && !item.productoId && !item.servicioId && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #D1D5DB', borderRadius: '4px', marginTop: '2px', maxHeight: '200px', overflowY: 'auto', zIndex: 30, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                                                {catalogoItems.filter(c => !item.productoSearch || c.nombre.toLowerCase().includes((item.productoSearch || '').toLowerCase()) || (c.codigo || '').toLowerCase().includes((item.productoSearch || '').toLowerCase())).map(c => (
                                                    <div key={`${c.tipo}-${c.id}`} onMouseDown={e => { e.preventDefault(); handleItemChange(item.id, 'catalogoSelect', `${c.tipo}-${c.id}`); }}
                                                        style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #F3F4F6' }}
                                                        onMouseOver={e => e.target.style.backgroundColor = '#F3F4F6'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>
                                                        <div style={{ fontWeight: 600, color: '#111827', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {c.nombre}
                                                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, backgroundColor: c.tipo === 'servicio' ? '#DBEAFE' : '#F3F4F6', color: c.tipo === 'servicio' ? '#1D4ED8' : '#6B7280' }}>
                                                                {c.tipo === 'servicio' ? 'SERVICIO' : 'PRODUCTO'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#6B7280', pointerEvents: 'none' }}>Código: {c.codigo || 'N/A'} • {formatPesos(c.precio)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '4px' }}>
                                    <input type="text" value={item.descripcion} onChange={e => handleItemChange(item.id, 'descripcion', e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '4px' }}>
                                    <input type="number" min="1" value={item.cantidad} onChange={e => handleItemChange(item.id, 'cantidad', e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '4px' }}>
                                    <input type="text" value={item.precioUnit ? formatPesos(item.precioUnit) : ''} onChange={e => { const num = parseCurrency(e.target.value); handleItemChange(item.id, 'precioUnit', num); }}
                                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '4px' }}>
                                    <input type="number" min="0" value={item.descuento || ''} onChange={e => handleItemChange(item.id, 'descuento', e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }} placeholder="0" />
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                                    {formatPesos(item.valor)}
                                </td>
                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                    <button onClick={() => removeRow(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addRow} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Plus size={14} /> Agregar ítem
                </button>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <div style={{ textAlign: 'right', fontSize: '13px', minWidth: '280px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '4px' }}>
                            <span style={{ color: '#6B7280' }}>Total Bruto:</span>
                            <span style={{ fontWeight: 600 }}>{formatPesos(totales.bruto)}</span>
                        </div>
                        {totales.descuentos > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '4px' }}>
                                <span style={{ color: '#6B7280' }}>Descuentos:</span>
                                <span style={{ fontWeight: 600 }}>-{formatPesos(totales.descuentos)}</span>
                            </div>
                        )}
                        {/* IVA Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', marginTop: '4px' }}>
                            <span style={{ color: '#6B7280', fontSize: '13px', fontWeight: 500 }}>IVA:</span>
                            <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '2px', borderRadius: '6px' }}>
                                {[0, 5, 19].map(tasa => (
                                    <button
                                        key={tasa}
                                        onClick={() => setIvaTasa(tasa)}
                                        style={{
                                            padding: '4px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '4px',
                                            border: 'none', cursor: 'pointer',
                                            backgroundColor: ivaTasa === tasa ? '#fff' : 'transparent',
                                            color: ivaTasa === tasa ? '#111827' : '#6B7280',
                                            boxShadow: ivaTasa === tasa ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        {tasa}%
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '4px' }}>
                            <span style={{ color: '#6B7280' }}>Subtotal:</span>
                            <span style={{ fontWeight: 600 }}>{formatPesos(totales.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '4px' }}>
                            <span style={{ color: '#6B7280' }}>IVA ({ivaTasa}%):</span>
                            <span style={{ fontWeight: 600 }}>{formatPesos(totales.iva)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginTop: '8px', paddingTop: '8px', borderTop: '2px solid #1A1A2E' }}>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>Total:</span>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>{formatPesos(totales.neto)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Condiciones Comerciales */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Condiciones Comerciales</label>
                <textarea
                    value={condiciones}
                    onChange={e => setCondiciones(e.target.value)}
                    placeholder="Términos y condiciones de la cotización..."
                    rows={4}
                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
            </div>

            {/* PDF Preview Modal */}
            <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Vista Previa Cotización" size="lg">
                <div>
                    <div id="cotizacion-pdf-content" style={{ padding: '30px', backgroundColor: '#fff', fontFamily: 'Arial, sans-serif', color: '#000', maxWidth: '700px', margin: '0 auto' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #1A1A2E', paddingBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={logoSrc} alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                                <div>
                                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>{(config.nombreEmpresa && config.nombreEmpresa !== 'Mi Empresa') ? config.nombreEmpresa : 'FERRETERIA LA ESQUINA DEL PROGRESO'}</h2>
                                    <p style={{ fontSize: '11px', margin: '2px 0', color: '#444' }}>NIT {config.nit || '19.591.012-2'}</p>
                                    <p style={{ fontSize: '11px', margin: '2px 0', color: '#444' }}>{config.direccion || 'CALLE 9A #10-37'}</p>
                                    <p style={{ fontSize: '11px', margin: '2px 0', color: '#444' }}>{config.telefono || '3014147802'} • {config.email || 'flaesquinadelprogreso@gmail.com'}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1A1A2E' }}>COTIZACIÓN</h3>
                                {isEditing && <p style={{ fontSize: '12px', margin: '4px 0', color: '#444' }}>No. COT-{editId?.toString().padStart(4, '0')}</p>}
                                <p style={{ fontSize: '12px', margin: '4px 0', color: '#444' }}>Fecha: {new Date().toLocaleDateString('es-CO')}</p>
                                {validaHasta && <p style={{ fontSize: '12px', margin: '4px 0', color: '#444' }}>Válida hasta: {new Date(validaHasta + 'T12:00:00').toLocaleDateString('es-CO')}</p>}
                            </div>
                        </div>

                        {/* Client info */}
                        {selectedCliente && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                                <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Cliente:</strong> {selectedCliente.nombre}</p>
                                {selectedCliente.documento && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Documento:</strong> {selectedCliente.documento}</p>}
                                {selectedCliente.telefono && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Teléfono:</strong> {selectedCliente.telefono}</p>}
                                {selectedCliente.email && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {selectedCliente.email}</p>}
                            </div>
                        )}

                        {/* Encabezado text */}
                        {encabezado && (
                            <div style={{ marginBottom: '15px', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                {encabezado}
                            </div>
                        )}

                        {/* Items table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1A1A2E', color: '#fff' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Descripción</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Cant.</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Vr. Unit.</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Desc.</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.filter(i => i.productoId || i.servicioId).map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '8px' }}>{idx + 1}</td>
                                        <td style={{ padding: '8px' }}>{item.descripcion || item.productoSearch}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{item.cantidad}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{formatPesos(item.precioUnit)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{item.descuento > 0 ? formatPesos(item.descuento) : '-'}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatPesos(item.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                            <div style={{ width: '250px' }}>
                                {totales.descuentos > 0 && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                                            <span>Bruto:</span><span>{formatPesos(totales.bruto)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                                            <span>Descuentos:</span><span>-{formatPesos(totales.descuentos)}</span>
                                        </div>
                                    </>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                                    <span>Subtotal:</span><span>{formatPesos(totales.subtotal)}</span>
                                </div>
                                {ivaTasa > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                                        <span>IVA ({ivaTasa}%):</span><span>{formatPesos(totales.iva)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px', fontWeight: 700, borderTop: '2px solid #1A1A2E', marginTop: '4px' }}>
                                    <span>TOTAL:</span><span>{formatPesos(totales.neto)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Condiciones */}
                        {condiciones && (
                            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', fontSize: '12px' }}>
                                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Condiciones Comerciales:</div>
                                {condiciones.split('\n').map((line, i) => (
                                    <div key={i} style={{ lineHeight: '1.6', minHeight: '14px' }}>{line}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button onClick={handleDownloadPDF} style={{ backgroundColor: '#10B981', color: '#fff', borderColor: '#10B981' }}>
                            <Download size={14} style={{ marginRight: '6px' }} />Descargar PDF
                        </Button>
                        {waConnected && (
                            <>
                                <input
                                    type="tel"
                                    value={waPhone}
                                    onChange={e => setWaPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="573001234567"
                                    style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '13px', width: '160px' }}
                                />
                                <Button onClick={handleSendWhatsApp} disabled={waSending || !waPhone.trim()} style={{ backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }}>
                                    <Send size={14} style={{ marginRight: '6px' }} />{waSending ? 'Enviando...' : 'WhatsApp'}
                                </Button>
                            </>
                        )}
                        <Button variant="secondary" onClick={() => setShowPreview(false)}>Cerrar</Button>
                    </div>
                </div>
            </Modal>

            {/* New Client Modal */}
            <Modal isOpen={showNewClient} onClose={() => setShowNewClient(false)} title="Nuevo Cliente">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre *</label>
                        <input type="text" value={newClient.nombre} onChange={e => setNewClient(prev => ({ ...prev, nombre: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="Nombre completo" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Documento *</label>
                        <input type="text" value={newClient.documento} onChange={e => setNewClient(prev => ({ ...prev, documento: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="Número de documento" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                        <input type="text" value={newClient.telefono} onChange={e => setNewClient(prev => ({ ...prev, telefono: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="Número de teléfono" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                        <input type="email" value={newClient.email} onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Dirección</label>
                        <input type="text" value={newClient.direccion} onChange={e => setNewClient(prev => ({ ...prev, direccion: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="Dirección" />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowNewClient(false)}>Cancelar</Button>
                        <Button onClick={handleCreateClient}>Crear Cliente</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
