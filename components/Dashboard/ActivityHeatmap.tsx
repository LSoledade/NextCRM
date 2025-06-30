// components/Dashboard/ActivityHeatmap.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapData {
  day: string;
  hour: number;
  activity: number;
  leads: number;
  sessions: number;
}

interface ActivityHeatmapProps {
  className?: string;
}

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  // Gerar dados simulados de atividade por hora/dia
  const heatmapData = useMemo<HeatmapData[]>(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data: HeatmapData[] = [];
    
    days.forEach(day => {
      for (let hour = 6; hour <= 22; hour++) {
        // Simular mais atividade durante horários comerciais
        let baseActivity = 0;
        if (hour >= 8 && hour <= 18) {
          baseActivity = Math.floor(Math.random() * 15) + 5;
        } else if (hour >= 19 && hour <= 21) {
          baseActivity = Math.floor(Math.random() * 10) + 3;
        } else {
          baseActivity = Math.floor(Math.random() * 5) + 1;
        }
        
        // Menos atividade nos fins de semana
        if (day === 'Sáb' || day === 'Dom') {
          baseActivity = Math.floor(baseActivity * 0.6);
        }
        
        data.push({
          day,
          hour,
          activity: baseActivity,
          leads: Math.floor(baseActivity * 0.7),
          sessions: Math.floor(baseActivity * 0.3)
        });
      }
    });
    
    return data;
  }, []);

  // Encontrar valores máximo e mínimo para normalização
  const maxActivity = Math.max(...heatmapData.map(d => d.activity));
  const minActivity = Math.min(...heatmapData.map(d => d.activity));

  // Função para calcular a intensidade da cor
  const getIntensity = (activity: number) => {
    if (maxActivity === minActivity) return 0.5;
    return (activity - minActivity) / (maxActivity - minActivity);
  };

  // Função para obter a cor baseada na intensidade
  const getColor = (intensity: number) => {
    if (intensity < 0.2) return 'bg-gray-100 dark:bg-gray-800';
    if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-900';
    if (intensity < 0.6) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity < 0.8) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-blue-800 dark:bg-blue-400';
  };

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6h às 22h
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Mapa de Calor - Atividade por Horário
        </CardTitle>
        <CardDescription>
          Distribuição de atividades ao longo da semana
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Menos ativo</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900" />
                <div className="w-3 h-3 rounded bg-blue-400 dark:bg-blue-700" />
                <div className="w-3 h-3 rounded bg-blue-600 dark:bg-blue-500" />
                <div className="w-3 h-3 rounded bg-blue-800 dark:bg-blue-400" />
              </div>
              <span className="text-muted-foreground">Mais ativo</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Leads</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Sessões</span>
              </div>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header com horários */}
              <div className="flex">
                <div className="w-12" /> {/* Espaço para os dias */}
                {hours.map(hour => (
                  <div key={hour} className="w-8 text-xs text-center text-muted-foreground">
                    {hour}h
                  </div>
                ))}
              </div>

              {/* Grid do heatmap */}
              {days.map(day => (
                <div key={day} className="flex items-center mt-1">
                  <div className="w-12 text-xs text-right pr-2 text-muted-foreground">
                    {day}
                  </div>
                  {hours.map(hour => {
                    const cellData = heatmapData.find(d => d.day === day && d.hour === hour);
                    const intensity = cellData ? getIntensity(cellData.activity) : 0;
                    const colorClass = getColor(intensity);
                    
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={cn(
                          "w-8 h-8 mx-0.5 rounded-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-blue-400",
                          colorClass
                        )}
                        title={cellData ? 
                          `${day} ${hour}:00 - ${cellData.activity} atividades (${cellData.leads} leads, ${cellData.sessions} sessões)` : 
                          'Sem dados'
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas resumidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {heatmapData.reduce((sum, d) => sum + d.activity, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total de atividades</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {heatmapData.reduce((sum, d) => sum + d.leads, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total de leads</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {heatmapData.reduce((sum, d) => sum + d.sessions, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total de sessões</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">
                {Math.round(heatmapData.reduce((sum, d) => sum + d.activity, 0) / heatmapData.length * 10) / 10}
              </div>
              <div className="text-xs text-muted-foreground">Média por horário</div>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold">💡 Insights</h4>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Horário de Pico</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maior atividade entre 14h-16h durante a semana
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    Seg-Sex
                  </Badge>
                  <span className="text-sm font-medium">Dias Úteis</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  85% da atividade concentrada de segunda a sexta
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}