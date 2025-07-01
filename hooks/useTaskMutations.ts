// hooks/useTaskMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type InsertTask = Database['public']['Tables']['tasks']['Insert'];
type UpdateTask = Database['public']['Tables']['tasks']['Update'];

const TASKS_QUERY_KEY = 'tasks'; // Deve ser o mesmo usado em useRealtimeTasks

// Helper para invalidar queries de tasks
const invalidateTasksQuery = (queryClient: ReturnType<typeof useQueryClient>, userId?: string) => {
  queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, userId] });
};

// Hook para criar uma nova Task
export const useCreateTaskMutation = (userId: string | undefined, role: 'admin' | 'user') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: InsertTask) => {
      if (!userId) throw new Error('User ID is required to create a task.');
      if (role !== 'admin') throw new Error('Apenas administradores podem criar tarefas.');
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: userId, assigned_to_id: userId, status: 'Backlog' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, userId);
    },
  });
};

// Hook para atualizar uma Task existente
export const useUpdateTaskMutation = (userId: string | undefined, role: 'admin' | 'user') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...taskData }: UpdateTask & { id: string }) => {
      if (!userId) throw new Error('User ID is required to update a task.');
      if (role !== 'admin') throw new Error('Apenas administradores podem editar tarefas.');
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, userId);
    },
  });
};

// Hook para deletar uma Task
export const useDeleteTaskMutation = (userId: string | undefined, role: 'admin' | 'user') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!userId) throw new Error('User ID is required to delete a task.');
      if (role !== 'admin') throw new Error('Apenas administradores podem deletar tarefas.');
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, userId);
    },
  });
};

// Hook para atualizar o status de uma Task (drag-and-drop)
export const useUpdateTaskStatusMutation = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: UpdateTask['status'] }) => {
      if (!userId) throw new Error('User ID is required to update task status.');
      // Permissão: qualquer usuário pode mover tarefas
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasksQuery(queryClient, userId);
    },
  });
};
