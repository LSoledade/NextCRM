import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Clock, User, AlertCircle, Paperclip } from 'lucide-react';

export default function TaskCard({ task, userRole, draggable = false, onEdit, assignedUser }: {
  task: any;
  userRole: 'admin' | 'user';
  draggable?: boolean;
  onEdit?: (task: any) => void;
  assignedUser?: { id: string; username: string | null; } | null;
}) {
  // Drag event handler para arrastar o card
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'Urgent' || priority === 'High') {
      return <AlertCircle className="w-3 h-3" />;
    }
    return null;
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const isDueSoon = task.due_date && new Date(task.due_date) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <Card
      className={`group transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 bg-white border border-gray-200 hover:border-gray-300 ${
        onEdit ? 'cursor-pointer' : draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onClick={() => onEdit?.(task)}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Labels de prioridade (só para High e Urgent) */}
        {(task.priority === 'High' || task.priority === 'Urgent') && (
          <div className="flex gap-1">
            <div className={`h-1 w-full rounded-full ${
              task.priority === 'Urgent' ? 'bg-red-500' : 'bg-orange-500'
            }`} />
          </div>
        )}

        {/* Título da tarefa - estilo Trello */}
        <div className="text-sm font-normal text-gray-800 leading-snug break-words">
          {task.title}
        </div>

        {/* Descrição se existir - mais sutil */}
        {task.description && (
          <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {task.description}
          </div>
        )}

        {/* Badges e indicadores */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Data de vencimento */}
            {task.due_date && (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                isOverdue 
                  ? 'bg-red-100 text-red-700' 
                  : isDueSoon 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(task.due_date).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'short' 
                  })}
                </span>
              </div>
            )}

            {/* Indicador de descrição */}
            {task.description && (
              <div className="p-1 rounded bg-gray-100">
                <Paperclip className="w-3 h-3 text-gray-600" />
              </div>
            )}
          </div>

          {/* Avatar do usuário responsável */}
          {assignedUser && (
            <Avatar className="w-6 h-6 border border-gray-200">
              <AvatarFallback className="text-xs bg-blue-50 text-blue-700 font-medium">
                {getInitials(assignedUser.username)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
