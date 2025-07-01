'use client';

import React, { useState, Suspense } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Settings, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { cn } from '@/lib/utils';

// Lazy loading dos componentes pesados
const WhatsappChatList = React.lazy(() => import('@/components/Whatsapp/WhatsappChatList'));
const WhatsappChatView = React.lazy(() => import('@/components/Whatsapp/WhatsappChatView'));
const WhatsappConnection = React.lazy(() => import('@/components/Whatsapp/WhatsappConnection'));

// Componente de loading para chat
function ChatSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de loading para visualização do chat
function ChatViewSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={cn(
            "flex", 
            i % 3 === 0 ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-xs rounded-lg p-3",
              i % 3 === 0 ? "bg-primary" : "bg-muted"
            )}>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// Componente de status de conexão
function ConnectionStatus() {
  const { connectionStatus } = useWhatsAppConnection();
  
  const getStatusInfo = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Conectado',
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950/20'
        };
      case 'connecting':
      case 'qr_ready':
        return {
          icon: Settings,
          text: 'Conectando...',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Desconectado',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Erro na conexão',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950/20'
        };
      default:
        return {
          icon: Settings,
          text: 'Verificando...',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20'
        };
    }
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm", status.bgColor)}>
      <Icon className={cn("w-4 h-4", status.color)} />
      <span className={status.color}>{status.text}</span>
      {connectionStatus.phoneNumber && (
        <span className="text-xs text-muted-foreground ml-auto">
          {connectionStatus.phoneNumber}
        </span>
      )}
    </div>
  );
}

export default function WhatsappPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chats');
  const { connectionStatus } = useWhatsAppConnection();

  // Verificar se a funcionalidade está disponível
  const isWhatsAppAvailable = connectionStatus.status !== 'error' || 
    !connectionStatus.error?.includes('Redis');

  if (!isWhatsAppAvailable) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                WhatsApp Indisponível
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>
                  O serviço WhatsApp está temporariamente indisponível devido a problemas 
                  de conectividade com o Redis. Por favor, tente novamente mais tarde ou 
                  contate o administrador do sistema.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <ErrorBoundary fallbackMessage="Erro na página do WhatsApp">
      <AppLayout>
        <div className="space-y-6">
          {/* Header com status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">WhatsApp Business</h1>
            </div>
            <ConnectionStatus />
          </div>

          {/* Tabs principais */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chats" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Conversas
              </TabsTrigger>
              <TabsTrigger value="connection" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Conexão
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chats" className="space-y-4">
              {/* Interface de Chat */}
              <div className="h-[calc(100vh-16rem)] border rounded-lg overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="w-full h-full">
                  {/* Lista de Conversas */}
                  <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                    <ErrorBoundary fallbackMessage="Erro na lista de conversas">
                      <Suspense fallback={<ChatSkeleton />}>
                        <WhatsappChatList onSelectLead={setSelectedLeadId} />
                      </Suspense>
                    </ErrorBoundary>
                  </ResizablePanel>
                  
                  <ResizableHandle withHandle />
                  
                  {/* Visualização do Chat */}
                  <ResizablePanel defaultSize={70} minSize={60}>
                    <ErrorBoundary fallbackMessage="Erro na visualização do chat">
                      <Suspense fallback={<ChatViewSkeleton />}>
                        <WhatsappChatView leadId={selectedLeadId} />
                      </Suspense>
                    </ErrorBoundary>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4">
              {/* Configurações de Conexão */}
              <div className="flex justify-center py-8">
                <ErrorBoundary fallbackMessage="Erro na conexão do WhatsApp">
                  <Suspense fallback={
                    <Card className="w-full max-w-md">
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  }>
                    <WhatsappConnection />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}