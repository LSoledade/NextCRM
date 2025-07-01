import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, User, Edit2, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader as DHeader, DialogTitle as DTitle, DialogFooter as DFooter, DialogClose as DClose, DialogDescription as DDesc, DialogTrigger as DTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

// Types
export type Lead = Database['public']['Tables']['leads']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];

interface LeadSheetProps {
  open: boolean;
  leadId: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function LeadSheet({ open, leadId, onOpenChange }: LeadSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'New',
    source: '',
    tags: '',
  });

  useEffect(() => {
    if (open && leadId && user) {
      loadLeadDetails(user.id);
    }
    // eslint-disable-next-line
  }, [open, leadId, user]);

  const loadLeadDetails = async (userId: string) => {
    setLoading(true);
    const { data: leadData } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    setLead(leadData);
    const { data: tasksData } = await supabase.from('tasks').select('*').eq('related_lead_id', leadId).eq('user_id', userId).order('created_at', { ascending: false });
    setTasks(tasksData || []);
    setLoading(false);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Data inválida';
    }
  };

  useEffect(() => {
    if (lead) {
      setEditForm({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        status: lead.status,
        source: lead.source || '',
        tags: (lead.tags || []).join(';'),
      });
    }
  }, [lead]);

  const handleEditSave = async () => {
    if (!user || !lead) return;
    const updated = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      status: editForm.status,
      source: editForm.source,
      tags: editForm.tags.split(';').map(t => t.trim()).filter(Boolean),
    };
    const { error } = await supabase.from('leads').update(updated).eq('id', lead.id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lead atualizado com sucesso!', variant: 'default' });
      setEditMode(false);
      loadLeadDetails(user.id);
    }
  };

  // Substituir por controle padrão:
  const handleOpenChange = onOpenChange;

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl">
        <SheetHeader>
          <SheetTitle>{lead?.name || 'Lead'}</SheetTitle>
          <SheetDescription>
            <Badge variant="secondary" className="mt-1">{lead?.status}</Badge>
          </SheetDescription>
        </SheetHeader>
        <div className="flex justify-end mb-2">
          {!editMode ? (
            <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
              Editar Dados
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={handleEditSave}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
            </div>
          )}
        </div>
        <Tabs value={tab} onValueChange={setTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info"><User className="w-4 h-4 mr-2" /> Informações</TabsTrigger>
            <TabsTrigger value="tasks"><ClipboardList className="w-4 h-4 mr-2" /> Anotações</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="pt-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                {!editMode ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-lg font-semibold">Dados de Contato</h3>
                      <dl className="space-y-3">
                        <div><dt className="text-sm font-medium text-muted-foreground">Email</dt><dd className="text-sm">{lead?.email}</dd></div>
                        <div><dt className="text-sm font-medium text-muted-foreground">Telefone</dt><dd className="text-sm">{lead?.phone || 'Não informado'}</dd></div>
                        <div><dt className="text-sm font-medium text-muted-foreground">Origem</dt><dd className="text-sm">{lead?.source || 'Não informada'}</dd></div>
                        <div><dt className="text-sm font-medium text-muted-foreground">Tags</dt><dd className="text-sm flex flex-wrap gap-1">{lead?.tags?.map((tag, i) => <Badge key={i} variant="outline">{tag}</Badge>)}</dd></div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="mb-3 text-lg font-semibold">Informações do Sistema</h3>
                      <dl className="space-y-3">
                        <div><dt className="text-sm font-medium text-muted-foreground">Status</dt><dd><Badge variant="secondary">{lead?.status}</Badge></dd></div>
                        <div><dt className="text-sm font-medium text-muted-foreground">Criado em</dt><dd className="text-sm">{formatDate(lead?.created_at)}</dd></div>
                        <div><dt className="text-sm font-medium text-muted-foreground">Última atualização</dt><dd className="text-sm">{formatDate(lead?.updated_at)}</dd></div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <form className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label>Nome</Label>
                      <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                      <Label>Email</Label>
                      <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
                      <Label>Telefone</Label>
                      <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-4">
                      <Label>Status</Label>
                      <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">Novo</SelectItem>
                          <SelectItem value="Contacted">Contatado</SelectItem>
                          <SelectItem value="Converted">Convertido</SelectItem>
                          <SelectItem value="Lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label>Origem</Label>
                      <Select value={editForm.source} onValueChange={v => setEditForm(f => ({ ...f, source: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma origem" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Favale">Favale</SelectItem>
                          <SelectItem value="Pink">Pink</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Site">Site</SelectItem>
                          <SelectItem value="Indicação">Indicação</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label>Tags (separadas por ponto e vírgula)</Label>
                      <Input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tasks" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Anotações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">Nenhuma anotação implementada ainda.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
