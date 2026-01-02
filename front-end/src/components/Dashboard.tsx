import { useState, useEffect, useMemo, useCallback } from 'react';
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
    const [sortConfig, setSortConfig] = useState<{ key: keyof Issue; direction: 'asc' | 'desc' } | null>(null);
    const [userNameMap, setUserNameMap] = useState<Record<number, string>>({});
    const [filters, setFilters] = useState({
        status: 'all',
        requestedBy: '',
        approvedBy: '',
        issuedFrom: '',
        issuedTo: '',
        note: '',
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    const fetchUserData = useCallback(async (userId: number): Promise<User | null> => {
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
    }, [token, API_BASE_URL]);

    useEffect(() => {
        const userIds = new Set<number>();
        issues.forEach((issue) => {
            if (issue.requested_by) userIds.add(issue.requested_by);
            if (issue.approved_by) userIds.add(issue.approved_by);
        });

        const missingIds = Array.from(userIds).filter((id) => !userNameMap[id]);
        if (missingIds.length === 0) return;

        let mounted = true;
        (async () => {
            const entries = await Promise.all(
                missingIds.map(async (id) => {
                    const user = await fetchUserData(id);
                    return [id, user?.name || ''] as const;
                })
            );
            if (!mounted) return;
            setUserNameMap((prev) => {
                const next = { ...prev };
                entries.forEach(([id, name]) => {
                    next[id] = name;
                });
                return next;
            });
        })();

        return () => {
            mounted = false;
        };
    }, [issues, userNameMap, fetchUserData]);

    const fetchStatistics = useCallback(async () => {
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
    }, [token, API_BASE_URL]);

    const fetchIssues = useCallback(async () => {
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
    }, [token, API_BASE_URL, currentPage, pageSize, searchTerm]);

    const handleDeleteIssue = useCallback(async (issueId: number) => {
        if (!token) return;
        if (!window.confirm('Delete this issue?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete issue');
            }
            fetchIssues();
        } catch (err) {
            setError((err as Error).message || 'Failed to delete issue');
        }
    }, [API_BASE_URL, fetchIssues, token]);

    useEffect(() => {
        fetchIssues();
        fetchStatistics();
    }, [currentPage, searchTerm, fetchIssues, fetchStatistics]);

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

            const issue = issueData.issue ?? issueData;
            const items = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);

            setSelectedIssue({
                issue,
                items,
                categories: categoriesData,
                units: unitsMap,
            });
        } catch (err) {
            setError((err as Error).message || 'Failed to load issue details');
            console.error('Error fetching issue details:', err);
        }
    };

    const handleSort = (key: keyof Issue) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key: keyof Issue) => {
        if (sortConfig?.key !== key) return '';
        return sortConfig.direction === 'asc' ? '^' : 'v';
    };

    const filteredIssues = useMemo(() => {
        return issues.filter((issue) => {
            if (searchTerm && !issue.code.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            if (filters.status !== 'all') {
                const issueStatus = (issue.status || '').toUpperCase();
                const filterStatus = filters.status.toUpperCase();
                if (issueStatus !== filterStatus) {
                    return false;
                }
            }
            if (filters.requestedBy) {
                const requestedName = issue.requested_by ? (userNameMap[issue.requested_by] || '') : '';
                if (!requestedName.toLowerCase().includes(filters.requestedBy.toLowerCase())) {
                    return false;
                }
            }
            if (filters.approvedBy) {
                const approvedName = issue.approved_by ? (userNameMap[issue.approved_by] || '') : '';
                if (!approvedName.toLowerCase().includes(filters.approvedBy.toLowerCase())) {
                    return false;
                }
            }
            if (filters.note && !(issue.note ?? '').toLowerCase().includes(filters.note.toLowerCase())) {
                return false;
            }
            if (filters.issuedFrom || filters.issuedTo) {
                const issuedDate = issue.issued_at ? new Date(issue.issued_at) : null;
                if (filters.issuedFrom) {
                    const from = new Date(filters.issuedFrom);
                    if (issuedDate && issuedDate < from) return false;
                    if (!issuedDate) return false;
                }
                if (filters.issuedTo) {
                    const to = new Date(filters.issuedTo);
                    if (!Number.isNaN(to.getTime())) {
                        to.setHours(23, 59, 59, 999);
                        if (issuedDate && issuedDate > to) return false;
                        if (!issuedDate) return false;
                    }
                }
            }
            return true;
        });
    }, [issues, searchTerm, filters]);

    const sortedIssues = useMemo(() => {
        if (!sortConfig) return filteredIssues;
        const data = [...filteredIssues];
        data.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            let result = 0;
            if (sortConfig.key === 'issued_at') {
                const aDate = aValue ? new Date(aValue as string).getTime() : 0;
                const bDate = bValue ? new Date(bValue as string).getTime() : 0;
                result = aDate - bDate;
            } else if (aValue == null && bValue == null) {
                result = 0;
            } else if (aValue == null) {
                result = 1;
            } else if (bValue == null) {
                result = -1;
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                result = aValue - bValue;
            } else {
                result = String(aValue).localeCompare(String(bValue));
            }
            return sortConfig.direction === 'asc' ? result : -result;
        });
        return data;
    }, [filteredIssues, sortConfig]);

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
                        <Col md={6} className="text-md-end">
                            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                                <Button variant="primary" onClick={() => navigate('/issues/new')}>
                                    <i className="bi bi-plus-circle me-2"></i>
                                    New Issue
                                </Button>
                            )}
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
                                            <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                                                Issue Code {getSortIndicator('code')}
                                            </th>
                                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                                Status {getSortIndicator('status')}
                                            </th>
                                            <th onClick={() => handleSort('requested_by')} style={{ cursor: 'pointer' }}>
                                                Requested By {getSortIndicator('requested_by')}
                                            </th>
                                            <th onClick={() => handleSort('approved_by')} style={{ cursor: 'pointer' }}>
                                                Approved By {getSortIndicator('approved_by')}
                                            </th>
                                            <th onClick={() => handleSort('issued_at')} style={{ cursor: 'pointer' }}>
                                                Issued At {getSortIndicator('issued_at')}
                                            </th>
                                            <th onClick={() => handleSort('note')} style={{ cursor: 'pointer' }}>
                                                Note {getSortIndicator('note')}
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                        <tr>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Filter code"
                                                    value={searchTerm}
                                                    onChange={handleSearch}
                                                />
                                            </th>
                                            <th>
                                                <Form.Select
                                                    size="sm"
                                                    value={filters.status}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                                                >
                                                    <option value="all">All</option>
                                                    <option value="draft">DRAFT</option>
                                                    <option value="approved">APPROVED</option>
                                                    <option value="issued">ISSUED</option>
                                                    <option value="cancelled">CANCELLED</option>
                                                </Form.Select>
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="User Name"
                                                    value={filters.requestedBy}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, requestedBy: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="User Name"
                                                    value={filters.approvedBy}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, approvedBy: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <div className="d-flex gap-1">
                                                    <Form.Control
                                                        size="sm"
                                                        type="date"
                                                        value={filters.issuedFrom}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, issuedFrom: e.target.value }))}
                                                    />
                                                    <Form.Control
                                                        size="sm"
                                                        type="date"
                                                        value={filters.issuedTo}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, issuedTo: e.target.value }))}
                                                    />
                                                </div>
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Filter note"
                                                    value={filters.note}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, note: e.target.value }))}
                                                />
                                            </th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedIssues.map((issue) => (
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
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/issues/${issue.id}/edit`);
                                                        }}
                                                    >
                                                        <i className="bi bi-pencil me-1"></i>
                                                        Edit
                                                    </Button>
                                                    {user?.role === 'ADMIN' && (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteIssue(issue.id);
                                                            }}
                                                        >
                                                            <i className="bi bi-trash me-1"></i>
                                                            Delete
                                                        </Button>
                                                    )}
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
