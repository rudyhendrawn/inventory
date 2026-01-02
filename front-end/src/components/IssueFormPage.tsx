import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface IssueFormState {
    code: string;
    status: string;
    requested_by: string;
    approved_by: string;
    issued_at: string;
    note: string;
}

function IssueFormPage() {
    const { issueId } = useParams<{ issueId: string }>();
    const isEdit = Boolean(issueId);
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<IssueFormState>({
        code: '',
        status: 'DRAFT',
        requested_by: '',
        approved_by: '',
        issued_at: '',
        note: '',
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!authLoading && user && !['ADMIN', 'STAFF'].includes(user.role)) {
            navigate('/dashboard');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!token) return;

        const loadUsers = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/users?page=1&page_size=100&active_only=1`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to load users');
                }
                const data = await response.json();
                const nextUsers = Array.isArray(data) ? data : (data.users || []);
                setUsers(nextUsers);
            } catch (err) {
                console.error('Error loading users:', err);
            }
        };

        loadUsers();
    }, [API_BASE_URL, token]);

    useEffect(() => {
        if (!isEdit || !token) return;

        const loadIssue = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to load issue');
                }
                const data = await response.json();
                setForm({
                    code: data.code || '',
                    status: (data.status || 'DRAFT').toUpperCase(),
                    requested_by: data.requested_by ? String(data.requested_by) : '',
                    approved_by: data.approved_by ? String(data.approved_by) : '',
                    issued_at: data.issued_at ? new Date(data.issued_at).toISOString().slice(0, 16) : '',
                    note: data.note || '',
                });
            } catch (err) {
                setError((err as Error).message || 'Failed to load issue');
            } finally {
                setIsLoading(false);
            }
        };

        loadIssue();
    }, [API_BASE_URL, issueId, isEdit, token]);

    const handleChange = (field: keyof IssueFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        setError(null);

        const payload = {
            code: form.code.trim(),
            status: form.status.toUpperCase(),
            requested_by: form.requested_by ? Number(form.requested_by) : null,
            approved_by: form.approved_by ? Number(form.approved_by) : null,
            issued_at: form.issued_at ? new Date(form.issued_at).toISOString() : null,
            note: form.note.trim() || null,
        };

        try {
            const response = await fetch(
                isEdit ? `${API_BASE_URL}/issues/${issueId}` : `${API_BASE_URL}/issues`,
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
                throw new Error(err.detail || 'Failed to save issue');
            }

            navigate('/dashboard');
        } catch (err) {
            setError((err as Error).message || 'Failed to save issue');
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
                    <h5 className="mb-0">{isEdit ? 'Edit Issue' : 'Create New Issue'}</h5>
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
                                    <Form.Label>Issue Code</Form.Label>
                                    <Form.Control
                                        value={form.code}
                                        onChange={(e) => handleChange('code', e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select
                                        value={form.status}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                    >
                                        <option value="DRAFT">DRAFT</option>
                                        <option value="APPROVED">APPROVED</option>
                                        <option value="ISSUED">ISSUED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Requested By</Form.Label>
                                    <Form.Select
                                        value={form.requested_by}
                                        onChange={(e) => handleChange('requested_by', e.target.value)}
                                    >
                                        <option value="">Select user</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.email})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Approved By</Form.Label>
                                    <Form.Select
                                        value={form.approved_by}
                                        onChange={(e) => handleChange('approved_by', e.target.value)}
                                    >
                                        <option value="">Select user</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.email})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Issued At</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={form.issued_at}
                                        onChange={(e) => handleChange('issued_at', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Note</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={form.note}
                                        onChange={(e) => handleChange('note', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                {isEdit ? 'Save Changes' : 'Create Issue'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default IssueFormPage;
