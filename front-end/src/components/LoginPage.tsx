import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';

const LoginPage: React.FC = () => {
    const { instance } = useMsal();

    const handleLogin = async () => {
        try {
            await instance.loginRedirect(loginRequest);
        } catch (error) {
            console.error('Login failed:', error);
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