'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Upload } from 'lucide-react';

interface LeadsActionsProps {
  onImport: () => void;
  onExport: () => void;
  onNewLead: () => void;
  hasLeads: boolean;
}

export default function LeadsActions({ 
  onImport, 
  onExport, 
  onNewLead, 
  hasLeads 
}: LeadsActionsProps) {
  return (
    <div className="flex items-center justify-start gap-2">
      <Button variant="outline" size="sm" onClick={onImport}>
        <Download className="w-4 h-4 mr-2" />
        Importar
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        disabled={!hasLeads} 
        onClick={onExport}
      >
        <Upload className="w-4 h-4 mr-2" />
        Exportar
      </Button>
      <Button size="sm" onClick={onNewLead}>
        <PlusCircle className="w-4 h-4 mr-2" />
        Novo Lead
      </Button>
    </div>
  );
}