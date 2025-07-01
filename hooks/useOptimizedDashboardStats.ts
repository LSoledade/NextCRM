// hooks/useOptimizedDashboardStats.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];
type Student = Database['public']['Tables']['students']['Row'];

export interface DashboardStats {
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

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export const useOptimizedDashboardStats = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const fetchDashboardData = async <T extends 'leads' | 'tasks' | 'sessions' | 'students'>(
    table: T
  ): Promise<Database['public']['Tables'][T]['Row'][]> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error(`Erro ao buscar dados da tabela ${table}:`, error);
      throw error;
    }
    return data || [];
  };

  const { data: leads, isLoading: isLoadingLeads, error: leadsError } = useQuery<Lead[]>({
    queryKey: ['dashboardLeads', userId],
    queryFn: () => fetchDashboardData('leads'),
    enabled: !!userId,
    staleTime: FIVE_MINUTES_IN_MS,
  });

  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['dashboardTasks', userId],
    queryFn: () => fetchDashboardData('tasks'),
    enabled: !!userId,
    staleTime: FIVE_MINUTES_IN_MS,
  });

  const { data: sessions, isLoading: isLoadingSessions, error: sessionsError } = useQuery<Session[]>({
    queryKey: ['dashboardSessions', userId],
    queryFn: () => fetchDashboardData('sessions'),
    enabled: !!userId,
    staleTime: FIVE_MINUTES_IN_MS,
  });

  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useQuery<Student[]>({
    queryKey: ['dashboardStudents', userId],
    queryFn: () => fetchDashboardData('students'),
    enabled: !!userId,
    staleTime: FIVE_MINUTES_IN_MS,
  });

  const overallLoading = isLoadingLeads || isLoadingTasks || isLoadingSessions || isLoadingStudents;
  const overallError = leadsError || tasksError || sessionsError || studentsError;

  const calculatedStats = useMemo<DashboardStats | null>(() => {
    if (overallLoading || overallError || !leads || !tasks || !sessions || !students) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const totalLeads = leads.length;
    const totalStudents = students.length;
    const newLeadsCount = leads.filter(lead => lead.status === 'New').length;
    const convertedLeads = leads.filter(lead => lead.status === 'Converted').length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const pendingTasks = tasks.filter(task => task.status !== 'Concluidas').length;
    const completedTasks = tasks.filter(task => task.status === 'Concluidas').length;
    const activeSessions = sessions.filter(session =>
      session.status === 'Scheduled' || session.status === 'InProgress'
    ).length;
    const completedSessions = sessions.filter(session =>
      session.status === 'Completed'
    ).length;
    const todaySessionsCount = sessions.filter(session =>
      session.start_time && session.start_time.startsWith(today)
    ).length;
    const sessionsPerStudent = totalStudents > 0 ?
      Math.round((sessions.length / totalStudents) * 10) / 10 : 0;

    const leadsBySource: Record<string, number> = {};
    leads.forEach(lead => {
      const source = lead.source || 'Sem origem';
      leadsBySource[source] = (leadsBySource[source] || 0) + 1;
    });

    const leadsByStatus: Record<string, number> = {};
    leads.forEach(lead => {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
    });

    return {
      totalLeads,
      totalStudents,
      totalActiveSessions: activeSessions,
      totalCompletedSessions: completedSessions,
      newLeads: newLeadsCount,
      convertedLeads,
      pendingTasks,
      completedTasks,
      todaySessions: todaySessionsCount,
      conversionRate,
      sessionsPerStudent,
      leadsBySource,
      leadsByStatus,
    };
  }, [leads, tasks, sessions, students, overallLoading, overallError]);

  const todayTasksList = useMemo<Task[]>(() => {
    if (overallLoading || overallError || !tasks) {
        return [];
    }
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task =>
      task.due_date &&
      task.due_date.startsWith(today) &&
      task.status !== 'Concluidas'
    ).sort((a, b) => {
      if (!a.due_date || !b.due_date) return 0;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [tasks, overallLoading, overallError]);


  return {
    stats: calculatedStats,
    todayTasks: todayTasksList,
    isLoading: overallLoading,
    error: overallError ? (overallError as Error) : null, // Cast to Error type
  };
};
