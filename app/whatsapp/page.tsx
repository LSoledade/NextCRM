'use client';

import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { WhatsappChatList } from '@/components/Whatsapp/WhatsappChatList';
import { WhatsappChatView } from '@/components/Whatsapp/WhatsappChatView';
import WhatsappConnection from '@/components/Whatsapp/WhatsappConnection';
import AppLayout from '@/components/Layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function WhatsappPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats">Conversas</TabsTrigger>
            <TabsTrigger value="connection">Conexão</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chats" className="space-y-4">
            {/* Chat Interface */}
            <div className="h-[calc(100vh-14rem)]">
              <ResizablePanelGroup direction="horizontal" className="w-full h-full">
                <ResizablePanel defaultSize={25} minSize={20}>
                  <WhatsappChatList onSelectLead={setSelectedLeadId} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={75} minSize={50}>
                  <WhatsappChatView leadId={selectedLeadId} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </TabsContent>

          <TabsContent value="connection" className="space-y-4">
            <div className="flex justify-center py-8">
              <WhatsappConnection />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
