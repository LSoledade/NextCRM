'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

type Lead = Database['public']['Tables']['leads']['Row'];
interface ChatListItem {
    lead: Lead;
    last_message: string;
    last_message_timestamp: string;
    is_from_lead: boolean;
    unread_count?: number;
}

interface WhatsappChatListProps {
    onSelectLead: (leadId: string) => void;
}

const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
        return 'Ontem';
    } else if (diffInHours < 168) {
        return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
        return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
};

function WhatsappChatList({ onSelectLead }: WhatsappChatListProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    const { data: chatList = [], isLoading, isError, error } = useQuery<ChatListItem[], Error>({
        queryKey: ['whatsapp_chat_list', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            
            const { data, error: rpcError } = await supabase
                .rpc('get_whatsapp_chat_list_v2', { p_user_id: user.id });

            if (rpcError) {
                console.error("Erro ao chamar RPC get_whatsapp_chat_list_v2:", rpcError);
                throw new Error("Não foi possível carregar as conversas.");
            }
            
            return (data || []).map((conv: any) => ({
                lead: { id: conv.lead_id, name: conv.lead_name, phone: conv.lead_phone, status: conv.lead_status, company: conv.lead_company, source: conv.lead_source } as Lead,
                last_message: conv.last_message_content || '...',
                last_message_timestamp: conv.last_message_timestamp,
                is_from_lead: conv.last_message_direction === 'incoming',
                unread_count: conv.unread_count || 0
            }));
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`whatsapp_messages_list_${user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log('🔔 Nova mensagem recebida, invalidando cache da lista de chats...', payload);
                    queryClient.invalidateQueries({ queryKey: ['whatsapp_chat_list', user.id] });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Conectado ao canal de realtime da lista de chats para usuário ${user.id}`);
                }
                if (err) {
                    console.error('Erro na subscription da lista de chats:', err);
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [user?.id, queryClient]);

    const filteredChats = chatList.filter(chat =>
        chat.lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lead.phone?.includes(searchTerm)
    );

    const handleSelectLead = (lead: Lead) => {
        setSelectedLeadId(lead.id);
        onSelectLead(lead.id);
    };

    if (isLoading) {
        return (
            <div className="space-y-0 p-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    if (isError) {
        return <div className="p-4 text-center text-destructive">Erro: {error?.message}</div>;
    }

    return (
        <div className="flex flex-col h-full bg-background border-r">
            <div className="p-3 border-b bg-card">
                <Input placeholder="Pesquisar conversa" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rounded-lg"/>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">Nenhuma conversa.</div>
                ) : (
                    filteredChats.map(chat => (
                        <button key={chat.lead.id} className={cn("flex w-full items-center gap-3 px-4 py-3 border-b transition-colors text-left", selectedLeadId === chat.lead.id ? "bg-muted" : "hover:bg-muted/60")} onClick={() => handleSelectLead(chat.lead)}>
                            <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={undefined} alt={chat.lead.name || 'L'} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">{chat.lead.name?.charAt(0).toUpperCase() || 'L'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={cn("font-medium truncate", chat.unread_count && chat.unread_count > 0 ? "font-bold" : "")}>{chat.lead.name || 'Sem nome'}</span>
                                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatMessageTime(chat.last_message_timestamp)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground truncate">{!chat.is_from_lead && (<span className="text-blue-600 font-medium">Você: </span>)}{chat.last_message}</span>
                                    {chat.unread_count && chat.unread_count > 0 && (<Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0">{chat.unread_count}</Badge>)}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export default WhatsappChatList;