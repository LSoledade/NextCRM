'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

type Message = Database['public']['Tables']['whatsapp_messages']['Row'];
interface WhatsappChatProps {
  lead: Database['public']['Tables']['leads']['Row'];
}

const MediaMessage = ({ msg }: { msg: Message }) => {
  if (!msg.media_url) return null;
  const commonClasses = "rounded-lg max-w-full h-auto";

  switch (msg.message_type) {
    case 'image': return <Image src={msg.media_url} alt="Imagem enviada" className={commonClasses} width={300} height={200} />;
    case 'video': return <video src={msg.media_url} controls className={commonClasses} />;
    case 'audio': return <audio src={msg.media_url} controls className="w-full" />;
    case 'document': return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
        <FileText className="w-6 h-6" /> <span>{msg.message_content || 'Documento'}</span>
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
    <div className="p-4 mb-4 text-center border-l-4 border-yellow-500 bg-yellow-50">
      <div className="flex items-center justify-center">
        <AlertCircle className="w-5 h-5 mr-2 text-yellow-700" />
        <p className="font-semibold text-yellow-800">WhatsApp Desconectado</p>
      </div>
      {status.qr && <Image src={status.qr} alt="Escaneie para conectar" className="mx-auto mt-2" width={256} height={256} />}
      {!status.qr && status.type !== 'loading' && <p className="mt-2 text-sm text-yellow-700">Aguardando conexão... Verifique o terminal do servidor se o QR Code não aparecer aqui.</p>}
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
    <Card>
      <CardHeader><CardTitle>Conversa do WhatsApp</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ConnectionStatus />
        <div className="h-[50vh] overflow-y-auto p-4 border rounded-md flex flex-col gap-3 bg-muted/50">
          {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className={`h-12 w-${i % 2 === 0 ? '3/5' : '1/2'} ${i % 2 === 0 ? 'self-start' : 'self-end'}`} />) :
            messages.map((msg) => (
              <div key={msg.id} className={cn('p-2 rounded-lg max-w-[80%] w-fit', msg.is_from_lead ? 'bg-background self-start' : 'bg-primary text-primary-foreground self-end')}>
                <MediaMessage msg={msg} />
                {msg.message_content && <p className="text-sm whitespace-pre-wrap mt-1">{msg.message_content}</p>}
                <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))
          }
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending}><Paperclip className="h-5 w-5" /></Button>
          <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={file ? file.name : "Digite uma mensagem..."} autoComplete="off" disabled={sending} />
          <Button type="submit" size="icon" disabled={(!newMessage.trim() && !file) || sending}>
            {sending ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
