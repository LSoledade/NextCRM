'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  FileDownload,
  FileUpload,
} from '@mui/icons-material';
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
import LeadTable from '@/components/Leads/LeadTable';
import LeadDialog from '@/components/Leads/LeadDialog';
import FilterPanel from '@/components/Leads/FilterPanel';
import BatchOperations from '@/components/Leads/BatchOperations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type InsertLead = Database['public']['Tables']['leads']['Insert'];

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
  const { user } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  
  // Selection and editing
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
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

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const loadLeads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setError('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (leadData: InsertLead) => {
    if (!user) return;

    console.log('Criando lead para usuário:', user.id);
    console.log('Dados do lead:', leadData);

    try {
      // Verificar se o usuário existe na tabela users antes de criar o lead
      const { data: userExists, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Usuário não encontrado na tabela users:', userError);
        throw new Error('Perfil do usuário não encontrado. Tente fazer logout e login novamente.');
      }

      console.log('Usuário verificado:', userExists);

      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...leadData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      console.log('Lead criado com sucesso:', data);
      setLeads(prev => [data, ...prev]);
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      throw error;
    }
  };

  const handleUpdateLead = async (leadData: InsertLead) => {
    if (!selectedLead || !user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', selectedLead.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => 
        prev.map(lead => lead.id === selectedLead.id ? data : lead)
      );
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      throw error;
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead || !user) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== selectedLead.id));
      setDeleteDialogOpen(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
    }
  };

  const handleBatchStatusUpdate = async (status: string) => {
    if (!user || selectedIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: status as any })
        .in('id', selectedIds)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      setLeads(prev => 
        prev.map(lead => {
          const updated = data.find(d => d.id === lead.id);
          return updated || lead;
        })
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Erro ao atualizar status em lote:', error);
    }
  };

  const handleBatchSourceUpdate = async (source: string) => {
    if (!user || selectedIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ source })
        .in('id', selectedIds)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      setLeads(prev => 
        prev.map(lead => {
          const updated = data.find(d => d.id === lead.id);
          return updated || lead;
        })
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Erro ao atualizar origem em lote:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (!user || selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', user.id);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => !selectedIds.includes(lead.id)));
      setSelectedIds([]);
      setBatchDeleteDialogOpen(false);
    } catch (error) {
      console.error('Erro ao deletar leads em lote:', error);
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
    router.push(`/leads/${lead.id}`);
  };

  const handleSaveLead = async (leadData: InsertLead) => {
    if (selectedLead) {
      await handleUpdateLead(leadData);
    } else {
      await handleCreateLead(leadData);
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    // Search term filter
    const matchesSearch = searchTerm === '' ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Basic filters
    const matchesSource = filters.source === '' || lead.source === filters.source;
    const matchesStatus = filters.status === '' || lead.status === filters.status;
    const matchesCampaign = filters.campaign === '' || lead.source === filters.campaign;
    
    // Advanced filters
    const matchesState = filters.state === '' || (lead.phone && lead.phone.includes(filters.state));
    const matchesTag = filters.tag === '' || (lead.tags && lead.tags.includes(filters.tag));
    
    // Date filters
    let matchesDateRange = true;
    if (filters.startDate && filters.endDate) {
      const leadDate = new Date(lead.created_at);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      
      matchesDateRange = leadDate >= startDate && leadDate < endDate;
    } else if (filters.startDate) {
      const leadDate = new Date(lead.created_at);
      const startDate = new Date(filters.startDate);
      matchesDateRange = leadDate >= startDate;
    } else if (filters.endDate) {
      const leadDate = new Date(lead.created_at);
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      matchesDateRange = leadDate < endDate;
    }
    
    return matchesSearch && matchesSource && matchesStatus && matchesCampaign &&
           matchesState && matchesDateRange && matchesTag;
  });

  // Get unique tags for filter
  const availableTags = Array.from(
    new Set(leads.flatMap(lead => lead.tags || []))
  ).sort();

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Carregando leads...
            </Typography>
          </Box>
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="600">
            Leads
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
              size="small"
            >
              Importar
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              size="small"
              disabled={filteredLeads.length === 0}
            >
              Exportar
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setSelectedLead(null);
                setDialogOpen(true);
              }}
            >
              Novo Lead
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <FilterPanel
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={availableTags}
        />

        {/* Batch Operations */}
        <BatchOperations
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBatchStatusUpdate={handleBatchStatusUpdate}
          onBatchSourceUpdate={handleBatchSourceUpdate}
          onBatchDelete={() => setBatchDeleteDialogOpen(true)}
        />

        {/* Table */}
        <LeadTable
          leads={filteredLeads}
          loading={false}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={handleEditLead}
          onDelete={handleDeleteDialogOpen}
          onView={handleViewLead}
        />

        {/* Lead Dialog */}
        <LeadDialog
          open={dialogOpen}
          lead={selectedLead}
          onClose={() => {
            setDialogOpen(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
              Tem certeza que deseja excluir o lead "{selectedLead?.name}"?
              Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLead}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Delete Confirmation Dialog */}
        <AlertDialog
          open={batchDeleteDialogOpen}
          onOpenChange={setBatchDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
              <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.length} leads selecionados?
              Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBatchDeleteDialogOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleBatchDelete}>
                Excluir {selectedIds.length} leads
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Box>
    </AppLayout>
  );
}