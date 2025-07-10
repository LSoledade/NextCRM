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
import { cn } from '@/lib/utils';
import { Availability, Blockout } from '@/types/types';

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
}

export function AvailabilityEditor({ 
  availability = [], 
  setAvailability = () => {},
  blockouts = [], 
  setBlockouts = () => {} 
}: AvailabilityEditorProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleTimeChange = (day: string, type: 'startTime' | 'endTime', value: string) => {
    const existing = availability.find(a => a.day === day);
    if (existing) {
      setAvailability(availability.map(a => a.day === day ? { ...a, [type]: value } : a));
    } else {
      setAvailability([...availability, { day, startTime: type === 'startTime' ? value : '', endTime: type === 'endTime' ? value : '' }]);
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
  };

  const applyToSelected = () => {
    const firstSelectedDay = selectedDays[0];
    if (!firstSelectedDay) return;

    const template = availability.find(a => a.day === firstSelectedDay);
    if (!template) return;

    const newAvailability = [...availability];
    selectedDays.slice(1).forEach(day => {
      const index = newAvailability.findIndex(a => a.day === day);
      if (index > -1) {
        newAvailability[index] = { ...newAvailability[index], ...template, day };
      } else {
        newAvailability.push({ ...template, day });
      }
    });
    setAvailability(newAvailability);
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

  const addBlockout = () => {
    setBlockouts([...blockouts, { title: '', day: '', startTime: '', endTime: '' }]);
  };

  const removeBlockout = (index: number) => {
    setBlockouts(blockouts.filter((_, i) => i !== index));
  };

  const handleBlockoutChange = (index: number, field: keyof Blockout, value: string) => {
    const newBlockouts = [...blockouts];
    newBlockouts[index] = { ...newBlockouts[index], [field]: value };
    setBlockouts(newBlockouts);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium">Disponibilidade Semanal</h4>
        <p className="text-sm text-muted-foreground">Defina os horários de trabalho do professor.</p>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="flex items-center justify-end space-x-2">
            <Button type="button" size="sm" onClick={applyToSelected} disabled={selectedDays.length < 2}>
                Aplicar para dias selecionados
            </Button>
        </div>
        <div className="grid gap-3">
          {daysOfWeek.map(({ id, label }) => {
            const currentAvailability = availability.find(a => a.day === id) || { startTime: '', endTime: '' };
            return (
              <div key={id} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox id={id} onCheckedChange={() => handleDayToggle(id)} checked={selectedDays.includes(id)} />
                  <Label htmlFor={id} className="w-20 text-sm font-medium">{label}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="time" 
                    value={currentAvailability.startTime} 
                    onChange={e => handleTimeChange(id, 'startTime', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm px-2">até</span>
                  <Input 
                    type="time" 
                    value={currentAvailability.endTime} 
                    onChange={e => handleTimeChange(id, 'endTime', e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-medium">Bloqueios Recorrentes</h4>
        <p className="text-sm text-muted-foreground">Adicione bloqueios como almoço ou pausas que se repetem semanalmente.</p>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="space-y-4">
          {blockouts.map((blockout, index) => (
            <div key={index} className="space-y-3 p-3 border rounded-md bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Título do Bloqueio</Label>
                  <Input 
                    placeholder="Ex: Almoço, Pausa, Reunião" 
                    value={blockout.title} 
                    onChange={e => handleBlockoutChange(index, 'title', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Dia da Semana</Label>
                  <select 
                    value={blockout.day} 
                    onChange={e => handleBlockoutChange(index, 'day', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione o dia</option>
                    {daysOfWeek.map(day => (
                      <option key={day.id} value={day.id}>{day.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Horário:</Label>
                  <Input 
                    type="time" 
                    value={blockout.startTime} 
                    onChange={e => handleBlockoutChange(index, 'startTime', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm px-2">até</span>
                  <Input 
                    type="time" 
                    value={blockout.endTime} 
                    onChange={e => handleBlockoutChange(index, 'endTime', e.target.value)}
                    className="w-32"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeBlockout(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addBlockout}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Bloqueio Recorrente
        </Button>
      </div>
    </div>
  );
}