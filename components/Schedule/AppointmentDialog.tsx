'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useUsers } from '@/hooks/useUsers';
import { useAppointmentMutations } from '@/hooks/useAppointmentMutations';
import { toast } from '@/hooks/use-toast';
import { useServices } from '@/hooks/useServices';
import { MultiTeacherSelector } from './MultiTeacherSelector';

// Zod schema for validation
const appointmentSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno."),
  teacherIds: z.array(z.string()).min(1, "Selecione pelo menos um professor."),
  serviceId: z.string().min(1, "Selecione um serviço."),
  date: z.string().min(1, "A data é obrigatória."),
  time: z.string().min(1, "A hora é obrigatória."),
  isRecurring: z.boolean(),
  recurringDays: z.array(z.string()).optional(),
});

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
  slot?: any;
}

// Memoize weekdays array to prevent unnecessary re-renders
const WEEKDAYS = [
  { value: 'SU', label: 'D' }, { value: 'MO', label: 'S' }, { value: 'TU', label: 'T' },
  { value: 'WE', label: 'Q' }, { value: 'TH', label: 'Q' }, { value: 'FR', label: 'S' }, { value: 'SA', label: 'S' },
] as const;

export default function AppointmentDialog({ isOpen, onClose, event, slot }: AppointmentDialogProps) {
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { studentId: '', teacherIds: [], serviceId: '', date: '', time: '', isRecurring: false, recurringDays: [] }
  });

  const isRecurring = watch('isRecurring');
  const { users: students, isLoading: isLoadingStudents } = useUsers('student');
  const { users: teachers, isLoading: isLoadingTeachers } = useUsers('teacher');
  const { services, isLoading: isLoadingServices } = useServices();
  const { createAppointment } = useAppointmentMutations();

  useEffect(() => {
    if (isOpen) {
      const initialData: any = { isRecurring: false, recurringDays: [] };
      if (event) {
        initialData.studentId = event.resource?.student_id || '';
        initialData.teacherId = event.resource?.teacher_id || '';
        initialData.serviceId = event.resource?.service_id || '';
        initialData.date = format(new Date(event.start), 'yyyy-MM-dd');
        initialData.time = format(new Date(event.start), 'HH:mm');
        initialData.isRecurring = event.resource?.type === 'recurring';
        // TODO: Add logic to parse rrule and set recurringDays
      } else if (slot) {
        initialData.date = format(new Date(slot.start), 'yyyy-MM-dd');
        initialData.time = format(new Date(slot.start), 'HH:mm');
      }
      reset(initialData);
    } else {
      reset({ studentId: '', teacherIds: [], serviceId: '', date: '', time: '', isRecurring: false, recurringDays: [] });
    }
  }, [isOpen, event, slot, reset]);

  const onSubmit = useCallback(async (data: z.infer<typeof appointmentSchema>) => {
    try {
      await createAppointment.mutateAsync(data);
      toast({ title: "Sucesso!", description: "Agendamento salvo com sucesso." });
      onClose();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar o agendamento.", variant: "destructive" });
    }
  }, [createAppointment, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {event ? '✏️ Editar Agendamento' : '📅 Novo Agendamento'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {event ? 'Atualize os detalhes do agendamento abaixo.' : 'Preencha os campos para criar um novo agendamento.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                👤 Aluno
              </Label>
              <Controller name="studentId" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isLoadingStudents && students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.studentId && (
                <p className="text-sm text-red-500 mt-1">{errors.studentId.message}</p>
              )}
            </div>

            {/* Teacher Selection */}
            <div className="space-y-2">
              <Controller name="teacherIds" control={control} render={({ field }) => (
                <MultiTeacherSelector
                  selectedTeacherIds={field.value}
                  onTeacherChange={field.onChange}
                  serviceId={watch('serviceId')}
                  date={watch('date')}
                  time={watch('time')}
                  error={errors.teacherIds?.message}
                />
              )} />
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="serviceId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                🛠️ Serviço
              </Label>
              <Controller name="serviceId" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isLoadingServices && services && services.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.serviceId && (
                <p className="text-sm text-red-500 mt-1">{errors.serviceId.message}</p>
              )}
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  📅 Data
                </Label>
                <Controller name="date" control={control} render={({ field }) => (
                  <Input 
                    id="date" 
                    type="date" 
                    className="w-full" 
                    {...field} 
                  />
                )} />
                {errors.date && (
                  <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ⏰ Hora
                </Label>
                <Controller name="time" control={control} render={({ field }) => (
                  <Input 
                    id="time" 
                    type="time" 
                    className="w-full" 
                    {...field} 
                  />
                )} />
                {errors.time && (
                  <p className="text-sm text-red-500 mt-1">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Recurring Checkbox */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Controller name="isRecurring" control={control} render={({ field }) => (
                <Checkbox 
                  id="recurring" 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  className="h-5 w-5" 
                />
              )} />
              <Label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                🔄 Agendamento Recorrente
              </Label>
            </div>

            {/* Recurring Days Selection */}
            {isRecurring && (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  📅 Dias da Semana
                </Label>
                <Controller name="recurringDays" control={control} render={({ field }) => (
                  <ToggleGroup 
                    type="multiple" 
                    variant="outline" 
                    className="grid grid-cols-7 gap-1" 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    {WEEKDAYS.map((day) => (
                      <ToggleGroupItem 
                        key={day.value} 
                        value={day.value} 
                        aria-label={day.label}
                        className="h-10 w-10 text-sm font-medium"
                      >
                        {day.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )} />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Selecione os dias da semana em que a aula se repetirá
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} className="px-6">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createAppointment.isPending}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {createAppointment.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </span>
              ) : (
                event ? '💾 Salvar Alterações' : '✨ Criar Agendamento'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
