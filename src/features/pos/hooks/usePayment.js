import { useState, useEffect } from 'react';
import api from '../../../api/client';
import {
    formatPesos,
    parseCurrency,
    validatePaymentAmount,
    sanitizePaymentAmount,
    calculatePaymentsTotal,
    MAX_PAYMENT_AMOUNT
} from '../../../utils/currency';
import { usePersistedState, clearPersistedModule } from '../../../hooks/usePersistedState';

export function usePayment({ cart, total, subtotal, iva, ivaTasa, cuentas, selectedAccountId, setSelectedAccountId, clearCart, fetchData, setLastSale, setShowConfirm, setShowReceipt }) {
    const [paymentMethod, setPaymentMethod, clearPaymentMethod] = usePersistedState('pos_paymentMethod', 'efectivo');
    const [cashGiven, setCashGiven, clearCashGiven] = usePersistedState('pos_cashGiven', '');
    const [multiplePayments, setMultiplePayments, clearMultiplePayments] = usePersistedState('pos_multiPayments', [{ id: Date.now(), metodo: 'efectivo', monto: 0, cuentaId: '' }]);
    const [paymentErrors, setPaymentErrors] = useState({});
    const [creditClient, setCreditClient, clearCreditClient] = usePersistedState('pos_creditClient', '');
    const [creditDueDate, setCreditDueDate, clearCreditDueDate] = usePersistedState('pos_creditDueDate', '');
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Sync selectedAccountId when paymentMethod changes
    useEffect(() => {
        if (!cuentas.length) return;

        if (paymentMethod === 'efectivo') {
            const firstCaja = cuentas.find(c => c.tipo === 'caja');
            if (firstCaja) setSelectedAccountId(firstCaja.id);
        } else if (paymentMethod === 'banco') {
            const currentIsBanco = cuentas.find(c => c.id === parseInt(selectedAccountId) && c.tipo === 'banco');
            if (!currentIsBanco) {
                const firstBanco = cuentas.find(c => c.tipo === 'banco');
                if (firstBanco) setSelectedAccountId(firstBanco.id);
            }
        } else if (paymentMethod === 'multiple') {
            const defaultCaja = cuentas.find(c => c.tipo === 'caja');
            setMultiplePayments([{ id: Date.now(), metodo: 'efectivo', monto: 0, cuentaId: defaultCaja ? defaultCaja.id : '' }]);
            setPaymentErrors({}); // Clear any previous errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, cuentas]);

    // Reset payment state (called when cart is cleared after a sale)
    const resetPayment = (currentCuentas) => {
        clearPaymentMethod();
        clearCashGiven();
        clearMultiplePayments();
        setPaymentErrors({});
        clearCreditClient();
        clearCreditDueDate();
        const defaultCaja = currentCuentas.find(c => c.tipo === 'caja');
        if (defaultCaja) setSelectedAccountId(defaultCaja.id);
    };

    // Confirm sale
    const confirmSale = async () => {
        if (cart.length === 0) return;
        if (isProcessing) return;
        setIsProcessing(true);

        // Validate credit payment
        const isCredit = paymentMethod === 'credito';
        const hasCreditInMultiple = paymentMethod === 'multiple' && multiplePayments.some(p => p.metodo === 'credito');

        if (isCredit || hasCreditInMultiple) {
            if (!creditClient) {
                alert('Debe seleccionar un cliente para la venta a crédito');
                return;
            }
            if (!creditDueDate) {
                alert('Debe seleccionar una fecha de vencimiento');
                return;
            }
        }

        // Validate bank account selection
        if (paymentMethod === 'banco' && !selectedAccountId) {
            alert('Debe seleccionar una cuenta bancaria');
            return;
        }

        if (paymentMethod === 'multiple') {
            // Use safe calculation for total
            const sum = calculatePaymentsTotal(multiplePayments);

            // Check for any validation errors first
            const hasErrors = Object.keys(paymentErrors).length > 0;
            if (hasErrors) {
                alert('Hay errores en los montos de pago. Por favor corríjalos antes de continuar.');
                return;
            }

            if (sum !== total) {
                alert(`La suma de los pagos múltiples (${formatPesos(sum)}) no coincide con el total de la venta (${formatPesos(total)})`);
                return;
            }
            for (const p of multiplePayments) {
                if ((p.metodo === 'efectivo' || p.metodo === 'banco') && !p.cuentaId) {
                    alert('Debe seleccionar una cuenta para cada pago en efectivo o banco');
                    return;
                }
                const monto = sanitizePaymentAmount(p.monto, MAX_PAYMENT_AMOUNT);
                if (monto <= 0) {
                    alert('Todos los pagos múltiples deben tener un monto mayor a 0');
                    return;
                }
            }
        }

        // Remove receiptNumber generation from frontend
        // Prepare sale data
        const flattenedItems = [];
        cart.forEach(item => {
            if (item.isProduct) {
                item.distributions.forEach(dist => {
                    flattenedItems.push({
                        productoId: item.id,
                        servicioId: null,
                        nombre: item.name,
                        codigo: item.code,
                        cantidad: parseFloat(dist.qty.toFixed(4)),
                        precioUnit: item.price,
                        subtotal: Math.round(item.price * dist.qty),
                        locationId: dist.locationId
                    });
                });
            } else {
                flattenedItems.push({
                    productoId: null,
                    servicioId: item.id,
                    nombre: item.name,
                    codigo: item.code,
                    cantidad: parseFloat(item.qty.toFixed(4)),
                    precioUnit: item.price,
                    subtotal: Math.round(item.price * item.qty),
                    esServicio: true
                });
            }
        });

        const saleData = {
            clienteId: (paymentMethod === 'credito' || hasCreditInMultiple) ? parseInt(creditClient) : (creditClient ? parseInt(creditClient) : null),
            items: flattenedItems,
            subtotal: subtotal,
            iva: iva,
            ivaTasa: ivaTasa,
            total: total,
            metodoPago: paymentMethod,
            cuentaId: (paymentMethod !== 'credito' && paymentMethod !== 'multiple') ? parseInt(selectedAccountId) : null,
            fechaVencimiento: (paymentMethod === 'credito' || hasCreditInMultiple) ? creditDueDate : null,
            ...(paymentMethod === 'multiple' && {
                pagos: multiplePayments.map(p => ({
                    metodo: p.metodo,
                    monto: sanitizePaymentAmount(p.monto, MAX_PAYMENT_AMOUNT),
                    cuentaId: (p.metodo !== 'credito' && p.cuentaId) ? parseInt(p.cuentaId) : null
                }))
            })
        };

        try {
            const response = await api.post('/ventas', saleData);

            if (response.data) {
                const sale = response.data;
                setLastSale({
                    ...sale,
                    items: cart,
                    receiptNumber: sale.numeroRecibo,
                    paymentMethod: paymentMethod,
                    cashReceived: paymentMethod === 'efectivo' ? (parseCurrency(cashGiven) || 0) : total,
                    change: paymentMethod === 'efectivo' ? (parseCurrency(cashGiven) || 0) - total : 0
                });
                setShowConfirm(false);
                setShowReceipt(true);
                clearCart();
                fetchData(); // Refresh stock
            }
        } catch (error) {
            console.error('Error creating sale:', error);
            alert(error?.response?.data?.error || 'Error al procesar la venta');
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        paymentMethod,
        setPaymentMethod,
        cashGiven,
        setCashGiven,
        multiplePayments,
        setMultiplePayments,
        paymentErrors,
        setPaymentErrors,
        creditClient,
        setCreditClient,
        creditDueDate,
        setCreditDueDate,
        clientSearch,
        setClientSearch,
        showClientDropdown,
        setShowClientDropdown,
        resetPayment,
        confirmSale,
        isProcessing,
    };
}
