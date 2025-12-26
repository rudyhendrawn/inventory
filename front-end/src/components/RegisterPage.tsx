import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            await register(email, password, name);
            navigate('/dashboard');
        } catch (err) {
            setError((err as Error).message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 gradient-bg">
            <Container className="w-100" style={{ maxWidth: '450px' }}>
                <Card className="shadow-lg">
                    <Card.Body className="p-5">
                        <h1 className="h3 fw-bold mb-2 text-center">Create Account</h1>
                        <p className="text-center text-muted mb-4">Register to access the Inventory Management System</p>

                        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    minLength={1}
                                    maxLength={120}
                                    disabled={isLoading}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                            </Form.Group>

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100 gradient-bg border-0"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Registering...' : 'Register'}
                            </Button>
                        </Form>

                        <p className="text-center mt-4 text-muted">
                            Already have an account? <Link to="/login" className="text-decoration-none">Login here</Link>
                        </p>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

export default RegisterPage;