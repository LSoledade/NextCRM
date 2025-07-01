import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/database';

// Create a single supabase client for interacting with your database
export const supabase = createClient();

// Função para verificar se o usuário está autenticado
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Função para fazer logout
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Função para obter o token de acesso atual
export const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};