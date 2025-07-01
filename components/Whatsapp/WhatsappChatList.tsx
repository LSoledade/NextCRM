'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'];
interface ChatListItem {
    lead: Lead;
    last_message: string;
    last_message_timestamp: string;
    is_from_lead: boolean;
}

interface WhatsappChatListProps {
    onSelectLead: (leadId: string) => void;
}

// Função para formatar tempo de mensagem de forma amigável
const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        // Se foi hoje, mostrar apenas hora
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
        // Se foi ontem
        return 'Ontem';
    } else if (diffInHours < 168) {
        // Se foi esta semana
        return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
        // Se foi há mais tempo, mostrar data
        return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
};

function WhatsappChatList({ onSelectLead }: WhatsappChatListProps) {
    const [chatList, setChatList] = useState<ChatListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    useEffect(() => {
        const fetchChatList = async () => {
            setLoading(true);
            setError(null);
            try {
                // Query otimizada: buscar a última mensagem de cada lead que tem mensagens WhatsApp
                const { data: chatData, error: chatError } = await supabase
                    .rpc('get_whatsapp_chat_list');

                if (chatError) {
                    console.log('RPC não encontrada, usando query alternativa...');
                    
                    // Fallback: buscar todas as mensagens e processar no frontend
                    const { data: allMessages, error: messagesError } = await supabase
                        .from('whatsapp_messages')
                        .select(`
                            lead_id,
                            message_content,
                            message_timestamp,
                            is_from_lead,
                            leads!inner (
                                id,
                                name,
                                phone,
                                email,
                                status,
                                user_id,
                                created_at,
                                updated_at
                            )
                        `)
                        .order('message_timestamp', { ascending: false });

                    if (messagesError) {
                        console.error('Erro ao buscar conversas:', messagesError);
                        setError('Erro ao carregar conversas');
                        return;
                    }

                    // Agrupar mensagens por lead_id e pegar a última mensagem de cada
                    const leadMessagesMap = new Map<string, {
                        lead: any;
                        last_message: string;
                        last_message_timestamp: string;
                        is_from_lead: boolean;
                    }>();

                    allMessages?.forEach(msg => {
                        const leadId = msg.lead_id;
                        if (!leadMessagesMap.has(leadId)) {
                            leadMessagesMap.set(leadId, {
                                lead: msg.leads,
                                last_message: msg.message_content || 'Mensagem sem conteúdo',
                                last_message_timestamp: msg.message_timestamp,
                                is_from_lead: msg.is_from_lead
                            });
                        }
                    });

                    // Converter Map para array e ordenar por timestamp da última mensagem
                    const chatListData: ChatListItem[] = Array.from(leadMessagesMap.values())
                        .sort((a, b) => new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime());

                    setChatList(chatListData);
                } else {
                    // Se a RPC funcionou, processar os dados retornados
                    const chatListData: ChatListItem[] = chatData?.map((item: any) => ({
                        lead: {
                            id: item.lead_id,
                            name: item.lead_name,
                            phone: item.lead_phone,
                            email: item.lead_email,
                            status: item.lead_status,
                            user_id: item.lead_user_id,
                            created_at: item.lead_created_at,
                            updated_at: item.lead_updated_at
                        },
                        last_message: item.last_message || 'Mensagem sem conteúdo',
                        last_message_timestamp: item.last_message_timestamp,
                        is_from_lead: item.is_from_lead
                    })) || [];

                    setChatList(chatListData);
                }
            } catch (error) {
                console.error('Erro ao buscar lista de conversas:', error);
                setError('Erro de conexão');
            } finally {
                setLoading(false);
            }
        };

        fetchChatList();
    }, []);

    const filteredChats = chatList.filter(chat =>
        chat.lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lead.phone?.includes(searchTerm)
    );

    const handleSelectLead = (lead: Lead) => {
        setSelectedLeadId(lead.id);
        onSelectLead(lead.id);
    }

    return (
        <div className="flex flex-col h-full border-r">
            <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Conversas</h2>
                <Input
                    placeholder="Pesquisar conversa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="p-4">
                        <div className="text-center text-muted-foreground">
                            <p>{error}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="mt-2 text-sm text-primary hover:underline"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                ) : filteredChats.length === 0 ? (
                    <div className="p-4">
                        <div className="text-center text-muted-foreground">
                            <p>{searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa do WhatsApp ainda'}</p>
                            {!searchTerm && (
                                <p className="text-sm mt-1">
                                    As conversas aparecerão aqui quando você receber mensagens
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    filteredChats.map(chat => (
                        <div
                            key={chat.lead.id}
                            className={cn(
                                "flex items-center p-4 cursor-pointer hover:bg-muted/50",
                                selectedLeadId === chat.lead.id && "bg-muted"
                            )}
                            onClick={() => handleSelectLead(chat.lead)}
                        >
                            <Avatar className="h-10 w-10 mr-4">
                                <AvatarImage src={undefined} alt={chat.lead.name || 'L'} />
                                <AvatarFallback>{chat.lead.name?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{chat.lead.name}</p>
                                <div className="flex items-center gap-1">
                                    {!chat.is_from_lead && (
                                        <span className="text-xs text-blue-600">Você:</span>
                                    )}
                                    <p className="text-sm text-muted-foreground truncate">
                                        {chat.last_message}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground ml-2">
                                {formatMessageTime(chat.last_message_timestamp)}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default WhatsappChatList;
