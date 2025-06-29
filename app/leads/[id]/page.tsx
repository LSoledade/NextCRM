'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
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
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Add,
  Assignment,
  Person,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tabValue, setTabValue] = useState(0);
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
    if (user && params.id) {
      loadLeadDetails();
    }
  }, [user, params.id]);

  const loadLeadDetails = async () => {
    if (!user || !params.id) return;

    try {
      // Carregar lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (leadError) {
        if (leadError.code === 'PGRST116') {
          setError('Lead não encontrado');
        } else {
          throw leadError;
        }
        return;
      }

      setLead(leadData);
      setEditForm({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || '',
        status: leadData.status,
        source: leadData.source || '',
      });

      // Carregar tarefas relacionadas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('related_lead_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setTasks(tasksData || []);

    } catch (error) {
      console.error('Erro ao carregar detalhes do lead:', error);
      setError('Erro ao carregar dados');
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
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks([data, ...tasks]);
      setTaskDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'Medium',
        due_date: '',
      });
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'primary';
      case 'Contacted': return 'info';
      case 'Converted': return 'success';
      case 'Lost': return 'error';
      default: return 'default';
    }
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

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error || !lead) {
    return (
      <AppLayout>
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/leads')}
            sx={{ mb: 2 }}
          >
            Voltar para Leads
          </Button>
          <Alert severity="error">
            {error || 'Lead não encontrado'}
          </Alert>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/leads')}
          sx={{ mb: 2 }}
        >
          Voltar para Leads
        </Button>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {lead.name}
            </Typography>
            <Chip
              label={lead.status}
              color={getStatusColor(lead.status) as any}
              sx={{ mr: 1 }}
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setEditDialogOpen(true)}
          >
            Editar Lead
          </Button>
        </Box>

        <Card variant="outlined">
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(event, newValue) => setTabValue(newValue)}
              aria-label="lead details tabs"
            >
              <Tab label="Informações" icon={<Person />} />
              <Tab label="Tarefas" icon={<Assignment />} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Dados de Contato
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={lead.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Telefone"
                      secondary={lead.phone || 'Não informado'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Origem"
                      secondary={lead.source || 'Não informada'}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Informações do Sistema
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={<Chip label={lead.status} color={getStatusColor(lead.status) as any} size="small" />}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Criado em"
                      secondary={new Date(lead.created_at).toLocaleString('pt-BR')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Última atualização"
                      secondary={new Date(lead.updated_at).toLocaleString('pt-BR')}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Tarefas Relacionadas
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setTaskDialogOpen(true)}
              >
                Nova Tarefa
              </Button>
            </Box>

            {tasks.length === 0 ? (
              <Typography color="text.secondary">
                Nenhuma tarefa encontrada para este lead.
              </Typography>
            ) : (
              <List>
                {tasks.map((task) => (
                  <ListItem key={task.id} divider>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {task.description}
                          </Typography>
                          <Box display="flex" gap={1} mt={1}>
                            <Chip
                              label={task.priority}
                              size="small"
                              color={getPriorityColor(task.priority) as any}
                            />
                            <Chip
                              label={task.status}
                              size="small"
                              variant="outlined"
                            />
                            {task.due_date && (
                              <Chip
                                label={new Date(task.due_date).toLocaleDateString('pt-BR')}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
        </Card>

        {/* Dialog para Editar Lead */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Nome"
                fullWidth
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <TextField
                label="Telefone"
                fullWidth
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editForm.status}
                  label="Status"
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                >
                  <MenuItem value="New">Novo</MenuItem>
                  <MenuItem value="Contacted">Contatado</MenuItem>
                  <MenuItem value="Converted">Convertido</MenuItem>
                  <MenuItem value="Lost">Perdido</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Origem"
                fullWidth
                value={editForm.source}
                onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateLead} variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para Nova Tarefa */}
        <Dialog
          open={taskDialogOpen}
          onClose={() => setTaskDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Nova Tarefa</DialogTitle>
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
              <TextField
                label="Data de Vencimento"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTaskDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask} variant="contained">
              Criar Tarefa
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}