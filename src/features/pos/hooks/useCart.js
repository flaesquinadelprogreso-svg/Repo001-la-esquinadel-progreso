import { useState } from 'react';

export function useCart() {
    const [cart, setCart] = useState([]);

    // Add product to cart from location popup
    const addToCart = (product, locationQuantities, overridePrice) => {
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

            const isPM = overridePrice && overridePrice !== product.precio;
            return [...prev, {
                id: product.id,
                code: product.codigo,
                name: product.nombre,
                price: overridePrice || product.precio,
                originalPrice: product.precio,
                precioMayor: product.precioMayor || null,
                isPrecioMayor: !!isPM,
                qty: totalAddedQty,
                isProduct: true,
                distributions: selectedLocations
            }];
        });
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

    // Toggle precio mayor on a cart item
    const togglePrecioMayor = (id) => {
        setCart(prev => prev.map(item => {
            if (item.id === id && item.isProduct && item.precioMayor) {
                const newIsPM = !item.isPrecioMayor;
                return { ...item, isPrecioMayor: newIsPM, price: newIsPM ? item.precioMayor : item.originalPrice };
            }
            return item;
        }));
    };

    // Clear cart (only clears cart items)
    const clearCart = () => {
        setCart([]);
    };

    return { cart, addToCart, addServiceToCart, updateQty, removeFromCart, togglePrecioMayor, clearCart };
}
