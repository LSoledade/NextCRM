'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppointmentContextProps } from './types';

export default function AppointmentContextContent({ appointment, onClose }: AppointmentContextProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Detalhes do Agendamento</h2>
          <p className="text-sm text-muted-foreground">Informações do agendamento</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="text-center text-muted-foreground">
        Conteúdo do agendamento será implementado aqui
      </div>
    </>
  );
}