'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
                console.log('📞 Iniciando busca por conversas do WhatsApp...');
                
                // Get current user first
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                if (userError || !user) {
                    console.error('❌ Usuário não autenticado:', userError);
                    setError('Usuário não autenticado');
                    return;
                }

                console.log('✅ Usuário autenticado:', user.id);

                // Primeiro, tentar usar a função SQL otimizada
                console.log('🔍 Tentando usar função get_whatsapp_chat_list_v2...');
                const { data: conversationsFromFunction, error: functionError } = await supabase
                    .rpc('get_whatsapp_chat_list_v2', { p_user_id: user.id });

                if (conversationsFromFunction && !functionError && conversationsFromFunction.length > 0) {
                    console.log('✅ Conversas obtidas via função SQL:', conversationsFromFunction.length);
                    
                    const chatListData: ChatListItem[] = conversationsFromFunction.map((conv: any) => ({
                        lead: {
                            id: conv.lead_id,
                            name: conv.lead_name,
                            phone: conv.lead_phone,
                            email: null, // Email não é retornado pela função SQL
                            status: conv.lead_status,
                            user_id: user.id,
                            created_at: null,
                            updated_at: null,
                            company: conv.lead_company,
                            source: conv.lead_source
                        },
                        last_message: conv.last_message_content || 'Mensagem sem conteúdo',
                        last_message_timestamp: conv.last_message_timestamp,
                        is_from_lead: conv.last_message_direction === 'incoming',
                        unread_count: conv.unread_count || 0
                    }));

                    setChatList(chatListData);
                    console.log('✅ Lista de conversas atualizada via função SQL');
                    return;
                }

                console.log('⚠️ Função SQL não disponível ou sem resultados, usando query manual...');
                if (functionError) {
                    console.error('Erro na função SQL:', functionError);
                }

                // Fallback: Query manual
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
                            updated_at,
                            company,
                            source
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('message_timestamp', { ascending: false });

                if (messagesError) {
                    console.error('❌ Erro ao buscar conversas (query manual):', messagesError);
                    setError('Erro ao carregar conversas');
                    return;
                }

                console.log('📊 Mensagens encontradas (query manual):', allMessages?.length || 0);

                // Agrupar mensagens por lead_id e pegar a última mensagem de cada
                const leadMessagesMap = new Map<string, {
                    lead: any;
                    last_message: string;
                    last_message_timestamp: string;
                    is_from_lead: boolean;
                    unread_count: number;
                }>();

                allMessages?.forEach(msg => {
                    const leadId = msg.lead_id;
                    if (!leadMessagesMap.has(leadId)) {
                        leadMessagesMap.set(leadId, {
                            lead: msg.leads,
                            last_message: msg.message_content || 'Mensagem sem conteúdo',
                            last_message_timestamp: msg.message_timestamp,
                            is_from_lead: msg.is_from_lead,
                            unread_count: 0 // TODO: Implementar contagem de não lidas
                        });
                    }
                });

                // Converter Map para array e ordenar por timestamp da última mensagem
                const chatListData: ChatListItem[] = Array.from(leadMessagesMap.values())
                    .sort((a, b) => new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime());

                setChatList(chatListData);
                console.log('✅ Lista de conversas atualizada via query manual:', chatListData.length);
                
                // Configurar subscription para atualizações em tempo real APÓS carregar os dados
                console.log('🔔 Configurando subscription Realtime para whatsapp_messages...');
                
                const subscription = supabase
                    .channel('whatsapp_messages_changes')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'whatsapp_messages',
                            filter: `user_id=eq.${user.id}` // Filtrar apenas mensagens do usuário atual
                        },
                        (payload) => {
                            console.log('🔔 Nova mensagem WhatsApp via Realtime:', payload);
                            // Atualizar apenas se for uma mensagem nova (não recarregar toda a lista)
                            const newMessage = payload.new;
                            if (newMessage && newMessage.lead_id) {
                                // Atualizar apenas a conversa específica
                                setChatList(prev => {
                                    const leadExists = prev.some(chat => chat.lead.id === newMessage.lead_id);
                                    if (leadExists) {
                                        // Atualizar conversa existente
                                        return prev.map(chat => {
                                            if (chat.lead.id === newMessage.lead_id) {
                                                return {
                                                    ...chat,
                                                    last_message: newMessage.message_content || 'Mensagem sem conteúdo',
                                                    last_message_timestamp: newMessage.message_timestamp,
                                                    is_from_lead: newMessage.is_from_lead,
                                                    unread_count: newMessage.is_from_lead ? (chat.unread_count || 0) + 1 : 0
                                                };
                                            }
                                            return chat;
                                        }).sort((a, b) => new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime());
                                    } else {
                                        // Nova conversa - recarregar apenas neste caso
                                        fetchChatList();
                                        return prev;
                                    }
                                });
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log('📡 Status da subscription Realtime:', status);
                    });

                // Retornar função de cleanup
                return () => {
                    console.log('🔌 Desconectando subscription Realtime...');
                    subscription.unsubscribe();
                };
                
            } catch (error) {
                console.error('❌ Erro ao buscar lista de conversas:', error);
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
        <div className="flex flex-col h-full bg-background border-r">
            {/* Header com busca */}
            <div className="p-3 border-b bg-card">
                <Input
                    placeholder="Pesquisar conversa ou contato"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-lg"
                />
            </div>
            {/* Lista de conversas */}
            <div className="flex-1 overflow-y-auto">{loading ? (
                    <div className="space-y-0">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>
                        ))}
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
                        <button
                            key={chat.lead.id}
                            className={cn(
                                "flex w-full items-center gap-3 px-4 py-3 border-b transition-colors text-left",
                                selectedLeadId === chat.lead.id ? "bg-muted" : "hover:bg-muted/60"
                            )}
                            onClick={() => handleSelectLead(chat.lead)}
                            aria-current={selectedLeadId === chat.lead.id}
                        >
                            <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={undefined} alt={chat.lead.name || 'L'} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                    {chat.lead.name?.charAt(0).toUpperCase() || 'L'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={cn(
                                        "font-medium truncate", 
                                        chat.unread_count && chat.unread_count > 0 ? "font-bold" : ""
                                    )}>
                                        {chat.lead.name || 'Sem nome'}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                        {formatMessageTime(chat.last_message_timestamp)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground truncate">
                                        {!chat.is_from_lead && (
                                            <span className="text-blue-600 font-medium">Você: </span>
                                        )}
                                        {chat.last_message}
                                    </span>
                                    {chat.unread_count && chat.unread_count > 0 && (
                                        <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0">
                                            {chat.unread_count > 99 ? '99+' : chat.unread_count}
                                        </Badge>
                                    )}
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
