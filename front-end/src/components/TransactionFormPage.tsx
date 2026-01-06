import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import Select from 'react-select';

interface ItemOption {
    id: number;
    item_code: string;
    name: string;
}

interface ItemSelectOption {
    value: string;
    label: string;
}

interface LocationOption {
    id: number;
    name: string;
}

interface TransactionFormState {
    item_id: string;
    location_id: string;
    tx_type: string;
    qty: string;
    ref: string;
    note: string;
}

function TransactionFormPage() {
    const { txId } = useParams<{ txId: string }>();
    const isEdit = Boolean(txId);
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<ItemOption[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [refTouched, setRefTouched] = useState(false);
    const [form, setForm] = useState<TransactionFormState>({
        item_id: '',
        location_id: '',
        tx_type: 'IN',
        qty: '1',
        ref: '',
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
        if (!token) return;
        fetchMetadata();
    }, [token]);

    useEffect(() => {
        if (isEdit && token) {
            fetchTransaction();
        }
    }, [isEdit, txId, token]);

    const itemCodeMap = useMemo(() => {
        const map = new Map<number, string>();
        items.forEach((item) => {
            map.set(item.id, item.item_code);
        });
        return map;
    }, [items]);

    const itemOptions = useMemo<ItemSelectOption[]>(() => {
        return items.map((item) => ({
            value: String(item.id),
            label: `${item.item_code || 'NO-CODE'} - ${item.name}`,
        }));
    }, [items]);

    const selectedItemOption = useMemo<ItemSelectOption | null>(() => {
        if (!form.item_id) return null;
        return itemOptions.find((option) => option.value === form.item_id) || null;
    }, [form.item_id, itemOptions]);

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
                const rawItems = Array.isArray(data) ? data : (data.items || []);
                const nextItems = rawItems.map((item: ItemOption & { itemCode?: string; code?: string }) => ({
                    id: item.id,
                    item_code: item.item_code || item.itemCode || item.code || '',
                    name: item.name || '',
                }));
                setItems(nextItems);
            }
            if (locationsRes.ok) {
                const data = await locationsRes.json();
                setLocations(data || []);
            }
        } catch (err) {
            console.error('Error fetching metadata:', err);
        }
    };

    const fetchTransaction = async () => {
        if (!token || !txId) return;
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/transactions/${txId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to load transaction');
            }
            const data = await response.json();
            setForm({
                item_id: data.item_id ? String(data.item_id) : '',
                location_id: data.location_id ? String(data.location_id) : '',
                tx_type: data.tx_type || 'IN',
                qty: data.qty ? String(data.qty) : '1',
                ref: data.ref || '',
                note: data.note || '',
            });
            setRefTouched(false);
        } catch (err) {
            setError((err as Error).message || 'Failed to load transaction');
        } finally {
            setIsLoading(false);
        }
    };

    const getNextReference = async (txType: string, itemId: string) => {
        const itemCode = itemCodeMap.get(Number(itemId)) || 'ITEM';
        if (!token || !txType || !itemId) return `${txType}-0001-${itemCode}`;
        try {
            const params = new URLSearchParams({
                page: '1',
                page_size: '1',
                tx_type: txType,
            });
            const response = await fetch(`${API_BASE_URL}/transactions?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                return `${txType}-0001-${itemCode}`;
            }
            const data = await response.json();
            const latest = data.txs?.[0]?.ref;
            const match = typeof latest === 'string' ? latest.match(new RegExp(`^${txType}-(\\d{4})-`)) : null;
            const nextNumber = match ? Number(match[1]) + 1 : 1;
            const padded = String(nextNumber).padStart(4, '0');
            return `${txType}-${padded}-${itemCode}`;
        } catch {
            return `${txType}-0001-${itemCode}`;
        }
    };

    const generateReference = async () => {
        if (!form.tx_type || !form.item_id) return;
        if (!itemCodeMap.get(Number(form.item_id))) return;
        const nextRef = await getNextReference(form.tx_type, form.item_id);
        setForm((prev) => ({ ...prev, ref: nextRef }));
    };

    useEffect(() => {
        const updateRef = async () => {
            if (!form.tx_type || !form.item_id) return;
            if (!itemCodeMap.get(Number(form.item_id))) return;
            await generateReference();
        };
        if (!user) return;
        if (user.role !== 'ADMIN' || !refTouched) {
            updateRef();
        }
    }, [form.tx_type, form.item_id, user, refTouched, itemCodeMap]);

    const handleChange = (field: keyof TransactionFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        setError(null);

        const payload = {
            item_id: Number(form.item_id),
            location_id: Number(form.location_id),
            tx_type: form.tx_type,
            qty: Number.parseInt(form.qty, 10),
            ref: form.ref.trim() || null,
            note: form.note.trim() || null,
        };

        try {
            const response = await fetch(
                isEdit ? `${API_BASE_URL}/transactions/${txId}` : `${API_BASE_URL}/transactions`,
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
                throw new Error(err.detail || 'Failed to save transaction');
            }

            navigate('/transactions');
        } catch (err) {
            setError((err as Error).message || 'Failed to save transaction');
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
                        <h5 className="mb-0">{isEdit ? 'Edit Transaction' : 'Create Transaction'}</h5>
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
                                        <Form.Label>Item</Form.Label>
                                        <Select
                                            options={itemOptions}
                                            value={selectedItemOption}
                                            onChange={(option) => handleChange('item_id', option ? option.value : '')}
                                            isClearable
                                            placeholder="Search item code or name"
                                            classNamePrefix="react-select"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Location</Form.Label>
                                        <Form.Select
                                            value={form.location_id}
                                            onChange={(e) => handleChange('location_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select location</option>
                                            {locations.map((loc) => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Type</Form.Label>
                                        <Form.Select
                                            value={form.tx_type}
                                            onChange={(e) => handleChange('tx_type', e.target.value)}
                                            required
                                        >
                                            <option value="IN">IN</option>
                                            <option value="OUT">OUT</option>
                                            <option value="ADJ">ADJ</option>
                                            <option value="XFER">XFER</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Quantity</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={form.qty}
                                            onChange={(e) => handleChange('qty', e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="d-flex align-items-center justify-content-between">
                                            <span>Reference</span>
                                        </Form.Label>
                                        <Form.Control
                                            value={form.ref}
                                            onChange={(e) => {
                                                handleChange('ref', e.target.value);
                                                if (user?.role === 'ADMIN') {
                                                    setRefTouched(true);
                                                }
                                            }}
                                            readOnly={user?.role !== 'ADMIN'}
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
                                <Button variant="outline-secondary" onClick={() => navigate('/transactions')}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            {isEdit ? 'Saving...' : 'Creating...'}
                                        </>
                                    ) : (
                                        <>{isEdit ? 'Save Changes' : 'Create Transaction'}</>
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

export default TransactionFormPage;
