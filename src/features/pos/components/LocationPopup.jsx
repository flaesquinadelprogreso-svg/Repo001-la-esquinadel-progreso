import React from 'react';
import { MapPin, Package, Plus } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPesos } from '../../../utils/currency';

// Helper to get color for location
const ubicacionColor = (name) => {
    const colors = {
        'Bodega Principal': { bg: '#DBEAFE', fg: '#1D4ED8' },
        'Mostrador': { bg: '#D1FAE5', fg: '#059669' },
        'Vitrina': { bg: '#EDE9FE', fg: '#7C3AED' },
    };
    return colors[name] || { bg: '#F0F2F5', fg: '#6B7280' };
};

export default function LocationPopup({ product, locationQuantities, setLocationQuantities, onConfirm, onClose }) {
    if (!product) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title="Seleccionar Ubicación">
            <div style={{ minWidth: '380px' }}>
                {/* Product Header */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E5E7EB' }}>
                    <div style={{ width: '60px', height: '60px', backgroundColor: '#EEF2FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.imagen ? (
                            <img src={product.imagen} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                        ) : (
                            <Package size={32} color="#4F46E5" />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                            {product.nombre}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Ref: {product.codigo}</span>
                            <span style={{ fontWeight: 700, color: '#10B981' }}>{formatPesos(product.precio)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                        ¿De qué ubicaciones desea extraer el producto?
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {product.stockUbicaciones?.filter(s => s.stock > 0).map((s, idx) => {
                            const locColor = ubicacionColor(s.ubicacion?.nombre);
                            return (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    backgroundColor: '#fff',
                                    borderRadius: '10px',
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '36px', height: '36px',
                                            borderRadius: '8px',
                                            backgroundColor: locColor.bg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <MapPin size={18} color={locColor.fg} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.ubicacion?.nombre}</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Disponible: <span style={{ fontWeight: 600, color: '#374151' }}>{s.stock} unds</span></div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max={s.stock}
                                            placeholder="0"
                                            value={locationQuantities[s.ubicacionId] || ''}
                                            onChange={(e) => {
                                                const val = Math.min(parseInt(e.target.value) || 0, s.stock);
                                                setLocationQuantities(prev => ({ ...prev, [s.ubicacionId]: val || '' }));
                                            }}
                                            style={{
                                                width: '70px',
                                                padding: '8px 12px',
                                                border: '1px solid #D1D5DB',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                outline: 'none',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={e => e.target.style.borderColor = '#4F46E5'}
                                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {(!product.stockUbicaciones || product.stockUbicaciones.filter(s => s.stock > 0).length === 0) && (
                            <div style={{ textAlign: 'center', color: '#6B7280', padding: '30px 20px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                                <Package size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>Este producto no tiene stock disponible en ninguna ubicación.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={() => onConfirm(product, locationQuantities)}
                        disabled={!Object.values(locationQuantities).some(qty => parseInt(qty) > 0)}
                    >
                        <Plus size={18} style={{ marginRight: '6px' }} />
                        Agregar al Carrito
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
