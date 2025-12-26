import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface Issue {
    id: number;
    code: string;
    status: string;
    requested_by?: number;
    approved_by?: number;
    issued_at?: string;
    note?: string;
    created_at?: string;
    updated_at?: string;
}

interface IssueItem {
    id: number;
    issue_id: number;
    item_id: number;
    qty: number;
    item_sku?: string;
    item_name?: string;
}

interface Category {
    id: number;
    name: string;
}

interface Unit {
    id: number;
    name: string;
    symbol: string;
}

interface DashboardData {
    issue: Issue;
    items: IssueItem[];
    categories: Map<number, string>;
    units: Map<number, { name: string; symbol: string }>;
}

interface Statistics {
    total: number;
    status_breakdown: {
        draft: { count: number; percentage: number };
        approved: { count: number; percentage: number };
        issued: { count: number; percentage: number };
        cancelled: { count: number; percentage: number };
    };
}

function Dashboard() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<DashboardData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        fetchIssues();
        fetchStatistics();
    }, [currentPage, searchTerm]);

    const fetchStatistics = async () => {
        if (!token) return;

        setStatsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/issues/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch statistics');
            }

            const data = await response.json();
            setStatistics(data);
        } catch (err) {
            console.error('Error fetching statistics:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchIssues = async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                page_size: pageSize.toString(),
                ...(searchTerm && { search: searchTerm }),
            });

            const response = await fetch(`${API_BASE_URL}/issues?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch issues');
            }

            const data = await response.json();
            setIssues(data.issues || []);
            setTotalPages(Math.ceil(data.total / pageSize));
        } catch (err) {
            setError((err as Error).message || 'Failed to load issues');
            console.error('Error fetching issues:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchIssueDetails = async (issueId: number) => {
        if (!token) return;

        try {
            // Fetch issue details
            const issueRes = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!issueRes.ok) {
                throw new Error('Failed to fetch issue details');
            }

            const issue = await issueRes.json();

            // Fetch issue items
            const itemsRes = await fetch(`${API_BASE_URL}/issue-items/issue/${issueId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!itemsRes.ok) {
                throw new Error('Failed to fetch issue items');
            }

            const items = await itemsRes.json();

            // Fetch categories and units
            const categoriesRes = await fetch(`${API_BASE_URL}/categories?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const unitsRes = await fetch(`${API_BASE_URL}/units?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const categoriesData = await categoriesRes.json();
            const unitsData = await unitsRes.json();

            const categoriesMap = new Map(
                (categoriesData || []).map((cat: Category) => [cat.id, cat.name])
            );

            const unitsMap = new Map(
                (unitsData.units || []).map((unit: Unit) => [
                    unit.id,
                    { name: unit.name, symbol: unit.symbol },
                ])
            );

            setSelectedIssue({
                issue,
                items: items || [],
                categories: categoriesMap,
                units: unitsMap,
            });
        } catch (err) {
            setError((err as Error).message || 'Failed to load issue details');
            console.error('Error fetching issue details:', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleRowClick = (issueId: number) => {
        fetchIssueDetails(issueId);
    };

    const getStatusColor = (status: string): string => {
        switch (status?.toUpperCase()) {
            case 'DRAFT':
                return 'status-draft';
            case 'APPROVED':
                return 'status-approved';
            case 'ISSUED':
                return 'status-issued';
            case 'CANCELLED':
                return 'status-cancelled';
            default:
                return 'status-default';
        }
    };

    if (authLoading) {
        return (
            <div className="dashboard-loading">
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="dashboard-error">
                <p>No user information available</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <h1>Inventory Management System</h1>
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">
                {/* User Info Section */}
                <div className="user-info-section">
                    <h2>Welcome, {user.name}</h2>
                    <div className="user-badge">
                        <span className="role-badge">{user.role}</span>
                        <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                            {user.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {/* Statistics Section */}
                {!statsLoading && statistics && (
                    <div className="statistics-section">
                        <h2>Issues Statistics</h2>
                        <div className="stats-grid">
                            {/* Total Issues Card */}
                            <div className="stat-card total">
                                <div className="stat-icon">📊</div>
                                <div className="stat-content">
                                    <div className="stat-label">Total Issues</div>
                                    <div className="stat-value">{statistics.total}</div>
                                </div>
                            </div>

                            {/* Draft Card */}
                            <div className="stat-card draft">
                                <div className="stat-icon">📝</div>
                                <div className="stat-content">
                                    <div className="stat-label">Draft</div>
                                    <div className="stat-value">{statistics.status_breakdown.draft.count}</div>
                                    <div className="stat-percentage">{statistics.status_breakdown.draft.percentage}%</div>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill draft-fill"
                                        style={{ width: `${statistics.status_breakdown.draft.percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Approved Card */}
                            <div className="stat-card approved">
                                <div className="stat-icon">✅</div>
                                <div className="stat-content">
                                    <div className="stat-label">Approved</div>
                                    <div className="stat-value">{statistics.status_breakdown.approved.count}</div>
                                    <div className="stat-percentage">{statistics.status_breakdown.approved.percentage}%</div>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill approved-fill"
                                        style={{ width: `${statistics.status_breakdown.approved.percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Issued Card */}
                            <div className="stat-card issued">
                                <div className="stat-icon">📦</div>
                                <div className="stat-content">
                                    <div className="stat-label">Issued</div>
                                    <div className="stat-value">{statistics.status_breakdown.issued.count}</div>
                                    <div className="stat-percentage">{statistics.status_breakdown.issued.percentage}%</div>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill issued-fill"
                                        style={{ width: `${statistics.status_breakdown.issued.percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Cancelled Card */}
                            <div className="stat-card cancelled">
                                <div className="stat-icon">❌</div>
                                <div className="stat-content">
                                    <div className="stat-label">Cancelled</div>
                                    <div className="stat-value">{statistics.status_breakdown.cancelled.count}</div>
                                    <div className="stat-percentage">{statistics.status_breakdown.cancelled.percentage}%</div>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill cancelled-fill"
                                        style={{ width: `${statistics.status_breakdown.cancelled.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Issues Section */}
                <div className="issues-section">
                    <div className="section-header">
                        <h2>Issues Management</h2>
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search by issue code..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="search-input"
                            />
                            <span className="search-icon">🔍</span>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {isLoading ? (
                        <div className="loading-spinner">Loading issues...</div>
                    ) : issues.length === 0 ? (
                        <div className="empty-state">
                            <p>No issues found</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table className="issues-table">
                                    <thead>
                                        <tr>
                                            <th>Issue Code</th>
                                            <th>Status</th>
                                            <th>Requested By</th>
                                            <th>Approved By</th>
                                            <th>Issued At</th>
                                            <th>Note</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map((issue) => (
                                            <tr
                                                key={issue.id}
                                                className="table-row"
                                                onClick={() => handleRowClick(issue.id)}
                                            >
                                                <td className="code-cell">{issue.code}</td>
                                                <td>
                                                    <span className={`status-badge ${getStatusColor(issue.status)}`}>
                                                        {issue.status}
                                                    </span>
                                                </td>
                                                <td>{issue.requested_by || '-'}</td>
                                                <td>{issue.approved_by || '-'}</td>
                                                <td>{issue.issued_at ? new Date(issue.issued_at).toLocaleDateString() : '-'}</td>
                                                <td className="note-cell">{issue.note || '-'}</td>
                                                <td>
                                                    <button
                                                        className="view-button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/issues/${issue.id}/items`);
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="pagination">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    ← Previous
                                </button>
                                <span className="pagination-info">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="pagination-btn"
                                >
                                    Next →
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Issue Details Modal */}
                {selectedIssue && (
                    <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Issue Details - {selectedIssue.issue.code}</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setSelectedIssue(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="modal-body">
                                {/* Issue Info */}
                                <div className="detail-section">
                                    <h3>Issue Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <label>Code:</label>
                                            <span>{selectedIssue.issue.code}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Status:</label>
                                            <span className={`status-badge ${getStatusColor(selectedIssue.issue.status)}`}>
                                                {selectedIssue.issue.status}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Requested By:</label>
                                            <span>{selectedIssue.issue.requested_by || '-'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Approved By:</label>
                                            <span>{selectedIssue.issue.approved_by || '-'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Issued At:</label>
                                            <span>
                                                {selectedIssue.issue.issued_at
                                                    ? new Date(selectedIssue.issue.issued_at).toLocaleString()
                                                    : '-'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Note:</label>
                                            <span>{selectedIssue.issue.note || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Issue Items Table */}
                                <div className="detail-section">
                                    <h3>Issue Items ({selectedIssue.items.length})</h3>
                                    {selectedIssue.items.length === 0 ? (
                                        <p className="empty-state">No items in this issue</p>
                                    ) : (
                                        <div className="table-wrapper">
                                            <table className="details-table">
                                                <thead>
                                                    <tr>
                                                        <th>SKU</th>
                                                        <th>Item Name</th>
                                                        <th>Quantity</th>
                                                        <th>Unit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedIssue.items.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>{item.item_sku || '-'}</td>
                                                            <td>{item.item_name || '-'}</td>
                                                            <td>{item.qty ? parseFloat(item.qty.toString()).toFixed(1) : '0.0'}</td>
                                                            <td>{'-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn-close"
                                    onClick={() => setSelectedIssue(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;