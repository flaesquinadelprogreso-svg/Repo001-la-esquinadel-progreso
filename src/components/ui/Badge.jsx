import React from 'react';

const variantStyles = {
    success: { backgroundColor: '#DCFCE7', color: '#16A34A' },
    danger: { backgroundColor: '#FEE2E2', color: '#DC2626' },
    warning: { backgroundColor: '#FEF3C7', color: '#D97706' },
    info: { backgroundColor: '#FFF8E7', color: '#F2A900' },
    neutral: { backgroundColor: '#F0F2F5', color: '#6B7280' },
    primary: { backgroundColor: '#FFF8E7', color: '#F2A900' },
};

const dotColors = {
    success: '#16A34A', danger: '#DC2626', warning: '#D97706',
    info: '#F2A900', neutral: '#9CA3AF', primary: '#F2A900',
};

export default function Badge({ children, variant = 'neutral', dot, className = '' }) {
    const vs = variantStyles[variant] || variantStyles.neutral;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '3px 10px', fontSize: '11px', fontWeight: 500,
            borderRadius: '12px', ...vs
        }}>
            {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColors[variant] || dotColors.neutral }} />}
            {children}
        </span>
    );
}
