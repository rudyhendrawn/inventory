import type { Configuration } from '@azure/msal-browser'

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
        redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || 'http://localhost:5173',
    },
    cache: {
        cacheLocation: 'localStorage', // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    }
};

export const loginRequest = {
    scopes: [`api://${import.meta.env.VITE_MSAL_CLIENT_ID}/access_as_user`]
};