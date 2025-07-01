'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
// import { useToast } from '@/hooks/use-toast'; // Supondo que você tenha um hook de toast

interface ExtendedUser extends User {
  role?: 'admin' | 'user';
  username?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  // profileError: string | null; // Opcional: para expor erros de perfil
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  // const [profileError, setProfileError] = useState<string | null>(null); // Opcional
  // const { toast } = useToast(); // Supondo que você tenha um hook de toast

  const fetchUserProfile = useCallback(async (authUser: User): Promise<ExtendedUser> => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('role, username')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return { ...authUser, role: 'user' }; // Default fallback
    }

    return {
      ...authUser,
      role: profile.role as 'admin' | 'user',
      username: profile.username
    };
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const updatedUser = await fetchUserProfile(user);
      setUser(updatedUser);
    } catch (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
    }
  }, [user, fetchUserProfile]);

  const ensureUserProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfileChecked(false); // Reset if user logs out
      // setProfileError(null);
      return false;
    }
    if (profileChecked) {
      console.log('Perfil já verificado para o usuário:', authUser.id);
      return true; // Already checked for this session/user
    }

    console.log('Verificando perfil do usuário pela primeira vez na sessão:', authUser.id);
    // setProfileError(null);

    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, role, username')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') { // "PGRST116" means no rows found
        console.log('Perfil não encontrado, criando novo perfil do usuário...');
        const { error: insertError } = await supabase.from('users').insert({
          id: authUser.id,
          username: authUser.user_metadata?.name || authUser.email?.split('@')[0] || `user_${authUser.id.substring(0, 8)}`,
          role: 'user', // Default role
        });

        if (insertError) {
          console.error('Erro crítico ao criar perfil do usuário:', insertError);
          // setProfileError(`Falha ao criar perfil: ${insertError.message}`);
          // toast({ title: "Erro de Perfil", description: "Não foi possível criar seu perfil. Algumas funcionalidades podem não estar disponíveis.", variant: "destructive" });
          setProfileChecked(true); // Mark as checked to avoid retries, even on failure
          return false;
        }
        
        // Buscar o perfil recém-criado para obter o role
        const updatedUser = await fetchUserProfile(authUser);
        setUser(updatedUser);
        
        console.log('Perfil do usuário criado com sucesso');
        setProfileChecked(true);
        return true;
      } else if (fetchError) {
        console.error('Erro ao verificar existência do usuário na tabela "users":', fetchError);
        // setProfileError(`Falha ao verificar perfil: ${fetchError.message}`);
        // toast({ title: "Erro de Perfil", description: "Não foi possível verificar seu perfil. Tente recarregar a página.", variant: "destructive" });
        setProfileChecked(true); // Mark as checked to avoid retries
        return false;
      }

      // Usuário existe, buscar dados completos incluindo role
      const updatedUser = await fetchUserProfile(authUser);
      setUser(updatedUser);

      console.log('Perfil do usuário carregado:', existingUser);
      setProfileChecked(true);
      return true;
    } catch (error: any) {
      console.error('Erro inesperado ao garantir perfil do usuário:', error);
      // setProfileError(`Erro inesperado: ${error.message}`);
      // toast({ title: "Erro Inesperado", description: "Ocorreu um erro ao processar seu perfil.", variant: "destructive" });
      setProfileChecked(true); // Mark as checked
      return false;
    }
  }, [profileChecked, fetchUserProfile]); // Adicionado fetchUserProfile como dependência

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          // console.error('Erro ao buscar sessão inicial:', sessionError);
          throw sessionError;
        }
        
        const sessionUser = session?.user ?? null;
        
        if (sessionUser) {
          // Buscar o perfil completo com role antes de definir o usuário
          const updatedUser = await fetchUserProfile(sessionUser);
          setUser(updatedUser);
          await ensureUserProfile(sessionUser);
        } else {
          setUser(null);
          setProfileChecked(false); // No user, so profile isn't checked
        }
      } catch (error) {
        console.error('Falha ao processar sessão inicial:', error);
        setUser(null);
        setProfileChecked(false);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        // setProfileError(null);
        const sessionUser = session?.user ?? null;
        setUser(sessionUser as ExtendedUser); // Update user state immediately

        if (event === 'SIGNED_IN' && sessionUser) {
          setProfileChecked(false); // Reset for new sign-in, ensure fresh check
          await ensureUserProfile(sessionUser);
        } else if (event === 'SIGNED_OUT') {
          setProfileChecked(false); // User signed out
        } else if (event === 'USER_UPDATED' && sessionUser) {
            // Potentially re-check profile if user metadata might have changed
            // For now, let's assume ensureUserProfile handles existing but potentially stale data if needed
            // or rely on manual profile updates elsewhere.
            // If critical, could do:
            // setProfileChecked(false);
            // await ensureUserProfile(sessionUser);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [ensureUserProfile, fetchUserProfile]);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfileChecked(false);
      // setProfileError(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // toast({ title: "Erro de Logout", description: "Não foi possível fazer logout. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signOut,
    refreshUserProfile,
    // profileError, // Opcional
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