'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Grid,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase';
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
      
      // Configurar realtime subscription
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
      // Carregar tarefas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Carregar leads para o select
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
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'success';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      case 'Urgent': return 'error';
      default: return 'default';
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Tarefas
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Nova Tarefa
          </Button>
        </Box>

        {/* Kanban Board */}
        <Grid container spacing={3}>
          {statusColumns.map((column) => (
            <Grid item xs={12} md={4} key={column.key}>
              <Card variant="outlined">
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Typography variant="h6">
                      {column.title}
                    </Typography>
                    <Chip
                      label={getTasksByStatus(column.key).length}
                      size="small"
                      sx={{ bgcolor: column.color, color: 'white' }}
                    />
                  </Box>
                  
                  <Stack spacing={2}>
                    {getTasksByStatus(column.key).map((task) => (
                      <Card key={task.id} variant="elevation" sx={{ cursor: 'pointer' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {task.title}
                            </Typography>
                            <Box display="flex" gap={0.5}>
                              <IconButton
                                size="small"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          
                          {task.description && (
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {task.description}
                            </Typography>
                          )}
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Chip
                              label={task.priority}
                              size="small"
                              color={getPriorityColor(task.priority) as any}
                            />
                            {task.due_date && (
                              <Typography variant="caption" color="text.secondary">
                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Botões para mudar status */}
                          <Box mt={1} display="flex" gap={1}>
                            {statusColumns
                              .filter(col => col.key !== task.status)
                              .map(col => (
                                <Button
                                  key={col.key}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleStatusChange(task.id, col.key as any)}
                                  sx={{ fontSize: '0.7rem', py: 0.5 }}
                                >
                                  → {col.title}
                                </Button>
                              ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Dialog para Criar/Editar Tarefa */}
        <Dialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingTask(null);
            resetForm();
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Título"
                fullWidth
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <TextField
                label="Descrição"
                multiline
                rows={3}
                fullWidth
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Prioridade</InputLabel>
                    <Select
                      value={newTask.priority}
                      label="Prioridade"
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    >
                      <MenuItem value="Low">Baixa</MenuItem>
                      <MenuItem value="Medium">Média</MenuItem>
                      <MenuItem value="High">Alta</MenuItem>
                      <MenuItem value="Urgent">Urgente</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={newTask.status}
                      label="Status"
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                    >
                      <MenuItem value="Todo">Para Fazer</MenuItem>
                      <MenuItem value="InProgress">Em Andamento</MenuItem>
                      <MenuItem value="Done">Concluído</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <TextField
                label="Data de Vencimento"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Lead Relacionado</InputLabel>
                <Select
                  value={newTask.related_lead_id}
                  label="Lead Relacionado"
                  onChange={(e) => setNewTask({ ...newTask, related_lead_id: e.target.value })}
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {leads.map((lead) => (
                    <MenuItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={editingTask ? handleUpdateTask : handleCreateTask}
              variant="contained"
            >
              {editingTask ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}