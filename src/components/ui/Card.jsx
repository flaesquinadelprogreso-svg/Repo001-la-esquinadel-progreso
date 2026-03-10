import React from 'react';

export default function Card({ children, className = '', noPadding, onClick, style = {} }) {
    return (
        <div
            className={className}
            onClick={onClick}
            style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                padding: noPadding ? 0 : '24px',
                cursor: onClick ? 'pointer' : 'auto',
                transition: 'box-shadow 150ms',
                overflow: 'hidden',
                ...style
            }}
            onMouseEnter={onClick ? (e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)') : undefined}
            onMouseLeave={onClick ? (e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)') : undefined}
        >
            {children}
        </div>
    );
}

export function StatCard({ label, value, change, trend, icon: Icon }) {
    return (
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>{value}</span>
                    {change && <span style={{ fontSize: '12px', fontWeight: 500, color: trend === 'up' ? '#16A34A' : '#DC2626' }}>{change}</span>}
                </div>
                {Icon && (
                    <div style={{ width: '48px', height: '48px', borderRadius: '4px', backgroundColor: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={22} style={{ color: '#F2A900' }} />
                    </div>
                )}
            </div>
        </Card>
    );
}
