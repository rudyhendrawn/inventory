import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Alert,
    Spinner,
    Badge,
    Table
} from 'react-bootstrap';

interface Settings {
    id: number;
    app_name: string;
    items_per_page: number;
    allow_negative_stock: boolean;
    auto_backup_enabled: boolean;
    backup_retention_days: number;
    low_stock_threshold: number;
    enable_notifications: boolean;
    updated_at: string;
    updated_by: number | null;
}

interface SystemInfo {
    platform: string;
    platform_release?: string;
    platform_version: string;
    python_version: string;
    cpu_count: number;
    cpu_percent: number;
    memory_total_gb: number;
    memory_used_gb: number;
    memory_percent: number;
    disk_total_gb: number;
    disk_used_gb: number;
    disk_percent: number;
    uptime: string;
}

function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [form, setForm] = useState({
        app_name: '',
        items_per_page: 50,
        allow_negative_stock: false,
        auto_backup_enabled: true,
        backup_retention_days: 30,
        low_stock_threshold: 10,
        enable_notifications: true,
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'ADMIN')) {
            navigate('/dashboard');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchSettings();
            fetchSystemInfo();
        }
    }, [user]);

    const fetchSettings = async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/settings/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const data: Settings = await response.json();
            setSettings(data);
            setForm({
                app_name: data.app_name,
                items_per_page: data.items_per_page,
                allow_negative_stock: data.allow_negative_stock,
                auto_backup_enabled: data.auto_backup_enabled,
                backup_retention_days: data.backup_retention_days,
                low_stock_threshold: data.low_stock_threshold,
                enable_notifications: data.enable_notifications,
            });
        } catch (err) {
            setError((err as Error).message || 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSystemInfo = async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/settings/system-info`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data: SystemInfo = await response.json();
                setSystemInfo(data);
            }
        } catch (err) {
            console.error('Failed to fetch system info:', err);
        }
    };

    const handleChange = (field: string, value: string | boolean | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_BASE_URL}/settings/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update settings');
            }

            const data: Settings = await response.json();
            setSettings(data);
            setSuccess('Settings updated successfully');
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError((err as Error).message || 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTriggerBackup = async () => {
        if (!token) return;

        setIsBackingUp(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_BASE_URL}/settings/backup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to trigger backup');
            }

            const data = await response.json();
            setSuccess(data.message || 'Backup triggered successfully');
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError((err as Error).message || 'Failed to trigger backup');
        } finally {
            setIsBackingUp(false);
        }
    };


    const formatNumber = (value: unknown, decimals: number) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return '-';
        return value.toFixed(decimals);
    };

    const formatPercent = (value: unknown, decimals: number) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return '-';
        return `${value.toFixed(decimals)}%`;
    };

    const getUsageBadge = (value: unknown) => {
        return typeof value === 'number' && !Number.isNaN(value) && value > 80 ? 'danger' : 'success';
    };

    if (authLoading || isLoading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    return (
        <div className="w-100 h-100">
            <Container fluid className="py-4 px-4">
                <Row className="mb-4">
                    <Col>
                        <h2 className="mb-0">
                            <i className="bi bi-gear me-2"></i>
                            Settings
                        </h2>
                        <p className="text-muted">Manage application settings and configuration</p>
                    </Col>
                </Row>

                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                        {success}
                    </Alert>
                )}

                <Row className="g-4">
                    {/* Application Settings */}
                    <Col lg={8}>
                        <Card className="shadow-sm">
                            <Card.Header className="bg-white border-bottom">
                                <h5 className="mb-0">Application Settings</h5>
                            </Card.Header>
                            <Card.Body>
                                <Form onSubmit={handleSubmit}>
                                    <Row className="g-3">
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label>Application Name</Form.Label>
                                                <Form.Control
                                                    value={form.app_name}
                                                    onChange={(e) => handleChange('app_name', e.target.value)}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>

                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label>Items Per Page</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="10"
                                                    max="100"
                                                    value={form.items_per_page}
                                                    onChange={(e) => handleChange('items_per_page', Number(e.target.value))}
                                                    required
                                                />
                                                <Form.Text className="text-muted">
                                                    Number of items to display per page (10-100)
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>

                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label>Low Stock Threshold</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="0"
                                                    value={form.low_stock_threshold}
                                                    onChange={(e) => handleChange('low_stock_threshold', Number(e.target.value))}
                                                    required
                                                />
                                                <Form.Text className="text-muted">
                                                    Alert when stock falls below this level
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>

                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label>Backup Retention Days</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="365"
                                                    value={form.backup_retention_days}
                                                    onChange={(e) => handleChange('backup_retention_days', Number(e.target.value))}
                                                    required
                                                />
                                                <Form.Text className="text-muted">
                                                    Number of days to retain backups (1-365)
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>

                                        <Col md={12}>
                                            <hr />
                                            <h6 className="mb-3">Options</h6>
                                        </Col>

                                        <Col md={12}>
                                            <Form.Check
                                                type="checkbox"
                                                id="allow-negative-stock"
                                                label="Allow Negative Stock"
                                                checked={form.allow_negative_stock}
                                                onChange={(e) => handleChange('allow_negative_stock', e.target.checked)}
                                            />
                                            <Form.Text className="text-muted d-block mb-2">
                                                Allow stock quantities to go below zero
                                            </Form.Text>
                                        </Col>

                                        <Col md={12}>
                                            <Form.Check
                                                type="checkbox"
                                                id="auto-backup"
                                                label="Enable Automatic Backups"
                                                checked={form.auto_backup_enabled}
                                                onChange={(e) => handleChange('auto_backup_enabled', e.target.checked)}
                                            />
                                            <Form.Text className="text-muted d-block mb-2">
                                                Automatically create daily database backups
                                            </Form.Text>
                                        </Col>

                                        <Col md={12}>
                                            <Form.Check
                                                type="checkbox"
                                                id="enable-notifications"
                                                label="Enable Notifications"
                                                checked={form.enable_notifications}
                                                onChange={(e) => handleChange('enable_notifications', e.target.checked)}
                                            />
                                            <Form.Text className="text-muted d-block mb-2">
                                                Show notifications for low stock and other alerts
                                            </Form.Text>
                                        </Col>
                                    </Row>

                                    <div className="d-flex justify-content-end gap-2 mt-4">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => fetchSettings()}
                                            disabled={isSaving}
                                        >
                                            Reset
                                        </Button>
                                        <Button variant="primary" type="submit" disabled={isSaving}>
                                            {isSaving ? (
                                                <>
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-save me-2"></i>
                                                    Save Settings
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* System Information & Actions */}
                    <Col lg={4}>
                        {/* Backup Section */}
                        <Card className="shadow-sm mb-4">
                            <Card.Header className="bg-white border-bottom">
                                <h5 className="mb-0">Backup</h5>
                            </Card.Header>
                            <Card.Body>
                                <p className="text-muted mb-3">
                                    Create a manual backup of the database
                                </p>
                                <Button
                                    variant="success"
                                    className="w-100"
                                    onClick={handleTriggerBackup}
                                    disabled={isBackingUp}
                                >
                                    {isBackingUp ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Creating Backup...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-cloud-arrow-down me-2"></i>
                                            Trigger Backup Now
                                        </>
                                    )}
                                </Button>
                            </Card.Body>
                        </Card>

                        {/* System Info */}
                        {systemInfo && (
                            <Card className="shadow-sm">
                                <Card.Header className="bg-white border-bottom">
                                    <h5 className="mb-0">System Information</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Table size="sm" className="mb-0">
                                        <tbody>
                                            <tr>
                                                <td className="fw-semibold">Platform</td>
                                                <td>{systemInfo.platform}</td>
                                            </tr>
                                            <tr>
                                                <td className="fw-semibold">Python</td>
                                                <td>{systemInfo.python_version}</td>
                                            </tr>
                                            <tr>
                                                <td className="fw-semibold">CPU Cores</td>
                                                <td>{systemInfo.cpu_count}</td>
                                            </tr>
                                            <tr>
                                                <td className="fw-semibold">CPU Usage</td>
                                                <td>
                                                    <Badge bg={getUsageBadge(systemInfo.cpu_percent)}>
                                                        {formatPercent(systemInfo.cpu_percent, 1)}
                                                    </Badge>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="fw-semibold">Memory</td>
                                                <td>
                                                    {formatNumber(systemInfo.memory_used_gb, 2)} / {formatNumber(systemInfo.memory_total_gb, 2)} GB
                                                    <br />
                                                    <Badge bg={getUsageBadge(systemInfo.memory_percent)}>
                                                        {formatPercent(systemInfo.memory_percent, 1)}
                                                    </Badge>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="fw-semibold">Disk</td>
                                                <td>
                                                    {formatNumber(systemInfo.disk_used_gb, 2)} / {formatNumber(systemInfo.disk_total_gb, 2)} GB
                                                    <br />
                                                    <Badge bg={getUsageBadge(systemInfo.disk_percent)}>
                                                        {formatPercent(systemInfo.disk_percent, 1)}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        )}
                    </Col>
                </Row>

                {settings && (
                    <Row className="mt-4">
                        <Col>
                            <Card className="shadow-sm">
                                <Card.Body>
                                    <small className="text-muted">
                                        Last updated: {new Date(settings.updated_at).toLocaleString()}
                                    </small>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                )}
            </Container>
        </div>
    );
}

export default SettingsPage;