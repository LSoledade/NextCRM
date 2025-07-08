'use client';

import React from 'react';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { RRule } from 'rrule';
import { startOfYear, endOfYear } from 'date-fns';

// Definição dos tipos de eventos para clareza
interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    type: 'session' | 'absence' | 'holiday' | 'recurring';
    [key: string]: any;
  };
}

const fetchCalendarEvents = async (currentDate: Date, supabase: any) => {
  const viewStartDate = startOfYear(currentDate);
  const viewEndDate = endOfYear(currentDate);

  const fetchHolidays = async (year: number) => {
    const { data, error } = await supabase
      .from('holidays')
      .select('name, date')
      .gte('date', startOfYear(new Date(year, 0, 1)).toISOString())
      .lte('date', endOfYear(new Date(year, 11, 31)).toISOString());
    if (error) {
      console.error('Erro ao buscar feriados:', error);
      return [];
    }
    return data.map((h: any) => ({
      title: h.name,
      start: new Date(h.date),
      end: new Date(h.date),
      allDay: true,
      resource: { type: 'holiday' },
    }));
  };

  const [sessionsRes, recurringRes, absencesRes, holidaysRes] = await Promise.all([
    supabase.from('sessions').select(`
      *,
      student:students!inner(id, leads!inner(name)),
      teacher:trainers!inner(id, name),
      service:services(id, name)
    `),
    supabase.from('recurring_sessions').select(`
      *,
      student:students!inner(id, leads!inner(name)),
      teacher:trainers!inner(id, name),
      service:services(id, name)
    `),
    supabase.from('teacher_absences').select(`
      *,
      teacher:trainers!inner(id, name)
    `),
    fetchHolidays(currentDate.getFullYear())
  ]);

  const singleSessions: CalendarEvent[] = (sessionsRes.data || []).map((s: any) => ({
    title: `Aula: ${s.student.leads.name} com ${s.teacher.name}`,
    start: new Date(s.start_time),
    end: new Date(s.end_time),
    allDay: false,
    resource: { type: 'session', ...s },
  }));

  const absences: CalendarEvent[] = (absencesRes.data || []).map((a: any) => ({
    title: `Ausência: ${a.teacher.name}`,
    start: new Date(a.start_date),
    end: new Date(a.end_date),
    allDay: true,
    resource: { type: 'absence', ...a },
  }));

  const recurringEvents: CalendarEvent[] = (recurringRes.data || []).flatMap((r: any) => {
    const rule = new RRule({
      ...RRule.parseString(r.rrule),
      dtstart: new Date(r.start_date),
    });
    const occurrences = rule.between(viewStartDate, viewEndDate);
    return occurrences.map((occurrence: Date) => {
      const start = new Date(occurrence);
      start.setHours(new Date(r.start_date).getHours(), new Date(r.start_date).getMinutes());
      const end = new Date(start);
      const duration = (new Date(r.end_date).getTime() - new Date(r.start_date).getTime());
      end.setTime(end.getTime() + duration);
      return {
        title: `Recorrente: ${r.student.leads.name} com ${r.teacher.name}`,
        start,
        end,
        allDay: false,
        resource: { type: 'recurring', ...r },
      };
    });
  });

  return [...singleSessions, ...recurringEvents, ...absences, ...holidaysRes];
};

// Hook para buscar e processar todos os eventos do calendário
export function useCalendarEvents(currentDate: Date) {
  const supabase = createClient();
  
  // Memoize the query key to avoid unnecessary re-renders
  const queryKey = React.useMemo(() => [
    'calendarEvents', 
    currentDate.getFullYear(), 
    currentDate.getMonth()
  ], [currentDate]);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey,
    queryFn: () => fetchCalendarEvents(currentDate, supabase),
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
  });

  return { events, isLoading };
}
