import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PublicClientApplication, EventType, type EventMessage, type AuthenticationResult } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './msalConfig';
import App from './App';
import './index.css';

console.log('=== Application Starting ===');

console.log('Creating MSAL instance ...');
const msalInstance = new PublicClientApplication(msalConfig);

// Add event callbacks for debugging
msalInstance.addEventCallback((event: EventMessage) => {
  console.log('=== MSAL Event ===', {
    type: event.eventType,
    payload: event.payload,
    error: event.error,
    timestamp: new Date().toISOString()
  });

  if (event.eventType === EventType.LOGIN_SUCCESS) {
    console.log('✅ Login successful:', event.payload);
    const payload = event.payload as AuthenticationResult;
    console.log('Access Token:', payload.accessToken ? '✅ Present' : '❌ Not Present');
    console.log('ID Token:', payload.idToken ? '✅ Present' : '❌ Not Present');
    console.log('Account: ', payload.account);

    // Set active account
    if (payload.account) {
      msalInstance.setActiveAccount(payload.account);
      console.log('Active account set to:', payload.account);
    }
  }

  if (event.eventType === EventType.LOGIN_FAILURE) {
    console.error('❌ Login failed:', event.error);
  }

  if (event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
    console.log('✅ Token acquisition successful:', event.payload);
  }

  if (event.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
    console.error('❌ Token acquisition failed:', event.error);
  }
});


// Initialize MSAL
console.log('Initializing MSAL instance...');
msalInstance.initialize().then(() => {
  console.log('MSAL instance initialized successfully.');

  // Check if there are any accounts already logged in
  const accounts = msalInstance.getAllAccounts();
  console.log('Existing accounts:', accounts.length);
  if (accounts.length > 0) {
    console.log('Found existing accounts: ', accounts);
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Handle redirect promise
  console.log('Handling redirect promise ....');
  msalInstance.handleRedirectPromise()
    .then((response) => {
      if (response) {
        console.log('Redirect response:', response);
        msalInstance.setActiveAccount(response.account);
      } else {
        console.log('No redirect response to handle.');
      }
    })
    .catch((error) => {
      console.error('Redirect error:', error);
    });
  
  // Render the React application
  console.log('Rendering React application ...');
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  );

  console.log('✅ React app rendered');
  console.log('=== Application Initialized ===');
}).catch((error) => {
  console.error('❌ MSAL initialization or redirect handling failed:', error);

  // Still render the app even if there's an error, so user can see error message
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  );  
});

console.log('=== Application Initialized ===');
