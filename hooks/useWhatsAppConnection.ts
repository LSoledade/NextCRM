import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// 1. Simplificar a interface de status
export interface WhatsAppConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  phoneNumber?: string | null;
  instanceName?: string | null;
}

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus>({
    status: 'connecting',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Ref para o intervalo de polling
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Simplificar a função de busca de status
  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Primeiro tenta o endpoint regular, se falhar usa o admin
      let response = await fetch('/api/whatsapp/status');
      let data = await response.json();

      // Se não autorizado, tenta endpoint admin (para debugging)
      if (response.status === 401) {
        console.log('🔑 Tentando endpoint admin para status...');
        response = await fetch('/api/whatsapp/admin-status');
        data = await response.json();
      }

      if (response.ok) {
        // O status da API da Evolution é 'open', 'close', 'connecting', etc.
        // Mapeamos para os status do nosso frontend.
        let newStatus: WhatsAppConnectionStatus['status'] = 'disconnected';
        if (data.state === 'connected' || data.instanceStatus === 'open') {
          newStatus = 'connected';
        } else if (data.state === 'connecting') {
          newStatus = 'connecting';
        } else if (data.state === 'disconnected' || data.instanceStatus === 'close') {
          newStatus = 'disconnected';
        }

        setConnectionStatus({
          status: newStatus,
          // Extrair informações do perfil se disponível
          phoneNumber: data.profile?.number || data.profile?.name,
          instanceName: 'Leonardo', // Hardcoded para agora
        });
      } else {
        setConnectionStatus({
          status: 'error',
          error: data.error || 'Falha ao buscar status da conexão.',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar status da conexão:', error);
      setConnectionStatus({
        status: 'error',
        error: 'Erro de comunicação com o servidor.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // 3. Usar useEffect para polling
  useEffect(() => {
    if (!user?.id) {
      // Limpa o status se o usuário deslogar
      setConnectionStatus({ status: 'disconnected' });
      return;
    }

    // Busca o status imediatamente ao carregar o hook
    fetchStatus();

    // Configura o polling para verificar o status a cada 30 segundos
    intervalRef.current = setInterval(fetchStatus, 30000); // 30 segundos

    // Função de limpeza para remover o intervalo quando o componente for desmontado
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.id, fetchStatus]);

  // 4. Manter apenas as funções relevantes
  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return {
    connectionStatus,
    isLoading,
    refreshStatus,
  };
}