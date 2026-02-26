import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Building2, ShoppingCart, Hammer, MapPin, Package, User, X, Landmark, History, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
    formatPesos,
    validatePaymentAmount,
    sanitizePaymentAmount,
    calculatePaymentsTotal,
    calculateRemainingBalance,
    canAddMorePayments,
    MAX_PAYMENT_AMOUNT
} from '../utils/currency';
import html2pdf from 'html2pdf.js';
import api from '../api/client';
import '../styles/pos-mobile.css';

// Helper to get total stock from stockUbicaciones
const getTotalStock = (product) => {
    return product.stockUbicaciones?.reduce((sum, sl) => sum + sl.stock, 0) || 0;
};

// Helper to get color for location
const ubicacionColor = (name) => {
    const colors = {
        'Bodega Principal': { bg: '#DBEAFE', fg: '#1D4ED8' },
        'Mostrador': { bg: '#D1FAE5', fg: '#059669' },
        'Vitrina': { bg: '#EDE9FE', fg: '#7C3AED' },
    };
    return colors[name] || { bg: '#F0F2F5', fg: '#6B7280' };
};

export default function POS() {
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [cashGiven, setCashGiven] = useState('');
    const [multiplePayments, setMultiplePayments] = useState([{ id: Date.now(), metodo: 'efectivo', monto: 0, cuentaId: '' }]);
    const [paymentErrors, setPaymentErrors] = useState({}); // Track validation errors per payment
    const [showConfirm, setShowConfirm] = useState(false);
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Credit sale state
    const [creditClient, setCreditClient] = useState('');
    const [creditDueDate, setCreditDueDate] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Financial accounts state
    const [cuentas, setCuentas] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Receipt state
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSale, setLastSale] = useState(null);

    // Location selection popup state
    const [showLocationPopup, setShowLocationPopup] = useState(null);
    const [locationQuantities, setLocationQuantities] = useState({});

    // Service edit popup state
    const [showServicePopup, setShowServicePopup] = useState(null);
    const [editServiceName, setEditServiceName] = useState('');
    const [editServicePrice, setEditServicePrice] = useState('');

    // IVA Rate State
    const [ivaTasa, setIvaTasa] = useState(19);

    // Global History Navigation
    const navigate = useNavigate();
    const [loadingHistory, setLoadingHistory] = useState(false); // Just kept to prevent break errors in case removed partially
    const [selectedVenta, setSelectedVenta] = useState(null);

    // Return State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItems, setReturnItems] = useState({});
    const [returnReason, setReturnReason] = useState('');
    const [returnMethod, setReturnMethod] = useState('efectivo');
    const [returnAccountId, setReturnAccountId] = useState('');
    const [processingReturn, setProcessingReturn] = useState(false);

    // Fetch data from API
    const fetchData = async (searchQuery = '', isSearch = false) => {
        try {
            if (!isSearch) setLoading(true);
            const queryParams = searchQuery ? `?q=${searchQuery}` : `?limit=12`;

            if (isSearch) {
                // Solo recargar productos en búsquedas para no bloquear ni enviar requests innecesarios y mantener el focus
                const prodRes = await api.get(`/productos${queryParams}`);
                setProducts(prodRes.data);
            } else {
                const [prodRes, servRes, cliRes, cuentaRes] = await Promise.all([
                    api.get(`/productos${queryParams}`),
                    api.get('/servicios'),
                    api.get('/clientes'),
                    api.get('/cuentas-financieras')
                ]);

                setProducts(prodRes.data);
                setServices(servRes.data);
                setClients(cliRes.data);
                setCuentas(cuentaRes.data);

                // Default select first 'caja' for cash payments if none selected
                const defaultCaja = cuentaRes.data.find(c => c.tipo === 'caja');
                if (defaultCaja) setSelectedAccountId(defaultCaja.id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            if (!isSearch) setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect for remote search with debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search.trim() !== '') {
                fetchData(search, true);
            } else {
                fetchData('', true); // Vuelve al comportamiento por defecto sin mostrar spinner de carga
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

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
    }, [paymentMethod, cuentas]);

    // Fetch client purchase history
    const fetchClientHistory = async (clienteId) => {
        setLoadingHistory(true);
        try {
            const response = await api.get(`/clientes/${clienteId}/ventas`);
            if (response.data) {
                setClientHistory(response.data);
            }
        } catch (error) {
            console.error('Error fetching client history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Navigate to Global History
    const handleHistoryClick = () => {
        navigate('/historial-ventas');
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
    const processReturn = async () => {
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
                alert(`Devolución ${result.devolucion.numeroRecibo} procesada exitosamente.\n\nDocumento: ${result.devolucion.numeroRecibo}\nReferencia: ${result.devolucion.referencia}\nTotal devuelto: ${formatMoney(Math.abs(result.resumen.total))}`);
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

    // Filter products by search (ahora el backend hace el filtrado fuerte, pero mantenemos este por si acaso)
    const filteredProducts = products;

    // Filter services by search
    const filteredServices = services.filter(s =>
        s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        s.codigo?.toLowerCase().includes(search.toLowerCase())
    );

    // Filter clients for dropdown
    const filteredClients = clients.filter(c =>
        c.nombre?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.documento?.includes(clientSearch)
    );

    // Handle product click - show location popup
    const handleProductClick = (product) => {
        if (product.stockUbicaciones?.length > 0) {
            setShowLocationPopup(product);
            setLocationQuantities({});
        }
    };

    // Add product to cart from location popup
    const addToCart = (product, locationQuantities) => {
        const selectedLocations = Object.entries(locationQuantities)
            .filter(([_, qty]) => parseInt(qty) > 0)
            .map(([ubicacionId, qty]) => {
                const stockInfo = product.stockUbicaciones?.find(s => s.ubicacionId === parseInt(ubicacionId));
                return {
                    locationId: parseInt(ubicacionId),
                    locationName: stockInfo?.ubicacion?.nombre || 'Sin ubicación',
                    qty: parseInt(qty)
                };
            });

        if (selectedLocations.length === 0) return;

        setCart(prev => {
            const existingIdx = prev.findIndex(item => item.id === product.id && item.isProduct);
            const totalAddedQty = selectedLocations.reduce((sum, l) => sum + l.qty, 0);

            if (existingIdx >= 0) {
                const updated = [...prev];
                const item = { ...updated[existingIdx] };
                item.qty += totalAddedQty;

                // Merge distributions
                const newDistributions = [...item.distributions];
                selectedLocations.forEach(newLoc => {
                    const distIdx = newDistributions.findIndex(d => d.locationId === newLoc.locationId);
                    if (distIdx >= 0) {
                        newDistributions[distIdx].qty += newLoc.qty;
                    } else {
                        newDistributions.push(newLoc);
                    }
                });
                item.distributions = newDistributions;
                updated[existingIdx] = item;
                return updated;
            }

            return [...prev, {
                id: product.id,
                code: product.codigo,
                name: product.nombre,
                price: product.precio,
                qty: totalAddedQty,
                isProduct: true,
                distributions: selectedLocations
            }];
        });

        setShowLocationPopup(null);
        setLocationQuantities({});
    };

    // Handle service click - show edit popup
    const handleServiceClick = (service) => {
        setEditServiceName(service.nombre);
        setEditServicePrice(service.precio.toString());
        setShowServicePopup(service);
    };

    // Add service to cart
    const addServiceToCart = (service, editedName, editedPrice) => {
        setCart(prev => {
            const existingIdx = prev.findIndex(item =>
                item.id === service.id &&
                item.isService &&
                item.name === editedName &&
                item.price === parseInt(editedPrice)
            );

            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx].qty += 1;
                return updated;
            }

            return [...prev, {
                id: service.id,
                code: service.codigo,
                name: editedName,
                price: parseInt(editedPrice),
                qty: 1,
                isService: true
            }];
        });

        setShowServicePopup(null);
    };

    // Update quantity in cart
    const updateQty = (id, isService, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id && item.isService === isService) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return null;

                if (item.isProduct) {
                    // Update distributions (simplification: adjust the last location)
                    const updatedDist = [...item.distributions];
                    if (delta > 0) {
                        updatedDist[updatedDist.length - 1].qty += delta;
                    } else {
                        // Subtract from locations until delta is satisfied
                        let remainingToSubtract = Math.abs(delta);
                        for (let i = updatedDist.length - 1; i >= 0 && remainingToSubtract > 0; i--) {
                            const subtract = Math.min(updatedDist[i].qty, remainingToSubtract);
                            updatedDist[i].qty -= subtract;
                            remainingToSubtract -= subtract;
                        }
                        item.distributions = updatedDist.filter(d => d.qty > 0);
                    }
                    return { ...item, qty: newQty, distributions: updatedDist.filter(d => d.qty > 0) };
                }

                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    // Remove from cart
    const removeFromCart = (id, isService) => {
        setCart(prev => prev.filter(item => !(item.id === id && item.isService === isService)));
    };

    // Clear cart
    const clearCart = () => {
        setCart([]);
        setPaymentMethod('efectivo');
        setCashGiven('');
        setMultiplePayments([{ id: Date.now(), metodo: 'efectivo', monto: 0, cuentaId: '' }]);
        setPaymentErrors({});
        setCreditClient('');
        setCreditDueDate('');
        const defaultCaja = cuentas.find(c => c.tipo === 'caja');
        if (defaultCaja) setSelectedAccountId(defaultCaja.id);
    };

    // Calculate totals (Prices already include IVA)
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const subtotal = Math.round(total / (1 + (ivaTasa / 100)));
    const iva = total - subtotal;

    // Payment methods
    const methods = [
        { id: 'efectivo', label: 'Efectivo', icon: Banknote },
        { id: 'banco', label: 'Banco', icon: Landmark },
        { id: 'credito', label: 'Crédito', icon: User },
        { id: 'multiple', label: 'Múltiple', icon: CreditCard },
    ];

    // Receipt number is now generated by the backend
    const generateReceiptNumber = () => {
        return "Generando...";
    };

    // Generate PDF receipt
    const handleDownloadPDF = () => {
        const element = document.getElementById('receipt-content');
        const opt = {
            margin: 0,
            filename: `Recibo_${lastSale?.receiptNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: [80, 250], orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    // Confirm sale
    const confirmSale = async () => {
        if (cart.length === 0) return;

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
                        cantidad: dist.qty,
                        precioUnit: item.price,
                        subtotal: item.price * dist.qty,
                        locationId: dist.locationId
                    });
                });
            } else {
                flattenedItems.push({
                    productoId: null,
                    servicioId: item.id,
                    nombre: item.name,
                    codigo: item.code,
                    cantidad: item.qty,
                    precioUnit: item.price,
                    subtotal: item.price * item.qty,
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
                    cashReceived: paymentMethod === 'efectivo' ? (parseInt(cashGiven) || 0) : total,
                    change: paymentMethod === 'efectivo' ? (parseInt(cashGiven) || 0) - total : 0
                });
                setShowConfirm(false);
                setShowReceipt(true);
                clearCart();
                fetchData(); // Refresh stock
            }
        } catch (error) {
            console.error('Error creating sale:', error);
            alert(error?.response?.data?.error || 'Error al procesar la venta');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTop: '3px solid #1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>Sincronizando caja y productos locales...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div id="pos-root" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
            {/* Products Section */}
            <div id="pos-catalog" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Punto de Venta</h1>
                        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Selecciona productos para vender</p>
                    </div>
                    <Button variant="secondary" icon={History} onClick={handleHistoryClick}>Historia / Devoluciones</Button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Buscar productos o servicios..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                    />
                </div>

                {loading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                        Cargando productos...
                    </div>
                ) : (
                    <div id="pos-grid" style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', alignContent: 'start' }}>
                        {/* Products */}
                        {filteredProducts.map(product => {
                            const totalStock = getTotalStock(product);
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    style={{
                                        backgroundColor: '#fff',
                                        borderRadius: '10px',
                                        border: '1px solid #E5E7EB',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        opacity: totalStock <= 0 ? 0.5 : 1,
                                        transition: 'transform 0.1s, box-shadow 0.1s'
                                    }}
                                >
                                    <div style={{ height: '80px', backgroundColor: '#F3F4F6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                        {product.imagen ? (
                                            <img src={product.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                        ) : (
                                            <Package size={24} color="#9CA3AF" />
                                        )}
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {product.nombre}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{product.codigo}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>{formatPesos(product.precio)}</span>
                                        <span style={{ fontSize: '11px', backgroundColor: totalStock <= 5 ? '#FEF2F2' : '#F3F4F6', padding: '2px 6px', borderRadius: '4px', color: totalStock <= 5 ? '#EF4444' : '#6B7280' }}>
                                            Stock: {totalStock}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Services */}
                        {filteredServices.map(service => (
                            <div
                                key={`service-${service.id}`}
                                onClick={() => handleServiceClick(service)}
                                style={{
                                    backgroundColor: '#FFFBEB',
                                    borderRadius: '10px',
                                    border: '1px solid #FCD34D',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s, box-shadow 0.1s'
                                }}
                            >
                                <div style={{ height: '80px', backgroundColor: '#FEF3C7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                    <Hammer size={24} color="#D97706" />
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {service.nombre}
                                </div>
                                <div style={{ fontSize: '11px', color: '#D97706' }}>Servicio</div>
                                <div style={{ marginTop: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>{formatPesos(service.precio)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Section */}
            <div id="pos-cart" style={{ width: '380px', maxWidth: '380px', flexShrink: 0, backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Cart Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingCart size={20} color="#1A1A2E" />
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>Carrito</span>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} style={{ padding: '4px 8px', fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Cart Items */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>
                            <ShoppingCart size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p>Carrito vacío</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {cart.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    backgroundColor: item.isService ? '#FFFBEB' : '#F9FAFB',
                                    borderRadius: '10px',
                                    border: '1px solid',
                                    borderColor: item.isService ? '#FEF3C7' : '#F3F4F6'
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        backgroundColor: item.isService ? '#FEF3C7' : '#EEF2FF',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {item.isService ? <Hammer size={16} color="#D97706" /> : <Package size={16} color="#4F46E5" />}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#111827',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                            {formatPesos(item.price)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', padding: '2px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                        <button
                                            onClick={() => updateQty(item.id, item.isService, -1)}
                                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Minus size={10} />
                                        </button>
                                        <span style={{ fontSize: '13px', fontWeight: 700, width: '20px', textAlign: 'center' }}>{item.qty}</span>
                                        <button
                                            onClick={() => updateQty(item.id, item.isService, 1)}
                                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Plus size={10} />
                                        </button>
                                    </div>

                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', width: '80px', textAlign: 'right' }}>
                                        {formatPesos(item.price * item.qty)}
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item.id, item.isService)}
                                        style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', opacity: 0.6 }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payment Section */}
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
                                    onClick={openHistoryModal}
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
                        disabled={cart.length === 0}
                        style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                    >
                        Confirmar Venta
                    </Button>
                </div>
            </div>

            {/* Location Selection Popup */}
            {
                showLocationPopup && (
                    <Modal isOpen={true} onClose={() => setShowLocationPopup(null)} title="Seleccionar Ubicación">
                        <div style={{ minWidth: '380px' }}>
                            {/* Product Header */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E5E7EB' }}>
                                <div style={{ width: '60px', height: '60px', backgroundColor: '#EEF2FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {showLocationPopup.imagen ? (
                                        <img src={showLocationPopup.imagen} alt={showLocationPopup.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                    ) : (
                                        <Package size={32} color="#4F46E5" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                                        {showLocationPopup.nombre}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Ref: {showLocationPopup.codigo}</span>
                                        <span style={{ fontWeight: 700, color: '#10B981' }}>{formatPesos(showLocationPopup.precio)}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                                    ¿De qué ubicaciones desea extraer el producto?
                                </label>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {showLocationPopup.stockUbicaciones?.filter(s => s.stock > 0).map((s, idx) => {
                                        const locColor = ubicacionColor(s.ubicacion?.nombre);
                                        return (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                backgroundColor: '#fff',
                                                borderRadius: '10px',
                                                border: '1px solid #E5E7EB',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px',
                                                        borderRadius: '8px',
                                                        backgroundColor: locColor.bg,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <MapPin size={18} color={locColor.fg} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.ubicacion?.nombre}</div>
                                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Disponible: <span style={{ fontWeight: 600, color: '#374151' }}>{s.stock} unds</span></div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={s.stock}
                                                        placeholder="0"
                                                        value={locationQuantities[s.ubicacionId] || ''}
                                                        onChange={(e) => {
                                                            const val = Math.min(parseInt(e.target.value) || 0, s.stock);
                                                            setLocationQuantities(prev => ({ ...prev, [s.ubicacionId]: val || '' }));
                                                        }}
                                                        style={{
                                                            width: '70px',
                                                            padding: '8px 12px',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '8px',
                                                            textAlign: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            outline: 'none',
                                                            transition: 'border-color 0.2s'
                                                        }}
                                                        onFocus={e => e.target.style.borderColor = '#4F46E5'}
                                                        onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(!showLocationPopup.stockUbicaciones || showLocationPopup.stockUbicaciones.filter(s => s.stock > 0).length === 0) && (
                                        <div style={{ textAlign: 'center', color: '#6B7280', padding: '30px 20px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                                            <Package size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                                            <p style={{ margin: 0, fontSize: '14px' }}>Este producto no tiene stock disponible en ninguna ubicación.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                                <Button variant="secondary" onClick={() => setShowLocationPopup(null)}>Cancelar</Button>
                                <Button
                                    onClick={() => addToCart(showLocationPopup, locationQuantities)}
                                    disabled={!Object.values(locationQuantities).some(qty => parseInt(qty) > 0)}
                                >
                                    <Plus size={18} style={{ marginRight: '6px' }} />
                                    Agregar al Carrito
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Service Edit Popup */}
            {
                showServicePopup && (
                    <Modal isOpen={true} onClose={() => setShowServicePopup(null)} title="Agregar Servicio">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '350px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre del servicio</label>
                                <input
                                    type="text"
                                    value={editServiceName}
                                    onChange={(e) => setEditServiceName(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Precio</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                                    <input
                                        type="text"
                                        value={editServicePrice ? parseInt(editServicePrice).toLocaleString('es-CO') : ''}
                                        onChange={(e) => setEditServicePrice(e.target.value.replace(/\D/g, ''))}
                                        style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <Button variant="secondary" onClick={() => setShowServicePopup(null)}>Cancelar</Button>
                                <Button onClick={() => addServiceToCart(showServicePopup, editServiceName, editServicePrice)}>Agregar</Button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Confirm Modal */}
            {
                showConfirm && (
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
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && lastSale && (
                    <Modal isOpen={true} onClose={() => setShowReceipt(false)} title="Recibo">
                        <div>
                            <div id="receipt-content" style={{ width: '260px', padding: '15px', backgroundColor: '#fff', margin: '0 auto', color: '#000', fontFamily: "'Courier New', Courier, monospace" }}>
                                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 5px 0' }}>MI EMPRESA</h2>
                                    <p style={{ fontSize: '11px', margin: 0 }}>NIT: 900123456-1</p>
                                    <p style={{ fontSize: '13px', fontWeight: 700, margin: '8px 0 0 0' }}>Recibo #{lastSale.receiptNumber}</p>
                                </div>

                                <div style={{ borderTop: '1px dashed #E5E7EB', borderBottom: '1px dashed #E5E7EB', padding: '12px 0 8px 0', marginBottom: '12px' }}>
                                    {/* Table Header */}
                                    <div style={{ display: 'flex', fontWeight: 800, fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                                        <div style={{ width: '35px' }}>CANT</div>
                                        <div style={{ flex: 1, paddingLeft: '8px' }}>DESCRIPCION</div>
                                        <div style={{ width: '70px', textAlign: 'right' }}>TOTAL</div>
                                    </div>

                                    {/* Items */}
                                    {lastSale.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', marginBottom: '8px', fontSize: '11px', fontWeight: 600 }}>
                                            <div style={{ width: '35px', paddingTop: '2px' }}>{item.qty}</div>
                                            <div style={{ flex: 1, paddingLeft: '8px', paddingRight: '4px', wordBreak: 'break-word' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ width: '70px', textAlign: 'right', paddingTop: '2px' }}>
                                                {formatPesos(item.price * item.qty)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                                        <span>SUBTOTAL:</span>
                                        <span>{formatPesos(lastSale.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                                        <span>IVA:</span>
                                        <span>{formatPesos(lastSale.iva)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '8px' }}>
                                        <span>TOTAL:</span>
                                        <span>{formatPesos(lastSale.total)}</span>
                                    </div>
                                </div>

                                {lastSale.paymentMethod === 'efectivo' && lastSale.cashReceived > 0 && (
                                    <div style={{ backgroundColor: '#F3F4F6', padding: '8px', borderRadius: '4px', fontSize: '12px', marginTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '4px' }}>
                                            <span>EFECTIVO:</span>
                                            <span>{formatPesos(lastSale.cashReceived)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                                            <span>CAMBIO:</span>
                                            <span>{formatPesos(lastSale.change)}</span>
                                        </div>
                                    </div>
                                )}

                                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', fontWeight: 600 }}>
                                    <p style={{ margin: '0 0 4px 0' }}>¡GRACIAS POR SU COMPRA!</p>
                                    <p style={{ margin: 0 }}>{new Date().toLocaleString()}</p>
                                </div>

                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', padding: '0 20px', paddingBottom: '20px' }}>
                                <Button onClick={handleDownloadPDF} style={{ flex: 1, backgroundColor: '#10B981', color: '#fff', borderColor: '#10B981' }}>
                                    Descargar PDF
                                </Button>
                                <Button onClick={() => setShowReceipt(false)} style={{ flex: 1 }} variant="secondary">Cerrar</Button>
                            </div>
                        </div>
                    </Modal>
                )
            }



            {/* Return Modal */}
            {
                showReturnModal && selectedVenta && (
                    <Modal isOpen={true} onClose={() => setShowReturnModal(false)} title={`Devolución - Recibo ${selectedVenta.numeroRecibo}`} size="lg">
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
                                <Button variant="secondary" onClick={() => setShowReturnModal(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={processReturn}
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
                )
            }
        </div >
    );
}
