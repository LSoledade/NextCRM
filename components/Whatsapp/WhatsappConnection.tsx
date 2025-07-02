'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import QRCodeLib from 'qrcode';
import Image from 'next/image';

export default function WhatsappConnection() {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const { toast } = useToast();
  const { connectionStatus, isLoading, disconnect, reconnect, refreshStatus, resetAuthState } = useWhatsAppConnection();

  // Gerar QR Code quando receber o código
  useEffect(() => {
    if (connectionStatus.qrCode) {
      QRCodeLib.toDataURL(connectionStatus.qrCode, {
        width: 300, // Aumentar tamanho
        margin: 4, // Aumentar margem
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M' // Nível de correção de erro médio
      }).then(setQrCodeDataUrl)
        .catch(error => console.error('Erro ao gerar QR Code:', error));
    } else {
      setQrCodeDataUrl('');
    }
  }, [connectionStatus.qrCode]);

  // Notificar quando conectado
  const handleConnectionSuccess = useCallback(() => {
    if (connectionStatus.status === 'connected') {
      toast({ 
        title: 'WhatsApp conectado!', 
        description: `Conectado como: ${connectionStatus.user?.name || connectionStatus.phoneNumber}` 
      });
    }
  }, [connectionStatus.status, connectionStatus.user?.name, connectionStatus.phoneNumber, toast]);

  useEffect(() => {
    handleConnectionSuccess();
  }, [handleConnectionSuccess]);

  // Função para resetar auth state
  const handleReset = async () => {
    const result = await resetAuthState();
    
    if (result.success) {
      toast({ 
        title: 'Auth state resetado', 
        description: result.message || 'Gerando novo QR Code...' 
      });
      // Aguardar um pouco e então refrescar status
      setTimeout(() => {
        refreshStatus();
      }, 2000);
    } else {
      toast({ 
        title: 'Erro ao resetar', 
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  // Função para desconectar
  const handleDisconnect = async () => {
    const result = await disconnect();
    
    if (result.success) {
      toast({ title: 'WhatsApp desconectado', description: result.message });
    } else {
      toast({ 
        title: 'Erro ao desconectar', 
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  // Função para reconectar
  const handleReconnect = async () => {
    const result = await reconnect();
    
    if (result.success) {
      toast({ title: 'Reconectando...', description: 'Iniciando nova conexão' });
    } else {
      toast({ 
        title: 'Erro ao reconectar', 
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'qr_ready':
        return <Badge variant="secondary"><QrCode className="w-3 h-3 mr-1" />QR Code Pronto</Badge>;
      case 'connecting':
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando...</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Smartphone className="w-5 h-5" />
          WhatsApp Connection
        </CardTitle>
        <CardDescription>
          Status da conexão com WhatsApp
        </CardDescription>
        <div className="flex justify-center">
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* QR Code */}
        {connectionStatus.status === 'qr_ready' && qrCodeDataUrl && (
          <div className="text-center space-y-3">
            <div className="bg-white p-6 rounded-lg inline-block border">
              <Image 
                src={qrCodeDataUrl} 
                alt="QR Code WhatsApp" 
                width={240}
                height={240}
                className="mx-auto cursor-pointer"
                unoptimized
                priority
                onClick={() => {
                  // Abrir QR Code em nova janela para melhor compatibilidade
                  const newWindow = window.open('', '_blank', 'width=400,height=400');
                  if (newWindow) {
                    newWindow.document.write(`
                      <html>
                        <head><title>QR Code WhatsApp</title></head>
                        <body style="margin:0;padding:20px;display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;">
                          <img src="${qrCodeDataUrl}" alt="QR Code WhatsApp" style="max-width:100%;max-height:100%;" />
                        </body>
                      </html>
                    `);
                    newWindow.document.close();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">Clique para ampliar</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Escaneie este QR Code com seu WhatsApp
            </p>
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                <strong>📱 Como conectar:</strong><br/>
                1. Abra o WhatsApp no seu celular<br/>
                2. Toque nos 3 pontos (⋮) no canto superior direito<br/>
                3. Selecione &quot;Aparelhos conectados&quot;<br/>
                4. Toque em &quot;Conectar um aparelho&quot;<br/>
                5. Aponte a câmera para o QR Code acima<br/><br/>
                <strong>⚠️ Problemas?</strong><br/>
                • Tente usar Chrome ou Firefox<br/>
                • Certifique-se que o QR Code está bem iluminado<br/>
                • Se aparecer &quot;Não foi possível conectar&quot;, clique em &quot;Novo QR Code&quot;
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Usuário conectado */}
        {connectionStatus.status === 'connected' && (connectionStatus.user || connectionStatus.phoneNumber) && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Wifi className="w-5 h-5" />
              <span className="font-medium">Conexão ativa</span>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium">
                {connectionStatus.user?.name || 'Usuário WhatsApp'}
              </p>
              <p className="text-xs text-muted-foreground">
                {connectionStatus.phoneNumber || connectionStatus.user?.id || 'ID não disponível'}
              </p>
              {connectionStatus.connectedAt && (
                <p className="text-xs text-muted-foreground">
                  Conectado em: {new Date(connectionStatus.connectedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Loading state */}
        {connectionStatus.status === 'connecting' && (
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Estabelecendo conexão com WhatsApp...
            </p>
          </div>
        )}

        {/* Error state */}
        {connectionStatus.status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {connectionStatus.error || 'Erro na conexão'}
            </AlertDescription>
          </Alert>
        )}

        {/* Disconnected state */}
        {connectionStatus.status === 'disconnected' && (
          <div className="text-center space-y-3">
            <WifiOff className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              WhatsApp desconectado
            </p>
            {connectionStatus.disconnectedAt && (
              <p className="text-xs text-muted-foreground">
                Desconectado em: {new Date(connectionStatus.disconnectedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4">
          {connectionStatus.status === 'connected' ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          ) : connectionStatus.status === 'qr_ready' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Novo QR Code
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleReconnect}
              disabled={isLoading}
              className="flex-1"
            >
              <Wifi className="w-4 h-4 mr-2" />
              {connectionStatus.status === 'connecting' ? 'Conectando...' : 'Conectar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
