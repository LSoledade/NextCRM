'use client';

import React, { useState, useEffect } from 'react';
import WhatsappChat from '@/components/Leads/WhatsappChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

type Lead = Database['public']['Tables']['leads']['Row'];

interface WhatsappChatViewProps {
  leadId: string | null;
}

export function WhatsappChatView({ leadId }: WhatsappChatViewProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }

    const fetchLead = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) {
        console.error('Error fetching lead:', error);
        setError('Falha ao carregar os dados do lead.');
        setLead(null);
      } else {
        setLead(data);
      }
      setLoading(false);
    };

    fetchLead();
  }, [leadId]);

  if (!leadId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Selecione uma conversa</h2>
          <p className="text-muted-foreground">
            Escolha uma conversa na lista à esquerda para começar a conversar.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent className="flex-grow p-4 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
            </CardContent>
        </Card>
    )
  }

  if (error) {
     return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-semibold">Erro</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!lead) {
      return null; // Should not happen if not loading and no error, but good practice
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat com {lead.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        <WhatsappChat lead={lead} />
      </CardContent>
    </Card>
  );
}
