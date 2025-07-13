'use client';

import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface LoadingAndErrorStatesProps {
  authLoading: boolean;
  leadsLoading: boolean;
  leadsError: any;
}

export default function LoadingAndErrorStates({
  authLoading,
  leadsLoading,
  leadsError
}: LoadingAndErrorStatesProps) {
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <span className="ml-2">Carregando autenticação...</span>
      </div>
    );
  }

  if (leadsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <span className="ml-2">Carregando leads...</span>
      </div>
    );
  }

  if (leadsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar leads: {leadsError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}