import React, { useState, useEffect } from 'react';
import { Globe, Building2, Receipt, Printer, Save, MessageCircle, Shield, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import WhatsApp from './WhatsApp';
import Roles from './Roles';
import ConfiguracionCajas from './ConfiguracionCajas';
import api from '../api/client';

const baseTabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'impuestos', label: 'Impuestos', icon: Receipt },
    { id: 'impresion', label: 'Impresión', icon: Printer },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'roles', label: 'Roles y Permisos', icon: Shield },
    { id: 'cajas', label: 'Cajas POS', icon: Printer },
];

export default function Configuracion() {
    const [tab, setTab] = useState('general');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPanicModal, setShowPanicModal] = useState(false);
    const [panicConfirmText, setPanicConfirmText] = useState('');
    const [panicLoading, setPanicLoading] = useState(false);

    useEffect(() => {
        api.get('/perfil').then(res => {
            const user = res.data;
            setIsAdmin(user.role === 'admin' || (user.permisos && user.permisos.includes('all')));
        }).catch(() => {});
    }, []);

    const handlePanicReset = async () => {
        if (panicConfirmText !== 'RESETEAR') return;
        setPanicLoading(true);
        try {
            await api.post('/admin/panic-reset', { confirmCode: 'RESETEAR' });
            alert('Sistema reseteado correctamente. Se recargará la página.');
            window.location.reload();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al resetear el sistema');
        } finally {
            setPanicLoading(false);
            setShowPanicModal(false);
            setPanicConfirmText('');
        }
    };

    const tabs = isAdmin
        ? [...baseTabs, { id: 'sistema', label: 'Sistema', icon: AlertTriangle }]
        : baseTabs;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Configuración</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Ajustes del sistema</p>
                </div>
                <Button icon={Save}>Guardar Cambios</Button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '2px solid #E2E5EA' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '14px 24px', fontSize: '13px', fontWeight: tab === t.id ? 600 : 500,
                            color: tab === t.id ? '#1E3A5F' : '#6B7280', backgroundColor: 'transparent',
                            border: 'none', borderBottom: tab === t.id ? '2px solid #1E3A5F' : '2px solid transparent',
                            marginBottom: '-2px', cursor: 'pointer', transition: 'all 150ms'
                        }}>
                            <t.icon size={16} />{t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '28px', maxWidth: (tab === 'whatsapp' || tab === 'roles' || tab === 'cajas' || tab === 'sistema') ? '100%' : '520px' }}>
                    {tab === 'general' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#EBF0F7', borderRadius: '10px' }}>
                                <Globe size={20} style={{ color: '#1E3A5F' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Configuración General</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Ajustes básicos del sistema</p></div>
                            </div>
                            <Select label="Idioma" options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} />
                            <Select label="Zona horaria" options={[{ value: 'America/Bogota', label: 'América/Bogotá (UTC-5)' }, { value: 'America/Mexico_City', label: 'América/Ciudad de México (UTC-6)' }]} />
                            <Select label="Moneda" options={[{ value: 'COP', label: 'COP — Peso Colombiano' }, { value: 'USD', label: 'USD — Dólar' }]} />
                            <Select label="Formato fecha" options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }]} />
                        </div>
                    )}

                    {tab === 'empresa' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#EBF0F7', borderRadius: '10px' }}>
                                <Building2 size={20} style={{ color: '#1E3A5F' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Datos de la Empresa</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Información legal y de contacto</p></div>
                            </div>
                            <Input label="Razón Social" defaultValue="REFRIELECTRIC" />
                            <Input label="NIT" defaultValue="900.123.456-1" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <Input label="Teléfono" defaultValue="601-555-1234" />
                                <Input label="Email" defaultValue="info@elconstructor.com" />
                            </div>
                            <Input label="Dirección" defaultValue="Calle 45 #12-34, Bogotá" />
                            <Input label="Ciudad" defaultValue="Bogotá D.C." />
                        </div>
                    )}

                    {tab === 'impuestos' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#EBF0F7', borderRadius: '10px' }}>
                                <Receipt size={20} style={{ color: '#1E3A5F' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Impuestos</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Tasas y retenciones aplicables</p></div>
                            </div>
                            <Select label="IVA General" options={[{ value: '19', label: '19%' }, { value: '5', label: '5%' }, { value: '0', label: '0% — Exento' }]} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#F0F2F5', borderRadius: '8px' }}>
                                <input type="checkbox" id="iva-incl" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#1E3A5F' }} />
                                <label htmlFor="iva-incl" style={{ fontSize: '13px', color: '#1A1A2E', cursor: 'pointer' }}>Incluir IVA en precio de venta</label>
                            </div>
                            <Select label="Retención" options={[{ value: '0', label: 'No aplica' }, { value: '2.5', label: '2.5%' }]} />
                        </div>
                    )}

                    {tab === 'impresion' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#EBF0F7', borderRadius: '10px' }}>
                                <Printer size={20} style={{ color: '#1E3A5F' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Impresión</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Formato de tickets y recibos</p></div>
                            </div>
                            <Select label="Impresora" options={[{ value: 'thermal', label: 'Térmica (80mm)' }, { value: 'standard', label: 'Estándar (A4)' }]} />
                            <Input label="Encabezado del ticket" defaultValue="REFRIELECTRIC" />
                            <Input label="Pie del ticket" defaultValue="¡Gracias por su compra!" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#F0F2F5', borderRadius: '8px' }}>
                                <input type="checkbox" id="logo" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#1E3A5F' }} />
                                <label htmlFor="logo" style={{ fontSize: '13px', color: '#1A1A2E', cursor: 'pointer' }}>Imprimir logo en ticket</label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#F0F2F5', borderRadius: '8px' }}>
                                <input type="checkbox" id="autoprint" style={{ width: '18px', height: '18px', accentColor: '#1E3A5F' }} />
                                <label htmlFor="autoprint" style={{ fontSize: '13px', color: '#1A1A2E', cursor: 'pointer' }}>Impresión automática al vender</label>
                            </div>
                        </div>
                    )}

                    {tab === 'whatsapp' && <WhatsApp />}
                    {tab === 'roles' && <Roles />}
                    {tab === 'cajas' && <ConfiguracionCajas />}

                    {tab === 'sistema' && isAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                                <AlertTriangle size={20} style={{ color: '#DC2626' }} />
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>Zona de Peligro</p>
                                    <p style={{ fontSize: '11px', color: '#B91C1C' }}>Acciones irreversibles del sistema</p>
                                </div>
                            </div>

                            <div style={{ padding: '20px', backgroundColor: '#FFF', border: '2px solid #FCA5A5', borderRadius: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B', marginBottom: '6px' }}>Resetear Sistema</h3>
                                        <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                                            Elimina <strong>todos los datos</strong>: ventas, compras, movimientos de caja,
                                            cierres, cuentas por cobrar/pagar, productos, servicios, stock y devoluciones.
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5', marginTop: '6px' }}>
                                            <strong>Se mantienen:</strong> clientes, proveedores, usuarios, roles,
                                            ubicaciones y configuración. Los saldos de cuentas financieras se ponen en $0.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowPanicModal(true)}
                                        style={{
                                            flexShrink: 0, padding: '10px 20px', backgroundColor: '#DC2626', color: '#FFF',
                                            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                            cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Resetear Todo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación Panic Reset */}
            <Modal isOpen={showPanicModal} onClose={() => { setShowPanicModal(false); setPanicConfirmText(''); }} title="Confirmar Reset del Sistema">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '420px' }}>
                    <div style={{ padding: '14px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: '1.5' }}>
                            <strong>Esta acción es IRREVERSIBLE.</strong><br />
                            Se eliminarán todas las ventas, compras, movimientos de caja, cierres,
                            cuentas por cobrar/pagar, productos, servicios, stock y devoluciones. Los saldos se pondrán en $0.
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                            Para confirmar, escriba <strong style={{ color: '#DC2626' }}>RESETEAR</strong> en el campo:
                        </label>
                        <input
                            type="text"
                            value={panicConfirmText}
                            onChange={(e) => setPanicConfirmText(e.target.value)}
                            placeholder="Escriba RESETEAR"
                            style={{
                                width: '100%', padding: '10px 14px', border: '2px solid #E5E7EB', borderRadius: '8px',
                                fontSize: '15px', fontWeight: 600, textAlign: 'center', letterSpacing: '2px',
                                borderColor: panicConfirmText === 'RESETEAR' ? '#DC2626' : '#E5E7EB'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => { setShowPanicModal(false); setPanicConfirmText(''); }}>
                            Cancelar
                        </Button>
                        <button
                            onClick={handlePanicReset}
                            disabled={panicConfirmText !== 'RESETEAR' || panicLoading}
                            style={{
                                padding: '10px 24px', backgroundColor: panicConfirmText === 'RESETEAR' ? '#DC2626' : '#9CA3AF',
                                color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                cursor: panicConfirmText === 'RESETEAR' ? 'pointer' : 'not-allowed', opacity: panicLoading ? 0.7 : 1
                            }}
                        >
                            {panicLoading ? 'Reseteando...' : 'Confirmar Reset'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
