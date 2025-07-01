import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface WhatsAppConnectionStatus {
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error';
  qrCode?: string | null;
  user?: any;
  error?: string;
  phoneNumber?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
}

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus>({
    status: 'connecting'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const isConnecting = useRef(false);

  // Solicitar QR Code via API
  const requestQRCode = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/connection');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erro ao solicitar QR Code:', data.error);
      }
      // O Realtime irá atualizar o status automaticamente
    } catch (error) {
      console.error('Erro ao solicitar QR Code:', error);
    }
  }, []);

  // Criar conexão inicial
  const createInitialConnection = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .upsert({
          user_id: user.id,
          status: 'connecting',
          qr_code: null,
          whatsapp_user: null,
          phone_number: null,
          connected_at: null,
          disconnected_at: null,
          error_message: null
        });

      if (error) {
        console.error('Erro ao criar conexão inicial:', error);
      } else {
        // Solicitar geração do QR Code via API
        await requestQRCode();
      }
    } catch (error) {
      console.error('Erro ao criar conexão inicial:', error);
    }
  }, [user?.id, requestQRCode]);

  // Cleanup no unmount
  useEffect(() => {
    if (!user?.id || isConnecting.current) return;

    isConnecting.current = true;
    let currentChannel: RealtimeChannel | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    // Função para buscar o status atual do banco (movida para dentro do effect)
    const fetchCurrentStatus = async () => {
      if (isUnmounted) return;
      
      try {
        const { data, error } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (isUnmounted) return;

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Erro ao buscar status da conexão:', error);
          setConnectionStatus({
            status: 'error',
            error: 'Erro ao buscar status da conexão'
          });
          return;
        }

        if (data) {
          setConnectionStatus({
            status: data.status as any,
            qrCode: data.qr_code,
            user: data.whatsapp_user,
            phoneNumber: data.phone_number,
            connectedAt: data.connected_at,
            disconnectedAt: data.disconnected_at,
            error: data.error_message
          });
        } else {
          // Não existe registro, criar um inicial
          try {
            await createInitialConnection();
          } catch (error) {
            console.error('Erro ao criar conexão inicial:', error);
          }
        }
      } catch (error) {
        if (isUnmounted) return;
        console.error('Erro ao buscar status:', error);
        setConnectionStatus({
          status: 'error',
          error: 'Erro de comunicação com o servidor'
        });
      }
    };

    const setupRealtimeSubscription = () => {
      if (isUnmounted || currentChannel) return;

      try {
        console.log('Configurando nova subscricao Realtime...');
        
        currentChannel = supabase
          .channel(`whatsapp_connections:${user.id}`) // Canal único por usuário
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whatsapp_connections',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              if (isUnmounted) return;
              
              try {
                console.log('Realtime update:', payload);
                
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const data = payload.new;
                  if (data) {
                    setConnectionStatus({
                      status: data.status as any,
                      qrCode: data.qr_code,
                      user: data.whatsapp_user,
                      phoneNumber: data.phone_number,
                      connectedAt: data.connected_at,
                      disconnectedAt: data.disconnected_at,
                      error: data.error_message
                    });
                  }
                } else if (payload.eventType === 'DELETE') {
                  // Se a conexão foi deletada, resetar para disconnected
                  setConnectionStatus({
                    status: 'disconnected'
                  });
                }
              } catch (error) {
                console.warn('Erro ao processar atualização do Realtime:', error);
              }
            }
          )
          .subscribe((status) => {
            if (isUnmounted) return;
            
            console.log('Canal Realtime status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('Conectado ao Realtime para WhatsApp');
              // Limpar qualquer timeout de reconexão
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.warn(`Canal Realtime ${status} - verificando reconexão...`);
              
              // Implement exponential backoff
              const maxAttempts = 5;
              const baseDelay = 1000;
              
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
              }
              
              // Tentar reconectar após um atraso
              reconnectTimeout = setTimeout(() => {
                if (!isUnmounted && currentChannel) {
                  console.log(`Tentativa de reconexão`);
                  
                  // Cleanup current channel before creating new one
                  try {
                    supabase.removeChannel(currentChannel);
                  } catch (error) {
                    console.warn('Erro ao remover canal:', error);
                  }
                  currentChannel = null;
                  
                  // Try to reconnect after a delay
                  setTimeout(() => {
                    if (!isUnmounted) {
                      setupRealtimeSubscription();
                    }
                  }, 1000);
                }
              }, 30000);
            }
          });

        setChannel(currentChannel);
      } catch (error) {
        console.error('Erro ao configurar Realtime subscription:', error);
        if (!isUnmounted) {
          setConnectionStatus(prev => ({
            ...prev,
            status: 'error',
            error: 'Erro ao configurar conexão'
          }));
        }
      }
    };

    // Initial setup
    const init = async () => {
      await fetchCurrentStatus();
      if (!isUnmounted) {
        setupRealtimeSubscription();
      }
      isConnecting.current = false;
    };

    init();

    return () => {
      isUnmounted = true;
      isConnecting.current = false;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      if (currentChannel) {
        try {
          supabase.removeChannel(currentChannel);
        } catch (error) {
          console.warn('Erro ao limpar canal no unmount:', error);
        }
        currentChannel = null;
      }
    };
  }, [user?.id, createInitialConnection, reconnectAttempts]);

  const disconnect = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'Usuário não autenticado' };

    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Atualizar status no banco via API
        await supabase
          .from('whatsapp_connections')
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            qr_code: null,
            whatsapp_user: null,
            phone_number: null
          })
          .eq('user_id', user.id);

        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Erro de comunicação com o servidor' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const reconnect = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'Usuário não autenticado' };

    setIsLoading(true);
    try {
      // Primeiro, atualizar status para connecting
      await supabase
        .from('whatsapp_connections')
        .update({
          status: 'connecting',
          qr_code: null,
          whatsapp_user: null,
          phone_number: null,
          connected_at: null,
          disconnected_at: null,
          error_message: null
        })
        .eq('user_id', user.id);

      const response = await fetch('/api/whatsapp/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect' })
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true };
      } else {
        // Atualizar status de erro no banco
        await supabase
          .from('whatsapp_connections')
          .update({
            status: 'error',
            error_message: data.error
          })
          .eq('user_id', user.id);

        return { success: false, error: data.error };
      }
    } catch (error) {
      // Atualizar status de erro no banco
      if (user?.id) {
        await supabase
          .from('whatsapp_connections')
          .update({
            status: 'error',
            error_message: 'Erro de comunicação com o servidor'
          })
          .eq('user_id', user.id);
      }

      return { 
        success: false, 
        error: 'Erro de comunicação com o servidor' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);    // Função para refresh status (separada para uso externo)
  const refreshStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao buscar status da conexão:', error);
        setConnectionStatus({
          status: 'error',
          error: 'Erro ao buscar status da conexão'
        });
        return;
      }

      if (data) {
        setConnectionStatus({
          status: data.status as any,
          qrCode: data.qr_code,
          user: data.whatsapp_user,
          phoneNumber: data.phone_number,
          connectedAt: data.connected_at,
          disconnectedAt: data.disconnected_at,
          error: data.error_message
        });
      } else {
        // Não existe registro, criar um inicial
        await createInitialConnection();
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      setConnectionStatus({
        status: 'error',
        error: 'Erro de comunicação com o servidor'
      });
    }
  }, [user?.id, createInitialConnection]);

  return {
    connectionStatus,
    isLoading,
    disconnect,
    reconnect,
    refreshStatus
  };
}
