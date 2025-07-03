'use client';

import { useEffect, useState } from 'react'; // useState e useEffect ainda são usados para leads e dialogs
import { type BadgeProps } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react'; // Removido GripVertical
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase'; // supabase ainda é usado para buscar leads
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';
import { UserRole } from '@/types/roles';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
} from '@/hooks/useTaskMutations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Para exibir erros
import KanbanBoard from '@/components/Tasks/KanbanBoard';
import TaskEditCard from '@/components/Tasks/TaskEditCard';

type Task = Database['public']['Tables']['tasks']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type InsertTask = Database['public']['Tables']['tasks']['Insert'];
type UpdateTask = Database['public']['Tables']['tasks']['Update'];


// Interface NewTask pode ser substituída ou alinhada com InsertTask/UpdateTask
// Atualizado para refletir os novos status do Kanban
interface FormTaskState {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Backlog' | 'Em andamento' | 'Bloqueadas' | 'Em Analise' | 'Concluidas';
  due_date: string;
  assigned_to_id: string | null; // Mudança: usar assigned_to_id ao invés de related_lead_id
}

const statusColumns = [
  { key: 'Todo' as UpdateTask['status'], title: 'Para Fazer', color: '#FF9800' },
  { key: 'InProgress' as UpdateTask['status'], title: 'Em Andamento', color: '#2196F3' },
  { key: 'Done' as UpdateTask['status'], title: 'Concluído', color: '#4CAF50' },
];

// NOVO: status Kanban
const kanbanColumns = [
  { key: 'Backlog', title: 'Backlog' },
  { key: 'Em andamento', title: 'Em andamento' },
  { key: 'Bloqueadas', title: 'Bloqueadas' },
  { key: 'Em Analise', title: 'Em Análise' },
  { key: 'Concluidas', title: 'Concluídas' },
];

// Novo tipo para status
const DEFAULT_STATUS: FormTaskState['status'] = 'Backlog';

export default function TasksPage() {
  const { user } = useAuth();
  const userId = user?.id;

  // Hook para dados de tasks e real-time updates
  const { tasks, isLoading: tasksLoading, error: tasksError } = useRealtimeTasks();

  // Mapear UserRole para o tipo esperado pelos hooks de tasks
  const getTaskRole = (role: UserRole | undefined): 'admin' | 'user' => {
    return role === 'admin' ? 'admin' : 'user';
  };

  // Hooks de mutação para tasks
  const taskRole = getTaskRole(user?.role);
  const createTaskMutation = useCreateTaskMutation(userId, taskRole);
  const updateTaskMutation = useUpdateTaskMutation(userId, taskRole);
  const deleteTaskMutation = useDeleteTaskMutation(userId, taskRole);
  const updateTaskStatusMutation = useUpdateTaskStatusMutation(userId);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true); // Loading para usuários
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Efeito para carregar usuários (necessário para o dropdown no formulário de task)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userId) {
        setUsers([]);
        setUsersLoading(false);
        return;
      }
      setUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, role, created_at') // Incluir created_at
          .order('username');
        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Erro ao buscar usuários para o formulário de tasks:', error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [userId]);


  const handleOpenDialogForCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  // Ajustar handleOpenDialogForEdit para status novo
  const handleOpenDialogForEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  // Função para adicionar tarefa inline no kanban
  const handleAddTaskInline = async (taskData: { title: string; description: string; priority: string; status: string }) => {
    if (!userId) return;
    
    const taskPayload = {
      title: taskData.title,
      description: taskData.description || null,
      priority: taskData.priority as FormTaskState['priority'],
      status: taskData.status as FormTaskState['status'],
      due_date: null,
      assigned_to_id: userId, // Atribuir ao usuário atual por padrão
      user_id: userId,
    };
    
    await createTaskMutation.mutateAsync(taskPayload as InsertTask);
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskMutation.mutateAsync(id);
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      // Exibir toast/alert de erro
    }
  };

  // Handler para salvar tarefa do TaskEditCard
  const handleSaveTaskFromCard = async (taskData: any) => {
    if (!userId) return;
    
    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({ 
          ...taskData, 
          id: editingTask.id,
          user_id: userId,
          due_date: taskData.due_date || null
        });
      } else {
        await createTaskMutation.mutateAsync({
          ...taskData,
          user_id: userId,
          assigned_to_id: taskData.assigned_to_id || userId,
          due_date: taskData.due_date || null
        } as InsertTask);
      }
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      throw error; // Re-throw para o TaskEditCard mostrar o erro
    }
  };

  // Handler para fechar o card de edição
  const handleCloseTaskCard = () => {
    setDialogOpen(false);
    setEditingTask(null);
  };

  // Corrigir handleStatusChange para status novo e garantir void
  const handleStatusChange = (taskId: string, newStatus: UpdateTask['status']) => {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  const resetForm = () => { 
    // Função mantida para compatibilidade, mas não faz nada agora
  };

  const getTasksByStatus = (statusKey: UpdateTask['status']) => {
    return tasks.filter(task => task.status === statusKey);
  };

  const getPriorityBadgeVariant = (priority: string): BadgeProps["variant"] => {
    switch (priority) {
      case 'Low': return 'default'; // Ou 'outline' ou 'secondary'
      case 'Medium': return 'secondary'; // Ou 'default'
      case 'High': return 'destructive'; // Mantém destructive para High
      case 'Urgent': return 'destructive'; // Mantém destructive para Urgent
      default: return 'outline';
    }
  };

  if (tasksLoading || usersLoading) { // Considerar loading de usuários também
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-muted-foreground">Carregando tarefas...</p>
        </div>
      </AppLayout>
    );
  }

  if (tasksError) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Erro ao Carregar Tarefas</AlertTitle>
          <AlertDescription>{tasksError.message || 'Não foi possível carregar as tarefas.'}</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <KanbanBoard
          tasks={tasks}
          userRole={taskRole}
          onTaskDrop={(
            taskId: string,
            newStatus: string
          ) => handleStatusChange(taskId, newStatus as FormTaskState['status'])}
          onAddTask={handleAddTaskInline}
          onEditTask={handleOpenDialogForEdit}
          users={users}
        />
        {/* Dialog de edição de tarefas com TaskEditCard */}
        <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
          setDialogOpen(isOpen);
          if (!isOpen) {
            setEditingTask(null);
          }
        }}>
          <DialogContent className="sm:max-w-4xl p-0 gap-0 bg-transparent border-0 shadow-none">
            <TaskEditCard
              task={editingTask}
              users={users}
              onSave={handleSaveTaskFromCard}
              onDelete={editingTask ? handleDeleteTask : undefined}
              onClose={handleCloseTaskCard}
              isLoading={createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending}
              userRole={taskRole}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}