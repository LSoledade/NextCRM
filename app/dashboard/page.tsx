'use client';

import React, { useState, useEffect } from 'react'; // useEffect e useState ainda são usados em GreetingWidget
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert as ShadAlert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  ClipboardList,
  CalendarDays,
  GraduationCap,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  Megaphone,
  AlertTriangle,
} from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedDashboardStats, DashboardStats } from '@/hooks/useOptimizedDashboardStats';

// Tipos como Lead, Session, Student não são mais necessários diretamente aqui
// O tipo DashboardStats é importado do hook.
type Task = Database['public']['Tables']['tasks']['Row']; // Task ainda é necessário para TodayTasksWidget
// Certifique-se que Database está importado se Task depende dele, ou defina Task de forma mais genérica se possível.
// Para este exemplo, vamos assumir que Task pode ser usado como está ou que Database está disponível globalmente/implicitamente.
// Se Database for realmente necessário para o tipo Task, ele precisaria ser importado:
import { Database } from '@/types/database';


interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconClassName?: string;
}

function KpiCard({ title, value, icon, change, changeType = 'positive', iconClassName }: KpiCardProps) {
  const IconComponent = icon;
  return (
    <Card className="h-full transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {React.cloneElement(IconComponent, { className: cn("w-5 h-5 text-muted-foreground", iconClassName) })}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {change && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Badge
              variant={changeType === 'positive' ? 'default' : changeType === 'negative' ? 'destructive' : 'secondary'}
              className={cn(
                "text-xs px-1.5 py-0.5",
                changeType === 'positive' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                changeType === 'negative' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
              )}
            >
              {change}
            </Badge>
            <span>vs. último mês</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <Card className="h-full text-white bg-gradient-to-r from-primary to-red-500">
      <CardContent className="p-6">
        <h2 className="mb-1 text-2xl font-bold">
          {greeting}, {userName}! 👋
        </h2>
        <p className="opacity-90">
          Bem-vindo ao seu painel de controle. Aqui você pode acompanhar o desempenho do seu negócio.
        </p>
      </CardContent>
    </Card>
  );
}

function TodayTasksWidget({ todayTasks }: { todayTasks: Task[] }) {
  const getPriorityBadgeVariant = (priority: string): BadgeProps["variant"] => {
    switch (priority) {
      case 'High':
      case 'Urgent':
        return 'destructive';
      case 'Medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Tarefas de Hoje</CardTitle>
        <ClipboardList className="w-5 h-5 text-primary" />
      </CardHeader>
      <CardContent className="pt-0">
        {todayTasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhuma tarefa para hoje 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {todayTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="p-3 rounded-md bg-muted/50">
                <h4 className="mb-0.5 font-semibold text-sm">{task.title}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate max-w-[70%]">
                    {task.description}
                  </p>
                  <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
            {todayTasks.length > 3 && (
              <p className="mt-1 text-xs text-center text-muted-foreground">
                +{todayTasks.length - 3} mais tarefas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth(); // Mantido para GreetingWidget, que tem seu próprio useEffect e useState
  const {
    stats,
    todayTasks,
    isLoading: loading,
    error
  } = useOptimizedDashboardStats();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !stats) { // Adicionado !stats para cobrir o caso de erro sem mensagem ou stats nulo
    return (
      <AppLayout>
        <ShadAlert variant="destructive" className="m-4">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error?.message || 'Não foi possível carregar os dados do dashboard.'}</AlertDescription>
        </ShadAlert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-6 md:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GreetingWidget /> {/* user de useAuth() é usado aqui dentro */}
          </div>
          <div>
            <TodayTasksWidget todayTasks={todayTasks} />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total de Leads"
            value={stats.totalLeads}
            icon={<Users />}
            change="+5%" // Estes valores de 'change' são mockados, idealmente viriam de um cálculo
            iconClassName="text-primary"
          />
          <KpiCard
            title="Total de Alunos"
            value={stats.totalStudents}
            icon={<GraduationCap />}
            change="+10%"
            iconClassName="text-green-500"
          />
          <KpiCard
            title="Taxa de Conversão"
            value={`${stats.conversionRate}%`}
            icon={<TrendingUp />}
            change="+3%"
            iconClassName="text-amber-500"
          />
          <KpiCard
            title="Sessões por Aluno"
            value={stats.sessionsPerStudent}
            icon={<Dumbbell />}
            change="+8%"
            iconClassName="text-orange-500"
          />
          <KpiCard
            title="Sessões Agendadas"
            value={stats.totalActiveSessions}
            icon={<CalendarDays />}
            change="+12%"
            iconClassName="text-blue-500"
          />
          <KpiCard
            title="Sessões Realizadas"
            value={stats.totalCompletedSessions}
            icon={<CheckCircle2 />}
            change="+15%"
            iconClassName="text-teal-500"
          />
          <KpiCard
            title="Tarefas Pendentes"
            value={stats.pendingTasks}
            icon={<ClipboardList />}
            change="-2%"
            changeType="negative"
            iconClassName="text-purple-500"
          />
          <KpiCard
            title="Leads Novos (30d)" // Assumindo que 'newLeads' se refere a este período
            value={stats.newLeads}
            icon={<Sparkles />}
            change="+18%"
            iconClassName="text-pink-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Leads</CardTitle>
              <CardDescription>Distribuição dos leads por status atual.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pl-2">
              <div className="space-y-3">
                {Object.entries(stats.leadsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-3 w-3 rounded-full",
                          status === 'New' ? 'bg-blue-500' :
                          status === 'Contacted' ? 'bg-amber-500' :
                          status === 'Converted' ? 'bg-green-500' :
                          status === 'Lost' ? 'bg-red-500' : 'bg-gray-400'
                        )}
                      />
                      <span className="text-sm text-muted-foreground">{status}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Origem dos Leads</CardTitle>
              <CardDescription>Principais fontes de aquisição de leads.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pl-2">
              <div className="space-y-3">
                {Object.entries(stats.leadsBySource).slice(0, 5).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm truncate text-muted-foreground max-w-[70%]">{source}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}