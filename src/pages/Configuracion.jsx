import React, { useState } from 'react';
import { Globe, Building2, Receipt, Printer, Save, MessageCircle, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import WhatsApp from './WhatsApp';
import Roles from './Roles';
import ConfiguracionCajas from './ConfiguracionCajas';

const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'impuestos', label: 'Impuestos', icon: Receipt },
    { id: 'impresion', label: 'Impresión', icon: Printer },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'roles', label: 'Roles y Permisos', icon: Shield },
    { id: 'cajas', label: 'Cajas POS', icon: Printer }, // Using Printer as placeholder, or could use PC/Monitor
];

export default function Configuracion() {
    const [tab, setTab] = useState('general');

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
                <div style={{ padding: '28px', maxWidth: (tab === 'whatsapp' || tab === 'roles' || tab === 'cajas') ? '100%' : '520px' }}>
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
                </div>
            </div>
        </div>
    );
}
