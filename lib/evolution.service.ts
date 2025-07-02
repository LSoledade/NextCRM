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
  message: string;
  instanceName?: string;
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
      webhook_by_events: true
    };
    
    const response = await api.post(`/webhook/set/${instanceName}`, payload);
    console.log('✅ Webhook configurado com sucesso');
    
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao configurar webhook:', error.message);
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
    
    const payload = {
      number: data.phone,
      text: data.message
    };
    
    const response = await api.post(`/message/sendText/${instanceName}`, payload);
    console.log('✅ Mensagem enviada com sucesso');
    
    // Retornar a resposta completa da API em vez de apenas true
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
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
        // Aqui você pode implementar lógica para atualizar o QR Code na interface
        break;

      case 'CONNECTION_UPDATE':
        console.log('🔗 Status de conexão atualizado:', webhookData.data?.state);
        // Aqui você pode implementar lógica para atualizar o status da conexão
        break;

      case 'MESSAGES_UPSERT':
        console.log('📨 Nova mensagem recebida:', {
          from: webhookData.data?.key?.remoteJid,
          message: webhookData.data?.message
        });
        // Aqui você pode implementar lógica para processar mensagens recebidas
        break;

      case 'SEND_MESSAGE':
        console.log('📤 Mensagem enviada confirmada');
        // Aqui você pode implementar lógica para confirmar envio de mensagens
        break;

      case 'MESSAGES_UPDATE':
        console.log('📝 Mensagem atualizada');
        // Aqui você pode implementar lógica para atualizar status de mensagens
        break;

      case 'MESSAGES_DELETE':
        console.log('🗑️ Mensagem deletada');
        // Aqui você pode implementar lógica para processar mensagens deletadas
        break;

      case 'CONTACTS_UPSERT':
        console.log('👥 Contatos atualizados');
        // Aqui você pode implementar lógica para sincronizar contatos
        break;

      case 'CHATS_UPSERT':
        console.log('💬 Chats atualizados');
        // Aqui você pode implementar lógica para sincronizar chats
        break;

      case 'APPLICATION_STARTUP':
        console.log('🚀 Aplicação iniciada');
        // Aqui você pode implementar lógica para quando a instância inicia
        break;

      default:
        console.log(`⚠️ Evento não processado: ${webhookData.event}`);
        break;
    }

    // Log completo dos dados para debug (remova em produção se necessário)
    console.log('📊 Dados completos do webhook:', JSON.stringify(webhookData, null, 2));

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error.message);
    throw error;
  }
}

/**
 * Alias para checkInstanceStatus para compatibilidade
 */
export async function checkConnectionStatus(instanceName: string = INSTANCE_NAME): Promise<InstanceStatus> {
  return await checkInstanceStatus(instanceName);
}
