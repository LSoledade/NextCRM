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
  
  // Usar refs para evitar recreação desnecessária de funções
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Função para buscar status atual - memoizada
  const fetchCurrentStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
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
        // Criar registro inicial se não existir usando função upsert segura
        if (user?.id) {
          try {
            const { data, error } = await supabase.rpc('upsert_whatsapp_connection', {
              p_user_id: user.id,
              p_status: 'connecting'
            });

            if (error) {
              console.error('Erro ao criar conexão inicial:', error);
            } else {
              console.log('Conexão inicial criada:', data);
              // Solicitar geração do QR Code
              try {
                await fetch('/api/whatsapp/connection');
              } catch (apiError) {
                console.error('Erro ao solicitar QR Code:', apiError);
              }
            }
          } catch (error) {
            console.error('Erro ao criar conexão inicial:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      setConnectionStatus({
        status: 'error',
        error: 'Erro de comunicação com o servidor'
      });
    }
  }, [user?.id]);

  // Função para criar conexão inicial - removida pois foi integrada acima

  // Setup da subscription real-time - memoizada
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || channelRef.current) return;

    try {
      console.log('Configurando subscription real-time para WhatsApp...');
      
      const channel = supabase
        .channel(`whatsapp_connections:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_connections',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time update WhatsApp:', payload);
            
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
              setConnectionStatus({ status: 'disconnected' });
            }
          }
        )
        .subscribe((status) => {
          console.log('Canal WhatsApp real-time status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Conectado ao real-time WhatsApp');
            // Limpar timeout de reconexão se existir
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Canal WhatsApp ${status} - programando reconexão...`);
            
            // Implementar backoff exponencial para reconexão apenas em produção
            if (process.env.NODE_ENV === 'production') {
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
              }
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (channelRef.current) {
                  console.log('Tentando reconectar canal WhatsApp...');
                  supabase.removeChannel(channelRef.current);
                  channelRef.current = null;
                  setupRealtimeSubscription();
                }
              }, 5000); // 5 segundos de delay
            }
          } else if (status === 'CLOSED') {
            // Em desenvolvimento, não reconectar automaticamente para evitar loops
            if (process.env.NODE_ENV === 'production') {
              console.warn('Canal WhatsApp CLOSED - programando reconexão...');
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
              }
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (channelRef.current) {
                  console.log('Tentando reconectar canal WhatsApp...');
                  supabase.removeChannel(channelRef.current);
                  channelRef.current = null;
                  setupRealtimeSubscription();
                }
              }, 5000);
            } else {
              console.log('Canal WhatsApp CLOSED (desenvolvimento) - não reconectando automaticamente');
            }
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Erro ao configurar subscription real-time WhatsApp:', error);
      setConnectionStatus(prev => ({
        ...prev,
        status: 'error',
        error: 'Erro ao configurar conexão real-time'
      }));
    }
  }, [user?.id]);

  // Effect principal - executado apenas uma vez por usuário
  useEffect(() => {
    if (!user?.id || isInitializedRef.current) return;

    const initializeConnection = async () => {
      isInitializedRef.current = true;
      
      // 1. Buscar status atual
      await fetchCurrentStatus();
      
      // 2. Setup real-time subscription
      setupRealtimeSubscription();
    };

    initializeConnection();

    // Cleanup function
    return () => {
      isInitializedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Erro ao limpar canal WhatsApp:', error);
        }
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchCurrentStatus, setupRealtimeSubscription]);

  // Função para desconectar - memoizada
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

  // Função para reconectar - memoizada
  const reconnect = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'Usuário não autenticado' };

    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect' })
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true };
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

  // Função para refresh manual - memoizada
  const refreshStatus = useCallback(async () => {
    await fetchCurrentStatus();
  }, [fetchCurrentStatus]);

  return {
    connectionStatus,
    isLoading,
    disconnect,
    reconnect,
    refreshStatus
  };
}