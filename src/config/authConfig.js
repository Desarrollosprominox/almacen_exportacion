import { LogLevel } from '@azure/msal-browser';

const REDIRECT_URI = import.meta.env.VITE_AUTH_REDIRECT_URI || window.location.origin;
const POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_AUTH_POST_LOGOUT_REDIRECT_URI || REDIRECT_URI;

export const msalConfig = {
    auth: {
        clientId: "d3b2e185-4907-476f-b5bb-94504d706662",
        authority: "https://login.microsoftonline.com/dcbc0cef-7e0e-4841-9a93-633aa4c88bbf",
        redirectUri: REDIRECT_URI,
        postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: true,
    },
    system: {
        allowNativeBroker: false,
        loggerOptions: {
            loggerCallback: (level, message) => {
                if (level === LogLevel.Error) console.error(message);
                if (level === LogLevel.Warning) console.warn(message);
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Error,
        }
    }
};

// Add Dynamics 365 API permissions
export const loginRequest = {
    scopes: ["https://orgb392fb43.crm.dynamics.com/user_impersonation"]
};

// For accessing Dynamics 365 API
export const apiConfig = {
    baseUrl: "https://orgb392fb43.crm.dynamics.com/api/data/v9.2"
};

export const tokenRequest = {
    scopes: ["User.Read", "Mail.Read"]
};

export const graphConfig = {
    graphMeEndpoint: "https://orgb392fb43.crm.dynamics.com/api/data/v9.2"
}; 