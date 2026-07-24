import React from 'react';

export default function Table({ columns, data, onRowClick }) {
    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #ECECEC' }}>
                        {columns.map((col) => (
                            <th key={col.key} style={{
                                padding: '14px 20px', textAlign: col.className?.includes('text-right') ? 'right' : col.className?.includes('text-center') ? 'center' : 'left',
                                fontSize: '12px', fontWeight: 600, color: '#6B7280',
                                textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={row.id || i}
                            onClick={() => onRowClick?.(row)}
                            style={{
                                borderBottom: i < data.length - 1 ? '1px solid #F3F3F3' : 'none',
                                cursor: onRowClick ? 'pointer' : 'auto',
                                transition: 'background-color 100ms'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {columns.map((col) => (
                                <td key={col.key} style={{
                                    padding: '16px 20px', color: '#111827',
                                    textAlign: col.className?.includes('text-right') ? 'right' : col.className?.includes('text-center') ? 'center' : 'left',
                                    fontFamily: col.className?.includes('font-mono') ? 'monospace' : 'inherit',
                                    fontSize: col.className?.includes('text-xs') ? '12px' : '14px'
                                }}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} style={{ padding: '48px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                                No hay datos para mostrar
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
