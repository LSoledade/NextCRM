import React from 'react';
import { ScrollArea } from '../ui/scroll-area';
import KanbanColumn from './KanbanColumn';

const COLUMNS = [
  { key: 'Backlog', label: 'Backlog' },
  { key: 'Em andamento', label: 'Em andamento' },
  { key: 'Bloqueadas', label: 'Bloqueadas' },
  { key: 'Em Analise', label: 'Em Análise' },
  { key: 'Concluidas', label: 'Concluídas' },
];

export default function KanbanBoard({ tasks, userRole, onTaskDrop }: {
  tasks: any[];
  userRole: 'admin' | 'user';
  onTaskDrop: (taskId: string, newStatus: string) => void;
}) {
  return (
    <div className="w-full h-full">
      <ScrollArea className="w-full">
        <div className="flex gap-6 p-6 min-w-fit">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.key}
              status={col.key}
              label={col.label}
              tasks={tasks.filter(t => t.status === col.key)}
              userRole={userRole}
              onTaskDrop={onTaskDrop}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
