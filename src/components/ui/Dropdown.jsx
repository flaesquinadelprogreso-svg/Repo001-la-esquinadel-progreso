import React, { useState } from 'react';

export default function Dropdown({ trigger, children, align = 'right' }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>{trigger}</div>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                    <div style={{
                        position: 'absolute', zIndex: 50, marginTop: '4px', minWidth: '200px',
                        backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0',
                        right: align === 'right' ? 0 : 'auto',
                        left: align === 'left' ? 0 : 'auto',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {typeof children === 'function' ? children(() => setOpen(false)) : children}
                    </div>
                </>
            )}
        </div>
    );
}

export function DropdownItem({ children, icon: Icon, danger, onClick }) {
    return (
        <button onClick={onClick}
            style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', fontSize: '13px', textAlign: 'left',
                transition: 'background 100ms', cursor: 'pointer',
                color: danger ? '#DC2626' : '#1A1A2E',
                backgroundColor: 'transparent', border: 'none', fontFamily: 'inherit'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = danger ? '#FEE2E2' : '#EBF0F7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            {Icon && <Icon size={16} />}
            {children}
        </button>
    );
}
