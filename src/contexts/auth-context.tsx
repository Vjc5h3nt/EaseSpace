'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User as AppUser } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const refreshUser = async (skipRetry = false) => {
    if (!user) {
      setAppUser(null);
      return;
    }

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        
        // If we hit a rate limit and haven't retried too many times
        if (error.message?.includes('rate limit') && !skipRetry && retryCount < 3) {
          setRetryCount(prev => prev + 1);
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => refreshUser(true), delay);
          return;
        }
        
        setAppUser(null);
      } else {
        setAppUser(userData);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setAppUser(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
  };

  useEffect(() => {
    let mounted = true;
    
    // Get initial session with retry logic
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          
          // If rate limited, wait and retry once
          if (error.message?.includes('rate limit')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (mounted) {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (mounted) setUser(retrySession?.user ?? null);
            }
          }
        } else if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Clear app user data on sign out
          if (event === 'SIGNED_OUT') {
            setAppUser(null);
            setRetryCount(0);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Refresh app user data when auth user changes
  useEffect(() => {
    if (user && !loading) {
      refreshUser();
    }
  }, [user, loading]);

  const value = {
    user,
    appUser,
    loading,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}