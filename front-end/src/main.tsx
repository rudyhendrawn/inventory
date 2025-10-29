import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './msalConfig';
import App from './App';
import './index.css';

const pca = new PublicClientApplication(msalConfig);

// Initialize MSAL
await pca.initialize();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={pca}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MsalProvider>
  </React.StrictMode>,
);
