import React from 'react';
import { Banknote, Landmark, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPesos } from '../../../utils/currency';

export default function ReturnModal({
    selectedVenta,
    returnItems,
    setReturnItems,
    returnReason,
    setReturnReason,
    returnMethod,
    setReturnMethod,
    returnAccountId,
    setReturnAccountId,
    processingReturn,
    calculateReturnTotals,
    processReturn,
    onClose,
    cuentas,
    creditClient,
}) {
    if (!selectedVenta) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Devolución - Recibo ${selectedVenta.numeroRecibo}`} size="lg">
            <div style={{ minWidth: '600px', maxWidth: '800px' }}>
                {/* Items to return */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>
                            Seleccione los items a devolver:
                        </label>
                        <button
                            onClick={() => {
                                const all = {};
                                selectedVenta.items.forEach(item => {
                                    const disponible = item.cantidad - (item.cantidadDevuelta || 0);
                                    if (disponible > 0) all[item.id] = disponible;
                                });
                                setReturnItems(all);
                            }}
                            style={{ padding: '4px 12px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '4px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 500 }}
                        >
                            Devolver Todo
                        </button>
                    </div>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <th style={{ textAlign: 'left', padding: '10px' }}>Producto</th>
                                        <th style={{ textAlign: 'center', padding: '10px', width: '80px' }}>Disponible</th>
                                        <th style={{ textAlign: 'center', padding: '10px', width: '120px' }}>Devolver</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedVenta.items.map((item) => {
                                        const disponible = item.cantidad - (item.cantidadDevuelta || 0);
                                        const currentReturn = returnItems[item.id] || 0;
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '10px' }}>
                                                    <div style={{ fontWeight: 500 }}>{item.nombre}</div>
                                                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                                        {formatPesos(item.precioUnit)} c/u
                                                        {item.esServicio && <span style={{ marginLeft: '8px', color: '#D97706' }}>Servicio</span>}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '10px', fontWeight: 600 }}>
                                                    {disponible}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '10px' }}>
                                                    {disponible > 0 ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            <button
                                                                onClick={() => setReturnItems(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                                                style={{ padding: '2px 8px', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#F3F4F6', cursor: 'pointer' }}
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={disponible}
                                                                value={currentReturn || ''}
                                                                onChange={(e) => {
                                                                    const val = Math.min(parseInt(e.target.value) || 0, disponible);
                                                                    setReturnItems(prev => ({
                                                                        ...prev,
                                                                        [item.id]: val || 0
                                                                    }));
                                                                }}
                                                                style={{
                                                                    width: '50px',
                                                                    padding: '4px',
                                                                    border: '1px solid #D1D5DB',
                                                                    borderRadius: '4px',
                                                                    textAlign: 'center',
                                                                    fontSize: '13px',
                                                                    MozAppearance: 'textfield'
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => setReturnItems(prev => ({ ...prev, [item.id]: Math.min(disponible, (prev[item.id] || 0) + 1) }))}
                                                                style={{ padding: '2px 8px', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#F3F4F6', cursor: 'pointer' }}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9CA3AF' }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Return Totals */}
                {Object.values(returnItems).some(qty => qty > 0) && (
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0F7FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: '#0369A1' }}>Subtotal a devolver:</span>
                            <span style={{ fontWeight: 600 }}>{formatPesos(calculateReturnTotals().subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: '#0369A1' }}>IVA:</span>
                            <span style={{ fontWeight: 600 }}>{formatPesos(calculateReturnTotals().iva)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', borderTop: '1px solid #BAE6FD', paddingTop: '8px', marginTop: '8px' }}>
                            <span>Total a devolver:</span>
                            <span>{formatPesos(calculateReturnTotals().total)}</span>
                        </div>
                    </div>
                )}

                {/* Return Reason */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                        Motivo de la devolución: *
                    </label>
                    <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Ej: El cliente cambió de opinión, producto defectuoso..."
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minHeight: '60px',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Refund Method */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                        Método de reembolso:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                            { id: 'banco', label: 'Transferencia', icon: Landmark },
                            { id: 'credito', label: 'Nota Crédito', icon: CreditCard }
                        ].map(method => (
                            <button
                                key={method.id}
                                onClick={() => setReturnMethod(method.id)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: returnMethod === method.id ? '2px solid #1E3A5F' : '1px solid #E5E7EB',
                                    backgroundColor: returnMethod === method.id ? '#F0F7FF' : '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <method.icon size={18} color={returnMethod === method.id ? '#1E3A5F' : '#6B7280'} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: returnMethod === method.id ? '#1E3A5F' : '#6B7280' }}>
                                    {method.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Account Selection for Bank */}
                {returnMethod === 'banco' && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                            Cuenta bancaria:
                        </label>
                        <select
                            value={returnAccountId}
                            onChange={(e) => setReturnAccountId(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                        >
                            <option value="">Seleccione cuenta...</option>
                            {cuentas.filter(c => c.tipo === 'banco').map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Cash Account Selection */}
                {returnMethod === 'efectivo' && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                            Caja para el reembolso:
                        </label>
                        <select
                            value={returnAccountId}
                            onChange={(e) => setReturnAccountId(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                        >
                            <option value="">Seleccione caja...</option>
                            {cuentas.filter(c => c.tipo === 'caja').map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Warning for services */}
                {Object.entries(returnItems).some(([id, qty]) => {
                    const item = selectedVenta.items.find(i => i.id === parseInt(id));
                    return qty > 0 && item?.esServicio;
                }) && (
                    <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#FEF3C7', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '12px', color: '#92400E' }}>
                            <strong>Nota:</strong> Los servicios devueltos no restauran inventario, solo se procesa el reembolso monetario.
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => processReturn(creditClient)}
                        disabled={processingReturn || !Object.values(returnItems).some(qty => qty > 0) || !returnReason.trim()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {processingReturn ? (
                            'Procesando...'
                        ) : (
                            <>
                                <CheckCircle size={16} />
                                Procesar Devolución
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
