import { useState, useEffect } from 'react';
import api from '../../../api/client';

export function usePOSData(search, setSelectedAccountId) {
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [clients, setClients] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCajaOpen, setIsCajaOpen] = useState(false);

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
                if (defaultCaja) {
                    if (setSelectedAccountId) setSelectedAccountId(defaultCaja.id);
                    // Check if register is open
                    try {
                        const cierreRes = await api.get(`/cierres/hoy?cuentaId=${defaultCaja.id}`);
                        setIsCajaOpen(cierreRes.data && !!cierreRes.data.activo);
                    } catch (e) {
                        console.error('Error checking register status', e);
                        setIsCajaOpen(false);
                    }
                } else {
                    setIsCajaOpen(false); // No register exists
                }
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
            if (search && search.trim() !== '') {
                fetchData(search, true);
            } else {
                fetchData('', true); // Vuelve al comportamiento por defecto sin mostrar spinner de carga
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return { products, services, clients, cuentas, loading, isCajaOpen, fetchData };
}
