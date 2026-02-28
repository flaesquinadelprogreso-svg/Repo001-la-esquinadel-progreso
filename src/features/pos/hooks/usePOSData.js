import { useState, useEffect } from 'react';
import api from '../../../api/client';

export function usePOSData(search, setSelectedAccountId) {
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [clients, setClients] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCajaOpen, setIsCajaOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const fetchData = async (searchQuery = '', isSearch = false) => {
        try {
            if (!isSearch) setLoading(true);
            const queryParams = searchQuery ? `?q=${searchQuery}` : `?limit=12`;

            if (isSearch) {
                // Solo recargar productos en búsquedas
                setIsSearching(true);
                const prodRes = await api.get(`/productos${queryParams}`);
                setProducts(prodRes.data);
            } else {
                const [recentRes, servRes, cliRes, cuentaRes] = await Promise.all([
                    api.get('/productos/recientes?limit=12'),
                    api.get('/servicios'),
                    api.get('/clientes'),
                    api.get('/cuentas-financieras')
                ]);

                setRecentItems(recentRes.data);
                setIsSearching(false);
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
                // Vuelve a mostrar productos recientes
                setIsSearching(false);
                api.get('/productos/recientes?limit=12').then(res => setRecentItems(res.data)).catch(() => {});
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const addClient = (client) => setClients(prev => [...prev, client]);

    return { products, services, recentItems, isSearching, clients, addClient, cuentas, loading, isCajaOpen, fetchData };
}
