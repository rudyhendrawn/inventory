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

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
    active: number;
    created_at: string;
}

interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    page_size: number;
}

function UsersPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize] = useState(10);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/login');
        }
    }, [authLoading, currentUser, navigate]);

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchTerm, activeOnly]);

    const fetchUsers = async () => {
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

            const response = await fetch(`${API_BASE_URL}/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data: UserListResponse = await response.json();
            setUsers(data.users);
            setTotalUsers(data.total);
            setTotalPages(Math.ceil(data.total / pageSize));
        } catch (err) {
            setError((err as Error).message || 'Failed to load users');
            console.error('Error fetching users:', err);
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

    const handleRowClick = (user: User) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const getRoleBadgeColor = (role: string): 'primary' | 'success' | 'info' => {
        switch (role) {
            case 'ADMIN':
                return 'primary';
            case 'STAFF':
                return 'success';
            case 'AUDITOR':
                return 'info';
            default:
                return 'info';
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
                {/* Header */}
                <Row className="mb-4">
                    <Col>
                        <h2 className="mb-0">
                            <i className="bi bi-people me-2"></i>
                            Users Management
                        </h2>
                        <p className="text-muted">Manage system users and their roles</p>
                    </Col>
                    {currentUser?.role === 'ADMIN' && (
                        <Col xs="auto">
                            <Button variant="primary">
                                <i className="bi bi-plus-circle me-2"></i>
                                Add User
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
                                        placeholder="Search by name or email..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6} className="d-flex align-items-end">
                                <Form.Check
                                    type="checkbox"
                                    id="active-filter"
                                    label="Show active users only"
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

                {/* Users Table */}
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <Row className="align-items-center">
                            <Col>
                                <h5 className="mb-0">
                                    Users ({totalUsers})
                                </h5>
                            </Col>
                        </Row>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {users.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                                <p className="mb-0">No users found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Created At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleRowClick(user)}
                                            >
                                                <td>
                                                    <code className="text-primary">{user.id}</code>
                                                </td>
                                                <td className="fw-semibold">{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <Badge bg={getRoleBadgeColor(user.role)}>
                                                        {user.role}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge bg={user.active ? 'success' : 'danger'}>
                                                        {user.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    {currentUser?.role === 'ADMIN' && (
                                                        <>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                            >
                                                                <i className="bi bi-trash"></i>
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
                                    {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers}
                                </span>
                                <Pagination className="mb-0">
                                    <Pagination.Prev
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    />
                                    {[...Array(totalPages)].map((_, index) => (
                                        <Pagination.Item
                                            key={index + 1}
                                            active={currentPage === index + 1}
                                            onClick={() => setCurrentPage(index + 1)}
                                        >
                                            {index + 1}
                                        </Pagination.Item>
                                    ))}
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

            {/* User Details Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>User Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Row className="g-3">
                            <Col md={6}>
                                <strong>ID:</strong>
                                <p>{selectedUser.id}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Name:</strong>
                                <p>{selectedUser.name}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Email:</strong>
                                <p>{selectedUser.email}</p>
                            </Col>
                            <Col md={6}>
                                <strong>Role:</strong>
                                <p>
                                    <Badge bg={getRoleBadgeColor(selectedUser.role)}>
                                        {selectedUser.role}
                                    </Badge>
                                </p>
                            </Col>
                            <Col md={6}>
                                <strong>Status:</strong>
                                <p>
                                    <Badge bg={selectedUser.active ? 'success' : 'danger'}>
                                        {selectedUser.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </p>
                            </Col>
                            <Col md={6}>
                                <strong>Created At:</strong>
                                <p>{new Date(selectedUser.created_at).toLocaleString()}</p>
                            </Col>
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

export default UsersPage;