import React from 'react';

export default function Card({ children, className = '', noPadding, onClick, style = {} }) {
    return (
        <div
            className={className}
            onClick={onClick}
            style={{
                backgroundColor: '#FFFFFF', border: '1px solid #ECECEC', borderRadius: '0 0 16px 16px',
                boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                padding: noPadding ? 0 : '24px',
                cursor: onClick ? 'pointer' : 'auto',
                transition: 'box-shadow 150ms',
                overflow: 'hidden',
                ...style
            }}
            onMouseEnter={onClick ? (e => e.currentTarget.style.boxShadow = '0 4px 10px rgba(17,24,39,0.06), 0 2px 4px rgba(17,24,39,0.04)') : undefined}
            onMouseLeave={onClick ? (e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)') : undefined}
        >
            {children}
        </div>
    );
}

export function StatCard({ label, value, change, trend, icon: Icon }) {
    return (
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '72px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#111827', lineHeight: 1.15 }}>{value}</span>
                    {change && <span style={{ fontSize: '12px', fontWeight: 500, color: trend === 'up' ? '#16A34A' : '#DC2626' }}>{change}</span>}
                </div>
                {Icon && (
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFF9E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} strokeWidth={2} style={{ color: '#F5B400' }} />
                    </div>
                )}
            </div>
        </Card>
    );
}
