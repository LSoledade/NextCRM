
'use client';

import { createClient } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RRule } from 'rrule';

// Interface para dados de agendamento
interface AppointmentData {
  isRecurring: boolean;
  recurringDays?: string[];
  studentId: string;
  teacherIds: string[]; // Mudança: agora suporta múltiplos professores
  serviceId: string;
  date: string;
  time: string;
  durationMinutes?: number;
}

// Hook para gerenciar as mutações de agendamentos
export function useAppointmentMutations() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Função para invalidar as queries do calendário e forçar a atualização
  const invalidateCalendarQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    queryClient.invalidateQueries({ queryKey: ['availableTeachers'] });
    queryClient.invalidateQueries({ queryKey: ['teacherAvailability'] });
  };

  // Mutação para criar um novo agendamento (avulso ou recorrente)
  const createAppointment = useMutation({
    mutationFn: async (appointmentData: AppointmentData) => {
      const { isRecurring, recurringDays, studentId, teacherIds, serviceId, date, time, durationMinutes = 60 } = appointmentData;

      const startTime = new Date(`${date}T${time}`);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      // Obter o user_id atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar disponibilidade de todos os professores
      for (const teacherId of teacherIds) {
        const { data: isAvailable, error: availabilityError } = await supabase.rpc('check_teacher_availability', {
          p_teacher_id: teacherId,
          p_start_time: startTime.toISOString(),
          p_end_time: endTime.toISOString()
        });

        if (availabilityError) {
          console.error('Erro ao verificar disponibilidade:', availabilityError);
          throw new Error('Erro ao verificar disponibilidade do professor');
        }

        if (!isAvailable) {
          throw new Error('Um ou mais professores não estão disponíveis no horário selecionado');
        }
      }

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

        // Criar sessão recorrente (mantendo compatibilidade com professor principal)
        const { data: recurringSession, error: recurringError } = await supabase
          .from('recurring_sessions')
          .insert({
            student_id: studentId,
            teacher_id: teacherIds[0], // Professor principal
            service_id: serviceId,
            start_date: startTime.toISOString(),
            end_date: endTime.toISOString(),
            rrule: rule.toString(),
            user_id: user.id
          })
          .select()
          .single();

        if (recurringError) throw recurringError;

        // Associar todos os professores à sessão recorrente
        const teacherAssociations = teacherIds.map((teacherId, index) => ({
          recurring_session_id: recurringSession.id,
          teacher_id: teacherId,
          is_primary: index === 0, // Primeiro professor é o principal
          user_id: user.id
        }));

        const { error: associationError } = await supabase
          .from('recurring_session_teachers')
          .insert(teacherAssociations);

        if (associationError) throw associationError;

        return recurringSession;
      } else {
        // Criar sessão única (mantendo compatibilidade com professor principal)
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            student_id: studentId,
            trainer_id: teacherIds[0], // Professor principal
            service_id: serviceId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'Scheduled',
            user_id: user.id
          })
          .select()
          .single();
        
        if (sessionError) throw sessionError;

        // Associar todos os professores à sessão
        const teacherAssociations = teacherIds.map((teacherId, index) => ({
          session_id: session.id,
          teacher_id: teacherId,
          is_primary: index === 0, // Primeiro professor é o principal
          user_id: user.id
        }));

        const { error: associationError } = await supabase
          .from('session_teachers')
          .insert(teacherAssociations);

        if (associationError) throw associationError;

        return session;
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
