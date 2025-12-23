import React, { createContext, useContext, useState, useMemo } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

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