'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Paperclip, FileText, AlertCircle, MoreVertical, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'];
type Message = Database['public']['Tables']['whatsapp_messages']['Row'];

interface WhatsappChatViewProps {
  leadId: string | null;
}

const MediaMessage = ({ msg }: { msg: Message }) => {
  if (!msg.media_url) return null;
  const commonClasses = "rounded-lg max-w-full h-auto";

  switch (msg.message_type) {
    case 'image': 
      return <Image src={msg.media_url} alt="Imagem enviada" className={commonClasses} width={300} height={200} />;
    case 'video': 
      return <video src={msg.media_url} controls className={commonClasses} />;
    case 'audio': 
      return <audio src={msg.media_url} controls className="w-full" />;
    case 'document': 
      return (
        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" 
           className="flex items-center gap-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
          <FileText className="w-6 h-6" /> 
          <span>{msg.message_content || 'Documento'}</span>
        </a>
      );
    default: 
      return null;
  }
};

const ConnectionStatus = () => {
  const [status, setStatus] = useState({ type: 'loading', qr: null });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setStatus({ type: data.status, qr: data.qr });
      } catch {
        setStatus({ type: 'error', qr: null });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (status.type === 'connected') return null;

  return (
    <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400">
      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">WhatsApp Desconectado</span>
      </div>
      {status.qr && (
        <div className="mt-3 flex justify-center">
          <Image src={status.qr} alt="Escaneie para conectar" width={200} height={200} className="rounded-lg" />
        </div>
      )}
      {!status.qr && status.type !== 'loading' && (
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
          Aguardando conexão... Verifique o terminal do servidor se o QR Code não aparecer aqui.
        </p>
      )}
    </div>
  );
};

function WhatsappChatView({ leadId }: WhatsappChatViewProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setMessages([]);
      return;
    }

    const fetchLead = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) {
        console.error('Error fetching lead:', error);
        setLead(null);
      } else {
        setLead(data);
      }
      setLoading(false);
    };

    fetchLead();
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('message_timestamp', { ascending: true });

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`whatsapp_chat_${leadId}`)
      .on<Message>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `lead_id=eq.${leadId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Focus no input quando selecionar um lead
    if (lead && inputRef.current) {
      inputRef.current.focus();
    }
  }, [lead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !lead?.phone) return;

    setSending(true);
    const formData = new FormData();
    formData.append('to', lead.phone);
    formData.append('lead_id', lead.id);
    if (newMessage.trim()) formData.append('text', newMessage.trim());
    if (file) formData.append('file', file);

    try {
      await fetch('/api/whatsapp/send', { method: 'POST', body: formData });
      setNewMessage('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Erro ao enviar:", error);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!leadId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20">
        <div className="text-center space-y-3">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <Send className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-muted-foreground">Selecione uma conversa</h2>
          <p className="text-muted-foreground max-w-md">
            Escolha uma conversa na lista à esquerda para começar a conversar no WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        {/* Messages skeleton */}
        <div className="flex-1 overflow-hidden px-4 py-3 space-y-3 bg-muted/20">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("flex", i % 3 === 0 ? "justify-end" : "justify-start")}>
              <Skeleton className={cn("max-w-[75%] h-16 rounded-2xl", i % 3 === 0 ? "bg-primary/20" : "bg-muted")} />
            </div>
          ))}
        </div>
        {/* Input skeleton */}
        <div className="flex items-center gap-2 px-4 py-3 border-t bg-card">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="flex-1 h-10 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <h2 className="text-2xl font-semibold">Erro</h2>
          <p>Falha ao carregar os dados do lead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shadow-sm">
        <Avatar className="h-12 w-12">
          <AvatarImage src={undefined} alt={lead.name || 'L'} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {lead.name?.charAt(0).toUpperCase() || 'L'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{lead.name || 'Sem nome'}</h3>
          <p className="text-sm text-muted-foreground truncate">{lead.phone}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatus />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gradient-to-b from-muted/30 to-muted/10">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              <p className="text-sm text-muted-foreground">Envie uma mensagem para começar a conversa</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.is_from_lead ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-2 max-w-[75%] shadow-sm",
                  msg.is_from_lead
                    ? "bg-white dark:bg-muted border"
                    : "bg-primary text-primary-foreground"
                )}
              >
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
                  {formatMessageTime(msg.message_timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-4 py-3 border-t bg-card">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />
        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={file ? `Arquivo: ${file.name}` : "Digite uma mensagem..."}
          className="rounded-full border-2 focus:border-primary"
          disabled={sending}
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 rounded-full"
          disabled={(!newMessage.trim() && !file) || sending}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

export default WhatsappChatView;
