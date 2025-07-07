'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  QrCode,
  Unplug,
  Link2,
  Link2Off,
} from 'lucide-react';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';

export default function WhatsappConnection() {
  const {
    connectionState,
    isLoadingStatus,
    isFetchingStatus,
    statusError,
    refetchStatus,
    connect,
    isConnecting,
    connectError,
    reconnect,
    isReconnecting,
    reconnectError,
    disconnect,
    isDisconnecting,
    disconnectError,
  } = useWhatsAppConnection();

  const currentOverallLoading = isLoadingStatus || isFetchingStatus || isConnecting || isReconnecting || isDisconnecting;

  const renderStatusBadge = () => {
    if (!connectionState) {
      return <Badge variant="secondary"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</Badge>;
    }
    switch (connectionState.status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"><CheckCircle2 className="mr-2 h-4 w-4" />Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="mr-2 h-4 w-4" />Desconectado</Badge>;
      case 'connecting':
        return <Badge variant="outline"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Conectando...</Badge>;
      case 'qr_ready':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"><QrCode className="mr-2 h-4 w-4" />Aguardando QR Code</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="mr-2 h-4 w-4" />Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const renderContent = () => {
    if (isLoadingStatus && !connectionState) { // Initial loading
      return (
        <div className="flex flex-col items-center justify-center text-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-gray-500 mb-4" />
          <p className="text-lg font-semibold">Verificando conexão...</p>
          <p className="text-sm text-gray-500">Aguarde um momento.</p>
        </div>
      );
    }

    if (statusError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar Status</AlertTitle>
          <AlertDescription>
            {statusError.message || 'Não foi possível obter o status da conexão.'}
          </AlertDescription>
        </Alert>
      );
    }

    if (!connectionState) {
        // Should be covered by isLoadingStatus, but as a fallback
        return (
          <div className="text-center p-6">
            <p className="text-gray-600">Não foi possível carregar o status da conexão. Tente atualizar.</p>
          </div>
        );
    }

    switch (connectionState.status) {
      case 'connected':
        return (
          <div className="text-center p-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">Conexão Ativa</h3>
            <p className="text-gray-600 mt-2">Sua conta do WhatsApp está conectada.</p>
            {connectionState.profileName && (
              <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
                <p><strong>Nome:</strong> {connectionState.profileName}</p>
                <p><strong>Número:</strong> {connectionState.phoneNumber || 'N/A'}</p>
              </div>
            )}
          </div>
        );
      case 'qr_ready':
        return (
          <div className="text-center p-6">
            <QrCode className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">Escaneie o QR Code</h3>
            <p className="text-gray-600 mt-2">
              Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
            </p>
            {connectionState.qrCode ? (
              <div className="mt-4 bg-white p-2 inline-block rounded-lg shadow">
                <Image src={connectionState.qrCode} alt="WhatsApp QR Code" width={256} height={256} />
              </div>
            ) : (
              <Loader2 className="h-12 w-12 animate-spin text-gray-500 my-8 mx-auto" />
            )}
            {connectionState.pairingCode && (
                <p className="text-sm text-gray-500 mt-2">
                    Ou use o código de pareamento: <strong className="text-lg">{connectionState.pairingCode}</strong>
                </p>
            )}
          </div>
        );
      case 'disconnected':
      case 'connecting': // Also show connect button if stuck in connecting
        return (
          <div className="text-center p-6">
            {connectionState.status === 'disconnected' ?
                <WifiOff className="h-16 w-16 text-red-500 mx-auto mb-4" /> :
                <Loader2 className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
            }
            <h3 className="text-2xl font-bold">{connectionState.status === 'disconnected' ? 'Desconectado' : 'Conectando...'}</h3>
            <p className="text-gray-600 mt-2">
              {connectionState.status === 'disconnected' ?
                'A conexão com o WhatsApp está inativa.' :
                'Tentando conectar ao WhatsApp...'}
            </p>
            {connectionState.errorMessage && <p className="text-sm text-red-500 mt-1">{connectionState.errorMessage}</p>}
            <Button onClick={() => connect()} disabled={isConnecting || currentOverallLoading} className="mt-6">
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Conectar / Obter QR Code
            </Button>
            {connectError && <Alert variant="destructive" className="mt-4 text-left"><AlertCircle className="h-4 w-4" /><AlertDescription>{connectError.message}</AlertDescription></Alert>}
          </div>
        );
      case 'error':
        return (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Conexão</AlertTitle>
            <AlertDescription>
              {connectionState.errorMessage || connectionState.rawError || 'Ocorreu um erro desconhecido.'}
            </AlertDescription>
          </Alert>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-gray-500 mb-4" />
            <p className="text-lg font-semibold">Carregando...</p>
            <p className="text-sm text-gray-500">Obtendo status da conexão.</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <Smartphone className="h-6 w-6 mr-2 text-primary" />
              <CardTitle>Status da Conexão WhatsApp</CardTitle>
            </div>
            <CardDescription>Gerenciamento da sua instância do WhatsApp.</CardDescription>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
        <div className="mt-6 pt-4 border-t flex flex-wrap justify-center gap-2">
          <Button onClick={() => refetchStatus()} disabled={currentOverallLoading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingStatus ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>

          {(connectionState?.status === 'disconnected' || connectionState?.status === 'error' || connectionState?.status === 'connecting') && (
            <Button onClick={() => connect()} disabled={isConnecting || currentOverallLoading}>
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              {connectionState?.status === 'qr_ready' ? 'Obter Novo QR Code' : 'Conectar'}
            </Button>
          )}
          {connectError && <Alert variant="destructive" className="w-full mt-2 text-left"><AlertCircle className="h-4 w-4" /><AlertDescription>{connectError.message}</AlertDescription></Alert>}


          {(connectionState?.status === 'connected' || connectionState?.status === 'qr_ready' || connectionState?.status === 'error') && (
            <Button onClick={() => reconnect()} disabled={isReconnecting || currentOverallLoading} variant="outline">
              {isReconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Reconectar Forçado
            </Button>
          )}
          {reconnectError && <Alert variant="destructive" className="w-full mt-2 text-left"><AlertCircle className="h-4 w-4" /><AlertDescription>{reconnectError.message}</AlertDescription></Alert>}

          {connectionState?.status === 'connected' && (
            <Button onClick={() => disconnect()} disabled={isDisconnecting || currentOverallLoading} variant="destructive">
              {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
              Desconectar
            </Button>
          )}
          {disconnectError && <Alert variant="destructive" className="w-full mt-2 text-left"><AlertCircle className="h-4 w-4" /><AlertDescription>{disconnectError.message}</AlertDescription></Alert>}
        </div>
      </CardContent>
    </Card>
  );
}
