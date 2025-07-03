'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Paperclip, FileText, AlertCircle, Phone, MoreVertical, MessageCircle, ExternalLink, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ToastAction } from '../ui/toast';

type Message = Database['public']['Tables']['whatsapp_messages']['Row'];
interface WhatsappChatProps {
  lead: Database['public']['Tables']['leads']['Row'];
}

const MediaMessage = ({ msg }: { msg: Message }) => {
  if (!msg.media_url) return null;
  const commonClasses = "rounded-lg max-w-full h-auto shadow-sm";

  switch (msg.message_type) {
    case 'image': return <Image src={msg.media_url} alt="Imagem enviada" className={commonClasses} width={300} height={200} />;
    case 'video': return <video src={msg.media_url} controls className={commonClasses} />;
    case 'audio': return <audio src={msg.media_url} controls className="w-full" />;
    case 'document': return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
        <FileText className="w-5 h-5 text-blue-600" /> 
        <span className="text-sm font-medium">{msg.message_content || 'Documento'}</span>
      </a>
    );
    default: return null;
  }
};

// Componente de status de conexão atualizado
const ConnectionStatusAlert = () => {
  const { connectionStatus } = useWhatsAppConnection();

  if (connectionStatus.status === 'connected') {
    return null; // Não mostrar nada se estiver conectado
  }

  const getTitle = () => {
    if (connectionStatus.status === 'error') return 'Erro na Conexão WhatsApp';
    if (connectionStatus.status === 'disconnected') return 'WhatsApp Desconectado';
    return 'Conexão do WhatsApp indisponível';
  };

  const getDescription = () => {
    if (connectionStatus.status === 'error') {
      return `Erro: ${connectionStatus.error || 'Verifique o status do serviço.'}`;
    }
    return 'Conecte seu WhatsApp para enviar e receber mensagens.';
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        <div className="flex justify-between items-center">
          <div>
            <strong>{getTitle()}</strong>
            <p>{getDescription()}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/whatsapp">
              Verificar Conexão
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default function WhatsappChat({ lead }: WhatsappChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { connectionStatus } = useWhatsAppConnection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use React Query for messages instead of local state
  const { data: messages = [], isLoading: loading } = useQuery<Message[]>({
    queryKey: ['whatsapp_messages', lead.id],
    queryFn: async () => {
      if (!lead.phone) return [];
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('message_timestamp', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead.phone,
    refetchOnWindowFocus: true,
  });

  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), []);

  // Real-time subscription for messages
  useEffect(() => {
    if (!lead.phone) return;
    
    console.log(`🔄 Setting up realtime subscription for lead chat: ${lead.id}`);
    
    const channel = supabase
      .channel(`whatsapp_chat_${lead.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `lead_id=eq.${lead.id}`
        },
        (payload) => {
          console.log('📨 New message in chat via realtime:', payload.new);
          // Invalidate React Query cache to refetch messages
          queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', lead.id] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp_chat_list'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `lead_id=eq.${lead.id}`
        },
        (payload) => {
          console.log('📝 Message updated in chat via realtime:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', lead.id] });
        }
      )
      .subscribe((status) => {
        console.log(`📡 Chat realtime subscription status for ${lead.id}:`, status);
      });
    
    return () => {
      console.log(`🔌 Removing chat realtime subscription for lead: ${lead.id}`);
      supabase.removeChannel(channel);
    };
  }, [lead.id, lead.phone, queryClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFile(file);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    if (!lead.phone) {
      toast({ title: 'Erro', description: 'Este lead não possui um número de telefone.', variant: 'destructive' });
      return;
    }

    // 1. Verificar status da conexão antes de enviar
    if (connectionStatus.status !== 'connected') {
      toast({
        title: 'WhatsApp não conectado',
        description: 'É necessário estar conectado para enviar mensagens.',
        variant: 'destructive',
        action: (
          <ToastAction altText="Verificar Conexão">
            <Link href="/whatsapp">Verificar</Link>
          </ToastAction>
        ),
      });
      return;
    }

    setSending(true);
    const formData = new FormData();
    formData.append('to', lead.phone);
    formData.append('lead_id', lead.id);
    if (newMessage.trim()) formData.append('text', newMessage.trim());
    if (file) formData.append('file', file);
    
    try {
      const response = await fetch('/api/whatsapp/send', { 
        method: 'POST', 
        body: formData 
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }
      
      if (result.success) {
        setNewMessage('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        // Force refresh messages after successful send
        queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', lead.id] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp_chat_list'] });
        
        toast({
          title: 'Mensagem enviada',
          description: 'Sua mensagem foi enviada com sucesso',
        });
      } else {
        throw new Error(result.error || 'Falha no envio');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast({ title: 'Erro ao enviar', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!lead.phone) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center space-y-4">
          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Sem número de telefone</h3>
            <p className="text-sm text-muted-foreground">
              Este lead não possui um número de telefone cadastrado para conversar via WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full w-full">
      <CardHeader className="flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={undefined} />
            <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{lead.name}</CardTitle>
            <p className="text-sm text-gray-500">{lead.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><Phone className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon"><MoreVertical className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Alerta de conexão movido para cá */}
        <div className="p-4">
          <ConnectionStatusAlert />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                  <div className={cn(
                    "rounded-2xl p-3 max-w-[75%] space-y-2",
                    i % 2 === 0 ? "bg-white dark:bg-muted" : "bg-primary"
                  )}>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.is_from_lead ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "rounded-2xl px-4 py-2 max-w-[75%] shadow-sm",
                  msg.is_from_lead 
                    ? "bg-white dark:bg-muted text-foreground" 
                    : "bg-primary text-primary-foreground"
                )}>
                  <MediaMessage msg={msg} />
                  {msg.message_content && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.message_content}
                    </p>
                  )}
                  <p className={cn(
                    "text-xs mt-1 text-right",
                    msg.is_from_lead ? "text-muted-foreground" : "text-primary-foreground/70"
                  )}>
                    {new Date(msg.message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-white dark:bg-gray-900">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
              // 2. Desabilitar input se não estiver conectado
              disabled={connectionStatus.status !== 'connected' || sending}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={connectionStatus.status !== 'connected' || sending}>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button type="submit" size="icon" disabled={connectionStatus.status !== 'connected' || sending || (!newMessage.trim() && !file)}>
              {sending ? <div className="loader-sm" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          {file && (
            <Badge variant="secondary" className="flex items-center gap-1 mt-2">
              <FileText className="w-3 h-3" />
              <span className="text-xs truncate max-w-20">{file.name}</span>
              <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setFile(null);
                  if(fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                ×
              </Button>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
