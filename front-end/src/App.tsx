import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';


function App() {
  const { instance, accounts, inProgress } = useMsal();

  useEffect(() => {
    console.log('=== App State Changed ===', {
      accounts: accounts.length,
      inProgress: inProgress,
      activeAccount: instance.getActiveAccount(),
      allAccounts: accounts,
      timestampt: new Date().toISOString()
    })
  }, [accounts, inProgress, instance]);

  return (
    <div className="App">
      {/* Debug banner outside of Routes */}
      {accounts.length > 0 ? (
          <div style={{ backgroundColor: '#d4edda', padding: '10px', margin: 0, textAlign: 'center' }}>
              ✅ User is authenticated
          </div>
      ) : (
          <div style={{ backgroundColor: '#f8d7da', padding: '10px', margin: 0, textAlign: 'center' }}>
              ℹ️ User is not authenticated
          </div>
      )}

      <AuthenticatedTemplate>
          <Routes>
              <Route path="/" element={<Dashboard />} />
          </Routes>
      </AuthenticatedTemplate>
      
      <UnauthenticatedTemplate>
          <Routes>
              <Route path="/" element={<LoginPage />} />
          </Routes>
      </UnauthenticatedTemplate>
    </div>
  );
}

export default App;
