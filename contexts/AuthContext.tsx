'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para garantir que o usuário existe na tabela users
  const ensureUserProfile = async (authUser: User) => {
    try {
      console.log('Verificando perfil do usuário:', authUser.id);
      
      // Verificar se o usuário já existe na tabela users
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      // Se não existir, criar o perfil do usuário
      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Criando perfil do usuário...');
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            username: authUser.email?.split('@')[0] || 'user',
            role: 'user'
          });

        if (insertError) {
          console.error('Erro ao criar perfil do usuário:', insertError);
          // Não lançar erro - deixar usuário continuar mesmo sem perfil completo
          return false;
        } else {
          console.log('Perfil do usuário criado com sucesso');
          return true;
        }
      } else if (fetchError) {
        console.error('Erro ao verificar usuário:', fetchError);
        // Não lançar erro - deixar usuário continuar mesmo com erro de verificação
        return false;
      } else {
        console.log('Perfil do usuário já existe');
        return true;
      }
    } catch (error) {
      console.error('Erro inesperado ao garantir perfil do usuário:', error);
      // Não lançar erro - deixar usuário continuar mesmo com erro inesperado
      return false;
    }
  };
  useEffect(() => {
    // Verificar sessão inicial
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;
        
        if (sessionUser) {
          try {
            await ensureUserProfile(sessionUser);
          } catch (profileError) {
            console.error('Erro ao garantir perfil do usuário:', profileError);
            // Continuar mesmo com erro no perfil - usuário ainda pode estar autenticado
          }
        }
        
        setUser(sessionUser);
      } catch (error) {
        console.error('Erro ao obter sessão inicial:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const sessionUser = session?.user ?? null;
          
          if (sessionUser && event === 'SIGNED_IN') {
            try {
              await ensureUserProfile(sessionUser);
            } catch (profileError) {
              console.error('Erro ao garantir perfil do usuário:', profileError);
              // Continuar mesmo com erro no perfil - usuário ainda pode estar autenticado
            }
          }
          
          setUser(sessionUser);
        } catch (error) {
          console.error('Erro na mudança de estado de autenticação:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    loading,
    signOut,
  };

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