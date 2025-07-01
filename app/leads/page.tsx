'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress'; // Or a custom spinner component
import { PlusCircle, Download, Upload, AlertTriangle } from 'lucide-react';
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
import AppLayout from '@/components/Layout/AppLayout';
import LeadTable from '@/components/Leads/LeadTable'; // Assuming this will also be refactored
import LeadDialog from '@/components/Leads/LeadDialog';
import FilterPanel from '@/components/Leads/FilterPanel';
import BatchOperations from '@/components/Leads/BatchOperations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Adicionado useQueryClient
import { cn } from '@/lib/utils';
import {
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useBatchUpdateLeadsStatusMutation,
  useBatchUpdateLeadsSourceMutation,
  useBatchDeleteLeadsMutation,
} from '@/hooks/useLeadMutations'; // Importar os novos hooks
import Papa from 'papaparse';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';

const LeadSheet = dynamic(() => import('@/components/Leads/LeadSheet'), { ssr: false });

type Lead = Database['public']['Tables']['leads']['Row'];
type InsertLead = Database['public']['Tables']['leads']['Insert'];
// Adicionar Type UpdateLead se for diferente de InsertLead e usado em handleUpdateLead
type UpdateLead = Database['public']['Tables']['leads']['Update'];

interface FilterState {
  source: string;
  status: string;
  campaign: string;
  state: string;
  startDate: string;
  endDate: string;
  tag: string;
  dateRange: string;
}

export default function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    source: '',
    status: '',
    campaign: '',
    state: '',
    startDate: '',
    endDate: '',
    tag: '',
    dateRange: '',
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Função para buscar leads do Supabase com base nos filtros
  const fetchLeads = async () => {
    if (!user) return [];
    let query = supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.campaign) query = query.eq('campaign', filters.campaign);
    if (filters.tag) query = query.contains('tags', [filters.tag]);
    if (filters.state) query = query.ilike('phone', `%${filters.state}%`);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString().split('T')[0]);
    }
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  // useQuery para leads
  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError: leadsError,
    // refetch: refetchLeads, // refetchLeads não é mais necessário diretamente aqui, a invalidação cuidará disso
  } = useQuery({
    queryKey: ['leads', user?.id, filters, searchTerm],
    queryFn: fetchLeads,
    enabled: !authLoading && !!user,
    // refetchOnWindowFocus: false, // Opcional: desabilitar refetch em foco da janela se causar problemas
  });

  // Instanciar os hooks de mutação
  const createLeadMutation = useCreateLeadMutation(user?.id);
  const updateLeadMutation = useUpdateLeadMutation(user?.id);
  const deleteLeadMutation = useDeleteLeadMutation(user?.id);
  const batchUpdateLeadsStatusMutation = useBatchUpdateLeadsStatusMutation(user?.id);
  const batchUpdateLeadsSourceMutation = useBatchUpdateLeadsSourceMutation(user?.id);
  const batchDeleteLeadsMutation = useBatchDeleteLeadsMutation(user?.id);

  const handleCreateLead = async (leadData: InsertLead) => {
    try {
      await createLeadMutation.mutateAsync(leadData);
      toast({ title: 'Lead criado com sucesso!', variant: 'default' });
    } catch (error) {
      toast({ title: 'Erro ao criar lead', description: String(error), variant: 'destructive' });
      throw error;
    }
  };

  const handleUpdateLead = async (leadData: UpdateLead) => {
    if (!selectedLead) return;
    try {
      await updateLeadMutation.mutateAsync({ ...leadData, id: selectedLead.id });
      toast({ title: 'Lead atualizado com sucesso!', variant: 'default' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar lead', description: String(error), variant: 'destructive' });
      throw error;
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    try {
      await deleteLeadMutation.mutateAsync(selectedLead.id);
      setDeleteDialogOpen(false);
      setSelectedLead(null);
      toast({ title: 'Lead excluído com sucesso!', variant: 'default' });
    } catch (error) {
      toast({ title: 'Erro ao deletar lead', description: String(error), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await batchDeleteLeadsMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
      setBatchDeleteDialogOpen(false);
      toast({ title: 'Leads excluídos com sucesso!', variant: 'default' });
    } catch (error) {
      toast({ title: 'Erro ao deletar leads', description: String(error), variant: 'destructive' });
    }
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  const handleDeleteDialogOpen = (lead: Lead) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setSheetOpen(true);
  };

  const handleSaveLead = async (leadData: InsertLead) => {
    if (selectedLead) {
      await handleUpdateLead(leadData);
    } else {
      await handleCreateLead(leadData);
    }
  };

  // Get unique tags for filter
  const availableTags = Array.from(
    new Set((leads || []).flatMap(lead => lead.tags || []))
  ).sort();

  // Função para exportar leads filtrados para CSV
  const handleExportCSV = () => {
    if (!leads || leads.length === 0) return;
    const csv = Papa.unparse(
      leads.map(l => ({
        name: l.name,
        email: l.email,
        phone: l.phone || '',
        status: l.status,
        source: l.source || '',
        tags: (l.tags || []).join(';'),
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leads_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Estado e refs para importação
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para importar leads via CSV
  const handleImportCSV = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(`Importação concluída: ${data.count} leads importados.`);
        toast({ title: 'Importação concluída', description: `${data.count} leads importados.`, variant: 'default' });
      } else {
        setImportResult(`Erro: ${data.error}`);
        toast({ title: 'Erro ao importar leads', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      setImportResult('Erro inesperado ao importar.');
      toast({ title: 'Erro inesperado ao importar', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  // Restaurar handlers handleBatchStatusUpdate e handleBatchSourceUpdate para atualização em lote de status e origem dos leads.
  const handleBatchStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;
    try {
      await batchUpdateLeadsStatusMutation.mutateAsync({ ids: selectedIds, status });
      setSelectedIds([]);
      toast({ title: 'Status atualizado em lote!', variant: 'default' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar status em lote', description: String(error), variant: 'destructive' });
    }
  };

  const handleBatchSourceUpdate = async (source: string) => {
    if (selectedIds.length === 0) return;
    try {
      await batchUpdateLeadsSourceMutation.mutateAsync({ ids: selectedIds, source });
      setSelectedIds([]);
      toast({ title: 'Origem atualizada em lote!', variant: 'default' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar origem em lote', description: String(error), variant: 'destructive' });
    }
  };

  if (authLoading || leadsLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {/* You can use a Spinner component here if you have one, or a simple text */}
          {/* <Progress value={...} className="w-[60%]" /> // Example if using Progress for loading */}
          <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-muted-foreground">Carregando leads...</p>
        </div>
      </AppLayout>
    );
  }

  // Redireciona para login se não estiver autenticado e não está carregando
  if (!authLoading && !user) {
    router.push('/login');
    return null; // Return null while redirecting
  }

  if (leadsError) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao carregar os leads. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm" disabled={leads.length === 0} onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedLead(null);
                setDialogOpen(true);
              }}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <FilterPanel
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={availableTags}
        />

        {/* Batch Operations */}
        {selectedIds.length > 0 && ( // Show batch operations only if items are selected
          <BatchOperations
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            onBatchStatusUpdate={handleBatchStatusUpdate}
            onBatchSourceUpdate={handleBatchSourceUpdate}
            onBatchDelete={() => setBatchDeleteDialogOpen(true)}
          />
        )}

        {/* Table */}
        <LeadTable
          leads={leads}
          loading={false}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={handleEditLead}
          onDelete={handleDeleteDialogOpen}
          onView={handleViewLead}
        />
        <LeadSheet open={sheetOpen} leadId={selectedLeadId} onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedLeadId(null);
        }} />

        {/* Lead Dialog */}
        {/* Assuming LeadDialog is a shadcn/ui Dialog or Sheet.
            If it's custom, it needs to be refactored as well.
            The 'open' prop and 'onClose' will likely change to 'open' and 'onOpenChange'.
        */}
        <LeadDialog
          open={dialogOpen}
          lead={selectedLead}
          onOpenChange={setDialogOpen} // Common pattern for shadcn/ui dialogs
          onClose={() => { // Keep if LeadDialog uses this, or adapt
            setDialogOpen(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o lead &quot;{selectedLead?.name}&quot;?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLead}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Delete Confirmation Dialog */}
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedIds.length} leads selecionados?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchDelete}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Excluir {selectedIds.length} leads
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Importação */}
        {importDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" onClick={() => setImportDialogOpen(false)}>&times;</button>
              <h2 className="text-lg font-bold mb-2">Importar Leads via CSV</h2>
              <form onSubmit={handleImportCSV} className="space-y-4">
                <input type="file" accept=".csv" ref={fileInputRef} required disabled={importing} />
                <div>
                  <a href="/leads_template.csv" download className="text-primary underline text-sm">Baixar template CSV</a>
                </div>
                <Button type="submit" disabled={importing}>
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
              </form>
              {importResult && <div className="mt-4 text-sm">{importResult}</div>}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}