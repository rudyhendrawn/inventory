import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Button, Badge, Offcanvas } from 'react-bootstrap';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const logoUrl = new URL('../../assets/sgi-logo.png', import.meta.url).href;
    // const logoLargeStyle = { width: '240px', height: '200px' };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
        { path: '/items', icon: 'bi-grid', label: 'Items' },
    ];

    // Only show for admin
    if (user?.role === 'ADMIN') {
        menuItems.push({ path: '/users', icon: 'bi-people', label: 'Users' });
        menuItems.push({ path: '/settings', icon: 'bi-gear', label: 'Settings' });
    }

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="d-flex" style={{ minHeight: '100vh' }}>
            {/* Desktop Sidebar */}
            <div className="sidebar d-none d-lg-flex flex-column bg-dark text-white" style={{ width: '250px' }}>
                <div className="sidebar-header p-3 border-bottom border-secondary">
                    <div className="d-flex align-items-center">
                        <img src={logoUrl} alt="SGI logo" className="brand-logo brand-logo-lg me-2"/>
                        <h5 className="mb-0">Inventory Management System</h5>
                    </div>
                </div>

                <div className="grow overflow-auto">
                    <nav className="nav flex-column p-3">
                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                className={`nav-link text-white text-start border-0 bg-transparent px-3 py-2 mb-1 rounded ${
                                    isActive(item.path) ? 'active bg-primary' : ''
                                }`}
                                onClick={() => navigate(item.path)}
                            >
                                <i className={`bi ${item.icon} me-2`}></i>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {user && (
                    <div className="sidebar-footer border-top border-secondary p-3">
                        <div className="d-flex align-items-center mb-2">
                            <div className="grow">
                                <div className="fw-bold small">{user.name}</div>
                                <Badge bg="primary" className="small">{user.role}</Badge>
                            </div>
                        </div>
                        <Button
                            variant="outline-light"
                            size="sm"
                            className="w-100"
                            onClick={handleLogout}
                        >
                            <i className="bi bi-box-arrow-right me-1"></i>
                            Logout
                        </Button>
                    </div>
                )}
            </div>

            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas
                show={sidebarOpen}
                onHide={() => setSidebarOpen(false)}
                className="bg-dark text-white"
            >
                <Offcanvas.Header closeButton closeVariant="white" className="border-bottom border-secondary">
                    <Offcanvas.Title>
                        <img src={logoUrl} alt="SGI logo" className="brand-logo me-2" />
                        Inventory Management System
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <nav className="nav flex-column">
                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                className={`nav-link text-white text-start border-0 bg-transparent px-3 py-2 mb-1 rounded ${
                                    isActive(item.path) ? 'active bg-primary' : ''
                                }`}
                                onClick={() => {
                                    navigate(item.path);
                                    setSidebarOpen(false);
                                }}
                            >
                                <i className={`bi ${item.icon} me-2`}></i>
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {user && (
                        <div className="mt-auto pt-3 border-top border-secondary">
                            <div className="mb-3">
                                <div className="fw-bold">{user.name}</div>
                                <Badge bg="primary">{user.role}</Badge>
                            </div>
                            <Button
                                variant="outline-light"
                                className="w-100"
                                onClick={handleLogout}
                            >
                                <i className="bi bi-box-arrow-right me-1"></i>
                                Logout
                            </Button>
                        </div>
                    )}
                </Offcanvas.Body>
            </Offcanvas>

            {/* Main Content Area */}
            <div className="grow d-flex flex-column main-content-wrapper">
                {/* Top Navigation Bar (Mobile) */}
                <nav className="navbar navbar-dark bg-dark shadow-sm d-lg-none">
                    <Container fluid>
                        <Button
                            variant="outline-light"
                            size="sm"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <i className="bi bi-list fs-5"></i>
                        </Button>
                        <div className="navbar-brand mb-0 h5 d-flex align-items-center">
                            <img src={logoUrl} alt="SGI logo" className="brand-logo me-2" />
                            <span>Inventory Management System</span>
                        </div>
                        <div style={{ width: '40px' }}></div>
                    </Container>
                </nav>

                {/* Page Content */}
                <main className="grow bg-light" style={{ width: '100%' }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;