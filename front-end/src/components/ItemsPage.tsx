import { useState, useEffect } from 'react';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize] = useState(50);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [showModal, setShowModal] = useState(false);

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

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleActiveFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setActiveOnly(e.target.checked);
        setCurrentPage(1);
    };

    const handleRowClick = (item: Item) => {
        setSelectedItem(item);
        setShowModal(true);
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
                            <Button variant="primary">
                                <i className="bi bi-plus-circle me-2"></i>
                                Add Item
                            </Button>
                        </Col>
                    )}
                </Row>

                {/* Filters */}
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Search</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by SKU or name..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6} className="d-flex align-items-end">
                                <Form.Check
                                    type="checkbox"
                                    id="active-filter"
                                    label="Show active items only"
                                    checked={activeOnly}
                                    onChange={handleActiveFilterChange}
                                />
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

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
                                    Items ({totalItems})
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
                                            <th>SKU</th>
                                            <th>Name</th>
                                            <th>Barcode</th>
                                            <th>Min Stock</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
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
                                                        {item.min_stock.toFixed(2)}
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
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>
                                                            {currentUser?.role === 'ADMIN' && (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                >
                                                                    <i className="bi bi-trash"></i>
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