'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Trash2, Play, Pause } from 'lucide-react';

interface DebugMessage {
  id: string | number;
  lead_id: string;
  message_content: string;
  message_type: string;
  message_timestamp: string;
  is_from_lead: boolean;
  sender_jid: string;
  lead?: {
    name: string;
    phone: string;
  };
}

interface DebugLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export default function WhatsappDebugMonitor() {
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const newLog: DebugLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Manter apenas 50 logs
  };

  const fetchRecentMessages = async () => {
    setLoading(true);
    try {
      addLog('info', 'Buscando mensagens recentes...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        addLog('error', 'Usuário não autenticado', userError);
        return;
      }

      const { data: recentMessages, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          id,
          lead_id,
          message_content,
          message_type,
          message_timestamp,
          is_from_lead,
          sender_jid,
          leads (
            name,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('message_timestamp', { ascending: false })
        .limit(20);

      if (error) {
        addLog('error', 'Erro ao buscar mensagens', error);
        return;
      }

      setMessages(recentMessages || []);
      addLog('success', `${recentMessages?.length || 0} mensagens carregadas`);
      
    } catch (error) {
      addLog('error', 'Erro inesperado ao buscar mensagens', error);
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = () => {
    if (isMonitoring) return;
    
    addLog('info', 'Iniciando monitoramento em tempo real...');
    setIsMonitoring(true);

    const subscription = supabase
      .channel('debug_whatsapp_monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          addLog('success', `Nova mensagem detectada via Realtime`, payload);
          
          if (payload.eventType === 'INSERT') {
            // Buscar dados completos da mensagem inserida
            fetchMessageWithLead(payload.new.id);
          }
        }
      )
      .subscribe((status) => {
        addLog('info', `Status da subscription: ${status}`);
      });

    return () => {
      addLog('info', 'Parando monitoramento...');
      subscription.unsubscribe();
      setIsMonitoring(false);
    };
  };

  const fetchMessageWithLead = async (messageId: string) => {
    try {
      const { data: message, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          id,
          lead_id,
          message_content,
          message_type,
          message_timestamp,
          is_from_lead,
          sender_jid,
          leads (
            name,
            phone
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) {
        addLog('error', 'Erro ao buscar detalhes da mensagem', error);
        return;
      }

      if (message) {
        setMessages(prev => [message, ...prev.slice(0, 19)]);
        addLog('success', 'Mensagem adicionada à lista');
      }
    } catch (error) {
      addLog('error', 'Erro inesperado ao buscar detalhes da mensagem', error);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    addLog('info', 'Monitoramento parado');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testWebhook = async () => {
    try {
      addLog('info', 'Testando webhook...');
      
      const response = await fetch('/api/whatsapp/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        addLog('success', 'Webhook testado com sucesso', result);
      } else {
        addLog('error', `Erro no webhook: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog('error', 'Erro ao testar webhook', error);
    }
  };

  const checkWebhookConfig = async () => {
    try {
      addLog('info', 'Verificando configuração do webhook...');
      
      const response = await fetch('/api/whatsapp/check-config');
      
      if (response.ok) {
        const result = await response.json();
        addLog('success', 'Configuração verificada', result);
      } else {
        addLog('error', `Erro ao verificar configuração: ${response.status}`);
      }
    } catch (error) {
      addLog('error', 'Erro ao verificar configuração', error);
    }
  };

  const setupWebhook = async () => {
    try {
      addLog('info', 'Reconfigurando webhook...');
      
      const response = await fetch('/api/whatsapp/setup-webhook', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        addLog('success', 'Webhook reconfigurado com sucesso', result);
      } else {
        addLog('error', `Erro ao reconfigurar webhook: ${response.status}`);
      }
    } catch (error) {
      addLog('error', 'Erro ao reconfigurar webhook', error);
    }
  };

  const reconnectInstance = async () => {
    try {
      addLog('info', 'Reconectando instância WhatsApp...');
      
      const response = await fetch('/api/whatsapp/reconnect', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        addLog('success', 'Tentativa de reconexão iniciada', result);
        
        if (result.instructions) {
          addLog('warning', result.instructions);
        }
      } else {
        addLog('error', `Erro ao reconectar: ${response.status}`);
      }
    } catch (error) {
      addLog('error', 'Erro ao reconectar instância', error);
    }
  };

  useEffect(() => {
    fetchRecentMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      const cleanup = startMonitoring();
      return cleanup;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getLogBadgeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Monitor de Debug WhatsApp</CardTitle>
          <CardDescription>
            Monitore mensagens em tempo real e visualize logs de debug
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={fetchRecentMessages}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Mensagens
            </Button>
            
            <Button
              onClick={isMonitoring ? stopMonitoring : () => setIsMonitoring(true)}
              variant={isMonitoring ? "secondary" : "default"}
            >
              {isMonitoring ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Parar Monitor
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Monitor
                </>
              )}
            </Button>
            
            <Button onClick={testWebhook} variant="outline">
              Testar Webhook
            </Button>
            
            <Button onClick={checkWebhookConfig} variant="outline">
              Verificar Config
            </Button>
            
            <Button onClick={setupWebhook} variant="outline">
              Reconfigurar Webhook
            </Button>
            
            <Button onClick={reconnectInstance} variant="default">
              Reconectar WhatsApp
            </Button>
            
            <Button onClick={clearLogs} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Logs
            </Button>
          </div>
          
          {isMonitoring && (
            <div className="mt-4">
              <Badge className="bg-green-500 animate-pulse">
                🟢 Monitoramento Ativo
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mensagens Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens Recentes</CardTitle>
            <CardDescription>
              {messages.length} mensagens encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {message.lead?.name || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {message.lead?.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={message.is_from_lead ? "default" : "secondary"}
                        >
                          {message.is_from_lead ? 'Recebida' : 'Enviada'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(message.message_timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-2 rounded text-sm">
                      <p className="font-mono">
                        {message.message_content || '[Sem conteúdo]'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Tipo: {message.message_type}</span>
                      <span>ID: {String(message.id).slice(0, 8)}...</span>
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem encontrada
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Logs de Debug */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Debug</CardTitle>
            <CardDescription>
              {logs.length} logs capturados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getLogBadgeColor(log.type)} text-white text-xs`}>
                        {log.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    
                    <p className="ml-2 mb-1">{log.message}</p>
                    
                    {log.data && (
                      <details className="ml-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          Ver dados
                        </summary>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {index < logs.length - 1 && <Separator className="mt-2" />}
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum log ainda
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
