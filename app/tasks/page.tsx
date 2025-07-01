'use client';

import { useEffect, useState } from 'react'; // useState e useEffect ainda são usados para leads e dialogs
import { type BadgeProps } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  // CardDescription, // Não usado no Dialog de Tarefas
  // CardFooter, // Não usado no Dialog de Tarefas
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit2, Trash2, AlertTriangle } from 'lucide-react'; // Removido GripVertical
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase'; // supabase ainda é usado para buscar leads
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
} from '@/hooks/useTaskMutations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Para exibir erros
import KanbanBoard from '@/components/Tasks/KanbanBoard';

type Task = Database['public']['Tables']['tasks']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];
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
  related_lead_id: string | null; // Permitir null
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

  // Hooks de mutação para tasks
  const userRole = (user?.role === 'admin' || user?.role === 'user') ? user.role : 'user';
  const createTaskMutation = useCreateTaskMutation(userId, userRole);
  const updateTaskMutation = useUpdateTaskMutation(userId, userRole);
  const deleteTaskMutation = useDeleteTaskMutation(userId, userRole);
  const updateTaskStatusMutation = useUpdateTaskStatusMutation(userId);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true); // Loading para leads
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Estado do formulário
  const initialFormState: FormTaskState = {
    title: '',
    description: '',
    priority: 'Medium',
    status: DEFAULT_STATUS,
    due_date: '',
    related_lead_id: null,
  };
  const [formTask, setFormTask] = useState<FormTaskState>(initialFormState);

  // Efeito para carregar leads (necessário para o dropdown no formulário de task)
  useEffect(() => {
    const fetchLeads = async () => {
      if (!userId) {
        setLeads([]);
        setLeadsLoading(false);
        return;
      }
      setLeadsLoading(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*') // Selecionar todos os campos para corresponder ao tipo Lead
          .eq('user_id', userId);
        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error('Erro ao buscar leads para o formulário de tasks:', error);
        setLeads([]);
      } finally {
        setLeadsLoading(false);
      }
    };
    fetchLeads();
  }, [userId]);


  const handleOpenDialogForCreate = () => {
    setEditingTask(null);
    setFormTask(initialFormState);
    setDialogOpen(true);
  };

  // Ajustar handleOpenDialogForEdit para status novo
  const handleOpenDialogForEdit = (task: Task) => {
    setEditingTask(task);
    setFormTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority as FormTaskState['priority'],
      status: task.status as FormTaskState['status'],
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      related_lead_id: task.related_lead_id || null,
    });
    setDialogOpen(true);
  };

  // Corrigir handleSubmitTaskForm para status e campos obrigatórios
  const handleSubmitTaskForm = async () => {
    if (!userId) return;
    const taskPayload = {
      ...formTask,
      status: formTask.status as UpdateTask['status'],
      related_lead_id: formTask.related_lead_id || null,
      due_date: formTask.due_date || null,
      assigned_to_id: userId,
      user_id: userId,
    };
    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({ ...taskPayload, id: editingTask.id });
      } else {
        await createTaskMutation.mutateAsync(taskPayload as InsertTask);
      }
      setDialogOpen(false);
      setEditingTask(null);
      setFormTask(initialFormState);
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      // Exibir toast/alert de erro
    }
  };

  // Corrigir handleStatusChange para status novo e garantir void
  const handleStatusChange = (taskId: string, newStatus: UpdateTask['status']) => {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  const resetForm = () => { // Agora usado para fechar dialog também
    setFormTask(initialFormState);
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

  if (tasksLoading || leadsLoading) { // Considerar loading de leads também
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
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          {/* Botão Nova Tarefa */}
        </div>
        <KanbanBoard
          tasks={tasks}
          userRole={userRole}
          onTaskDrop={(
            taskId: string,
            newStatus: string
          ) => handleStatusChange(taskId, newStatus as FormTaskState['status'])}
        />
        {/* Dialog de criação/edição permanece igual */}
        <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
          setDialogOpen(isOpen);
          if (!isOpen) {
            setEditingTask(null);
            resetForm(); // Usa resetForm que limpa formTask
          }
        }}>
          <DialogTrigger asChild>
             <Button size="sm" onClick={handleOpenDialogForCreate} className={cn(dialogOpen && "hidden")}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Atualize os detalhes da tarefa.' : 'Preencha os detalhes para criar uma nova tarefa.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="title" className="text-right">
                  Título
                </Label>
                <Input
                  id="title"
                  value={formTask.title}
                  onChange={(e) => setFormTask({ ...formTask, title: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={formTask.description}
                  onChange={(e) => setFormTask({ ...formTask, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="priority" className="col-span-1 text-right">
                    Prioridade
                  </Label>
                  <Select
                    value={formTask.priority}
                    onValueChange={(value) => setFormTask({ ...formTask, priority: value as FormTaskState['priority'] })}
                  >
                    <SelectTrigger id="priority" className="col-span-3">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Baixa</SelectItem>
                      <SelectItem value="Medium">Média</SelectItem>
                      <SelectItem value="High">Alta</SelectItem>
                      <SelectItem value="Urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="status" className="col-span-1 text-right">
                    Status
                  </Label>
                  <Select
                    value={formTask.status}
                    onValueChange={(value) => setFormTask({ ...formTask, status: value as FormTaskState['status'] })}
                  >
                    <SelectTrigger id="status" className="col-span-3">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todo">Para Fazer</SelectItem>
                      <SelectItem value="InProgress">Em Andamento</SelectItem>
                      <SelectItem value="Done">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="due_date" className="text-right">
                  Vencimento
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formTask.due_date}
                  onChange={(e) => setFormTask({ ...formTask, due_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="related_lead_id" className="text-right">
                  Lead
                </Label>
                <Select
                  value={formTask.related_lead_id || ''} // Select value não pode ser null
                  onValueChange={(value) => setFormTask({ ...formTask, related_lead_id: value || null })}
                  disabled={leadsLoading}
                >
                  <SelectTrigger id="related_lead_id" className="col-span-3">
                    <SelectValue placeholder={leadsLoading ? "Carregando leads..." : "Nenhum"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} {lead.email ? `(${lead.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" onClick={handleSubmitTaskForm} disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                {editingTask ?
                  (updateTaskMutation.isPending ? 'Atualizando...' : 'Atualizar Tarefa') :
                  (createTaskMutation.isPending ? 'Criando...' : 'Criar Tarefa')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}