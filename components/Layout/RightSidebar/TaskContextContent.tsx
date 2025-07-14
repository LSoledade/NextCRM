'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskContextProps } from './types';

export default function TaskContextContent({ task, onClose }: TaskContextProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Detalhes da Tarefa</h2>
          <p className="text-sm text-muted-foreground">Informações da tarefa</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="text-center text-muted-foreground">
        Conteúdo da tarefa será implementado aqui
      </div>
    </>
  );
}