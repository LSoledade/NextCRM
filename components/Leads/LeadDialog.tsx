'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Added for explicit close button
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge'; // For tags
import { Checkbox } from '@/components/ui/checkbox'; // For student checkbox
import { X } from 'lucide-react'; // For close icon and tag remove
import { Database } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'];
type InsertLead = Database['public']['Tables']['leads']['Insert'];

interface LeadDialogProps {
  open: boolean;
  lead: Lead | null;
  onOpenChange: (open: boolean) => void; // Standard for shadcn dialogs
  onSave: (lead: InsertLead, isStudent?: boolean) => Promise<void>;
  // onClose can be removed if onOpenChange(false) is used, or kept if specific logic is needed
  onClose?: () => void;
}

export default function LeadDialog({ open, lead, onOpenChange, onSave, onClose: parentOnClose }: LeadDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<InsertLead>({
    name: '',
    email: '',
    phone: '',
    status: 'New',
    source: '',
    company: null,
    user_id: '', // This should ideally be set from auth context or passed if needed
    tags: [],
  });
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleActualClose = () => {
    if (parentOnClose) parentOnClose();
    onOpenChange(false);
  }

  useEffect(() => {
    if (open) { // Only reset form or set data when dialog opens
      if (lead) {
        setFormData({
          name: lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          status: lead.status as any || 'New',
          source: lead.source || '',
          company: (lead as any).company || null,
          tags: lead.tags || [],
          user_id: lead.user_id, // Ensure this is correct
        });
        setIsStudent((lead as any).is_student || false);
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          status: 'New',
          source: '',
          company: null,
          tags: [],
          user_id: '', // Reset or get from context if creating new
        });
        setIsStudent(false);
      }
      setTagInput('');
    }
  }, [lead, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name) {
        alert("Nome é obrigatório.");
        return;
    }
    if (!formData.email && !formData.phone) {
        alert("Pelo menos Email ou Telefone deve ser preenchido.");
        return;
    }
    if (!user) {
        alert("Usuário não autenticado.");
        return;
    }
    
    setLoading(true);
    try {
      // Passar o estado de aluno para o componente pai
      await onSave({...formData, user_id: user.id}, isStudent);
      handleActualClose();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTagAdd = () => {
    const newTag = tagInput.trim();
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag]
      }));
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTagAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Atualize as informações do lead.' : 'Preencha os detalhes para criar um novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  disabled={loading}
                >
                  <SelectTrigger id="status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">Novo</SelectItem>
                    <SelectItem value="Contacted">Contatado</SelectItem>
                    <SelectItem value="Converted">Convertido</SelectItem>
                    <SelectItem value="Lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
               <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Select
                  value={formData.company || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, company: value === 'none' ? null : value as any }))}
                  disabled={loading}
                >
                  <SelectTrigger id="company"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="Favale">Favale</SelectItem>
                    <SelectItem value="Pink">Pink</SelectItem>
                    <SelectItem value="Favale&Pink">Favale & Pink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <Select
                  value={formData.source || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value || null }))}
                  disabled={loading}
                >
                  <SelectTrigger id="source"><SelectValue placeholder="Selecione uma origem" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Site">Site</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Checkbox para marcar como aluno */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isStudent"
                checked={isStudent}
                onCheckedChange={(checked) => setIsStudent(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="isStudent" className="text-sm font-medium">
                Marcar como aluno
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Digite uma tag e pressione Enter"
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="button" variant="outline" onClick={handleTagAdd} disabled={loading || !tagInput.trim()}>
                  Adicionar
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 focus:outline-none"
                        aria-label={`Remover tag ${tag}`}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleActualClose} disabled={loading}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={loading || !formData.name || !formData.email}
            >
              {loading ? (
                <svg className="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (lead ? 'Atualizar Lead' : 'Criar Lead')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}