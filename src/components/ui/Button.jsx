import React from 'react';

const variantStyles = {
    primary: { backgroundColor: '#1E3A5F', color: '#FFFFFF', border: 'none' },
    secondary: { backgroundColor: '#FFFFFF', color: '#6B7280', border: '1px solid #E2E5EA' },
    danger: { backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none' },
    success: { backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none' },
    ghost: { backgroundColor: 'transparent', color: '#6B7280', border: 'none' },
    outline: { backgroundColor: 'transparent', color: '#1E3A5F', border: '1px solid #1E3A5F' },
};

const hoverBg = {
    primary: '#2C4F7C', secondary: '#F0F2F5', danger: '#B91C1C',
    success: '#15803D', ghost: '#F0F2F5', outline: '#EBF0F7',
};

const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '8px 16px', fontSize: '13px' },
    lg: { padding: '10px 20px', fontSize: '14px' },
    xl: { padding: '12px 24px', fontSize: '15px' },
};

export default function Button({
    children, variant = 'primary', size = 'md',
    icon: Icon, iconRight, disabled, fullWidth, className = '', style = {}, ...props
}) {
    const vs = variantStyles[variant] || variantStyles.primary;
    const ss = sizeStyles[size] || sizeStyles.md;
    const hBg = hoverBg[variant] || hoverBg.primary;

    return (
        <button
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontWeight: 500, borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 150ms', fontFamily: 'inherit',
                opacity: disabled ? 0.5 : 1,
                width: fullWidth ? '100%' : 'auto',
                ...vs, ...ss, ...style
            }}
            disabled={disabled}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = hBg; }}
            onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = vs.backgroundColor; }}
            {...props}
        >
            {Icon && !iconRight && <Icon size={size === 'sm' ? 14 : 16} />}
            {children}
            {Icon && iconRight && <Icon size={size === 'sm' ? 14 : 16} />}
        </button>
    );
}
