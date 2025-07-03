'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Paperclip, FileText, MoreVertical, Phone, Video, SendHorizonal, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Lead = Database['public']['Tables']['leads']['Row'];
type Message = Database['public']['Tables']['whatsapp_messages']['Row'];

interface WhatsappChatViewProps {
  leadId: string | null;
}

const MediaMessage = ({ msg }: { msg: Message }) => {
  // ... (código do MediaMessage permanece o mesmo)
};

function WhatsappChatView({ leadId }: WhatsappChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading: isLoadingLead } = useQuery<Lead | null>({
    queryKey: ['lead_details', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (error) throw new Error("Falha ao buscar detalhes do lead.");
      return data;
    },
    enabled: !!leadId,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
      queryKey: ['whatsapp_messages', leadId],
      queryFn: async () => {
          if (!leadId) return [];
          const { data, error } = await supabase
              .from('whatsapp_messages')
              .select('*')
              .eq('lead_id', leadId)
              .order('message_timestamp', { ascending: true });
          if (error) throw new Error("Falha ao carregar mensagens.");
          return data;
      },
      enabled: !!leadId,
      refetchOnWindowFocus: true,
      refetchInterval: 5000, // Refresh every 5 seconds as fallback
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!leadId) return;

    console.log(`🔄 Setting up realtime subscription for lead: ${leadId}`);
    
    const channel = supabase
      .channel(`whatsapp_messages_${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          console.log('📨 New message received via realtime:', payload.new);
          // Invalidate and refetch messages for this lead
          queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', leadId] });
          // Also invalidate chat list to update last message
          queryClient.invalidateQueries({ queryKey: ['whatsapp_chat_list'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          console.log('📝 Message updated via realtime:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', leadId] });
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime subscription status for ${leadId}:`, status);
      });

    return () => {
      console.log(`🔌 Removing realtime subscription for lead: ${leadId}`);
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !lead?.phone || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); // Optimistically clear input
    
    try {
      console.log('📤 Sending message:', { to: lead.phone, text: messageText });
      
      const formData = new FormData();
      formData.append('to', lead.phone);
      formData.append('lead_id', lead.id);
      formData.append('text', messageText);
      
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }
      
      console.log('✅ Message sent successfully:', result);
      
      // Force refresh messages after successful send
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', leadId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_chat_list'] });
      
      toast({ 
        title: 'Mensagem enviada', 
        description: 'Sua mensagem foi enviada com sucesso.',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
      toast({ 
        title: 'Erro ao enviar', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSending(false);
    }
  };
  
  const formatMessageTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!leadId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20">
        <div className="text-center space-y-3">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-muted-foreground">Selecione uma conversa</h2>
          <p className="text-muted-foreground max-w-md">Escolha uma conversa na lista à esquerda para começar.</p>
        </div>
      </div>
    );
  }

  if (isLoadingLead || isLoadingMessages) {
      return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-card"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1"><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-20" /></div></div>
            <div className="flex-1 p-4 space-y-3"><Skeleton className="h-16 w-3/4 rounded-2xl bg-muted" /><Skeleton className="h-12 w-1/2 ml-auto rounded-2xl bg-primary/20" /><Skeleton className="h-20 w-2/3 rounded-2xl bg-muted" /></div>
            <div className="flex items-center gap-2 px-4 py-3 border-t bg-card"><Skeleton className="flex-1 h-10 rounded-full" /><Skeleton className="h-9 w-9 rounded-full" /></div>
        </div>
      );
  }

  if (!lead) return <div className="p-4 text-center text-destructive">Lead não encontrado.</div>;

  return (
    <div className="flex flex-col h-full bg-background">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shadow-sm">
            <Avatar className="h-12 w-12"><AvatarImage src={undefined} alt={lead.name || 'L'} /><AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">{lead.name?.charAt(0).toUpperCase() || 'L'}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{lead.name || 'Sem nome'}</h3><p className="text-sm text-muted-foreground truncate">{lead.phone}</p></div>
            <div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-9 w-9"><Phone className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button></div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/20">
            {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.is_from_lead ? "justify-start" : "justify-end")}>
                    <div className={cn("rounded-2xl px-4 py-2 max-w-[75%] shadow-sm", msg.is_from_lead ? "bg-white dark:bg-muted" : "bg-primary text-primary-foreground")}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message_content}</p>
                        <p className={cn("text-xs mt-1 text-right", msg.is_from_lead ? "text-muted-foreground" : "text-primary-foreground/70")}>{formatMessageTime(msg.message_timestamp)}</p>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-4 py-3 border-t bg-card">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite uma mensagem..." className="rounded-full" disabled={sending} autoComplete="off"/>
            <Button type="submit" size="icon" className="h-9 w-9 rounded-full" disabled={!newMessage.trim() || sending}>
                {sending ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            </Button>
        </form>
    </div>
  );
}

export default WhatsappChatView;