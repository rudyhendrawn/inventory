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
    Alert,
    Pagination,
    Modal
} from 'react-bootstrap';

interface Item {
    id: number;
    sku: string;
    name: string;
    category_id: number;
    unit_id: number;
    owner_user_id: number | null;
    barcode: string | null;
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

function ItemsPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [searchTerm, ] = useState('');
    const [activeOnly, ] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
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
        barcode: '',
        minStockMin: '',
        minStockMax: '',
        status: 'all',
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/login');
        }
    }, [authLoading, currentUser, navigate]);

    useEffect(() => {
        fetchItems();
    }, [currentPage, searchTerm, activeOnly]);

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

    const handleRowClick = (item: Item) => {
        setSelectedItem(item);
        setShowModal(true);
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
        return sortConfig.direction === 'asc' ? '^' : 'v';
    };

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (filters.sku && !item.sku.toLowerCase().includes(filters.sku.toLowerCase())) {
                return false;
            }
            if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) {
                return false;
            }
            const barcodeValue = item.barcode ?? '';
            if (filters.barcode && !barcodeValue.toLowerCase().includes(filters.barcode.toLowerCase())) {
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
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                        <Col xs="auto">
                            <Button variant="primary" onClick={() => navigate('/items/new')}>
                                <i className="bi bi-plus-circle me-2"></i>
                                Add Item
                            </Button>
                        </Col>
                    )}
                </Row>
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
                                            <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }}>
                                                SKU {getSortIndicator('sku')}
                                            </th>
                                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                                Name {getSortIndicator('name')}
                                            </th>
                                            <th onClick={() => handleSort('barcode')} style={{ cursor: 'pointer' }}>
                                                Barcode {getSortIndicator('barcode')}
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
                                                    placeholder="Filter barcode"
                                                    value={filters.barcode}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, barcode: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <div className="d-flex gap-1">
                                                    <Form.Control
                                                        size="sm"
                                                        type="number"
                                                        step="0.1"
                                                        placeholder="Min"
                                                        value={filters.minStockMin}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, minStockMin: e.target.value }))}
                                                    />
                                                    <Form.Control
                                                        size="sm"
                                                        type="number"
                                                        step="0.1"
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
                                                <td>
                                                    <code className="text-primary fw-bold">
                                                        {item.sku}
                                                    </code>
                                                </td>
                                                <td className="fw-semibold">{item.name}</td>
                                                <td>
                                                    {item.barcode ? (
                                                        <code className="text-secondary">
                                                            {item.barcode}
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
                                <strong>Barcode:</strong>
                                <p>{selectedItem.barcode || '-'}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Minimum Stock:</strong>
                                <p>{selectedItem.min_stock.toFixed(2)}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Category ID:</strong>
                                <p>{selectedItem.category_id}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Unit ID:</strong>
                                <p>{selectedItem.unit_id}</p>
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
