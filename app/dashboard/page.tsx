'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  Calendar,
  GraduationCap,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  Star,
  Zap,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];

// Componente KPI Card Refatorado
function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'positive',
  iconClassName,
  description,
  trend,
  onClick
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconClassName?: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable' | number[];
  onClick?: () => void;
}) {
  const isClickable = !!onClick;
  
  const getTrendIcon = () => {
    if (changeType === 'positive') return <ArrowUpRight className="w-3 h-3" />;
    if (changeType === 'negative') return <ArrowDownRight className="w-3 h-3" />;
    return null;
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-emerald-600 dark:text-emerald-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "border-border/50 bg-gradient-to-br from-card to-card/50",
        isClickable && "cursor-pointer hover:border-primary/20"
      )}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02]" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 relative">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground/70">{description}</p>
          )}
        </div>
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300",
          "bg-primary/10 group-hover:bg-primary/15 group-hover:scale-110",
          iconClassName
        )}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
            {value}
          </div>
          {trend && (
            <div className="w-16 h-8 opacity-30 group-hover:opacity-50 transition-opacity">
              {/* Mini trend chart placeholder */}
              <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40 rounded" />
            </div>
          )}
        </div>
        
        {change && (
          <div className="flex items-center gap-2 mt-3">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              "bg-background/50 border transition-all duration-200",
              getChangeColor()
            )}>
              {getTrendIcon()}
              <span>{change}</span>
            </div>
            <span className="text-xs text-muted-foreground">vs. período anterior</span>
          </div>
        )}
      </CardContent>
      
      {/* Hover effect overlay */}
      {isClickable && (
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </Card>
  );
}

// Widget de Boas-vindas Refatorado
function GreetingWidget({ stats }: { stats: any }) {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      if (hour < 12) setGreeting('Bom dia');
      else if (hour < 18) setGreeting('Boa tarde');
      else setGreeting('Boa noite');
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  const firstName = userName.split(' ')[0];

  // Quick stats for the greeting card
  const quickStats = [
    { label: 'Leads hoje', value: stats?.newLeadsToday || 0, icon: Users },
    { label: 'Tarefas pendentes', value: stats?.pendingTasks || 0, icon: ClipboardList },
    { label: 'Próxima sessão', value: '14:30', icon: Clock },
  ];

  return (
    <Card className={cn(
      "relative overflow-hidden border-0 bg-gradient-to-br",
      "from-primary/5 via-primary/3 to-background",
      "shadow-lg shadow-primary/5"
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-full translate-y-12 -translate-x-12" />
      
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-2xl" aria-label="Mão acenando">👋</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {greeting}, {firstName}!
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentTime.toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>
            
            <p className="text-muted-foreground max-w-md">
              Aqui está um resumo do seu dia. Continue o ótimo trabalho! 🚀
            </p>
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            Ver tudo
          </Button>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center p-3 rounded-lg bg-background/50 border border-border/50">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-lg font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Widget de Tarefas de Hoje Refatorado
function TodayTasksWidget({ todayTasks }: { todayTasks: Task[] }) {
  const [showAll, setShowAll] = useState(false);
  
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Urgent':
        return { 
          variant: 'destructive' as const, 
          icon: AlertTriangle, 
          color: 'text-red-500',
          bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        };
      case 'Medium':
        return { 
          variant: 'secondary' as const, 
          icon: Clock, 
          color: 'text-amber-500',
          bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: CheckCircle2, 
          color: 'text-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
        };
    }
  };

  const displayTasks = showAll ? todayTasks : todayTasks.slice(0, 3);
  const completedTasks = todayTasks.filter(task => task.status === 'Concluidas').length;
  const progressPercentage = todayTasks.length > 0 ? (completedTasks / todayTasks.length) * 100 : 0;
  
  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Tarefas de Hoje
            </CardTitle>
            <CardDescription>
              {todayTasks.length > 0 ? (
                <span>{completedTasks} de {todayTasks.length} concluídas</span>
              ) : (
                'Nenhuma tarefa agendada'
              )}
            </CardDescription>
          </div>
          {todayTasks.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-muted-foreground">completo</div>
            </div>
          )}
        </div>
        
        {todayTasks.length > 0 && (
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {todayTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium text-foreground mb-2">Tudo limpo! 🎉</h3>
            <p className="text-sm text-muted-foreground">
              Você não tem tarefas para hoje.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => {
              const priorityConfig = getPriorityConfig(task.priority);
              const PriorityIcon = priorityConfig.icon;
              
              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200 hover:shadow-sm",
                    priorityConfig.bg,
                    task.status === 'Concluidas' && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-md",
                      task.status === 'Concluidas' ? 'bg-green-100 dark:bg-green-950/20' : 'bg-background/50'
                    )}>
                      {task.status === 'Concluidas' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <PriorityIcon className={cn("w-4 h-4", priorityConfig.color)} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "font-medium text-sm mb-1",
                        task.status === 'Concluidas' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={priorityConfig.variant} className="text-xs px-2 py-0.5">
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {todayTasks.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-3"
              >
                {showAll ? 'Ver menos' : `Ver mais ${todayTasks.length - 3} tarefas`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Gráfico de Status dos Leads Refatorado
function LeadStatusChart({ stats }: { stats: any }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
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
  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Status dos Leads
            </CardTitle>
            <CardDescription>
              Total de {total} leads no funil
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{total}</div>
            <div className="text-xs text-muted-foreground">leads</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico */}
          <div className="flex justify-center">
            <ChartContainer config={chartConfig} className="h-[250px] w-[250px]">
              <PieChart>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [
                    `${value} leads (${((value / total) * 100).toFixed(1)}%)`,
                    'Quantidade'
                  ]}
                />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke={activeIndex === index ? '#fff' : 'none'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
          
          {/* Legenda */}
          <div className="space-y-3">
            {chartData.map((entry, index) => {
              const percentage = ((entry.count / total) * 100).toFixed(1);
              const color = COLORS[index % COLORS.length];
              
              return (
                <div 
                  key={entry.status}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm",
                    activeIndex === index ? 'bg-muted/50 border-primary/50' : 'hover:bg-muted/30'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-sm">{entry.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{entry.count}</div>
                    <div className="text-xs text-muted-foreground">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Gráfico de Origem dos Leads Refatorado
function LeadSourceChart({ stats }: { stats: any }) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  
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
  
  const COLORS = {
    'Website': '#3b82f6',
    'Redes Sociais': '#8b5cf6',
    'Indicação': '#10b981',
    'Google Ads': '#f59e0b',
    'Facebook Ads': '#1877f2',
    'WhatsApp': '#25d366',
    'Email': '#ef4444',
    'Outros': '#6b7280'
  };
  
  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  const maxValue = Math.max(...chartData.map(item => item.count));

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Origem dos Leads
            </CardTitle>
            <CardDescription>
              Distribuição por canal de aquisição
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{total}</div>
            <div className="text-xs text-muted-foreground">total</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Gráfico de Barras Horizontal */}
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const percentage = ((item.count / total) * 100).toFixed(1);
              const barWidth = (item.count / maxValue) * 100;
              const color = COLORS[item.source as keyof typeof COLORS] || '#6b7280';
              
              return (
                <div 
                  key={item.source}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                    hoveredBar === item.source ? 'bg-muted/50 border-primary/50 shadow-sm' : 'hover:bg-muted/30'
                  )}
                  onMouseEnter={() => setHoveredBar(item.source)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-sm">{item.source}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm">{item.count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {chartData.length}
              </div>
              <div className="text-xs text-muted-foreground">Canais Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {chartData[0]?.source || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Melhor Canal</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {Math.round(total / chartData.length)}
              </div>
              <div className="text-xs text-muted-foreground">Média/Canal</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Gráfico de Tendência de Conversão Refatorado
function ConversionTrendChart({ stats }: { stats: any }) {
  const [selectedMetric, setSelectedMetric] = useState<'both' | 'conversions' | 'leads'>('both');
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | '24m'>('6m');
  
  // Gerar dados baseados nas estatísticas reais
  const generateTrendData = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const currentLeads = stats.totalLeads;
    const currentConversions = stats.convertedLeads;
    
    return months.map((month, index) => {
      // Simular variação mensal baseada nos dados reais
      const variation = 0.8 + (Math.random() * 0.4); // Variação de 80% a 120%
      const monthLeads = Math.round((currentLeads / 6) * variation);
      const monthConversions = Math.round((currentConversions / 6) * variation);
      const rate = monthLeads > 0 ? (monthConversions / monthLeads) * 100 : 0;
      
      return {
        month,
        conversions: monthConversions,
        leads: monthLeads,
        rate: Number(rate.toFixed(1))
      };
    });
  };
  
  const chartData = generateTrendData();

  const chartConfig = {
    conversions: {
      label: "Conversões",
      color: "hsl(var(--chart-1))",
    },
    leads: {
      label: "Leads",
      color: "hsl(var(--chart-2))",
    },
    rate: {
      label: "Taxa (%)",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  const totalConversions = chartData.reduce((sum, item) => sum + item.conversions, 0);
  const totalLeads = chartData.reduce((sum, item) => sum + item.leads, 0);
  const avgRate = (totalConversions / totalLeads * 100).toFixed(1);
  const lastMonth = chartData[chartData.length - 1];
  const prevMonth = chartData[chartData.length - 2];
  const rateChange = lastMonth.rate - prevMonth.rate;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Tendência de Conversão
            </CardTitle>
            <CardDescription>
              Evolução mensal de leads e conversões
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '6m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('6m')}
            >
              6M
            </Button>
            <Button
              variant={timeRange === '12m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('12m')}
            >
              12M
            </Button>
          </div>
        </div>
        
        {/* Métricas Resumidas */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-primary">{totalLeads}</div>
            <div className="text-xs text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-primary">{totalConversions}</div>
            <div className="text-xs text-muted-foreground">Conversões</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1">
              <div className="text-2xl font-bold text-primary">{avgRate}%</div>
              {rateChange > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">Taxa Média</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Controles de Visualização */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Exibir:</span>
            <Button
              variant={selectedMetric === 'both' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric('both')}
            >
              Ambos
            </Button>
            <Button
              variant={selectedMetric === 'leads' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric('leads')}
            >
              Leads
            </Button>
            <Button
              variant={selectedMetric === 'conversions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric('conversions')}
            >
              Conversões
            </Button>
          </div>
          
          {/* Gráfico */}
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(value) => `Mês: ${value}`}
              />
              
              {(selectedMetric === 'both' || selectedMetric === 'leads') && (
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: "hsl(var(--chart-2))", strokeWidth: 2 }}
                />
              )}
              
              {(selectedMetric === 'both' || selectedMetric === 'conversions') && (
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: "hsl(var(--chart-1))", strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ChartContainer>
          
          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-medium text-sm">Melhor Mês</span>
              </div>
              <div className="text-lg font-semibold">
                {chartData.reduce((best, current) => 
                  current.rate > best.rate ? current : best
                ).month}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.max(...chartData.map(d => d.rate)).toFixed(1)}% de conversão
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">Tendência</span>
              </div>
              <div className="text-lg font-semibold">
                {rateChange > 0 ? 'Crescimento' : 'Declínio'}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.abs(rateChange).toFixed(1)}% vs mês anterior
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Gráfico Radial de Performance Refatorado
function PerformanceRadialChart({ stats }: { stats: any }) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');
  
  // Calcular métricas baseadas nos dados reais
  const conversionRate = stats.conversionRate || 0;
  
  // Calcular engajamento baseado na relação sessões/alunos
  const engagementRate = stats.totalStudents > 0 ? 
    Math.min(100, (stats.sessionsPerStudent / 5) * 100) : 0;
  
  // Calcular satisfação baseada na taxa de conversão e sessões completadas
  const satisfactionRate = stats.totalActiveSessions + stats.totalCompletedSessions > 0 ? 
    Math.min(100, (stats.totalCompletedSessions / (stats.totalActiveSessions + stats.totalCompletedSessions)) * 100 + 20) : 75;
  
  // Calcular retenção baseada na proporção de tarefas completadas
  const retentionRate = stats.pendingTasks + stats.completedTasks > 0 ? 
    Math.min(100, (stats.completedTasks / (stats.pendingTasks + stats.completedTasks)) * 100) : 80;
  
  const performanceData = [
    { 
      name: 'Conversão', 
      value: conversionRate, 
      target: 35,
      color: 'hsl(var(--chart-1))',
      icon: Target,
      description: 'Leads → Alunos'
    },
    { 
      name: 'Engajamento', 
      value: engagementRate, 
      target: 80,
      color: 'hsl(var(--chart-2))',
      icon: Zap,
      description: 'Interação ativa'
    },
    { 
      name: 'Satisfação', 
      value: satisfactionRate, 
      target: 90,
      color: 'hsl(var(--chart-3))',
      icon: Star,
      description: 'Avaliação média'
    },
    { 
      name: 'Retenção', 
      value: retentionRate, 
      target: 85,
      color: 'hsl(var(--chart-4))',
      icon: RefreshCw,
      description: 'Permanência'
    }
  ];

  const chartConfig = {
    value: {
      label: "Performance",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const overallScore = performanceData.reduce((sum, item) => sum + (item.value / item.target * 100), 0) / performanceData.length;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Performance Geral
            </CardTitle>
            <CardDescription>
              Indicadores principais de desempenho
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={selectedPeriod === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('today')}
            >
              Hoje
            </Button>
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('week')}
            >
              Semana
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
            >
              Mês
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Score Geral */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <ChartContainer config={chartConfig} className="h-[160px] w-[160px]">
                <RadialBarChart 
                  data={[{ value: overallScore }]} 
                  innerRadius={50} 
                  outerRadius={70}
                  startAngle={90}
                  endAngle={450}
                >
                  <RadialBar 
                    dataKey="value" 
                    cornerRadius={10}
                    fill="hsl(var(--chart-1))"
                    className="drop-shadow-sm"
                  />
                </RadialBarChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-primary">
                  {overallScore.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  Score Geral
                </div>
              </div>
            </div>
          </div>
          
          {/* Métricas Detalhadas */}
          <div className="grid grid-cols-2 gap-3">
            {performanceData.map((metric, index) => {
              const IconComponent = metric.icon;
              const percentage = (metric.value / metric.target * 100);
              const isAboveTarget = metric.value >= metric.target;
              
              return (
                <div 
                  key={metric.name}
                  className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="p-1.5 rounded-md"
                      style={{ backgroundColor: `${metric.color}20` }}
                    >
                      <IconComponent 
                        className="w-3.5 h-3.5" 
                        style={{ color: metric.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{metric.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {metric.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">
                        {metric.value.toFixed(1)}%
                      </span>
                      <div className="flex items-center gap-1">
                        {isAboveTarget ? (
                          <ArrowUpRight className="w-3 h-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          Meta: {metric.target}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div 
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: metric.color
                          }}
                        />
                      </div>
                      {percentage > 100 && (
                        <div className="absolute -top-1 right-0">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Insights */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Insights</span>
            </div>
            <div className="space-y-2">
              {overallScore >= 90 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Performance excelente! Continue assim.
                </div>
              )}
              {overallScore >= 70 && overallScore < 90 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Boa performance, mas há espaço para melhorias.
                </div>
              )}
              {overallScore < 70 && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Performance abaixo do esperado. Revisar estratégias.
                </div>
              )}
              
              {performanceData.some(m => m.value < m.target) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Foque nos indicadores abaixo da meta.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function DashboardPage() {
  const router = useRouter();
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
      <div className="space-y-8">
        {/* Cabeçalho Refatorado */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <GreetingWidget stats={stats} />
          </div>
          <div className="xl:col-span-1">
            <TodayTasksWidget todayTasks={todayTasks} />
          </div>
        </div>

        {/* KPIs Refatorados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total de Leads"
            value={stats.totalLeads}
            icon={Users}
            description="Leads captados este mês"
            trend="up"
            onClick={() => router.push('/leads')}
          />
          <KpiCard
            title="Alunos Ativos"
            value={stats.totalStudents}
            icon={GraduationCap}
            description="Estudantes matriculados"
            trend="up"
            onClick={() => router.push('/students')}
          />
          <KpiCard
            title="Taxa de Conversão"
            value={`${stats.conversionRate}%`}
            icon={TrendingUp}
            description="Leads convertidos em alunos"
            trend={stats.conversionRate > 25 ? "up" : "down"}
          />
          <KpiCard
            title="Sessões/Aluno"
            value={stats.sessionsPerStudent}
            icon={Calendar}
            description="Média de sessões por aluno"
            trend="stable"
            onClick={() => router.push('/schedule')}
          />
        </div>

        {/* Seção de Alertas e Notificações */}
        {(todayTasks.length > 5 || stats.conversionRate < 20) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayTasks.length > 5 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  Muitas tarefas pendentes
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  Você tem {todayTasks.length} tarefas para hoje. Considere priorizar as mais importantes.
                </AlertDescription>
              </Alert>
            )}
            {stats.conversionRate < 20 && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800 dark:text-red-200">
                  Taxa de conversão baixa
                </AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  Sua taxa de conversão está em {stats.conversionRate}%. Revise sua estratégia de vendas.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Gráficos e Análises */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-3 w-fit">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tendências
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <LeadStatusChart stats={stats} />
              <LeadSourceChart stats={stats} />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <PerformanceRadialChart stats={stats} />
              </div>
              
              <Card className="h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Resumo Executivo
                  </CardTitle>
                  <CardDescription>
                    Principais métricas do período
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Sessões Agendadas</span>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {stats.totalActiveSessions}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Sessões Realizadas</span>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {stats.totalCompletedSessions}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">Tarefas Pendentes</span>
                      </div>
                      <Badge variant={todayTasks.length > 5 ? "destructive" : "secondary"} className="font-semibold">
                        {todayTasks.length}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Novos Leads (30d)</span>
                      </div>
                      <Badge variant="default" className="font-semibold">
                        {stats.newLeads}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Relatório Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ConversionTrendChart stats={stats} />
              
              <Card className="h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Metas do Mês
                  </CardTitle>
                  <CardDescription>
                    Acompanhe o progresso das suas metas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Leads Captados</span>
                        <span className="text-sm font-semibold">{stats.newLeads}/100</span>
                      </div>
                      <Progress value={(stats.newLeads / 100) * 100} className="h-3" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Meta: 100 leads</span>
                        <span>{((stats.newLeads / 100) * 100).toFixed(0)}% concluído</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Conversões</span>
                        <span className="text-sm font-semibold">{stats.convertedLeads}/25</span>
                      </div>
                      <Progress value={(stats.convertedLeads / 25) * 100} className="h-3" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Meta: 25 conversões</span>
                        <span>{((stats.convertedLeads / 25) * 100).toFixed(0)}% concluído</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sessões Realizadas</span>
                        <span className="text-sm font-semibold">{stats.totalCompletedSessions}/200</span>
                      </div>
                      <Progress value={(stats.totalCompletedSessions / 200) * 100} className="h-3" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Meta: 200 sessões</span>
                        <span>{((stats.totalCompletedSessions / 200) * 100).toFixed(0)}% concluído</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {Math.max(0, Math.min(3, Math.floor((stats.newLeads / 100 + stats.convertedLeads / 25 + stats.totalCompletedSessions / 200) / 3 * 3)))}
                        </div>
                        <div className="text-xs text-muted-foreground">Metas Atingidas</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-primary">
                          {(((stats.newLeads / 100 + stats.convertedLeads / 25 + stats.totalCompletedSessions / 200) / 3) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Performance Geral</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ConversionTrendChart stats={stats} />
              
              <Card className="h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Projeções e Insights
                  </CardTitle>
                  <CardDescription>
                    Estimativas baseadas na performance atual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div>
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Novos Leads (30d)</span>
                        <div className="text-xs text-blue-700 dark:text-blue-300">Projeção otimista</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          ~{Math.round(stats.newLeads * 1.2)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">+20% estimado</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border border-green-200 dark:border-green-800">
                      <div>
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">Conversões Estimadas</span>
                        <div className="text-xs text-green-700 dark:text-green-300">Baseado na tendência</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          ~{Math.round(stats.convertedLeads * 1.15)}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">+15% estimado</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div>
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Receita Projetada</span>
                        <div className="text-xs text-purple-700 dark:text-purple-300">R$ 350 por aluno</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          R$ {(stats.convertedLeads * 350 * 1.15).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">Próximos 30 dias</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-muted-foreground">
                          Tendência de crescimento positiva
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm text-muted-foreground">
                          Pico de conversões esperado em 2 semanas
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm text-muted-foreground">
                          Revisar estratégia de retenção
                        </span>
                      </div>
                    </div>
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