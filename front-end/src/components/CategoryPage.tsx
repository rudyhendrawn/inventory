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
    Spinner,
    Alert,
    Modal
} from 'react-bootstrap';

interface Category {
    id: number;
    name: string;
}

function CategoryPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formName, setFormName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Category; direction: 'asc' | 'desc' }>({
        key: 'id',
        direction: 'asc',
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/login');
        }
    }, [authLoading, currentUser, navigate]);

    const fetchCategories = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/categories?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const data: Category[] = await response.json();
            setCategories(data);
        } catch (err) {
            setError((err as Error).message || 'Failed to load categories');
            console.error('Error fetching categories:', err);
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, token]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormName(category.name);
        } else {
            setEditingCategory(null);
            setFormName('');
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setFormName('');
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setError(null);
        setSuccess(null);

        try {
            const url = editingCategory
                ? `${API_BASE_URL}/categories/${editingCategory.id}`
                : `${API_BASE_URL}/categories`;

            const method = editingCategory ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: formName.trim() }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to save category');
            }

            setSuccess(editingCategory ? 'Category updated successfully' : 'Category created successfully');
            handleCloseModal();
            fetchCategories();
        } catch (err) {
            setError((err as Error).message || 'Failed to save category');
        }
    };

    const handleDelete = async (categoryId: number) => {
        if (!token) return;
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete category');
            }

            setSuccess('Category deleted successfully');
            fetchCategories();
        } catch (err) {
            setError((err as Error).message || 'Failed to delete category');
        }
    };

    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories;
        return categories.filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [categories, searchTerm]);

    const sortedCategories = useMemo(() => {
        if (!sortConfig) return filteredCategories;
        const data = [...filteredCategories];
        data.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            const result = String(aValue).localeCompare(String(bValue));
            return sortConfig.direction === 'asc' ? result : -result;
        });
        return data;
    }, [filteredCategories, sortConfig]);

    const handleSort = (key: keyof Category) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key: keyof Category) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? '▲' : '▼';
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
                            <i className="bi bi-tag me-2"></i>
                            Categories
                        </h2>
                        <p className="text-muted">Manage item categories</p>
                    </Col>
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                        <Col xs="auto">
                            <Button variant="primary" onClick={() => handleOpenModal()}>
                                <i className="bi bi-plus-circle me-2"></i>
                                Add Category
                            </Button>
                        </Col>
                    )}
                </Row>

                {/* Search */}
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <Form.Group>
                            <Form.Label>Search Categories</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Form.Group>
                    </Card.Body>
                </Card>

                {/* Alerts */}
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

                {/* Categories Table */}
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <h5 className="mb-0">
                            Categories ({filteredCategories.length})
                        </h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {filteredCategories.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                                <p className="mb-0">No categories found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th
                                                style={{ width: '100px', cursor: 'pointer' }}
                                                onClick={() => handleSort('id')}
                                            >
                                                ID {getSortIndicator('id')}
                                            </th>
                                            <th
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleSort('name')}
                                            >
                                                Name {getSortIndicator('name')}
                                            </th>
                                            <th style={{ width: '200px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedCategories.map((category) => (
                                            <tr key={category.id}>
                                                <td>
                                                    <code className="text-primary">{category.id}</code>
                                                </td>
                                                <td className="fw-semibold">{category.name}</td>
                                                <td>
                                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                                                        <>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => handleOpenModal(category)}
                                                            >
                                                                <i className="bi bi-pencil me-1"></i>
                                                                Edit
                                                            </Button>
                                                            {currentUser?.role === 'ADMIN' && (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(category.id)}
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
                </Card>
            </Container>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingCategory ? 'Edit Category' : 'Add Category'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Category Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter category name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                required
                                autoFocus
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingCategory ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

export default CategoryPage;
