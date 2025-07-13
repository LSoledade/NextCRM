'use client';

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
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];

interface DeleteConfirmationDialogsProps {
  // Single delete dialog
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  selectedLead: Lead | null;
  onDeleteLead: () => void;
  
  // Batch delete dialog
  batchDeleteDialogOpen: boolean;
  onBatchDeleteDialogOpenChange: (open: boolean) => void;
  selectedCount: number;
  onBatchDelete: () => void;
}

export default function DeleteConfirmationDialogs({
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  selectedLead,
  onDeleteLead,
  batchDeleteDialogOpen,
  onBatchDeleteDialogOpenChange,
  selectedCount,
  onBatchDelete
}: DeleteConfirmationDialogsProps) {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
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
              onClick={onDeleteLead}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={onBatchDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} leads selecionados?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBatchDelete}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Excluir {selectedCount} leads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}