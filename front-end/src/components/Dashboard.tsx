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
    Modal, 
    Pagination 
} from 'react-bootstrap';

interface Issue {
    id: number;
    code: string;
    status: string;
    requested_by?: number;
    approved_by?: number;
    issued_at?: string;
    note?: string;
    created_at?: string;
    updated_at?: string;
}

interface IssueItem {
    id: number;
    issue_id: number;
    item_id: number;
    qty: number;
    item_sku?: string;
    item_name?: string;
    category_id?: number;
    category_name?: { id: number; name: string };
    unit_id?: number;
    unit_name?: string;
    unit_symbol?: string;
    description?: string;
    active?: boolean;
}

interface User {
    id: number;
    name: string;
}

// interface Category {
//     id: number;
//     name: string;
// }

interface Unit {
    id: number;
    name: string;
    symbol: string;
}

interface DashboardData {
    issue: Issue;
    items: IssueItem[];
    categories: Map<number, string>;
    units: Map<number, { name: string; symbol: string }>;
}

interface Statistics {
    total: number;
    status_breakdown: {
        draft: { count: number; percentage: number };
        approved: { count: number; percentage: number };
        issued: { count: number; percentage: number };
        cancelled: { count: number; percentage: number };
    };
}

function Dashboard() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<DashboardData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        fetchIssues();
        fetchStatistics();
    }, [currentPage, searchTerm]);

    const fetchStatistics = async () => {
        if (!token) return;

        setStatsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/issues/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch statistics');
            }

            const data = await response.json();
            setStatistics(data);
        } catch (err) {
            console.error('Error fetching statistics:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchIssues = async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                page_size: pageSize.toString(),
                ...(searchTerm && { search: searchTerm }),
            });

            const response = await fetch(`${API_BASE_URL}/issues?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch issues');
            }

            const data = await response.json();
            setIssues(data.issues || []);
            setTotalPages(Math.ceil(data.total / pageSize));
        } catch (err) {
            setError((err as Error).message || 'Failed to load issues');
            console.error('Error fetching issues:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchIssueDetails = async (issueId: number) => {
        if (!token) return;

        try {
            // Fetch issue details
            const issueRes = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!issueRes.ok) {
                throw new Error('Failed to fetch issue details');
            }

            const issueData = await issueRes.json();

            // Fetch issue items
            const itemsRes = await fetch(`${API_BASE_URL}/issue-items/issue/${issueId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!itemsRes.ok) {
                throw new Error('Failed to fetch issue items');
            }

            const itemsData = await itemsRes.json();

            // Fetch categories and units
            const categoriesRes = await fetch(`${API_BASE_URL}/categories?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const unitsRes = await fetch(`${API_BASE_URL}/units?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const categoriesData = await categoriesRes.json();
            const unitsData = await unitsRes.json();

            // const categoriesMap = new Map<number, string>(
            //     (categoriesData || []).map((cat: Category) => [cat.id, cat.name])
            // );

            const unitsMap = new Map<number, { name: string; symbol: string }>(
                (unitsData.units || []).map((unit: Unit) => [
                    unit.id,
                    { name: unit.name, symbol: unit.symbol },
                ])
            );

            setSelectedIssue({
                issue: issueData.issue,
                items: itemsData.items || [],
                categories: categoriesData,
                units: unitsMap,
            });
        } catch (err) {
            setError((err as Error).message || 'Failed to load issue details');
            console.error('Error fetching issue details:', err);
        }
    };

    const fetchUserData = async (userId: number): Promise<User | null> => {
        if (!token) return null;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                return data;
        } catch (err) {
            console.error('Error fetching user data:', err);
            return null;
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleRowClick = (issueId: number) => {
        fetchIssueDetails(issueId);
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
                return 'danger';
        }
    };

    if (authLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh '}}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading ...</span>
                </Spinner>
            </div>
        );
    }

    if (!user) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">No user information available</Alert>
            </Container>
        );
    }

    return (
        <Container className="py-4" fluid>
            {/* User Info Card */}
            <Card className="mb-4 card-shadow">
                <Card.Body>
                    <h5 className="mb-3">Welcome, <strong>{user.name}</strong></h5>
                    <div>
                        <Badge bg="primary" className="me-2">{user.role}</Badge>
                        <Badge bg={user.active ? 'success' : 'danger'}>
                            {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </Card.Body>
            </Card>

            {/* Statistics Section */}
            {!statsLoading && statistics && (
                <div className="mb-4">
                    <h4 className="mb-3">Issues Statistics</h4>
                    <Row className="g-3">
                        <Col md={6} lg={3}>
                            <Card className="stat-card total h-100 card-shadow">
                                <Card.Body>
                                    <div className="fs-1 mb-2">📊</div>
                                    <Card.Subtitle className="text-muted small mb-2">Total Issues</Card.Subtitle>
                                    <div className="fs-3 fw-bold">{statistics.total}</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} lg={3}>
                            <Card className="stat-card draft h-100 card-shadow">
                                <Card.Body>
                                    <div className="fs-1 mb-2">📝</div>
                                    <Card.Subtitle className="text-muted small mb-2">Draft</Card.Subtitle>
                                    <div className="fs-3 fw-bold">{statistics.status_breakdown.draft.count}</div>
                                    <div className="small text-muted mt-2">{statistics.status_breakdown.draft.percentage}%</div>
                                    <div className="progress mt-2" style={{ height: '4px' }}>
                                        <div className="progress-bar bg-warning" style={{ width: `${statistics.status_breakdown.draft.percentage}%` }}></div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} lg={3}>
                            <Card className="stat-card approved h-100 card-shadow">
                                <Card.Body>
                                    <div className="fs-1 mb-2">✅</div>
                                    <Card.Subtitle className="text-muted small mb-2">Approved</Card.Subtitle>
                                    <div className="fs-3 fw-bold">{statistics.status_breakdown.approved.count}</div>
                                    <div className="small text-muted mt-2">{statistics.status_breakdown.approved.percentage}%</div>
                                    <div className="progress mt-2" style={{ height: '4px' }}>
                                        <div className="progress-bar bg-info" style={{ width: `${statistics.status_breakdown.approved.percentage}%` }}></div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} lg={3}>
                            <Card className="stat-card issued h-100 card-shadow">
                                <Card.Body>
                                    <div className="fs-1 mb-2">📦</div>
                                    <Card.Subtitle className="text-muted small mb-2">Issued</Card.Subtitle>
                                    <div className="fs-3 fw-bold">{statistics.status_breakdown.issued.count}</div>
                                    <div className="small text-muted mt-2">{statistics.status_breakdown.issued.percentage}%</div>
                                    <div className="progress mt-2" style={{ height: '4px' }}>
                                        <div className="progress-bar bg-success" style={{ width: `${statistics.status_breakdown.issued.percentage}%` }}></div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} lg={3}>
                            <Card className="stat-card cancelled h-100 card-shadow">
                                <Card.Body>
                                    <div className="fs-1 mb-2">❌</div>
                                    <Card.Subtitle className="text-muted small mb-2">Cancelled</Card.Subtitle>
                                    <div className="fs-3 fw-bold">{statistics.status_breakdown.cancelled.count}</div>
                                    <div className="small text-muted mt-2">{statistics.status_breakdown.cancelled.percentage}%</div>
                                    <div className="progress mt-2" style={{ height: '4px' }}>
                                        <div className="progress-bar bg-secondary" style={{ width: `${statistics.status_breakdown.cancelled.percentage}%` }}></div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </div>
            )}

            {/* Issues Section */}
            <Card className="card-shadow">
                <Card.Header className="bg-white border-bottom">
                    <Row className="g-3 align-items-center">
                        <Col md={6}>
                            <h5 className="mb-0">Issues Management</h5>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-0">
                                <Form.Control
                                    placeholder="Search by issue code..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Header>

                <Card.Body>
                    {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

                    {isLoading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" role="status" className="me-2" />
                            <span>Loading issues...</span>
                        </div>
                    ) : issues.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            <p>No issues found</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <Table hover bordered>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Issue Code</th>
                                            <th>Status</th>
                                            <th>Requested By</th>
                                            <th>Approved By</th>
                                            <th>Issued At</th>
                                            <th>Note</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map((issue) => (
                                            <tr
                                                key={issue.id}
                                                onClick={() => handleRowClick(issue.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>
                                                    <code>{issue.code}</code>
                                                </td>
                                                <td>
                                                    <Badge bg={getStatusColor(issue.status)}>
                                                        {issue.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {issue.requested_by ? (
                                                        <UserName userId={issue.requested_by} fetchUserData={fetchUserData} />
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {issue.approved_by ? (
                                                        <UserName userId={issue.approved_by} fetchUserData={fetchUserData} />
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>{issue.issued_at ? new Date(issue.issued_at).toLocaleDateString() : '-'}</td>
                                                <td className="text-truncate" style={{ maxWidth: '200px' }}>
                                                    {issue.note || '-'}
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/issues/${issue.id}/items`); }}
                                                    >
                                                        <i className="bi bi-eye"></i> View Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <nav className="mt-4" aria-label="Page navigation">
                                <Pagination className="justify-content-center">
                                    <Pagination.First
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                    />
                                    <Pagination.Prev
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                    />
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const pageNum = currentPage > 2 ? currentPage - 2 + i : i + 1;
                                        return (
                                            <Pagination.Item
                                                key={pageNum}
                                                active={pageNum === currentPage}
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Pagination.Item>
                                        );
                                    })}
                                    <Pagination.Next
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                    />
                                    <Pagination.Last
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                    />
                                </Pagination>
                            </nav>
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Modal */}
            <Modal show={!!selectedIssue} onHide={() => setSelectedIssue(null)} size="lg">
                {selectedIssue && (
                    <>
                        <Modal.Header closeButton>
                            <Modal.Title>Issue Details - {selectedIssue.issue.code}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <h6 className="fw-bold mb-3">Issue Information</h6>
                            <Row className="mb-4 g-3">
                                <Col md={6}>
                                    <div>
                                        <small className="text-muted d-block">Code</small>
                                        <code>{selectedIssue.issue.code}</code>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div>
                                        <small className="text-muted d-block">Status</small>
                                        <Badge bg={getStatusColor(selectedIssue.issue.status)}>
                                            {selectedIssue.issue.status}
                                        </Badge>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div>
                                        <small className="text-muted d-block">Requested By</small>
                                        {selectedIssue.issue.requested_by || '-'}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div>
                                        <small className="text-muted d-block">Approved By</small>
                                        {selectedIssue.issue.approved_by || '-'}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div>
                                        <small className="text-muted d-block">Issued At</small>
                                        {selectedIssue.issue.issued_at
                                            ? new Date(selectedIssue.issue.issued_at).toLocaleString()
                                            : '-'}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div>
                                        <small className="text-muted d-block">Note</small>
                                        {selectedIssue.issue.note || '-'}
                                    </div>
                                </Col>
                            </Row>

                            <h6 className="fw-bold mb-3">Issue Items ({selectedIssue.items.length})</h6>
                            {selectedIssue.items.length === 0 ? (
                                <p className="text-muted text-center py-3">No items in this issue</p>
                            ) : (
                                <div className="table-responsive">
                                    <Table striped bordered hover size="sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th>SKU</th>
                                                <th>Item Name</th>
                                                <th>Quantity</th>
                                                <th>Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedIssue.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td><code>{item.item_sku || '-'}</code></td>
                                                    <td>{item.item_name || '-'}</td>
                                                    <td>{item.qty ? parseFloat(item.qty.toString()).toFixed(1) : '0.0'}</td>
                                                    <td>{item.unit_name || '-'}</td>
                                                    <td>-</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setSelectedIssue(null)}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </Container>
    );
}

// Helper component for user display
function UserName({ userId, fetchUserData }: { userId: number; fetchUserData: (id: number) => Promise<User | null> }) {
    const [name, setName] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const user = await fetchUserData(userId);
            if (mounted) setName(user?.name ?? null);
        })();
        return () => { mounted = false; };
    }, [userId, fetchUserData]);

    return <span>{name ?? (userId ? 'Loading...' : '-')}</span>;
}

export default Dashboard;