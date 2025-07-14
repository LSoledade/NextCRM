'use client';

import {
  CalendarDays,
  StickyNote,
  CheckSquare,
  Bookmark,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextContentProps } from './types';

export default function DefaultContextContent({}: ContextContentProps) {
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Painel Lateral</h2>
        <p className="text-sm text-muted-foreground">Acesso rápido às suas ferramentas</p>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CalendarDays className="h-6 w-6" />
            <span className="text-xs font-medium">Agenda</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <StickyNote className="h-6 w-6" />
            <span className="text-xs font-medium">Notas</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CheckSquare className="h-6 w-6" />
            <span className="text-xs font-medium">Tarefas</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Bookmark className="h-6 w-6" />
            <span className="text-xs font-medium">Favoritos</span>
          </Button>
        </div>

        {/* Notifications Section */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Notificações</h3>
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-accent/50 border border-border/50">
              <p className="text-xs text-muted-foreground">Nenhuma notificação nova</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Resumo Rápido</h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="p-3 rounded-lg bg-accent/30 border border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Tarefas Pendentes</span>
                <span className="text-sm font-medium text-foreground">5</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 border border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Reuniões Hoje</span>
                <span className="text-sm font-medium text-foreground">3</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 border border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Leads Novos</span>
                <span className="text-sm font-medium text-foreground">12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}