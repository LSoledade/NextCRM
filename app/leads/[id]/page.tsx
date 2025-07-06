'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, type BadgeProps } from '@/components/ui/badge';
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
import { Alert as ShadAlert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Edit2, PlusCircle, ClipboardList, User, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'New' as 'New' | 'Contacted' | 'Converted' | 'Lost',
    source: '',
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    due_date: '',
  });

  useEffect(() => {
    const loadLeadDetails = async () => {
      if (!user || !params.id) return;
      setLoading(true);
      setError(null);
      try {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', params.id as string)
          .eq('user_id', user.id)
          .single();

        if (leadError) {
          if (leadError.code === 'PGRST116') setError('Lead não encontrado.');
          else throw leadError;
          setLead(null);
          return;
        }

        setLead(leadData);
        setEditForm({
          name: leadData.name,
          email: leadData.email || '',
          phone: leadData.phone || '',
          status: leadData.status as any,
          source: leadData.source || '',
        });

        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('related_lead_id', params.id as string)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
      } catch (err: any) {
        console.error('Erro ao carregar detalhes do lead:', err);
        setError(err.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

    if (user && params.id) {
      loadLeadDetails();
    }
  }, [user, params.id]);

  const loadLeadDetails = async () => {
    if (!user || !params.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.id as string)
        .eq('user_id', user.id)
        .single();

      if (leadError) {
        if (leadError.code === 'PGRST116') setError('Lead não encontrado.');
        else throw leadError;
        setLead(null);
        return;
      }

      setLead(leadData);
      setEditForm({
        name: leadData.name,
        email: leadData.email || '',
        phone: leadData.phone || '',
        status: leadData.status as any,
        source: leadData.source || '',
      });

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('related_lead_id', params.id as string)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do lead:', err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLead = async () => {
    if (!lead || !user) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(editForm)
        .eq('id', lead.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      setLead(data);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!lead || !user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...newTask,
          assigned_to_id: user.id,
          related_lead_id: lead.id,
          user_id: user.id,
          status: 'Todo',
        }])
        .select()
        .single();
      if (error) throw error;
      setTasks([data, ...tasks]);
      setTaskDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'Medium', due_date: '' });
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const getStatusBadgeVariant = (status: string): BadgeProps["variant"] => {
    switch (status) {
      case 'New': return 'default';
      case 'Contacted': return 'secondary';
      case 'Converted': return 'default';
      case 'Lost': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string): BadgeProps["variant"] => {
    switch (priority) {
      case 'Low': return 'outline';
      case 'Medium': return 'secondary';
      case 'High': return 'default'; // Corrected: Changed 'warning' to 'default'
      case 'Urgent': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return 'Data inválida';
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

  if (error || !lead) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <Button variant="outline" onClick={() => router.push('/leads')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Leads
          </Button>
          <ShadAlert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error || 'Lead não encontrado.'}</AlertDescription>
          </ShadAlert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-6 md:p-6">
        <Button variant="outline" onClick={() => router.push('/leads')} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Leads
        </Button>

        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
            <Badge variant={getStatusBadgeVariant(lead.status)} className="mt-1">
              {lead.status}
            </Badge>
          </div>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Lead</DialogTitle>
                <DialogDescription>Atualize as informações do lead.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="name" className="text-right">Nome</Label>
                  <Input id="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="phone" className="text-right">Telefone</Label>
                  <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="status" className="text-right">Status</Label>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">Novo</SelectItem>
                      <SelectItem value="Contacted">Contatado</SelectItem>
                      <SelectItem value="Converted">Convertido</SelectItem>
                      <SelectItem value="Lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="source" className="text-right">Origem</Label>
                  <Input id="source" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleUpdateLead}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info"><User className="w-4 h-4 mr-2" /> Informações</TabsTrigger>
            <TabsTrigger value="tasks"><ClipboardList className="w-4 h-4 mr-2" /> Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="pt-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Dados de Contato</h3>
                    <dl className="space-y-3">
                      <div><dt className="text-sm font-medium text-muted-foreground">Email</dt><dd className="text-sm">{lead.email}</dd></div>
                      <div><dt className="text-sm font-medium text-muted-foreground">Telefone</dt><dd className="text-sm">{lead.phone || 'Não informado'}</dd></div>
                      <div><dt className="text-sm font-medium text-muted-foreground">Origem</dt><dd className="text-sm">{lead.source || 'Não informada'}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Informações do Sistema</h3>
                    <dl className="space-y-3">
                      <div><dt className="text-sm font-medium text-muted-foreground">Status</dt><dd><Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge></dd></div>
                      <div><dt className="text-sm font-medium text-muted-foreground">Criado em</dt><dd className="text-sm">{formatDate(lead.created_at)}</dd></div>
                      <div><dt className="text-sm font-medium text-muted-foreground">Última atualização</dt><dd className="text-sm">{formatDate(lead.updated_at)}</dd></div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="pt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tarefas Relacionadas</CardTitle>
                  <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Nova Tarefa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Nova Tarefa</DialogTitle>
                        <DialogDescription>Adicione uma nova tarefa para este lead.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid items-center grid-cols-4 gap-4">
                          <Label htmlFor="taskTitle" className="text-right">Título</Label>
                          <Input id="taskTitle" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid items-center grid-cols-4 gap-4">
                          <Label htmlFor="taskDesc" className="text-right">Descrição</Label>
                          <Textarea id="taskDesc" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="col-span-3" rows={3} />
                        </div>
                        <div className="grid items-center grid-cols-4 gap-4">
                          <Label htmlFor="taskPrio" className="text-right">Prioridade</Label>
                          <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Baixa</SelectItem>
                              <SelectItem value="Medium">Média</SelectItem>
                              <SelectItem value="High">Alta</SelectItem>
                              <SelectItem value="Urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid items-center grid-cols-4 gap-4">
                          <Label htmlFor="taskDueDate" className="text-right">Vencimento</Label>
                          <Input id="taskDueDate" type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="col-span-3" />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleCreateTask}>Criar Tarefa</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhuma tarefa encontrada para este lead.</p>
                ) : (
                  <ul className="space-y-3">
                    {tasks.map((task) => (
                      <li key={task.id} className="p-3 border rounded-md">
                        <h4 className="font-semibold">{task.title}</h4>
                        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          <Badge variant={getPriorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                          <Badge variant="outline">{task.status}</Badge>
                          {task.due_date && <Badge variant="outline">{formatDate(task.due_date)}</Badge>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}