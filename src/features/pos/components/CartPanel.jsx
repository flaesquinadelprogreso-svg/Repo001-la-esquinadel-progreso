import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Hammer, Package } from 'lucide-react';
import { formatPesos } from '../../../utils/currency';

// Formatear cantidad: si es entero muestra sin decimales, si tiene decimales muestra .XX
const formatQty = (qty) => {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
};

export default function CartPanel({ cart, clearCart, updateQty, removeFromCart, togglePrecioMayor }) {
    return (
        <div id="pos-cart" style={{ flex: 4, minWidth: 0, backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Cart Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={20} color="#1A1A2E" />
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>Carrito</span>
                </div>
                {cart.length > 0 && (
                    <button onClick={clearCart} style={{ padding: '4px 8px', fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Limpiar
                    </button>
                )}
            </div>

            {/* Cart Items */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>
                        <ShoppingCart size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p>Carrito vacío</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cart.map((item, idx) => {
                            const lineTotal = Math.round(item.price * item.qty);
                            return (
                                <div key={`${item.id}-${idx}`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    backgroundColor: item.isService ? '#FFFBEB' : '#F9FAFB',
                                    borderRadius: '10px',
                                    border: '1px solid',
                                    borderColor: item.isService ? '#FEF3C7' : '#F3F4F6'
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        backgroundColor: item.isService ? '#FEF3C7' : '#EEF2FF',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {item.isService ? <Hammer size={16} color="#D97706" /> : <Package size={16} color="#4F46E5" />}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#111827',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {formatPesos(item.price)}
                                            {item.isProduct && item.precioMayor && item.precioMayor !== item.originalPrice && (
                                                <button
                                                    onClick={() => togglePrecioMayor(item.id)}
                                                    title={item.isPrecioMayor ? 'Precio al por mayor activo' : 'Activar precio al por mayor'}
                                                    style={{
                                                        padding: '1px 4px',
                                                        borderRadius: '4px',
                                                        border: `1.5px solid ${item.isPrecioMayor ? '#4F46E5' : '#D1D5DB'}`,
                                                        backgroundColor: item.isPrecioMayor ? '#EEF2FF' : '#fff',
                                                        color: item.isPrecioMayor ? '#4F46E5' : '#9CA3AF',
                                                        fontSize: '9px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        lineHeight: 1.2
                                                    }}
                                                >
                                                    PM
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', padding: '2px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                        <button
                                            onClick={() => updateQty(item.id, item.isService, -1)}
                                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Minus size={10} />
                                        </button>
                                        <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>
                                            {formatQty(item.qty)}
                                        </span>
                                        <button
                                            onClick={() => updateQty(item.id, item.isService, 1)}
                                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Plus size={10} />
                                        </button>
                                    </div>

                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', width: '80px', textAlign: 'right' }}>
                                        {formatPesos(lineTotal)}
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item.id, item.isService)}
                                        style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', opacity: 0.6 }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
