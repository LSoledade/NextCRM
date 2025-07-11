// hooks/useLeadMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type InsertLead = Database['public']['Tables']['leads']['Insert'];
type UpdateLead = Database['public']['Tables']['leads']['Update'];

// Helper para invalidar queries de leads
const invalidateLeadsQueries = (queryClient: ReturnType<typeof useQueryClient>, userId?: string) => {
  // A queryKey exata pode precisar de ajuste para corresponder à usada em app/leads/page.tsx
  // Atualmente é ['leads', user?.id, filters, searchTerm]
  // Para simplificar, invalidaremos de forma mais ampla ou passaremos os filtros/searchTerm se necessário.
  queryClient.invalidateQueries({ queryKey: ['leads', userId] });
  // Se você tiver uma queryKey mais específica como ['leads', userId, filters, searchTerm],
  // precisará de uma estratégia para obter filters e searchTerm aqui, ou invalidar de forma mais genérica.
  // Por agora, invalidaremos ['leads', userId] que deve cobrir a maioria dos casos se
  // as dependências da query original incluírem userId.
};

// Hook para criar um novo Lead
export const useCreateLeadMutation = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadData: InsertLead) => {
      if (!userId) throw new Error('User ID is required to create a lead.');

      // Verificar se o usuário existe na tabela users antes de criar o lead
      // Esta verificação pode ser redundante se o AuthContext já garante o perfil
      // Mas mantendo por segurança conforme o código original em leads/page.tsx
      const { error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Usuário não encontrado na tabela users:', userError);
        throw new Error('Perfil do usuário não encontrado. Não é possível criar o lead.');
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...leadData, user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateLeadsQueries(queryClient, userId);
    },
    // onError: (error) => { /* Lidar com erro, e.g., exibir notificação */ }
  });
};

// Hook para atualizar um Lead existente
export const useUpdateLeadMutation = (userId: string | undefined, userRole?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...leadData }: UpdateLead & { id: string }) => {
      if (!userId) throw new Error('User ID is required to update a lead.');
      let query = supabase
        .from('leads')
        .update(leadData)
        .eq('id', id);
      
      // Se o usuário não for admin, só pode atualizar seus próprios leads
      if (userRole !== 'admin') {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      invalidateLeadsQueries(queryClient, userId);
      // Também é possível atualizar o cache diretamente com setQueryData se preferir
      // queryClient.setQueryData(['lead', variables.id], data);
    },
  });
};

// Hook para deletar um Lead
export const useDeleteLeadMutation = (userId: string | undefined, userRole?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!userId) throw new Error('User ID is required to delete a lead.');
      let query = supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      // Se o usuário não for admin, só pode deletar seus próprios leads
      if (userRole !== 'admin') {
        query = query.eq('user_id', userId);
      }
      
      const { error } = await query;
      if (error) throw error;
      return leadId;
    },
    onSuccess: () => {
      invalidateLeadsQueries(queryClient, userId);
    },
  });
};

// Hook para atualizar status de Leads em lote
export const useBatchUpdateLeadsStatusMutation = (userId: string | undefined, userRole?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      if (!userId) throw new Error('User ID is required to batch update leads.');
      if (ids.length === 0) return [];
      let query = supabase
        .from('leads')
        .update({ status: status as any }) // O 'as any' pode ser necessário dependendo da definição de tipo do status
        .in('id', ids);
      
      // Se o usuário não for admin, só pode atualizar seus próprios leads
      if (userRole !== 'admin') {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateLeadsQueries(queryClient, userId);
    },
  });
};

// Hook para atualizar origem de Leads em lote
export const useBatchUpdateLeadsSourceMutation = (userId: string | undefined, userRole?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, source }: { ids: string[]; source: string }) => {
      if (!userId) throw new Error('User ID is required to batch update leads.');
      if (ids.length === 0) return [];
      let query = supabase
        .from('leads')
        .update({ source })
        .in('id', ids);
      
      // Se o usuário não for admin, só pode atualizar seus próprios leads
      if (userRole !== 'admin') {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateLeadsQueries(queryClient, userId);
    },
  });
};

// Hook para deletar Leads em lote
export const useBatchDeleteLeadsMutation = (userId: string | undefined, userRole?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!userId) throw new Error('User ID is required to batch delete leads.');
      if (ids.length === 0) return null;
      
      // Processar em lotes de 100 IDs para evitar erro 414 Request-URI Too Large
      const BATCH_SIZE = 100;
      const batches = [];
      
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        batches.push(ids.slice(i, i + BATCH_SIZE));
      }
      
      // Processar cada lote sequencialmente
      const deletedIds = [];
      for (const batch of batches) {
        let query = supabase
          .from('leads')
          .delete()
          .in('id', batch);
        
        // Se o usuário não for admin, só pode deletar seus próprios leads
        if (userRole !== 'admin') {
          query = query.eq('user_id', userId);
        }
        
        const { error } = await query;
        if (error) throw error;
        deletedIds.push(...batch);
      }
      
      return deletedIds;
    },
    onSuccess: () => {
      invalidateLeadsQueries(queryClient, userId);
    },
  });
};
