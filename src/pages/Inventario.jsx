import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Grid3X3, List, Edit, AlertTriangle, Eye, Upload, X, Image, MapPin, ArrowRightLeft, PackagePlus, Trash2, MinusCircle, PlusCircle, FileSpreadsheet } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { formatPesos, parseCurrency, handleCurrencyChange } from '../utils/currency';
import * as XLSX from 'xlsx';

import api from '../api/client';
import '../styles/inventario-mobile.css';

// Helper to get total stock
const getTotalStock = (product) => {
    return product.stockUbicaciones?.reduce((sum, s) => sum + s.stock, 0) || 0;
};

// Location colors
const ubicacionColor = (name) => {
    const colors = {
        'Bodega Principal': '#3B82F6',
        'Mostrador': '#10B981',
        'Vitrina': '#8B5CF6',
    };
    return colors[name] || '#6B7280';
};

export default function Inventario() {
    const [view, setView] = useState('grid');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [ubicaciones, setUbicaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('productos');
    const [userPermisos, setUserPermisos] = useState([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 21; // 21 items por página

    // Modals
    const [showProductModal, setShowProductModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showStockPopup, setShowStockPopup] = useState(null);
    const [showTransferModal, setShowTransferModal] = useState(null);
    const [showEntryModal, setShowEntryModal] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');

    // Importación Excel
    const fileImportRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);

    // Edit product / service
    const [editProduct, setEditProduct] = useState(null);
    const [editService, setEditService] = useState(null);
    const [editTab, setEditTab] = useState('general');
    const fileInputRef = useRef(null);

    // Fetch user permissions
    useEffect(() => {
        api.get('/perfil').then(res => {
            const role = res.data?.role;
            if (role === 'admin') {
                setUserPermisos(['all']);
            } else {
                setUserPermisos(res.data?.permisos || []);
            }
        }).catch(() => {});
    }, []);

    const canDisminuir = userPermisos.includes('all') || userPermisos.includes('inventario_disminuir');

    // Fetch data from API
    const fetchData = async (currentPage = page, searchQuery = search) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            queryParams.append('page', currentPage);
            queryParams.append('limit', limit);
            if (searchQuery) queryParams.append('q', searchQuery);

            const [prodRes, servRes, ubiRes] = await Promise.all([
                api.get(`/productos?${queryParams.toString()}`).catch(() => null),
                api.get('/servicios').catch(() => null),
                api.get('/ubicaciones').catch(() => null)
            ]);

            if (prodRes?.data) {
                // Ahora prodRes.data puede tener { data: [...], meta: {...} } si mandamos ?page=
                if (prodRes.data.meta) {
                    setProducts(prodRes.data.data);
                    setTotalPages(prodRes.data.meta.totalPages || 1);
                } else {
                    setProducts(prodRes.data);
                    setTotalPages(1);
                }
            }
            if (servRes?.data) setServices(servRes.data);
            if (ubiRes?.data) setUbicaciones(ubiRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchData(page, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Handle search debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1); // Reset to page 1 on new search
            fetchData(1, search);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Get unique categories (esta lógica puede no ser 100% precisa si está paginado en backend, requiere un endpoint de categorías o asumir las vistas)
    const categories = ['Todas', ...new Set(products.map(p => p.categoria).filter(Boolean))];

    // Filter products (solo por categoría si está activa, la búsqueda de texto ya se hace en backend)
    const filteredProducts = products.filter(p => {
        const matchesCategory = categoryFilter === 'Todas' || p.categoria === categoryFilter;
        return matchesCategory && p.activo !== false;
    });

    // Filter services
    const filteredServices = services.filter(s => {
        return s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
            s.codigo?.toLowerCase().includes(search.toLowerCase());
    });

    // Combined items for unified list (Strict limit of exactly 'limit' items per page)
    const combinedItems = [
        ...filteredProducts.map(p => ({ ...p, type: 'product' })),
        ...(page === 1 ? filteredServices.map(s => ({ ...s, type: 'service' })) : [])
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, limit);

    // Open edit modal
    const openEdit = (product) => {
        setEditProduct({
            ...product,
            costo: product.costo || 0,
            stockMinimo: product.stockMinimo || 5,
            precioMayor: product.precioMayor || null,
            stockLocations: product.stockUbicaciones?.map(s => ({
                id: s.id,
                ubicacionId: s.ubicacionId,
                ubicacion: s.ubicacion?.nombre,
                stock: s.stock
            })) || []
        });
        setEditTab('general');
        setShowProductModal(true);
    };

    // Open new product modal
    const openNew = () => {
        setEditProduct({
            codigo: '',
            nombre: '',
            descripcion: '',
            precio: 0,
            costo: 0,
            stockMinimo: 5,
            precioMayor: null,
            categoria: '',
            imagen: null,
            stockLocations: []
        });
        setEditTab('general');
        setShowProductModal(true);
    };

    // Handle image change
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditProduct(prev => ({ ...prev, imagen: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Save product
    const handleSaveProduct = async () => {
        if (!editProduct.nombre || !editProduct.codigo) {
            alert('Por favor complete el nombre y código');
            return;
        }

        try {
            const url = editProduct.id
                ? `/productos/${editProduct.id}`
                : `/productos`;
            const method = editProduct.id ? 'PUT' : 'POST';

            const payload = {
                codigo: editProduct.codigo,
                nombre: editProduct.nombre,
                descripcion: editProduct.descripcion,
                precio: editProduct.precio,
                costo: editProduct.costo,
                stockMinimo: editProduct.stockMinimo,
                precioMayor: editProduct.precioMayor,
                categoria: editProduct.categoria,
                imagen: editProduct.imagen
            };

            const response = editProduct.id
                ? await api.put(`/productos/${editProduct.id}`, payload)
                : await api.post(`/productos`, payload);

            if (response.data) {
                fetchData();
                setShowProductModal(false);
                setEditProduct(null);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert(error?.response?.data?.error || 'Error al guardar producto');
        }
    };

    // Delete product
    const handleDeleteProduct = async (productId) => {
        if (!confirm('¿Está seguro de eliminar este producto?')) return;

        try {
            const response = await api.delete(`/productos/${productId}`);

            if (response.data) {
                fetchData();
                setShowProductModal(false);
                setEditProduct(null);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert(error?.response?.data?.error || 'Error al eliminar producto');
        }
    };

    // --- SERVICES ---

    const openNewService = () => {
        setEditService({
            codigo: 'SERVT1',
            nombre: '',
            descripcion: '',
            precio: 0
        });
        setShowServiceModal(true);
    };

    const openEditService = (service) => {
        setEditService({ ...service });
        setShowServiceModal(true);
    };

    const handleSaveService = async () => {
        if (!editService.nombre || !editService.codigo) {
            alert('Por favor complete el nombre y código');
            return;
        }

        try {
            const url = editService.id
                ? `/servicios/${editService.id}`
                : `/servicios`;
            const method = editService.id ? 'PUT' : 'POST';

            const payload = editService;

            const response = editService.id
                ? await api.put(`/servicios/${editService.id}`, payload)
                : await api.post(`/servicios`, payload);

            if (response.data) {
                fetchData();
                setShowServiceModal(false);
                setEditService(null);
            }
        } catch (error) {
            console.error('Error saving service:', error);
            alert(error?.response?.data?.error || 'Error al guardar servicio');
        }
    };

    const handleDeleteService = async (serviceId) => {
        if (!confirm('¿Está seguro de eliminar este servicio?')) return;

        try {
            const response = await api.delete(`/servicios/${serviceId}`);

            if (response.data) {
                fetchData();
                setShowServiceModal(false);
                setEditService(null);
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            alert(error?.response?.data?.error || 'Error al eliminar servicio');
        }
    };

    // Transfer stock
    const handleConfirmTransfer = async () => {
        if (!showTransferModal) return;

        const { product, originId, destId, quantity } = showTransferModal;
        const productId = product?.id;

        if (!originId || !destId || !quantity || quantity <= 0) {
            alert('Por favor complete todos los campos');
            return;
        }

        try {
            const response = await api.post(`/productos/${productId}/transferir`, {
                origenUbicacionId: parseInt(originId),
                destinoUbicacionId: parseInt(destId),
                cantidad: parseInt(quantity)
            });

            if (response.data) {
                fetchData();
                setShowTransferModal(null);
            }
        } catch (error) {
            console.error('Error transferring:', error);
            alert(error?.response?.data?.error || 'Error al transferir');
        }
    };

    // Add stock entry
    const handleConfirmEntry = async () => {
        if (!showEntryModal) return;

        const { productId, locationId, quantity } = showEntryModal;

        if (!locationId || !quantity || quantity <= 0) {
            alert('Por favor complete todos los campos');
            return;
        }

        try {
            const response = await api.post(`/productos/${productId}/entrada`, {
                ubicacionId: parseInt(locationId),
                cantidad: parseInt(quantity)
            });

            if (response.data) {
                fetchData();
                setShowEntryModal(null);
            }
        } catch (error) {
            console.error('Error adding stock:', error);
            alert(error?.response?.data?.error || 'Error al agregar stock');
        }
    };

    // Decrease stock
    const handleDecreaseStock = async () => {
        if (!editProduct || !editProduct.decreaseLocation || !editProduct.decreaseQty) {
            alert('Por favor complete todos los campos');
            return;
        }

        try {
            const response = await api.post(`/productos/${editProduct.id}/disminuir`, {
                ubicacionId: parseInt(editProduct.decreaseLocation),
                cantidad: parseInt(editProduct.decreaseQty)
            });

            if (response.data) {
                fetchData();
                setEditProduct(prev => ({ ...prev, decreaseLocation: '', decreaseQty: '' }));
            }
        } catch (error) {
            console.error('Error decreasing stock:', error);
            alert(error?.response?.data?.error || 'Error al disminuir stock');
        }
    };

    // Increase stock
    const handleIncreaseStock = async () => {
        if (!editProduct || !editProduct.increaseLocation || !editProduct.increaseQty) {
            alert('Por favor complete todos los campos');
            return;
        }

        try {
            const response = await api.post(`/productos/${editProduct.id}/entrada`, {
                ubicacionId: parseInt(editProduct.increaseLocation),
                cantidad: parseInt(editProduct.increaseQty)
            });

            if (response.data) {
                fetchData();
                setEditProduct(prev => ({ ...prev, increaseLocation: '', increaseQty: '' }));
            }
        } catch (error) {
            console.error('Error adding stock:', error);
            alert(error?.response?.data?.error || 'Error al aumentar stock');
        }
    };

    const handleCreateLocation = async () => {
        if (!newLocationName.trim()) return;
        try {
            const response = await api.post(`/ubicaciones`, { nombre: newLocationName });
            if (response.data) {
                setNewLocationName('');
                setShowLocationModal(false);
                fetchData();
            }
        } catch (error) {
            console.error('Error creating location:', error);
            alert(error?.response?.data?.error || 'Error al crear ubicación');
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);

        try {
            // Permite al navegador pintar el modal de "Importando..." antes de bloquear el hilo
            await new Promise(resolve => setTimeout(resolve, 100));

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convertir a JSON
            const jsonParams = { header: 1, defval: '' };
            const jsonData = XLSX.utils.sheet_to_json(worksheet, jsonParams);

            if (jsonData.length <= 1) {
                alert('El archivo parece estar vacío o no tiene encabezados.');
                setIsImporting(false);
                return;
            }

            // Limpiar los encabezados removiendo tildes y todo espacio en blanco para evitar problemas de tipeo
            const headers = jsonData[0].map(h =>
                String(h).toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
                    .replace(/\s+/g, '') // quita todos los espacios
            );

            // Mapear dinámicamente según lo acordado: CODIGO, NOMBRE, CANTIDAD, STOCK MINIMO, COSTO, PRECIO DE VENTA
            const idxCodigo = headers.findIndex(h => h.includes('codigo') || h.includes('sku'));
            const idxNombre = headers.findIndex(h => h.includes('nombre') || h.includes('producto') || h.includes('desc'));
            const idxPrecio = headers.findIndex(h => h.includes('precio') || h.includes('pvp') || h.includes('preciodeventa'));
            const idxCosto = headers.findIndex(h => h.includes('costo') || h.includes('compra'));
            const idxStock = headers.findIndex(h => h.includes('cantidad') || h.includes('stock') || h.includes('cant'));
            const idxStockMinimo = headers.findIndex(h => h.includes('stockminimo') || h.includes('minimo'));
            const idxCategoria = headers.findIndex(h => h.includes('categoria') || h.includes('fam') || h.includes('linea'));

            if (idxCodigo === -1 || idxNombre === -1 || idxPrecio === -1 || idxStock === -1) {
                alert(`Error: Faltan columnas en el Excel.\nColumnas leídas y limpiadas: ${headers.join(', ')}\nBuscando (sin espacios): codigo, nombre, cantidad, preciodeventa.`);
                setIsImporting(false);
                return;
            }

            const payloadProductos = [];

            // Helper to parse numbers like "19.250" or 19.250 safely
            const parseAmount = (val) => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'number') return Math.round(val);
                // Si es string, remover puntos (separadores de miles) y comas si fuesen decimales, nos quedamos solo con los enteros
                const cleanStr = String(val).replace(/\./g, '').split(',')[0];
                return parseInt(cleanStr) || 0;
            };

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row[idxCodigo] || !row[idxNombre]) continue;

                const productoObj = {
                    codigo: String(row[idxCodigo]),
                    nombre: String(row[idxNombre]),
                    precio: parseAmount(row[idxPrecio]),
                    costo: idxCosto !== -1 ? parseAmount(row[idxCosto]) : 0,
                    stock: idxStock !== -1 ? parseAmount(row[idxStock]) : 0,
                    stockMinimo: idxStockMinimo !== -1 ? parseAmount(row[idxStockMinimo]) : 0,
                    categoria: idxCategoria !== -1 ? String(row[idxCategoria]) : 'Sin Categoría'
                };
                payloadProductos.push(productoObj);
            }

            if (payloadProductos.length === 0) {
                alert('No se encontraron productos válidos en el archivo.');
                setIsImporting(false);
                return;
            }

            if (!confirm(`Se encontraron ${payloadProductos.length} productos listos para importar a la sede principal.\n\nPrecios y Stock serán interpretados como números enteros (ej. "19.250" -> $19,250).\n¿Desea proceder?`)) {
                fileImportRef.current.value = null; // reset
                setIsImporting(false);
                return;
            }

            const response = await api.post('/inventario/importar', { productos: payloadProductos });

            if (response.data?.success) {
                alert(`¡Éxito! Importación completada:\n- Creados nuevos: ${response.data.insertados}\n- Actualizados: ${response.data.actualizados}\n- Errores/Omitidos: ${response.data.errores}`);
                fetchData();
            }

        } catch (error) {
            console.error('Error importando Excel:', error);
            alert('Error crítico al leer Excel: ' + (error.message || 'Revise el formato del archivo y vuelva a intentarlo.'));
        } finally {
            setIsImporting(false);
            if (fileImportRef.current) fileImportRef.current.value = null;
        }
    };

    // Abbreviate location names for card display
    const abreviarUbicacion = (name) => {
        const abrevs = {
            'Bodega Principal': 'Bod',
            'Mostrador': 'Mos',
            'Vitrina': 'Vit',
        };
        return abrevs[name] || name?.substring(0, 3) || '?';
    };

    function ProductCard({ product, onEdit, onEditService, onTransfer, onView }) {
        const totalStock = getTotalStock(product);
        const isLow = product.type === 'product' && totalStock <= (product.stockMinimo || 5);

        return (
            <Card noPadding style={{ height: '100%', minHeight: '130px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', flexGrow: 1 }}>
                    {/* Circular Image Top */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                backgroundColor: '#F3F4F6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '1px solid #E5E7EB'
                            }}>
                                {product.imagen ? (
                                    <img src={product.imagen} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Image size={28} color="#9CA3AF" />
                                )}
                            </div>
                            {isLow && (
                                <div style={{ position: 'absolute', top: '0px', right: '0px', backgroundColor: '#fff', borderRadius: '50%', padding: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <AlertTriangle size={14} color="#EF4444" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Code (Small, Gray, Left) */}
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '2px', fontWeight: 500 }}>{product.codigo}</p>

                    {/* Name */}
                    <h3 style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1A1A2E',
                        marginBottom: '2px',
                        lineHeight: '1.3'
                    }} title={product.nombre}>
                        {product.nombre}
                    </h3>

                    <div style={{ flexGrow: 1 }}></div>

                    {/* Value (Price) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E3A5F' }}>
                            {formatPesos(product.precio)}
                        </span>

                        {product.type === 'product' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onView(product); }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: isLow ? '#FEF2F2' : '#F3F4F6',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'transform 100ms'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <PackagePlus size={12} color={isLow ? '#EF4444' : '#6B7280'} />
                                <span style={{ fontSize: '12px', fontWeight: 700, color: isLow ? '#EF4444' : '#1A1A2E' }}>
                                    {totalStock}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div style={{ display: 'flex', borderTop: '1px solid #E5E7EB', marginTop: 'auto' }}>
                    <button
                        onClick={() => product.type === 'service' ? onEditService(product) : onEdit(product)}
                        title="Editar"
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'transparent',
                            color: '#6B7280',
                            border: 'none',
                            borderRight: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            borderBottomLeftRadius: '8px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Edit size={14} /> <span style={{ fontWeight: 500 }}>Editar</span>
                    </button>
                    {product.type === 'product' && (
                        <button
                            onClick={() => onTransfer(product)}
                            title="Traslado"
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: '#2D4077',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                borderBottomRightRadius: '8px',
                                transition: 'background 150ms'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E2D5A'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2D4077'}
                        >
                            <ArrowRightLeft size={14} /> <span style={{ fontWeight: 600 }}>Pasar</span>
                        </button>
                    )}
                    {product.type === 'service' && (
                        <button
                            onClick={() => handleDeleteService(product.id)}
                            title="Eliminar"
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: 'transparent',
                                color: '#EF4444',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                borderBottomRightRadius: '8px',
                                transition: 'background 150ms'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Trash2 size={14} /> <span style={{ fontWeight: 500 }}>Borrar</span>
                        </button>
                    )}
                </div>
            </Card>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
            {/* Header consolidado */}
            <div id="inventario-header-consolidado" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', flexShrink: 0 }}>
                <div style={{ minWidth: '200px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Inventario</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Gestión de productos</p>
                </div>

                <div id="inventario-search-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '300px', maxWidth: '500px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px 8px 40px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F3F4F6', padding: '2px', borderRadius: '4px' }}>
                        <button onClick={() => setView('grid')} style={{ padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: view === 'grid' ? '#fff' : 'transparent' }}>
                            <Grid3X3 size={16} color={view === 'grid' ? '#1A1A2E' : '#6B7280'} />
                        </button>
                        <button onClick={() => setView('list')} style={{ padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: view === 'list' ? '#fff' : 'transparent' }}>
                            <List size={16} color={view === 'list' ? '#1A1A2E' : '#6B7280'} />
                        </button>
                    </div>
                </div>

                <div id="inventario-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <input
                        type="file"
                        ref={fileImportRef}
                        style={{ display: 'none' }}
                        accept=".xlsx, .xls"
                        onChange={handleImportExcel}
                    />
                    <Button onClick={() => fileImportRef.current?.click()} style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '8px 12px', fontSize: '13px' }} disabled={isImporting}>
                        <FileSpreadsheet size={16} style={{ marginRight: '4px' }} />
                        {isImporting ? 'Importando...' : 'Importar'}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowLocationModal(true)} style={{ padding: '8px 12px', fontSize: '13px' }}>
                        <MapPin size={16} style={{ marginRight: '4px' }} />Ubicación
                    </Button>
                    <Button variant="secondary" onClick={openNewService} style={{ padding: '8px 12px', fontSize: '13px' }}><Plus size={16} style={{ marginRight: '4px' }} />Servicio</Button>
                    <Button onClick={openNew} style={{ padding: '8px 12px', fontSize: '13px' }}><Plus size={16} style={{ marginRight: '4px' }} />Producto</Button>
                </div>
            </div>

            {/* Área scrollable: contenido + paginación */}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

            {/* Content */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                    Cargando inventario...
                </div>
            ) : (
                view === 'grid' ? (
                    <div id="inventario-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '16px', alignContent: 'start' }}>
                        {combinedItems.map(item => (
                            <ProductCard
                                key={`${item.type}-${item.id}`}
                                product={item}
                                onEdit={openEdit}
                                onEditService={openEditService}
                                onTransfer={(p) => setShowTransferModal({ product: p, originId: '', destId: '', quantity: 0 })}
                                onView={(p) => setShowStockPopup(p)}
                            />
                        ))}
                    </div>
                ) : (
                    <div id="inventario-table-container" style={{ backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Código</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Nombre</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Dato</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Precio</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Stock</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {combinedItems.map(item => (
                                    <tr key={`${item.type}-${item.id}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td data-label="Código" style={{ padding: '12px 16px', fontSize: '14px' }}>{item.codigo}</td>
                                        <td data-label="Nombre" style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{item.nombre}</td>
                                        <td data-label="Dato" style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>
                                            {item.type === 'service' ? 'Servicio' : (item.categoria || '-')}
                                        </td>
                                        <td data-label="Precio" style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{formatPesos(item.precio)}</td>
                                        <td data-label="Stock" style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            {item.type === 'product' ? (
                                                <button
                                                    onClick={() => setShowStockPopup(item)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: getTotalStock(item) <= 5 ? '#FEF2F2' : '#F3F4F6', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <PackagePlus size={12} color={getTotalStock(item) <= 5 ? '#EF4444' : '#6B7280'} />
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: getTotalStock(item) <= 5 ? '#EF4444' : '#1A1A2E' }}>{getTotalStock(item)}</span>
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td data-label="Acciones" style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button onClick={() => item.type === 'service' ? openEditService(item) : openEdit(item)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }} title="Editar"><Edit size={16} color="#6B7280" /></button>
                                            {item.type === 'product' && (
                                                <button onClick={() => setShowTransferModal({ product: item, originId: '', destId: '', quantity: 0 })} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }} title="Traslado"><ArrowRightLeft size={16} color="#6B7280" /></button>
                                            )}
                                            {item.type === 'service' && (
                                                <button onClick={() => handleDeleteService(item.id)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar"><Trash2 size={16} color="#EF4444" /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <Button
                        variant="secondary"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </Button>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#4B5563' }}>
                        Página {page} de {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            </div>{/* fin área scrollable */}

            {/* Stock Popup */}
            {showStockPopup && (
                <Modal isOpen={true} onClose={() => setShowStockPopup(null)} title={`Stock - ${showStockPopup.nombre}`} size="xs">
                    <div style={{ padding: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {showStockPopup.stockUbicaciones?.filter(s => s.stock > 0).map((s, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '4px', border: '1px solid #F3F4F6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '1px', backgroundColor: ubicacionColor(s.ubicacion?.nombre) }} />
                                        <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>{s.ubicacion?.nombre}</span>
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>{s.stock}</span>
                                </div>
                            ))}
                            {(!showStockPopup.stockUbicaciones || showStockPopup.stockUbicaciones.filter(s => s.stock > 0).length === 0) && (
                                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '16px', fontSize: '13px' }}>
                                    Sin stock registrado
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                            <Button variant="secondary" size="sm" onClick={() => {
                                setShowStockPopup(null);
                                setShowEntryModal({ productId: showStockPopup.id, locationId: '', quantity: 0 });
                            }} style={{ width: '100%' }}>
                                <PackagePlus size={14} style={{ marginRight: '4px' }} />Agregar Stock
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <Modal isOpen={true} onClose={() => setShowTransferModal(null)} title={`Trasladar: ${showTransferModal.product?.nombre}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '350px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '4px', textAlign: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369A1' }}>Stock Total: {getTotalStock(showTransferModal.product)}</span>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ubicación Origen</label>
                            <select
                                value={showTransferModal.originId}
                                onChange={(e) => setShowTransferModal(prev => ({ ...prev, originId: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                            >
                                <option value="">Seleccionar...</option>
                                {ubicaciones.map(u => {
                                    const stockRecord = showTransferModal.product?.stockUbicaciones?.find(s => s.ubicacionId === u.id);
                                    const currentStock = stockRecord?.stock || 0;
                                    return (
                                        <option key={u.id} value={u.id} disabled={currentStock <= 0}>
                                            {u.nombre} ({currentStock} disponibles)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ubicación Destino</label>
                            <select
                                value={showTransferModal.destId}
                                onChange={(e) => setShowTransferModal(prev => ({ ...prev, destId: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                            >
                                <option value="">Seleccionar...</option>
                                {ubicaciones.map(u => {
                                    const stockRecord = showTransferModal.product?.stockUbicaciones?.find(s => s.ubicacionId === u.id);
                                    const currentStock = stockRecord?.stock || 0;
                                    return (
                                        <option key={u.id} value={u.id}>
                                            {u.nombre} (Tiene {currentStock})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={showTransferModal.quantity || ''}
                                onChange={(e) => setShowTransferModal(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setShowTransferModal(null)}>Cancelar</Button>
                            <Button onClick={handleConfirmTransfer}>Trasladar</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Entry Modal */}
            {showEntryModal && (
                <Modal isOpen={true} onClose={() => setShowEntryModal(null)} title="Agregar Stock">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '350px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ubicación</label>
                            <select
                                value={showEntryModal.locationId}
                                onChange={(e) => setShowEntryModal(prev => ({ ...prev, locationId: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                            >
                                <option value="">Seleccionar...</option>
                                {ubicaciones.map(u => (
                                    <option key={u.id} value={u.id}>{u.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={showEntryModal.quantity || ''}
                                onChange={(e) => setShowEntryModal(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setShowEntryModal(null)}>Cancelar</Button>
                            <Button onClick={handleConfirmEntry}>Agregar</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Service Modal */}
            {showServiceModal && editService && (
                <Modal
                    isOpen={true}
                    onClose={() => { setShowServiceModal(false); setEditService(null); }}
                    title={editService.id ? 'Editar Servicio' : 'Nuevo Servicio'}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Código *</label>
                            <input
                                type="text"
                                value={editService.codigo}
                                readOnly
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none', backgroundColor: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed' }}
                                placeholder="Ej: SERVT1"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Nombre del Servicio *</label>
                            <input
                                type="text"
                                value={editService.nombre}
                                onChange={(e) => setEditService(prev => ({ ...prev, nombre: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                placeholder="Ej: Reparación de taladro"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Precio *</label>
                            <input
                                type="text"
                                value={formatPesos(editService.precio)}
                                onChange={(e) => handleCurrencyChange(e.target.value, (val) => setEditService(prev => ({ ...prev, precio: val })))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                placeholder="Ej: $10.000"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Descripción</label>
                            <textarea
                                value={editService.descripcion || ''}
                                onChange={(e) => setEditService(prev => ({ ...prev, descripcion: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                                placeholder="Opcional..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <Button variant="secondary" onClick={() => { setShowServiceModal(false); setEditService(null); }}>Cancelar</Button>
                            <Button onClick={handleSaveService}>{editService.id ? 'Actualizar' : 'Crear'} Servicio</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Product Edit Modal */}
            {showProductModal && editProduct && (
                <Modal
                    isOpen={true}
                    onClose={() => { setShowProductModal(false); setEditProduct(null); }}
                    title={editProduct.id ? 'Editar Producto' : 'Nuevo Producto'}
                    size="lg"
                >
                    <div style={{ padding: '4px' }}>
                        {/* Tabs Bar - Only if editing product */}
                        {editProduct.id && canDisminuir && (
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '4px' }}>
                                {['general', 'ajuste'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setEditTab(tab)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            backgroundColor: editTab === tab ? '#fff' : 'transparent',
                                            color: editTab === tab ? '#1A1A2E' : '#6B7280',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {tab === 'general' ? 'General' : 'Ajuste Stock'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* General Tab Content */}
                        {editTab === 'general' && (
                            <div id="inventario-producto-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '32px' }}>
                                {/* Left Column: Form */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Nombre *</label>
                                        <input
                                            type="text"
                                            value={editProduct.nombre || ''}
                                            onChange={(e) => setEditProduct(prev => ({ ...prev, nombre: e.target.value }))}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                        />
                                    </div>

                                    <div id="inventario-producto-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Código *</label>
                                            <input
                                                type="text"
                                                value={editProduct.codigo || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, codigo: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Categoría</label>
                                            <input
                                                type="text"
                                                value={editProduct.categoria || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, categoria: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div id="inventario-producto-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Costo</label>
                                            <input
                                                type="text"
                                                value={formatPesos(editProduct.costo)}
                                                onChange={(e) => handleCurrencyChange(e.target.value, (val) => setEditProduct(prev => ({ ...prev, costo: val })))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Stock Mínimo</label>
                                            <input
                                                type="number"
                                                value={editProduct.stockMinimo || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, stockMinimo: parseInt(e.target.value) || 0 }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div id="inventario-producto-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Precio Venta *</label>
                                            <input
                                                type="text"
                                                value={formatPesos(editProduct.precio)}
                                                onChange={(e) => handleCurrencyChange(e.target.value, (val) => setEditProduct(prev => ({ ...prev, precio: val })))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Precio Mayor</label>
                                            <input
                                                type="text"
                                                placeholder="Opcional"
                                                value={formatPesos(editProduct.precioMayor)}
                                                onChange={(e) => handleCurrencyChange(e.target.value, (val) => setEditProduct(prev => ({ ...prev, precioMayor: val })))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>Descripción</label>
                                        <textarea
                                            value={editProduct.descripcion || ''}
                                            onChange={(e) => setEditProduct(prev => ({ ...prev, descripcion: e.target.value }))}
                                            rows={2}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', resize: 'none', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Image Section */}
                                <div style={{
                                    border: '1px dashed #E5E7EB',
                                    borderRadius: '4px',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#FAFAFB'
                                }}>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A2E', marginBottom: '20px' }}>Imagen</span>

                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '4px',
                                        backgroundColor: '#fff',
                                        border: '4px solid #fff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        marginBottom: '24px'
                                    }}>
                                        {editProduct.imagen ? (
                                            <img src={editProduct.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Image size={40} color="#9CA3AF" />
                                        )}
                                    </div>

                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#2D4077',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            width: '100%',
                                            transition: 'background 150ms'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E2D5A'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2D4077'}
                                    >
                                        Seleccionar archivo
                                    </button>

                                    <p style={{ marginTop: '12px', fontSize: '11px', color: '#9CA3AF' }}>Max 5MB • JPG, PNG</p>

                                    {editProduct.imagen && (
                                        <button
                                            onClick={() => setEditProduct(prev => ({ ...prev, imagen: null }))}
                                            style={{ marginTop: '8px', background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
                                        >
                                            Eliminar imagen
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Ajuste Stock Tab Content */}
                        {editTab === 'ajuste' && canDisminuir && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                {/* Aumentar */}
                                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#F9FAFB' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 12px 0' }}>Aumentar Stock</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ubicación</label>
                                            <select
                                                value={editProduct.increaseLocation || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, increaseLocation: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {ubicaciones.map((u) => {
                                                    const stockActual = editProduct.stockLocations?.find(s => s.ubicacionId === u.id)?.stock || 0;
                                                    return <option key={u.id} value={u.id}>{u.nombre} ({stockActual})</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Cantidad</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={editProduct.increaseQty || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, increaseQty: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <Button onClick={handleIncreaseStock} style={{ alignSelf: 'flex-start' }}>
                                            <PlusCircle size={16} style={{ marginRight: '6px' }} />Aumentar Stock
                                        </Button>
                                    </div>
                                </div>

                                {/* Disminuir */}
                                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#F9FAFB' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 12px 0' }}>Disminuir Stock</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ubicación</label>
                                            <select
                                                value={editProduct.decreaseLocation || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, decreaseLocation: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {editProduct.stockLocations?.map((s, idx) => (
                                                    <option key={idx} value={s.ubicacionId}>{s.ubicacion} ({s.stock})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Cantidad</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={editProduct.decreaseQty || ''}
                                                onChange={(e) => setEditProduct(prev => ({ ...prev, decreaseQty: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <Button onClick={handleDecreaseStock} style={{ alignSelf: 'flex-start' }}>
                                            <MinusCircle size={16} style={{ marginRight: '6px' }} />Disminuir Stock
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* Footer */}
                        <div id="inventario-producto-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                            <div>
                                {editProduct.id && (
                                    <Button variant="secondary" onClick={() => handleDeleteProduct(editProduct.id)} style={{ color: '#EF4444' }}>
                                        <Trash2 size={16} style={{ marginRight: '6px' }} />Eliminar
                                    </Button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Button variant="secondary" onClick={() => { setShowProductModal(false); setEditProduct(null); }}>Cancelar</Button>
                                <Button onClick={handleSaveProduct}>Guardar Cambios</Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* New Location Modal */}
            {showLocationModal && (
                <Modal isOpen={true} onClose={() => setShowLocationModal(false)} title="Gestión de Ubicaciones" size="sm">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Create New Location */}
                        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1A1A2E', marginBottom: '12px' }}>Añadir Nueva Ubicación</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={newLocationName}
                                    onChange={(e) => setNewLocationName(e.target.value)}
                                    placeholder="Ej: Bodega Sur"
                                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newLocationName.trim()) handleCreateLocation();
                                    }}
                                />
                                <Button onClick={handleCreateLocation} disabled={!newLocationName.trim()}>Crear</Button>
                            </div>
                        </div>

                        {/* Existing Locations List */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1A1A2E', marginBottom: '12px' }}>Ubicaciones Existentes</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {ubicaciones.map(u => (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#fff' }}>
                                        <span style={{ fontSize: '14px', color: '#1A1A2E', fontWeight: 500 }}>{u.nombre}</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={async () => {
                                                    const nuevoNombre = prompt('Nuevo nombre para la ubicación:', u.nombre);
                                                    if (nuevoNombre && nuevoNombre !== u.nombre) {
                                                        try {
                                                            await api.put(`/ubicaciones/${u.id}`, { nombre: nuevoNombre });
                                                            fetchData();
                                                        } catch (err) {
                                                            alert(err.response?.data?.error || 'Error al renombrar');
                                                        }
                                                    }
                                                }}
                                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Renombrar"
                                            >
                                                <Edit size={16} color="#6B7280" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`¿Está seguro de eliminar la ubicación "${u.nombre}"?`)) {
                                                        try {
                                                            await api.delete(`/ubicaciones/${u.id}`);
                                                            fetchData();
                                                        } catch (err) {
                                                            alert(err.response?.data?.error || 'Error al eliminar');
                                                        }
                                                    }
                                                }}
                                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} color="#EF4444" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                            <Button variant="secondary" onClick={() => setShowLocationModal(false)}>Cerrar</Button>
                        </div>
                    </div>
                </Modal>
            )}
            {/* Screen Overlay for Importing */}
            {isImporting && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white'
                }}>
                    <div style={{
                        width: '48px', height: '48px', border: '5px solid rgba(255,255,255,0.3)',
                        borderTop: '5px solid #10B981', borderRadius: '50%',
                        animation: 'spin 1s linear infinite', marginBottom: '16px'
                    }}></div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Procesando Excel...</h2>
                    <p style={{ fontSize: '14px', marginTop: '8px', color: '#D1D5DB' }}>Esto puede tardar unos segundos. Por favor, no actualice la página.</p>
                    <style>
                        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
                    </style>
                </div>
            )}
        </div>
    );
}

