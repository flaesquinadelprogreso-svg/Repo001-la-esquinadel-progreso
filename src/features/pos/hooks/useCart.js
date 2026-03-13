import { usePersistedState } from '../../../hooks/usePersistedState';

export function useCart() {
    const [cart, setCart, clearPersistedCart] = usePersistedState('pos_cart', []);

    // Add product to cart from location popup
    const addToCart = (product, locationQuantities, overridePrice) => {
        const selectedLocations = Object.entries(locationQuantities)
            .filter(([_, qty]) => parseFloat(qty) > 0)
            .map(([ubicacionId, qty]) => {
                const stockInfo = product.stockUbicaciones?.find(s => s.ubicacionId === parseInt(ubicacionId));
                return {
                    locationId: parseInt(ubicacionId),
                    locationName: stockInfo?.ubicacion?.nombre || 'Sin ubicación',
                    qty: parseFloat(qty)
                };
            });

        if (selectedLocations.length === 0) return;

        setCart(prev => {
            const existingIdx = prev.findIndex(item => item.id === product.id && item.isProduct);
            const totalAddedQty = selectedLocations.reduce((sum, l) => sum + l.qty, 0);

            if (existingIdx >= 0) {
                const updated = [...prev];
                const item = { ...updated[existingIdx] };
                item.qty = parseFloat((item.qty + totalAddedQty).toFixed(4));

                // Merge distributions
                const newDistributions = [...item.distributions];
                selectedLocations.forEach(newLoc => {
                    const distIdx = newDistributions.findIndex(d => d.locationId === newLoc.locationId);
                    if (distIdx >= 0) {
                        newDistributions[distIdx] = {
                            ...newDistributions[distIdx],
                            qty: parseFloat((newDistributions[distIdx].qty + newLoc.qty).toFixed(4))
                        };
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
                qty: parseFloat(totalAddedQty.toFixed(4)),
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
                updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + 1 };
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

    // Update quantity in cart - delta: +1 o -1, internamente usa step de 0.25
    const updateQty = (id, isService, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id && item.isService === isService) {
                // Servicios siempre en enteros, productos permiten 0.25
                const step = item.isService ? 1 : 0.25;
                const actualDelta = delta > 0 ? step : -step;
                const newQty = parseFloat((item.qty + actualDelta).toFixed(4));
                if (newQty <= 0) return null;

                if (item.isProduct) {
                    const updatedDist = [...item.distributions];
                    if (actualDelta > 0) {
                        updatedDist[updatedDist.length - 1] = {
                            ...updatedDist[updatedDist.length - 1],
                            qty: parseFloat((updatedDist[updatedDist.length - 1].qty + actualDelta).toFixed(4))
                        };
                    } else {
                        let remainingToSubtract = Math.abs(actualDelta);
                        for (let i = updatedDist.length - 1; i >= 0 && remainingToSubtract > 0.001; i--) {
                            const subtract = Math.min(updatedDist[i].qty, remainingToSubtract);
                            updatedDist[i] = { ...updatedDist[i], qty: parseFloat((updatedDist[i].qty - subtract).toFixed(4)) };
                            remainingToSubtract = parseFloat((remainingToSubtract - subtract).toFixed(4));
                        }
                    }
                    return { ...item, qty: newQty, distributions: updatedDist.filter(d => d.qty > 0.001) };
                }

                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    // Set quantity directly (typed by user)
    const setDirectQty = (id, isService, value, isEditing) => {
        setCart(prev => prev.map(item => {
            if (item.id === id && item.isService === isService) {
                if (isEditing) {
                    return { ...item, _editingQty: value };
                }
                const newQty = parseFloat(value) || 0;
                if (newQty <= 0) return null;
                const cleanItem = { ...item };
                delete cleanItem._editingQty;
                cleanItem.qty = parseFloat(newQty.toFixed(4));
                if (cleanItem.isProduct && cleanItem.distributions?.length > 0) {
                    // Adjust last distribution to match new total
                    const otherQty = cleanItem.distributions.slice(0, -1).reduce((s, d) => s + d.qty, 0);
                    const lastDist = { ...cleanItem.distributions[cleanItem.distributions.length - 1] };
                    lastDist.qty = Math.max(0, parseFloat((newQty - otherQty).toFixed(4)));
                    cleanItem.distributions = [...cleanItem.distributions.slice(0, -1), lastDist].filter(d => d.qty > 0.001);
                }
                return cleanItem;
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

    // Clear cart (clears cart items + localStorage)
    const clearCart = () => {
        clearPersistedCart();
    };

    return { cart, addToCart, addServiceToCart, updateQty, setDirectQty, removeFromCart, togglePrecioMayor, clearCart };
}
