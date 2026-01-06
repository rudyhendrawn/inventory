import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';

interface UserFormState {
    name: string;
    email: string;
    role: string;
    active: boolean;
    password: string;
}

function UserFormPage() {
    const { userId } = useParams<{ userId: string }>();
    const isEdit = Boolean(userId);
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<UserFormState>({
        name: '',
        email: '',
        role: 'STAFF',
        active: true,
        password: '',
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!authLoading && user && user.role !== 'ADMIN') {
            navigate('/dashboard');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!isEdit || !token) return;

        const loadUser = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to load user');
                }
                const data = await response.json();
                setForm({
                    name: data.name || '',
                    email: data.email || '',
                    role: data.role || 'STAFF',
                    active: Boolean(data.active),
                    password: '',
                });
            } catch (err) {
                setError((err as Error).message || 'Failed to load user');
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, [API_BASE_URL, isEdit, token, userId]);

    const handleChange = (field: keyof UserFormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        setError(null);

        const payload: Record<string, unknown> = {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            active: form.active ? 1 : 0,
        };

        if (!isEdit || form.password.trim()) {
            payload.password = form.password.trim();
        }

        try {
            const response = await fetch(
                isEdit ? `${API_BASE_URL}/users/${userId}` : `${API_BASE_URL}/users/register`,
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to save user');
            }

            navigate('/users');
        } catch (err) {
            setError((err as Error).message || 'Failed to save user');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status" />
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Card className="shadow-sm">
                <Card.Header className="bg-white border-bottom">
                    <h5 className="mb-0">{isEdit ? 'Edit User' : 'Create New User'}</h5>
                </Card.Header>
                <Card.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    <Form onSubmit={handleSubmit}>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        value={form.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select
                                        value={form.role}
                                        onChange={(e) => handleChange('role', e.target.value)}
                                    >
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="STAFF">STAFF</option>
                                        <option value="AUDITOR">AUDITOR</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Password {isEdit ? '(leave blank to keep)' : ''}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => handleChange('password', e.target.value)}
                                        required={!isEdit}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Check
                                    type="checkbox"
                                    id="user-active"
                                    label="Active"
                                    checked={form.active}
                                    onChange={(e) => handleChange('active', e.target.checked)}
                                />
                            </Col>
                        </Row>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="outline-secondary" onClick={() => navigate('/users')}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                {isEdit ? 'Save Changes' : 'Create User'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default UserFormPage;
