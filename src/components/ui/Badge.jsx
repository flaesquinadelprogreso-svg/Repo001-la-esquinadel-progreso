import React from 'react';

// warning reutiliza la escala del Primario (no hay color de "warning" dedicado en el sistema)
const variantStyles = {
    success: { backgroundColor: '#EAF7EE', color: '#16A34A' },
    danger: { backgroundColor: '#FDECEC', color: '#DC2626' },
    warning: { backgroundColor: '#FFF9E6', color: '#D69A00' },
    info: { backgroundColor: '#EFF4FF', color: '#2563EB' },
    neutral: { backgroundColor: '#F3F4F6', color: '#6B7280' },
    primary: { backgroundColor: '#FFF9E6', color: '#D69A00' },
};

const dotColors = {
    success: '#16A34A', danger: '#DC2626', warning: '#F5B400',
    info: '#2563EB', neutral: '#9CA3AF', primary: '#F5B400',
};

export default function Badge({ children, variant = 'neutral', dot, className = '' }) {
    const vs = variantStyles[variant] || variantStyles.neutral;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '3px 10px', fontSize: '12px', fontWeight: 500,
            borderRadius: '999px', ...vs
        }}>
            {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColors[variant] || dotColors.neutral }} />}
            {children}
        </span>
    );
}
