import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';

function LoginPage() {
    const { instance, accounts, inProgress } = useMsal();

    console.log('=== LoginPage Rendered ===', {
        accounts: accounts.length,
        inProgress: inProgress,
        timestampt: new Date().toISOString()
    });

    const handleLogin = async () => {
        console.log('=== Login Button Clicked ===');
        console.log('Login Request:', loginRequest);
        console.log('MSAL Instance:', instance);
        
        try {
            console.log('Calling loginRedirect ...');
            await instance.loginRedirect(loginRequest);
            console.log('loginRedirect called successfully (will redirect now).');
        } catch (error) {
            console.error('❌ Login failed:', error);
            console.error('Error details: ', {
                name: (error as Error).name,
                message: (error as Error).message,
                stack: (error as Error).stack
            });
            alert(`Login failed: ${(error as Error).message}`);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '20px',
            }}>
                <h1>SGI Inventory Management System</h1>
                <p>Please log in with your Microsoft 365 account.</p>
                <div style={{ 
                    marginTop: '20px', 
                    textAlign: 'left', 
                    backgroundColor: '#f0f0f0', 
                    padding: '15px', 
                    borderRadius: '5px' 
                }}>
                    <h3>Debug: Info</h3>
                    <p><strong>Accounts:</strong> {accounts.length}</p>
                    <p><strong>In Progress:</strong> {inProgress ? 'Yes' : 'No'}</p>
                    <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                    <p><strong>Client ID: </strong>{import.meta.env.VITE_CLIENT_ID}</p>
                    <p><strong>Tenant ID: </strong>{import.meta.env.VITE_TENANT_ID}</p>
                    <p><strong>Redirect URI: </strong>{import.meta.env.VITE_REDIRECT_URI}</p>
                </div>
                <button
                    onClick={handleLogin}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: '#0078D4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '20px',
                    }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#106ebe'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0078D4'}
                    >
                        Login with Microsoft
                </button>
        </div>
    );
};

export default LoginPage;