import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import IssueDetailsPage from './components/IssueDetailsPage';
import Layout from './components/Layout';
import UsersPage from './components/UsersPage';
import ItemsPage from './components/ItemsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return user ? <Navigate to="/dashboard" /> : <>{children}</>;
}

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <RegisterPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }
            />
            <Route
                path="/issues/:issueId/items"
                element={
                    <PrivateRoute>
                        <IssueDetailsPage />
                    </PrivateRoute>
                }
            />
            <Route 
                path="/users"
                element={
                    <PrivateRoute>
                        <UsersPage />
                    </PrivateRoute>
                }
            />
            <Route 
                path="/items"
                element={
                    <PrivateRoute>
                        <ItemsPage />
                    </PrivateRoute>
                }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}

export default App;