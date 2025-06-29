'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Assignment,
  Event,
  School,
  FitnessCenter,
  CheckCircle,
  NewReleases,
  Campaign,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];
type Student = Database['public']['Tables']['students']['Row'];

interface DashboardStats {
  totalLeads: number;
  totalStudents: number;
  totalActiveSessions: number;
  totalCompletedSessions: number;
  newLeads: number;
  convertedLeads: number;
  pendingTasks: number;
  completedTasks: number;
  todaySessions: number;
  conversionRate: number;
  sessionsPerStudent: number;
  leadsBySource: Record<string, number>;
  leadsByStatus: Record<string, number>;
}

// Componente para Cards de KPI
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconColor: string;
  iconBgColor: string;
}

function KpiCard({ title, value, icon, change, changeType = 'positive', iconColor, iconBgColor }: KpiCardProps) {
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2.5,
              backgroundColor: iconBgColor,
              color: iconColor,
            }}
          >
            {icon}
          </Box>
        </Box>
        
        <Typography variant="h4" fontWeight="bold" color="text.primary" mb={1}>
          {value}
        </Typography>
        
        {change && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Chip
              label={change}
              size="small"
              color={changeType === 'positive' ? 'success' : changeType === 'negative' ? 'error' : 'default'}
              sx={{ 
                fontSize: '0.75rem',
                height: 20,
                '& .MuiChip-label': { px: 1 }
              }}
            />
            <Typography variant="caption" color="text.secondary">
              vs. último mês
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de Saudação
function GreetingWidget() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
    } else if (hour < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }
  }, []);

  const userName = user?.email?.split('@')[0] || 'Usuário';

  return (
    <Card variant="outlined" sx={{ height: '100%', background: 'linear-gradient(135deg, #E9342E 0%, #FF6B61 100%)' }}>
      <CardContent sx={{ p: 3, color: 'white' }}>
        <Typography variant="h5" fontWeight="bold" mb={1}>
          {greeting}, {userName}! 👋
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Bem-vindo ao seu painel de controle. Aqui você pode acompanhar o desempenho do seu negócio.
        </Typography>
      </CardContent>
    </Card>
  );
}

// Componente de Tarefas de Hoje
function TodayTasksWidget({ todayTasks }: { todayTasks: Task[] }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="600">
            Tarefas de Hoje
          </Typography>
          <Assignment color="primary" />
        </Box>
        
        {todayTasks.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Nenhuma tarefa para hoje 🎉
          </Typography>
        ) : (
          <Box>
            {todayTasks.slice(0, 3).map((task) => (
              <Box key={task.id} mb={2} p={2} sx={{ backgroundColor: 'grey.50', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="600" mb={0.5}>
                  {task.title}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {task.description?.substring(0, 50)}...
                  </Typography>
                  <Chip 
                    label={task.priority} 
                    size="small" 
                    color={task.priority === 'High' || task.priority === 'Urgent' ? 'error' : 'warning'}
                  />
                </Box>
              </Box>
            ))}
            
            {todayTasks.length > 3 && (
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
                +{todayTasks.length - 3} mais tarefas
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Carregar todos os dados em paralelo
      const [
        { data: leads, error: leadsError },
        { data: tasks, error: tasksError },
        { data: sessions, error: sessionsError },
        { data: students, error: studentsError }
      ] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('students').select('*').eq('user_id', user.id)
      ]);

      if (leadsError) throw leadsError;
      if (tasksError) throw tasksError;
      if (sessionsError) throw sessionsError;
      if (studentsError) throw studentsError;

      // Calcular estatísticas
      const today = new Date().toISOString().split('T')[0];
      
      const totalLeads = leads?.length || 0;
      const totalStudents = students?.length || 0;
      const newLeads = leads?.filter(lead => lead.status === 'New').length || 0;
      const convertedLeads = leads?.filter(lead => lead.status === 'Converted').length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
      
      const pendingTasks = tasks?.filter(task => task.status !== 'Done').length || 0;
      const completedTasks = tasks?.filter(task => task.status === 'Done').length || 0;
      
      const activeSessions = sessions?.filter(session => 
        session.status === 'Scheduled' || session.status === 'InProgress'
      ).length || 0;
      
      const completedSessions = sessions?.filter(session => 
        session.status === 'Completed'
      ).length || 0;
      
      const todaySessionsCount = sessions?.filter(session => 
        session.start_time.startsWith(today)
      ).length || 0;
      
      const sessionsPerStudent = totalStudents > 0 ? 
        Math.round((sessions?.length || 0) / totalStudents * 10) / 10 : 0;

      // Agrupar leads por origem
      const leadsBySource: Record<string, number> = {};
      leads?.forEach(lead => {
        const source = lead.source || 'Sem origem';
        leadsBySource[source] = (leadsBySource[source] || 0) + 1;
      });

      // Agrupar leads por status
      const leadsByStatus: Record<string, number> = {};
      leads?.forEach(lead => {
        leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
      });

      // Tarefas de hoje
      const todayTasksList = tasks?.filter(task => 
        task.due_date && 
        task.due_date.startsWith(today) && 
        task.status !== 'Done'
      ).sort((a, b) => 
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      ) || [];

      setStats({
        totalLeads,
        totalStudents,
        totalActiveSessions: activeSessions,
        totalCompletedSessions: completedSessions,
        newLeads,
        convertedLeads,
        pendingTasks,
        completedTasks,
        todaySessions: todaySessionsCount,
        conversionRate,
        sessionsPerStudent,
        leadsBySource,
        leadsByStatus,
      });

      setTodayTasks(todayTasksList);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Carregando dashboard...
            </Typography>
          </Box>
        </Box>
      </AppLayout>
    );
  }

  if (error || !stats) {
    return (
      <AppLayout>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Erro ao carregar dados do dashboard'}
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ space: 3 }}>
        {/* Widget de Saudação */}
        <Box mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <GreetingWidget />
            </Grid>
            <Grid item xs={12} md={4}>
              <TodayTasksWidget todayTasks={todayTasks} />
            </Grid>
          </Grid>
        </Box>

        {/* KPI Cards - Primeira Linha */}
        <Box mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Total de Leads"
                value={stats.totalLeads}
                icon={<People />}
                change="+5%"
                iconColor="#E9342E"
                iconBgColor="rgba(233, 52, 46, 0.1)"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Total de Alunos"
                value={stats.totalStudents}
                icon={<School />}
                change="+10%"
                iconColor="#4CAF50"
                iconBgColor="rgba(76, 175, 80, 0.1)"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Taxa de Conversão"
                value={`${stats.conversionRate}%`}
                icon={<TrendingUp />}
                change="+3%"
                iconColor="#FF9800"
                iconBgColor="rgba(255, 152, 0, 0.1)"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Sessões por Aluno"
                value={stats.sessionsPerStudent}
                icon={<FitnessCenter />}
                change="+8%"
                iconColor="#FF9334"
                iconBgColor="rgba(255, 147, 52, 0.1)"
              />
            </Grid>
          </Grid>
        </Box>

        {/* KPI Cards - Segunda Linha */}
        <Box mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Sessões Agendadas"
                value={stats.totalActiveSessions}
                icon={<Event />}
                change="+12%"
                iconColor="#2196F3"
                iconBgColor="rgba(33, 150, 243, 0.1)"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Sessões Realizadas"
                value={stats.totalCompletedSessions}
                icon={<CheckCircle />}
                change="+15%"
                iconColor="#009688"
                iconBgColor="rgba(0, 150, 136, 0.1)"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Tarefas Pendentes"
                value={stats.pendingTasks}
                icon={<Assignment />}
                change="-2%"
                changeType="negative"
                iconColor="#9C27B0"
                iconBgColor="rgba(156, 39, 176, 0.1)"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Leads Novos (30d)"
                value={stats.newLeads}
                icon={<NewReleases />}
                change="+18%"
                iconColor="#E91E63"
                iconBgColor="rgba(233, 30, 99, 0.1)"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Seção de Gráficos */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: 320 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Status dos Leads
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                  {Object.entries(stats.leadsByStatus).map(([status, count]) => (
                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: 
                              status === 'New' ? '#2196F3' :
                              status === 'Contacted' ? '#FF9800' :
                              status === 'Converted' ? '#4CAF50' : '#F44336'
                          }}
                        />
                        <Typography variant="body2">{status}</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="600">{count}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: 320 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Origem dos Leads
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                  {Object.entries(stats.leadsBySource).slice(0, 5).map(([source, count]) => (
                    <Box key={source} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {source}
                      </Typography>
                      <Typography variant="h6" fontWeight="600">{count}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}