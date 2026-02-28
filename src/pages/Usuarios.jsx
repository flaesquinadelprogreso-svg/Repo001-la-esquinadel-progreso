import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX, Eye, EyeOff, Shield, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import api from '../api/client';

const roleColors = {
    admin: { bg: '#DBEAFE', text: '#1E40AF' },
    cajero: { bg: '#DCFCE7', text: '#16A34A' },
    bodega: { bg: '#FEF3C7', text: '#D97706' },
    contador: { bg: '#F3E8FF', text: '#7C3AED' },
};

// Modules that can be toggled per role
const MODULES = [
    { key: 'analisis-financiero', label: 'Análisis Financiero', desc: 'Dashboard y reportes financieros' },
    { key: 'inventario', label: 'Inventario', desc: 'Gestión de productos y stock' },
    { key: 'pos', label: 'POS Ventas', desc: 'Punto de venta' },
    { key: 'historial-ventas', label: 'Historial Ventas', desc: 'Ver historial de ventas' },
    { key: 'compras', label: 'Compras', desc: 'Registro de compras y facturas' },
    { key: 'caja', label: 'Caja y Bancos', desc: 'Gestión de caja y cuentas bancarias' },
    { key: 'clientes', label: 'Clientes', desc: 'Directorio de clientes' },
    { key: 'proveedores', label: 'Proveedores', desc: 'Directorio de proveedores' },
    { key: 'cuentas-cobrar', label: 'Cuentas por Cobrar', desc: 'Cartera de clientes' },
    { key: 'cuentas-pagar', label: 'Cuentas por Pagar', desc: 'Obligaciones con proveedores' },
    { key: 'configuracion', label: 'Configuración', desc: 'Ajustes del sistema' },
];

const defaultForm = { username: '', password: '', role: 'cajero', permisos: [] };
const defaultRoleForm = { nombre: '', descripcion: '', permisos: [] };

function Toggle({ on, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                width: '44px', height: '24px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                backgroundColor: on ? '#1E3A5F' : '#D1D5DB',
                justifyContent: on ? 'flex-end' : 'flex-start',
                padding: '2px', transition: 'all 200ms ease',
                flexShrink: 0
            }}>
            <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 200ms ease'
            }} />
        </div>
    );
}

export default function Usuarios() {
    const [tab, setTab] = useState('usuarios'); // 'usuarios' | 'roles'
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // User modal state
    const [showUserModal, setShowUserModal] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [userForm, setUserForm] = useState(defaultForm);
    const [showPassword, setShowPassword] = useState(false);
    const [savingUser, setSavingUser] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState(null);
    const [deletingUser, setDeletingUser] = useState(false);

    // Role modal state
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editRoleId, setEditRoleId] = useState(null);
    const [roleForm, setRoleForm] = useState(defaultRoleForm);
    const [savingRole, setSavingRole] = useState(false);
    const [deleteRoleId, setDeleteRoleId] = useState(null);
    const [deletingRole, setDeletingRole] = useState(false);

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

    // Helper: get default permissions for a role from the roles list
    const getRolePermisos = (roleName) => {
        if (roleName === 'admin') return MODULES.map(m => m.key);
        const role = roles.find(r => r.nombre.toLowerCase() === roleName.toLowerCase());
        if (role && role.permisos) {
            try { return JSON.parse(role.permisos); } catch { return []; }
        }
        return [];
    };

    // ─── User CRUD ───────────────────────────────────────────────
    const openNewUser = () => {
        setEditUserId(null);
        const defaultPermisos = getRolePermisos('cajero');
        setUserForm({ ...defaultForm, permisos: defaultPermisos });
        setShowPassword(false);
        setShowUserModal(true);
    };

    const openEditUser = (user) => {
        setEditUserId(user.id);
        let permisos = [];
        if (user.permisos) {
            try { permisos = JSON.parse(user.permisos); } catch { permisos = []; }
        } else {
            permisos = getRolePermisos(user.role);
        }
        setUserForm({ username: user.username, password: '', role: user.role, permisos });
        setShowPassword(false);
        setShowUserModal(true);
    };

    const handleUserRoleChange = (newRole) => {
        const rolePermisos = getRolePermisos(newRole);
        setUserForm(f => ({ ...f, role: newRole, permisos: rolePermisos }));
    };

    const toggleUserPermission = (moduleKey) => {
        setUserForm(f => ({
            ...f,
            permisos: f.permisos.includes(moduleKey)
                ? f.permisos.filter(p => p !== moduleKey)
                : [...f.permisos, moduleKey]
        }));
    };

    const handleSaveUser = async () => {
        if (!userForm.username.trim()) return alert('El nombre de usuario es requerido');
        if (!editUserId && !userForm.password) return alert('La contraseña es requerida');
        if (userForm.password && userForm.password.length < 4) return alert('La contraseña debe tener al menos 4 caracteres');

        setSavingUser(true);
        try {
            const payload = {
                username: userForm.username.trim(),
                role: userForm.role,
                permisos: userForm.role === 'admin' ? null : JSON.stringify(userForm.permisos)
            };
            if (userForm.password) payload.password = userForm.password;
            if (editUserId) {
                await api.put(`/usuarios/${editUserId}`, payload);
            } else {
                await api.post('/usuarios', payload);
            }
            setShowUserModal(false);
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al guardar usuario');
        } finally {
            setSavingUser(false);
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

    const handleDeleteUser = async () => {
        setDeletingUser(true);
        try {
            await api.delete(`/usuarios/${deleteUserId}`);
            setDeleteUserId(null);
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al desactivar usuario');
        } finally {
            setDeletingUser(false);
        }
    };

    // ─── Role CRUD ───────────────────────────────────────────────
    const openNewRole = () => {
        setEditRoleId(null);
        setRoleForm(defaultRoleForm);
        setShowRoleModal(true);
    };

    const openEditRole = (role) => {
        setEditRoleId(role.id);
        let permisos = [];
        try { permisos = JSON.parse(role.permisos || '[]'); } catch { permisos = []; }
        setRoleForm({ nombre: role.nombre, descripcion: role.descripcion || '', permisos });
        setShowRoleModal(true);
    };

    const togglePermission = (moduleKey) => {
        setRoleForm(f => ({
            ...f,
            permisos: f.permisos.includes(moduleKey)
                ? f.permisos.filter(p => p !== moduleKey)
                : [...f.permisos, moduleKey]
        }));
    };

    const toggleAll = () => {
        setRoleForm(f => ({
            ...f,
            permisos: f.permisos.length === MODULES.length ? [] : MODULES.map(m => m.key)
        }));
    };

    const handleSaveRole = async () => {
        if (!roleForm.nombre.trim()) return alert('El nombre del rol es requerido');

        setSavingRole(true);
        try {
            const payload = {
                nombre: roleForm.nombre.trim().toLowerCase(),
                descripcion: roleForm.descripcion,
                permisos: JSON.stringify(roleForm.permisos)
            };
            if (editRoleId) {
                await api.put(`/roles/${editRoleId}`, payload);
            } else {
                await api.post('/roles', payload);
            }
            setShowRoleModal(false);
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al guardar rol');
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteRole = async () => {
        setDeletingRole(true);
        try {
            await api.delete(`/roles/${deleteRoleId}`);
            setDeleteRoleId(null);
            fetchData();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al eliminar rol');
        } finally {
            setDeletingRole(false);
        }
    };

    // Available role options for user form
    const roleOptions = ['admin', ...roles.map(r => r.nombre.toLowerCase()).filter(r => r !== 'admin')];
    const uniqueRoles = [...new Set(roleOptions)];

    const tabStyle = (active) => ({
        padding: '10px 24px', fontSize: '14px', fontWeight: active ? 600 : 500,
        color: active ? '#1E3A5F' : '#6B7280', cursor: 'pointer',
        borderBottom: active ? '2px solid #1E3A5F' : '2px solid transparent',
        backgroundColor: 'transparent', border: 'none', borderBottomWidth: '2px',
        borderBottomStyle: 'solid', borderBottomColor: active ? '#1E3A5F' : 'transparent',
        transition: 'all 150ms'
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Usuarios y Roles</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Gestión de usuarios, roles y permisos del sistema</p>
                </div>
                {tab === 'usuarios' ? (
                    <Button onClick={openNewUser}><Plus size={16} style={{ marginRight: '6px' }} />Nuevo Usuario</Button>
                ) : (
                    <Button onClick={openNewRole}><Plus size={16} style={{ marginRight: '6px' }} />Nuevo Rol</Button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E5EA', gap: '0' }}>
                <button style={tabStyle(tab === 'usuarios')} onClick={() => setTab('usuarios')}>
                    <Users size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Usuarios
                </button>
                <button style={tabStyle(tab === 'roles')} onClick={() => setTab('roles')}>
                    <Shield size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Roles y Permisos
                </button>
            </div>

            {/* ═══ USUARIOS TAB ═══ */}
            {tab === 'usuarios' && (
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
                                                <button onClick={() => openEditUser(u)} title="Editar"
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
                                                <button onClick={() => setDeleteUserId(u.id)} title="Desactivar"
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
            )}

            {/* ═══ ROLES TAB ═══ */}
            {tab === 'roles' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Admin note */}
                    <div style={{ padding: '12px 16px', backgroundColor: '#DBEAFE', borderRadius: '8px', fontSize: '13px', color: '#1E40AF' }}>
                        <strong>Admin</strong> siempre tiene acceso total al sistema. Los permisos configurados aquí aplican a los demás roles.
                    </div>

                    {loading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Cargando roles...</div>
                    ) : roles.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px' }}>
                            No hay roles creados. Crea un rol para asignar permisos.
                        </div>
                    ) : roles.map(role => {
                        let permisos = [];
                        try { permisos = JSON.parse(role.permisos || '[]'); } catch { permisos = []; }
                        const rc = roleColors[role.nombre.toLowerCase()] || { bg: '#F3F4F6', text: '#4B5563' };

                        return (
                            <div key={role.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                                {/* Role header */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, padding: '4px 12px', borderRadius: '4px', backgroundColor: rc.bg, color: rc.text, textTransform: 'capitalize' }}>
                                            {role.nombre}
                                        </span>
                                        {role.descripcion && <span style={{ fontSize: '13px', color: '#6B7280' }}>{role.descripcion}</span>}
                                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                            {permisos.length} de {MODULES.length} módulos
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openEditRole(role)} title="Editar permisos"
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EEF2FF'; e.currentTarget.style.borderColor = '#4F46E5'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setDeleteRoleId(role.id)} title="Eliminar rol"
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.borderColor = '#EF4444'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                {/* Permissions grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                                    {MODULES.map((mod, idx) => (
                                        <div key={mod.key} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 20px', borderBottom: '1px solid #F0F2F5',
                                            borderRight: '1px solid #F0F2F5',
                                            backgroundColor: permisos.includes(mod.key) ? '#F0FDF4' : 'transparent'
                                        }}>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: 500, color: permisos.includes(mod.key) ? '#1A1A2E' : '#9CA3AF' }}>{mod.label}</p>
                                                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{mod.desc}</p>
                                            </div>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                                                backgroundColor: permisos.includes(mod.key) ? '#DCFCE7' : '#FEE2E2',
                                                color: permisos.includes(mod.key) ? '#16A34A' : '#DC2626'
                                            }}>
                                                {permisos.includes(mod.key) ? 'SI' : 'NO'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ USER MODAL ═══ */}
            {showUserModal && (
                <Modal isOpen={true} onClose={() => setShowUserModal(false)} title={editUserId ? 'Editar Usuario' : 'Nuevo Usuario'}>
                    <div style={{ minWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Nombre de usuario</label>
                                <input type="text" value={userForm.username}
                                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                                    placeholder="Ej: juan.perez"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                                    Contraseña {editUserId && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span>}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showPassword ? 'text' : 'password'} value={userForm.password}
                                        onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder={editUserId ? 'Nueva contraseña' : 'Contraseña'}
                                        style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Rol</label>
                            <select value={userForm.role}
                                onChange={e => handleUserRoleChange(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                                {uniqueRoles.map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Permission toggles */}
                        {userForm.role !== 'admin' ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                    Permisos <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({userForm.permisos.length} de {MODULES.length} módulos)</span>
                                </label>
                                <div style={{ border: '1px solid #E2E5EA', borderRadius: '8px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                                    {MODULES.map((mod, idx) => {
                                        const on = userForm.permisos.includes(mod.key);
                                        return (
                                            <div key={mod.key} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px',
                                                borderBottom: idx < MODULES.length - 1 ? '1px solid #F0F2F5' : 'none',
                                                backgroundColor: on ? '#F0FDF4' : 'transparent',
                                                transition: 'background 150ms'
                                            }}>
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: 500, color: on ? '#1A1A2E' : '#6B7280' }}>{mod.label}</p>
                                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{mod.desc}</p>
                                                </div>
                                                <Toggle on={on} onClick={() => toggleUserPermission(mod.key)} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '12px 16px', backgroundColor: '#DBEAFE', borderRadius: '8px', fontSize: '13px', color: '#1E40AF' }}>
                                <strong>Admin</strong> tiene acceso total a todos los módulos del sistema.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancelar</Button>
                            <Button onClick={handleSaveUser} disabled={savingUser}>
                                {savingUser ? 'Guardando...' : (editUserId ? 'Actualizar' : 'Crear Usuario')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ═══ ROLE MODAL (with permission toggles) ═══ */}
            {showRoleModal && (
                <Modal isOpen={true} onClose={() => setShowRoleModal(false)} title={editRoleId ? 'Editar Rol y Permisos' : 'Nuevo Rol'}>
                    <div style={{ minWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Nombre del rol</label>
                                <input type="text" value={roleForm.nombre}
                                    onChange={e => setRoleForm(f => ({ ...f, nombre: e.target.value }))}
                                    placeholder="Ej: cajero, bodega, contador"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Descripción</label>
                                <input type="text" value={roleForm.descripcion}
                                    onChange={e => setRoleForm(f => ({ ...f, descripcion: e.target.value }))}
                                    placeholder="Ej: Acceso a punto de venta"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        {/* Permission toggles */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Módulos permitidos</label>
                                <button onClick={toggleAll}
                                    style={{ fontSize: '12px', color: '#1E3A5F', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500, textDecoration: 'underline' }}>
                                    {roleForm.permisos.length === MODULES.length ? 'Desmarcar todos' : 'Marcar todos'}
                                </button>
                            </div>
                            <div style={{ border: '1px solid #E2E5EA', borderRadius: '8px', overflow: 'hidden' }}>
                                {MODULES.map((mod, idx) => {
                                    const on = roleForm.permisos.includes(mod.key);
                                    return (
                                        <div key={mod.key} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            borderBottom: idx < MODULES.length - 1 ? '1px solid #F0F2F5' : 'none',
                                            backgroundColor: on ? '#F0FDF4' : 'transparent',
                                            transition: 'background 150ms'
                                        }}>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: 500, color: on ? '#1A1A2E' : '#6B7280' }}>{mod.label}</p>
                                                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{mod.desc}</p>
                                            </div>
                                            <Toggle on={on} onClick={() => togglePermission(mod.key)} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancelar</Button>
                            <Button onClick={handleSaveRole} disabled={savingRole}>
                                {savingRole ? 'Guardando...' : (editRoleId ? 'Actualizar Rol' : 'Crear Rol')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete user confirmation */}
            {deleteUserId && (
                <Modal isOpen={true} onClose={() => setDeleteUserId(null)} title="Desactivar Usuario">
                    <div style={{ minWidth: '400px' }}>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '20px' }}>
                            ¿Está seguro de desactivar este usuario? No podrá iniciar sesión hasta que se reactive.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setDeleteUserId(null)}>Cancelar</Button>
                            <Button onClick={handleDeleteUser} disabled={deletingUser} style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}>
                                {deletingUser ? 'Desactivando...' : 'Desactivar'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete role confirmation */}
            {deleteRoleId && (
                <Modal isOpen={true} onClose={() => setDeleteRoleId(null)} title="Eliminar Rol">
                    <div style={{ minWidth: '400px' }}>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '20px' }}>
                            ¿Está seguro de eliminar este rol? Los usuarios con este rol perderán sus permisos.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setDeleteRoleId(null)}>Cancelar</Button>
                            <Button onClick={handleDeleteRole} disabled={deletingRole} style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}>
                                {deletingRole ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
