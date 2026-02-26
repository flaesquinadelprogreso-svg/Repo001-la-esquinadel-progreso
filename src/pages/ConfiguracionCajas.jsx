import React, { useState, useEffect } from 'react';
import { Plus, Edit, ShieldBan, RefreshCw, AlertCircle, Save, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';

import api from '../api/client';

export default function ConfiguracionCajas() {
    const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
    const [cajas, setCajas] = useState([]);
    const [resoluciones, setResoluciones] = useState([]);
    const [ubicaciones, setUbicaciones] = useState([]);
    const [editingCaja, setEditingCaja] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [resUbic, resRes, resCajas] = await Promise.all([
                api.get('/ubicaciones'),
                api.get('/resoluciones'),
                api.get('/cajas')
            ]);

            if (resUbic.ok) setUbicaciones(resUbic.data);
            if (resRes.ok) setResoluciones(resRes.data);
            if (resCajas.ok) {
                const data = resCajas.data;
                // Adaptar data de CuentaFinanciera a la vista de Cajas
                setCajas(data.map(c => ({
                    id: c.id,
                    name: c.nombre,
                    sucursal: 'Principal', // Opcional: Relacionar con ubicaciones si es necesario
                    status: 'cerrado', // Simplificado
                    uso: 'facturar-y-otros'
                })));
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

    // Form State
    const [formData, setFormData] = useState({
        name: '', sucursal: '', clienteDefecto: '', cajeros: [],
        uso: 'facturar-y-otros', resolucion: '', proxNum: '',
        metodosPago: { efectivo: true, tarjetas: true, transferencia: false },
        listasPrecios: { general: true, mayorista: false },
        manejaDescuentos: 'porcentaje',
        permisos: {
            modificarNombre: false, modificarPrecio: false,
            modificarVendedor: false, accederComprobante: true
        }
    });

    const initForm = (caja = null) => {
        if (caja) {
            setFormData({ ...formData, name: caja.name, sucursal: caja.sucursal, uso: caja.uso });
            setEditingCaja(caja.id);
        } else {
            setFormData({
                name: '', sucursal: '', clienteDefecto: '', cajeros: [], uso: 'facturar-y-otros',
                resolucion: '', proxNum: '', metodosPago: { efectivo: true, tarjetas: true, transferencia: false },
                listasPrecios: { general: true, mayorista: false }, manejaDescuentos: 'porcentaje',
                permisos: { modificarNombre: false, modificarPrecio: false, modificarVendedor: false, accederComprobante: true }
            });
            setEditingCaja(null);
        }
        setView('create');
    };

    const handleSave = () => {
        if (!formData.name || !formData.sucursal) return alert('Nombre y Sucursal son obligatorios.');
        if (editingCaja) {
            setCajas(cajas.map(c => c.id === editingCaja ? { ...c, name: formData.name, sucursal: formData.sucursal, uso: formData.uso } : c));
        } else {
            setCajas([...cajas, { id: Date.now(), name: formData.name, sucursal: formData.sucursal, cajeros: ['Nuevo Cajero'], status: 'cerrado', uso: formData.uso }]);
        }
        setView('list');
    };

    const confirmCancel = () => {
        setShowCancelModal(true);
    };

    const proceedCancel = () => {
        setShowCancelModal(false);
        setView('list');
    };

    if (view === 'create' || view === 'edit') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A2E' }}>
                            {editingCaja ? 'Editar Caja' : 'Crear Nueva Caja'}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6B7280' }}>Configura los accesos y numeraciones del punto de venta</p>
                    </div>
                    <button onClick={confirmCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#9CA3AF' }}><X size={20} /></button>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #E2E5EA', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Datos Generales */}
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E', marginBottom: '16px', borderBottom: '1px solid #E2E5EA', paddingBottom: '8px' }}>1. Datos generales de tu caja</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Nombre de la caja *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Caja Principal 01" maxLength={100} />
                            <Select label="Sucursal *" value={formData.sucursal} onChange={e => setFormData({ ...formData, sucursal: e.target.value })} options={[{ value: '', label: 'Seleccione...' }, ...ubicaciones.map(u => ({ value: u.nombre, label: u.nombre }))]} />
                            <Select label="Resolución DIAN *" value={formData.resolucion} onChange={e => setFormData({ ...formData, resolucion: e.target.value })} options={[{ value: '', label: 'Seleccione...' }, ...resoluciones.map(r => ({ value: r.numero, label: `${r.prefijo || ''} - ${r.numero}` }))]} />
                            <Select label="Cliente por defecto" value={formData.clienteDefecto} onChange={e => setFormData({ ...formData, clienteDefecto: e.target.value })} options={[{ value: '', label: 'Consumidor Final (Recomendado)' }, { value: '1', label: 'Juan Pérez' }]} />
                            <Select label="Cajeros asignados *" value={''} onChange={() => { }} options={[{ value: '', label: 'Seleccionar varios...' }, { value: 'carlos', label: 'Carlos Mendoza' }]} />
                        </div>
                        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <AlertCircle size={16} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#991B1B' }}><strong>Importante:</strong> Es necesario asociar usuarios a la caja, caso contrario el sistema generará un error de ingreso.</span>
                        </div>
                    </div>

                    {/* Precios y Descuentos */}
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E', marginBottom: '16px', borderBottom: '1px solid #E2E5EA', paddingBottom: '8px' }}>2. Precios y Descuentos</h3>
                        <div style={{ maxWidth: '400px' }}>
                            <Select label="Maneja Descuentos" value={formData.manejaDescuentos} onChange={e => setFormData({ ...formData, manejaDescuentos: e.target.value })} options={[{ value: 'porcentaje', label: 'Por Porcentaje (%)' }, { value: 'valor', label: 'Por Valor (Monto)' }]} />
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', marginTop: '16px', marginBottom: '8px' }}>Listas de Precio Habilitadas</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><input type="checkbox" checked={formData.listasPrecios.general} onChange={e => setFormData({ ...formData, listasPrecios: { ...formData.listasPrecios, general: e.target.checked } })} /> Lista General (Principal)</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><input type="checkbox" checked={formData.listasPrecios.mayorista} onChange={e => setFormData({ ...formData, listasPrecios: { ...formData.listasPrecios, mayorista: e.target.checked } })} /> Lista Mayorista</label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <Button variant="secondary" onClick={confirmCancel}>Cancelar</Button>
                    <Button icon={Save} onClick={handleSave}>Guardar Caja</Button>
                </div>

                <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="¿Descartar cambios?">
                    <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '20px' }}>Si sales ahora, perderás todos los datos ingresados. ¿Estás seguro de cancelar la creación/edición?</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Button variant="secondary" onClick={() => setShowCancelModal(false)}>No, seguir editando</Button>
                        <Button style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }} onClick={proceedCancel}>Sí, Cancelar</Button>
                    </div>
                </Modal>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input placeholder="Buscar por nombre o sucursal..." style={{ width: '320px' }} />
                <Button icon={Plus} onClick={() => initForm()}>Crear Caja</Button>
            </div>

            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Nombre de Caja</th>
                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Sucursal</th>
                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Estado Sesión</th>
                            <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cajas.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #F0F2F5' }}>
                                <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>{c.name}</td>
                                <td style={{ padding: '14px 20px', fontSize: '13px', color: '#4B5563' }}>{c.sucursal}</td>
                                <td style={{ padding: '14px 20px' }}>
                                    {c.status === 'abierta' ? (
                                        <Badge variant="success">Abierta</Badge>
                                    ) : (
                                        <Badge variant="default" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>Turno Cerrado</Badge>
                                    )}
                                </td>
                                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => initForm(c)} disabled={c.status === 'abierta'} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #E2E5EA', background: '#FFFFFF', cursor: c.status === 'abierta' ? 'not-allowed' : 'pointer', opacity: c.status === 'abierta' ? 0.5 : 1 }}>
                                            <Edit size={14} style={{ color: '#6B7280' }} />
                                        </button>
                                        <button style={{ padding: '6px', borderRadius: '6px', border: '1px solid #E2E5EA', background: '#FFFFFF', cursor: 'pointer' }}>
                                            <ShieldBan size={14} style={{ color: '#EF4444' }} />
                                        </button>
                                    </div>
                                    {c.status === 'abierta' && <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>Cierre turno para editar</p>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
