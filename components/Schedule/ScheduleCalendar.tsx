'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../styles/calendar-custom.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import AppointmentDialog from './AppointmentDialog';
import { Skeleton } from '@/components/ui/skeleton';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), // Inicia a semana no Domingo
  getDay,
  locales,
});

export default function ScheduleCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { events, isLoading } = useCalendarEvents(currentDate);
  
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedEvent(event);
    setSelectedSlot(null);
    setDialogOpen(true);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    setSelectedEvent(null);
    setSelectedSlot(slotInfo);
    setDialogOpen(true);
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);
  
  const eventStyleGetter = useCallback((event: any) => {
    const baseStyle = {
      backgroundColor: '#3174ad',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '12px',
      padding: '2px 4px'
    };

    switch (event.resource?.type) {
      case 'holiday':
        return { style: { ...baseStyle, backgroundColor: '#ef4444' } }; // Vermelho moderno
      case 'absence':
        return { style: { ...baseStyle, backgroundColor: '#f97316' } }; // Laranja moderno
      case 'recurring':
        return { style: { ...baseStyle, backgroundColor: '#22c55e' } }; // Verde moderno
      case 'session':
        return { style: { ...baseStyle, backgroundColor: '#3b82f6' } }; // Azul moderno
      default:
        return { style: baseStyle };
    }
  }, []);

  const calendarMessages = useMemo(() => ({
    next: 'Próximo',
    previous: 'Anterior',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Nenhum evento neste período.',
    showMore: (total: number) => `+ Ver mais (${total})`
  }), []);

  const calendarViews = useMemo(() => [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA], []);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Área do calendário com padding interno */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650, fontFamily: 'inherit' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onNavigate={handleNavigate}
            selectable
            popup
            messages={calendarMessages}
            culture="pt-BR"
            defaultView={Views.MONTH}
            views={calendarViews}
            className="rbc-calendar-custom"
          />
        </div>
        
        {/* Legenda dos tipos de eventos */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Aulas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Recorrentes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Ausências</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Feriados</span>
          </div>
        </div>
      </div>
      
      <AppointmentDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent}
        slot={selectedSlot}
      />
    </div>
  );
}
