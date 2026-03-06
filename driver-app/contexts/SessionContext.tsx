import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { Driver } from '../types/custom';

type SessionContextType = {
  driver: Driver | null;
  isLoading: boolean;
  login: (phone_number: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  // Start as true so the layout shows a spinner while we restore the session
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check for a saved token and restore the session if valid
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await apiClient.getToken();
        if (token) {
          // Validate the token and fetch the driver's profile
          const profile = await apiClient.getProfile();
          setDriver(profile);
        }
      } catch {
        // Token is expired or invalid — clear it and show login
        await apiClient.clearToken();
        setDriver(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (phone_number: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.login(phone_number, password);
      setDriver(data.driver);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await apiClient.logout();
    setDriver(null);
  };

  const value = useMemo(() => ({
    driver,
    isLoading,
    login,
    signOut,
  }), [driver, isLoading]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};