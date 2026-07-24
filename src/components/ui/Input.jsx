import React from 'react';

export default function Input({
    label, error, icon: Icon, className = '', style = {}, ...props
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {label && (
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                {Icon && (
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', display: 'flex' }}>
                        <Icon size={18} strokeWidth={2} />
                    </div>
                )}
                <input
                    style={{
                        width: '100%', height: '48px', padding: '0 14px', paddingLeft: Icon ? '42px' : '14px',
                        fontSize: '14px', backgroundColor: '#FFFFFF', color: '#111827',
                        border: error ? '1px solid #DC2626' : '1px solid #ECECEC',
                        borderRadius: '14px', outline: 'none', fontFamily: 'inherit',
                        transition: 'all 150ms', boxSizing: 'border-box',
                        ...style
                    }}
                    onFocus={e => { e.target.style.borderColor = '#F5B400'; e.target.style.boxShadow = '0 0 0 3px rgba(245,180,0,0.18)'; }}
                    onBlur={e => { e.target.style.borderColor = error ? '#DC2626' : '#ECECEC'; e.target.style.boxShadow = 'none'; }}
                    {...props}
                />
            </div>
            {error && <p style={{ fontSize: '12px', color: '#DC2626' }}>{error}</p>}
        </div>
    );
}
