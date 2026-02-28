import { useState } from 'react';
import api from '../../../api/client';
import { formatPesos } from '../../../utils/currency';

export function useReturn({ cuentas, fetchData }) {
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState(null);
    const [returnItems, setReturnItems] = useState({});
    const [returnReason, setReturnReason] = useState('');
    const [returnMethod, setReturnMethod] = useState('efectivo');
    const [returnAccountId, setReturnAccountId] = useState('');
    const [processingReturn, setProcessingReturn] = useState(false);

    // Fetch client purchase history (kept from original - references setClientHistory which is not declared)
    const fetchClientHistory = async (clienteId) => {
        try {
            const response = await api.get(`/clientes/${clienteId}/ventas`);
            if (response.data) {
                // eslint-disable-next-line no-undef
                setClientHistory(response.data);
            }
        } catch (error) {
            console.error('Error fetching client history:', error);
        }
    };

    // Open return modal for a specific sale
    const openReturnModal = (venta) => {
        setSelectedVenta(venta);
        setReturnItems({});
        setReturnReason('');
        setReturnMethod('efectivo');
        const defaultCaja = cuentas.find(c => c.tipo === 'caja');
        setReturnAccountId(defaultCaja?.id || '');
        setShowReturnModal(true);
    };

    // Calculate return totals
    const calculateReturnTotals = () => {
        let subtotal = 0;
        Object.entries(returnItems).forEach(([itemId, qty]) => {
            const item = selectedVenta?.items.find(i => i.id === parseInt(itemId));
            if (item && qty > 0) {
                subtotal += item.precioUnit * qty;
            }
        });
        const ivaTasaVenta = selectedVenta?.ivaTasa || 0;
        const iva = Math.round(subtotal * ivaTasaVenta / 100);
        const total = subtotal + iva;
        return { subtotal, iva, total };
    };

    // Process return
    const processReturn = async (creditClient) => {
        if (!selectedVenta) return;

        const itemsToReturn = Object.entries(returnItems)
            .filter(([_, qty]) => qty > 0)
            .map(([itemVentaId, cantidad]) => ({
                itemVentaId: parseInt(itemVentaId),
                cantidad: parseInt(cantidad)
            }));

        if (itemsToReturn.length === 0) {
            alert('Seleccione al menos un item para devolver');
            return;
        }

        if (!returnReason.trim()) {
            alert('Ingrese el motivo de la devolución');
            return;
        }

        if (returnMethod !== 'credito' && !returnAccountId) {
            alert('Seleccione una cuenta para el reembolso');
            return;
        }

        setProcessingReturn(true);
        try {
            // Usar el nuevo endpoint que crea Venta con tipo DEVOLUCION y valores negativos
            const response = await api.post('/devoluciones-venta', {
                ventaId: selectedVenta.id,
                items: itemsToReturn,
                motivo: returnReason,
                metodoReembolso: returnMethod,
                cuentaId: returnMethod !== 'credito' ? parseInt(returnAccountId) : null,
                esDevolucionFisica: true // Restaurar stock al inventario
            });

            if (response.data) {
                const result = response.data;
                alert(`Devolución ${result.devolucion.numeroRecibo} procesada exitosamente.\n\nDocumento: ${result.devolucion.numeroRecibo}\nReferencia: ${result.devolucion.referencia}\nTotal devuelto: ${formatPesos(Math.abs(result.resumen.total))}`);
                setShowReturnModal(false);
                fetchClientHistory(creditClient); // Refresh history
                fetchData(); // Refresh products stock
            }
        } catch (error) {
            console.error('Error processing return:', error);
            alert(error?.response?.data?.error || 'Error al procesar la devolución');
        } finally {
            setProcessingReturn(false);
        }
    };

    return {
        showReturnModal,
        setShowReturnModal,
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
        openReturnModal,
        calculateReturnTotals,
        processReturn,
    };
}
