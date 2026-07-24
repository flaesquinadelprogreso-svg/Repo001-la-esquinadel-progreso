import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet, FileText, TrendingUp, DollarSign, ShoppingCart, Ticket, ArrowUpRight, ArrowDownRight, Package, Truck, Search, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import * as XLSX from 'xlsx';
import api from '../api/client';
import '../styles/analisis-mobile.css';

export default function AnalisisFinanciero() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('resumen'); // resumen, costos, ventas
    const [expandedVentaId, setExpandedVentaId] = useState(null);

    // Filters for lists
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = '/analisis-financiero';
            const params = new URLSearchParams();
            if (dateFrom) params.append('startDate', dateFrom);
            if (dateTo) params.append('endDate', dateTo);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await api.get(url);
            setData(response.data);
        } catch (error) {
            console.error("Error fetching analisis financiero:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch initial data (can default to current month if needed, leaving open for now)
        fetchData();
    }, []);

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const handleApplyFilter = () => {
        fetchData();
    };

    const handleClearFilter = () => {
        setDateFrom('');
        setDateTo('');
        setTimeout(fetchData, 100);
    };

    const groupSaleItems = (items) => {
        const groupedMap = {};
        (items || []).forEach(item => {
            const id = item.productoId ? `p-${item.productoId}` : (item.servicioId ? `s-${item.servicioId}` : `n-${item.nombre}`);
            if (!groupedMap[id]) {
                groupedMap[id] = {
                    ...item,
                    cantidad: 0,
                    costoTotalItem: 0,
                    ventaTotalItem: 0,
                    gananciaItem: 0
                };
            }
            groupedMap[id].cantidad += item.cantidad;
            groupedMap[id].costoTotalItem += (item.costoTotalItem ?? item.valor_compra_total ?? 0);
            groupedMap[id].ventaTotalItem += (item.ventaTotalItem ?? item.valor_venta_total ?? (item.precioUnit * item.cantidad));
            groupedMap[id].gananciaItem += (item.gananciaItem ?? item.ganancia ?? 0);
        });
        return Object.values(groupedMap);
    };

    if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Cargando análisis...</div>;

    const { resumen, compras, ventas, reporteContable, ventasPositivas, devoluciones, topBajoStock, topPocoMovimiento } = data;

    // Filtered lists - with proper null/undefined handling
    const filteredCompras = (compras || []).filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const proveedorNombre = c.proveedor?.nombre || '';
        const numeroFactura = c.numeroFactura || '';
        return proveedorNombre.toLowerCase().includes(term) ||
            numeroFactura.toLowerCase().includes(term);
    });

    const filteredVentas = (ventas || []).filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const clienteNombre = v.cliente?.nombre || '';
        const numeroRecibo = v.numeroRecibo || '';
        return clienteNombre.toLowerCase().includes(term) ||
            numeroRecibo.toLowerCase().includes(term);
    });

    // Export to Excel functions
    const filteredContable = (reporteContable || []).filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return item.documento.toLowerCase().includes(term) ||
            item.cliente.toLowerCase().includes(term) ||
            (item.referencia && item.referencia.toLowerCase().includes(term));
    });

    const exportVentasToExcel = () => {
        const data = [];
        filteredVentas.forEach(venta => {
            if (!venta.items || venta.items.length === 0) {
                data.push({
                    'Fecha': new Date(venta.createdAt).toLocaleDateString(),
                    'Recibo': venta.numeroRecibo || '',
                    'Cliente': venta.cliente?.nombre || 'Cliente General',
                    'Producto': '(Sin items)',
                    'Cantidad': 0,
                    'Costo Unitario': 0,
                    'Costo Total': venta.costoVenta || 0,
                    'Precio Venta Unit': 0,
                    'Valor Venta Total': venta.subtotal || 0,
                    'Ganancia': venta.ganancia || 0
                });
            } else {
                const groupedItems = groupSaleItems(venta.items);
                groupedItems.forEach(it => {
                    data.push({
                        'Fecha': new Date(venta.createdAt).toLocaleDateString(),
                        'Recibo': venta.numeroRecibo || '',
                        'Cliente': venta.cliente?.nombre || 'Cliente General',
                        'Producto': it.nombre || it.producto?.nombre || 'Servicio',
                        'Código': it.codigo || it.producto?.codigo || '',
                        'Cantidad': it.cantidad,
                        'Costo Unitario': it.cantidad > 0 ? Math.round(it.costoTotalItem / it.cantidad) : (it.costo_unitario_ponderado || 0),
                        'Costo Total': it.costoTotalItem,
                        'Precio Venta Unit': it.precioUnit || 0,
                        'Valor Venta Total': it.ventaTotalItem,
                        'Ganancia': it.gananciaItem
                    });
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas Detalladas');
        XLSX.writeFile(workbook, `analisis_ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportContableToExcel = () => {
        const data = filteredContable.map(item => ({
            'Fecha': new Date(item.fecha).toLocaleDateString(),
            'Tipo': item.tipo,
            'Documento': item.documento,
            'Referencia Original': item.referencia || 'N/A',
            'Cliente': item.cliente,
            'Items': item.itemsCount,
            'Valor de Venta': item.total,
            'Costo de Venta': item.costoVenta,
            'Ganancia': item.ganancia
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Contable');
        XLSX.writeFile(workbook, `reporte_contable_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportComprasToExcel = () => {
        const data = filteredCompras.map(compra => ({
            'Fecha': new Date(compra.fechaElaboracion).toLocaleDateString(),
            'Documento': compra.numeroFactura || `OC-${compra.id}`,
            'Proveedor': compra.proveedor?.nombre || 'Desconocido',
            'Soporte URL': compra.soporteUrl || 'N/A',
            'Total Invertido': compra.total,
            'Estado': compra.estado.toUpperCase()
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras y Gastos');
        XLSX.writeFile(workbook, `compras_gastos_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportStockCriticoToExcel = () => {
        if (!topBajoStock?.length) return;
        const excelData = topBajoStock.map(p => ({
            'Código': p.codigo || 'N/A',
            'Producto': p.nombre,
            'Stock Actual': p.stock,
            'Stock Mínimo': p.stockMinimo,
            'Déficit': p.stockMinimo - p.stock
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Crítico');
        XLSX.writeFile(workbook, `stock_critico_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (!data) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #ECECEC', borderTop: '3px solid #F5B400', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>Sincronizando reportes financieros...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="analisis-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>Análisis Financiero</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Centralización de Costos y Rentabilidad histórica</p>
                </div>

                {/* Selector de Tabs */}
                <div id="analisis-tabs" style={{ display: 'flex', gap: '2px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                <button
                    onClick={() => setActiveTab('resumen')}
                    style={{
                        padding: '9px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'resumen' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'resumen' ? '#111827' : '#6B7280',
                        boxShadow: activeTab === 'resumen' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >Resumen</button>
                <button
                    onClick={() => setActiveTab('ventas')}
                    style={{
                        padding: '9px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'ventas' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'ventas' ? '#111827' : '#6B7280',
                        boxShadow: activeTab === 'ventas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >Ventas Detalladas</button>
                <button
                    onClick={() => setActiveTab('contable')}
                    style={{
                        padding: '9px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'contable' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'contable' ? '#111827' : '#6B7280',
                        boxShadow: activeTab === 'contable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >Reporte Contable</button>
                <button
                    onClick={() => setActiveTab('costos')}
                    style={{
                        padding: '9px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'costos' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'costos' ? '#111827' : '#6B7280',
                        boxShadow: activeTab === 'costos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >Compras/Gastos</button>
                </div>
            </div>

            {/* ========================================= TAB: RESUMEN ========================================= */}
            {activeTab === 'resumen' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* KPI Cards section - Nuevo formato con Ventas Brutas, Devoluciones y Netas */}
                    <div id="analisis-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>

                        {/* Ventas Brutas */}
                        <div
                            onClick={() => setActiveTab('ventas')}
                            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '0 0 14px 14px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(17,24,39,0.06), 0 2px 4px rgba(17,24,39,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)'; }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Ventas Brutas</span>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatMoney(resumen.ventasBrutas ?? resumen.totalVendido)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{ventasPositivas?.length || ventas.length} ventas</div>
                        </div>

                        {/* Capital Inmovilizado */}
                        <div
                            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '0 0 14px 14px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)', position: 'relative', overflow: 'hidden' }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Valorización inventario</span>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatMoney(resumen.capitalInmovilizado || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Costo de stock actual</div>
                        </div>

                        {/* Devoluciones */}
                        <div
                            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '0 0 14px 14px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)', position: 'relative', overflow: 'hidden' }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Devoluciones</span>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                                -{formatMoney(resumen.totalDevoluciones || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{devoluciones?.length || 0} devoluciones</div>
                        </div>

                        {/* Ventas Netas */}
                        <div
                            onClick={() => setActiveTab('ventas')}
                            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '0 0 14px 14px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(17,24,39,0.06), 0 2px 4px rgba(17,24,39,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)'; }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Ventas Netas</span>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: '#16A34A', marginTop: '6px' }}>
                                {formatMoney(resumen.ventasNetas ?? resumen.totalVendido)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Después de devoluciones</div>
                        </div>

                        {/* Utilidad Neta */}
                        <div
                            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '0 0 14px 14px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)', position: 'relative', overflow: 'hidden' }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Utilidad Neta</span>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: (resumen.utilidadNeta ?? resumen.totalGanancia) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                                {formatMoney(resumen.utilidadNeta ?? resumen.totalGanancia)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Ganancia real</div>
                        </div>

                        {/* Margen */}
                        <div
                            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '0 0 14px 14px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)', position: 'relative', overflow: 'hidden' }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Margen Neto</span>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginTop: '6px' }}>
                                {isNaN(resumen.margenRentabilidad) ? '0.0' : Number(resumen.margenRentabilidad).toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Rentabilidad</div>
                        </div>
                    </div>

                    {/* Secondary Data Section */}
                    <div id="analisis-data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {/* Top Products */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '0 0 16px 16px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={16} color="#6B7280" /> Top 5 Productos más Vendidos</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(() => {
                                    const productMap = {};
                                    ventas.forEach(v => {
                                        if (v.estado === 'anulada') return;
                                        (v.items || []).forEach(item => {
                                            if (!item.producto) return;
                                            const id = item.producto.id;
                                            if (!productMap[id]) productMap[id] = { name: item.producto.nombre, qty: 0, revenue: 0 };
                                            productMap[id].qty += item.cantidad;
                                            productMap[id].revenue += item.ventaTotalItem || item.valor_venta_total || 0;
                                        });
                                    });
                                    const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
                                    if (topProducts.length === 0) return <span style={{ fontSize: '12px', color: '#6B7280' }}>No hay datos en este periodo</span>;
                                    return topProducts.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>{idx + 1}</div>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>{p.name}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{p.qty} unds</div>
                                                <div style={{ fontSize: '10px', color: '#6B7280' }}>{formatMoney(p.revenue)}</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Top Clients */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '0 0 16px 16px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={16} color="#6B7280" /> Top 5 Mejores Clientes</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(() => {
                                    const clientMap = {};
                                    filteredVentas.forEach(v => {
                                        if (v.estado === 'anulada') return;
                                        const clientId = v.cliente?.id || 'general';
                                        const clientName = v.cliente?.nombre || 'General / Sin Registrar';
                                        if (!clientMap[clientId]) clientMap[clientId] = { name: clientName, revenue: 0, orders: 0 };
                                        clientMap[clientId].revenue += v.subtotal;
                                        clientMap[clientId].orders += 1;
                                    });
                                    const topClients = Object.values(clientMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
                                    if (topClients.length === 0) return <span style={{ fontSize: '12px', color: '#6B7280' }}>No hay datos en este periodo</span>;
                                    return topClients.map((c, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{idx + 1}</div>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>{c.name}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{formatMoney(c.revenue)}</div>
                                                <div style={{ fontSize: '10px', color: '#6B7280' }}>{c.orders} compras</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Stock Crítico */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '0 0 16px 16px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={16} color="#DC2626" /> Productos en Stock Crítico ({resumen.productosBajoStockCount})</h3>
                                {topBajoStock?.length > 0 && (
                                    <button onClick={exportStockCriticoToExcel} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 500, color: '#6B7280', backgroundColor: '#F3F4F6', border: '1px solid #ECECEC', borderRadius: '8px', cursor: 'pointer' }}>
                                        <Download size={12} /> Excel
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {topBajoStock?.length === 0 ? (
                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>No hay productos con stock bajo.</span>
                                ) : (
                                    topBajoStock?.slice(0, 10).map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>!</div>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>{p.nombre}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>{p.stock} unds</div>
                                                <div style={{ fontSize: '10px', color: '#6B7280' }}>Mínimo: {p.stockMinimo}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Productos Poca Rotación */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '0 0 16px 16px', border: '1px solid #ECECEC', boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={16} color="#2563EB" style={{ transform: 'rotate(180deg)' }} /> Menor Rotación (Top 10)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {topPocoMovimiento?.length === 0 ? (
                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>No hay datos suficientes.</span>
                                ) : (
                                    topPocoMovimiento?.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{idx + 1}</div>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }} title={p.nombre}>{p.nombre.length > 20 ? p.nombre.substring(0, 20) + '...' : p.nombre}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{p.qty} vendidas</div>
                                                <div style={{ fontSize: '10px', color: '#6B7280' }}>Stock: {p.stock}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================= TAB: VENTAS ========================================= */}
            {
                activeTab === 'ventas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Date Filters inside Ventas */}
                        <div className="analisis-filtros" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '16px 20px', backgroundColor: '#FFFFFF', border: '1px solid #ECECEC', borderRadius: '16px' }}>
                            <Input label="Desde" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} icon={Calendar} style={{ width: '180px' }} />
                            <Input label="Hasta" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} icon={Calendar} style={{ width: '180px' }} />
                            <Button variant="primary" onClick={handleApplyFilter}>Filtrar</Button>
                            {(dateFrom || dateTo) && (
                                <Button variant="secondary" onClick={handleClearFilter}>Limpiar</Button>
                            )}
                        </div>

                        <div className="analisis-search-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: '16px 20px', borderRadius: '16px', border: '1px solid #ECECEC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                <Button variant="secondary" onClick={() => setActiveTab('resumen')}>&larr; Volver</Button>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar factura..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ padding: '10px 12px 10px 38px', border: '1px solid #ECECEC', borderRadius: '14px', fontSize: '14px', width: '100%', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <Button variant="secondary" icon={Download} onClick={exportVentasToExcel}>Exportar Excel</Button>
                        </div>

                        <div className="analisis-table-container" style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #ECECEC', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ECECEC' }}>
                                        <th style={{ width: '40px' }}></th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Fecha</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Recibo</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Cliente</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Items</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Valor de Compra Total</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Valor de Venta Total</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#16A34A', textTransform: 'uppercase', textAlign: 'right' }}>Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVentas.map((venta) => (
                                        <React.Fragment key={venta.id}>
                                            <tr
                                                onClick={() => setExpandedVentaId(expandedVentaId === venta.id ? null : venta.id)}
                                                style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', backgroundColor: expandedVentaId === venta.id ? '#F9FAFB' : '#FFF', transition: 'background-color 0.2s' }}
                                            >
                                                <td data-label="Acción" style={{ padding: '14px 10px', textAlign: 'center' }}>
                                                    <span style={{ display: 'inline-block', transform: expandedVentaId === venta.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#9CA3AF' }}>▶</span>
                                                </td>
                                                <td data-label="Fecha" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>{new Date(venta.createdAt).toLocaleDateString()}</td>
                                                <td data-label="Recibo" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{venta.numeroRecibo}</td>
                                                <td data-label="Cliente" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>
                                                    {venta.cliente?.nombre || 'Cliente General'}
                                                    {venta.tieneDevoluciones && (
                                                        <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#FDECEC', color: '#DC2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                            Devolución
                                                        </span>
                                                    )}
                                                </td>
                                                <td data-label="Items" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280', textAlign: 'right' }}>{venta.items?.length || 0}</td>
                                                <td data-label="Valor Compra" style={{ padding: '14px 20px', fontSize: '14px', color: '#DC2626', textAlign: 'right' }}>{formatMoney(venta.costoVenta)}</td>
                                                <td data-label="Valor Venta" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatMoney(venta.total)}</td>
                                                <td data-label="Ganancia" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: '#16A34A', textAlign: 'right' }}>{formatMoney(venta.ganancia)}</td>
                                            </tr>

                                            {expandedVentaId === venta.id && (
                                                <tr className="expanded-row-container" style={{ backgroundColor: '#F9FAFB' }}>
                                                    <td colSpan="8" style={{ padding: '16px', borderBottom: '1px solid #ECECEC' }}>
                                                        <div className="analisis-detail-table-wrapper" style={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #ECECEC', overflow: 'hidden' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid #ECECEC' }}>
                                                                        <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Producto</th>
                                                                        <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' }}>Cant (Neta)</th>
                                                                        <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Costo Unidad</th>
                                                                        <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Valor de Compra Total</th>
                                                                        <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Valor de Venta Total</th>
                                                                        <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#16A34A', textTransform: 'uppercase', textAlign: 'right' }}>Ganancia</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {groupSaleItems(venta.items).map(it => (
                                                                        <tr key={it.id || (it.productoId ? `p-${it.productoId}` : `s-${it.servicioId}`)} style={{ borderBottom: '1px solid #F3F3F3' }}>
                                                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#111827', fontWeight: 500 }}>{it.nombre || it.producto?.nombre || 'Servicio'}</td>
                                                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>{it.cantidad}</td>
                                                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6B7280', textAlign: 'right' }}>{formatMoney(it.cantidad > 0 ? it.costoTotalItem / it.cantidad : 0)}</td>
                                                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#DC2626', textAlign: 'right' }}>{formatMoney(it.costoTotalItem)}</td>
                                                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#111827', textAlign: 'right', fontWeight: 500 }}>{formatMoney(it.ventaTotalItem)}</td>
                                                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#16A34A', textAlign: 'right', fontWeight: 600 }}>{formatMoney(it.gananciaItem)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {filteredVentas.length === 0 && (
                                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>No hay ventas en este periodo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* ========================================= TAB: CONTABLE ========================================= */}
            {
                activeTab === 'contable' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="analisis-search-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: '16px 20px', borderRadius: '16px', border: '1px solid #ECECEC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                <Button variant="secondary" onClick={() => setActiveTab('resumen')}>&larr; Volver</Button>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar doc..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ padding: '10px 12px 10px 38px', border: '1px solid #ECECEC', borderRadius: '14px', fontSize: '14px', width: '100%', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <Button variant="secondary" icon={Download} onClick={exportContableToExcel}>Exportar Excel</Button>
                        </div>

                        <div className="analisis-table-container" style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #ECECEC', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ECECEC' }}>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Fecha</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Documento</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Tipo</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Referencia Original</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Cliente</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Venta</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Costo</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#16A34A', textTransform: 'uppercase', textAlign: 'right' }}>Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContable.map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td data-label="Fecha" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>{new Date(item.fecha).toLocaleDateString()}</td>
                                            <td data-label="Documento" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{item.documento}</td>
                                            <td data-label="Tipo" style={{ padding: '14px 20px', fontSize: '14px' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                    backgroundColor: item.tipo === 'Venta' ? '#EAF7EE' : '#FDECEC',
                                                    color: item.tipo === 'Venta' ? '#16A34A' : '#DC2626'
                                                }}>
                                                    {item.tipo}
                                                </span>
                                            </td>
                                            <td data-label="Ref Orig." style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>{item.referencia || '-'}</td>
                                            <td data-label="Cliente" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>{item.cliente}</td>
                                            <td data-label="Venta" style={{ padding: '14px 20px', fontSize: '14px', textAlign: 'right', fontWeight: 600, color: item.total < 0 ? '#DC2626' : '#111827' }}>
                                                {formatMoney(item.total)}
                                            </td>
                                            <td data-label="Costo" style={{ padding: '14px 20px', fontSize: '14px', textAlign: 'right', color: item.costoVenta < 0 ? '#DC2626' : '#6B7280' }}>
                                                {formatMoney(item.costoVenta)}
                                            </td>
                                            <td data-label="Ganancia" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, textAlign: 'right', color: item.ganancia < 0 ? '#DC2626' : '#16A34A' }}>
                                                {formatMoney(item.ganancia)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredContable.length === 0 && (
                                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>No hay movimientos en este periodo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* ========================================= TAB: COSTOS ========================================= */}
            {
                activeTab === 'costos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Date Filters inside Costos */}
                        <div className="analisis-filtros" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '16px 20px', backgroundColor: '#FFFFFF', border: '1px solid #ECECEC', borderRadius: '16px' }}>
                            <Input label="Desde" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} icon={Calendar} style={{ width: '180px' }} />
                            <Input label="Hasta" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} icon={Calendar} style={{ width: '180px' }} />
                            <Button variant="primary" onClick={handleApplyFilter}>Filtrar</Button>
                            {(dateFrom || dateTo) && (
                                <Button variant="secondary" onClick={handleClearFilter}>Limpiar</Button>
                            )}
                        </div>

                        <div className="analisis-search-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: '16px 20px', borderRadius: '16px', border: '1px solid #ECECEC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                <Button variant="secondary" onClick={() => setActiveTab('resumen')}>&larr; Volver</Button>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar compra..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ padding: '10px 12px 10px 38px', border: '1px solid #ECECEC', borderRadius: '14px', fontSize: '14px', width: '100%', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <Button variant="secondary" icon={Download} onClick={exportComprasToExcel}>Exportar Excel</Button>
                        </div>

                        <div className="analisis-table-container" style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #ECECEC', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ECECEC' }}>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Fecha</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Documento</th>
                                        <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Proveedor</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Total Invertido</th>
                                        <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCompras.map((compra) => (
                                        <tr key={compra.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td data-label="Fecha" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>{new Date(compra.fechaElaboracion).toLocaleDateString()}</td>
                                            <td data-label="Documento" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{compra.numeroFactura || `OC-${compra.id}`}</td>
                                            <td data-label="Proveedor" style={{ padding: '14px 20px', fontSize: '14px', color: '#6B7280' }}>{compra.proveedor?.nombre || 'Desconocido'}</td>
                                            <td data-label="Total" style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: '#D69A00', textAlign: 'right' }}>{formatMoney(compra.total)}</td>
                                            <td data-label="Estado" style={{ padding: '14px 20px', fontSize: '14px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                                                    backgroundColor: compra.estado === 'pagada' ? '#EAF7EE' : '#FFF9E6',
                                                    color: compra.estado === 'pagada' ? '#16A34A' : '#D69A00'
                                                }}>
                                                    {compra.estado.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCompras.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>No hay compras en este periodo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
