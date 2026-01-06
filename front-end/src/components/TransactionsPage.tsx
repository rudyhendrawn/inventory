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
    Spinner,
    Alert,
    Badge,
    Pagination,
} from 'react-bootstrap';

interface Transaction {
    id: number;
    item_id: number;
    item_code?: string;
    item_name?: string;
    location_id: number;
    location_name?: string;
    tx_type: string;
    qty: number;
    qty_on_hand?: number;
    ref?: string | null;
    note?: string | null;
    tx_at: string;
    user_id: number;
}

interface TransactionListResponse {
    txs: Transaction[];
    total: number;
    page: number;
    page_size: number;
}

interface ItemOption {
    id: number;
    item_code: string;
    name: string;
}

interface LocationOption {
    id: number;
    name: string;
}

function TransactionsPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [items, setItems] = useState<ItemOption[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize] = useState(50);
    const [filters, setFilters] = useState({
        search: '',
        tx_type: 'all',
        item_id: '',
        location_id: '',
    });
    const [searchInput, setSearchInput] = useState('');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/login');
        }
    }, [authLoading, currentUser, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchTransactions();
    }, [currentPage, filters, token]);

    useEffect(() => {
        if (!token) return;
        fetchMetadata();
    }, [token]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setFilters((prev) => ({ ...prev, search: searchInput }));
        }, 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const fetchMetadata = async () => {
        if (!token) return;
        try {
            const [itemsRes, locationsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/items?page=1&page_size=100&active_only=1`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/locations?page=1&page_size=100&active_only=1`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (itemsRes.ok) {
                const data = await itemsRes.json();
                setItems(data.items || []);
            }
            if (locationsRes.ok) {
                const data = await locationsRes.json();
                setLocations(data || []);
            }
        } catch (err) {
            console.error('Error fetching metadata:', err);
        }
    };

    const fetchTransactions = async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                page_size: pageSize.toString(),
            });
            if (filters.search.trim()) params.append('search', filters.search.trim());
            if (filters.tx_type !== 'all') params.append('tx_type', filters.tx_type);
            if (filters.item_id) params.append('item_id', filters.item_id);
            if (filters.location_id) params.append('location_id', filters.location_id);

            const response = await fetch(`${API_BASE_URL}/transactions?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data: TransactionListResponse = await response.json();
            setTransactions(data.txs || []);
            setTotalItems(data.total);
            setTotalPages(Math.ceil(data.total / pageSize));
        } catch (err) {
            setError((err as Error).message || 'Failed to load transactions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (txId: number) => {
        if (!token) return;
        if (!window.confirm('Delete this transaction?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/transactions/${txId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete transaction');
            }
            fetchTransactions();
        } catch (err) {
            setError((err as Error).message || 'Failed to delete transaction');
        }
    };

    const getTxBadge = (txType: string) => {
        switch (txType) {
            case 'IN':
                return 'success';
            case 'OUT':
                return 'danger';
            case 'ADJ':
                return 'warning';
            default:
                return 'secondary';
        }
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
                            <i className="bi bi-arrow-left-right me-2"></i>
                            Stock Transactions
                        </h2>
                        <p className="text-muted">Track stock movements and adjustments</p>
                    </Col>
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                        <Col xs="auto">
                            <Button variant="primary" onClick={() => navigate('/transactions/new')}>
                                <i className="bi bi-plus-circle me-2"></i>
                                New Transaction
                            </Button>
                        </Col>
                    )}
                </Row>

                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Card className="shadow-sm mb-4">
                    <Card.Body>
                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Search</Form.Label>
                                    <Form.Control
                                        placeholder="Item, location, ref, note..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select
                                        value={filters.tx_type}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, tx_type: e.target.value }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="IN">IN</option>
                                        <option value="OUT">OUT</option>
                                        <option value="ADJ">ADJ</option>
                                        <option value="XFER">XFER</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Item</Form.Label>
                                    <Form.Select
                                        value={filters.item_id}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, item_id: e.target.value }))}
                                    >
                                        <option value="">All Items</option>
                                        {items.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.item_code} - {item.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Location</Form.Label>
                                    <Form.Select
                                        value={filters.location_id}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, location_id: e.target.value }))}
                                    >
                                        <option value="">All Locations</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <h5 className="mb-0">Transactions ({totalItems})</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {transactions.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                                <p className="mb-0">No transactions found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Item Code</th>
                                            <th>Item Name</th>
                                            <th>Location</th>
                                            <th>Type</th>
                                            <th>Qty</th>
                                            <th>On Hand</th>
                                            <th>Ref</th>
                                            <th>Note</th>
                                            <th style={{ width: '160px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => (
                                            <tr key={tx.id}>
                                                <td>{new Date(tx.tx_at).toLocaleString()}</td>
                                                <td><code>{tx.item_code || '-'}</code></td>
                                                <td>{tx.item_name || '-'}</td>
                                                <td>{tx.location_name || '-'}</td>
                                                <td>
                                                    <Badge bg={getTxBadge(tx.tx_type)}>
                                                        {tx.tx_type}
                                                    </Badge>
                                                </td>
                                                <td>{Number(tx.qty).toFixed(1)}</td>
                                                <td>{tx.qty_on_hand !== null && tx.qty_on_hand !== undefined ? Number(tx.qty_on_hand).toFixed(1) : '-'}</td>
                                                <td>{tx.ref || '-'}</td>
                                                <td className="text-truncate" style={{ maxWidth: '160px' }}>{tx.note || '-'}</td>
                                                <td>
                                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                                                        <>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => navigate(`/transactions/${tx.id}/edit`)}
                                                            >
                                                                <i className="bi bi-pencil me-1"></i>
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleDelete(tx.id)}
                                                            >
                                                                <i className="bi bi-trash me-1"></i>
                                                                Delete
                                                            </Button>
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
        </div>
    );
}

export default TransactionsPage;
