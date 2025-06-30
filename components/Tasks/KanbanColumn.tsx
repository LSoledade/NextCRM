import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Button } from '../ui/button';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function KanbanColumn({ status, label, tasks, userRole, onTaskDrop }: {
  status: string;
  label: string;
  tasks: any[];
  userRole: 'admin' | 'user';
  onTaskDrop: (taskId: string, newStatus: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Drag-and-drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskDrop(taskId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'Backlog': return 'bg-slate-50 border-slate-200';
      case 'Em andamento': return 'bg-blue-50 border-blue-200';
      case 'Bloqueadas': return 'bg-red-50 border-red-200';
      case 'Em Analise': return 'bg-yellow-50 border-yellow-200';
      case 'Concluidas': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getHeaderColor = (status: string) => {
    switch (status) {
      case 'Backlog': return 'text-slate-700';
      case 'Em andamento': return 'text-blue-700';
      case 'Bloqueadas': return 'text-red-700';
      case 'Em Analise': return 'text-yellow-700';
      case 'Concluidas': return 'text-green-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div
      className={`flex flex-col rounded-lg border-2 transition-all duration-200 ${
        isDragOver 
          ? 'border-primary bg-primary/5 shadow-lg' 
          : `${getColumnColor(status)} border-dashed`
      } w-[280px] h-fit`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Cabeçalho da coluna */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-sm ${getHeaderColor(status)}`}>
            {label}
          </h3>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {tasks.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de tarefas */}
      <div className="flex flex-col gap-2 p-3 pt-1 min-h-[100px] max-h-[calc(100vh-200px)] overflow-y-auto">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} userRole={userRole} draggable />
        ))}
        
        {/* Área de drop vazia */}
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8 text-center">
            <div className="text-muted-foreground text-sm">
              <div className="w-8 h-8 mx-auto mb-2 opacity-50">
                <Plus className="w-full h-full" />
              </div>
              Arraste tarefas aqui
            </div>
          </div>
        )}
      </div>

      {/* Botão adicionar tarefa (apenas para admins) */}
      {userRole === 'admin' && (
        <div className="p-3 pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground hover:text-foreground border-dashed border-2 border-muted-foreground/20 hover:border-muted-foreground/40 h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar tarefa
          </Button>
        </div>
      )}
    </div>
  );
}
