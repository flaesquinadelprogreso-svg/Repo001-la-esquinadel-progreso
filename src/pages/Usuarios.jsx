import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX, Eye, EyeOff, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import api from '../api/client';

const roleColors = {
    admin: { bg: '#DBEAFE', text: '#1E40AF' },
    cajero: { bg: '#DCFCE7', text: '#16A34A' },
    bodega: { bg: '#FEF3C7', text: '#D97706' },
    contador: { bg: '#F3E8FF', text: '#7C3AED' },
};

const defaultForm = { username: '', password: '', role: 'cajero' };

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/usuarios'),
                api.get('/roles')
            ]);
            setUsuarios(usersRes.data);
            setRoles(rolesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openNew = () => {
        setEditId(null);
        setForm(defaultForm);
        setShowPassword(false);
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditId(user.id);
        setForm({ username: user.username, password: '', role: user.role });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.username.trim()) return alert('El nombre de usuario es requerido');
        if (!editId && !form.password) return alert('La contraseña es requerida');
        if (form.password && form.password.length < 4) return alert('La contraseña debe tener al menos 4 caracteres');

        setSaving(true);
        try {
            const payload = { username: form.username.trim(), role: form.role };
            if (form.password) payload.password = form.password;

            if (editId) {
                await api.put(`/usuarios/${editId}`, payload);
            } else {
                await api.post('/usuarios', payload);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al guardar usuario');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await api.put(`/usuarios/${user.id}`, { activo: !user.activo });
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al cambiar estado');
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/usuarios/${deleteId}`);
            setDeleteId(null);
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al desactivar usuario');
        } finally {
            setDeleting(false);
        }
    };

    // Available role options: from Rol table + hardcoded basics
    const roleOptions = ['admin', 'cajero', ...roles.map(r => r.nombre.toLowerCase()).filter(r => r !== 'admin' && r !== 'cajero')];
    const uniqueRoles = [...new Set(roleOptions)];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Usuarios</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Gestión de usuarios y asignación de roles</p>
                </div>
                <Button onClick={openNew}><Plus size={16} style={{ marginRight: '6px' }} />Nuevo Usuario</Button>
            </div>

            {/* Users table */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            {['#', 'Usuario', 'Rol', 'Estado', 'Creado', 'Acciones'].map(h => (
                                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Cargando...</td></tr>
                        ) : usuarios.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>No hay usuarios registrados.</td></tr>
                        ) : usuarios.map((u, idx) => {
                            const rc = roleColors[u.role] || { bg: '#F3F4F6', text: '#4B5563' };
                            return (
                                <tr key={u.id} style={{ borderBottom: idx < usuarios.length - 1 ? '1px solid #F0F2F5' : 'none', transition: 'background 100ms' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFBFC'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{u.id}</td>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: '#1A1A2E' }}>{u.username}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', backgroundColor: rc.bg, color: rc.text, textTransform: 'capitalize' }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px',
                                            backgroundColor: u.activo ? '#DCFCE7' : '#FEE2E2',
                                            color: u.activo ? '#16A34A' : '#DC2626'
                                        }}>
                                            {u.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openEdit(u)} title="Editar"
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EEF2FF'; e.currentTarget.style.borderColor = '#4F46E5'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleToggleActive(u)} title={u.activo ? 'Desactivar' : 'Activar'}
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: u.activo ? '#D97706' : '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = u.activo ? '#FEF3C7' : '#DCFCE7'; e.currentTarget.style.borderColor = u.activo ? '#D97706' : '#16A34A'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
                                                {u.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                                            </button>
                                            <button onClick={() => setDeleteId(u.id)} title="Desactivar"
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.borderColor = '#EF4444'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <Modal isOpen={true} onClose={() => setShowModal(false)} title={editId ? 'Editar Usuario' : 'Nuevo Usuario'}>
                    <div style={{ minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Nombre de usuario</label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                placeholder="Ej: juan.perez"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                                Contraseña {editId && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(dejar vacío para no cambiar)</span>}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder={editId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                                    style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Rol</label>
                            <select
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                                {uniqueRoles.map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Guardando...' : (editId ? 'Actualizar' : 'Crear Usuario')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete confirmation modal */}
            {deleteId && (
                <Modal isOpen={true} onClose={() => setDeleteId(null)} title="Desactivar Usuario">
                    <div style={{ minWidth: '400px' }}>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '20px' }}>
                            ¿Está seguro de desactivar este usuario? El usuario no podrá iniciar sesión hasta que se reactive.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
                            <Button onClick={handleDelete} disabled={deleting} style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}>
                                {deleting ? 'Desactivando...' : 'Desactivar'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
