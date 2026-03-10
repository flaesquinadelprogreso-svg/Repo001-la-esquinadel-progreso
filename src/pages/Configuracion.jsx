import React, { useState, useEffect } from 'react';
import { Globe, Building2, Receipt, Printer, Save, MessageCircle, Shield, AlertTriangle, Download, Upload, Database } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import WhatsApp from './WhatsApp';
import Roles from './Roles';
import ConfiguracionCajas from './ConfiguracionCajas';
import api from '../api/client';
import '../styles/configuracion-mobile.css';

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
    const [backupLoading, setBackupLoading] = useState(false);
    const [driveLoading, setDriveLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [restoreFile, setRestoreFile] = useState(null);
    const restoreInputRef = React.useRef(null);
    const [gdriveCredentials, setGdriveCredentials] = useState('');
    const [gdriveFolderId, setGdriveFolderId] = useState('');
    const [gdriveConfigured, setGdriveConfigured] = useState(false);
    const [gdriveSaving, setGdriveSaving] = useState(false);
    const [showGdriveConfig, setShowGdriveConfig] = useState(false);

    useEffect(() => {
        api.get('/perfil').then(res => {
            const user = res.data;
            setIsAdmin(user.role === 'admin' || (user.permisos && user.permisos.includes('all')));
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (isAdmin) {
            api.get('/admin/gdrive-config').then(res => {
                setGdriveConfigured(res.data?.configured || false);
                setGdriveFolderId(res.data?.folderId || '');
                if (res.data?.hasCredentials) setGdriveCredentials('__saved__');
            }).catch(() => {});
        }
    }, [isAdmin]);

    const handleSaveGdriveConfig = async () => {
        setGdriveSaving(true);
        try {
            const payload = { folderId: gdriveFolderId };
            if (gdriveCredentials && gdriveCredentials !== '__saved__') {
                payload.credentials = gdriveCredentials;
            }
            const response = await api.post('/admin/gdrive-config', payload);
            if (response.data?.warning) {
                alert(response.data.warning);
            } else {
                alert(response.data?.message || 'Guardado');
            }
            setGdriveConfigured(!!(gdriveCredentials && gdriveFolderId));
            if (gdriveCredentials && gdriveCredentials !== '__saved__') setGdriveCredentials('__saved__');
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al guardar');
        } finally {
            setGdriveSaving(false);
        }
    };

    const handleDownloadBackup = async () => {
        setBackupLoading(true);
        try {
            const response = await api.get('/admin/backup', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fecha = new Date().toISOString().slice(0, 10);
            link.setAttribute('download', `backup-${fecha}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al descargar backup');
        } finally {
            setBackupLoading(false);
        }
    };

    const handleRestore = async () => {
        if (restoreConfirmText !== 'RESTAURAR' || !restoreFile) return;
        setRestoreLoading(true);
        try {
            const text = await restoreFile.text();
            const backup = JSON.parse(text);
            if (!backup.datos || !backup.datos.productos) {
                alert('El archivo no es un backup válido');
                setRestoreLoading(false);
                return;
            }
            await api.post('/admin/restore', { confirmCode: 'RESTAURAR', datos: backup.datos });
            alert('Backup restaurado correctamente. Se recargará la página.');
            window.location.reload();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al restaurar backup');
        } finally {
            setRestoreLoading(false);
            setShowRestoreModal(false);
            setRestoreConfirmText('');
            setRestoreFile(null);
        }
    };

    const handleBackupDrive = async () => {
        setDriveLoading(true);
        try {
            const response = await api.post('/admin/backup-drive');
            alert(response.data?.message || 'Backup subido a Google Drive');
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al subir backup a Google Drive');
        } finally {
            setDriveLoading(false);
        }
    };

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
        <div id="config-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div id="config-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E' }}>Configuración</h1>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Ajustes del sistema</p>
                </div>
                <Button icon={Save}>Guardar Cambios</Button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Tabs */}
                <div id="config-tabs" style={{ display: 'flex', borderBottom: '2px solid #E2E5EA' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '14px 24px', fontSize: '13px', fontWeight: tab === t.id ? 600 : 500,
                            color: tab === t.id ? '#F2A900' : '#6B7280', backgroundColor: 'transparent',
                            border: 'none', borderBottom: tab === t.id ? '2px solid #F2A900' : '2px solid transparent',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FFF8E7', borderRadius: '10px' }}>
                                <Globe size={20} style={{ color: '#F2A900' }} />
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FFF8E7', borderRadius: '10px' }}>
                                <Building2 size={20} style={{ color: '#F2A900' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Datos de la Empresa</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Información legal y de contacto</p></div>
                            </div>
                            <Input label="Razón Social" defaultValue="FERRETERIA LA ESQUINA DEL PROGRESO" />
                            <Input label="NIT" defaultValue="19.591.012-2" />
                            <div id="config-empresa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <Input label="Teléfono" defaultValue="3014147802" />
                                <Input label="Email" defaultValue="flaesquinadelprogreso@gmail.com" />
                            </div>
                            <Input label="Dirección" defaultValue="Calle 45 #12-34, Bogotá" />
                            <Input label="Ciudad" defaultValue="Bogotá D.C." />
                        </div>
                    )}

                    {tab === 'impuestos' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FFF8E7', borderRadius: '10px' }}>
                                <Receipt size={20} style={{ color: '#F2A900' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Impuestos</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Tasas y retenciones aplicables</p></div>
                            </div>
                            <Select label="IVA General" options={[{ value: '19', label: '19%' }, { value: '5', label: '5%' }, { value: '0', label: '0% — Exento' }]} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#F0F2F5', borderRadius: '8px' }}>
                                <input type="checkbox" id="iva-incl" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#F2A900' }} />
                                <label htmlFor="iva-incl" style={{ fontSize: '13px', color: '#1A1A2E', cursor: 'pointer' }}>Incluir IVA en precio de venta</label>
                            </div>
                            <Select label="Retención" options={[{ value: '0', label: 'No aplica' }, { value: '2.5', label: '2.5%' }]} />
                        </div>
                    )}

                    {tab === 'impresion' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FFF8E7', borderRadius: '10px' }}>
                                <Printer size={20} style={{ color: '#F2A900' }} />
                                <div><p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Impresión</p><p style={{ fontSize: '11px', color: '#9CA3AF' }}>Formato de tickets y recibos</p></div>
                            </div>
                            <Select label="Impresora" options={[{ value: 'thermal', label: 'Térmica (80mm)' }, { value: 'standard', label: 'Estándar (A4)' }]} />
                            <Input label="Encabezado del ticket" defaultValue="FERRETERIA LA ESQUINA DEL PROGRESO" />
                            <Input label="Pie del ticket" defaultValue="¡Gracias por su compra!" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#F0F2F5', borderRadius: '8px' }}>
                                <input type="checkbox" id="logo" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#F2A900' }} />
                                <label htmlFor="logo" style={{ fontSize: '13px', color: '#1A1A2E', cursor: 'pointer' }}>Imprimir logo en ticket</label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#F0F2F5', borderRadius: '8px' }}>
                                <input type="checkbox" id="autoprint" style={{ width: '18px', height: '18px', accentColor: '#F2A900' }} />
                                <label htmlFor="autoprint" style={{ fontSize: '13px', color: '#1A1A2E', cursor: 'pointer' }}>Impresión automática al vender</label>
                            </div>
                        </div>
                    )}

                    {tab === 'whatsapp' && <WhatsApp />}
                    {tab === 'roles' && <Roles />}
                    {tab === 'cajas' && <ConfiguracionCajas />}

                    {tab === 'sistema' && isAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                            {/* Backup Section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FFF8E7', borderRadius: '10px', border: '1px solid #C7D2E0' }}>
                                <Database size={20} style={{ color: '#F2A900' }} />
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>Respaldo de Base de Datos</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Descarga y restaura copias de seguridad</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div style={{ padding: '20px', backgroundColor: '#FFF', border: '1px solid #E2E5EA', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Download size={18} color="#F2A900" />
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>Descargar</h3>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5', marginBottom: '14px' }}>
                                        Descarga toda la base de datos como archivo JSON.
                                    </p>
                                    <button
                                        onClick={handleDownloadBackup}
                                        disabled={backupLoading}
                                        style={{
                                            width: '100%', padding: '10px 16px', backgroundColor: '#F2A900', color: '#FFF',
                                            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                            cursor: backupLoading ? 'not-allowed' : 'pointer', opacity: backupLoading ? 0.7 : 1,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Download size={16} />
                                        {backupLoading ? 'Generando...' : 'Descargar'}
                                    </button>
                                </div>

                                <div style={{ padding: '20px', backgroundColor: '#FFF', border: '1px solid #E2E5EA', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="#4285F4"/><path d="M12 2v16l6.79 3 .71-.71z" fill="#0066DA"/><path d="M4.5 20.29l.71.71L12 18V2z" fill="#00AC47"/><path d="M22 12l-5.5-9.5L12 2v10z" fill="#EA4335"/><path d="M12 12v6l6.79 3L22 12z" fill="#00832D"/><path d="M2 12l2.5 8.29L12 18V12z" fill="#2684FC"/><path d="M12 2L6.5 11.5 2 12h10z" fill="#FFBA00"/></svg>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>Google Drive</h3>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5', marginBottom: '14px' }}>
                                        Sube el backup directamente a Google Drive. Automático cada 15 días.
                                    </p>
                                    <button
                                        onClick={handleBackupDrive}
                                        disabled={driveLoading}
                                        style={{
                                            width: '100%', padding: '10px 16px', backgroundColor: '#4285F4', color: '#FFF',
                                            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                            cursor: driveLoading ? 'not-allowed' : 'pointer', opacity: driveLoading ? 0.7 : 1,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Upload size={16} />
                                        {driveLoading ? 'Subiendo...' : 'Subir a Drive'}
                                    </button>
                                </div>

                                <div style={{ padding: '20px', backgroundColor: '#FFF', border: '1px solid #E2E5EA', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Upload size={18} color="#D97706" />
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>Restaurar</h3>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5', marginBottom: '14px' }}>
                                        Restaura desde un archivo. <strong style={{ color: '#DC2626' }}>Reemplaza todo.</strong>
                                    </p>
                                    <button
                                        onClick={() => setShowRestoreModal(true)}
                                        style={{
                                            width: '100%', padding: '10px 16px', backgroundColor: '#FFF', color: '#D97706',
                                            border: '2px solid #D97706', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Upload size={16} />
                                        Restaurar
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '12px 16px', backgroundColor: gdriveConfigured ? '#F0FDF4' : '#FFFBEB', borderRadius: '8px', border: `1px solid ${gdriveConfigured ? '#BBF7D0' : '#FDE68A'}` }}>
                                <p style={{ fontSize: '12px', color: gdriveConfigured ? '#166534' : '#92400E', lineHeight: '1.5' }}>
                                    {gdriveConfigured
                                        ? <><strong>Backup automático activo:</strong> Se genera y sube a Google Drive los días 1 y 15 de cada mes a las 2:00 AM (Colombia). Se conservan los últimos 6 backups (~3 meses).</>
                                        : <><strong>Google Drive no configurado.</strong> Configure las credenciales abajo para activar el backup automático.</>
                                    }
                                </p>
                            </div>

                            {/* Google Drive Config */}
                            <div style={{ padding: '20px', backgroundColor: '#FFF', border: '1px solid #E2E5EA', borderRadius: '10px' }}>
                                <div
                                    onClick={() => setShowGdriveConfig(!showGdriveConfig)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
                                            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.95 10.3z" fill="#ea4335"/>
                                            <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                            <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h32.6c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                            <path d="M73.4 26.5 60.65 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.6 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                        </svg>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>Configurar Google Drive</p>
                                            <p style={{ fontSize: '11px', color: '#6B7280' }}>
                                                {gdriveConfigured ? 'Conectado' : 'No configurado'} — click para {showGdriveConfig ? 'ocultar' : 'expandir'}
                                            </p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '18px', color: '#6B7280', transition: 'transform 200ms', transform: showGdriveConfig ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                </div>

                                {showGdriveConfig && (
                                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                            <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                                                <strong>Pasos:</strong><br/>
                                                1. Ir a <strong>console.cloud.google.com</strong> → Crear proyecto<br/>
                                                2. Activar <strong>Google Drive API</strong> en Biblioteca<br/>
                                                3. Crear <strong>Cuenta de servicio</strong> en Credenciales → Descargar clave JSON<br/>
                                                4. Crear una carpeta en Google Drive y <strong>compartirla</strong> con el email de la cuenta de servicio<br/>
                                                5. Copiar el <strong>ID de la carpeta</strong> (última parte de la URL)
                                            </p>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                                Credenciales JSON (cuenta de servicio):
                                            </label>
                                            <textarea
                                                value={gdriveCredentials === '__saved__' ? '' : gdriveCredentials}
                                                onChange={(e) => setGdriveCredentials(e.target.value)}
                                                placeholder={gdriveCredentials === '__saved__' ? 'Credenciales guardadas. Pegue nuevas para reemplazar.' : 'Pegue aquí el contenido del archivo JSON...'}
                                                rows={4}
                                                style={{
                                                    width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px',
                                                    fontSize: '12px', fontFamily: 'monospace', resize: 'vertical',
                                                    backgroundColor: gdriveCredentials === '__saved__' ? '#F0FDF4' : '#FFF'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                                ID de la carpeta en Google Drive:
                                            </label>
                                            <input
                                                type="text"
                                                value={gdriveFolderId}
                                                onChange={(e) => setGdriveFolderId(e.target.value)}
                                                placeholder="Ej: 1ABCdefGHijKLMnopQRStuvWXyz"
                                                style={{
                                                    width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px',
                                                    fontSize: '13px', fontFamily: 'monospace'
                                                }}
                                            />
                                            <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                                De la URL: drive.google.com/drive/folders/<strong>ESTE_ES_EL_ID</strong>
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleSaveGdriveConfig}
                                            disabled={gdriveSaving || (!gdriveFolderId)}
                                            style={{
                                                padding: '10px 20px', backgroundColor: gdriveFolderId ? '#059669' : '#9CA3AF', color: '#FFF',
                                                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                                cursor: gdriveFolderId ? 'pointer' : 'not-allowed', opacity: gdriveSaving ? 0.7 : 1,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Save size={16} />
                                            {gdriveSaving ? 'Guardando y verificando...' : 'Guardar y Verificar Conexión'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', marginTop: '12px' }}>
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
                                            cierres, cuentas por cobrar/pagar, productos, servicios, stock, devoluciones
                                            y todas las cuentas bancarias/cajas secundarias.
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5', marginTop: '6px' }}>
                                            <strong>Se mantiene:</strong> solo la Caja Principal (con saldo en $0),
                                            clientes, proveedores, usuarios, roles, ubicaciones y configuración.
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

            {/* Modal de Restaurar Backup */}
            <Modal isOpen={showRestoreModal} onClose={() => { setShowRestoreModal(false); setRestoreConfirmText(''); setRestoreFile(null); }} title="Restaurar Backup">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '420px' }}>
                    <div style={{ padding: '14px', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', color: '#92400E', lineHeight: '1.5' }}>
                            <strong>Esta acción reemplazará TODOS los datos actuales</strong> con los del archivo de backup.
                            Asegúrese de tener un backup actual antes de continuar.
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                            Seleccionar archivo de backup (.json):
                        </label>
                        <input
                            ref={restoreInputRef}
                            type="file"
                            accept=".json"
                            onChange={(e) => setRestoreFile(e.target.files[0] || null)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}
                        />
                        {restoreFile && (
                            <p style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                                Archivo: {restoreFile.name} ({(restoreFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                            Para confirmar, escriba <strong style={{ color: '#D97706' }}>RESTAURAR</strong>:
                        </label>
                        <input
                            type="text"
                            value={restoreConfirmText}
                            onChange={(e) => setRestoreConfirmText(e.target.value)}
                            placeholder="Escriba RESTAURAR"
                            style={{
                                width: '100%', padding: '10px 14px', border: '2px solid #E5E7EB', borderRadius: '8px',
                                fontSize: '15px', fontWeight: 600, textAlign: 'center', letterSpacing: '2px',
                                borderColor: restoreConfirmText === 'RESTAURAR' ? '#D97706' : '#E5E7EB'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" onClick={() => { setShowRestoreModal(false); setRestoreConfirmText(''); setRestoreFile(null); }}>
                            Cancelar
                        </Button>
                        <button
                            onClick={handleRestore}
                            disabled={restoreConfirmText !== 'RESTAURAR' || !restoreFile || restoreLoading}
                            style={{
                                padding: '10px 24px', backgroundColor: (restoreConfirmText === 'RESTAURAR' && restoreFile) ? '#D97706' : '#9CA3AF',
                                color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                cursor: (restoreConfirmText === 'RESTAURAR' && restoreFile) ? 'pointer' : 'not-allowed',
                                opacity: restoreLoading ? 0.7 : 1
                            }}
                        >
                            {restoreLoading ? 'Restaurando...' : 'Confirmar Restauración'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de confirmación Panic Reset */}
            <Modal isOpen={showPanicModal} onClose={() => { setShowPanicModal(false); setPanicConfirmText(''); }} title="Confirmar Reset del Sistema">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '420px' }}>
                    <div style={{ padding: '14px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: '1.5' }}>
                            <strong>Esta acción es IRREVERSIBLE.</strong><br />
                            Se eliminarán todas las ventas, compras, movimientos de caja, cierres,
                            cuentas por cobrar/pagar, productos, servicios, stock, devoluciones
                            y todas las cuentas financieras excepto la Caja Principal (que quedará en $0).
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
