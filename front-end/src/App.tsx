import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import IssueDetailsPage from './components/IssueDetailsPage';
import Layout from './components/Layout';
import UsersPage from './components/UsersPage';
import ItemsPage from './components/ItemsPage';
import IssueFormPage from './components/IssueFormPage';
import ItemFormPage from './components/ItemFormPage';
import UserFormPage from './components/UserFormPage';
import SettingsPage from './components/SettingsPage';
import CategoryPage from './components/CategoryPage';
import UnitPage from './components/UnitPage';
import TransactionsPage from './components/TransactionsPage';
import TransactionFormPage from './components/TransactionFormPage';

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
            <Route 
                path="/categories"
                element={
                    <PrivateRoute>
                        <CategoryPage />
                    </PrivateRoute>
                }
            />
            <Route 
                path="/units"
                element={
                    <PrivateRoute>
                        <UnitPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/transactions"
                element={
                    <PrivateRoute>
                        <TransactionsPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/transactions/new"
                element={
                    <PrivateRoute>
                        <TransactionFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/transactions/:txId/edit"
                element={
                    <PrivateRoute>
                        <TransactionFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/issues/new"
                element={
                    <PrivateRoute>
                        <IssueFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/issues/:issueId/edit"
                element={
                    <PrivateRoute>
                        <IssueFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/items/new"
                element={
                    <PrivateRoute>
                        <ItemFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/items/:itemId/edit"
                element={
                    <PrivateRoute>
                        <ItemFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/users/new"
                element={
                    <PrivateRoute>
                        <UserFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/users/:userId/edit"
                element={
                    <PrivateRoute>
                        <UserFormPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <PrivateRoute>
                        <SettingsPage />
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
