'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'] | null;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile;
  loading: boolean;
  signOut: () => Promise<void>;
  // profileError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true);
  // const [profileError, setProfileError] = useState<string | null>(null);

  const fetchAndSetUserProfile = useCallback(async (authUser: User) => {
    // setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') { // Profile not found, create it
        console.log('Perfil não encontrado, criando novo perfil do usuário...');
        const newUserProfileData = {
          id: authUser.id,
          username: authUser.user_metadata?.name || authUser.email?.split('@')[0] || `user_${authUser.id.substring(0, 8)}`,
          // email: authUser.email, // O email já está no objeto `user` do Supabase Auth. Redundante armazenar aqui a menos que haja um motivo específico.
          role: 'user' as const, // Default role
        };
        const { data: createdProfile, error: insertError } = await supabase
          .from('users')
          .insert(newUserProfileData)
          .select()
          .single();

        if (insertError) {
          console.error('Erro crítico ao criar perfil do usuário:', insertError);
          // setProfileError(`Falha ao criar perfil: ${insertError.message}`);
          setUserProfile(null); // Explicitly set to null on failure
          return;
        }
        console.log('Perfil do usuário criado com sucesso:', createdProfile);
        setUserProfile(createdProfile as UserProfile);
      } else if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        // setProfileError(`Falha ao buscar perfil: ${error.message}`);
        setUserProfile(null);
      } else {
        console.log('Perfil do usuário carregado:', data);
        setUserProfile(data as UserProfile);
      }
    } catch (e: any) {
      console.error('Erro inesperado ao buscar/criar perfil do usuário:', e);
      // setProfileError(`Erro inesperado: ${e.message}`);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const getInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          await fetchAndSetUserProfile(sessionUser);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Falha ao processar sessão inicial:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          // Fetch profile on SIGNED_IN or if user object changes (e.g. USER_UPDATED)
          // For other events like TOKEN_REFRESHED, user object might be the same, profile might not need refetch unless specifically needed.
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || !userProfile) { // also fetch if no profile yet
            await fetchAndSetUserProfile(sessionUser);
          }
        } else {
          setUserProfile(null); // Clear profile on SIGNED_OUT
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchAndSetUserProfile, userProfile]); // Added userProfile to dependencies

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      // setProfileError(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signOut,
    // profileError,
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