// hooks/useTaskMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type Task = Database['public']['Tables']['tasks']['Row'];
type InsertTask = Database['public']['Tables']['tasks']['Insert'];
type UpdateTask = Database['public']['Tables']['tasks']['Update'];

const TASKS_QUERY_KEY = 'tasks';

// Helper para invalidar queries de tasks
const invalidateTasksQuery = (queryClient: ReturnType<typeof useQueryClient>, authUserId?: string) => {
  // Se o realtime hook for global (sem userId), invalidar globalmente.
  // Se o realtime hook for filtrado por user_id, então passar o authUserId.
  // Por enquanto, vamos assumir que useRealtimeTasks pode ser global ou filtrado,
  // então invalidar de forma mais genérica se authUserId não estiver sempre presente.
  queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
  if (authUserId) {
    queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, authUserId] });
  }
};

// Hook para criar uma nova Task
export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  return useMutation({
    mutationFn: async (taskData: Omit<InsertTask, 'user_id' | 'status' | 'assigned_to_id'> & { assigned_to_id?: string | null }) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      if (userProfile?.role !== 'admin') {
        // Embora o botão de criar seja restrito a admins na UI, adicionamos uma camada de segurança.
        throw new Error('Apenas administradores podem criar tarefas.');
      }

      const newTaskData: InsertTask = {
        ...taskData,
        title: taskData.title, // title é obrigatório
        user_id: user.id, // O user_id da tarefa é o criador
        status: 'Backlog', // Status padrão para novas tarefas
        // assigned_to_id é opcional no input, pode ser definido pelo admin no modal.
        // Se não fornecido, pode ser null ou o user_id do criador, dependendo da regra de negócio.
        // Vamos permitir que seja null se não fornecido.
        assigned_to_id: taskData.assigned_to_id || null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTaskData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, user?.id);
    },
  });
};

// Hook para atualizar uma Task existente
export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...taskData }: UpdateTask & { id: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      if (userProfile?.role !== 'admin') {
        throw new Error('Apenas administradores podem editar tarefas.');
      }

      // Admins podem editar qualquer tarefa, não restringimos por user_id aqui.
      // A RLS deve garantir que o admin tenha permissão para a operação.
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, user?.id);
    },
  });
};

// Hook para deletar uma Task
export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      if (userProfile?.role !== 'admin') {
        throw new Error('Apenas administradores podem deletar tarefas.');
      }

      // Admins podem deletar qualquer tarefa.
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, user?.id);
    },
  });
};

// Hook otimizado para atualizar apenas o status de uma Task (para Drag-and-Drop)
// Não requer role de admin, pois usuários padrão podem mover tarefas.
export const useUpdateTaskStatusOnlyMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Pegar o user para invalidar a query correta, se necessário.

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      if (!user?.id) throw new Error('Usuário não autenticado para mover tarefa.');

      // Qualquer usuário autenticado pode mover tarefas (atualizar status).
      // A RLS deve garantir que o usuário só possa ver e interagir com tarefas permitidas.
      // Não há filtro .eq('user_id', user.id) aqui, permitindo mover qualquer tarefa visível.
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, user?.id);
    },
  });
};
