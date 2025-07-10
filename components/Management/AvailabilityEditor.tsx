'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, Clock, Calendar, AlertCircle, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Availability, Blockout } from '@/types/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const daysOfWeek = [
  { id: 'monday', label: 'Segunda', short: 'SEG' },
  { id: 'tuesday', label: 'Terça', short: 'TER' },
  { id: 'wednesday', label: 'Quarta', short: 'QUA' },
  { id: 'thursday', label: 'Quinta', short: 'QUI' },
  { id: 'friday', label: 'Sexta', short: 'SEX' },
  { id: 'saturday', label: 'Sábado', short: 'SAB' },
  { id: 'sunday', label: 'Domingo', short: 'DOM' },
];



interface AvailabilityEditorProps {
  availability?: Availability[];
  setAvailability?: (availability: Availability[]) => void;
  blockouts?: Blockout[];
  setBlockouts?: (blockouts: Blockout[]) => void;
  teacherId?: string;
}

export function AvailabilityEditor({ 
  availability = [], 
  setAvailability = () => {},
  blockouts = [], 
  setBlockouts = () => {},
  teacherId 
}: AvailabilityEditorProps) {
  const { user } = useAuth();


    const handleDayToggle = (day: string) => {
    const isCurrentlyEnabled = isDayEnabled(day);

    if (isCurrentlyEnabled) {
      // Disable the day: remove availability and associated blockouts
      const newAvailability = availability.filter(a => a.day !== day);
      const newBlockouts = blockouts.filter(b => b.day !== day);
      setAvailability(newAvailability);
      setBlockouts(newBlockouts);
      // Salvar automaticamente no Supabase quando houver alterações
      if (teacherId) {
        saveAvailabilityToSupabase(newAvailability);
        saveBlockoutsToSupabase(newBlockouts);
      }
    } else {
      // Enable the day: set default availability
      const newSchedule = { day, startTime: '05:00', endTime: '21:00' };
      const existingIndex = availability.findIndex(a => a.day === day);
      const newAvailability = [...availability];
      if (existingIndex > -1) {
        newAvailability[existingIndex] = { ...newAvailability[existingIndex], ...newSchedule };
      } else {
        newAvailability.push(newSchedule);
      }
      setAvailability(newAvailability);
      // Salvar automaticamente no Supabase quando houver alterações
      if (teacherId) {
        saveAvailabilityToSupabase(newAvailability);
      }
    }
  };



  const handleTimeChange = (day: string, type: 'startTime' | 'endTime', value: string) => {
    const existingIndex = availability.findIndex(a => a.day === day);

    if (existingIndex > -1) {
      const newAvailability = [...availability];
      const updatedAvailability = { ...newAvailability[existingIndex], [type]: value };
      
      if (!updatedAvailability.startTime && !updatedAvailability.endTime) {
        const filteredAvailability = newAvailability.filter((_, i) => i !== existingIndex);
        setAvailability(filteredAvailability);
        // Salvar automaticamente no Supabase quando houver alterações
        if (teacherId) {
          saveAvailabilityToSupabase(filteredAvailability);
        }
      } else {
        newAvailability[existingIndex] = updatedAvailability;
        setAvailability(newAvailability);
        // Salvar automaticamente no Supabase quando houver alterações
        if (teacherId) {
          saveAvailabilityToSupabase(newAvailability);
        }
      }
    } else if (value) {
      const newAvailability = [...availability, { day, startTime: type === 'startTime' ? value : '', endTime: type === 'endTime' ? value : '' }];
      setAvailability(newAvailability);
      // Salvar automaticamente no Supabase quando houver alterações
      if (teacherId) {
        saveAvailabilityToSupabase(newAvailability);
      }
    }
  };



  const copyDaySchedule = (fromDay: string, toDay: string) => {
    const template = availability.find(a => a.day === fromDay);
    if (!template) return;

    const newAvailability = availability.filter(a => a.day !== toDay);
    newAvailability.push({ ...template, day: toDay });
    setAvailability(newAvailability);

    // Copiar bloqueios também
    const dayBlockouts = blockouts.filter(b => b.day === fromDay);
    const newBlockouts = blockouts.filter(b => b.day !== toDay);
    dayBlockouts.forEach(blockout => {
      newBlockouts.push({ ...blockout, day: toDay });
    });
    setBlockouts(newBlockouts);
    
    // Salvar automaticamente no Supabase quando houver alterações
    if (teacherId) {
      saveAvailabilityToSupabase(newAvailability);
      saveBlockoutsToSupabase(newBlockouts);
    }
  };



  const isDayEnabled = (day: string) => {
    return availability.some(a => a.day === day && a.startTime && a.endTime);
  };

  const getDayScheduleSummary = (day: string) => {
    const dayAvailability = availability.find(a => a.day === day);
    const dayBlockouts = blockouts.filter(b => b.day === day);
    
    if (!dayAvailability || !dayAvailability.startTime || !dayAvailability.endTime) {
      return null;
    }
    
    return {
      schedule: `${dayAvailability.startTime} - ${dayAvailability.endTime}`,
      blockouts: dayBlockouts.length
    };
  };

  const addBlockout = (day: string) => {
    // Calcular a próxima data que corresponde ao dia da semana selecionado
    const today = new Date();
    const dayMap = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 
      'friday': 5, 'saturday': 6, 'sunday': 0
    };
    
    const targetDayOfWeek = dayMap[day as keyof typeof dayMap];
    const currentDayOfWeek = today.getDay();
    
    // Calcular quantos dias adicionar para chegar ao dia desejado
    let daysToAdd = targetDayOfWeek - currentDayOfWeek;
    if (daysToAdd < 0) {
      daysToAdd += 7; // Se o dia já passou esta semana, pegar da próxima
    }
    if (daysToAdd === 0 && today.getHours() >= 18) {
      daysToAdd = 7; // Se é hoje mas já é tarde, pegar da próxima semana
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    const newBlockouts = [...blockouts, { 
      title: 'Bloqueio',
      day: day,
      startDate: targetDateString,
      endDate: targetDateString,
      startTime: '12:00', 
      endTime: '13:00',
      is_recurring: false
    }];
    setBlockouts(newBlockouts);
    
    // Salvar automaticamente no Supabase quando houver alterações
    if (teacherId) {
      saveBlockoutsToSupabase(newBlockouts);
    }
  };

  const removeBlockout = (index: number) => {
    const newBlockouts = blockouts.filter((_, i) => i !== index);
    setBlockouts(newBlockouts);
    
    // Salvar automaticamente no Supabase quando houver alterações
    if (teacherId) {
      saveBlockoutsToSupabase(newBlockouts);
    }
  };

  const handleBlockoutChange = (index: number, field: keyof Blockout, value: string | boolean) => {
    const newBlockouts = [...blockouts];
    newBlockouts[index] = { ...newBlockouts[index], [field]: value };
    setBlockouts(newBlockouts);
    
    // Salvar automaticamente no Supabase quando houver alterações
    if (teacherId) {
      saveBlockoutsToSupabase(newBlockouts);
    }
  };
  
  const saveAvailabilityToSupabase = async (availability: Availability[]) => {
    try {
      if (!teacherId || !user?.id) {
        console.error('teacherId ou user.id não disponível');
        return;
      }

      // Converter a disponibilidade para o formato do Supabase
      const supabaseAvailability = availability
        .filter(a => a.startTime && a.endTime) // Só salvar horários válidos
        .map(avail => ({
          teacher_id: teacherId,
          user_id: user.id,
          day: avail.day,
          start_time: avail.startTime,
          end_time: avail.endTime,
          is_available: true
        }));
      
      // Primeiro deletar toda a disponibilidade existente para este professor
      const { error: deleteError } = await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', teacherId);
      
      if (deleteError) throw deleteError;
      
      // Inserir a nova disponibilidade se houver dados
      if (supabaseAvailability.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_availability')
          .insert(supabaseAvailability);
        
        if (insertError) throw insertError;
      }
      
      console.log('Disponibilidade salva com sucesso no Supabase');
    } catch (error) {
      console.error('Erro ao salvar disponibilidade:', error);
    }
  };

  const saveBlockoutsToSupabase = async (blockouts: Blockout[]) => {
    try {
      if (!teacherId || !user?.id) {
        console.error('teacherId ou user.id não disponível');
        return;
      }

      // Converter os bloqueios para o formato do Supabase
      const supabaseBlockouts = blockouts
        .filter(b => b.startDate && b.endDate) // Só salvar bloqueios válidos
        .map(blockout => {
          // Criar as datas completas com horários
          const startDateTime = blockout.startTime 
            ? `${blockout.startDate}T${blockout.startTime}:00` 
            : `${blockout.startDate}T00:00:00`;
          const endDateTime = blockout.endTime 
            ? `${blockout.endDate}T${blockout.endTime}:00` 
            : `${blockout.endDate}T23:59:59`;
            
          return {
            teacher_id: teacherId,
            user_id: user.id,
            start_date: startDateTime,
            end_date: endDateTime,
            start_time: blockout.startTime || null,
            end_time: blockout.endTime || null,
            is_recurring: Boolean(blockout.is_recurring),
            reason: blockout.title || 'Bloqueio'
          };
        });
      
      // Primeiro deletar todos os bloqueios existentes para este professor
      const { error: deleteError } = await supabase
        .from('teacher_absences')
        .delete()
        .eq('teacher_id', teacherId);
      
      if (deleteError) throw deleteError;
      
      // Inserir os novos bloqueios se houver dados
      if (supabaseBlockouts.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_absences')
          .insert(supabaseBlockouts);
        
        if (insertError) throw insertError;
      }
      
      console.log('Bloqueios salvos com sucesso no Supabase');
    } catch (error) {
      console.error('Erro ao salvar bloqueios:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium">Disponibilidade Semanal</h4>
        <p className="text-sm text-muted-foreground">Defina os horários de trabalho do professor.</p>
      </div>

      <div className="border rounded-md">
        {daysOfWeek.map(({ id, label }, dayIndex) => {
          const currentAvailability = availability.find(a => a.day === id) || { startTime: '', endTime: '' };
          const dayBlockouts = blockouts.filter(b => b.day === id);
          const isEnabled = isDayEnabled(id);

          return (
            <div key={id} className={cn(
              "grid grid-cols-[auto_1fr] items-start gap-x-6 gap-y-3 p-4 transition-all",
              dayIndex > 0 && "border-t",
              !isEnabled && "opacity-50"
            )}>
              {/* -- Day Label and Switch -- */}
              <div className="flex items-center gap-4 pt-1.5">
                <Switch
                    id={`enable-${id}`}
                    checked={isEnabled}
                    onCheckedChange={() => handleDayToggle(id)}
                    aria-label={`Ativar/desativar ${label}`}
                    className="data-[state=checked]:bg-green-500" 
                  />
                <Label htmlFor={`enable-${id}`} className="font-bold w-24 cursor-pointer">{label}</Label>
              </div>

              {/* -- Time Inputs and Actions -- */}
              <div className={cn("space-y-2")}>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={currentAvailability.startTime || ''}
                    onChange={(e) => handleTimeChange(id, 'startTime', e.target.value)}
                    className="w-32"
                    disabled={!isEnabled}
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <Input
                    type="time"
                    value={currentAvailability.endTime || ''}
                    onChange={(e) => handleTimeChange(id, 'endTime', e.target.value)}
                    className="w-32"
                    disabled={!isEnabled}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!isEnabled}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Copiar para...</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {daysOfWeek
                        .filter(day => day.id !== id)
                        .map(day => (
                          <DropdownMenuItem key={`copy-to-${day.id}`} onSelect={() => copyDaySchedule(id, day.id)}>
                            {day.label}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex-grow" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addBlockout(id);
                    }} 
                    disabled={!isEnabled}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Bloqueio
                  </Button>
                </div>
              </div>

              {/* -- Blockouts List -- */}
              {isEnabled && dayBlockouts.length > 0 && (
                <div className="col-start-2 space-y-2">
                  {dayBlockouts.map((blockout, index) => {
                      const originalIndex = blockouts.findIndex(b => b === blockout);
                      return (
                        <div key={originalIndex} className="p-3 rounded-md bg-background border space-y-3">
                          {/* Primeira linha: Título e Switch de Recorrência */}
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder="Motivo do bloqueio"
                              value={blockout.title || ''}
                              onChange={(e) => handleBlockoutChange(originalIndex, 'title', e.target.value)}
                              className="h-8 text-sm flex-grow"
                            />
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Label htmlFor={`recurring-${originalIndex}`} className="cursor-pointer text-sm whitespace-nowrap">Recorrente</Label>
                              <Switch
                                id={`recurring-${originalIndex}`}
                                checked={Boolean(blockout.is_recurring)}
                                onCheckedChange={(checked) => handleBlockoutChange(originalIndex, 'is_recurring', checked)}
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBlockout(originalIndex)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {/* Segunda linha: Datas */}
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground min-w-[60px]">Período:</Label>
                            <Input 
                              type="date"
                              value={blockout.startDate || ''}
                              onChange={(e) => handleBlockoutChange(originalIndex, 'startDate', e.target.value)}
                              className="w-40 h-8 text-sm"
                              disabled={Boolean(blockout.is_recurring)}
                              style={blockout.is_recurring ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                            />
                            <span className="text-muted-foreground text-sm">até</span>
                            <Input 
                              type="date"
                              value={blockout.endDate || ''}
                              onChange={(e) => handleBlockoutChange(originalIndex, 'endDate', e.target.value)}
                              className="w-40 h-8 text-sm"
                              disabled={Boolean(blockout.is_recurring)}
                              style={blockout.is_recurring ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-sm text-muted-foreground min-w-[60px]">Horário:</Label>
                            <Input
                              type="time"
                              value={blockout.startTime || ''}
                              onChange={(e) => handleBlockoutChange(originalIndex, 'startTime', e.target.value)}
                              className="w-32 h-8 text-sm"
                            />
                            <span className="text-muted-foreground text-sm">-</span>
                            <Input
                              type="time"
                              value={blockout.endTime || ''}
                              onChange={(e) => handleBlockoutChange(originalIndex, 'endTime', e.target.value)}
                              className="w-32 h-8 text-sm"
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}