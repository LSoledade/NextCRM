import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || 'Leonardo';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be set in environment variables');
}

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
});

export interface InstanceStatus {
  exists: boolean;
  connected: boolean;
  status: string;
  profile?: {
    name: string;
    number: string;
  };
}

export interface QRCodeResponse {
  qrCode?: string;
  pairingCode?: string;
  error?: string;
}

export interface WhatsAppMessage {
  phone: string;
  message: string | any; // Suporta tanto texto simples quanto objetos de mídia
  instanceName?: string;
}

export interface WhatsAppTextMessage {
  number: string;
  text: string;
}

export interface WhatsAppMediaMessage {
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  media: string; // URL ou base64
  caption?: string;
  filename?: string;
}

/**
 * Verifica o status de uma instância do WhatsApp
 */
export async function checkInstanceStatus(instanceName: string = INSTANCE_NAME): Promise<InstanceStatus> {
  try {
    console.log(`🔍 Verificando status da instância: ${instanceName}`);
    
    // Busca todas as instâncias
    const response = await api.get('/instance/fetchInstances');
    const instances = response.data;
    
    console.log('📋 Instâncias encontradas:', instances.length);
    
    // Procura pela instância específica
    const instance = instances.find((inst: any) => inst.name === instanceName);
    
    if (!instance) {
      console.log(`❌ Instância ${instanceName} não encontrada`);
      return {
        exists: false,
        connected: false,
        status: 'not_found'
      };
    }
    
    console.log(`✅ Instância encontrada: ${instance.name}`);
    console.log(`🔗 Status de conexão: ${instance.connectionStatus}`);
    
    const isConnected = instance.connectionStatus === 'open';
    
    return {
      exists: true,
      connected: isConnected,
      status: instance.connectionStatus,
      profile: instance.profileName ? {
        name: instance.profileName,
        number: instance.profilePictureUrl || ''
      } : undefined
    };
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar status da instância:', error.message);
    return {
      exists: false,
      connected: false,
      status: 'error',
    };
  }
}

/**
 * Obtém o QR Code para conectar a instância
 */
export async function fetchQRCode(instanceName: string = INSTANCE_NAME): Promise<QRCodeResponse> {
  try {
    console.log(`📱 Obtendo QR Code para: ${instanceName}`);
    
    // Primeiro verifica se a instância existe e seu status
    const status = await checkInstanceStatus(instanceName);
    
    if (!status.exists) {
      console.log('❌ Instância não existe, criando...');
      await createInstance(instanceName);
    }
    
    if (status.connected) {
      console.log('✅ Instância já está conectada');
      return { error: 'Instance already connected' };
    }
    
    // Usa o endpoint correto para obter QR Code
    console.log('🔄 Obtendo QR Code...');
    const response = await api.get(`/instance/connect/${instanceName}`);
    
    console.log('📱 Resposta do QR Code:', {
      hasCode: !!response.data.code,
      hasPairingCode: !!response.data.pairingCode,
      codeLength: response.data.code?.length || 0
    });
    
    if (response.data.code) {
      return {
        qrCode: response.data.code,
        pairingCode: response.data.pairingCode || undefined
      };
    }
    
    throw new Error('QR Code not available in response');
    
  } catch (error: any) {
    console.error('❌ Erro ao obter QR Code:', error.message);
    return {
      error: error.message || 'Failed to fetch QR code'
    };
  }
}

/**
 * Cria uma nova instância
 */
export async function createInstance(instanceName: string = INSTANCE_NAME): Promise<boolean> {
  try {
    console.log(`🆕 Criando instância: ${instanceName}`);
    
    const payload = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: WEBHOOK_URL,
      webhook_by_events: true,
      events: [
        "APPLICATION_STARTUP",
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "MESSAGES_DELETE",
        "SEND_MESSAGE",
        "CONTACTS_SET",
        "CONTACTS_UPSERT",
        "CONTACTS_UPDATE",
        "PRESENCE_UPDATE",
        "CHATS_SET",
        "CHATS_UPSERT",
        "CHATS_UPDATE",
        "CHATS_DELETE",
        "GROUPS_UPSERT",
        "GROUP_UPDATE",
        "GROUP_PARTICIPANTS_UPDATE",
        "CONNECTION_UPDATE",
        "CALL",
        "NEW_JWT_TOKEN"
      ]
    };
    
    const response = await api.post('/instance/create', payload);
    console.log('✅ Instância criada com sucesso');
    
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao criar instância:', error.message);
    return false;
  }
}

/**
 * Reconecta uma instância existente
 */
export async function reconnectInstance(instanceName: string = INSTANCE_NAME): Promise<QRCodeResponse> {
  try {
    console.log(`🔄 Reconectando instância: ${instanceName}`);
    
    // Primeiro faz logout para limpar a conexão
    try {
      await api.delete(`/instance/logout/${instanceName}`);
      console.log('✅ Logout realizado');
    } catch (logoutError) {
      console.log('⚠️ Erro no logout (pode ser normal):', (logoutError as any).message);
    }
    
    // Aguarda um pouco antes de tentar reconectar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Obtém novo QR Code
    return await fetchQRCode(instanceName);
    
  } catch (error: any) {
    console.error('❌ Erro ao reconectar instância:', error.message);
    return {
      error: error.message || 'Failed to reconnect instance'
    };
  }
}

/**
 * Configura o webhook para uma instância
 */
export async function setupWebhook(instanceName: string = INSTANCE_NAME): Promise<boolean> {
  try {
    console.log(`🕷️ Configurando webhook para: ${instanceName}`);
    console.log(`🌐 URL do webhook: ${WEBHOOK_URL}`);
    
    const payload = {
      enabled: true,
      url: WEBHOOK_URL,
      events: [
        "APPLICATION_STARTUP",
        "QRCODE_UPDATED", 
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "MESSAGES_DELETE",
        "SEND_MESSAGE",
        "CONTACTS_SET",
        "CONTACTS_UPSERT",
        "CONTACTS_UPDATE",
        "PRESENCE_UPDATE",
        "CHATS_SET",
        "CHATS_UPSERT", 
        "CHATS_UPDATE",
        "CHATS_DELETE",
        "GROUPS_UPSERT",
        "GROUP_UPDATE",
        "GROUP_PARTICIPANTS_UPDATE",
        "CONNECTION_UPDATE",
        "CALL",
        "NEW_JWT_TOKEN"
      ],
      webhook_by_events: false // Usar uma URL única para todos os eventos
    };
    
    console.log('📋 Payload do webhook:', JSON.stringify(payload, null, 2));
    
    const response = await api.post(`/webhook/set/${instanceName}`, payload);
    console.log('✅ Webhook configurado com sucesso');
    console.log('📊 Resposta:', response.data);
    
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao configurar webhook:', error.message);
    
    if (error.response) {
      console.error('📊 Resposta da API:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return false;
  }
}

/**
 * Envia uma mensagem via WhatsApp
 */
export async function sendWhatsAppMessage(data: WhatsAppMessage): Promise<any> {
  try {
    const instanceName = data.instanceName || INSTANCE_NAME;
    console.log(`📤 Enviando mensagem via ${instanceName} para: ${data.phone}`);
    
    // Verifica se a instância está conectada
    const status = await checkInstanceStatus(instanceName);
    if (!status.connected) {
      throw new Error('Instance not connected');
    }

    let endpoint = '';
    let payload: any = {};

    // Determinar tipo de mensagem e endpoint
    if (typeof data.message === 'string') {
      // Mensagem de texto simples
      endpoint = `/message/sendText/${instanceName}`;
      payload = {
        number: data.phone,
        text: data.message
      };
    } else if (typeof data.message === 'object') {
      // Mensagem com mídia ou estruturada
      if (data.message.text) {
        // Mensagem de texto estruturada
        endpoint = `/message/sendText/${instanceName}`;
        payload = {
          number: data.phone,
          text: data.message.text
        };
      } else if (data.message.image) {
        // Mensagem de imagem
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'image',
          media: data.message.image.url,
          caption: data.message.caption || ''
        };
      } else if (data.message.video) {
        // Mensagem de vídeo
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'video',
          media: data.message.video.url,
          caption: data.message.caption || ''
        };
      } else if (data.message.audio) {
        // Mensagem de áudio
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'audio',
          media: data.message.audio.url
        };
      } else if (data.message.document) {
        // Mensagem de documento
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'document',
          media: data.message.document.url,
          filename: data.message.fileName || 'documento'
        };
      } else {
        throw new Error('Formato de mensagem não suportado');
      }
    } else {
      throw new Error('Formato de mensagem inválido');
    }

    console.log(`📡 Enviando para endpoint: ${endpoint}`);
    console.log(`📊 Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await api.post(endpoint, payload);
    console.log('✅ Mensagem enviada com sucesso');
    console.log('📱 Resposta da API:', JSON.stringify(response.data, null, 2));
    
    // Retornar a resposta completa da API
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
    
    // Log detalhado do erro
    if (error.response) {
      console.error('📊 Erro da API:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

/**
 * Envia uma mensagem de texto simples via WhatsApp
 */
export async function sendTextMessage(data: WhatsAppTextMessage, instanceName: string = INSTANCE_NAME): Promise<any> {
  try {
    console.log(`📤 Enviando texto para: ${data.number}`);
    
    const status = await checkInstanceStatus(instanceName);
    if (!status.connected) {
      throw new Error('Instance not connected');
    }

    const response = await api.post(`/message/sendText/${instanceName}`, data);
    console.log('✅ Texto enviado com sucesso');
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao enviar texto:', error.message);
    throw error;
  }
}

/**
 * Envia uma mensagem de mídia via WhatsApp
 */
export async function sendMediaMessage(data: WhatsAppMediaMessage, instanceName: string = INSTANCE_NAME): Promise<any> {
  try {
    console.log(`📤 Enviando mídia (${data.mediatype}) para: ${data.number}`);
    
    const status = await checkInstanceStatus(instanceName);
    if (!status.connected) {
      throw new Error('Instance not connected');
    }

    const response = await api.post(`/message/sendMedia/${instanceName}`, data);
    console.log('✅ Mídia enviada com sucesso');
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao enviar mídia:', error.message);
    throw error;
  }
}

/**
 * Verifica e configura webhook se necessário
 */
export async function ensureWebhookSetup(instanceName: string = INSTANCE_NAME): Promise<boolean> {
  try {
    console.log(`🔧 Verificando configuração do webhook para: ${instanceName}`);
    
    // Verifica webhook atual
    try {
      const response = await api.get(`/webhook/find/${instanceName}`);
      const webhook = response.data;
      
      if (webhook && webhook.enabled && webhook.url === WEBHOOK_URL) {
        console.log('✅ Webhook já está configurado corretamente');
        return true;
      }
    } catch (error) {
      console.log('⚠️ Webhook não configurado, configurando...');
    }
    
    // Configura webhook
    return await setupWebhook(instanceName);
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar/configurar webhook:', error.message);
    return false;
  }
}

/**
 * Conecta ao WhatsApp (alias para fetchQRCode)
 */
export async function connectToWhatsApp(instanceName: string = INSTANCE_NAME): Promise<QRCodeResponse> {
  console.log(`🔗 Conectando ao WhatsApp para instância: ${instanceName}`);
  return await fetchQRCode(instanceName);
}

/**
 * Obtém o status da conexão (versão simplificada)
 */
export function getConnectionStatus(): string {
  // Esta é uma função básica que retorna um status padrão
  // Em uma implementação real, você pode querer armazenar o estado em memória ou cache
  return 'checking';
}

/**
 * Obtém o estado detalhado da conexão
 */
export async function getConnectionState(instanceName: string = INSTANCE_NAME): Promise<{
  state: string;
  status: InstanceStatus;
}> {
  try {
    console.log(`🔍 Obtendo estado da conexão para: ${instanceName}`);
    
    const status = await checkInstanceStatus(instanceName);
    
    let state = 'disconnected';
    if (status.exists && status.connected) {
      state = 'connected';
    } else if (status.exists && !status.connected) {
      state = 'disconnected';
    } else {
      state = 'not_found';
    }
    
    return {
      state,
      status
    };
  } catch (error: any) {
    console.error('❌ Erro ao obter estado da conexão:', error.message);
    return {
      state: 'error',
      status: {
        exists: false,
        connected: false,
        status: 'error'
      }
    };
  }
}

/**
 * Processa eventos de webhook recebidos da Evolution API
 */
export async function processWebhook(webhookData: any): Promise<void> {
  try {
    console.log('📥 Processando webhook:', {
      event: webhookData.event,
      instance: webhookData.instance,
      timestamp: new Date().toISOString()
    });

    // Processa diferentes tipos de eventos
    switch (webhookData.event) {
      case 'QRCODE_UPDATED':
        console.log('📱 QR Code atualizado');
        if (webhookData.data?.qrcode) {
          console.log('🔄 Novo QR Code disponível');
          // Aqui você pode implementar lógica para atualizar o QR Code na interface
          // Exemplo: salvar no Redis ou notificar via WebSocket
        }
        break;

      case 'CONNECTION_UPDATE':
        console.log('🔗 Status de conexão atualizado:', webhookData.data?.state);
        if (webhookData.data?.state === 'open') {
          console.log('✅ WhatsApp conectado com sucesso');
          // Aqui você pode atualizar o status no banco de dados
        } else if (webhookData.data?.state === 'close') {
          console.log('❌ WhatsApp desconectado');
          // Aqui você pode marcar como desconectado no banco
        }
        break;

      case 'MESSAGES_UPSERT':
        console.log('📨 Nova mensagem recebida');
        if (webhookData.data?.messages && Array.isArray(webhookData.data.messages)) {
          for (const message of webhookData.data.messages) {
            await processIncomingMessage(message, webhookData.instance);
          }
        }
        break;

      case 'SEND_MESSAGE':
        console.log('📤 Confirmação de mensagem enviada');
        if (webhookData.data) {
          console.log('✅ Mensagem confirmada como enviada:', {
            messageId: webhookData.data.key?.id,
            to: webhookData.data.key?.remoteJid,
            timestamp: webhookData.data.messageTimestamp
          });
        }
        break;

      case 'MESSAGES_UPDATE':
        console.log('📝 Mensagem atualizada');
        if (webhookData.data?.messages && Array.isArray(webhookData.data.messages)) {
          for (const message of webhookData.data.messages) {
            console.log('🔄 Status da mensagem atualizado:', {
              messageId: message.key?.id,
              status: message.update?.status,
              timestamp: message.update?.timestamp
            });
            // Aqui você pode atualizar o status da mensagem no banco
          }
        }
        break;

      case 'MESSAGES_DELETE':
        console.log('🗑️ Mensagem deletada');
        if (webhookData.data?.messages && Array.isArray(webhookData.data.messages)) {
          for (const message of webhookData.data.messages) {
            console.log('❌ Mensagem deletada:', message.key?.id);
            // Aqui você pode marcar a mensagem como deletada no banco
          }
        }
        break;

      case 'CONTACTS_UPSERT':
        console.log('👥 Contatos atualizados');
        if (webhookData.data?.contacts && Array.isArray(webhookData.data.contacts)) {
          console.log(`📋 ${webhookData.data.contacts.length} contatos atualizados`);
          // Aqui você pode sincronizar contatos com seu banco de dados
        }
        break;

      case 'CHATS_UPSERT':
        console.log('💬 Chats atualizados');
        if (webhookData.data?.chats && Array.isArray(webhookData.data.chats)) {
          console.log(`📋 ${webhookData.data.chats.length} chats atualizados`);
          // Aqui você pode sincronizar chats com seu banco de dados
        }
        break;

      case 'APPLICATION_STARTUP':
        console.log('🚀 Aplicação iniciada');
        console.log('Instance:', webhookData.instance);
        // Aqui você pode implementar lógica para quando a instância inicia
        break;

      case 'PRESENCE_UPDATE':
        console.log('👁️ Status de presença atualizado');
        if (webhookData.data) {
          console.log('👤 Presença:', {
            jid: webhookData.data.id,
            presence: webhookData.data.presences
          });
        }
        break;

      default:
        console.log(`⚠️ Evento não processado: ${webhookData.event}`);
        break;
    }

    // Log completo dos dados para debug em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Dados completos do webhook:', JSON.stringify(webhookData, null, 2));
    }

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error.message);
    throw error;
  }
}

/**
 * Processa mensagens recebidas via webhook
 */
async function processIncomingMessage(message: any, instanceName: string): Promise<void> {
  try {
    console.log('📨 Processando mensagem recebida:', {
      messageId: message.key?.id,
      from: message.key?.remoteJid,
      timestamp: message.messageTimestamp,
      messageType: message.message ? Object.keys(message.message)[0] : 'unknown'
    });

    // Extrair informações da mensagem
    const messageId = message.key?.id;
    const fromJid = message.key?.remoteJid;
    const timestamp = message.messageTimestamp ? new Date(message.messageTimestamp * 1000) : new Date();
    
    // Determinar tipo de mensagem e conteúdo
    let messageContent = '';
    let messageType = 'text';
    let mediaUrl = null;

    if (message.message) {
      if (message.message.conversation) {
        messageContent = message.message.conversation;
        messageType = 'text';
      } else if (message.message.extendedTextMessage) {
        messageContent = message.message.extendedTextMessage.text;
        messageType = 'text';
      } else if (message.message.imageMessage) {
        messageContent = message.message.imageMessage.caption || '';
        messageType = 'image';
        // mediaUrl seria processada aqui se necessário
      } else if (message.message.videoMessage) {
        messageContent = message.message.videoMessage.caption || '';
        messageType = 'video';
      } else if (message.message.audioMessage) {
        messageContent = '[Áudio]';
        messageType = 'audio';
      } else if (message.message.documentMessage) {
        messageContent = message.message.documentMessage.fileName || '[Documento]';
        messageType = 'document';
      }
    }

    console.log('📝 Conteúdo da mensagem processado:', {
      type: messageType,
      content: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
      hasMedia: !!mediaUrl
    });

    // Aqui você pode salvar a mensagem no banco de dados
    // Exemplo: procurar o lead pelo número de telefone e salvar a mensagem

  } catch (error: any) {
    console.error('❌ Erro ao processar mensagem recebida:', error.message);
  }
}

/**
 * Alias para checkInstanceStatus para compatibilidade
 */
export async function checkConnectionStatus(instanceName: string = INSTANCE_NAME): Promise<InstanceStatus> {
  return await checkInstanceStatus(instanceName);
}

/**
 * Testa a conectividade com a Evolution API
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔧 Testando conectividade com Evolution API...');
    console.log('🌐 URL:', EVOLUTION_API_URL);
    console.log('🔑 API Key:', EVOLUTION_API_KEY?.substring(0, 8) + '...');
    
    // Teste básico de conectividade
    const response = await api.get('/instance/fetchInstances');
    
    console.log('✅ Conectividade OK');
    console.log('📊 Resposta:', {
      status: response.status,
      instancesCount: response.data?.length || 0
    });
    
    return {
      success: true,
      message: 'Conectividade com Evolution API OK',
      details: {
        status: response.status,
        instancesFound: response.data?.length || 0,
        url: EVOLUTION_API_URL
      }
    };
    
  } catch (error: any) {
    console.error('❌ Erro de conectividade:', error.message);
    
    let errorDetails: any = {
      url: EVOLUTION_API_URL,
      error: error.message
    };
    
    if (error.response) {
      errorDetails.apiResponse = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }
    
    return {
      success: false,
      message: `Erro de conectividade: ${error.message}`,
      details: errorDetails
    };
  }
}

/**
 * Função de diagnóstico completo
 */
export async function runDiagnostics(): Promise<{
  success: boolean;
  results: any;
}> {
  console.log('🔍 Executando diagnósticos completos...');
  
  const results: any = {
    timestamp: new Date().toISOString(),
    configuration: {
      apiUrl: EVOLUTION_API_URL,
      instanceName: INSTANCE_NAME,
      webhookUrl: WEBHOOK_URL,
      hasApiKey: !!EVOLUTION_API_KEY
    }
  };
  
  try {
    // 1. Teste de conectividade
    console.log('📡 1. Testando conectividade...');
    const connectivity = await testConnection();
    results.connectivity = connectivity;
    
    // 2. Verificar status da instância
    console.log('📱 2. Verificando status da instância...');
    const instanceStatus = await checkInstanceStatus();
    results.instanceStatus = instanceStatus;
    
    // 3. Verificar webhook
    console.log('🕷️ 3. Verificando webhook...');
    try {
      const webhookResponse = await api.get(`/webhook/find/${INSTANCE_NAME}`);
      results.webhook = {
        configured: true,
        details: webhookResponse.data
      };
    } catch (webhookError: any) {
      results.webhook = {
        configured: false,
        error: webhookError.message
      };
    }
    
    // 4. Verificar se pode enviar mensagens
    results.canSendMessages = connectivity.success && instanceStatus.connected;
    
    console.log('✅ Diagnósticos concluídos');
    
    return {
      success: true,
      results
    };
    
  } catch (error: any) {
    console.error('❌ Erro durante diagnósticos:', error.message);
    
    results.error = error.message;
    
    return {
      success: false,
      results
    };
  }
}
