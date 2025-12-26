import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Row, Col, Card, Table, Form, Badge, Spinner, Alert, Button } from 'react-bootstrap';

interface IssueItem {
    id: number;
    issue_id: number;
    item_id: number;
    qty: number;
    item_sku?: string;
    item_name?: string;
    category_id?: number;
    category_name?: string;
    unit_id?: number;
    unit_name?: string;
    unit_symbol?: string;
    description?: string;
    active?: boolean;
}

interface Issue {
    id: number;
    code: string;
    status: string;
    requested_by?: number | string | { id: number; name?: string };
    approved_by?: number | string | { id: number; name?: string };
    issued_at?: string;
    note?: string;
    created_at?: string;
    updated_at?: string;
}

interface IssueDetailsData {
    issue: Issue;
    items: IssueItem[];
    total_qty: number;
    total_items: number;
}

function IssueDetailsPage() {
    const { issueId } = useParams<{ issueId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [issueDetails, setIssueDetails] = useState<IssueDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'sku' | 'qty' | 'category'>('name');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (issueId && token) {
            fetchIssueDetails();
        }
    }, [issueId, token]);

    const fetchIssueDetails = async () => {
        if (!issueId || !token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/issues/${issueId}/items`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch issue details');
            }

            const data = await response.json();

            if (data.issue && data.items !== undefined) {
                setIssueDetails(data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load issue details';
            setError(errorMessage);
            console.error('Error fetching issue details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getSortedItems = (): IssueItem[] => {
        if (!issueDetails?.items) return [];

        let filtered = issueDetails.items;

        if (filterCategory !== 'all') {
            filtered = filtered.filter((item) => item.category_name === filterCategory);
        }

        const sorted = [...filtered];
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));
                break;
            case 'sku':
                sorted.sort((a, b) => (a.item_sku || '').localeCompare(b.item_sku || ''));
                break;
            case 'qty':
                sorted.sort((a, b) => b.qty - a.qty);
                break;
            case 'category':
                sorted.sort((a, b) =>
                    getCategoryName(a.category_name).localeCompare(getCategoryName(b.category_name))
                );
                break;
        }

        return sorted;
    };

    const getCategories = (): { id: string; name: string }[] => {
        if (!issueDetails?.items) return [];
        const map = new Map<string, string>();
        issueDetails.items.forEach((item) => {
            const name = getCategoryName(item.category_name);
            const id = item.category_id ? String(item.category_id) : name;
            if (name) map.set(id, name);
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    };

    const getCategoryName = (cat: any): string => {
        if (!cat && cat !== 0) return '';
        return typeof cat === 'object' && cat !== null ? cat.name ?? String(cat.id ?? '') : String(cat);
    };

    const getStatusColor = (status: string): 'warning' | 'success' | 'info' | 'secondary' | 'danger' => {
        switch (status?.toUpperCase()) {
            case 'DRAFT':
                return 'warning';
            case 'APPROVED':
                return 'info';
            case 'ISSUED':
                return 'success';
            case 'CANCELLED':
                return 'secondary';
            default:
                return 'secondary';
        }
    };

    const getUserDisplay = (user: any): string => {
        if (!user) return '-';
        if (typeof user === 'number') return `User #${user}`;
        if (typeof user === 'string') return user;
        return '-';
    };

    if (authLoading || isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading issue details...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <Alert.Heading>Error Loading Issue</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="danger" onClick={() => navigate('/dashboard')}>
                        <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
                    </Button>
                </Alert>
            </Container>
        );
    }

    if (!issueDetails) {
        return (
            <Container className="py-5">
                <Alert variant="warning">
                    <Alert.Heading>Issue Not Found</Alert.Heading>
                    <Button variant="warning" onClick={() => navigate('/dashboard')}>
                        <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
                    </Button>
                </Alert>
            </Container>
        );
    }

    const sortedItems = getSortedItems();
    const categories = getCategories();

    return (
        <div className="bg-light" style={{ minHeight: '100vh' }}>
            {/* Header */}
            <nav className="navbar navbar-light bg-white shadow-sm mb-4 border-bottom">
                <Container fluid="lg">
                    <Button
                        variant="link"
                        className="text-decoration-none text-primary p-0 me-3"
                        onClick={() => navigate('/dashboard')}
                    >
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Button>
                    <span className="navbar-brand mb-0 h5">Issue Details</span>
                </Container>
            </nav>

            {/* Main Content */}
            <Container className="py-4" fluid="lg">
                {/* Issue Info Card */}
                <Card className="mb-4 shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <Row className="align-items-center">
                            <Col>
                                <h5 className="mb-0">Issue Information</h5>
                            </Col>
                            <Col xs="auto">
                                <Badge bg={getStatusColor(issueDetails.issue.status)}>
                                    {issueDetails.issue.status}
                                </Badge>
                            </Col>
                        </Row>
                    </Card.Header>
                    <Card.Body>
                        <Row className="g-3 mb-4">
                            <Col md={6} lg={4}>
                                <div>
                                    <small className="text-muted d-block fw-bold mb-1">Issue Code</small>
                                    <code className="fs-6 text-primary">{issueDetails.issue.code}</code>
                                </div>
                            </Col>
                            <Col md={6} lg={4}>
                                <div>
                                    <small className="text-muted d-block fw-bold mb-1">Status</small>
                                    <span>{issueDetails.issue.status}</span>
                                </div>
                            </Col>
                            <Col md={6} lg={4}>
                                <div>
                                    <small className="text-muted d-block fw-bold mb-1">Requested By</small>
                                    <span>{getUserDisplay(issueDetails.issue.requested_by)}</span>
                                </div>
                            </Col>
                            <Col md={6} lg={4}>
                                <div>
                                    <small className="text-muted d-block fw-bold mb-1">Approved By</small>
                                    <span>{getUserDisplay(issueDetails.issue.approved_by)}</span>
                                </div>
                            </Col>
                            <Col md={6} lg={4}>
                                <div>
                                    <small className="text-muted d-block fw-bold mb-1">Issued At</small>
                                    <span>
                                        {issueDetails.issue.issued_at
                                            ? new Date(issueDetails.issue.issued_at).toLocaleString()
                                            : '-'}
                                    </span>
                                </div>
                            </Col>
                        </Row>

                        {issueDetails.issue.note && (
                            <div className="pt-3 border-top">
                                <small className="text-muted d-block fw-bold mb-2">Note</small>
                                <p className="mb-0">{issueDetails.issue.note}</p>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Summary Cards */}
                <Row className="g-3 mb-4">
                    <Col md={6} lg={4}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body className="text-center">
                                <h6 className="text-muted small">Total Items</h6>
                                <div className="fs-3 fw-bold text-primary">
                                    {issueDetails.total_items || 0}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={6} lg={4}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body className="text-center">
                                <h6 className="text-muted small">Total Quantity</h6>
                                <div className="fs-3 fw-bold text-primary">
                                    {issueDetails?.total_qty
                                        ? parseFloat(issueDetails.total_qty.toString()).toFixed(2)
                                        : '0.00'}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={6} lg={4}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body className="text-center">
                                <h6 className="text-muted small">Categories</h6>
                                <div className="fs-3 fw-bold text-primary">
                                    {categories.length || 0}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Controls Card */}
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Sort By</Form.Label>
                                    <Form.Select
                                        value={sortBy}
                                        onChange={(e) =>
                                            setSortBy(e.target.value as 'name' | 'sku' | 'qty' | 'category')
                                        }
                                    >
                                        <option value="name">Item Name</option>
                                        <option value="sku">SKU</option>
                                        <option value="qty">Quantity</option>
                                        <option value="category">Category</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {categories.length > 0 && (
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">Filter Category</Form.Label>
                                        <Form.Select
                                            value={filterCategory}
                                            onChange={(e) => setFilterCategory(e.target.value)}
                                        >
                                            <option value="all">All Categories</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            )}
                        </Row>
                    </Card.Body>
                </Card>

                {/* Items Table */}
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <h5 className="mb-0">Items ({sortedItems.length})</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {sortedItems.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <p className="mb-0">No items found for this issue</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover striped bordered className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>SKU</th>
                                            <th>Item Name</th>
                                            <th>Category</th>
                                            <th>Quantity</th>
                                            <th>Unit</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedItems.map((item) => (
                                            <tr key={`item-${item.id}`}>
                                                <td>
                                                    <code className="text-primary">{item.item_sku || '-'}</code>
                                                </td>
                                                <td>{item.item_name || '-'}</td>
                                                <td>
                                                    {item.category_name ? (
                                                        <Badge bg="secondary">{item.category_name}</Badge>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="fw-bold">
                                                        {item.qty
                                                            ? parseFloat(item.qty.toString()).toFixed(2)
                                                            : '0.00'}
                                                    </span>
                                                </td>
                                                <td title={item.unit_name || ''}>
                                                    {item.unit_symbol ? (
                                                        <span>{item.unit_symbol}</span>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span title={item.description || '-'}>
                                                        {item.description
                                                            ? item.description.substring(0, 40) +
                                                              (item.description.length > 40 ? '...' : '')
                                                            : '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Badge
                                                        bg={item.active ? 'success' : 'danger'}
                                                    >
                                                        {item.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

export default IssueDetailsPage;