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

interface Unit {
    id: number;
    name: string;
    symbol: string;
    multiplier: number;
}

interface UnitForm {
    name: string;
    symbol: string;
    multiplier: string;
}

function UnitPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [form, setForm] = useState<UnitForm>({
        name: '',
        symbol: '',
        multiplier: '1',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Unit; direction: 'asc' | 'desc' }>({
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

    const fetchUnits = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/units?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch units');
            }

            const data = await response.json();
            setUnits(data.units || []);
        } catch (err) {
            setError((err as Error).message || 'Failed to load units');
            console.error('Error fetching units:', err);
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, token]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const handleOpenModal = (unit?: Unit) => {
        if (unit) {
            setEditingUnit(unit);
            setForm({
                name: unit.name,
                symbol: unit.symbol,
                multiplier: unit.multiplier.toString(),
            });
        } else {
            setEditingUnit(null);
            setForm({
                name: '',
                symbol: '',
                multiplier: '1',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUnit(null);
        setForm({
            name: '',
            symbol: '',
            multiplier: '1',
        });
        setError(null);
    };

    const handleChange = (field: keyof UnitForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setError(null);
        setSuccess(null);

        try {
            const url = editingUnit
                ? `${API_BASE_URL}/units/${editingUnit.id}`
                : `${API_BASE_URL}/units`;

            const method = editingUnit ? 'PUT' : 'POST';

            const payload = {
                name: form.name.trim(),
                symbol: form.symbol.trim(),
                multiplier: Number(form.multiplier),
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to save unit');
            }

            setSuccess(editingUnit ? 'Unit updated successfully' : 'Unit created successfully');
            handleCloseModal();
            fetchUnits();
        } catch (err) {
            setError((err as Error).message || 'Failed to save unit');
        }
    };

    const handleDelete = async (unitId: number) => {
        if (!token) return;
        if (!window.confirm('Are you sure you want to delete this unit?')) return;

        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete unit');
            }

            setSuccess('Unit deleted successfully');
            fetchUnits();
        } catch (err) {
            setError((err as Error).message || 'Failed to delete unit');
        }
    };

    const filteredUnits = useMemo(() => {
        if (!searchTerm) return units;
        return units.filter(unit =>
            unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [units, searchTerm]);

    const sortedUnits = useMemo(() => {
        if (!sortConfig) return filteredUnits;
        const data = [...filteredUnits];
        data.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            let result = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                result = aValue - bValue;
            } else {
                result = String(aValue).localeCompare(String(bValue));
            }
            return sortConfig.direction === 'asc' ? result : -result;
        });
        return data;
    }, [filteredUnits, sortConfig]);

    const handleSort = (key: keyof Unit) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key: keyof Unit) => {
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
                            <i className="bi bi-rulers me-2"></i>
                            Units of Measurement
                        </h2>
                        <p className="text-muted">Manage units for inventory items</p>
                    </Col>
                    {currentUser?.role === 'ADMIN' && (
                        <Col xs="auto">
                            <Button variant="primary" onClick={() => handleOpenModal()}>
                                <i className="bi bi-plus-circle me-2"></i>
                                Add Unit
                            </Button>
                        </Col>
                    )}
                </Row>

                {/* Search */}
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <Form.Group>
                            <Form.Label>Search Units</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search by name or symbol..."
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

                {/* Units Table */}
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                        <h5 className="mb-0">
                            Units ({filteredUnits.length})
                        </h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {filteredUnits.length === 0 ? (
                            <div className="text-center text-muted py-5">
                                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                                <p className="mb-0">No units found</p>
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
                                            <th
                                                style={{ width: '150px', cursor: 'pointer' }}
                                                onClick={() => handleSort('symbol')}
                                            >
                                                Symbol {getSortIndicator('symbol')}
                                            </th>
                                            <th
                                                style={{ width: '150px', cursor: 'pointer' }}
                                                onClick={() => handleSort('multiplier')}
                                            >
                                                Multiplier {getSortIndicator('multiplier')}
                                            </th>
                                            <th style={{ width: '200px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedUnits.map((unit) => (
                                            <tr key={unit.id}>
                                                <td>
                                                    <code className="text-primary">{unit.id}</code>
                                                </td>
                                                <td className="fw-semibold">{unit.name}</td>
                                                <td>
                                                    <code className="text-secondary">{unit.symbol}</code>
                                                </td>
                                                <td>{unit.multiplier}</td>
                                                <td>
                                                    {currentUser?.role === 'ADMIN' && (
                                                        <>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => handleOpenModal(unit)}
                                                            >
                                                                <i className="bi bi-pencil me-1"></i>
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleDelete(unit.id)}
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
                </Card>
            </Container>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingUnit ? 'Edit Unit' : 'Add Unit'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Unit Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g., Kilogram, Meter, Piece"
                                        value={form.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Symbol</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g., kg, m, pcs"
                                        value={form.symbol}
                                        onChange={(e) => handleChange('symbol', e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Multiplier</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.000001"
                                        min="0"
                                        value={form.multiplier}
                                        onChange={(e) => handleChange('multiplier', e.target.value)}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Conversion factor (e.g., 1000 for kg to g)
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingUnit ? 'Save Changes' : 'Create Unit'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

export default UnitPage;
