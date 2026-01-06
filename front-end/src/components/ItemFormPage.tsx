import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import Select from 'react-select';

interface Category {
    id: number;
    name: string;
}

interface Unit {
    id: number;
    name: string;
    symbol: string;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface IssueOption {
    id: number;
    code: string;
    status: string;
}

interface IssueSelectOption {
    value: string;
    label: string;
}

interface ItemFormState {
    sku: string;
    name: string;
    category_id: string;
    unit_id: string;
    owner_user_id: string;
    qrcode: string;
    min_stock: string;
    image_url: string;
    active: boolean;
}

function ItemFormPage() {
    const { itemId } = useParams<{ itemId: string }>();
    const isEdit = Boolean(itemId);
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [issues, setIssues] = useState<IssueOption[]>([]);
    const [issueId, setIssueId] = useState('');
    const [form, setForm] = useState<ItemFormState>({
        sku: '',
        name: '',
        category_id: '',
        unit_id: '',
        owner_user_id: '',
        qrcode: '',
        min_stock: '0',
        image_url: '',
        active: true,
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!token) return;

        const loadMetadata = async () => {
            try {
                const [categoriesRes, unitsRes, usersRes, issuesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/categories?page=1&page_size=100`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    fetch(`${API_BASE_URL}/units?page=1&page_size=100`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    fetch(`${API_BASE_URL}/users?page=1&page_size=100&active_only=1`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    fetch(`${API_BASE_URL}/issues?page=1&page_size=100`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                ]);

                if (categoriesRes.ok) {
                    const categoriesData = await categoriesRes.json();
                    setCategories(categoriesData || []);
                }
                if (unitsRes.ok) {
                    const unitsData = await unitsRes.json();
                    setUnits(unitsData.units || []);
                }
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData.users || []);
                }
                if (issuesRes.ok) {
                    const issuesData = await issuesRes.json();
                    const nextIssues = Array.isArray(issuesData) ? issuesData : (issuesData.issues || []);
                    setIssues(nextIssues);
                }
            } catch (err) {
                console.error('Error loading metadata:', err);
            }
        };

        loadMetadata();
    }, [API_BASE_URL, token]);

    useEffect(() => {
        if (!isEdit || !token) return;

        const loadItem = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to load item');
                }
                const data = await response.json();
                setForm({
                    sku: data.sku || '',
                    name: data.name || '',
                    category_id: data.category_id ? String(data.category_id) : '',
                    unit_id: data.unit_id ? String(data.unit_id) : '',
                    owner_user_id: data.owner_user_id ? String(data.owner_user_id) : '',
                    qrcode: data.qrcode || '',
                    min_stock: typeof data.min_stock === 'number' ? String(data.min_stock) : '0',
                    image_url: data.image_url || '',
                    active: Boolean(data.active),
                });
            } catch (err) {
                setError((err as Error).message || 'Failed to load item');
            } finally {
                setIsLoading(false);
            }
        };

        loadItem();
    }, [API_BASE_URL, itemId, isEdit, token]);

    const issueLabels = useMemo(() => {
        return issues.map((issue) => ({
            value: String(issue.id),
            label: `${issue.code} (${issue.status})`,
        }));
    }, [issues]);

    const selectedIssueOption = useMemo<IssueSelectOption | null>(() => {
        if (!issueId) return null;
        return issueLabels.find((option) => option.value === issueId) || null;
    }, [issueId, issueLabels]);

    const handleChange = (field: keyof ItemFormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        setError(null);

        const payload = {
            sku: form.sku.trim(),
            name: form.name.trim(),
            category_id: Number(form.category_id),
            unit_id: Number(form.unit_id),
            owner_user_id: form.owner_user_id ? Number(form.owner_user_id) : null,
            qrcode: form.qrcode.trim() || null,
            min_stock: Number(form.min_stock || 0),
            image_url: form.image_url.trim() || null,
            active: form.active,
        };

        try {
            const response = await fetch(
                isEdit ? `${API_BASE_URL}/items/${itemId}` : `${API_BASE_URL}/items`,
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
                throw new Error(err.detail || 'Failed to save item');
            }

            const savedItem = await response.json();

            if (issueId) {
                const issueResponse = await fetch(`${API_BASE_URL}/issue-items`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        issue_id: Number(issueId),
                        item_id: savedItem.id,
                        qty: 1,
                    }),
                });

                if (!issueResponse.ok) {
                    const err = await issueResponse.json();
                    throw new Error(err.detail || 'Item saved but failed to link issue');
                }
            }

            navigate('/items');
        } catch (err) {
            setError((err as Error).message || 'Failed to save item');
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
        <div className="w-100 h-100">
            <Container fluid className="py-4 px-4">
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <h5 className="mb-0">{isEdit ? 'Edit Item' : 'Create New Item'}</h5>
                    </Card.Header>
                    <Card.Body>
                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                        <Form onSubmit={handleSubmit}>
                            <Row className="g-3">
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label>Issue</Form.Label>
                                        <Select
                                            options={issueLabels}
                                            value={selectedIssueOption}
                                            onChange={(option) =>
                                                setIssueId(option ? option.value : '')
                                            }
                                            isClearable
                                            placeholder="Search issue code or status"
                                            classNamePrefix="react-select"
                                        />
                                        <Form.Text className="text-muted">
                                            Select an issue from the dropdown.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>SKU</Form.Label>
                                        <Form.Control
                                            value={form.sku}
                                            onChange={(e) => handleChange('sku', e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
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
                                        <Form.Label>Category</Form.Label>
                                        <Form.Select
                                            value={form.category_id}
                                            onChange={(e) => handleChange('category_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select category</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Unit</Form.Label>
                                        <Form.Select
                                            value={form.unit_id}
                                            onChange={(e) => handleChange('unit_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select unit</option>
                                            {units.map((unit) => (
                                                <option key={unit.id} value={unit.id}>
                                                    {unit.name} ({unit.symbol})
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Owner</Form.Label>
                                        <Form.Select
                                            value={form.owner_user_id}
                                            onChange={(e) => handleChange('owner_user_id', e.target.value)}
                                        >
                                            <option value="">Unassigned</option>
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
                                        <Form.Label>QR Code</Form.Label>
                                        <Form.Control
                                            value={form.qrcode}
                                            onChange={(e) => handleChange('qrcode', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Min Stock</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={form.min_stock}
                                            onChange={(e) => handleChange('min_stock', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label>Image URL</Form.Label>
                                        <Form.Control
                                            value={form.image_url}
                                            onChange={(e) => handleChange('image_url', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Check
                                        type="checkbox"
                                        id="item-active"
                                        label="Active"
                                        checked={form.active}
                                        onChange={(e) => handleChange('active', e.target.checked)}
                                    />
                                </Col>
                            </Row>
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <Button variant="outline-secondary" onClick={() => navigate('/items')}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            {isEdit ? 'Saving...' : 'Creating...'}
                                        </>
                                    ) : (
                                        <>{isEdit ? 'Save Changes' : 'Create Item'}</>
                                    )}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

export default ItemFormPage;
