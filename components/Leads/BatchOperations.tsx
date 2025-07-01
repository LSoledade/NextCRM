'use client';

import { Button } from '@/components/ui/button';
import {
  OptimizedSelect,
  OptimizedSelectContent,
  OptimizedSelectItem,
  OptimizedSelectTrigger,
  OptimizedSelectValue,
} from '@/components/ui/optimized-select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchOperationsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchStatusUpdate: (status: string) => void;
  onBatchSourceUpdate: (source: string) => void;
  onBatchDelete: () => void;
}

export default function BatchOperations({
  selectedCount,
  onClearSelection,
  onBatchStatusUpdate,
  onBatchSourceUpdate,
  onBatchDelete,
}: BatchOperationsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="p-4 mb-6 space-y-3 border rounded-lg md:space-y-0 md:flex md:items-center md:justify-between md:gap-4 bg-primary/5 border-primary/20"
    >
      <div className="flex items-center gap-3">
        <Badge variant="default" className="text-sm">
          {selectedCount}
        </Badge>
        <span className="text-sm font-medium text-primary">
          {selectedCount === 1 ? 'lead selecionado' : 'leads selecionados'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-xs text-primary hover:bg-primary/10"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Limpar
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-[180px] dropdown-fix">
          <Label htmlFor="batchStatus" className="sr-only">Alterar Status</Label>
          <OptimizedSelect onValueChange={onBatchStatusUpdate}>
            <OptimizedSelectTrigger id="batchStatus" className="h-9">
              <OptimizedSelectValue placeholder="Alterar Status para..." />
            </OptimizedSelectTrigger>
            <OptimizedSelectContent>
              <OptimizedSelectItem value="New">Novo</OptimizedSelectItem>
              <OptimizedSelectItem value="Contacted">Contatado</OptimizedSelectItem>
              <OptimizedSelectItem value="Converted">Convertido</OptimizedSelectItem>
              <OptimizedSelectItem value="Lost">Perdido</OptimizedSelectItem>
            </OptimizedSelectContent>
          </OptimizedSelect>
        </div>
        
        <div className="min-w-[180px] dropdown-fix">
          <Label htmlFor="batchSource" className="sr-only">Alterar Origem</Label>
          <OptimizedSelect onValueChange={onBatchSourceUpdate}>
            <OptimizedSelectTrigger id="batchSource" className="h-9">
              <OptimizedSelectValue placeholder="Alterar Origem para..." />
            </OptimizedSelectTrigger>
            <OptimizedSelectContent>
              <OptimizedSelectItem value="Instagram">Instagram</OptimizedSelectItem>
              <OptimizedSelectItem value="Facebook">Facebook</OptimizedSelectItem>
              <OptimizedSelectItem value="Site">Site</OptimizedSelectItem>
              <OptimizedSelectItem value="Indicação">Indicação</OptimizedSelectItem>
              <OptimizedSelectItem value="WhatsApp">WhatsApp</OptimizedSelectItem>
              <OptimizedSelectItem value="Google Ads">Google Ads</OptimizedSelectItem>
            </OptimizedSelectContent>
          </OptimizedSelect>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onBatchDelete}
          className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:text-red-500 dark:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir ({selectedCount})
        </Button>
      </div>
    </div>
  );
}