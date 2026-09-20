'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  supabase: SupabaseClient | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  supabase: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: isConfigLoading } = useSupabaseConfig();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (isConfigLoading) return;

    let mounted = true;

    async function initAuth() {
      try {
        const client = await getSupabaseBrowserClientWithRetry();
        if (!mounted) return;

        setSupabase(client);

        const { data: { session: currentSession } } = await client.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);

        const { data: { subscription } } = client.auth.onAuthStateChange(
          (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [isConfigLoading]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
