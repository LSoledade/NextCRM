import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Clock, User, AlertCircle } from 'lucide-react';

export default function TaskCard({ task, userRole, draggable = false }: {
  task: any;
  userRole: 'admin' | 'user';
  draggable?: boolean;
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

  return (
    <Card
      className="group cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:scale-[1.02] bg-card border-border/40 hover:border-primary/20"
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
    >
      <CardContent className="p-3 space-y-3">
        {/* Título da tarefa */}
        <div className="font-medium text-sm leading-tight text-foreground line-clamp-2">
          {task.title}
        </div>

        {/* Descrição se existir */}
        {task.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </div>
        )}

        {/* Tags e badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant={getPriorityColor(task.priority)} 
            className="text-xs px-2 py-0.5 flex items-center gap-1"
          >
            {getPriorityIcon(task.priority)}
            {task.priority}
          </Badge>
        </div>

        {/* Footer com informações adicionais */}
        <div className="flex items-center justify-between pt-1">
          {/* Data de vencimento */}
          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(task.due_date).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'short' 
                })}
              </span>
            </div>
          )}

          {/* Avatar do responsável */}
          <div className="flex items-center gap-1">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-xs bg-primary/10 text-primary border">
                <User className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
