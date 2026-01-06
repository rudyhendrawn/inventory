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
    const [searchTerm, ] = useState('');
    const [activeOnly, ] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize] = useState(10);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState({
        id: '',
        name: '',
        email: '',
        role: 'all',
        status: 'all',
        createdFrom: '',
        createdTo: '',
    });

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

    const handleRowClick = (user: User) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleDeleteUser = async (userId: number) => {
        if (!token) return;
        if (!window.confirm('Delete this user?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete user');
            }
            fetchUsers();
        } catch (err) {
            setError((err as Error).message || 'Failed to delete user');
        }
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

    const handleSort = (key: keyof User) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key: keyof User) => {
        if (sortConfig?.key !== key) return '';
        return sortConfig.direction === 'asc' ? '^' : 'v';
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            if (filters.id && !String(user.id).includes(filters.id)) return false;
            if (filters.name && !user.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase())) return false;
            if (filters.role !== 'all' && user.role !== filters.role) return false;
            if (filters.status !== 'all') {
                const isActive = Boolean(user.active);
                if (filters.status === 'active' && !isActive) return false;
                if (filters.status === 'inactive' && isActive) return false;
            }
            const createdDate = new Date(user.created_at);
            if (filters.createdFrom) {
                const from = new Date(filters.createdFrom);
                if (!Number.isNaN(from.getTime()) && createdDate < from) return false;
            }
            if (filters.createdTo) {
                const to = new Date(filters.createdTo);
                if (!Number.isNaN(to.getTime())) {
                    to.setHours(23, 59, 59, 999);
                    if (createdDate > to) return false;
                }
            }
            return true;
        });
    }, [users, filters]);

    const sortedUsers = useMemo(() => {
        if (!sortConfig) return filteredUsers;
        const data = [...filteredUsers];
        data.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            let result = 0;
            if (sortConfig.key === 'created_at') {
                const aDate = new Date(aValue as string).getTime();
                const bDate = new Date(bValue as string).getTime();
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
    }, [filteredUsers, sortConfig]);

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
                            <Button variant="primary" onClick={() => navigate('/users/new')}>
                                <i className="bi bi-plus-circle me-2"></i>
                                Add User
                            </Button>
                        </Col>
                    )}
                </Row>

                {/* Users Table */}
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <Row className="align-items-center">
                                    <Col>
                                        <h5 className="mb-0">
                                            Users ({filteredUsers.length} / {totalUsers})
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
                                <Table hover className="mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                                                ID {getSortIndicator('id')}
                                            </th>
                                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                                Name {getSortIndicator('name')}
                                            </th>
                                            <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                                                Email {getSortIndicator('email')}
                                            </th>
                                            <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                                                Role {getSortIndicator('role')}
                                            </th>
                                            <th onClick={() => handleSort('active')} style={{ cursor: 'pointer' }}>
                                                Status {getSortIndicator('active')}
                                            </th>
                                            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                                                Created At {getSortIndicator('created_at')}
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                        <tr>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="ID"
                                                    value={filters.id}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, id: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Name"
                                                    value={filters.name}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="Email"
                                                    value={filters.email}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, email: e.target.value }))}
                                                />
                                            </th>
                                            <th>
                                                <Form.Select
                                                    size="sm"
                                                    value={filters.role}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
                                                >
                                                    <option value="all">All</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                    <option value="STAFF">STAFF</option>
                                                    <option value="AUDITOR">AUDITOR</option>
                                                </Form.Select>
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
                                            <th>
                                                <div className="d-flex gap-1">
                                                    <Form.Control
                                                        size="sm"
                                                        type="date"
                                                        value={filters.createdFrom}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, createdFrom: e.target.value }))}
                                                    />
                                                    <Form.Control
                                                        size="sm"
                                                        type="date"
                                                        value={filters.createdTo}
                                                        onChange={(e) => setFilters((prev) => ({ ...prev, createdTo: e.target.value }))}
                                                    />
                                                </div>
                                            </th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedUsers.map((user) => (
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
                                                                onClick={() => navigate(`/users/${user.id}/edit`)}
                                                            >
                                                                <i className="bi bi-pencil me-1"></i>
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleDeleteUser(user.id)}
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
