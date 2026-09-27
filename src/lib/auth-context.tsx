'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  user_metadata?: { full_name?: string; name?: string };
}

interface AuthContextType {
  user: User | null;
  session: null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

const STORAGE_KEY = 'local_expert_qa_auth';

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, _password: string) => {
    const user: User = {
      id: 'local-dev-user',
      email,
      user_metadata: { full_name: email.split('@')[0] },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setUser(user);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, _password: string) => {
    const user: User = {
      id: 'local-dev-user',
      email,
      user_metadata: { full_name: email.split('@')[0] },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setUser(user);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, session: null, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}