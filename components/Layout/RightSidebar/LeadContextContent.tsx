'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  Tag,
  Calendar,
  X,
  Edit2,
  Save,
  MapPin,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LeadContextProps } from './types';

// Utilitários para formatação
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return 'Data inválida';
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'New': return 'secondary';
    case 'Contacted': return 'outline';
    case 'Converted': return 'default';
    case 'Lost': return 'destructive';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'New': return <Circle className="h-3 w-3" />;
    case 'Contacted': return <Clock className="h-3 w-3" />;
    case 'Converted': return <CheckCircle2 className="h-3 w-3" />;
    case 'Lost': return <XCircle className="h-3 w-3" />;
    default: return <AlertCircle className="h-3 w-3" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'Contacted': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'Converted': return 'text-green-600 bg-green-50 border-green-200';
    case 'Lost': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const normalizeTags = (tags: any): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.flatMap(tag => {
      if (typeof tag === 'string') {
        if (tag.includes(';')) {
          return tag.split(';').map(t => t.trim()).filter(Boolean);
        }
        if (tag.includes(',') && !tag.includes(';')) {
          return tag.split(',').map(t => t.trim()).filter(Boolean);
        }
        return [tag.trim()];
      }
      return [];
    }).filter(Boolean);
  }
  if (typeof tags === 'string') {
    if (tags.includes(';')) {
      return tags.split(';').map(tag => tag.trim()).filter(Boolean);
    }
    if (tags.includes(',')) {
      return tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    return [tags.trim()].filter(Boolean);
  }
  return [];
};

// Componente para informações de contato
const ContactInfo = ({ lead }: { lead: any }) => (
  <>
    {lead.email && (
      <div className="group p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 bg-gradient-to-r from-blue-50/30 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
            <Mail className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Email</span>
        </div>
        <div className="ml-11">
          <p className="text-gray-900 font-medium break-all">{lead.email}</p>
        </div>
      </div>
    )}

    {lead.phone && (
      <div className="group p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 bg-gradient-to-r from-green-50/30 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-full bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
            <Phone className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Telefone</span>
        </div>
        <div className="ml-11">
          <p className="text-gray-900 font-medium">{lead.phone}</p>
        </div>
      </div>
    )}
  </>
);

// Componente para informações da empresa
const CompanyInfo = ({ lead }: { lead: any }) => {
  if (!lead.company) return null;
  
  return (
    <div className="group p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 bg-gradient-to-r from-purple-50/30 to-transparent">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
          <Building className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-gray-700">Empresa</span>
      </div>
      <div className="ml-11">
        <p className="text-gray-900 font-medium">{lead.company}</p>
      </div>
    </div>
  );
};

// Componente para tags
const TagsInfo = ({ lead }: { lead: any }) => {
  const tags = normalizeTags(lead.tags);
  
  if (!lead.tags || tags.length === 0) return null;
  
  const tagColors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
  ];
  
  return (
    <div className="group p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 bg-gradient-to-r from-orange-50/30 to-transparent">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
          <Tag className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-gray-700">Tags</span>
      </div>
      <div className="ml-11">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 ${
                tagColors[index % tagColors.length]
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente para formulário de edição
const EditForm = ({ lead, editForm, setEditForm, onSave, onCancel }: {
  lead: any;
  editForm: any;
  setEditForm: (form: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <div className="space-y-6 p-1">
    {/* Informações Básicas */}
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Informações Básicas</h3>
      
      <div className="space-y-2">
        <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          Nome *
        </Label>
        <Input
          id="edit-name"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Digite o nome completo"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            Email
          </Label>
          <Input
            id="edit-email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="exemplo@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            Telefone
          </Label>
          <Input
            id="edit-phone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>
    </div>

    {/* Status e Classificação */}
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Status e Classificação</h3>
      
      <div className="space-y-2">
        <Label htmlFor="edit-status" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Circle className="h-4 w-4 text-gray-500" />
          Status
        </Label>
        <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
          <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="New" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-blue-600" />
                Novo
              </div>
            </SelectItem>
            <SelectItem value="Contacted" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-yellow-600" />
                Contatado
              </div>
            </SelectItem>
            <SelectItem value="Converted" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Convertido
              </div>
            </SelectItem>
            <SelectItem value="Lost" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-3 w-3 text-red-600" />
                Perdido
              </div>
            </SelectItem>
        </SelectContent>
      </Select>
    </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-company" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-500" />
            Empresa
          </Label>
          <Select value={editForm.company || "none"} onValueChange={(value) => setEditForm({ ...editForm, company: value === "none" ? "" : value })}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Selecione uma empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              <SelectItem value="Favale">Favale</SelectItem>
              <SelectItem value="Pink">Pink</SelectItem>
              <SelectItem value="Favale&Pink">Favale & Pink</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-source" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            Fonte
          </Label>
          <Select value={editForm.source} onValueChange={(value) => setEditForm({ ...editForm, source: value })}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Selecione uma fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Instagram">📷 Instagram</SelectItem>
              <SelectItem value="Facebook">📘 Facebook</SelectItem>
              <SelectItem value="Site">🌐 Site</SelectItem>
              <SelectItem value="Indicação">👥 Indicação</SelectItem>
              <SelectItem value="WhatsApp">💬 WhatsApp</SelectItem>
              <SelectItem value="Google Ads">🎯 Google Ads</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    {/* Tags e Configurações */}
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Tags e Configurações</h3>
      
      <div className="space-y-2">
        <Label htmlFor="edit-tags" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-500" />
          Tags
        </Label>
        <Input
          id="edit-tags"
          value={editForm.tags}
          onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
          placeholder="tag1;tag2;tag3"
          className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500">Separe as tags com ponto e vírgula (;)</p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="edit-student"
            checked={editForm.isStudent}
            onCheckedChange={(checked) => setEditForm({ ...editForm, isStudent: checked as boolean })}
            className="transition-all duration-200"
          />
          <Label htmlFor="edit-student" className="text-sm font-semibold text-gray-700 cursor-pointer">
            Marcar como aluno
          </Label>
        </div>
        <p className="text-xs text-gray-500 mt-2 ml-6">Este lead será incluído na lista de alunos</p>
      </div>
    </div>

    {/* Botões de Ação */}
    <div className="flex gap-3 pt-6 border-t border-gray-200">
      <Button 
        onClick={onSave} 
        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
      >
        <Save className="h-4 w-4 mr-2" />
        Salvar Alterações
      </Button>
      <Button 
        onClick={onCancel} 
        variant="outline" 
        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
      >
        Cancelar
      </Button>
    </div>
  </div>
);

export default function LeadContextContent({ lead, onClose }: LeadContextProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'New',
    source: '',
    company: '',
    tags: '',
    isStudent: false,
  });

  useEffect(() => {
    if (lead) {
      const normalizedTags = normalizeTags(lead.tags);
      setEditForm({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || 'New',
        source: lead.source || '',
        company: lead.company || '',
        tags: normalizedTags.join(';'),
        isStudent: lead.is_student || false,
      });
    }
  }, [lead]);

  const handleEditSave = async () => {
    if (!user || !lead) return;
    
    // Validação: nome é obrigatório e pelo menos email ou telefone deve estar preenchido
    if (!editForm.name.trim()) {
      toast({ 
        title: 'Erro de validação', 
        description: 'Nome é obrigatório!', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (!editForm.email.trim() && !editForm.phone.trim()) {
      toast({ 
        title: 'Erro de validação', 
        description: 'Pelo menos email ou telefone deve estar preenchido!', 
        variant: 'destructive' 
      });
      return;
    }
    
    try {
      // Atualizar dados do lead
      const updated = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        status: editForm.status,
        source: editForm.source,
        company: editForm.company || null,
        tags: editForm.tags.split(';').map(t => t.trim()).filter(Boolean),
      };
      
      const { error } = await supabase
        .from('leads')
        .update(updated)
        .eq('id', lead.id);
        
      if (error) throw error;
      
      // Gerenciar status de aluno
      const currentIsStudent = lead.is_student || false;
      
      if (editForm.isStudent && !currentIsStudent) {
        // Criar registro de aluno
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            lead_id: lead.id,
            user_id: user.id
          });
        if (studentError) throw studentError;
      } else if (!editForm.isStudent && currentIsStudent) {
        // Remover registro de aluno
        const { error: studentError } = await supabase
          .from('students')
          .delete()
          .eq('lead_id', lead.id);
        if (studentError) throw studentError;
      }
      
      toast({ title: 'Lead atualizado com sucesso!', variant: 'default' });
      setEditMode(false);
      
      // Invalidar cache para atualizar a lista de leads
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar lead', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  if (!lead) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Nenhum lead selecionado
      </div>
    );
  }

  return (
    <>
      {/* Header com gradiente e design moderno */}
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl" />
        <div className="relative p-4 rounded-xl border border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Detalhes do Lead
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                Informações completas e atualizadas
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!editMode ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditMode(true)}
                  className="bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 shadow-sm transition-all duration-200"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : null}
              {onClose && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="space-y-6">
        {editMode ? (
          <EditForm
            lead={lead}
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleEditSave}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <>
            {/* Nome e Status - Card Principal */}
            <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">Informações principais</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(lead.status)}
                    <Badge variant={getStatusBadgeVariant(lead.status)} className="font-medium">
                      {lead.status}
                    </Badge>
                  </div>
                  {lead.is_student && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Aluno
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informações de Contato */}
            <ContactInfo lead={lead} />

            {/* Informações da Empresa */}
            <CompanyInfo lead={lead} />

            {/* Tags */}
            <TagsInfo lead={lead} />

            {/* Data de Criação */}
            <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Data de Criação</h4>
                    <p className="text-xs text-muted-foreground">Quando o lead foi registrado</p>
                  </div>
                </div>
                <div className="pl-11">
                  <p className="text-foreground font-medium">{formatDate(lead.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Fonte */}
            {lead.source && (
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Fonte</h4>
                      <p className="text-xs text-muted-foreground">Origem do lead</p>
                    </div>
                  </div>
                  <div className="pl-11">
                    <p className="text-foreground font-medium">{lead.source}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// Simplificação: Removido gradientes e transições desnecessárias para interface mais limpa