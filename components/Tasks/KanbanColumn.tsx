import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Button } from '../ui/button';
import { Plus, MoreHorizontal, X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';

export default function KanbanColumn({ status, label, tasks, userRole, onTaskDrop, onAddTask, onEditTask, users }: {
  status: string;
  label: string;
  tasks: any[];
  userRole: 'admin' | 'user';
  onTaskDrop: (taskId: string, newStatus: string) => void;
  onAddTask?: (task: { title: string; description: string; priority: string; status: string }) => Promise<void>;
  onEditTask?: (task: any) => void;
  users?: Array<{ id: string; username: string | null; }>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleStartAddingTask = () => {
    setIsAddingTask(true);
    setNewTaskTitle('');
  };

  const handleCancelAddingTask = () => {
    setIsAddingTask(false);
    setNewTaskTitle('');
  };

  const handleAddTaskSubmit = async () => {
    if (!newTaskTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddTask?.({
        title: newTaskTitle.trim(),
        description: '', // Descrição vazia inicialmente, como no Trello
        priority: 'Medium', // Prioridade padrão
        status: status,
      });
      handleCancelAddingTask();
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddTaskSubmit();
    }
    if (e.key === 'Escape') {
      handleCancelAddingTask();
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
        {/* Card de adicionar tarefa inline - Estilo Trello */}
        {userRole === 'admin' && isAddingTask && (
          <Card className="border-2 border-dashed border-primary/30 bg-background shadow-sm">
            <CardContent className="p-3">
              <Input
                placeholder="Insira um título para este cartão..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTaskSubmit();
                  }
                  if (e.key === 'Escape') {
                    handleCancelAddingTask();
                  }
                }}
                className="border-none bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground focus-visible:ring-0 shadow-none"
                maxLength={100}
                autoFocus
              />
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleAddTaskSubmit}
                  disabled={!newTaskTitle.trim() || isSubmitting}
                  className="h-8 px-3 text-xs"
                >
                  {isSubmitting ? 'Adicionando...' : 'Adicionar cartão'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAddingTask}
                  className="h-8 w-8 p-0"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tasks.map(task => {
          const assignedUser = users?.find(user => user.id === task.assigned_to_id);
          return (
            <TaskCard 
              key={task.id} 
              task={task} 
              userRole={userRole} 
              draggable 
              onEdit={onEditTask}
              assignedUser={assignedUser}
            />
          );
        })}
        
        {/* Área de drop vazia */}
        {tasks.length === 0 && !isAddingTask && (
          <div className="flex-1 flex items-center justify-center py-8 text-center">
            <div className="text-muted-foreground text-sm">
              <div className="w-8 h-8 mx-auto mb-2 opacity-50">
                <Plus className="w-full h-full" />
              </div>
              Arraste cartões aqui
            </div>
          </div>
        )}
      </div>

      {/* Botão adicionar tarefa (apenas para admins e quando não está adicionando) */}
      {userRole === 'admin' && !isAddingTask && (
        <div className="p-3 pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 border-dashed border-2 border-transparent hover:border-muted-foreground/20 h-8 transition-all duration-200 justify-start"
            onClick={handleStartAddingTask}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar um cartão
          </Button>
        </div>
      )}
    </div>
  );
}
