import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Button,
    Form,
    Badge,
    Spinner,
    Pagination,
    Modal,
    Alert
} from 'react-bootstrap';
import QRCode from 'qrcode';
import { downloadQRCodesPDF } from '../utils/qrPdfGenerators';

interface Item {
    id: number;
    sku: string;
    name: string;
    category_id: number;
    unit_id: number;
    owner_user_id: number | null;
    qrcode: string | null;
    min_stock: number;
    image_url: string | null;
    active: boolean;
    created_at?: string;
}

interface ItemListResponse {
    items: Item[];
    total: number;
    page: number;
    page_size: number;
}

interface Category {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

function ItemsPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [searchTerm, ] = useState('');
    const [activeOnly, ] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize] = useState(50);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Item; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState({
        sku: '',
        name: '',
        qrcode: '',
        minStockMin: '',
        minStockMax: '',
        status: 'all',
    });
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedItemForQR, setSelectedItemForQR] = useState<Item | null>(null);
    const [showBulkQRModal, setShowBulkQRModal] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [bulkQRCodes, setBulkQRCodes] = useState<{ item: Item; dataUrl: string }[]>([]);
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/login');
        }
    }, [authLoading, currentUser, navigate]);

    useEffect(() => {
        fetchItems();
        fetchMetadata();
    }, [currentPage, searchTerm, activeOnly]);

    const fetchMetadata = async () => {
        if (!token) return;

        try {
            const [categoriesRes, usersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/categories?page=1&page_size=100`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/users?page=1&page_size=100&active_only=1`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                setCategories(categoriesData || []);
            }
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(usersData.users || []);
            }
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    };

    const getCategoryName = (categoryId: number): string => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : 'Unknown';
    };

    const getUserName = (userId: number | null): string => {
        if (!userId) return 'Unassigned';
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Unknown';
    };

    const generateQRData = (item: Item): string => {
        const qrInfo = {
            item_id: item.id,
            sku: item.sku,
            name: item.name,
            category: getCategoryName(item.category_id),
            owner: getUserName(item.owner_user_id),
            status: item.active ? 'Active' : 'Inactive',
        };
        return JSON.stringify(qrInfo, null, 2);
    };

    const handleGenerateQR = async (item: Item) => {
        try {
            const qrData = generateQRData(item);
            const dataUrl = await QRCode.toDataURL(qrData, { 
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                }
            });
            setQrDataUrl(dataUrl);
            setSelectedItemForQR(item);
            setShowQRModal(true);
        } catch (error) {
            console.error('Error generating QR code:', error);
            setError('Failed to generate QR code');
        }
    };

    const handleDownloadQR = () => {
        if (!qrDataUrl || !selectedItemForQR) return;

        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `QR_${selectedItemForQR.sku}_${selectedItemForQR.name.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateBulkQR = async () => {
        setIsGeneratingBulk(true);
        try {
            const qrPromises = sortedItems.map(async (item) => {
                const qrData = generateQRData(item);
                const dataUrl = await QRCode.toDataURL(qrData, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    }
                });
                return { item, dataUrl };
            });
            const qrResults = await Promise.all(qrPromises);
            setBulkQRCodes(qrResults);
            setShowBulkQRModal(true);
        } catch (error) {
            console.error('Error generating bulk QR codes:', error);
            setError('Failed to generate bulk QR codes');
        } finally {
            setIsGeneratingBulk(false);
        }
    };

    const handleDownloadBulkPDF = async () => {
        setIsGeneratingBulk(true);
        try {
            const qrPromises = sortedItems.map(async (item) => {
                const qrData = generateQRData(item);
                const dataUrl = await QRCode.toDataURL(qrData, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    }
                });
                return { 
                    sku: item.sku, 
                    name: item.name,
                    dataUrl 
                };
            });

            const qrItems = await Promise.all(qrPromises);

            // Generate and download PDF
            downloadQRCodesPDF(qrItems, undefined, {
                cols: 5,
                rows: 6,
                showGrid: true,
            });
        } catch (error) {
            console.error('Error generating bulk QR codes PDF:', error);
            setError('Failed to generate bulk QR codes PDF');
        } finally {
            setIsGeneratingBulk(false);
        }
    };

    const handleRowClick = (item: Item) => {
        setSelectedItem(item);
        setShowModal(true);
    };

    const fetchItems = async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                page_size: pageSize.toString(),
                active_only: activeOnly ? '1' : '0',
            });

            if (searchTerm.trim()) {
                params.append('search', searchTerm.trim());
            }

            const response = await fetch(`${API_BASE_URL}/items`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }

            const data: ItemListResponse = await response.json();
            setItems(data.items);
            setTotalItems(data.total);
            setTotalPages(Math.ceil(data.total / pageSize));
        } catch (err) {
            setError((err as Error).message || 'Failed to load items');
            console.error('Error fetching items:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        if (!token) return;
        if (!window.confirm('Delete this item?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete item');
            }
            fetchItems();
        } catch (err) {
            setError((err as Error).message || 'Failed to delete item');
        }
    };

    const handleSort = (key: keyof Item) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key: keyof Item) => {
        if (sortConfig?.key !== key) return '';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (filters.sku && !item.sku.toLowerCase().includes(filters.sku.toLowerCase())) {
                return false;
            }
            if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) {
                return false;
            }
            const qrcodeValue = item.qrcode ?? '';
            if (filters.qrcode && !qrcodeValue.toLowerCase().includes(filters.qrcode.toLowerCase())) {
                return false;
            }
            if (filters.status !== 'all') {
                const isActive = Boolean(item.active);
                if (filters.status === 'active' && !isActive) return false;
                if (filters.status === 'inactive' && isActive) return false;
            }
            if (filters.minStockMin) {
                const min = Number(filters.minStockMin);
                if (!Number.isNaN(min) && (typeof item.min_stock !== 'number' || item.min_stock < min)) {
                    return false;
                }
            }
            if (filters.minStockMax) {
                const max = Number(filters.minStockMax);
                if (!Number.isNaN(max) && (typeof item.min_stock !== 'number' || item.min_stock > max)) {
                    return false;
                }
            }
            return true;
        });
    }, [items, filters]);

    const sortedItems = useMemo(() => {
        if (!sortConfig) return filteredItems;
        const data = [...filteredItems];
        data.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            let result = 0;
            if (aValue == null && bValue == null) result = 0;
            else if (aValue == null) result = 1;
            else if (bValue == null) result = -1;
            else if (typeof aValue === 'number' && typeof bValue === 'number') {
                result = aValue - bValue;
            } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                result = Number(aValue) - Number(bValue);
            } else {
                result = String(aValue).localeCompare(String(bValue));
            }
            return sortConfig.direction === 'asc' ? result : -result;
        });
        return data;
    }, [filteredItems, sortConfig]);

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
                {/* Header */}
                <Row className="mb-4">
                    <Col>
                        <h2 className="mb-0">
                            <i className="bi bi-grid me-2"></i>
                            Items Management
                        </h2>
                        <p className="text-muted">Manage inventory items and stock</p>
                    </Col>
                    <Col xs="auto" className="d-flex gap-2">
                        <Button 
                            variant="outline-primary" 
                            onClick={handleGenerateBulkQR}
                            disabled={isGeneratingBulk || sortedItems.length === 0}
                        >
                            {isGeneratingBulk ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-qr-code me-2"></i>
                                    Generate All QR Codes
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline-success"
                            onClick={handleDownloadBulkPDF}
                            disabled={isGeneratingBulk || sortedItems.length === 0}
                        >
                            {isGeneratingBulk ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Preparing PDF...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-file-earmark-pdf-fill me-2"></i>
                                    Download All as PDF
                                </>
                            )}
                        </Button>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                            <Button variant="primary" onClick={() => navigate('/items/new')}>
                                <i className="bi bi-plus-circle me-2"></i>
                                Add Item
                            </Button>
                        )}
                    </Col>
                </Row>

                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Items Table */}
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <Row className="align-items-center">
                            <Col>
                                <h5 className="mb-0">
                                    Items ({filteredItems.length} / {totalItems})
                                </h5>
                            </Col>
                        </Row>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {items.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                                <p className="mb-0">No items found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '120px' }}>QR Code</th>
                                            <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }}>
                                                SKU {getSortIndicator('sku')}
                                            </th>
                                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                                Name {getSortIndicator('name')}
                                            </th>
                                            <th onClick={() => handleSort('qrcode')} style={{ cursor: 'pointer' }}>
                                                QR Data {getSortIndicator('qrcode')}
                                            </th>
                                            <th onClick={() => handleSort('min_stock')} style={{ cursor: 'pointer' }}>
                                                Min Stock {getSortIndicator('min_stock')}
                                            </th>
                                            <th onClick={() => handleSort('active')} style={{ cursor: 'pointer' }}>
                                                Status {getSortIndicator('active')}
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                        <tr>
                                            <th></th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Filter SKU"
                                                    value={filters.sku}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, sku: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Filter name"
                                                    value={filters.name}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Filter QR Data"
                                                    value={filters.qrcode}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, qrcode: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <div className="d-flex gap-1">
                                                    <Form.Control
                                                        size="sm"
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        placeholder="Min"
                                                        value={filters.minStockMin}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, minStockMin: e.target.value }))}
                                                    />
                                                    <Form.Control
                                                        size="sm"
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        placeholder="Max"
                                                        value={filters.minStockMax}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, minStockMax: e.target.value }))}
                                                    />
                                                </div>
                                            </th>
                                            <th>
                                                <Form.Select
                                                    size="sm"
                                                    value={filters.status}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                                                >
                                                    <option value="all">All</option>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </Form.Select>
                                            </th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleRowClick(item)}
                                            >
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => handleGenerateQR(item)}
                                                    >
                                                        <i className="bi bi-qr-code me-1"></i>
                                                        Generate
                                                    </Button>
                                                </td>
                                                <td>
                                                    <code className="text-primary fw-bold">
                                                        {item.sku}
                                                    </code>
                                                </td>
                                                <td className="fw-semibold">{item.name}</td>
                                                <td>
                                                    {item.qrcode ? (
                                                        <code className="text-secondary">
                                                            {item.qrcode}
                                                        </code>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge bg="info">
                                                        {typeof item.min_stock === 'number'
                                                            ? item.min_stock.toFixed(1)
                                                            : '0.0'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge bg={item.active ? 'success' : 'danger'}>
                                                        {item.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                                                        <>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => navigate(`/items/${item.id}/edit`)}
                                                            >
                                                                <i className="bi bi-pencil me-1"></i>
                                                                Edit
                                                            </Button>
                                                            {currentUser?.role === 'ADMIN' && (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                >
                                                                    <i className="bi bi-trash me-1"></i>
                                                                    Delete
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                    {totalPages > 1 && (
                        <Card.Footer className="bg-white border-top">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted">
                                    Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                                    {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                                </span>
                                <Pagination className="mb-0">
                                    <Pagination.Prev
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    />
                                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = index + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = index + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + index;
                                        } else {
                                            pageNum = currentPage - 2 + index;
                                        }
                                        return (
                                            <Pagination.Item
                                                key={pageNum}
                                                active={currentPage === pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Pagination.Item>
                                        );
                                    })}
                                    <Pagination.Next
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    />
                                </Pagination>
                            </div>
                        </Card.Footer>
                    )}
                </Card>
            </Container>

            {/* Single QR Code Modal */}
            <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>QR Code - {selectedItemForQR?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {selectedItemForQR && (
                        <>
                            <img src={qrDataUrl} alt="QR Code" className="img-fluid mb-3" />
                            <Card className="text-start">
                                <Card.Body>
                                    <h6 className="mb-3">QR Code contains:</h6>
                                    <p className="mb-1"><strong>Item ID:</strong> {selectedItemForQR.id}</p>
                                    <p className="mb-1"><strong>SKU:</strong> {selectedItemForQR.sku}</p>
                                    <p className="mb-1"><strong>Name:</strong> {selectedItemForQR.name}</p>
                                    <p className="mb-1"><strong>Category:</strong> {getCategoryName(selectedItemForQR.category_id)}</p>
                                    <p className="mb-1"><strong>Owner:</strong> {getUserName(selectedItemForQR.owner_user_id)}</p>
                                    <p className="mb-0"><strong>Status:</strong> {selectedItemForQR.active ? 'Active' : 'Inactive'}</p>
                                </Card.Body>
                            </Card>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowQRModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleDownloadQR}>
                        <i className="bi bi-download me-2"></i>
                        Download QR Code
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Bulk QR Codes Modal */}
            <Modal show={showBulkQRModal} onHide={() => setShowBulkQRModal(false)} size="xl" scrollable>
                <Modal.Header closeButton>
                    <Modal.Title>All QR Codes ({bulkQRCodes.length} items)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className="g-4">
                        {bulkQRCodes.map(({ item, dataUrl }) => (
                            <Col md={4} key={item.id}>
                                <Card>
                                    <Card.Body className="text-center">
                                        <img src={dataUrl} alt={`QR Code for ${item.sku}`} className="img-fluid mb-2" style={{ maxWidth: '200px' }} />
                                        <h6 className="mb-1">{item.sku}</h6>
                                        <p className="text-muted small mb-0">{item.name}</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBulkQRModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleDownloadBulkPDF}>
                        <i className="bi bi-download me-2"></i>
                        Download All ({bulkQRCodes.length})
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Item Details Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Item Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <Row className="g-3">
                            <Col md={6}>
                                <strong>SKU:</strong>
                                <p><code className="text-primary">{selectedItem.sku}</code></p>
                            </Col>
                            <Col md={6}>
                                <strong>Name:</strong>
                                <p>{selectedItem.name}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Category:</strong>
                                <p>{getCategoryName(selectedItem.category_id)}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Owner:</strong>
                                <p>{getUserName(selectedItem.owner_user_id)}</p>
                            </Col>
                            <Col md={6}>
                                <strong>QR Data:</strong>
                                <p>{selectedItem.qrcode || '-'}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Minimum Stock:</strong>
                                <p>{selectedItem.min_stock.toFixed(2)}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Status:</strong>
                                <p>
                                    <Badge bg={selectedItem.active ? 'success' : 'danger'}>
                                        {selectedItem.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </p>
                            </Col>
                            {selectedItem.image_url && (
                                <Col md={12}>
                                    <strong>Image:</strong>
                                    <p>
                                        <a href={selectedItem.image_url} target="_blank" rel="noopener noreferrer">
                                            View Image
                                        </a>
                                    </p>
                                </Col>
                            )}
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default ItemsPage;
