'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress'; // Or a custom spinner component
import { PlusCircle, Download, Upload, AlertTriangle, CheckCircle, XCircle, Clock, Users, Tag } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TagManagement from '@/components/Leads/TagManagement';

const LeadSheet = dynamic(() => import('@/components/Leads/LeadSheet'), { ssr: false });

type Lead = Database['public']['Tables']['leads']['Row'] & {
  is_student?: boolean;
};
type InsertLead = Database['public']['Tables']['leads']['Insert'];
// Adicionar Type UpdateLead se for diferente de InsertLead e usado em handleUpdateLead
type UpdateLead = Database['public']['Tables']['leads']['Update'];

interface FilterState {
  source: string;
  status: string;
  campaign: string;
  company: string;
  startDate: string;
  endDate: string;
  tag: string;
  dateRange: string;
}

export default function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Add queryClient for cache invalidation
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Debounce para searchTerm
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const [filters, setFilters] = useState<FilterState>({
    source: '',
    status: '',
    campaign: '',
    company: '',
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
    
    // Buscar todos os leads com informação de estudante usando LEFT JOIN
    let query = supabase
      .from('leads')
      .select(`
        *,
        students(id)
      `)
      .order('created_at', { ascending: false });

    // Se o usuário não for admin, filtrar apenas seus leads
    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    if (filters.source) query = query.eq('source', filters.source);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.campaign) query = query.eq('campaign', filters.campaign);
    if (filters.company) query = query.eq('company', filters.company);
    if (filters.tag) query = query.contains('tags', [filters.tag]);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString().split('T')[0]);
    }
    if (debouncedSearchTerm) {
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Adicionar campo is_student baseado na existência de registro na tabela students
    return (data || []).map(lead => ({
      ...lead,
      is_student: !!(lead as any).students?.length
    }));
  };

  // useQuery para leads
  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError: leadsError,
    // refetch: refetchLeads, // refetchLeads não é mais necessário diretamente aqui, a invalidação cuidará disso
  } = useQuery({
    queryKey: ['leads', user?.id, filters, debouncedSearchTerm],
    queryFn: fetchLeads,
    enabled: !authLoading && !!user,
    // refetchOnWindowFocus: false, // Opcional: desabilitar refetch em foco da janela se causar problemas
  });

  // Instanciar os hooks de mutação
  const createLeadMutation = useCreateLeadMutation(user?.id);
  const updateLeadMutation = useUpdateLeadMutation(user?.id, user?.role);
  const deleteLeadMutation = useDeleteLeadMutation(user?.id, user?.role);
  const batchUpdateLeadsStatusMutation = useBatchUpdateLeadsStatusMutation(user?.id, user?.role);
  const batchUpdateLeadsSourceMutation = useBatchUpdateLeadsSourceMutation(user?.id, user?.role);
  const batchDeleteLeadsMutation = useBatchDeleteLeadsMutation(user?.id, user?.role);

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

  const handleSaveLead = async (leadData: InsertLead, isStudent?: boolean) => {
    let savedLeadId = null;
    
    if (selectedLead) {
      // Atualizar lead existente
      await handleUpdateLead(leadData);
      savedLeadId = selectedLead.id;
      
      // Gerenciar status de aluno
      if (isStudent !== undefined) {
        const currentIsStudent = selectedLead.is_student || false;
        
        if (isStudent && !currentIsStudent) {
          // Criar registro de aluno
          const { error } = await supabase
            .from('students')
            .insert({
              lead_id: selectedLead.id,
              user_id: user?.id
            });
          if (error) throw error;
        } else if (!isStudent && currentIsStudent) {
          // Remover registro de aluno
          const { error } = await supabase
            .from('students')
            .delete()
            .eq('lead_id', selectedLead.id)
            .eq('user_id', user?.id);
          if (error) throw error;
        }
      }
    } else {
      // Criar novo lead
      const leadToCreate = { ...leadData, user_id: user?.id || '' };
      
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert(leadToCreate)
        .select()
        .single();
        
      if (error) throw error;
      savedLeadId = newLead.id;
      
      // Se marcado como aluno, criar registro
      if (isStudent && savedLeadId) {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            lead_id: savedLeadId,
            user_id: user?.id
          });
        if (studentError) throw studentError;
      }
      
      toast({ title: 'Lead criado com sucesso!', variant: 'default' });
    }
    
    // Invalidar cache para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ['leads'] });
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
        company: (l as any).company || '',
        status: l.status,
        source: l.source || '',
        is_student: (l as any).is_student ? 'true' : 'false',
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
  const [importProgress, setImportProgress] = useState(0);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [importErrors, setImportErrors] = useState<Array<{ line: number; error: string }>>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para importar leads via CSV com processamento assíncrono
  const handleImportCSV = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return;
    
    const file = fileInputRef.current.files[0];
    setImporting(true);
    setImportResult(null);
    setImportErrors([]);
    setImportProgress(0);
    setProcessedRows(0);
    setTotalRows(0);
    setImportStatus('parsing');

    try {
      // Step 1: Parse CSV com streaming para não travar UI
      const csvData: any[] = [];
      let rowCount = 0;

      await new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          step: (row: any) => {
            rowCount++;
            if (row.data && Object.keys(row.data).length > 0) {
              csvData.push(row.data);
            }
            // Update progress durante parsing
            if (rowCount % 100 === 0) {
              setTotalRows(rowCount);
            }
          },
          complete: () => {
            setTotalRows(csvData.length);
            resolve();
          },
          error: (error: any) => {
            reject(new Error(`Erro ao processar CSV: ${error.message}`));
          }
        });
      });

      setImportStatus('uploading');

      // Step 2: Enviar para processamento assíncrono em chunks
      const CHUNK_SIZE = 1000;
      const chunks = [];
      
      for (let i = 0; i < csvData.length; i += CHUNK_SIZE) {
        chunks.push(csvData.slice(i, i + CHUNK_SIZE));
      }

      // Iniciar job de importação
      console.log('Iniciando job de importação...', { totalRows: csvData.length, totalChunks: chunks.length, userId: user?.id });
      const initResponse = await fetch('/api/leads/import/batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          totalRows: csvData.length,
          totalChunks: chunks.length,
          userId: user?.id
        })
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        console.error('Erro ao inicializar importação:', errorData);
        throw new Error(errorData.error || 'Falha ao inicializar importação');
      }

      const { jobId } = await initResponse.json();
      console.log('Job criado com ID:', jobId);
      setImportJobId(jobId);
      setImportStatus('processing');

      // Enviar chunks sequencialmente com retry
      console.log('Enviando chunks...', chunks.length);
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processando chunk ${i + 1}/${chunks.length}`);
        await processChunkWithRetry(chunks[i], jobId, i);
        setProcessedRows((i + 1) * CHUNK_SIZE);
        setImportProgress(((i + 1) / chunks.length) * 100);
      }

      console.log('Finalizando job...');
      // Finalizar job
      const completeResponse = await fetch('/api/leads/import/batch/complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId })
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        console.error('Erro ao finalizar job:', errorData);
      }

      console.log('Iniciando polling...');
      // Iniciar polling para status final
      startPolling(jobId);

    } catch (error: any) {
      setImportStatus('error');
      setImportResult(`Erro: ${error.message}`);
      toast({ title: 'Erro ao importar leads', description: error.message, variant: 'destructive' });
      setImporting(false);
    }
  };

  // Função para processar chunk com retry
  const processChunkWithRetry = async (chunk: any[], jobId: string, chunkIndex: number, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Enviando chunk ${chunkIndex}, tentativa ${attempt}`);
        const response = await fetch('/api/leads/import/batch/chunk', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId,
            chunkIndex,
            data: chunk
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Chunk ${chunkIndex} processado com sucesso:`, result);
          return; // Sucesso
        }

        const errorData = await response.json();
        console.error(`Erro no chunk ${chunkIndex}, tentativa ${attempt}:`, errorData);
        if (attempt === maxRetries) {
          throw new Error(errorData.error || 'Falha ao processar chunk');
        }

        // Backoff exponencial
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } catch (error) {
        console.error(`Erro no chunk ${chunkIndex}, tentativa ${attempt}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  // Polling para acompanhar progresso do job
  const startPolling = (jobId: string) => {
    console.log('Iniciando polling para jobId:', jobId);
    let pollCount = 0;
    const maxPolls = 150; // 5 minutos máximo (150 * 2s = 300s)
    
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        console.error('Timeout do polling atingido');
        setImportStatus('error');
        setImportResult('Timeout: A importação demorou mais que o esperado. Verifique o console para mais detalhes.');
        toast({ 
          title: 'Timeout da importação', 
          description: 'A importação demorou mais que o esperado. Verifique se os dados foram importados.',
          variant: 'destructive' 
        });
        setImporting(false);
        stopPolling();
        return;
      }
      
      try {
        console.log(`Verificando status do job (${pollCount}/${maxPolls}):`, jobId);
        const response = await fetch(`/api/leads/import/batch/status/${jobId}`);
        if (!response.ok) {
          console.error('Erro ao buscar status:', response.status, response.statusText);
          if (response.status === 401) {
            setImportStatus('error');
            setImportResult('Erro de autenticação. Faça login novamente.');
            toast({ title: 'Erro de autenticação', description: 'Faça login novamente.', variant: 'destructive' });
            setImporting(false);
            stopPolling();
          }
          return;
        }

        const status = await response.json();
        console.log('Status atual do job:', status);
        
        setProcessedRows(status.processedRows);
        setImportProgress((status.processedRows / status.totalRows) * 100);

        if (status.errors && status.errors.length > 0) {
          setImportErrors(status.errors);
        }

        if (status.status === 'completed') {
          console.log('Importação concluída!');
          setImportStatus('completed');
          setImportResult(`Importação concluída: ${status.successCount} leads importados com sucesso.`);
          toast({ 
            title: 'Importação concluída!', 
            description: `${status.successCount} leads importados. ${status.errorCount || 0} erros.`,
            variant: 'default' 
          });
          setImporting(false);
          stopPolling();
          
          // Invalidar cache de leads para recarregar a lista
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        } else if (status.status === 'failed') {
          console.log('Importação falhou!');
          setImportStatus('error');
          setImportResult(`Erro na importação: ${status.error || 'Erro desconhecido'}`);
          toast({ title: 'Erro na importação', description: status.error || 'Erro desconhecido', variant: 'destructive' });
          setImporting(false);
          stopPolling();
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        if (pollCount > 5) { // Só mostrar erro após algumas tentativas
          setImportStatus('error');
          setImportResult(`Erro de comunicação: ${error}`);
          setImporting(false);
          stopPolling();
        }
      }
    }, 2000); // Poll a cada 2 segundos
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Reset import state when dialog closes
  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    if (!importing) {
      setImportStatus('idle');
      setImportResult(null);
      setImportErrors([]);
      setImportProgress(0);
      setProcessedRows(0);
      setTotalRows(0);
      setImportJobId(null);
      stopPolling();
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

  const handleSelectAll = () => {
    const allLeadIds = leads.map(lead => lead.id);
    setSelectedIds(allLeadIds);
    toast({ title: `${allLeadIds.length} leads selecionados`, variant: 'default' });
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
        <Tabs defaultValue="leads" className="w-full">
          <TabsList>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Gerenciar Tags
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="leads" className="space-y-6">
            {/* Actions Header */}
            <div className="flex items-center justify-start gap-2">
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

            {/* Filtros e pesquisa centralizados no FilterPanel */}
            <FilterPanel
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={filters}
              onFiltersChange={setFilters}
              availableTags={availableTags}
              showCompanyFilter
              showSourceFilter
              showStatusFilter
              showCampaignFilter
              showTagFilter
              showDateFilter
            />

            {/* Batch Operations */}
            {selectedIds.length > 0 && (
              <BatchOperations
                selectedCount={selectedIds.length}
                totalCount={leads.length}
                onClearSelection={() => setSelectedIds([])}
                onSelectAll={handleSelectAll}
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
          </TabsContent>
          
          <TabsContent value="tags">
            <TagManagement />
          </TabsContent>
        </Tabs>
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
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-lg relative">
              <button 
                className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" 
                onClick={handleCloseImportDialog}
                disabled={importing}
              >
                &times;
              </button>
              <h2 className="text-lg font-bold mb-4">Importar Leads via CSV</h2>
              
              {/* Status do Import */}
              {importStatus !== 'idle' && (
                <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    {importStatus === 'parsing' && <Clock className="w-4 h-4 text-blue-500" />}
                    {importStatus === 'uploading' && <Upload className="w-4 h-4 text-blue-500" />}
                    {importStatus === 'processing' && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                    {importStatus === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {importStatus === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm font-medium">
                      {importStatus === 'parsing' && 'Analisando arquivo...'}
                      {importStatus === 'uploading' && 'Preparando importação...'}
                      {importStatus === 'processing' && 'Processando leads...'}
                      {importStatus === 'completed' && 'Importação concluída!'}
                      {importStatus === 'error' && 'Erro na importação'}
                    </span>
                  </div>
                  
                  {/* Barra de Progresso */}
                  {(importStatus === 'processing' || importStatus === 'completed') && (
                    <div className="space-y-2">
                      <Progress value={importProgress} className="w-full" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{processedRows} de {totalRows} processados</span>
                        <span>{Math.round(importProgress)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form de Upload */}
              {importStatus === 'idle' && (
                <form onSubmit={handleImportCSV} className="space-y-4">
                  <div>
                    <input 
                      type="file" 
                      accept=".csv" 
                      ref={fileInputRef} 
                      required 
                      disabled={importing}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Arquivos CSV até 50MB. Suporte para até 50.000 leads.
                    </p>
                  </div>
                  <div>
                    <a href="/leads_template.csv" download className="text-primary underline text-sm">
                      Baixar template CSV
                    </a>
                  </div>
                  <Button type="submit" disabled={importing} className="w-full">
                    {importing ? 'Processando...' : 'Iniciar Importação'}
                  </Button>
                </form>
              )}

              {/* Resultado da Importação */}
              {importResult && (
                <div className={`mt-4 p-3 rounded-lg ${importStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800'}`}>
                  <p className={`text-sm ${importStatus === 'error' ? 'text-red-700 dark:text-red-300' : ''}`}>{importResult}</p>
                  {importStatus === 'error' && (
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setImportStatus('idle');
                          setImportResult(null);
                          setImportErrors([]);
                          setImportProgress(0);
                          setProcessedRows(0);
                          setTotalRows(0);
                          setImportJobId(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        Tentar Novamente
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => console.log('Debug info:', { importJobId, importStatus, processedRows, totalRows })}
                      >
                        Debug Info
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Erros de Importação */}
              {importErrors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 text-red-600">
                    Erros encontrados ({importErrors.length}):
                  </h4>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {importErrors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-red-600">
                        Linha {error.line}: {error.error}
                      </div>
                    ))}
                    {importErrors.length > 10 && (
                      <div className="text-muted-foreground">
                        ... e mais {importErrors.length - 10} erros
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              {importStatus === 'completed' && (
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCloseImportDialog}
                  >
                    Fechar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setImportStatus('idle');
                      setImportResult(null);
                      setImportErrors([]);
                      setImportProgress(0);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Nova Importação
                  </Button>
                </div>
              )}

              {importStatus === 'error' && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setImportStatus('idle');
                      setImportResult(null);
                      setImportErrors([]);
                      setImportProgress(0);
                    }}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}