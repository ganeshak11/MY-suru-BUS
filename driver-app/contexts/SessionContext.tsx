// contexts/SessionContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Driver } from '../types/custom';

type SessionContextType = {
  session: Session | null;
  user: User | null;
  driver: Driver | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

// Create the context with a default value
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Define the provider
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null); // 3. Add 'driver' state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If we have a session, fetch the driver profile
      if (session) {
        fetchDriverProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // On change, re-fetch profile if logged in, or clear it if logged out
      if (session) {
        fetchDriverProfile(session.user.id);
      } else {
        setDriver(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 4. This function fetches the driver's info from your 'drivers' table
  const fetchDriverProfile = async (auth_user_id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('auth_user_id', auth_user_id)
        .single(); // We expect only one driver for one auth user

      if (error) throw error;
      setDriver(data);
    } catch (err) {
      console.error('Profile fetch exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  };

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    driver,
    isLoading,
    signOut,
  }), [session, driver, isLoading]);

  return (
    <SessionContext.Provider value={value}>
      {!isLoading && children}
    </SessionContext.Provider>
  );
};

// 3. Create a custom hook (this is the professional way to use context)
export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};