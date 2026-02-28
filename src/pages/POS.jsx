import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pos-mobile.css';

import { usePOSData } from '../features/pos/hooks/usePOSData';
import { useCart } from '../features/pos/hooks/useCart';
import { usePayment } from '../features/pos/hooks/usePayment';
import { useReturn } from '../features/pos/hooks/useReturn';

import CartPanel from '../features/pos/components/CartPanel';
import PaymentPanel from '../features/pos/components/PaymentPanel';
import ProductGrid from '../features/pos/components/ProductGrid';
import LocationPopup from '../features/pos/components/LocationPopup';
import ServicePopup from '../features/pos/components/ServicePopup';
import ReceiptModal from '../features/pos/components/ReceiptModal';
import ReturnModal from '../features/pos/components/ReturnModal';

export default function POS() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [ivaTasa, setIvaTasa] = useState(19);

    // Receipt / confirm modal state
    const [showConfirm, setShowConfirm] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSale, setLastSale] = useState(null);

    // Location selection popup state
    const [showLocationPopup, setShowLocationPopup] = useState(null);
    const [locationQuantities, setLocationQuantities] = useState({});

    // Service edit popup state
    const [showServicePopup, setShowServicePopup] = useState(null);
    const [editServiceName, setEditServiceName] = useState('');
    const [editServicePrice, setEditServicePrice] = useState('');

    // Just kept to prevent break errors in case removed partially
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Financial account selected (shared between usePOSData and usePayment)
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Data hook
    const { products, services, clients, cuentas, loading, isCajaOpen, fetchData } = usePOSData(search, setSelectedAccountId);

    // Cart hook
    const { cart, addToCart, addServiceToCart, updateQty, removeFromCart, clearCart: clearCartItems } = useCart();

    // Totals (computed here so usePayment can receive them)
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const subtotal = Math.round(total / (1 + (ivaTasa / 100)));
    const iva = total - subtotal;

    // Payment hook
    const payment = usePayment({
        cart,
        total,
        subtotal,
        iva,
        ivaTasa,
        cuentas,
        selectedAccountId,
        setSelectedAccountId,
        clearCart: () => {
            clearCartItems();
            payment.resetPayment(cuentas);
        },
        fetchData,
        setLastSale,
        setShowConfirm,
        setShowReceipt,
    });

    // Full clearCart: clears cart items + resets payment state
    const clearCart = () => {
        clearCartItems();
        payment.resetPayment(cuentas);
    };

    // Return hook
    const returnHook = useReturn({ cuentas, fetchData });

    // Handle product click - show location popup
    const handleProductClick = (product) => {
        if (product.stockUbicaciones?.length > 0) {
            setShowLocationPopup(product);
            setLocationQuantities({});
        }
    };

    // Handle service click - show edit popup
    const handleServiceClick = (service) => {
        setEditServiceName(service.nombre);
        setEditServicePrice(service.precio.toString());
        setShowServicePopup(service);
    };

    // Navigate to Global History
    const handleHistoryClick = () => {
        navigate('/historial-ventas');
    };

    // Generate PDF receipt — import dinámico para compatibilidad con Vite 7
    const handleDownloadPDF = async () => {
        const element = document.getElementById('receipt-content');
        const opt = {
            margin: 0,
            filename: `Recibo_${lastSale?.receiptNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: [80, 250], orientation: 'portrait' }
        };
        const { default: html2pdf } = await import('html2pdf.js');
        html2pdf().set(opt).from(element).save();
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
            {/* Columna Izquierda: Carrito */}
            <CartPanel
                cart={cart}
                clearCart={clearCart}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
            />

            {/* Columna Derecha: Pagos (arriba) + Productos (abajo) */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <PaymentPanel
                    total={total}
                    subtotal={subtotal}
                    iva={iva}
                    ivaTasa={ivaTasa}
                    setIvaTasa={setIvaTasa}
                    paymentMethod={payment.paymentMethod}
                    setPaymentMethod={payment.setPaymentMethod}
                    cashGiven={payment.cashGiven}
                    setCashGiven={payment.setCashGiven}
                    multiplePayments={payment.multiplePayments}
                    setMultiplePayments={payment.setMultiplePayments}
                    paymentErrors={payment.paymentErrors}
                    setPaymentErrors={payment.setPaymentErrors}
                    creditClient={payment.creditClient}
                    setCreditClient={payment.setCreditClient}
                    creditDueDate={payment.creditDueDate}
                    setCreditDueDate={payment.setCreditDueDate}
                    clientSearch={payment.clientSearch}
                    setClientSearch={payment.setClientSearch}
                    showClientDropdown={payment.showClientDropdown}
                    setShowClientDropdown={payment.setShowClientDropdown}
                    cuentas={cuentas}
                    selectedAccountId={selectedAccountId}
                    setSelectedAccountId={setSelectedAccountId}
                    cart={cart}
                    isCajaOpen={isCajaOpen}
                    clients={clients}
                    onConfirmClick={() => {}}
                    showConfirm={showConfirm}
                    setShowConfirm={setShowConfirm}
                    confirmSale={payment.confirmSale}
                />

                <ProductGrid
                    products={products}
                    services={services}
                    search={search}
                    onSearchChange={setSearch}
                    loading={false}
                    onProductClick={handleProductClick}
                    onServiceClick={handleServiceClick}
                    onHistoryClick={handleHistoryClick}
                />
            </div>

            {/* Location Selection Popup */}
            {showLocationPopup && (
                <LocationPopup
                    product={showLocationPopup}
                    locationQuantities={locationQuantities}
                    setLocationQuantities={setLocationQuantities}
                    onConfirm={(product, quantities) => {
                        addToCart(product, quantities);
                        setShowLocationPopup(null);
                        setLocationQuantities({});
                    }}
                    onClose={() => setShowLocationPopup(null)}
                />
            )}

            {/* Service Edit Popup */}
            {showServicePopup && (
                <ServicePopup
                    service={showServicePopup}
                    editName={editServiceName}
                    editPrice={editServicePrice}
                    setEditName={setEditServiceName}
                    setEditPrice={setEditServicePrice}
                    onConfirm={(service, name, price) => {
                        addServiceToCart(service, name, price);
                        setShowServicePopup(null);
                    }}
                    onClose={() => setShowServicePopup(null)}
                />
            )}

            {/* Receipt Modal */}
            {showReceipt && lastSale && (
                <ReceiptModal
                    sale={lastSale}
                    onClose={() => setShowReceipt(false)}
                    onDownloadPDF={handleDownloadPDF}
                />
            )}

            {/* Return Modal */}
            {returnHook.showReturnModal && returnHook.selectedVenta && (
                <ReturnModal
                    selectedVenta={returnHook.selectedVenta}
                    returnItems={returnHook.returnItems}
                    setReturnItems={returnHook.setReturnItems}
                    returnReason={returnHook.returnReason}
                    setReturnReason={returnHook.setReturnReason}
                    returnMethod={returnHook.returnMethod}
                    setReturnMethod={returnHook.setReturnMethod}
                    returnAccountId={returnHook.returnAccountId}
                    setReturnAccountId={returnHook.setReturnAccountId}
                    processingReturn={returnHook.processingReturn}
                    calculateReturnTotals={returnHook.calculateReturnTotals}
                    processReturn={returnHook.processReturn}
                    onClose={() => returnHook.setShowReturnModal(false)}
                    cuentas={cuentas}
                    creditClient={payment.creditClient}
                />
            )}
        </div>
    );
}
