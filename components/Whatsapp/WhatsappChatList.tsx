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
}

interface WhatsappChatListProps {
    onSelectLead: (leadId: string) => void;
}

export function WhatsappChatList({ onSelectLead }: WhatsappChatListProps) {
    const [chatList, setChatList] = useState<ChatListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    useEffect(() => {
        const fetchChatList = async () => {
            setLoading(true);
            // Esta função RPC precisa ser criada no Supabase
            const { data, error } = await supabase.rpc('get_whatsapp_chat_list');
            if (data) {
                setChatList(data);
            }
            setLoading(false);
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
                                <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground ml-2">
                                {new Date(chat.last_message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
