import React, { useState } from 'react';
import { Search, Hammer, Package, History, ChevronRight, X } from 'lucide-react';
import { formatPesos } from '../../../utils/currency';

// Helper to get total stock from stockUbicaciones
const getTotalStock = (product) => {
    return product.stockUbicaciones?.reduce((sum, sl) => sum + sl.stock, 0) || 0;
};


export default function ProductGrid({ products, services, recentItems, isSearching, search, onSearchChange, loading, onProductClick, onServiceClick, onHistoryClick }) {
    const [showAllModal, setShowAllModal] = useState(false);

    // Cuando hay búsqueda: combinar productos y servicios filtrados. Sin búsqueda: usar recientes del backend
    let allCombined;
    if (isSearching && search.trim()) {
        const filteredServices = services.filter(s =>
            s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
            s.codigo?.toLowerCase().includes(search.toLowerCase())
        );
        allCombined = [
            ...products.map(p => ({ ...p, _type: 'product' })),
            ...filteredServices.map(s => ({ ...s, _type: 'service' }))
        ];
    } else {
        allCombined = (recentItems || []).slice(0, 12);
    }

    const combined = allCombined.slice(0, 12);
    const hasMore = allCombined.length > 12;

    return (
        <div id="pos-catalog" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Header con título y botón historial */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>Productos y Servicios</span>
                <button
                    onClick={onHistoryClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        padding: '4px 8px',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#6B7280'
                    }}
                >
                    <History size={12} />
                    Historial
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                    type="text"
                    placeholder="Buscar producto o servicio..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 8px 8px 30px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px', outline: 'none', backgroundColor: '#fff' }}
                />
            </div>

            {/* Products Grid */}
            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px' }}>
                    Cargando...
                </div>
            ) : (
                <div id="pos-grid" style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '6px' }}>
                    {combined.map(item => {
                        const isService = item._type === 'service';
                        const totalStock = isService ? null : getTotalStock(item);
                        return (
                            <div
                                key={isService ? `service-${item.id}` : item.id}
                                onClick={() => isService ? onServiceClick(item) : onProductClick(item)}
                                style={{
                                    backgroundColor: isService ? '#FFFBEB' : '#fff',
                                    borderRadius: '8px',
                                    border: `1px solid ${isService ? '#FDE68A' : '#E5E7EB'}`,
                                    padding: '6px',
                                    cursor: 'pointer',
                                    opacity: !isService && totalStock <= 0 ? 0.5 : 1,
                                    transition: 'all 0.15s ease',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    minHeight: 0
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = isService ? '#F59E0B' : '#F2A900'; e.currentTarget.style.boxShadow = isService ? '0 2px 8px rgba(245,158,11,0.15)' : '0 2px 8px rgba(0,0,0,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = isService ? '#FDE68A' : '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ flex: 1, minHeight: 0, backgroundColor: isService ? '#FEF3C7' : '#F8FAFC', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                    {isService ? (
                                        <Hammer size={16} color="#D97706" />
                                    ) : item.imagen ? (
                                        <img src={item.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                    ) : (
                                        <Package size={16} color="#94A3B8" />
                                    )}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.nombre}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>{formatPesos(item.precio)}</span>
                                    <span style={{ fontSize: '8px', backgroundColor: isService ? '#FDE68A' : (totalStock <= 5 ? '#FEE2E2' : '#E2E8F0'), padding: '1px 4px', borderRadius: '3px', color: isService ? '#92400E' : (totalStock <= 5 ? '#DC2626' : '#475569'), fontWeight: 500 }}>
                                        {isService ? 'Servicio' : totalStock}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botón Ver más */}
            {hasMore && isSearching && (
                <button
                    onClick={() => setShowAllModal(true)}
                    style={{
                        marginTop: '6px',
                        padding: '6px',
                        backgroundColor: '#FFF8E1',
                        border: '1px solid #F2A900',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#92400E',
                        width: '100%'
                    }}
                >
                    Ver más ({allCombined.length} resultados) <ChevronRight size={14} />
                </button>
            )}

            {/* Modal todos los productos */}
            {showAllModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowAllModal(false)}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>
                                Resultados para "{search}" ({allCombined.length})
                            </span>
                            <button onClick={() => setShowAllModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                                <X size={20} />
                            </button>
                        </div>
                        {/* Lista */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                            {allCombined.map(item => {
                                const isService = item._type === 'service';
                                const totalStock = isService ? null : getTotalStock(item);
                                return (
                                    <div
                                        key={isService ? `modal-service-${item.id}` : `modal-${item.id}`}
                                        onClick={() => {
                                            isService ? onServiceClick(item) : onProductClick(item);
                                            setShowAllModal(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #F3F4F6',
                                            opacity: !isService && totalStock <= 0 ? 0.5 : 1
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF8E1'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: isService ? '#FEF3C7' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {isService ? <Hammer size={16} color="#D97706" /> :
                                                item.imagen ? <img src={item.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} /> :
                                                    <Package size={16} color="#94A3B8" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>{item.nombre}</div>
                                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{item.codigo || ''}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>{formatPesos(item.precio)}</div>
                                            <span style={{ fontSize: '10px', backgroundColor: isService ? '#FDE68A' : (totalStock <= 5 ? '#FEE2E2' : '#E2E8F0'), padding: '1px 6px', borderRadius: '3px', color: isService ? '#92400E' : (totalStock <= 5 ? '#DC2626' : '#475569'), fontWeight: 500 }}>
                                                {isService ? 'Servicio' : `Stock: ${totalStock}`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
