import React, { useState, useEffect } from 'react';
import {
    Wallet, Building, Plus, ArrowDownCircle, ArrowUpCircle,
    Clock, Search, AlertCircle, FileText, ChevronRight,
    TrendingUp, TrendingDown, Landmark, X, ArrowRightLeft,
    Lock, CheckCircle, Trash2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { formatPesos, handleCurrencyChange } from '../utils/currency';

import api from '../api/client';
import '../styles/caja-mobile.css';

export default function CajaBancos() {
    const [cuentas, setCuentas] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Cierre de Caja states
    const [cierreActivo, setCierreActivo] = useState(null);
    const [cierres, setCierres] = useState([]);
    const [showAperturaModal, setShowAperturaModal] = useState(false);
    const [showCierreModal, setShowCierreModal] = useState(false);
    const [saldoInicialApertura, setSaldoInicialApertura] = useState('');
    const [saldoRealCierre, setSaldoRealCierre] = useState('');
    const [obsCierre, setObsCierre] = useState('');

    // Form states
    const [nuevaCuenta, setNuevaCuenta] = useState({ nombre: '', tipo: 'banco', saldoInicial: 0, bancoNombre: '', numeroCuenta: '' });
    const [nuevoMov, setNuevoMov] = useState({ tipo: 'salida', categoria: '', monto: '', cuentaId: '', descripcion: '', metodo: 'efectivo' });
    const [nuevoTraslado, setNuevoTraslado] = useState({ origenId: '', destinoId: '', monto: '', descripcion: '' });

    // Navigation states
    const [viewMode, setViewMode] = useState('general'); // 'general', 'account', 'cierres'

    // Filter states
    const [selectedCuentaId, setSelectedCuentaId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);

            // Build query params for movements
            const movParams = new URLSearchParams();
            if (selectedCuentaId) movParams.append('cuentaId', selectedCuentaId);
            if (startDate) movParams.append('startDate', startDate);
            if (endDate) movParams.append('endDate', endDate);

            const cuentasRes = await api.get('/cuentas-financieras');
            const cuentasData = cuentasRes.data;

            // Assume the main cash register is the first one of type 'caja'
            const cajaPrincipal = cuentasData.find(c => c.tipo === 'caja');
            const targetCajaId = cajaPrincipal ? cajaPrincipal.id : 1;

            const [movsRes, cierreHoyRes, cierresRes] = await Promise.all([
                api.get(`/movimientos-financieros?${movParams.toString()}`),
                api.get(`/cierres/hoy?cuentaId=${targetCajaId}`),
                api.get('/cierres')
            ]);

            const movsData = movsRes.data;
            const cierreHoyData = cierreHoyRes.data;
            const cierresData = cierresRes.data;

            setCuentas(cuentasData);
            setMovimientos(movsData);
            setCierres(cierresData);

            if (cierreHoyData.activo) {
                setCierreActivo(cierreHoyData.cierre);
            } else {
                setCierreActivo(null);
                // Solo pedir apertura si NO hay cierres previos en absoluto (primera vez)
                if (viewMode === 'general' && !showAperturaModal && cierresData.length === 0) {
                    setTimeout(() => setShowAperturaModal(true), 500);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCuentaId, startDate, endDate]);

    const handleExportExcel = () => {
        if (movimientos.length === 0) return alert('No hay datos para exportar');

        // CSV Creation (Excel compatible)
        const headers = ["Fecha", "Hora", "Cuenta", "Tipo", "Categoría", "Descripción", "Usuario", "Monto"];
        const rows = movimientos.map(m => [
            new Date(m.fecha).toLocaleDateString(),
            m.hora,
            m.cuenta?.nombre || 'N/A',
            m.tipo.toUpperCase(),
            m.categoria,
            m.descripcion || '',
            m.usuario?.username || '-',
            m.tipo === 'salida' ? -m.monto : m.monto
        ]);

        const csvContent = [
            headers.join(";"),
            ...rows.map(r => r.join(";"))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `movimientos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateAccount = async () => {
        try {
            await api.post('/cuentas-financieras', nuevaCuenta);
            setShowAccountModal(false);
            setNuevaCuenta({ nombre: '', tipo: 'banco', saldoInicial: 0, bancoNombre: '', numeroCuenta: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al crear cuenta.');
            console.error('Error creating account:', error);
        }
    };

    const handleCreateMovement = async () => {
        try {
            await api.post('/movimientos-financieros', nuevoMov);
            setShowMovementModal(false);
            setNuevoMov({ tipo: 'salida', categoria: '', monto: '', cuentaId: '', descripcion: '', metodo: 'efectivo' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar movimiento');
            console.error('Error creating movement:', error);
        }
    };

    const handleCreateTransfer = async () => {
        if (!nuevoTraslado.origenId || !nuevoTraslado.destinoId || !nuevoTraslado.monto) {
            return alert("Por favor complete todos los campos obligatorios del traslado.");
        }
        if (nuevoTraslado.origenId === nuevoTraslado.destinoId) {
            return alert("La cuenta de origen y destino no pueden ser la misma.");
        }

        try {
            await api.post('/movimientos-financieros/traslado', nuevoTraslado);
            setShowTransferModal(false);
            setNuevoTraslado({ origenId: '', destinoId: '', monto: '', descripcion: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al procesar el traslado.');
            console.error('Error creating transfer:', error);
        }
    };

    const handleAperturaCaja = async () => {
        try {
            const cajaPrincipal = cuentas.find(c => c.tipo === 'caja');
            const targetCajaId = cajaPrincipal ? cajaPrincipal.id : 1;

            await api.post('/cierres/abrir', { saldoInicial: saldoInicialApertura || 0, cuentaId: targetCajaId });
            setShowAperturaModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al abrir caja.');
            console.error('Error opening register:', error);
        }
    };

    const handleCierreCaja = async () => {
        if (!cierreActivo) return;
        try {
            await api.post('/cierres/cerrar', {
                id: cierreActivo.id,
                saldoReal: saldoRealCierre || 0,
                observaciones: obsCierre
            });
            setShowCierreModal(false);
            setSaldoRealCierre('');
            setObsCierre('');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al cerrar caja.');
            console.error('Error closing register:', error);
        }
    };

    const handleDeleteAccount = async (accountId) => {
        if (!confirm('¿Está seguro de eliminar esta cuenta? Se eliminarán los cierres asociados.')) return;
        try {
            await api.delete(`/cuentas-financieras/${accountId}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al eliminar la cuenta');
        }
    };

    const totalDisponible = cuentas.reduce((sum, c) => sum + c.saldoActual, 0);
    const cajaPrincipalId = cuentas.find(c => c.tipo === 'caja')?.id;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTop: '3px solid #1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>Actualizando saldos y cajas...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div id="caja-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div id="caja-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Caja y Bancos</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                        <button
                            onClick={() => setViewMode('general')}
                            style={{ background: 'none', border: 'none', padding: 0, fontSize: '13px', fontWeight: viewMode === 'general' ? 600 : 400, color: viewMode === 'general' ? '#1E3A5F' : '#6B7280', cursor: 'pointer', borderBottom: viewMode === 'general' ? '2px solid #1E3A5F' : '2px solid transparent' }}
                        >
                            Resumen General
                        </button>
                        <button
                            onClick={() => setViewMode('cierres')}
                            style={{ background: 'none', border: 'none', padding: 0, fontSize: '13px', fontWeight: viewMode === 'cierres' ? 600 : 400, color: viewMode === 'cierres' ? '#1E3A5F' : '#6B7280', cursor: 'pointer', borderBottom: viewMode === 'cierres' ? '2px solid #1E3A5F' : '2px solid transparent' }}
                        >
                            Cierres Diarios
                        </button>
                    </div>
                </div>
                <div id="caja-actions" style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" onClick={() => setShowAccountModal(true)}>
                        <Building size={16} /> <span style={{ marginLeft: '6px' }}>Nueva Cuenta</span>
                    </Button>
                    <Button variant="secondary" onClick={() => setShowTransferModal(true)}>
                        <ArrowRightLeft size={16} /> <span style={{ marginLeft: '6px' }}>Trasladar</span>
                    </Button>
                    <Button onClick={() => setShowMovementModal(true)}>
                        <Plus size={16} /> <span style={{ marginLeft: '6px' }}>Gasto Manual</span>
                    </Button>
                    {!loading && (
                        cierreActivo ? (
                            <Button variant="danger" onClick={() => setShowCierreModal(true)}>
                                <Lock size={16} /> <span style={{ marginLeft: '6px' }}>Cierre Diario (Caja Ppal)</span>
                            </Button>
                        ) : (
                            <Button variant="success" onClick={() => setShowAperturaModal(true)}>
                                <Plus size={16} /> <span style={{ marginLeft: '6px' }}>Abrir Caja (Caja Ppal)</span>
                            </Button>
                        )
                    )}
                </div>
            </div>

            {viewMode === 'general' ? (
                <>
                    {/* Total Highlight */}
                    <div style={{
                        backgroundColor: '#1E3A5F',
                        padding: '24px',
                        borderRadius: '12px',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}>
                        <div>
                            <p style={{ fontSize: '14px', opacity: 0.8, fontWeight: 500 }}>Total Disponible (General)</p>
                            <p style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px' }}>{formatPesos(totalDisponible)}</p>
                        </div>
                        <div style={{ width: '56px', height: '56px', borderRadius: '56px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={28} />
                        </div>
                    </div>

                    {/* Cuentas - Minimalist List */}
                    <div id="caja-cuentas" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase' }}>Mis Cuentas</h2>
                        </div>
                        <div>
                            {cuentas.map((cuenta, idx) => (
                                <div
                                    key={cuenta.id}
                                    onClick={() => {
                                        setSelectedCuentaId(cuenta.id.toString());
                                        setViewMode('account');
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 20px',
                                        borderBottom: idx === cuentas.length - 1 ? 'none' : '1px solid #F3F4F6',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            backgroundColor: cuenta.tipo === 'caja' ? '#F3F4F6' : '#EEF2FF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {cuenta.tipo === 'caja' ? <Wallet size={16} color="#6B7280" /> : <Landmark size={16} color="#1E3A5F" />}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>{cuenta.nombre}{cuenta.tipo === 'banco' && cuenta.numeroCuenta ? ` ****${cuenta.numeroCuenta}` : ''}</h3>
                                            <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                                                {cuenta.tipo}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>{formatPesos(cuenta.saldoActual)}</p>
                                        {cuenta.id !== cajaPrincipalId && cuenta.saldoActual === 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAccount(cuenta.id); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Eliminar cuenta"
                                            >
                                                <Trash2 size={14} color="#DC2626" />
                                            </button>
                                        )}
                                        <ChevronRight size={14} color="#D1D5DB" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div id="caja-cuenta-detalle" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            backgroundColor: cuentas.find(c => c.id.toString() === selectedCuentaId)?.tipo === 'caja' ? '#F3F4F6' : '#EEF2FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {cuentas.find(c => c.id.toString() === selectedCuentaId)?.tipo === 'caja' ? <Wallet size={28} color="#6B7280" /> : <Landmark size={28} color="#1E3A5F" />}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A2E' }}>{cuentas.find(c => c.id.toString() === selectedCuentaId)?.nombre}</h2>
                            <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                                {cuentas.find(c => c.id.toString() === selectedCuentaId)?.tipo} {cuentas.find(c => c.id.toString() === selectedCuentaId)?.numeroCuenta ? `| #${cuentas.find(c => c.id.toString() === selectedCuentaId)?.numeroCuenta}` : ''}
                            </p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>SALDO ACTUAL</p>
                        <p style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
                            {formatPesos(cuentas.find(c => String(c.id) === String(selectedCuentaId))?.saldoActual || 0)}
                        </p>
                        <button
                            onClick={() => { setViewMode('general'); setSelectedCuentaId(''); }}
                            style={{ marginTop: '8px', color: '#1E3A5F', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            &larr; Volver a todas las cuentas
                        </button>
                    </div>
                </div>
            )}

            {/* History Table & Filters */}
            {viewMode !== 'cierres' && (
                <div id="caja-history" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <div id="caja-filters" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E' }}>
                            {viewMode === 'account' ? 'Historial Detallado' : (selectedCuentaId ? `Filtrado por: ${cuentas.find(c => c.id.toString() === selectedCuentaId)?.nombre}` : 'Todos los Movimientos Recientes')}
                        </h2>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>Desde</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>Hasta</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }}
                                />
                            </div>
                            {(startDate || endDate || (viewMode === 'general' && selectedCuentaId)) && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        if (viewMode === 'general') setSelectedCuentaId('');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    style={{ backgroundColor: '#FEF2F2', color: '#EF4444', borderColor: '#FEE2E2' }}
                                >
                                    <X size={14} style={{ marginRight: '6px' }} />Limpiar Filtros
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleExportExcel}
                                style={(startDate || endDate) ? { backgroundColor: '#1E3A5F', color: '#fff', borderColor: '#1E3A5F' } : {}}
                            >
                                <FileText size={14} style={{ marginRight: '6px' }} />{(startDate || endDate) ? 'Descargar Historial Filtrado' : 'Exportar Excel'}
                            </Button>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto', position: 'relative', minHeight: '200px' }}>
                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                <div style={{ color: '#1E3A5F', fontWeight: 600 }}>Cargando movimientos...</div>
                            </div>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse', opacity: loading ? 0.5 : 1 }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Fecha/Hora</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Cuenta</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Categoría</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Desc / Referencia</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Usuario</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.map(mov => (
                                    <tr key={mov.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '14px 20px', fontSize: '13px' }}>
                                            <div style={{ color: '#1A1A2E', fontWeight: 500 }}>{new Date(mov.fecha).toLocaleDateString()}</div>
                                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{mov.hora}</div>
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 500, color: '#374151' }}>{mov.cuenta?.nombre}</span>
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>{mov.categoria}</td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>
                                            <div>{mov.descripcion || '-'}</div>
                                            {mov.referencia && (
                                                <div style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 600, marginTop: '2px' }}>
                                                    {mov.referencia}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>{mov.usuario?.username || '-'}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: mov.tipo === 'entrada' ? '#16A34A' : '#DC2626' }}>
                                            {mov.tipo === 'entrada' ? '+' : '-'} {formatPesos(mov.monto)}
                                        </td>
                                    </tr>
                                ))}
                                {!loading && movimientos.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                <AlertCircle size={40} opacity={0.3} />
                                                <div>No se encontraron movimientos para los filtros seleccionados</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Cierres Diarios Table */}
            {viewMode === 'cierres' && (
                <div id="caja-cierres-history" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E' }}>Historial de Cierres Diarios</h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Fecha</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Estado</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Saldo Inicial</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Ingresos</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Egresos</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Saldo Teórico</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Saldo Físico</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Dif.</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Operador</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cierres.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#1A1A2E', fontWeight: 500 }}>
                                            {new Date(c.fechaApertura).toLocaleDateString()}
                                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(c.fechaApertura).toLocaleTimeString()}</div>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                                backgroundColor: c.estado === 'abierta' ? '#DCFCE7' : '#F3F4F6',
                                                color: c.estado === 'abierta' ? '#16A34A' : '#6B7280'
                                            }}>
                                                {c.estado.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatPesos(c.saldoInicial)}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', color: '#16A34A' }}>+{formatPesos(c.totalIngresos)}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', color: '#DC2626' }}>-{formatPesos(c.totalEgresos)}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#1E3A5F' }}>{formatPesos(c.saldoTeorico)}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', color: '#1A1A2E' }}>{c.saldoReal !== null ? formatPesos(c.saldoReal) : '-'}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: c.diferencia < 0 ? '#DC2626' : c.diferencia > 0 ? '#D97706' : '#16A34A' }}>
                                            {c.saldoReal !== null ? formatPesos(c.diferencia) : '-'}
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>{c.usuario?.username || '-'}</td>
                                    </tr>
                                ))}
                                {cierres.length === 0 && (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>No hay registros de cierres de caja.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Nueva Cuenta */}
            <Modal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} title="Nueva Cuenta">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre de la Cuenta *</label>
                        <input
                            type="text"
                            value={nuevaCuenta.nombre}
                            onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, nombre: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                            placeholder="Ej: Banco Bancolombia"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo *</label>
                        <select
                            value={nuevaCuenta.tipo}
                            onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, tipo: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                        >
                            <option value="banco">Banco</option>
                            <option value="caja">Caja (Efectivo)</option>
                        </select>
                    </div>
                    {nuevaCuenta.tipo === 'banco' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Últimos 4 dígitos de la cuenta</label>
                            <input
                                type="text"
                                maxLength={4}
                                value={nuevaCuenta.numeroCuenta}
                                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, numeroCuenta: e.target.value.replace(/\D/g, '') })}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                                placeholder="Ej: 4532"
                            />
                        </div>
                    )}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Saldo Inicial</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                            <input
                                type="text"
                                value={nuevaCuenta.saldoInicial ? parseInt(nuevaCuenta.saldoInicial).toLocaleString('es-CO') : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setNuevaCuenta({ ...nuevaCuenta, saldoInicial: raw });
                                }}
                                style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="secondary" onClick={() => setShowAccountModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateAccount}>Crear Cuenta</Button>
                    </div>
                </div>
            </Modal >

            {/* Modal Registrar Movimiento */}
            < Modal isOpen={showMovementModal} onClose={() => setShowMovementModal(false)
            } title="Registrar Movimiento Manual" >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Seleccionar Cuenta de Origen *</label>
                        <select
                            value={nuevoMov.cuentaId}
                            onChange={(e) => setNuevoMov({ ...nuevoMov, cuentaId: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                        >
                            <option value="">Seleccione cuenta (Efectivo / Banco)...</option>
                            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.tipo === 'banco' && c.numeroCuenta ? ` ****${c.numeroCuenta}` : ''} ({c.tipo === 'caja' ? 'Efectivo' : 'Banco'})</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Categoría de Gasto *</label>
                            <select
                                value={nuevoMov.categoria}
                                onChange={(e) => setNuevoMov({ ...nuevoMov, categoria: e.target.value })}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                            >
                                <option value="">Seleccione...</option>
                                <option value="Acueducto">Acueducto</option>
                                <option value="Aseo e insumos">Aseo e insumos</option>
                                <option value="Asesoria legal">Asesoria legal</option>
                                <option value="Arriendos">Arriendos</option>
                                <option value="Cafeteria">Cafeteria</option>
                                <option value="Combustible">Combustible</option>
                                <option value="Costos de servicio">Costos de servicio</option>
                                <option value="Dotación">Dotación</option>
                                <option value="Drogas y botiquin">Drogas y botiquin</option>
                                <option value="Energia">Energia</option>
                                <option value="Flete y envios">Flete y envios</option>
                                <option value="Gastos financieros">Gastos financieros</option>
                                <option value="Herramientas">Herramientas</option>
                                <option value="Honorarios contables">Honorarios contables</option>
                                <option value="Papeleria">Papeleria</option>
                                <option value="Personal">Personal</option>
                                <option value="Prestamos">Préstamos</option>
                                <option value="Reparaciones locativas">Reparaciones locativas</option>
                                <option value="Seguridad social">Seguridad social</option>
                                <option value="Tarjeta">Tarjeta</option>
                                <option value="Telefonia e internet">Telefonia e internet</option>
                                <option value="Viaticos">Viaticos</option>
                                <option value="Otros gastos">Otros gastos</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Monto *</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                            <input
                                type="text"
                                value={nuevoMov.monto ? parseInt(nuevoMov.monto).toLocaleString('es-CO') : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setNuevoMov({ ...nuevoMov, monto: raw });
                                }}
                                style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descripción / Referencia</label>
                        <textarea
                            value={nuevoMov.descripcion}
                            onChange={(e) => setNuevoMov({ ...nuevoMov, descripcion: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', minHeight: '80px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="secondary" onClick={() => setShowMovementModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateMovement}>Guardar Movimiento</Button>
                    </div>
                </div>
            </Modal >

            {/* Modal Trasladar Fondos */}
            < Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Trasladar Fondos" >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Origen (Sale de) *</label>
                            <select
                                value={nuevoTraslado.origenId}
                                onChange={(e) => setNuevoTraslado({ ...nuevoTraslado, origenId: e.target.value })}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                            >
                                <option value="">Seleccione...</option>
                                {cuentas.map(c => <option key={`orig-${c.id}`} value={c.id}>{c.nombre}{c.tipo === 'banco' && c.numeroCuenta ? ` ****${c.numeroCuenta}` : ''} — {formatPesos(c.saldoActual)}</option>)}
                            </select>
                            {nuevoTraslado.origenId && (() => { const c = cuentas.find(x => x.id === parseInt(nuevoTraslado.origenId)); return c ? <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Disponible: <strong style={{ color: c.saldoActual >= 0 ? '#16A34A' : '#DC2626' }}>{formatPesos(c.saldoActual)}</strong></div> : null; })()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '20px' }}>
                            <ArrowRightLeft size={20} color="#9CA3AF" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Destino (Entra a) *</label>
                            <select
                                value={nuevoTraslado.destinoId}
                                onChange={(e) => setNuevoTraslado({ ...nuevoTraslado, destinoId: e.target.value })}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                            >
                                <option value="">Seleccione...</option>
                                {cuentas.map(c => <option key={`dest-${c.id}`} value={c.id}>{c.nombre}{c.tipo === 'banco' && c.numeroCuenta ? ` ****${c.numeroCuenta}` : ''} — {formatPesos(c.saldoActual)}</option>)}
                            </select>
                            {nuevoTraslado.destinoId && (() => { const c = cuentas.find(x => x.id === parseInt(nuevoTraslado.destinoId)); return c ? <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Saldo actual: <strong>{formatPesos(c.saldoActual)}</strong></div> : null; })()}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Monto a trasladar *</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                            <input
                                type="text"
                                value={nuevoTraslado.monto ? parseInt(nuevoTraslado.monto).toLocaleString('es-CO') : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setNuevoTraslado({ ...nuevoTraslado, monto: raw });
                                }}
                                style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Concepto (Opcional)</label>
                        <textarea
                            value={nuevoTraslado.descripcion}
                            onChange={(e) => setNuevoTraslado({ ...nuevoTraslado, descripcion: e.target.value })}
                            placeholder="Ej: Consignación a banco del cierre de caja"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', minHeight: '60px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTransfer}>Aplicar Traslado</Button>
                    </div>
                </div>
            </Modal >

            {/* Modal Apertura de Caja */}
            <Modal isOpen={showAperturaModal} onClose={() => {
                if (!cierreActivo && viewMode === 'general') {
                    // Force the user to open the cash register if they are in 'general' view and there is no active cash register.
                    return alert("Debe establecer el Saldo Inicial para operar hoy.");
                }
                setShowAperturaModal(false);
            }} title="Apertura de Caja">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
                    <div style={{ padding: '12px', backgroundColor: '#EFF6FF', color: '#1E3A5F', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Lock size={16} />
                        <div>
                            <strong>Caja Principal</strong><br />
                            No se ha realizado la apertura de caja para el día de hoy. Ingrese el dinero base.
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Saldo Inicial (Físico en Base) *</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                            <input
                                type="text"
                                value={saldoInicialApertura ? parseInt(saldoInicialApertura).toLocaleString('es-CO') : ''}
                                onChange={(e) => setSaldoInicialApertura(e.target.value.replace(/\D/g, ''))}
                                style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <Button
                            variant="primary"
                            onClick={handleAperturaCaja}
                            style={{ flex: 1, padding: '12px' }}
                            disabled={!saldoInicialApertura}
                        >
                            Abir Caja y Comenzar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Cierre de Caja */}
            <Modal isOpen={showCierreModal} onClose={() => setShowCierreModal(false)} title="Cierre de Caja (Cuadre)">
                {cierreActivo ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                            <div>
                                <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Saldo Inicial</p>
                                <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>{formatPesos(cierreActivo.saldoInicial)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Ingresos del día (Est.)</p>
                                <p style={{ fontSize: '15px', fontWeight: 700, color: '#16A34A' }}>Calculado aut.</p>
                            </div>
                        </div>

                        <div style={{ padding: '12px', backgroundColor: '#FFFBEB', color: '#D97706', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #FEF3C7' }}>
                            <AlertCircle size={16} />
                            El sistema calculará el Saldo Teórico uniendo Ventas y Salidas Automáticas en el servidor. Compare con el Saldo Real.
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Saldo Real (Dinero Físico Comprobado) *</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontWeight: 600, fontSize: '14px' }}>$</span>
                                <input
                                    type="text"
                                    value={saldoRealCierre ? parseInt(saldoRealCierre).toLocaleString('es-CO') : ''}
                                    onChange={(e) => setSaldoRealCierre(e.target.value.replace(/\D/g, ''))}
                                    style={{ width: '100%', padding: '14px 12px 14px 28px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '20px', fontWeight: 700, color: '#1E3A5F' }}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Observaciones (Opcional)</label>
                            <textarea
                                value={obsCierre}
                                onChange={e => setObsCierre(e.target.value)}
                                rows={3}
                                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', resize: 'none' }}
                                placeholder="Explicar faltantes/sobrantes si los hay..."
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <Button variant="secondary" onClick={() => setShowCierreModal(false)} style={{ flex: 1 }}>Cancelar</Button>
                            <Button
                                variant="primary"
                                onClick={handleCierreCaja}
                                style={{ flex: 1, backgroundColor: '#DC2626' }}
                            >
                                Guardar Cierre
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>Caja no está abierta.</div>
                )}
            </Modal>
        </div >
    );
}
