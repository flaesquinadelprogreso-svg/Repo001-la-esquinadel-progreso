import React from 'react';

const variantStyles = {
    primary: { backgroundColor: '#F5B400', color: '#111827', border: 'none' },
    secondary: { backgroundColor: '#FFFFFF', color: '#374151', border: '1px solid #ECECEC' },
    danger: { backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none' },
    info: { backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none' },
    success: { backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none' },
    ghost: { backgroundColor: 'transparent', color: '#6B7280', border: 'none' },
    outline: { backgroundColor: 'transparent', color: '#111827', border: '1px solid #F5B400' },
};

const hoverBg = {
    primary: '#E6A800', secondary: '#F8F9FB', danger: '#B91C1C', info: '#1D4ED8',
    success: '#15803D', ghost: '#F3F4F6', outline: '#FFF9E6',
};

const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '9px 16px', fontSize: '13px' },
    lg: { padding: '11px 20px', fontSize: '14px' },
    xl: { padding: '13px 24px', fontSize: '15px' },
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
                fontWeight: 600, borderRadius: '10px', cursor: disabled ? 'not-allowed' : 'pointer',
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
            {Icon && !iconRight && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
            {children}
            {Icon && iconRight && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
        </button>
    );
}
