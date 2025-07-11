'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Tag, Search, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TagInfo {
  name: string;
  count: number;
  leads: Array<{ id: string; name: string; email: string | null }>;
}

export default function TagManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  // Função auxiliar para normalizar tags
  const normalizeTags = (tags: any): string[] => {
    if (!tags) return [];
    
    // Se já é um array, processar cada item
    if (Array.isArray(tags)) {
      return tags
        .flatMap(tag => {
          if (typeof tag === 'string') {
            // Se a tag contém ponto e vírgula, dividir
            if (tag.includes(';')) {
              return tag.split(';').map(t => t.trim()).filter(Boolean);
            }
            // Se a tag contém vírgula (mas não ponto e vírgula), dividir também
            if (tag.includes(',') && !tag.includes(';')) {
              return tag.split(',').map(t => t.trim()).filter(Boolean);
            }
            return [tag.trim()];
          }
          return [];
        })
        .filter(Boolean);
    }
    
    // Se é uma string, processar
    if (typeof tags === 'string') {
      // Primeiro tentar dividir por ponto e vírgula
      if (tags.includes(';')) {
        return tags.split(';').map(tag => tag.trim()).filter(Boolean);
      }
      // Se não tem ponto e vírgula, tentar vírgula
      if (tags.includes(',')) {
        return tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }
      // Se não tem separadores, retornar como array único
      return [tags.trim()].filter(Boolean);
    }
    
    return [];
  };

  // Buscar todas as tags e suas informações
  const fetchTags = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar todos os leads com tags
      let query = supabase
        .from('leads')
        .select('id, name, email, tags')
        .not('tags', 'is', null)
        .neq('tags', '{}');

      // Se não for admin, filtrar apenas leads do usuário
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Processar tags
      const tagMap = new Map<string, TagInfo>();
      
      leads?.forEach(lead => {
        const normalizedTags = normalizeTags(lead.tags);
        
        normalizedTags.forEach(tag => {
          if (tag && tag.trim()) {
            const cleanTag = tag.trim();
            if (!tagMap.has(cleanTag)) {
              tagMap.set(cleanTag, {
                name: cleanTag,
                count: 0,
                leads: []
              });
            }
            const tagInfo = tagMap.get(cleanTag)!;
            tagInfo.count++;
            tagInfo.leads.push({
              id: lead.id,
              name: lead.name,
              email: lead.email
            });
          }
        });
      });

      // Converter para array e ordenar por contagem
      const tagsArray = Array.from(tagMap.values())
        .sort((a, b) => b.count - a.count);
      
      setTags(tagsArray);
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
      toast({
        title: 'Erro ao carregar tags',
        description: 'Não foi possível carregar as tags.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTags();
  }, [user, fetchTags]);

  // Filtrar tags baseado na pesquisa
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Adicionar nova tag a leads selecionados
  const handleAddTag = async () => {
    const tagName = newTagName.trim();
    if (!tagName) return;

    // Verificar se a tag já existe
    if (tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      toast({
        title: 'Tag já existe',
        description: 'Esta tag já está sendo utilizada.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Tag criada',
      description: `A tag "${tagName}" foi criada. Você pode aplicá-la aos leads através da edição individual ou em lote.`,
      variant: 'default'
    });
    
    setNewTagName('');
    // Adicionar tag vazia à lista para mostrar que foi criada
    setTags(prev => [...prev, { name: tagName, count: 0, leads: [] }]);
  };

  // Renomear tag existente
  const handleRenameTag = async (oldTagName: string, newTagName: string) => {
    if (!user || !newTagName.trim() || oldTagName === newTagName) {
      setEditingTag(null);
      return;
    }

    try {
      // Buscar todos os leads que podem ter a tag antiga
      let query = supabase
        .from('leads')
        .select('id, tags')
        .not('tags', 'is', null)
        .neq('tags', '{}');

      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data: leads, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Atualizar cada lead que contém a tag
      const updatePromises = leads?.map(async (lead) => {
        const normalizedTags = normalizeTags(lead.tags);
        
        // Verificar se a tag antiga existe
        if (normalizedTags.includes(oldTagName)) {
          const updatedTags = normalizedTags.map(tag => 
            tag === oldTagName ? newTagName : tag
          );
          
          return supabase
            .from('leads')
            .update({ tags: updatedTags })
            .eq('id', lead.id);
        }
        return null;
      }).filter(Boolean) || [];

      await Promise.all(updatePromises);
      
      toast({
        title: 'Tag renomeada',
        description: `A tag "${oldTagName}" foi renomeada para "${newTagName}".`,
        variant: 'default'
      });
      
      setEditingTag(null);
      fetchTags(); // Recarregar tags
    } catch (error) {
      console.error('Erro ao renomear tag:', error);
      toast({
        title: 'Erro ao renomear tag',
        description: 'Não foi possível renomear a tag.',
        variant: 'destructive'
      });
    }
  };

  // Deletar tag de todos os leads
  const handleDeleteTag = async (tagName: string) => {
    if (!user) return;

    try {
      // Buscar todos os leads que podem ter a tag
      let query = supabase
        .from('leads')
        .select('id, tags')
        .not('tags', 'is', null)
        .neq('tags', '{}');

      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data: leads, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Remover a tag de cada lead que a contém
      const updatePromises = leads?.map(async (lead) => {
        const normalizedTags = normalizeTags(lead.tags);
        
        // Verificar se a tag existe
        if (normalizedTags.includes(tagName)) {
          const updatedTags = normalizedTags.filter(tag => tag !== tagName);
          
          return supabase
            .from('leads')
            .update({ tags: updatedTags })
            .eq('id', lead.id);
        }
        return null;
      }).filter(Boolean) || [];

      await Promise.all(updatePromises);
      
      toast({
        title: 'Tag removida',
        description: `A tag "${tagName}" foi removida de todos os leads.`,
        variant: 'default'
      });
      
      setDeleteDialogOpen(false);
      setTagToDelete(null);
      fetchTags(); // Recarregar tags
    } catch (error) {
      console.error('Erro ao deletar tag:', error);
      toast({
        title: 'Erro ao remover tag',
        description: 'Não foi possível remover a tag.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (tagName: string) => {
    setTagToDelete(tagName);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (tagName: string) => {
    setEditingTag(tagName);
    setEditTagName(tagName);
  };

  const handleEditCancel = () => {
    setEditingTag(null);
    setEditTagName('');
  };

  const handleEditSave = () => {
    if (editingTag && editTagName.trim()) {
      handleRenameTag(editingTag, editTagName.trim());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando tags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tags Mais Usadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tags.length > 0 ? tags[0].name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {tags.length > 0 ? `${tags[0].count} leads` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tags Sem Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tags.filter(tag => tag.count === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adicionar nova tag */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Nova Tag
          </CardTitle>
          <CardDescription>
            Crie uma nova tag que poderá ser aplicada aos leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
            />
            <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pesquisar tags */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Pesquisar tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Tags Existentes ({filteredTags.length})
          </CardTitle>
          <CardDescription>
            Gerencie as tags existentes no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTags.length === 0 ? (
            <Alert>
              <AlertDescription>
                {searchTerm ? 'Nenhuma tag encontrada com este termo.' : 'Nenhuma tag encontrada. Crie a primeira tag acima.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredTags.map((tag) => (
                <div key={tag.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {editingTag === tag.name ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          className="w-40"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditSave();
                            } else if (e.key === 'Escape') {
                              handleEditCancel();
                            }
                          }}
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={handleEditSave}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {tag.count} {tag.count === 1 ? 'lead' : 'leads'}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {editingTag !== tag.name && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClick(tag.name)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(tag.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a tag &quot;{tagToDelete}&quot; de todos os leads?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tagToDelete && handleDeleteTag(tagToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}