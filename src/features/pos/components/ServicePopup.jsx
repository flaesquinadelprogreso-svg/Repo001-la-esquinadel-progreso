import React from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

export default function ServicePopup({ service, editName, editPrice, setEditName, setEditPrice, onConfirm, onClose }) {
    if (!service) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title="Agregar Servicio">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '350px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre del servicio</label>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Precio</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                        <input
                            type="text"
                            value={editPrice ? parseInt(editPrice).toLocaleString('es-CO') : ''}
                            onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ''))}
                            style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="0"
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onConfirm(service, editName, editPrice)}>Agregar</Button>
                </div>
            </div>
        </Modal>
    );
}
