'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ExtendedUser extends User {
  role?: 'admin' | 'user'; // A role agora vem do user_metadata
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Erro ao buscar sessão inicial:', sessionError);
          // Consider how to handle this error, perhaps set an error state
        }
        
        const authUser = session?.user ?? null;

        if (authUser) {
          // A role agora é lida diretamente do user_metadata
          setUser({ ...authUser, role: authUser.user_metadata?.role as 'admin' | 'user' || 'user' });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Falha ao processar sessão inicial:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setLoading(true);
        const authUser = session?.user ?? null;
        if (authUser) {
          setUser({ ...authUser, role: authUser.user_metadata?.role as 'admin' | 'user' || 'user' });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Consider user-facing error feedback
    } finally {
      setLoading(false);
    }
  };

  const value = { user, loading, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}