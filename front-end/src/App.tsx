import { Routes, Route } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';


function App() {
  return (
    <div className="App">
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

export default App
