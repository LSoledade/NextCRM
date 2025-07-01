'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';

export default function StudentsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Actions Header */}
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Novo Aluno
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Página de Alunos
          </h2>
          <p className="text-muted-foreground text-center">
            Esta página será implementada em breve.<br />
            Aqui você poderá gerenciar todos os seus alunos.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
