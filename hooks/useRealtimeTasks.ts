// hooks/useRealtimeTasks.ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type RealtimePostgresChangesPayload<T extends { [key: string]: any }> = import('@supabase/supabase-js').RealtimePostgresChangesPayload<T>;

const TASKS_QUERY_KEY = 'tasks';

export const useRealtimeTasks = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Query para buscar tasks iniciais
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery<Task[]>({
    queryKey: [TASKS_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error: dbError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (dbError) {
        console.error('Erro ao buscar tasks:', dbError);
        throw dbError;
      }
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos, igual ao dashboard para consistência
  });

  // Efeito para a subscription real-time
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime-tasks-${userId}`)
      .on<Task>(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          console.log('Mudança real-time nas tasks recebida:', payload);

          const queryKey = [TASKS_QUERY_KEY, userId];

          queryClient.setQueryData<Task[]>(queryKey, (currentData) => {
            const oldData = currentData || [];
            if (payload.eventType === 'INSERT') {
              // Adicionar nova task, evitando duplicatas se já existir (pouco provável com IDs únicos)
              if (oldData.find(task => task.id === payload.new.id)) return oldData;
              return [payload.new, ...oldData];
            }
            if (payload.eventType === 'UPDATE') {
              return oldData.map(task =>
                task.id === payload.new.id ? payload.new : task
              );
            }
            if (payload.eventType === 'DELETE') {
              // O payload.old contém os dados da linha deletada, incluindo o ID
              if (!payload.old || !('id' in payload.old)) {
                console.warn("DELETE payload.old não tem ID, invalidando query como fallback.", payload);
                queryClient.invalidateQueries({ queryKey });
                return oldData;
              }
              return oldData.filter(task => task.id !== (payload.old as Task).id);
            }
            return oldData;
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Conectado ao canal real-time de tasks para usuário ${userId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Erro no canal real-time de tasks (Status: ${status}):`, err);
          // Poderia tentar reconectar ou notificar o usuário
        }
      });

    // Cleanup da subscription ao desmontar o componente ou quando userId mudar
    return () => {
      console.log(`Desconectando do canal real-time de tasks para usuário ${userId}`);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return { tasks, isLoading, error: error ? (error as Error) : null };
};
