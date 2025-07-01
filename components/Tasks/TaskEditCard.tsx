import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { 
  Calendar, 
  User, 
  Flag, 
  AlignLeft, 
  Clock,
  Save,
  Trash2,
  Archive
} from 'lucide-react';

interface TaskEditCardProps {
  task: any;
  users: Array<{ id: string; username: string | null; role: 'admin' | 'user' }>;
  onSave: (taskData: any) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  userRole: 'admin' | 'user';
}

const PRIORITIES = [
  { value: 'Low', label: 'Baixa', color: 'bg-green-100 text-green-700' },
  { value: 'Medium', label: 'Média', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'High', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'Urgent', label: 'Urgente', color: 'bg-red-100 text-red-700' },
];

const STATUS_OPTIONS = [
  { value: 'Backlog', label: 'Backlog', color: 'bg-slate-500' },
  { value: 'Em andamento', label: 'Em andamento', color: 'bg-blue-500' },
  { value: 'Bloqueadas', label: 'Bloqueadas', color: 'bg-red-500' },
  { value: 'Em Analise', label: 'Em Análise', color: 'bg-yellow-500' },
  { value: 'Concluidas', label: 'Concluídas', color: 'bg-green-500' },
];

export default function TaskEditCard({ 
  task, 
  users, 
  onSave, 
  onDelete, 
  onClose, 
  isLoading = false,
  userRole 
}: TaskEditCardProps) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Backlog',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    assigned_to_id: task?.assigned_to_id || '',
  });

  const [titleFocused, setTitleFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = document.querySelector('[data-title-textarea]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [formData.title]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.color || 'bg-gray-500';
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Backlog': return 'bg-slate-50 text-slate-700';
      case 'Em andamento': return 'bg-blue-50 text-blue-700';
      case 'Bloqueadas': return 'bg-red-50 text-red-700';
      case 'Em Analise': return 'bg-yellow-50 text-yellow-700';
      case 'Concluidas': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const assignedUser = users.find(user => user.id === formData.assigned_to_id);

  const handleSave = async () => {
    await onSave(formData);
  };

  const handleDelete = async () => {
    if (task?.id && onDelete) {
      await onDelete(task.id);
    }
  };

  const isOverdue = formData.due_date && new Date(formData.due_date) < new Date();
  const isDueSoon = formData.due_date && new Date(formData.due_date) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <Card className="w-full max-h-[90vh] overflow-y-auto bg-white shadow-none border-0 rounded-lg">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Título editável */}
            <div className="relative mb-3">
              <Textarea
                data-title-textarea
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                className={`text-xl font-semibold border-none p-2 shadow-none bg-transparent resize-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 rounded-md min-h-[2.5rem] transition-all ${
                  titleFocused ? 'bg-white shadow-sm border border-blue-200' : 'hover:bg-gray-50'
                }`}
                placeholder="Título da tarefa..."
                rows={1}
                style={{ overflow: 'hidden' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sidebar de ações rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Exibição das informações selecionadas */}
            <div className="flex flex-wrap gap-2">
              {assignedUser && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(assignedUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-blue-700">{assignedUser.username}</span>
                </div>
              )}
              
              {formData.priority && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
                  <div className={`w-3 h-3 rounded-full ${
                    formData.priority === 'Urgent' ? 'bg-red-500' :
                    formData.priority === 'High' ? 'bg-orange-500' :
                    formData.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm text-gray-700">
                    {PRIORITIES.find(p => p.value === formData.priority)?.label}
                  </span>
                </div>
              )}

              {formData.status && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusBgColor(formData.status)}`}>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(formData.status)}`} />
                  <span className="text-sm">
                    {STATUS_OPTIONS.find(s => s.value === formData.status)?.label}
                  </span>
                </div>
              )}

              {formData.due_date && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  isOverdue 
                    ? 'bg-red-100 text-red-700' 
                    : isDueSoon 
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span className="text-sm">
                    {new Date(formData.due_date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'short'
                    })}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Descrição */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <AlignLeft className="w-4 h-4" />
                Descrição
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onFocus={() => setDescriptionFocused(true)}
                onBlur={() => setDescriptionFocused(false)}
                placeholder="Adicione uma descrição mais detalhada..."
                className={`min-h-[120px] resize-none border-2 transition-all ${
                  descriptionFocused ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
                rows={5}
              />
            </div>
          </div>

          {/* Sidebar de ações */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-3">Adicionar ao cartão</div>
              
              <div className="space-y-2">
                {/* Botão de Membros */}
                <div className="relative">
                  <Select
                    value={formData.assigned_to_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_to_id: value })}
                  >
                    <SelectTrigger className="w-full justify-start text-left bg-gray-100 hover:bg-gray-200 border-0">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Membros</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-blue-50 text-blue-700">
                                {getInitials(user.username)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.username || `Usuário ${user.id.slice(0, 8)}`}</span>
                            {user.role === 'admin' && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão de Prioridade */}
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="w-full justify-start text-left bg-gray-100 hover:bg-gray-200 border-0">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      <span>Prioridade</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            priority.value === 'Urgent' ? 'bg-red-500' :
                            priority.value === 'High' ? 'bg-orange-500' :
                            priority.value === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botão de Data */}
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-gray-100 hover:bg-gray-200 border-0 pl-10 pr-4 py-2"
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-sm font-medium text-gray-700 mb-3">Ações</div>
              
              <div className="space-y-2">
                {/* Mover para lista */}
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="w-full justify-start text-left bg-gray-100 hover:bg-gray-200 border-0">
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      <span>Mover</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {userRole === 'admin' && onDelete && task?.id && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 bg-gray-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ações principais */}
        <div className="flex items-center justify-start pt-4 border-t">
          <Button 
            onClick={handleSave}
            disabled={isLoading || !formData.title.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </CardContent>
      </Card>
    );
  }
