import { useCallback, useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../config/authConfig';

export function useAuth() {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (inProgress === InteractionStatus.None) {
      setIsLoading(false);
    }
  }, [inProgress]);

  const login = useCallback(async () => {
    try {
      if (inProgress === InteractionStatus.None) {
        setIsLoading(true);
        const response = await instance.loginPopup(loginRequest);
        setIsLoading(false);
        return response;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  }, [instance, inProgress]);

  const logout = useCallback(async () => {
    try {
      if (inProgress === InteractionStatus.None) {
        setIsLoading(true);
        await instance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoading(false);
      throw error;
    }
  }, [instance, inProgress]);

  const getAccessToken = useCallback(async () => {
    try {
      if (inProgress === InteractionStatus.None && isAuthenticated) {
        setIsLoading(true);
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: instance.getAllAccounts()[0]
        });
        setIsLoading(false);
        return response.accessToken;
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      setIsLoading(false);
      throw error;
    }
  }, [instance, inProgress, isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    getAccessToken,
    user: instance.getAllAccounts()[0] || null
  };
} 