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
import { Send, Paperclip, FileText, AlertCircle, Phone, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

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
    <div className="p-4 mb-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
      <div className="flex items-center justify-center mb-2">
        <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
        <p className="font-medium text-yellow-800 dark:text-yellow-200">WhatsApp Desconectado</p>
      </div>
      {status.qr && (
        <div className="flex justify-center">
          <Image src={status.qr} alt="Escaneie para conectar" className="border rounded-lg" width={200} height={200} />
        </div>
      )}
      {!status.qr && status.type !== 'loading' && (
        <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
          Aguardando conexão... Verifique o terminal do servidor se o QR Code não aparecer.
        </p>
      )}
    </div>
  );
};

export default function WhatsappChat({ lead }: WhatsappChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), []);

  useEffect(() => {
    setLoading(true);
    supabase.from('whatsapp_messages').select('*').eq('lead_id', lead.id).order('message_timestamp', { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        setLoading(false);
      });
  }, [lead.id]);

  useEffect(() => {
    const channel = supabase.channel(`whatsapp_chat_${lead.id}`)
      .on<Message>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `lead_id=eq.${lead.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lead.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !lead.phone) return;
    setSending(true);
    const formData = new FormData();
    formData.append('to', lead.phone);
    formData.append('lead_id', lead.id);
    if (newMessage.trim()) formData.append('text', newMessage.trim());
    if (file) formData.append('file', file);
    
    try {
        await fetch('/api/whatsapp/send', { method: 'POST', body: formData });
        setNewMessage(''); setFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) { console.error("Erro ao enviar:", error); } 
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header do chat */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        <Avatar className="h-10 w-10">
          <AvatarImage src={undefined} alt={lead.name || 'L'} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {lead.name?.charAt(0).toUpperCase() || 'L'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{lead.name || 'Sem nome'}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {lead.phone || 'Sem telefone'}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Status da conexão */}
      <ConnectionStatus />

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-muted/30">
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

      {/* Input de mensagem */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-4 py-3 border-t bg-card">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => setFile(e.target.files?.[0] || null)} 
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />
        <Button 
          type="button" 
          size="icon" 
          variant="ghost" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={sending}
          className="flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        {file && (
          <Badge variant="secondary" className="flex items-center gap-1">
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
        
        <Input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          placeholder={file ? `${file.name} - Digite uma mensagem...` : "Digite uma mensagem..."} 
          autoComplete="off" 
          disabled={sending}
          className="flex-1 rounded-full border-muted-foreground/20"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        
        <Button 
          type="submit" 
          size="icon" 
          disabled={(!newMessage.trim() && !file) || sending}
          className="flex-shrink-0 rounded-full"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
