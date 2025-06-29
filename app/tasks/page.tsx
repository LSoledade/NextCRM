'use client';

import { useEffect, useState } from 'react';
import { type BadgeProps } from "@/components/ui/badge"; // Corrected: Moved to top
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { PlusCircle, Edit2, Trash2, GripVertical } from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

interface NewTask {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Todo' | 'InProgress' | 'Done';
  due_date: string;
  related_lead_id: string;
}

const statusColumns = [
  { key: 'Todo', title: 'Para Fazer', color: '#FF9800' },
  { key: 'InProgress', title: 'Em Andamento', color: '#2196F3' },
  { key: 'Done', title: 'Concluído', color: '#4CAF50' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Todo',
    due_date: '',
    related_lead_id: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
      
      const subscription = supabase
        .channel('tasks_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id);

      if (leadsError) throw leadsError;

      setTasks(tasksData || []);
      setLeads(leadsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!user) return;

    try {
      const taskData = {
        ...newTask,
        assigned_to_id: user.id,
        user_id: user.id,
        related_lead_id: newTask.related_lead_id || null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select();

      if (error) throw error;

      setTasks([...tasks, ...data]);
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...newTask,
          related_lead_id: newTask.related_lead_id || null,
        })
        .eq('id', editingTask.id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === editingTask.id ? data[0] : task
      ));
      setDialogOpen(false);
      setEditingTask(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== id));
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      related_lead_id: task.related_lead_id || '',
    });
    setDialogOpen(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: 'Todo' | 'InProgress' | 'Done') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? data[0] : task
      ));
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
    }
  };

  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'Medium',
      status: 'Todo',
      due_date: '',
      related_lead_id: '',
    }); // Corrected: Added semicolon
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string): BadgeProps["variant"] => {
    switch (priority) {
    case 'Low': return 'default';
    case 'Medium': return 'secondary';
    case 'High': return 'destructive';
    case 'Urgent': return 'destructive';
    default: return 'outline';
  }
};

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {statusColumns.map((column) => (
            <Card key={column.key} className="flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">{column.title}</CardTitle>
                  <Badge style={{ backgroundColor: column.color }} className="text-white">
                    {getTasksByStatus(column.key).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 overflow-y-auto">
                {getTasksByStatus(column.key).map((task) => (
                  <Card key={task.id} className="cursor-grab active:cursor-grabbing">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-md">{task.title}</h3>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEditTask(task)}
                            className="w-6 h-6"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive w-6 h-6"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {statusColumns
                          .filter(col => col.key !== task.status)
                          .map(col => (
                            <Button
                              key={col.key}
                              size="xs"
                              variant="outline"
                              onClick={() => handleStatusChange(task.id, col.key as any)}
                              className="text-xs"
                            >
                              Mover para {col.title}
                            </Button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {getTasksByStatus(column.key).length === 0 && (
                  <p className="text-sm text-center text-muted-foreground">Nenhuma tarefa aqui.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
          setDialogOpen(isOpen);
          if (!isOpen) {
            setEditingTask(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
             <Button size="sm" className={cn(dialogOpen && "hidden")}>
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
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
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
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
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
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}
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
                    value={newTask.status}
                    onValueChange={(value) => setNewTask({ ...newTask, status: value as any })}
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
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="related_lead_id" className="text-right">
                  Lead
                </Label>
                <Select
                  value={newTask.related_lead_id}
                  onValueChange={(value) => setNewTask({ ...newTask, related_lead_id: value })}
                >
                  <SelectTrigger id="related_lead_id" className="col-span-3">
                    <SelectValue placeholder="Nenhum" />
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
              <Button type="submit" onClick={editingTask ? handleUpdateTask : handleCreateTask}>
                {editingTask ? 'Atualizar Tarefa' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}