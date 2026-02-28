import React from 'react';
import { CreditCard, Banknote, User, Landmark, Trash2, Plus, AlertCircle, History } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import {
    formatPesos,
    validatePaymentAmount,
    sanitizePaymentAmount,
    calculatePaymentsTotal,
    calculateRemainingBalance,
    canAddMorePayments,
    MAX_PAYMENT_AMOUNT
} from '../../../utils/currency';

export default function PaymentPanel({
    // Totals
    total,
    subtotal,
    iva,
    ivaTasa,
    setIvaTasa,
    // Payment method
    paymentMethod,
    setPaymentMethod,
    cashGiven,
    setCashGiven,
    multiplePayments,
    setMultiplePayments,
    paymentErrors,
    setPaymentErrors,
    // Credit
    creditClient,
    setCreditClient,
    creditDueDate,
    setCreditDueDate,
    clientSearch,
    setClientSearch,
    showClientDropdown,
    setShowClientDropdown,
    // Accounts
    cuentas,
    selectedAccountId,
    setSelectedAccountId,
    // Cart/sale
    cart,
    isCajaOpen,
    clients,
    // Actions
    onConfirmClick,
    // Confirm modal
    showConfirm,
    setShowConfirm,
    confirmSale,
}) {
    const methods = [
        { id: 'efectivo', label: 'Efectivo', icon: Banknote },
        { id: 'banco', label: 'Banco', icon: Landmark },
        { id: 'credito', label: 'Crédito', icon: User },
        { id: 'multiple', label: 'Múltiple', icon: CreditCard },
    ];

    const filteredClients = clients.filter(c =>
        c.nombre?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.documento?.includes(clientSearch)
    );

    return (
        <div id="pos-payments" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                {/* Totals and tax selector */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Tasa de IVA:</span>
                        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '2px', borderRadius: '8px' }}>
                            {[0, 5, 19].map(tasa => (
                                <button
                                    key={tasa}
                                    onClick={() => setIvaTasa(tasa)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: ivaTasa === tasa ? '#fff' : 'transparent',
                                        color: ivaTasa === tasa ? '#111827' : '#6B7280',
                                        boxShadow: ivaTasa === tasa ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.1s'
                                    }}
                                >
                                    {tasa}%
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                        <span>Subtotal</span>
                        <span>{formatPesos(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                        <span>IVA ({ivaTasa}%)</span>
                        <span>{formatPesos(iva)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
                        <span>Total</span>
                        <span>{formatPesos(total)}</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {methods.map(method => (
                        <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            style={{
                                padding: '8px 4px',
                                borderRadius: '8px',
                                border: paymentMethod === method.id ? '2px solid #1E3A5F' : '1px solid #E5E7EB',
                                backgroundColor: paymentMethod === method.id ? '#F0F7FF' : '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                                minHeight: '60px',
                                justifyContent: 'center'
                            }}
                        >
                            <method.icon size={18} color={paymentMethod === method.id ? '#1E3A5F' : '#9CA3AF'} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: paymentMethod === method.id ? '#1E3A5F' : '#6B7280' }}>
                                {method.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Bank Account Selection */}
                {paymentMethod === 'banco' && (
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Seleccionar Banco / Cuenta</label>
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                        >
                            <option value="">Seleccione cuenta...</option>
                            {cuentas.filter(c => c.tipo === 'banco').map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Cash received and change */}
                {paymentMethod === 'efectivo' && (
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Efectivo recibido</label>
                        <input
                            type="number"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="0"
                        />
                        {parseInt(cashGiven) >= total && (
                            <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#DCFCE7', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: '#16A34A', textAlign: 'center' }}>
                                CAMBIO: {formatPesos(parseInt(cashGiven) - total)}
                            </div>
                        )}
                    </div>
                )}

                {/* Credit Fields */}
                {(paymentMethod === 'credito' || (paymentMethod === 'multiple' && multiplePayments.some(p => p.metodo === 'credito'))) && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Cliente para crédito</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Escriba nombre para buscar..."
                                    value={clientSearch}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value);
                                        setShowClientDropdown(e.target.value.length >= 3);
                                    }}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                                />
                                {showClientDropdown && clientSearch.length >= 3 && filteredClients.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px', maxHeight: '200px', overflow: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                        {filteredClients.map(client => (
                                            <div
                                                key={client.id}
                                                onClick={() => {
                                                    setCreditClient(client.id);
                                                    setClientSearch(client.nombre);
                                                    setShowClientDropdown(false);
                                                }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                            >
                                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{client.nombre}</div>
                                                <div style={{ fontSize: '11px', color: '#6B7280' }}>{client.documento}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Fecha de vencimiento</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                    type="date"
                                    value={creditDueDate}
                                    onChange={(e) => setCreditDueDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                                />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[30, 60, 90].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => {
                                                const date = new Date();
                                                date.setDate(date.getDate() + days);
                                                setCreditDueDate(date.toISOString().split('T')[0]);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                fontSize: '11px',
                                                backgroundColor: '#F3F4F6',
                                                color: '#374151',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            }}
                                        >
                                            +{days} días
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Multiple Payments */}
                {paymentMethod === 'multiple' && (
                    <div style={{
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        marginBottom: '16px',
                        padding: '16px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            gap: '8px',
                            minWidth: 0
                        }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>Pagos Múltiples</span>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: calculatePaymentsTotal(multiplePayments) >= total ? '#10B981' : '#EF4444',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minWidth: 0,
                                flex: '1 1 auto',
                                textAlign: 'right'
                            }}>
                                <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Total: {formatPesos(calculatePaymentsTotal(multiplePayments))} / {formatPesos(total)}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                            {multiplePayments.map((pago, index) => {
                                const remainingBalance = calculateRemainingBalance(total, multiplePayments, index);
                                const hasError = paymentErrors[pago.id];

                                return (
                                    <div key={pago.id} style={{ minWidth: 0 }}>
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            alignItems: 'center',
                                            minWidth: 0,
                                            width: '100%'
                                        }}>
                                            <select
                                                value={pago.metodo}
                                                onChange={(e) => {
                                                    const newMetodo = e.target.value;
                                                    const targetCuenta = cuentas.find(c => newMetodo === 'efectivo' ? c.tipo === 'caja' : c.tipo === 'banco');
                                                    setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, metodo: newMetodo, cuentaId: targetCuenta ? targetCuenta.id : '' } : p));
                                                }}
                                                style={{
                                                    flex: '1 1 0px',
                                                    minWidth: 0,
                                                    maxWidth: '120px',
                                                    padding: '8px',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <option value="efectivo">Efectivo</option>
                                                <option value="banco">Banco</option>
                                                <option value="credito">Crédito</option>
                                            </select>

                                            {(pago.metodo === 'efectivo' || pago.metodo === 'banco') && (
                                                <select
                                                    value={pago.cuentaId}
                                                    onChange={(e) => setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, cuentaId: e.target.value } : p))}
                                                    style={{
                                                        flex: '2 1 0px',
                                                        minWidth: 0,
                                                        maxWidth: '160px',
                                                        padding: '8px',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        boxSizing: 'border-box',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    <option value="">Cuenta...</option>
                                                    {cuentas.filter(c => pago.metodo === 'efectivo' ? c.tipo === 'caja' : c.tipo === 'banco').map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {pago.metodo === 'credito' && (
                                                <div style={{
                                                    flex: '2 1 0px',
                                                    minWidth: 0,
                                                    maxWidth: '160px',
                                                    padding: '8px',
                                                    fontSize: '12px',
                                                    color: '#6B7280',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    Cobro a cliente
                                                </div>
                                            )}

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={pago.monto}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value;

                                                    // Allow empty input
                                                    if (rawValue === '' || rawValue === '-') {
                                                        setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, monto: rawValue } : p));
                                                        setPaymentErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors[pago.id];
                                                            return newErrors;
                                                        });
                                                        return;
                                                    }

                                                    // Validate the input
                                                    const validation = validatePaymentAmount(rawValue, remainingBalance);

                                                    if (!validation.valid) {
                                                        setPaymentErrors(prev => ({ ...prev, [pago.id]: validation.error }));
                                                        // Still update the state with raw value for user to correct
                                                        setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, monto: rawValue } : p));
                                                        return;
                                                    }

                                                    // Clear any previous error
                                                    setPaymentErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors[pago.id];
                                                        return newErrors;
                                                    });

                                                    // If value was adjusted (too large), use the adjusted value
                                                    if (validation.adjusted) {
                                                        setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, monto: validation.value } : p));
                                                    } else {
                                                        setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, monto: rawValue } : p));
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    // On blur, sanitize and finalize the value
                                                    const sanitized = sanitizePaymentAmount(e.target.value, remainingBalance);
                                                    setMultiplePayments(prev => prev.map((p, i) => i === index ? { ...p, monto: sanitized } : p));
                                                    setPaymentErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors[pago.id];
                                                        return newErrors;
                                                    });
                                                }}
                                                placeholder={`Max: ${formatPesos(remainingBalance)}`}
                                                style={{
                                                    flex: '1 1 0px',
                                                    minWidth: 0,
                                                    maxWidth: '120px',
                                                    padding: '8px',
                                                    border: hasError ? '2px solid #EF4444' : '1px solid #E5E7EB',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    backgroundColor: hasError ? '#FEF2F2' : '#fff',
                                                    boxSizing: 'border-box'
                                                }}
                                            />

                                            <button
                                                onClick={() => {
                                                    setMultiplePayments(prev => prev.filter((_, i) => i !== index));
                                                    setPaymentErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors[pago.id];
                                                        return newErrors;
                                                    });
                                                }}
                                                style={{
                                                    flex: '0 0 auto',
                                                    padding: '8px',
                                                    color: '#EF4444',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    opacity: multiplePayments.length > 1 ? 1 : 0.5
                                                }}
                                                disabled={multiplePayments.length === 1}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        {hasError && (
                                            <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <AlertCircle size={12} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hasError}</span>
                                            </div>
                                        )}
                                        {remainingBalance > 0 && !hasError && (
                                            <div style={{ color: '#6B7280', fontSize: '11px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                Saldo: {formatPesos(remainingBalance)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => {
                                // Check if total is already covered
                                if (!canAddMorePayments(total, multiplePayments)) {
                                    alert('El total de la venta ya está cubierto. No se pueden agregar más pagos.');
                                    return;
                                }

                                const defaultCaja = cuentas.find(c => c.tipo === 'caja');
                                const newPayment = {
                                    id: Date.now(),
                                    metodo: 'efectivo',
                                    monto: 0,
                                    cuentaId: defaultCaja ? defaultCaja.id : ''
                                };
                                setMultiplePayments(prev => [...prev, newPayment]);
                            }}
                            disabled={!canAddMorePayments(total, multiplePayments)}
                            style={{
                                marginTop: '12px',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: canAddMorePayments(total, multiplePayments) ? '#4F46E5' : '#9CA3AF',
                                backgroundColor: canAddMorePayments(total, multiplePayments) ? '#EEF2FF' : '#F3F4F6',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: canAddMorePayments(total, multiplePayments) ? 'pointer' : 'not-allowed',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Plus size={14} /> Agregar pago
                        </button>
                    </div>
                )}

                {/* Client Selection for History/Returns (always visible if not credit) */}
                {!(paymentMethod === 'credito' || (paymentMethod === 'multiple' && multiplePayments.some(p => p.metodo === 'credito'))) && (
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>
                            Cliente (opcional - para historial/devoluciones)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Buscar cliente por nombre o documento..."
                                value={clientSearch}
                                onChange={(e) => {
                                    setClientSearch(e.target.value);
                                    setShowClientDropdown(e.target.value.length >= 2);
                                }}
                                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                            />
                            {showClientDropdown && clientSearch.length >= 2 && filteredClients.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px', maxHeight: '200px', overflow: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                    {filteredClients.map(client => (
                                        <div
                                            key={client.id}
                                            onClick={() => {
                                                setCreditClient(client.id);
                                                setClientSearch(client.nombre);
                                                setShowClientDropdown(false);
                                            }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{client.nombre}</div>
                                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{client.documento}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Purchase History Button */}
                        {creditClient && (
                            <button
                                onClick={onConfirmClick}
                                style={{
                                    marginTop: '8px',
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#EEF2FF',
                                    color: '#4F46E5',
                                    border: '1px solid #C7D2FE',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <History size={16} />
                                Ver Historial de Compras
                            </button>
                        )}
                    </div>
                )}

                {/* Confirm Button */}
                <Button
                    onClick={() => setShowConfirm(true)}
                    disabled={cart.length === 0 || !isCajaOpen}
                    style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                >
                    {isCajaOpen ? 'Confirmar Venta' : 'Caja Cerrada (Abre en Caja y Bancos)'}
                </Button>
            </div>

            {/* Confirm Modal */}
            {showConfirm && (
                <Modal isOpen={true} onClose={() => setShowConfirm(false)} title="Confirmar Venta">
                    <div style={{ minWidth: '400px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Subtotal:</span>
                                <span>{formatPesos(subtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>IVA (19%):</span>
                                <span>{formatPesos(iva)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
                                <span>Total:</span>
                                <span>{formatPesos(total)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancelar</Button>
                            <Button onClick={confirmSale}>Confirmar</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
