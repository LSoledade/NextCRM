
'use client';

import { createClient } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RRule } from 'rrule';

// Hook para gerenciar as mutações de agendamentos
export function useAppointmentMutations() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Função para invalidar as queries do calendário e forçar a atualização
  const invalidateCalendarQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
  };

  // Mutação para criar um novo agendamento (avulso ou recorrente)
  const createAppointment = useMutation({
    mutationFn: async (appointmentData: any) => {
      const { isRecurring, recurringDays, studentId, teacherId, date, time } = appointmentData;

      const startTime = new Date(`${date}T${time}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Adiciona 1 hora por padrão

      // Obter o user_id atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (isRecurring && recurringDays && recurringDays.length > 0) {
        // Criar regra RRule para recorrência
        const rule = new RRule({
          freq: RRule.WEEKLY,
          byweekday: recurringDays.map((day: string) => {
            const dayMap: { [key: string]: any } = {
              'SU': RRule.SU, 'MO': RRule.MO, 'TU': RRule.TU, 'WE': RRule.WE,
              'TH': RRule.TH, 'FR': RRule.FR, 'SA': RRule.SA
            };
            return dayMap[day];
          }).filter(Boolean),
          dtstart: startTime,
        });

        const { data, error } = await supabase
          .from('recurring_sessions')
          .insert({
            student_id: studentId,
            teacher_id: teacherId,
            start_date: startTime.toISOString(),
            end_date: endTime.toISOString(),
            rrule: rule.toString(),
            user_id: user.id
          })
          .select();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('sessions')
          .insert({
            student_id: studentId,
            trainer_id: teacherId, // Note: usar trainer_id conforme a estrutura da tabela
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'Scheduled',
            user_id: user.id
          })
          .select();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries();
      // Adicionar notificação de sucesso (toast)
    },
    onError: (error) => {
      console.error("Erro ao criar agendamento:", error);
      // Adicionar notificação de erro (toast)
    },
  });

  // TODO: Implementar updateAppointment e deleteAppointment

  return { createAppointment };
}
