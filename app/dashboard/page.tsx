'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ClipboardList,
  CalendarDays,
  GraduationCap,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];

// Componente KPI Card
function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'positive',
  iconClassName 
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconClassName?: string;
}) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("w-5 h-5 text-muted-foreground", iconClassName)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {change && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Badge
              variant={changeType === 'positive' ? 'default' : changeType === 'negative' ? 'destructive' : 'secondary'}
              className="text-xs px-1.5 py-0.5"
            >
              {changeType === 'positive' ? '↗' : changeType === 'negative' ? '↘' : '→'} {change}
            </Badge>
            <span>vs. último mês</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Widget de Boas-vindas
function GreetingWidget() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <Card className="text-white bg-gradient-to-r from-primary to-red-500">
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

// Widget de Tarefas de Hoje
function TodayTasksWidget({ todayTasks }: { todayTasks: Task[] }) {
  const getPriorityVariant = (priority: string) => {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Tarefas de Hoje</CardTitle>
        <ClipboardList className="w-5 h-5 text-primary" />
      </CardHeader>
      <CardContent>
        {todayTasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhuma tarefa para hoje 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {todayTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="p-3 rounded-md bg-muted/50">
                <h4 className="mb-1 font-semibold text-sm">{task.title}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate max-w-[70%]">
                    {task.description}
                  </p>
                  <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
            {todayTasks.length > 3 && (
              <p className="text-xs text-center text-muted-foreground">
                +{todayTasks.length - 3} mais tarefas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Gráfico de Status dos Leads
function LeadStatusChart({ stats }: { stats: any }) {
  const chartData = Object.entries(stats.leadsByStatus).map(([status, count]) => ({
    status,
    count: count as number,
    label: status === 'New' ? 'Novos' : 
           status === 'Contacted' ? 'Contatados' : 
           status === 'Converted' ? 'Convertidos' : 'Perdidos',
  }));

  const chartConfig = {
    New: { label: "Novos", color: "hsl(var(--chart-1))" },
    Contacted: { label: "Contatados", color: "hsl(var(--chart-2))" },
    Converted: { label: "Convertidos", color: "hsl(var(--chart-3))" },
    Lost: { label: "Perdidos", color: "hsl(var(--chart-4))" },
  } satisfies ChartConfig;

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          Status dos Leads
        </CardTitle>
        <CardDescription>
          Distribuição dos leads por status atual
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Gráfico de Origem dos Leads
function LeadSourceChart({ stats }: { stats: any }) {
  const chartData = Object.entries(stats.leadsBySource)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([source, count]) => ({
      source,
      count: count as number,
    }));

  const chartConfig = {
    count: { label: "Leads", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Origem dos Leads
        </CardTitle>
        <CardDescription>
          Principais fontes de aquisição
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="source" 
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--chart-1))" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Gráfico de Tendência de Conversão
function ConversionTrendChart() {
  const chartData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const leads = Math.floor(Math.random() * 10) + 5;
      const conversions = Math.floor(Math.random() * 3) + 1;
      
      return {
        day: date.getDate(),
        leads,
        conversions,
      };
    });
  }, []);

  const chartConfig = {
    leads: { label: "Leads", color: "hsl(var(--chart-1))" },
    conversions: { label: "Conversões", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Tendência de Conversão
        </CardTitle>
        <CardDescription>
          Performance dos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="day"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="leads"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="conversions"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Gráfico Radial de Performance
function PerformanceRadialChart({ stats }: { stats: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Performance Geral
        </CardTitle>
        <CardDescription>
          Taxa de conversão atual
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[200px]">
          <RadialBarChart
            data={[{ value: stats.conversionRate }]}
            startAngle={90}
            endAngle={-270}
            innerRadius={40}
            outerRadius={80}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill="hsl(var(--chart-1))"
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-2xl font-bold fill-foreground"
            >
              {stats.conversionRate}%
            </text>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function DashboardPage() {
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
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !stats) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error?.message || 'Não foi possível carregar os dados do dashboard.'}
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-6 md:p-6">
        {/* Header Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GreetingWidget />
          </div>
          <div>
            <TodayTasksWidget todayTasks={todayTasks} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total de Leads"
            value={stats.totalLeads}
            icon={Users}
            change="+5%"
            iconClassName="text-blue-500"
          />
          <KpiCard
            title="Total de Alunos"
            value={stats.totalStudents}
            icon={GraduationCap}
            change="+10%"
            iconClassName="text-green-500"
          />
          <KpiCard
            title="Taxa de Conversão"
            value={`${stats.conversionRate}%`}
            icon={TrendingUp}
            change="+3%"
            iconClassName="text-amber-500"
          />
          <KpiCard
            title="Sessões por Aluno"
            value={stats.sessionsPerStudent}
            icon={Dumbbell}
            change="+8%"
            iconClassName="text-orange-500"
          />
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <LeadStatusChart stats={stats} />
              <LeadSourceChart stats={stats} />
            </div>
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <PerformanceRadialChart stats={stats} />
              </div>
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Métricas Principais</CardTitle>
                    <CardDescription>Resumo das atividades</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium">Sessões Agendadas</span>
                        </div>
                        <span className="text-lg font-bold">{stats.totalActiveSessions}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-medium">Sessões Realizadas</span>
                        </div>
                        <span className="text-lg font-bold">{stats.totalCompletedSessions}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <ClipboardList className="w-5 h-5 text-purple-500" />
                          <span className="text-sm font-medium">Tarefas Pendentes</span>
                        </div>
                        <span className="text-lg font-bold">{stats.pendingTasks}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-pink-500" />
                          <span className="text-sm font-medium">Leads Novos (30d)</span>
                        </div>
                        <span className="text-lg font-bold">{stats.newLeads}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ConversionTrendChart />
              <Card>
                <CardHeader>
                  <CardTitle>Metas do Mês</CardTitle>
                  <CardDescription>Progresso atual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Leads (Meta: 100)</span>
                      <span>{stats.newLeads}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((stats.newLeads / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Conversões (Meta: 25)</span>
                      <span>{stats.convertedLeads}/25</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((stats.convertedLeads / 25) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Sessões (Meta: 200)</span>
                      <span>{stats.totalCompletedSessions}/200</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((stats.totalCompletedSessions / 200) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ConversionTrendChart />
              <Card>
                <CardHeader>
                  <CardTitle>Projeções</CardTitle>
                  <CardDescription>Estimativas para os próximos 30 dias</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Novos Leads</h4>
                    <p className="text-2xl font-bold text-blue-600">{Math.round(stats.newLeads * 1.2)}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Baseado na tendência atual (+20%)</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Conversões Estimadas</h4>
                    <p className="text-2xl font-bold text-green-600">{Math.round(stats.convertedLeads * 1.15)}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Projeção otimista (+15%)</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Receita Projetada</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {(stats.convertedLeads * 350 * 1.15).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Baseado em R$ 350/aluno</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}