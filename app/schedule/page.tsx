'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import ScheduleCalendar from '@/components/Schedule/ScheduleCalendar';
import ScheduleStats from '@/components/Schedule/ScheduleStats';
import AppointmentDialog from '@/components/Schedule/AppointmentDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function SchedulePage() {
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Estatísticas rápidas */}
        <ScheduleStats />
        
        {/* Calendário principal */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  📅 Agenda de Aulas e Serviços
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Gerencie agendamentos, visualize disponibilidade e organize sessões de treino
                </CardDescription>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 sm:flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScheduleCalendar />
          </CardContent>
        </Card>
        
        {/* Dialog para criar/editar agendamentos */}
        <AppointmentDialog
          isOpen={isDialogOpen}
          onClose={() => setDialogOpen(false)}
          event={null}
          slot={null}
        />
      </div>
    </AppLayout>
  );
}
