import { useState, useEffect, useCallback } from 'react';
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

  // Função para buscar o status atual do banco
  const fetchCurrentStatus = useCallback(async () => {
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

  // Configurar Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    let currentChannel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
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
            console.log('Realtime update:', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const data = payload.new;
              setConnectionStatus({
                status: data.status as any,
                qrCode: data.qr_code,
                user: data.whatsapp_user,
                phoneNumber: data.phone_number,
                connectedAt: data.connected_at,
                disconnectedAt: data.disconnected_at,
                error: data.error_message
              });
            } else if (payload.eventType === 'DELETE') {
              // Se a conexão foi deletada, resetar para disconnected
              setConnectionStatus({
                status: 'disconnected'
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('Canal Realtime status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Conectado ao Realtime para WhatsApp');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Erro no canal Realtime');
            // Tentar reconectar após um delay
            setTimeout(() => {
              fetchCurrentStatus();
            }, 5000);
          }
        });

      setChannel(currentChannel);
    };

    fetchCurrentStatus();
    setupRealtimeSubscription();

    return () => {
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
      }
    };
  }, [user?.id, fetchCurrentStatus]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

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
  }, [user?.id]);

  return {
    connectionStatus,
    isLoading,
    disconnect,
    reconnect,
    refreshStatus: fetchCurrentStatus
  };
}
