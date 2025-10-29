import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';

interface UserInfo {
    id: number;
    name: string;
    email: string;
    role: string;
    active: boolean;
}

function Dashboard() {
    const { instance, accounts } = useMsal();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                if (accounts.length === 0) {
                    setError('No account found')
                    setLoading(false);
                    return
                }

                const account = accounts[0];

                // Acquire token silently
                const tokenResponse = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account: account
                })

                const accessToken = tokenResponse.accessToken

                // Call API's to fetch user info
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                setUserInfo(data);
            } catch (err) {
                console.error('Failed to fetch user info:', err);
                setError('Failed to fetch user info. Please try logging in again.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    } , [instance, accounts]);

    const handleLogout = () => {
        instance.logoutRedirect();
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <p>Loading user information...</p>
            </div>
        );
    }   
        
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <h1>Welcome to SGI Inventory Management System</h1>

            {error && (
                <div style={{
                    color: 'red',
                    backgroundColor: '#ffebee',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    width: '100%',
                }}>
                    {error}
                </div>
            )}

            {userInfo ? (
                <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    width: '100%',
                }}>
                    <h2>User Information</h2>
                    <p><strong>ID:</strong> {userInfo.id}</p>
                    <p><strong>Name:</strong> {userInfo.name}</p>
                    <p><strong>Email:</strong> {userInfo.email}</p>
                    <p><strong>Role:</strong> {userInfo.role}</p>
                    <p><strong>Active:</strong> {userInfo.active ? 'Yes' : 'No'}</p>

                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            backgroundColor: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '20px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b71c1c'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <p>No user information available.</p>
            )}

        </div>
    );
}

export default Dashboard;