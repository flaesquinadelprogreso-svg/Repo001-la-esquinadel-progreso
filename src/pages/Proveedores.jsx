import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Eye, Edit, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

import api from '../api/client';
import '../styles/directorio-mobile.css';

export default function Proveedores() {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newSupplier, setNewSupplier] = useState({
        nombre: '',
        nit: '',
        telefono: '',
        email: '',
        direccion: ''
    });

    // Fetch suppliers from API
    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/proveedores');
            const data = response.data;
            setSuppliers(data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const filtered = suppliers.filter(s =>
        s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        s.nit?.includes(search)
    );

    const handleCreateSupplier = async () => {
        if (!newSupplier.nombre || !newSupplier.nit) {
            alert('Por favor complete el nombre y NIT');
            return;
        }

        try {
            const response = await api.post(`/proveedores`, newSupplier);

            if (response.data) {
                const created = response.data;
                setSuppliers(prev => [...prev, created]);
                setShowNew(false);
                setNewSupplier({ nombre: '', nit: '', telefono: '', email: '', direccion: '' });
            }
        } catch (error) {
            console.error('Error creating supplier:', error);
            alert(error?.response?.data?.error || 'Error al crear proveedor');
        }
    };

    const handleUpdateSupplier = async () => {
        if (!selected) return;

        try {
            const response = await api.put(`/proveedores/${selected.id}`, {
                nombre: selected.nombre,
                nit: selected.nit,
                telefono: selected.telefono,
                email: selected.email,
                direccion: selected.direccion
            });

            if (response.data) {
                const updated = response.data;
                setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
                setShowEdit(false);
                setSelected(updated);
            }
        } catch (error) {
            console.error('Error updating supplier:', error);
            alert(error?.response?.data?.error || 'Error al actualizar proveedor');
        }
    };

    const handleDeleteSupplier = async (id) => {
        if (!confirm('¿Está seguro de eliminar este proveedor?')) return;

        try {
            const response = await api.delete(`/proveedores/${id}`);

            if (response.data) {
                setSuppliers(prev => prev.filter(s => s.id !== id));
                setSelected(null);
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert(error?.response?.data?.error || 'Error al eliminar proveedor');
        }
    };

    return (
        <div id="dir-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="dir-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Proveedores</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Gestión de proveedores</p>
                </div>
                <Button onClick={() => setShowNew(true)}><Plus size={16} style={{ marginRight: '6px' }} />Nuevo Proveedor</Button>
            </div>

            <div id="dir-search" style={{ position: 'relative', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o NIT..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 40px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
            </div>

            <div id="dir-table" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        Cargando proveedores...
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Nombre</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>NIT</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Teléfono</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Email</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(supplier => (
                                <tr
                                    key={supplier.id}
                                    style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                                    onClick={() => setSelected(supplier)}
                                >
                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{supplier.nombre}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{supplier.nit}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{supplier.telefono || '-'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{supplier.email || '-'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelected(supplier); setShowEdit(true); }}
                                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSupplier(supplier.id); }}
                                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        No se encontraron proveedores
                    </div>
                )}
            </div>

            {/* New Supplier Modal */}
            <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Nuevo Proveedor">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre *</label>
                        <input
                            type="text"
                            value={newSupplier.nombre}
                            onChange={(e) => setNewSupplier(prev => ({ ...prev, nombre: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Nombre del proveedor"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>NIT *</label>
                        <input
                            type="text"
                            value={newSupplier.nit}
                            onChange={(e) => setNewSupplier(prev => ({ ...prev, nit: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Número de NIT"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                        <input
                            type="text"
                            value={newSupplier.telefono}
                            onChange={(e) => setNewSupplier(prev => ({ ...prev, telefono: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Número de teléfono"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                        <input
                            type="email"
                            value={newSupplier.email}
                            onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Dirección</label>
                        <input
                            type="text"
                            value={newSupplier.direccion}
                            onChange={(e) => setNewSupplier(prev => ({ ...prev, direccion: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Dirección"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
                        <Button onClick={handleCreateSupplier}>Crear Proveedor</Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Supplier Modal */}
            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar Proveedor">
                {selected && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre *</label>
                            <input
                                type="text"
                                value={selected.nombre || ''}
                                onChange={(e) => setSelected(prev => ({ ...prev, nombre: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>NIT *</label>
                            <input
                                type="text"
                                value={selected.nit || ''}
                                onChange={(e) => setSelected(prev => ({ ...prev, nit: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                            <input
                                type="text"
                                value={selected.telefono || ''}
                                onChange={(e) => setSelected(prev => ({ ...prev, telefono: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                            <input
                                type="email"
                                value={selected.email || ''}
                                onChange={(e) => setSelected(prev => ({ ...prev, email: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Dirección</label>
                            <input
                                type="text"
                                value={selected.direccion || ''}
                                onChange={(e) => setSelected(prev => ({ ...prev, direccion: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
                            <Button onClick={handleUpdateSupplier}>Guardar Cambios</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Supplier Details Modal */}
            <Modal isOpen={selected && !showEdit} onClose={() => setSelected(null)} title="Detalles del Proveedor">
                {selected && (
                    <div style={{ minWidth: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Truck size={24} color="#6B7280" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{selected.nombre}</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280' }}>NIT: {selected.nit}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selected.telefono && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Phone size={18} color="#6B7280" />
                                    <span style={{ fontSize: '14px' }}>{selected.telefono}</span>
                                </div>
                            )}
                            {selected.email && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Mail size={18} color="#6B7280" />
                                    <span style={{ fontSize: '14px' }}>{selected.email}</span>
                                </div>
                            )}
                            {selected.direccion && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <MapPin size={18} color="#6B7280" />
                                    <span style={{ fontSize: '14px' }}>{selected.direccion}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <Button variant="secondary" onClick={() => handleDeleteSupplier(selected.id)}>
                                <Trash2 size={16} style={{ marginRight: '6px' }} />Eliminar
                            </Button>
                            <Button onClick={() => { setShowEdit(true); }}>
                                <Edit size={16} style={{ marginRight: '6px' }} />Editar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
