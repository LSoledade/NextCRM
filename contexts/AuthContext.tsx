'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { UserRole } from '@/types/roles';

const supabase = createClient();

interface ExtendedUser extends User {
  role?: UserRole; // A role agora vem do user_metadata
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
          
          // Se o erro for de refresh token, tenta fazer logout limpo
          if (sessionError.message?.includes('refresh_token_not_found') || 
              sessionError.message?.includes('Invalid Refresh Token')) {
            console.log('Token de refresh inválido, fazendo logout...');
            await supabase.auth.signOut();
            setUser(null);
            setLoading(false);
            return;
          }
        }
        
        const authUser = session?.user ?? null;

        if (authUser) {
          // A role agora é lida diretamente do user_metadata
          setUser({ ...authUser, role: authUser.user_metadata?.role as UserRole || 'professor' });
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error('Falha ao processar sessão inicial:', error);
        
        // Se for erro de refresh token, limpa a sessão
        if (error?.message?.includes('refresh_token_not_found') || 
            error?.message?.includes('Invalid Refresh Token')) {
          console.log('Limpando sessão devido a token inválido...');
          await supabase.auth.signOut();
        }
        
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        
        try {
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            const authUser = session?.user ?? null;
            if (authUser) {
              setUser({ ...authUser, role: authUser.user_metadata?.role as UserRole || 'professor' });
            } else {
              setUser(null);
            }
          } else if (event === 'SIGNED_IN') {
            const authUser = session?.user ?? null;
            if (authUser) {
              setUser({ ...authUser, role: authUser.user_metadata?.role as UserRole || 'professor' });
            }
          } else {
            const authUser = session?.user ?? null;
            if (authUser) {
              setUser({ ...authUser, role: authUser.user_metadata?.role as UserRole || 'professor' });
            } else {
              setUser(null);
            }
          }
        } catch (error: any) {
          console.error('Erro no listener de auth:', error);
          if (error?.message?.includes('refresh_token_not_found') || 
              error?.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
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