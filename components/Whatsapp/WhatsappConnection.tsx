'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';

export default function WhatsappConnection() {
  const { connectionStatus, isLoading, refreshStatus } = useWhatsAppConnection();

  const renderStatusBadge = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"><CheckCircle2 className="mr-2 h-4 w-4" />Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="mr-2 h-4 w-4" />Desconectado</Badge>;
      case 'connecting':
        return <Badge variant="outline"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Conectando...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="mr-2 h-4 w-4" />Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const renderContent = () => {
    if (isLoading && connectionStatus.status === 'connecting') {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-gray-500 mb-4" />
          <p className="text-lg font-semibold">Verificando conexão...</p>
          <p className="text-sm text-gray-500">Aguarde um momento.</p>
        </div>
      );
    }

    switch (connectionStatus.status) {
      case 'connected':
        return (
          <div className="text-center p-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">Conexão Ativa</h3>
            <p className="text-gray-600 mt-2">A sua conta do WhatsApp está conectada.</p>
            <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
              <p><strong>Instância:</strong> {connectionStatus.instanceName || 'N/A'}</p>
              <p><strong>Número:</strong> {connectionStatus.phoneNumber || 'N/A'}</p>
            </div>
          </div>
        );
      case 'disconnected':
        return (
          <div className="text-center p-6">
            <WifiOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">Desconectado</h3>
            <p className="text-gray-600 mt-2">
              A conexão com o WhatsApp está inativa. A instância &apos;Leonardo&apos; tentará reconectar automaticamente.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Se o problema persistir, verifique o status do servidor da Evolution API.
            </p>
          </div>
        );
      case 'error':
        return (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro de Conexão:</strong> {connectionStatus.error || 'Ocorreu um erro desconhecido.'}
            </AlertDescription>
          </Alert>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-gray-500 mb-4" />
            <p className="text-lg font-semibold">Inicializando...</p>
            <p className="text-sm text-gray-500">Obtendo status da conexão.</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <Smartphone className="h-6 w-6 mr-2 text-primary" />
              <CardTitle>Status da Conexão</CardTitle>
            </div>
            <CardDescription>Monitoramento da instância de WhatsApp</CardDescription>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
        <div className="mt-4 flex justify-center">
          <Button onClick={refreshStatus} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
