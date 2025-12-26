import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './IssueDetailsPage.css';

interface IssueItem {
    id: number;
    issue_id: number;
    item_id: number;
    qty: number;
    item_sku?: string;
    item_name?: string;
    category_id?: number;
    category_name?: string;
    unit_id?: number;
    unit_name?: string;
    unit_symbol?: string;
    description?: string;
    active?: boolean;
}

interface Issue {
    id: number;
    code: string;
    status: string;
    requested_by?: number | string | { id: number; name?: string };
    approved_by?: number | string | { id: number; name?: string };
    issued_at?: string;
    note?: string;
    created_at?: string;
    updated_at?: string;
}

interface IssueDetailsData {
    issue: Issue;
    items: IssueItem[];
    total_qty: number;
    total_items: number;
}

function IssueDetailsPage() {
    const { issueId } = useParams<{ issueId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [issueDetails, setIssueDetails] = useState<IssueDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'sku' | 'qty' | 'category'>('name');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (issueId && token) {
            fetchIssueDetails();
        }
    }, [issueId, token]);

    const fetchIssueDetails = async () => {
        if (!issueId || !token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/issues/${issueId}/items`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch issue details');
            }

            const data = await response.json();

            // Ensure data is properly typed
            if (data.issue && data.items !== undefined) {
                setIssueDetails(data);
            } else {
                throw new Error('Invalid response format');
            }
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load issue details';
            setError(errorMessage);
            console.error('Error fetching issue details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getSortedItems = (): IssueItem[] => {
        if (!issueDetails?.items) return [];

        let filtered = issueDetails.items;

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter((item) => item.category_name === filterCategory);
        }

        // Apply sorting
        const sorted = [...filtered];
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));
                break;
            case 'sku':
                sorted.sort((a, b) => (a.item_sku || '').localeCompare(b.item_sku || ''));
                break;
            case 'qty':
                sorted.sort((a, b) => b.qty - a.qty);
                break;
            case 'category':
                sorted.sort((a, b) => getCategoryName(a.category_name).localeCompare(getCategoryName(b.category_name)));
                break;
        }

        return sorted;
    };

    const getCategories = (): string[] => {
        if (!issueDetails?.items) return [];
        const map = new Map<string, string>();
        issueDetails.items.forEach((item) => {
            const name = getCategoryName(item.category_name);
            const id = item.category_id ? String(item.category_id) : name;
            if (name) map.set(id, name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    };

    const getCategoryName = (cat: any): string => {
        if (!cat && cat !== 0) return '';
        return typeof cat === 'object' && cat !== null ? (cat.name ?? String(cat.id ?? '')) : String(cat);
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

    // Helper function to safely get user ID or name
    const getUserDisplay = (user): string => {
        if (!user) return '-';
        if (typeof user === 'number') return `User #${user}`;
        if (typeof user === 'string') return user;
        if (typeof user == 'object') {
            return user.id ? `User #${user.id}` : user.name || '-';
        }

        return '-';
    }

    if (authLoading || isLoading) {
        return (
            <div className="issue-details-loading">
                <p>Loading issue details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="issue-details-error">
                <div className="error-container">
                    <h2>Error Loading Issue</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-back">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!issueDetails) {
        return (
            <div className="issue-details-error">
                <div className="error-container">
                    <h2>Issue Not Found</h2>
                    <button onClick={() => navigate('/dashboard')} className="btn-back">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const sortedItems = getSortedItems();
    const categories = getCategories();

    return (
        <div className="issue-details-container">
            {/* Header */}
            <div className="issue-details-header">
                <div className="header-content">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn-back-small"
                    >
                        ← Back
                    </button>
                    <h1>Issue Details</h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="issue-details-content">
                {/* Issue Info Card */}
                <div className="issue-info-card">
                    <div className="card-header">
                        <h2>Issue Information</h2>
                        <span className={`status-badge ${getStatusColor(issueDetails.issue.status)}`}>
                            {issueDetails.issue.status}
                        </span>
                    </div>

                    <div className="info-grid">
                        <div className="info-item">
                            <label>Issue Code</label>
                            <span className="code">{issueDetails.issue.code}</span>
                        </div>
                        <div className="info-item">
                            <label>Status</label>
                            <span>{issueDetails.issue.status}</span>
                        </div>
                        <div className="info-item">
                            <label>Requested By</label>
                            <span>{getUserDisplay(issueDetails.issue.requested_by)}</span>
                        </div>
                        <div className="info-item">
                            <label>Approved By</label>
                            <span>{getUserDisplay(issueDetails.issue.approved_by)}</span>
                        </div>
                        <div className="info-item">
                            <label>Issued At</label>
                            <span>
                                {issueDetails.issue.issued_at
                                    ? new Date(issueDetails.issue.issued_at).toLocaleString()
                                    : '-'}
                            </span>
                        </div>
                    </div>

                    {issueDetails.issue.note && (
                        <div className="note-section">
                            <label>Note</label>
                            <p>{issueDetails.issue.note}</p>
                        </div>
                    )}
                </div>

                {/* Items Summary Card */}
                <div className="summary-card">
                    <div className="summary-item">
                        <div className="summary-label">Total Items</div>
                        <div className="summary-value">{issueDetails.total_items || 0}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Total Quantity</div>
                        <div className="summary-value">
                            {issueDetails?.total_qty ? parseFloat(issueDetails.total_qty.toString()).toFixed(1) : '0.0'}
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Categories</div>
                        <div className="summary-value">{categories.length || 0}</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="controls-card">
                    <div className="control-group">
                        <label htmlFor="sort-select">Sort By:</label>
                        <select
                            id="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'sku' | 'qty' | 'category')}
                            className="control-select"
                        >
                            <option value="name">Item Name</option>
                            <option value="sku">SKU</option>
                            <option value="qty">Quantity</option>
                            <option value="category">Category</option>
                        </select>
                    </div>

                    {categories.length > 0 && (
                        <div className="control-group">
                            <label htmlFor="category-filter">Filter Category:</label>
                            <select
                                id="category-filter"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="control-select"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Items Table */}
                <div className="items-section">
                    <h2>Items ({sortedItems.length})</h2>

                    {sortedItems.length === 0 ? (
                        <div className="empty-state">
                            <p>No items found for this issue</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th>SKU</th>
                                        <th>Item Name</th>
                                        <th>Category</th>
                                        <th>Quantity</th>
                                        <th>Unit</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedItems.map((item, index) => (
                                        <tr key={`item-${item.id}-${index}`} className="table-row">
                                            <td className="sku-cell">
                                                <span className="sku-badge">{item.item_sku || '-'}</span>
                                            </td>
                                            <td className="name-cell">{item.item_name || '-'}</td>
                                            <td className="category-cell">
                                                {getCategoryName(item.category_name) ? (
                                                    <span className="category-badge">
                                                        {getCategoryName(item.category_name)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="qty-cell">
                                                <span className="qty-value">
                                                    {item.qty ? parseFloat(item.qty.toString()).toFixed(1) : '0.0'}
                                                </span>
                                            </td>
                                            <td className="unit-cell">
                                                {item.unit_symbol ? (
                                                    <span title={item.unit_name}>
                                                        {item.unit_symbol}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="description-cell">
                                                <span title={item.description || '-'}>
                                                    {item.description
                                                        ? item.description.substring(0, 50) + 
                                                        (item.description.length > 50 ? '...' : '')
                                                        : '-'}
                                                </span>
                                            </td>
                                            <td className="status-cell">
                                                <span
                                                    className={`status-badge ${
                                                        item.active ? 'active' : 'inactive'
                                                    }`}
                                                >
                                                    {item.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default IssueDetailsPage;