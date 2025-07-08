'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { format, startOfDay, endOfDay, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ScheduleStats() {
  const { events, isLoading } = useCalendarEvents(new Date());

  const stats = useMemo(() => {
    if (isLoading || !events) {
      return [
        { title: "Hoje", value: 0, description: "0 aulas agendadas", icon: "📅", color: "bg-blue-500" },
        { title: "Amanhã", value: 0, description: "0 aulas agendadas", icon: "⏰", color: "bg-green-500" },
        { title: "Esta Semana", value: 0, description: "0 aulas nos próximos 7 dias", icon: "📊", color: "bg-purple-500" },
        { title: "Recorrentes", value: 0, description: "0 aulas recorrentes", icon: "🔄", color: "bg-orange-500" }
      ];
    }

    const today = new Date();
    const todayEvents = events.filter(event => 
      !event.allDay && isToday(new Date(event.start))
    );
    
    const tomorrowEvents = events.filter(event => 
      !event.allDay && isTomorrow(new Date(event.start))
    );

    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      const weekEnd = addDays(today, 7);
      return !event.allDay && eventDate >= today && eventDate <= weekEnd;
    });

    const recurringCount = events.filter(event => 
      event.resource?.type === 'recurring'
    ).length;

    return [
      {
        title: "Hoje",
        value: todayEvents.length,
        description: `${todayEvents.length} aula${todayEvents.length !== 1 ? 's' : ''} agendada${todayEvents.length !== 1 ? 's' : ''}`,
        icon: "📅",
        color: "bg-blue-500"
      },
      {
        title: "Amanhã",
        value: tomorrowEvents.length,
        description: `${tomorrowEvents.length} aula${tomorrowEvents.length !== 1 ? 's' : ''} agendada${tomorrowEvents.length !== 1 ? 's' : ''}`,
        icon: "⏰",
        color: "bg-green-500"
      },
      {
        title: "Esta Semana",
        value: weekEvents.length,
        description: `${weekEvents.length} aula${weekEvents.length !== 1 ? 's' : ''} nos próximos 7 dias`,
        icon: "📊",
        color: "bg-purple-500"
      },
      {
        title: "Recorrentes",
        value: recurringCount,
        description: `${recurringCount} aula${recurringCount !== 1 ? 's' : ''} recorrente${recurringCount !== 1 ? 's' : ''}`,
        icon: "🔄",
        color: "bg-orange-500"
      }
    ];
  }, [events, isLoading]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={`skeleton-${i}`} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={`stat-${stat.title}`} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="text-lg">{stat.icon}</span>
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stat.description}
                </p>
              </div>
              <div className={`w-2 h-12 ${stat.color} rounded-full opacity-20`}></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
