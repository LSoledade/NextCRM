'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/Layout/AppLayout';
import LeadTable from '@/components/Leads/LeadTable';
import LeadDialog from '@/components/Leads/LeadDialog';
import FilterPanel from '@/components/Leads/FilterPanel';
import BatchOperations from '@/components/Leads/BatchOperations';
import TagManagement from '@/components/Leads/TagManagement';
import ImportDialog from '@/components/Leads/ImportDialog';
import LeadsActions from '@/components/Leads/LeadsActions';
import EmptyState from '@/components/Leads/EmptyState';
import DeleteConfirmationDialogs from '@/components/Leads/DeleteConfirmationDialogs';
import LoadingAndErrorStates from '@/components/Leads/LoadingAndErrorStates';
import { useLeadsManager } from '@/hooks/useLeadsManager';
import { useLeadImport } from '@/hooks/useLeadImport';
import { Users, Tag, Columns3 } from 'lucide-react';

const LeadSheet = dynamic(() => import('@/components/Leads/LeadSheet'), { ssr: false });
const KanbanViewDynamic = dynamic(() => import('@/components/Leads/KanbanView'), { ssr: false });

type Lead = Database['public']['Tables']['leads']['Row'] & {
  is_student?: boolean;
};
type InsertLead = Database['public']['Tables']['leads']['Insert'];
type UpdateLead = Database['public']['Tables']['leads']['Update'];

export default function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados da aba ativa
  const [activeTab, setActiveTab] = useState('leads');
  
  // Hook principal de gerenciamento de leads
  const {
    // Estados
    selectedIds,
    dialogOpen,
    selectedLead,
    deleteDialogOpen,
    batchDeleteDialogOpen,
    searchTerm,
    filters,
    sheetOpen,
    selectedLeadId,
    
    // Dados
    leads,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    leadsLoading,
    leadsError,
    leadStats,
    availableTags,
    
    // Handlers
    setSelectedIds,
    setDialogOpen,
    setSelectedLead,
    setDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    setSearchTerm,
    setFilters,
    setSheetOpen,
    setSelectedLeadId,
    handleCreateLead,
    handleUpdateLead,
    handleDeleteLead,
    handleBatchDelete,
    handleSaveLead,
    handleExportCSV,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleBatchStatusUpdate,
    handleBatchSourceUpdate,
    handleSelectAll,
    handleEditLead,
    handleDeleteDialogOpen,
    handleViewLead,
    
    // Paginação
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
  } = useLeadsManager();
  
  // Hook de importação
  const {
    importing,
    importResult,
    importProgress,
    importStatus,
    importErrors,
    totalRows,
    processedRows,
    fileInputRef,
    handleImportCSV,
    resetImportState,
  } = useLeadImport();

  // Estados locais para o dialog de importação
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    if (!importing) {
      resetImportState();
    }
  };

  const handleKanbanUpdate = (leadId: string, newStatus: Lead['status']) => {
    handleUpdateLead({ id: leadId, status: newStatus });
  };

  // Redireciona para login se não estiver autenticado e não está carregando
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  // Estados de carregamento e erro
  if (authLoading || leadsLoading || leadsError) {
    return (
      <LoadingAndErrorStates
        authLoading={authLoading}
        leadsLoading={leadsLoading}
        leadsError={leadsError}
      />
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Columns3 className="w-4 h-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Gerenciar Tags
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="leads" className="space-y-6">
            {/* Actions Header */}
            <LeadsActions
              onImport={() => setImportDialogOpen(true)}
              onExport={handleExportCSV}
              onNewLead={() => {
                setSelectedLead(null);
                setDialogOpen(true);
              }}
              hasLeads={!!(leads && leads.length > 0)}
            />

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
                totalCount={leads?.length || 0}
                onClearSelection={() => setSelectedIds([])}
                onSelectAll={handleSelectAll}
                onBatchStatusUpdate={handleBatchStatusUpdate}
                onBatchSourceUpdate={handleBatchSourceUpdate}
                onBatchDelete={() => setBatchDeleteDialogOpen(true)}
              />
            )}

            {/* Table */}
            {!leadsLoading && (!leads || leads.length === 0) ? (
              <EmptyState
                hasFilters={Object.values(filters).some(f => f)}
                hasSearchTerm={!!searchTerm}
                onCreateLead={() => {
                  setSelectedLead(null);
                  setDialogOpen(true);
                }}
              />
            ) : (
              <LeadTable
                leads={leads || []}
                loading={leadsLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onEdit={handleEditLead}
                onDelete={handleDeleteDialogOpen}
                onView={handleViewLead}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={pageSize}
                totalPages={totalPages}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}
          </TabsContent>
          
          <TabsContent value="kanban">
            <KanbanViewDynamic 
              leads={leads || []} 
              onUpdateLead={handleKanbanUpdate} 
              stats={leadStats || { totalCount: 0, statusCounts: {} }}
            />
          </TabsContent>

          <TabsContent value="tags">
            <TagManagement />
          </TabsContent>
        </Tabs>
        
        <LeadSheet 
          open={sheetOpen} 
          leadId={selectedLeadId} 
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setSelectedLeadId(null);
          }} 
        />

        <LeadDialog
          open={dialogOpen}
          lead={selectedLead}
          onOpenChange={setDialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
        />

        <DeleteConfirmationDialogs
          deleteDialogOpen={deleteDialogOpen}
          onDeleteDialogOpenChange={setDeleteDialogOpen}
          selectedLead={selectedLead}
          onDeleteLead={handleDeleteLead}
          batchDeleteDialogOpen={batchDeleteDialogOpen}
          onBatchDeleteDialogOpenChange={setBatchDeleteDialogOpen}
          selectedCount={selectedIds.length}
          onBatchDelete={handleBatchDelete}
        />

        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
        />
      </div>
    </AppLayout>
  );
}