'use client';

'use client';

import { useEffect, useState, useMemo } from 'react';
import { type BadgeProps } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { PlusCircle, Edit2, Trash2, AlertTriangle, GripVertical } from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskStatusOnlyMutation, // Renomeado/Novo hook
} from '@/hooks/useTaskMutations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


type Task = Database['public']['Tables']['tasks']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];
type UserProfile = Database['public']['Tables']['users']['Row'];
type TaskStatus = NonNullable<Database['public']['Tables']['tasks']['Row']['status']>;


interface FormTaskState {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  // status: TaskStatus; // Status será definido pelo Backlog ou pela coluna no DND
  due_date: string;
  related_lead_id: string | null;
  assigned_to_id: string | null;
}

// Definição das colunas do Kanban
const KANBAN_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'Backlog', title: 'Backlog' },
  { id: 'Em andamento', title: 'Em Andamento' },
  { id: 'Bloqueadas', title: 'Bloqueadas' },
  { id: 'Em Analise', title: 'Em Análise' },
  { id: 'Concluidas', title: 'Concluídas' },
];

// Componente para o Card de Tarefa individual (Sortable)
function SortableTaskCard({ task, onEdit, onDelete, isAdmin }: { task: Task; onEdit: (task: Task) => void; onDelete: (taskId: string) => void; isAdmin: boolean; }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'TASK', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // zIndex: isDragging ? 100 : 'auto', // Para sobrepor outros elementos ao arrastar
  };

  const getPriorityBadgeVariant = (priority: string | null): BadgeProps["variant"] => {
    switch (priority) {
      case 'Low': return 'default';
      case 'Medium': return 'secondary';
      case 'High': return 'destructive';
      case 'Urgent': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "mb-3 touch-none", // touch-none para melhor experiência mobile com dnd-kit
        isDragging && "shadow-xl border-primary"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-md leading-tight">{task.title}</h3>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(task)} className="w-6 h-6">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(task.id)}
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive w-6 h-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            {/* Drag Handle - sutil, pode ser um ícone ou uma área específica */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {task.description && (
          <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs">
          <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
            {task.priority}
          </Badge>
          {task.due_date && (
            <span className="text-muted-foreground">
              {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para a Coluna Kanban (Droppable)
function KanbanColumn({ columnId, title, tasks, onEdit, onDelete, isAdmin }: { columnId: TaskStatus; title: string; tasks: Task[]; onEdit: (task: Task) => void; onDelete: (taskId: string) => void; isAdmin: boolean; }) {
  const { setNodeRef, isOver } = useSortable({ id: columnId, data: { type: 'COLUMN', columnId } }); // useSortable para compatibilidade com SortableContext das tasks, mas agindo como droppable

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "w-80 min-w-[320px] flex-shrink-0 h-full flex flex-col", // Garante que a coluna não encolha e tenha altura total
        isOver && "bg-primary/10 ring-2 ring-primary"
      )}
      style={{ maxHeight: 'calc(100vh - 200px)' }} // Exemplo de altura máxima, ajuste conforme necessário
    >
      <CardHeader className="pb-3 pt-4 px-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-0"> {/* Removido space-y-3 para controle mais fino com mb-3 no card */}
          <SortableContext items={tasks.map(t => t.id)} strategy={rectSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} isAdmin={isAdmin} />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <p className="py-4 text-sm text-center text-muted-foreground">Nenhuma tarefa aqui.</p>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}


export default function TasksPage() {
  const { user, userProfile } = useAuth(); // userProfile agora tem a role
  const isAdmin = userProfile?.role === 'admin';

  const { tasks: allTasks, isLoading: tasksLoading, error: tasksError } = useRealtimeTasks(user?.id);

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const updateTaskStatusOnlyMutation = useUpdateTaskStatusOnlyMutation();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // DND States
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Manter uma cópia local das tasks para manipulação otimista no DND
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (allTasks) {
      setBoardTasks(allTasks);
    }
  }, [allTasks]);


  const initialFormState: FormTaskState = {
    title: '',
    description: '',
    priority: 'Medium',
    due_date: '',
    related_lead_id: null,
    assigned_to_id: null,
  };
  const [formTask, setFormTask] = useState<FormTaskState>(initialFormState);

  // Fetch Leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!user?.id) { setLeads([]); setLeadsLoading(false); return; }
      setLeadsLoading(true);
      try {
        const { data, error } = await supabase.from('leads').select('*').eq('user_id', user.id);
        if (error) throw error;
        setLeads(data || []);
      } catch (error) { console.error('Erro ao buscar leads:', error); setLeads([]); }
      finally { setLeadsLoading(false); }
    };
    fetchLeads();
  }, [user?.id]);

  // Fetch Users (for assignee dropdown)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) { setAllUsers([]); setUsersLoading(false); return; } // Somente admin precisa da lista
      setUsersLoading(true);
      try {
        const { data, error } = await supabase.from('users').select('*'); // Busca todos os usuários
        if (error) throw error;
        setAllUsers(data as UserProfile[] || []);
      } catch (error) { console.error('Erro ao buscar usuários:', error); setAllUsers([]); }
      finally { setUsersLoading(false); }
    };
    fetchUsers();
  }, [isAdmin]);


  const handleOpenDialogForCreate = () => {
    if (!isAdmin) return;
    setEditingTask(null);
    // Se admin, pode atribuir a si mesmo por padrão ou deixar nulo
    const defaultAssignee = userProfile?.id || null;
    setFormTask({...initialFormState, assigned_to_id: isAdmin ? defaultAssignee : null });
    setDialogOpen(true);
  };

  const handleOpenDialogForEdit = (task: Task) => {
    if (!isAdmin) return; // Apenas admin pode editar
    setEditingTask(task);
    setFormTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority as FormTaskState['priority'],
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      related_lead_id: task.related_lead_id || null,
      assigned_to_id: task.assigned_to_id || null,
    });
    setDialogOpen(true);
  };

  const handleSubmitTaskForm = async () => {
    if (!user?.id || !isAdmin) return; // Segurança adicional

    const payload = {
      ...formTask,
      related_lead_id: formTask.related_lead_id || null,
      due_date: formTask.due_date || null,
      // assigned_to_id já está no formTask
    };

    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({ ...payload, id: editingTask.id });
      } else {
        // O status 'Backlog' e user_id são definidos no hook useCreateTaskMutation
        await createTaskMutation.mutateAsync(payload as Omit<Database['public']['Tables']['tasks']['Insert'], 'user_id' | 'status'>);
      }
      setDialogOpen(false);
      setEditingTask(null);
      // Não resetar formTask aqui, pois o DialogClose já faz isso
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      // Exibir toast/alert de erro (implementar com Sonner ou similar)
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteTaskMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
    }
  };

  const tasksByColumn = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = boardTasks.filter(task => task.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);
  }, [boardTasks]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = boardTasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeTask) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveATask = active.data.current?.type === 'TASK';
    const isOverAColumn = over.data.current?.type === 'COLUMN';
    const isOverATask = over.data.current?.type === 'TASK';

    if (!isActiveATask) return;

    // Arrastando uma tarefa sobre uma coluna
    if (isOverAColumn) {
      const overColumnId = over.data.current?.columnId as TaskStatus;
      if (activeTask.status !== overColumnId) {
        setBoardTasks(prev => prev.map(task =>
          task.id === activeId ? { ...task, status: overColumnId } : task
        ));
      }
    }

    // Arrastando uma tarefa sobre outra tarefa (para reordenar dentro da coluna)
    if (isOverATask) {
        const overTask = over.data.current?.task as Task;
        if (activeTask.status === overTask.status) { // Só reordena se estiverem na mesma coluna
            setBoardTasks(prev => {
                const activeIndex = prev.findIndex(t => t.id === activeId);
                const overIndex = prev.findIndex(t => t.id === overId);
                if (activeIndex !== overIndex) {
                    return arrayMove(prev, activeIndex, overIndex);
                }
                return prev;
            });
        } else { // Se estiverem em colunas diferentes, move para a coluna da tarefa "over"
            setBoardTasks(prev => {
                const tasksInNewColumn = prev.filter(t => t.status === overTask.status && t.id !== activeId);
                const overTaskIndexInItsColumn = tasksInNewColumn.findIndex(t => t.id === overId);

                const otherTasks = prev.filter(t => t.id !== activeId);
                const newTaskList = [...otherTasks];

                // Calcula o índice global para inserir na lista `newTaskList`
                let globalOverIndex = prev.findIndex(t => t.id === overId);

                // Ajuste para inserir antes ou depois do item 'over'
                // Esta lógica pode ser complexa, arrayMove é mais simples se os itens já estiverem na "mesma lista conceitual"
                // Para simplificar, vamos apenas mudar o status e deixar o handleDragEnd persistir.
                // A reordenação visual durante o drag over entre colunas diferentes é complexa.
                // Por ora, a mudança de status é o principal.
                 return prev.map(task =>
                    task.id === activeId ? { ...task, status: overTask.status! } : task
                );
            });
        }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !active.data.current || active.id === over.id && active.data.current?.type === 'TASK' && over.data.current?.type === 'TASK' && active.data.current.task.status === over.data.current.task.status) {
      // Se soltou no mesmo lugar sem mudança de coluna, ou se não é um "over" válido.
      // No entanto, se a ordem dentro da coluna mudou, precisamos persistir (se tivermos essa lógica).
      // Por agora, focamos na mudança de status.
      // Se a ordem mudou DENTRO da mesma coluna, a atualização de status não é necessária, mas a ordem sim (se for persistida).
      // O arrayMove no handleDragOver já atualiza o estado visual `boardTasks`.
      // Se a ordem for importante e persistida, aqui seria o lugar para uma mutação de "reorderTasks".
      // Como não temos essa mutação, a mudança de ordem é apenas visual e temporária.
      console.log("Drag ended, no status change or reorder persistence logic implemented for same column.");
      // Se a ordem mudou, `boardTasks` está atualizado. Se allTasks vier do server, ele será sobrescrito.
      // Para persistir a ordem, precisaríamos de um campo "order" ou similar na task.
      return;
    }

    const draggedTask = active.data.current.task as Task; // Tarefa que foi arrastada
    let newStatus: TaskStatus | null = null;

    if (over.data.current?.type === 'COLUMN') {
      newStatus = over.data.current.columnId as TaskStatus;
    } else if (over.data.current?.type === 'TASK') {
      newStatus = (over.data.current.task as Task).status;
    }

    if (newStatus && draggedTask.status !== newStatus) {
      try {
        console.log(`Updating task ${draggedTask.id} to status ${newStatus}`);
        await updateTaskStatusOnlyMutation.mutateAsync({
          taskId: draggedTask.id,
          status: newStatus,
        });
        // A invalidação da query pelo hook irá buscar os dados atualizados do servidor.
        // setBoardTasks já foi atualizado otimisticamente em handleDragOver.
        // Se houver falha, a query invalidada trará de volta o estado do servidor.
      } catch (error) {
        console.error('Falha ao atualizar status da tarefa via DND:', error);
        // Reverter a mudança otimista se a mutação falhar (opcional, mas bom UX)
        // Isso pode ser feito buscando `allTasks` novamente ou revertendo `boardTasks`
        // para o estado de `allTasks` antes da mudança otimista.
        // Por simplicidade, a invalidação da query no onSuccess/onError do hook já lida com isso.
      }
    } else {
       // Se o status não mudou, mas a ordem sim, boardTasks reflete a nova ordem visual.
       // Não há persistência de ordem neste exemplo.
    }
  };


  const resetFormAndCloseDialog = () => {
    setFormTask(initialFormState);
    setEditingTask(null);
    setDialogOpen(false);
  };

  const getPriorityBadgeVariant = (priority: string | null): BadgeProps["variant"] => {
    switch (priority) {
      case 'Low': return 'default';
      case 'Medium': return 'secondary';
      case 'High': return 'destructive';
      case 'Urgent': return 'destructive';
      default: return 'outline';
    }
  };


  if (tasksLoading || leadsLoading || (isAdmin && usersLoading)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-muted-foreground">Carregando dados...</p>
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
          <AlertDescription>{(tasksError as Error)?.message || 'Não foi possível carregar as tarefas.'}</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} // Ajuda com droppables dinâmicos/scroll
      >
        <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Quadro de Tarefas</h1>
            {isAdmin && (
              <Button size="sm" onClick={handleOpenDialogForCreate}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            )}
          </div>

          <ScrollArea className="flex-grow whitespace-nowrap">
            <div className="flex gap-6 pb-4 h-[calc(100vh-180px)]"> {/* Ajuste a altura conforme necessário */}
              <SortableContext items={KANBAN_COLUMNS.map(col => col.id)} strategy={rectSortingStrategy} > {/* Contexto para colunas, se fossem arrastáveis */}
                {KANBAN_COLUMNS.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    columnId={column.id}
                    title={column.title}
                    tasks={tasksByColumn[column.id] || []}
                    onEdit={handleOpenDialogForEdit}
                    onDelete={handleDeleteTask}
                    isAdmin={isAdmin}
                  />
                ))}
              </SortableContext>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <DragOverlay>
            {activeTask ? (
              <Card className="shadow-xl border-primary w-80"> {/* Estilo do card enquanto arrastado */}
                 <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-md leading-tight">{activeTask.title}</h3>
                    </div>
                    {activeTask.description && (
                      <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                        {activeTask.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant={getPriorityBadgeVariant(activeTask.priority)} className="text-xs">
                        {activeTask.priority}
                      </Badge>
                      {activeTask.due_date && (
                        <span className="text-muted-foreground">
                          {new Date(activeTask.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) resetFormAndCloseDialog();
            else setDialogOpen(true); // Garante que dialogOpen seja true se isOpen for true
          }}>
            {/* DialogTrigger é o botão "Nova Tarefa", já tratado acima */}
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
                <DialogDescription>
                  {editingTask ? 'Atualize os detalhes da tarefa.' : 'Preencha os detalhes para criar uma nova tarefa.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="title" className="text-right">Título</Label>
                  <Input id="title" value={formTask.title} onChange={(e) => setFormTask({ ...formTask, title: e.target.value })} className="col-span-3" required />
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="description" className="text-right">Descrição</Label>
                  <Textarea id="description" value={formTask.description} onChange={(e) => setFormTask({ ...formTask, description: e.target.value })} className="col-span-3" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select value={formTask.priority} onValueChange={(value) => setFormTask({ ...formTask, priority: value as FormTaskState['priority'] })}>
                      <SelectTrigger id="priority"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Baixa</SelectItem>
                        <SelectItem value="Medium">Média</SelectItem>
                        <SelectItem value="High">Alta</SelectItem>
                        <SelectItem value="Urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="due_date">Vencimento</Label>
                    <Input id="due_date" type="date" value={formTask.due_date} onChange={(e) => setFormTask({ ...formTask, due_date: e.target.value })} />
                  </div>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="assigned_to_id">Atribuído a</Label>
                    <Select
                        value={formTask.assigned_to_id || ''}
                        onValueChange={(value) => setFormTask({ ...formTask, assigned_to_id: value || null })}
                        disabled={!isAdmin || usersLoading}
                    >
                        <SelectTrigger id="assigned_to_id">
                            <SelectValue placeholder={usersLoading ? "Carregando usuários..." : "Ninguém"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Ninguém</SelectItem>
                            {allUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.username || u.id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="related_lead_id">Lead Relacionado</Label>
                  <Select
                    value={formTask.related_lead_id || ''}
                    onValueChange={(value) => setFormTask({ ...formTask, related_lead_id: value || null })}
                    disabled={leadsLoading}
                  >
                    <SelectTrigger id="related_lead_id">
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
                {/* O campo Status não é mais editável aqui, é definido pelo Backlog ou DND */}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={resetFormAndCloseDialog}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" onClick={handleSubmitTaskForm} disabled={createTaskMutation.isPending || updateTaskMutation.isPending || tasksLoading}>
                  {editingTask ? (updateTaskMutation.isPending ? 'Atualizando...' : 'Atualizar Tarefa') : (createTaskMutation.isPending ? 'Criando...' : 'Criar Tarefa')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DndContext>
    </AppLayout>
  );
}