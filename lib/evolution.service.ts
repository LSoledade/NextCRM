import axios, { AxiosResponse } from 'axios';

// Cliente Supabase global - será inicializado pela API
let supabaseClient: any = null;

// Função para inicializar o cliente Supabase
export function initializeSupabaseClient(client: any) {
  supabaseClient = client;
}

// --- CONFIGURAÇÕES DA EVOLUTION API ---
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'Leonardo';

// Verificar se as variáveis de ambiente estão configuradas
if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.warn('[Evolution] ATENÇÃO: EVOLUTION_API_URL e EVOLUTION_API_KEY devem ser configuradas no .env');
}

// --- CLIENT HTTP CONFIGURADO ---
const evolutionClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY,
  },
  timeout: 30000, // 30 segundos timeout
});

// --- TIPOS E INTERFACES ---
interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: number;
  pushName?: string;
}

// --- FUNÇÕES UTILITÁRIAS ---

/**
 * Formatar número de telefone para WhatsApp
 */
function formatPhoneNumber(phone: string): string {
  // Remove caracteres especiais
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Se já tem @s.whatsapp.net, retorna como está
  if (phone.includes('@s.whatsapp.net')) {
    return phone;
  }
  
  // Adiciona código do país se necessário (Brasil = 55)
  let formattedPhone = cleanPhone;
  if (cleanPhone.length === 11 && cleanPhone.startsWith('9')) {
    formattedPhone = '55' + cleanPhone;
  } else if (cleanPhone.length === 10) {
    formattedPhone = '55' + cleanPhone;
  }
  
  return `${formattedPhone}@s.whatsapp.net`;
}

// --- PRINCIPAIS FUNÇÕES DA EVOLUTION API ---

/**
 * Verificar se a instância existe e está ativa
 */
export async function checkInstanceStatus(): Promise<{ exists: boolean; status?: string }> {
  try {
    const response = await evolutionClient.get('/instance/fetchInstances');
    
    if (response.data && Array.isArray(response.data)) {
      const instance = response.data.find((inst: any) => inst.instance?.instanceName === INSTANCE_NAME);
      if (instance) {
        return { exists: true, status: instance.instance?.status };
      }
    }
    
    return { exists: false };
  } catch (error: any) {
    console.error('[Evolution] Erro ao verificar instância:', error.response?.data || error.message);
    return { exists: false };
  }
}

/**
 * Verificar status de conexão da instância
 */
export async function getConnectionState(): Promise<{ state: string; status?: any }> {
  try {
    const response = await evolutionClient.get(`/instance/connectionState/${INSTANCE_NAME}`);
    return response.data;
  } catch (error: any) {
    console.error('[Evolution] Erro ao verificar status de conexão:', error.response?.data || error.message);
    throw new Error(`Falha ao verificar conexão: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Enviar mensagem de texto via Evolution API
 */
export async function sendTextMessage(to: string, text: string): Promise<any> {
  try {
    console.log(`[Evolution] Enviando mensagem de texto para: ${to}`);
    
    const number = formatPhoneNumber(to);
    
    const messageData = {
      number: number,
      text: text
    };

    const response = await evolutionClient.post(`/message/sendText/${INSTANCE_NAME}`, messageData);
    
    console.log('[Evolution] Mensagem de texto enviada com sucesso');
    return response.data;
  } catch (error: any) {
    console.error('[Evolution] Erro ao enviar mensagem de texto:', error.response?.data || error.message);
    throw new Error(`Falha ao enviar mensagem: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Enviar mídia via Evolution API
 */
export async function sendMediaMessage(
  to: string, 
  mediaUrl: string, 
  mediaType: 'image' | 'video' | 'audio' | 'document', 
  caption?: string, 
  fileName?: string
): Promise<any> {
  try {
    console.log(`[Evolution] Enviando mídia (${mediaType}) para: ${to}`);
    
    const number = formatPhoneNumber(to);
    
    let endpoint = '';
    let messageData: any = {
      number: number,
      media: mediaUrl
    };

    switch (mediaType) {
      case 'image':
        endpoint = 'sendMedia';
        messageData.mediatype = 'image';
        if (caption) messageData.caption = caption;
        break;
      case 'video':
        endpoint = 'sendMedia';
        messageData.mediatype = 'video';
        if (caption) messageData.caption = caption;
        break;
      case 'audio':
        endpoint = 'sendWhatsAppAudio';
        break;
      case 'document':
        endpoint = 'sendMedia';
        messageData.mediatype = 'document';
        if (fileName) messageData.fileName = fileName;
        if (caption) messageData.caption = caption;
        break;
    }

    const response = await evolutionClient.post(`/message/${endpoint}/${INSTANCE_NAME}`, messageData);
    
    console.log(`[Evolution] Mídia ${mediaType} enviada com sucesso`);
    return response.data;
  } catch (error: any) {
    console.error(`[Evolution] Erro ao enviar mídia ${mediaType}:`, error.response?.data || error.message);
    throw new Error(`Falha ao enviar mídia: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Configurar webhook para receber mensagens
 */
export async function setupWebhook(webhookUrl: string): Promise<void> {
  try {
    console.log(`[Evolution] Configurando webhook: ${webhookUrl}`);
    
    const webhookData = {
      url: webhookUrl,
      events: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED'
      ]
    };

    const response = await evolutionClient.post(`/webhook/set/${INSTANCE_NAME}`, webhookData);
    
    console.log('[Evolution] Webhook configurado com sucesso:', response.data);
  } catch (error: any) {
    console.error('[Evolution] Erro ao configurar webhook:', error.response?.data || error.message);
    throw new Error(`Falha ao configurar webhook: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Processar webhook recebido da Evolution API
 */
export async function processWebhook(webhookData: any): Promise<void> {
  try {
    console.log('[Evolution] Processando webhook:', webhookData.event);
    
    switch (webhookData.event) {
      case 'MESSAGES_UPSERT':
        if (webhookData.data && webhookData.data.messages) {
          for (const message of webhookData.data.messages) {
            await processIncomingMessage(message);
          }
        }
        break;
        
      case 'CONNECTION_UPDATE':
        if (webhookData.data) {
          console.log('[Evolution] Atualização de conexão:', webhookData.data);
        }
        break;
        
      case 'QRCODE_UPDATED':
        if (webhookData.data && webhookData.data.qrcode) {
          console.log('[Evolution] QR Code atualizado');
        }
        break;
        
      default:
        console.log('[Evolution] Evento de webhook não tratado:', webhookData.event);
    }
  } catch (error) {
    console.error('[Evolution] Erro ao processar webhook:', error);
  }
}

/**
 * Processar mensagem recebida via webhook
 */
async function processIncomingMessage(msg: EvolutionMessage): Promise<void> {
  if (!supabaseClient) {
    console.error('[Evolution] Cliente Supabase não inicializado');
    return;
  }

  // Ignorar mensagens enviadas por nós
  if (msg.key.fromMe) {
    return;
  }

  const senderJid = msg.key.remoteJid;
  if (!senderJid) return;

  const senderNumber = senderJid.split('@')[0];
  
  // Buscar lead pelo número de telefone
  const { data: lead } = await supabaseClient
    .from('leads')
    .select('id, user_id')
    .or(`phone.eq.${senderNumber},phone.ilike.%${senderNumber}`)
    .limit(1)
    .single();
    
  if (!lead) {
    console.log('[Evolution] Mensagem de número não cadastrado:', senderNumber);
    return;
  }

  try {
    let messageContent: string | null = null;
    let mediaUrl: string | null = null;
    let mimeType: string | null = null;
    let messageType = 'text';

    // Processar diferentes tipos de mensagem
    if (msg.message.conversation) {
      messageContent = msg.message.conversation;
      messageType = 'text';
    } else if (msg.message.extendedTextMessage) {
      messageContent = msg.message.extendedTextMessage.text;
      messageType = 'text';
    } else if (msg.message.imageMessage) {
      messageType = 'image';
      messageContent = msg.message.imageMessage.caption || null;
      mimeType = msg.message.imageMessage.mimetype;
      mediaUrl = msg.message.imageMessage.url || null;
    } else if (msg.message.videoMessage) {
      messageType = 'video';
      messageContent = msg.message.videoMessage.caption || null;
      mimeType = msg.message.videoMessage.mimetype;
      mediaUrl = msg.message.videoMessage.url || null;
    } else if (msg.message.audioMessage) {
      messageType = 'audio';
      mimeType = msg.message.audioMessage.mimetype;
      mediaUrl = msg.message.audioMessage.url || null;
    } else if (msg.message.documentMessage) {
      messageType = 'document';
      messageContent = msg.message.documentMessage.caption || msg.message.documentMessage.fileName || null;
      mimeType = msg.message.documentMessage.mimetype;
      mediaUrl = msg.message.documentMessage.url || null;
    }

    // Salvar mensagem no banco
    await supabaseClient.from('whatsapp_messages').insert({
      lead_id: lead.id,
      user_id: lead.user_id,
      sender_jid: senderJid,
      message_content: messageContent,
      message_timestamp: new Date(msg.messageTimestamp * 1000),
      message_id: msg.key.id,
      is_from_lead: true,
      message_type: messageType,
      media_url: mediaUrl,
      mime_type: mimeType,
    });

    console.log('[Evolution] Mensagem salva com sucesso para lead:', lead.id);

  } catch (error) {
    console.error('[Evolution] Erro ao processar mensagem:', error);
  }
}

/**
 * Função para obter informações da instância
 */
export async function getInstanceInfo(): Promise<any> {
  try {
    const response = await evolutionClient.get('/instance/fetchInstances');
    
    if (response.data && Array.isArray(response.data)) {
      const instance = response.data.find((inst: any) => inst.instance?.instanceName === INSTANCE_NAME);
      return instance || null;
    }
    
    return null;
  } catch (error: any) {
    console.error('[Evolution] Erro ao obter info da instância:', error.response?.data || error.message);
    throw new Error(`Falha ao obter informações da instância: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Função para obter perfil do WhatsApp conectado
 */
export async function getProfile(): Promise<any> {
  try {
    const response = await evolutionClient.get(`/chat/fetchProfile/${INSTANCE_NAME}`);
    return response.data;
  } catch (error: any) {
    console.error('[Evolution] Erro ao obter perfil:', error.response?.data || error.message);
    return null;
  }
}

// --- FUNÇÕES DE COMPATIBILIDADE PARA O CRM ---

/**
 * Compatibilidade: função principal para enviar mensagens
 */
export async function sendWhatsappMessage(to: string, content: any): Promise<any> {
  if (typeof content === 'string') {
    return await sendTextMessage(to, content);
  } else if (content.text) {
    return await sendTextMessage(to, content.text);
  } else if (content.image) {
    return await sendMediaMessage(to, content.image, 'image', content.caption);
  } else if (content.video) {
    return await sendMediaMessage(to, content.video, 'video', content.caption);
  } else if (content.audio) {
    return await sendMediaMessage(to, content.audio, 'audio');
  } else if (content.document) {
    return await sendMediaMessage(to, content.document, 'document', content.caption, content.fileName);
  } else {
    throw new Error('Tipo de mensagem não suportado');
  }
}

/**
 * Função para obter status geral da conexão
 */
export function getConnectionStatus() {
  return {
    service: 'Evolution API',
    url: EVOLUTION_API_URL,
    instance: INSTANCE_NAME,
    version: '2.2.3'
  };
}

// --- FUNÇÕES ADICIONAIS PARA COMPATIBILIDADE ---

/**
 * Inicializar conexão WhatsApp (legacy compatibility)
 */
export async function initializeWhatsAppConnection(): Promise<any> {
  return await getConnectionState();
}

/**
 * Buscar QR Code (legacy compatibility)
 */
export async function fetchQRCode(): Promise<string | null> {
  try {
    // Para Evolution API, o QR code vem de outro endpoint
    const response = await evolutionClient.get(`/instance/connect/${INSTANCE_NAME}`);
    return response.data?.qrcode?.code || null;
  } catch (error) {
    console.warn('[Evolution] Erro ao buscar QR Code:', error);
    return null;
  }
}

/**
 * Obter socket (legacy compatibility)
 */
export function getSocket(): any {
  // Evolution API não usa socket direto, retorna info da conexão
  return {
    user: null,
    state: 'checking'
  };
}

/**
 * Reset do estado de autenticação
 */
export async function resetAuthState(): Promise<void> {
  try {
    // Tentar desconectar a instância
    await evolutionClient.delete(`/instance/logout/${INSTANCE_NAME}`);
    console.log('[Evolution] Estado de autenticação resetado');
  } catch (error: any) {
    console.warn('[Evolution] Erro ao resetar autenticação:', error.response?.data || error.message);
  }
}

/**
 * Desconectar instância
 */
export async function disconnect(): Promise<void> {
  try {
    await evolutionClient.delete(`/instance/logout/${INSTANCE_NAME}`);
    console.log('[Evolution] Instância desconectada');
  } catch (error: any) {
    console.error('[Evolution] Erro ao desconectar:', error.response?.data || error.message);
    throw new Error(`Falha ao desconectar: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Verificar status da conexão (legacy compatibility)
 */
export async function checkConnectionStatus(): Promise<any> {
  return await getConnectionState();
}

/**
 * Conectar ao WhatsApp
 */
export async function connectToWhatsApp(): Promise<any> {
  try {
    console.log('[Evolution] Iniciando conexão WhatsApp...');
    
    // Verificar se a instância existe
    const instanceStatus = await checkInstanceStatus();
    
    if (!instanceStatus.exists) {
      // Criar instância se não existir
      const createData = {
        instanceName: INSTANCE_NAME,
        token: EVOLUTION_API_KEY,
        qrcode: true,
        number: false,
        webhook: true
      };
      
      await evolutionClient.post('/instance/create', createData);
      console.log('[Evolution] Instância criada:', INSTANCE_NAME);
    }
    
    // Conectar a instância
    const response = await evolutionClient.post(`/instance/connect/${INSTANCE_NAME}`);
    console.log('[Evolution] Comando de conexão enviado');
    
    return response.data;
  } catch (error: any) {
    console.error('[Evolution] Erro ao conectar WhatsApp:', error.response?.data || error.message);
    throw new Error(`Falha ao conectar: ${error.response?.data?.message || error.message}`);
  }
}

// --- LOG DE INICIALIZAÇÃO ---
console.log(`[Evolution] Serviço inicializado - URL: ${EVOLUTION_API_URL}, Instância: ${INSTANCE_NAME}`);
