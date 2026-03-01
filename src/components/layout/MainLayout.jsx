import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Responsive width logic
    const sidebarWidth = sidebarCollapsed ? 72 : 250;

    // Check if we are on mobile (very basic check, Tailwind classes would be better but let's stick to inline style logic for consistency with original)
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            backgroundColor: '#F0F2F5',
            overflow: 'hidden'
        }}>
            <Sidebar
                collapsed={isMobile ? !sidebarOpen : sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                isMobile={isMobile}
                mobileOpen={sidebarOpen}
                onMobileClose={() => setSidebarOpen(false)}
            />

            <div style={{
                marginLeft: isMobile ? '0' : `${sidebarWidth}px`,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                transition: 'margin-left 300ms ease',
                width: '100%',
                minWidth: 0,
                height: '100vh',
                overflow: 'hidden'
            }}>
                {/* Header fijo */}
                <Topbar
                    isMobile={isMobile}
                    onMenuToggle={() => setSidebarOpen(true)}
                />

                {/* Contenido scrollable */}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: isMobile ? '16px 12px' : '32px 40px',
                    width: '100%',
                    minHeight: 0
                }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
