'use client';

import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface AvailableTeacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface TeacherAvailabilityCheck {
  teacherId: string;
  isAvailable: boolean;
  conflicts?: string[];
}

// Hook para verificar professores disponíveis para um horário específico
export function useAvailableTeachers(
  startTime: string | null,
  endTime: string | null,
  serviceId?: string
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['availableTeachers', startTime, endTime, serviceId],
    queryFn: async (): Promise<AvailableTeacher[]> => {
      if (!startTime || !endTime) return [];

      const { data, error } = await supabase.rpc('get_available_teachers', {
        p_start_time: startTime,
        p_end_time: endTime,
        p_service_id: serviceId || null,
      });

      if (error) {
        console.error('Erro ao buscar professores disponíveis:', error.message || error);
        throw error;
      }

      // Mapeia o retorno para a interface esperada, trocando trainer_id por id
      return (data || []).map((teacher: any) => ({
        id: teacher.trainer_id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
      }));
    },
    enabled: !!startTime && !!endTime,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Hook para verificar disponibilidade de um professor específico
export function useTeacherAvailabilityCheck(
  teacherId: string | null,
  startTime: string | null,
  endTime: string | null
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['teacherAvailability', teacherId, startTime, endTime],
    queryFn: async (): Promise<boolean> => {
      if (!teacherId || !startTime || !endTime) return false;

      const { data, error } = await supabase.rpc('check_teacher_availability', {
        p_trainer_id: teacherId,
        p_start_time: startTime,
        p_end_time: endTime,
      });

      if (error) {
        console.error('Erro ao verificar disponibilidade do professor:', error.message || error);
        throw error;
      }

      return data || false;
    },
    enabled: !!teacherId && !!startTime && !!endTime,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

// Interface para o resultado da query de teacher_services
interface TeacherServiceResult {
  teacher_id: string;
  trainers: {
    id: string;
    name: string;
    email: string;
  }[];
}

// Hook para obter professores que oferecem um serviço específico
export function useTeachersByService(serviceId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['teachersByService', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];

      const { data, error } = await supabase
        .from('teacher_services')
        .select(`
          teacher_id,
          trainers!inner(
            id,
            name,
            email
          )
        `)
        .eq('service_id', serviceId);

      if (error) {
        console.error('Erro ao buscar professores por serviço:', error.message || error);
        throw error;
      }

      const typedData = data as TeacherServiceResult[];
      return typedData?.map(item => ({
        id: item.trainers[0].id,
        full_name: item.trainers[0].name,
        email: item.trainers[0].email
      })) || [];
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// Função utilitária para calcular horário de fim baseado na duração do serviço
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toISOString();
}

// Função utilitária para formatar data e hora para o formato ISO
export function formatDateTimeToISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}