import React from 'react';
import { Search, Hammer, Package, History } from 'lucide-react';
import { formatPesos } from '../../../utils/currency';

// Helper to get total stock from stockUbicaciones
const getTotalStock = (product) => {
    return product.stockUbicaciones?.reduce((sum, sl) => sum + sl.stock, 0) || 0;
};

export default function ProductGrid({ products, services, search, onSearchChange, loading, onProductClick, onServiceClick, onHistoryClick }) {
    const filteredServices = services.filter(s =>
        s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        s.codigo?.toLowerCase().includes(search.toLowerCase())
    );

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
                <div id="pos-grid" style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', alignContent: 'start', paddingRight: '4px' }}>
                    {/* Products */}
                    {products.map(product => {
                        const totalStock = getTotalStock(product);
                        return (
                            <div
                                key={product.id}
                                onClick={() => onProductClick(product)}
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: '10px',
                                    border: '1px solid #E5E7EB',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    opacity: totalStock <= 0 ? 0.5 : 1,
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E3A5F'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ height: '50px', backgroundColor: '#F8FAFC', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                                    {product.imagen ? (
                                        <img src={product.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                    ) : (
                                        <Package size={18} color="#94A3B8" />
                                    )}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {product.nombre}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>{formatPesos(product.precio)}</span>
                                    <span style={{ fontSize: '9px', backgroundColor: totalStock <= 5 ? '#FEE2E2' : '#E2E8F0', padding: '2px 5px', borderRadius: '4px', color: totalStock <= 5 ? '#DC2626' : '#475569', fontWeight: 500 }}>
                                        {totalStock} und
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Services */}
                    {filteredServices.map(service => (
                        <div
                            key={`service-${service.id}`}
                            onClick={() => onServiceClick(service)}
                            style={{
                                backgroundColor: '#FFFBEB',
                                borderRadius: '10px',
                                border: '1px solid #FDE68A',
                                padding: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#FDE68A'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ height: '50px', backgroundColor: '#FEF3C7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                                <Hammer size={18} color="#D97706" />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {service.nombre}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>{formatPesos(service.precio)}</span>
                                <span style={{ fontSize: '9px', backgroundColor: '#FDE68A', padding: '2px 5px', borderRadius: '4px', color: '#92400E', fontWeight: 500 }}>
                                    Servicio
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
