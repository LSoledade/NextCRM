'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import {
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useBatchUpdateLeadsStatusMutation,
  useBatchUpdateLeadsSourceMutation,
  useBatchDeleteLeadsMutation,
} from '@/hooks/useLeadMutations';
import { useLeadsPagination, useLeadsStats } from '@/hooks/useLeadsPagination';
import Papa from 'papaparse';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  is_student?: boolean;
};
type InsertLead = Database['public']['Tables']['leads']['Insert'];
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

export function useLeadsManager() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados do componente
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Estados de paginação e ordenação
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Estados de filtros
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

  // Debounce para searchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
    setSelectedIds([]);
  }, [filters.source, filters.status, filters.campaign, filters.company, filters.tag, filters.startDate, filters.endDate, debouncedSearchTerm]);

  // Fetch leads with pagination
  const {
    data: paginatedData,
    isLoading: leadsLoading,
    isError: leadsError,
    refetch
  } = useLeadsPagination(
    user?.id,
    user?.role,
    {
      page: currentPage,
      pageSize,
      sortBy,
      sortOrder,
      filters: filters,
      searchTerm: debouncedSearchTerm
    }
  );

  // Extract data from pagination response
  const leads = paginatedData?.data || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 0;
  const hasNextPage = paginatedData?.hasNextPage || false;
  const hasPreviousPage = paginatedData?.hasPreviousPage || false;

  // Fetch lead stats for dashboard
  const { data: leadStats } = useLeadsStats(
    user?.id,
    user?.role,
    filters,
    debouncedSearchTerm
  );

  // Instanciar os hooks de mutação
  const createLeadMutation = useCreateLeadMutation(user?.id);
  const updateLeadMutation = useUpdateLeadMutation(user?.id, user?.role);
  const deleteLeadMutation = useDeleteLeadMutation(user?.id, user?.role);
  const batchUpdateLeadsStatusMutation = useBatchUpdateLeadsStatusMutation(user?.id, user?.role);
  const batchUpdateLeadsSourceMutation = useBatchUpdateLeadsSourceMutation(user?.id, user?.role);
  const batchDeleteLeadsMutation = useBatchDeleteLeadsMutation(user?.id, user?.role);

  // Função para buscar todas as tags disponíveis
  const fetchAllTags = async () => {
    if (!user) return [];
    
    let query = supabase
      .from('leads')
      .select('tags');
      
    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return Array.from(
      new Set((data || []).flatMap(lead => lead.tags || []))
    ).sort();
  };
  
  // Query separada para tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ['available-tags', user?.id],
    queryFn: fetchAllTags,
    enabled: !authLoading && !!user,
  });

  // Handlers de paginação
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedIds([]);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(0);
    setSelectedIds([]);
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
    setCurrentPage(0);
  };

  // Handlers de CRUD
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

  // Handlers de UI
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

  const handleKanbanUpdate = (leadId: string, newStatus: Lead['status']) => {
    const leadToMove = leads.find(l => l.id === leadId);
    if (leadToMove && leadToMove.status !== newStatus) {
      updateLeadMutation.mutate(
        { id: leadId, status: newStatus },
        {
          onSuccess: () => {
            toast({ title: 'Lead atualizado com sucesso!', variant: 'default' });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          },
          onError: (error) => {
            toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
          },
        }
      );
    }
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

  // Handlers de operações em lote
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
    const allLeadIds = (leads || []).map((lead: any) => lead.id);
    setSelectedIds(allLeadIds);
    toast({ title: `${allLeadIds.length} leads selecionados`, variant: 'default' });
  };

  // Função para exportar leads filtrados para CSV
  const handleExportCSV = () => {
    if (!leads || leads.length === 0) return;
    const csv = Papa.unparse(
      leads.map((l: any) => ({
        name: l.name,
        email: l.email,
        phone: l.phone || '',
        company: l.company || '',
        status: l.status,
        source: l.source || '',
        is_student: l.is_student ? 'true' : 'false',
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

  return {
    // Estados
    user,
    authLoading,
    leads,
    leadsLoading,
    leadsError,
    leadStats,
    availableTags,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    searchTerm,
    debouncedSearchTerm,
    filters,
    selectedLead,
    selectedIds,
    dialogOpen,
    deleteDialogOpen,
    batchDeleteDialogOpen,
    sheetOpen,
    selectedLeadId,
    
    // Setters
    setSearchTerm,
    setFilters,
    setSelectedIds,
    setDialogOpen,
    setDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    setSheetOpen,
    setSelectedLead,
    setSelectedLeadId,
    
    // Handlers
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleCreateLead,
    handleUpdateLead,
    handleDeleteLead,
    handleBatchDelete,
    handleEditLead,
    handleDeleteDialogOpen,
    handleViewLead,
    handleKanbanUpdate,
    handleSaveLead,
    handleBatchStatusUpdate,
    handleBatchSourceUpdate,
    handleSelectAll,
    handleExportCSV,
    
    // Utilities
    router,
    refetch
  };
}