'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAvailableTeachers, useTeachersByService } from '@/hooks/useTeacherAvailability';
import { formatDateTimeToISO, calculateEndTime } from '@/hooks/useTeacherAvailability';
import { useServices } from '@/hooks/useServices';

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface MultiTeacherSelectorProps {
  selectedTeacherIds: string[];
  onTeacherChange: (teacherIds: string[]) => void;
  serviceId?: string;
  date?: string;
  time?: string;
  disabled?: boolean;
  error?: string;
}

export function MultiTeacherSelector({
  selectedTeacherIds,
  onTeacherChange,
  serviceId,
  date,
  time,
  disabled = false,
  error
}: MultiTeacherSelectorProps) {
  const [showAvailabilityCheck, setShowAvailabilityCheck] = useState(false);
  
  // Buscar duração do serviço
  const { services } = useServices();
  const selectedService = services?.find(s => s.id === serviceId);
  const durationMinutes = selectedService?.duration_minutes || 60;
  
  // Calcular horários para verificação de disponibilidade
  const startTime = date && time ? formatDateTimeToISO(date, time) : null;
  const endTime = startTime ? calculateEndTime(startTime, durationMinutes) : null;
  
  // Buscar professores que oferecem o serviço
  const { data: serviceTeachers = [], isLoading: isLoadingServiceTeachers } = useTeachersByService(serviceId || null);
  
  // Buscar professores disponíveis no horário
  const { 
    data: availableTeachers = [], 
    isLoading: isLoadingAvailability,
    refetch: refetchAvailability 
  } = useAvailableTeachers(
    startTime,
    endTime,
    serviceId
  );
  
  // Determinar quais professores mostrar
  const teachersToShow = showAvailabilityCheck && startTime && endTime 
    ? availableTeachers?.map(at => ({
        id: at.id,
        full_name: at.name,
        email: at.email
      })) || []
    : serviceTeachers || [];
  
  // Verificar status de disponibilidade para professores selecionados
  const getTeacherStatus = (teacherId: string) => {
    if (!showAvailabilityCheck || !startTime || !endTime) return 'unknown';
    
    const isAvailable = availableTeachers?.some(at => at.id === teacherId) || false;
    return isAvailable ? 'available' : 'unavailable';
  };
  
  const handleTeacherToggle = (teacherId: string) => {
    if (disabled) return;
    
    const newSelection = selectedTeacherIds?.includes(teacherId)
      ? selectedTeacherIds.filter(id => id !== teacherId)
      : [...(selectedTeacherIds || []), teacherId];
    
    onTeacherChange(newSelection);
  };
  
  const handleAvailabilityToggle = () => {
    setShowAvailabilityCheck(!showAvailabilityCheck);
    if (!showAvailabilityCheck && startTime && endTime) {
      refetchAvailability();
    }
  };
  
  const isLoading = isLoadingServiceTeachers || (showAvailabilityCheck && isLoadingAvailability);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Professores
        </Label>
        
        {date && time && serviceId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAvailabilityToggle}
            disabled={disabled}
            className="text-xs"
          >
            {showAvailabilityCheck ? (
              <>Mostrar Todos</>
            ) : (
              <>Verificar Disponibilidade</>
            )}
          </Button>
        )}
      </div>
      
      {showAvailabilityCheck && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Mostrando apenas professores disponíveis para {date} às {time}
            {selectedService && ` (${selectedService.name} - ${durationMinutes}min)`}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-gray-600">
                {showAvailabilityCheck ? 'Verificando disponibilidade...' : 'Carregando professores...'}
              </span>
            </div>
          ) : teachersToShow.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showAvailabilityCheck 
                ? 'Nenhum professor disponível neste horário'
                : serviceId 
                  ? 'Nenhum professor oferece este serviço'
                  : 'Selecione um serviço primeiro'
              }
            </div>
          ) : (
            <div className="space-y-3">
              {teachersToShow.map((teacher) => {
                const isSelected = selectedTeacherIds?.includes(teacher.id) || false;
                const status = getTeacherStatus(teacher.id);
                
                return (
                  <div
                    key={teacher.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      disabled 
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${
                      isSelected 
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => handleTeacherToggle(teacher.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {teacher.full_name}
                        </p>
                        
                        {showAvailabilityCheck && (
                          <div className="flex-shrink-0">
                            {status === 'available' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Disponível
                              </Badge>
                            )}
                            {status === 'unavailable' && isSelected && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Indisponível
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {teacher.email}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedTeacherIds?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 self-center">
            Selecionados ({selectedTeacherIds?.length || 0}):
          </span>
          {selectedTeacherIds?.map((teacherId) => {
            const teacher = teachersToShow?.find(t => t.id === teacherId) || 
                           serviceTeachers?.find(t => t.id === teacherId);
            const status = getTeacherStatus(teacherId);
            
            return (
              <Badge
                key={teacherId}
                variant={status === 'unavailable' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {teacher?.full_name || 'Professor'}
                {status === 'unavailable' && showAvailabilityCheck && (
                  <AlertTriangle className="h-3 w-3 ml-1" />
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}