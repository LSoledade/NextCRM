'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
  hasSearchTerm: boolean;
  onCreateLead: () => void;
}

export default function EmptyState({ 
  hasFilters, 
  hasSearchTerm, 
  onCreateLead 
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Users className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">Nenhum lead encontrado</h3>
      <p className="mt-2 text-muted-foreground">
        {hasFilters || hasSearchTerm
          ? 'Tente ajustar os filtros ou termo de busca.' 
          : 'Comece criando seu primeiro lead.'}
      </p>
      {!hasFilters && !hasSearchTerm && (
        <Button className="mt-4" onClick={onCreateLead}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Criar primeiro lead
        </Button>
      )}
    </div>
  );
}