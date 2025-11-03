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
    const [tokenInfo, setTokenInfo] = useState<string | null>('');

    console.log('=== Dashboard Rendered ===', {
        accounts: accounts.length,
        activeAccount: instance.getActiveAccount(),
        timestampt: new Date().toISOString()
    });

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                if (accounts.length === 0) {
                    console.error('❌ No accounts found');
                    setError('No account found')
                    setLoading(false);
                    return
                }

                const account = accounts[0];
                console.log('Using account:', account);

                // Acquire token silently
                console.log('Acquiring token silently...');
                console.log('Token request:', { ...loginRequest, account });
                const tokenResponse = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account: account
                });

                console.log('✅ Token acquired:', {
                    tokenType: tokenResponse.tokenType,
                    expiresOn: tokenResponse.expiresOn,
                    scopes: tokenResponse.scopes,
                    account: tokenResponse.account,
                });
                const accessToken = tokenResponse.accessToken
                console.log('Access token (first 20 chars):', accessToken.substring(0, 20) + '...');
                setTokenInfo(accessToken.substring(0, 50) + '...');

                // Call API's to fetch user info
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/auth/me`;
                console.log('Calling API: ', apiUrl);
                console.log('Authorization header: ', `Bearer ${accessToken}`);

                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('API Response: ', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ API Error Response:', errorText);
                    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
                }
                const data = await response.json();
                console.log('✅ User info received:', data);
                setUserInfo(data);
            } catch (err) {
                console.error('❌ Failed to fetch user info:', err);
                console.error('Error details:', {
                    name: (err as Error).name,
                    message: (err as Error).message,
                    stack: (err as Error).stack
                });
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
            <div style={{ 
                backgroundColor: '#e3f2fd', 
                padding: '15px', 
                borderRadius: '5px',
                marginBottom: '20px',
                width: '100%',
                fontSize: '12px',
                fontFamily: 'monospace'
            }}>
                <h3>Debug Info:</h3>
                <p><strong>Accounts:</strong> {accounts.length}</p>
                <p><strong>Active Account:</strong> {instance.getActiveAccount()?.username}</p>
                <p><strong>Token (preview):</strong> {tokenInfo}</p>
                <p><strong>API URL:</strong> {import.meta.env.VITE_API_BASE_URL}/auth/me</p>
            </div>

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