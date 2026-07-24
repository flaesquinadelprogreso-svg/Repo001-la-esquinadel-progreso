import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const sizeWidths = { xs: '320px', sm: '448px', md: '512px', lg: '672px', xl: '768px', full: '960px' };

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)' }} />

            {/* Dialog */}
            <div style={{
                position: 'relative', backgroundColor: '#FFFFFF', borderRadius: '20px',
                boxShadow: '0 20px 40px rgba(17,24,39,0.14)',
                width: '100%',
                maxWidth: `min(calc(100vw - 32px), ${sizeWidths[size] || sizeWidths.md})`,
                maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                animation: 'modalIn 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', borderBottom: '1px solid #ECECEC'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>{title}</h3>
                    <button onClick={onClose} style={{
                        padding: '6px', borderRadius: '8px', border: 'none',
                        background: 'transparent', cursor: 'pointer', color: '#9CA3AF',
                        display: 'flex', transition: 'all 150ms'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.color = '#111827'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>

                {/* Footer */}
                {footer && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #ECECEC' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
