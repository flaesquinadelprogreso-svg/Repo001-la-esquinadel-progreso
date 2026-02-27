import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Eye, Edit, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

import api from '../api/client';
import '../styles/directorio-mobile.css';

export default function Clientes() {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newClient, setNewClient] = useState({
        nombre: '',
        documento: '',
        telefono: '',
        email: '',
        direccion: ''
    });

    // Fetch clients from API
    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await api.get('/clientes');
            const data = response.data;
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filtered = clients.filter(c =>
        c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        c.documento?.includes(search)
    );

    const handleCreateClient = async () => {
        if (!newClient.nombre || !newClient.documento) {
            alert('Por favor complete el nombre y documento');
            return;
        }

        try {
            const response = await api.post('/clientes', newClient);
            const created = response.data;
            setClients(prev => [...prev, created]);
            setShowNew(false);
            setNewClient({ nombre: '', documento: '', telefono: '', email: '', direccion: '' });
        } catch (error) {
            console.error('Error creating client:', error);
            alert(error.response?.data?.error || 'Error al crear cliente');
        }
    };

    const handleUpdateClient = async () => {
        if (!selected) return;

        try {
            const response = await api.put(`/clientes/${selected.id}`, {
                nombre: selected.nombre,
                documento: selected.documento,
                telefono: selected.telefono,
                email: selected.email,
                direccion: selected.direccion
            });
            const updated = response.data;
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
            setShowEdit(false);
            setSelected(updated);
        } catch (error) {
            console.error('Error updating client:', error);
            alert(error.response?.data?.error || 'Error al actualizar cliente');
        }
    };

    const handleDeleteClient = async (id) => {
        if (!confirm('¿Está seguro de eliminar este cliente?')) return;

        try {
            await api.delete(`/clientes/${id}`);
            setClients(prev => prev.filter(c => c.id !== id));
            setSelected(null);
        } catch (error) {
            console.error('Error deleting client:', error);
            alert(error.response?.data?.error || 'Error al eliminar cliente');
        }
    };

    return (
        <div id="dir-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="dir-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Clientes</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Gestión de clientes y contactos</p>
                </div>
                <Button onClick={() => setShowNew(true)}><Plus size={16} style={{ marginRight: '6px' }} />Nuevo Cliente</Button>
            </div>

            {/* Search */}
            <div id="dir-search" style={{ position: 'relative', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o documento..."
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

            {/* Clients Table */}
            <div id="dir-table" style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        Cargando clientes...
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Nombre</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Documento</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Teléfono</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Email</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(client => (
                                <tr
                                    key={client.id}
                                    style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                                    onClick={() => setSelected(client)}
                                >
                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{client.nombre}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{client.documento}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{client.telefono || '-'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{client.email || '-'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelected(client); setShowEdit(true); }}
                                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
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
                        No se encontraron clientes
                    </div>
                )}
            </div>

            {/* New Client Modal */}
            <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Nuevo Cliente">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre *</label>
                        <input
                            type="text"
                            value={newClient.nombre}
                            onChange={(e) => setNewClient(prev => ({ ...prev, nombre: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Nombre completo"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Documento *</label>
                        <input
                            type="text"
                            value={newClient.documento}
                            onChange={(e) => setNewClient(prev => ({ ...prev, documento: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Número de documento"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                        <input
                            type="text"
                            value={newClient.telefono}
                            onChange={(e) => setNewClient(prev => ({ ...prev, telefono: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Número de teléfono"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                        <input
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Dirección</label>
                        <input
                            type="text"
                            value={newClient.direccion}
                            onChange={(e) => setNewClient(prev => ({ ...prev, direccion: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Dirección"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
                        <Button onClick={handleCreateClient}>Crear Cliente</Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Client Modal */}
            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar Cliente">
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
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Documento *</label>
                            <input
                                type="text"
                                value={selected.documento || ''}
                                onChange={(e) => setSelected(prev => ({ ...prev, documento: e.target.value }))}
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
                            <Button onClick={handleUpdateClient}>Guardar Cambios</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Client Details Modal */}
            <Modal isOpen={selected && !showEdit} onClose={() => setSelected(null)} title="Detalles del Cliente">
                {selected && (
                    <div style={{ minWidth: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={24} color="#6B7280" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{selected.nombre}</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280' }}>Documento: {selected.documento}</p>
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
                            <Button variant="secondary" onClick={() => handleDeleteClient(selected.id)}>
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
