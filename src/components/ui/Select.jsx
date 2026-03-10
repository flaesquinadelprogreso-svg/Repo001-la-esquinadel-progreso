import React from 'react';

export default function Select({ label, options = [], error, className = '', style = {}, ...props }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {label && (
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </label>
            )}
            <select
                style={{
                    width: '100%', padding: '9px 32px 9px 12px',
                    fontSize: '13px', backgroundColor: '#FFFFFF',
                    border: error ? '1px solid #DC2626' : '1px solid #E2E5EA',
                    borderRadius: '6px', outline: 'none', fontFamily: 'inherit',
                    cursor: 'pointer', transition: 'all 150ms',
                    appearance: 'none', boxSizing: 'border-box',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 4.5L6 8l3-3.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                    ...style
                }}
                onFocus={e => { e.target.style.borderColor = '#F2A900'; e.target.style.boxShadow = '0 0 0 2px rgba(242,169,0,0.2)'; }}
                onBlur={e => { e.target.style.borderColor = error ? '#DC2626' : '#E2E5EA'; e.target.style.boxShadow = 'none'; }}
                {...props}
            >
                {options.map((opt) => (
                    <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                        {typeof opt === 'string' ? opt : opt.label}
                    </option>
                ))}
            </select>
            {error && <p style={{ fontSize: '11px', color: '#DC2626' }}>{error}</p>}
        </div>
    );
}
