import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { permissions, rolePermissions } from '../data/mock';

import api from '../api/client';
const permModules = [...new Set(permissions.map(p => p.module))];

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPerms, setShowPerms] = useState(null);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            if (res.data) {
                setRoles(res.data);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    return (
        <div id="roles-config-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="roles-config-header" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
                <Button icon={Plus}>Nuevo Rol</Button>
            </div>

            {/* Roles table */}
            <div id="roles-config-table" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E5EA' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E' }}>Roles Definidos</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            {['#', 'Rol', 'Descripción', 'Acciones'].map(h => (
                                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Cargando roles...</td></tr>
                        ) : roles.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No hay roles definidos</td></tr>
                        ) : (
                            roles.map((r, idx) => (
                                <tr key={r.id} onClick={() => setShowPerms(r)}
                                    style={{ borderBottom: idx < roles.length - 1 ? '1px solid #F0F2F5' : 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFBFC'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#9CA3AF' }}>{r.id}</td>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: '#1A1A2E' }}>{r.nombre || r.name}</td>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>{r.descripcion || r.description || '-'}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button style={{ padding: '6px', borderRadius: '6px', border: '1px solid #E2E5EA', background: '#FFFFFF', cursor: 'pointer' }}><Eye size={14} style={{ color: '#6B7280' }} /></button>
                                            <button style={{ padding: '6px', borderRadius: '6px', border: '1px solid #E2E5EA', background: '#FFFFFF', cursor: 'pointer' }}><Edit size={14} style={{ color: '#6B7280' }} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Permissions modal */}
            <Modal isOpen={!!showPerms} onClose={() => setShowPerms(null)} title={`Permisos: ${showPerms?.nombre || showPerms?.name}`} size="lg"
                footer={<><Button variant="secondary" onClick={() => setShowPerms(null)}>Cancelar</Button><Button icon={Shield}>Guardar Permisos</Button></>}>
                {showPerms && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ fontSize: '13px', color: '#6B7280' }}>Configura permisos para <strong>{showPerms.nombre || showPerms.name}</strong></p>
                        {permModules.map(mod => (
                            <div key={mod} style={{ border: '1px solid #E2E5EA', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 18px', backgroundColor: '#EBF0F7', borderBottom: '1px solid #E2E5EA' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1E3A5F' }}>{mod}</h4>
                                </div>
                                {permissions.filter(p => p.module === mod).map(perm => {
                                    const rp = rolePermissions.find(rp => rp.roleId === showPerms.id && rp.permissionId === perm.id);
                                    const on = rp?.granted ?? false;
                                    return (
                                        <div key={perm.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 18px', borderBottom: '1px solid #F0F2F5'
                                        }}>
                                            <div>
                                                <p style={{ fontSize: '13px', color: '#1A1A2E' }}>{perm.label}</p>
                                                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{perm.action}</p>
                                            </div>
                                            <div style={{
                                                width: '40px', height: '22px', borderRadius: '11px',
                                                display: 'flex', alignItems: 'center', cursor: 'pointer',
                                                backgroundColor: on ? '#1E3A5F' : '#E2E5EA',
                                                justifyContent: on ? 'flex-end' : 'flex-start',
                                                padding: '2px', transition: 'all 150ms'
                                            }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
