import { Boom } from '@hapi/boom';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessage,
  WASocket,
  proto,
  AuthenticationCreds,
  AuthenticationState,
  downloadMediaMessage,
  AnyMessageContent,
  initAuthCreds,
  SignalDataTypeMap
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { getRedisService, isRedisAvailable, RedisService } from './redis.service';

// Cliente Supabase global - será inicializado pela API
let supabaseClient: any = null;

// Função para inicializar o cliente Supabase
export function initializeSupabaseClient(client: any) {
  supabaseClient = client;
}

// --- REDIS AUTH STORE ---
const BufferJSON = {
  reviver: (key: string, value: any) => {
    if (typeof value === 'object' && value !== null && value.type === 'Buffer' && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  },
  replacer: (key: string, value: any) => {
    if (Buffer.isBuffer(value)) {
      return { type: 'Buffer', data: Array.from(value) };
    }
    return value;
  }
};

const createRedisAuthState = async (): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
  const redisService = await getRedisService();
  
  if (!redisService) {
    throw new Error('[Baileys] Redis não está disponível para auth state');
  }

  const BIND_KEY = 'baileys-auth-creds';

  const readData = async (key: string): Promise<any> => {
    try {
      const data = await redisService.get(`${BIND_KEY}:${key}`);
      if (data) {
        console.log(`[Baileys] Redis read success: ${key}`);
        return JSON.parse(data, BufferJSON.reviver);
      } else {
        console.log(`[Baileys] Redis key not found: ${key} (normal for first run)`);
        return null;
      }
    } catch (error) {
      console.error(`[Baileys] Error reading Redis data for key ${key}:`, error);
      return null;
    }
  };

  const writeData = async (data: any, key: string): Promise<any> => {
    try {
      await redisService.set(`${BIND_KEY}:${key}`, JSON.stringify(data, BufferJSON.replacer));
      console.log(`[Baileys] Redis write success: ${key}`);
      return true;
    } catch (error) {
      console.error(`[Baileys] Error writing Redis data for key ${key}:`, error);
      throw error;
    }
  };

  const removeData = async (key: string): Promise<number> => {
    try {
      await redisService.del(`${BIND_KEY}:${key}`);
      return 1;
    } catch (error) {
      console.error(`[Baileys] Error removing Redis data for key ${key}:`, error);
      return 0;
    }
  };

  const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();
  
  // Verificar se é primeira conexão (sem credenciais válidas)
  const isFirstRun = !creds.registered;
  console.log(`[Baileys] ${isFirstRun ? 'Primeira execução - QR Code será gerado' : 'Credenciais encontradas'}`);

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [key: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<any>[] = [];
          for (const category in data) {
            const cat = category as keyof typeof data;
            const categoryData = data[cat];
            if (categoryData) {
              for (const id in categoryData) {
                const value = categoryData[id as keyof typeof categoryData];
                const key = `${category}-${id}`;
                tasks.push(value ? writeData(value, key) : removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
};

// --- FALLBACK AUTH STATE (para quando Redis não está disponível) ---
const createFileAuthState = async (): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
  console.warn('[Baileys] Usando fallback file auth state (Redis não disponível)');
  
  // Esta é uma implementação simplificada - em produção você pode querer
  // implementar um sistema de arquivo mais robusto ou usar outra persistência
  let creds = initAuthCreds();
  const keys: any = {};

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [key: string]: any } = {};
          ids.forEach(id => {
            const key = `${type}-${id}`;
            data[id] = keys[key] || null;
          });
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            const categoryData = data[category as keyof typeof data];
            if (categoryData) {
              for (const id in categoryData) {
                const key = `${category}-${id}`;
                const value = categoryData[id as keyof typeof categoryData];
                if (value) {
                  keys[key] = value;
                } else {
                  delete keys[key];
                }
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      // Em um fallback real, você salvaria em arquivo ou banco
      console.log('[Baileys] Salvando credenciais (fallback mode)');
    },
  };
};

// --- VARIÁVEIS GLOBAIS ---
let socket: WASocket | null = null;
let qrCode: string | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const logger = pino({ level: 'silent' });

// --- FUNÇÕES DE UPLOAD DE MÍDIA ---
async function uploadMediaToSupabase(buffer: Buffer, mimeType: string, leadId: string): Promise<string> {
  if (!supabaseClient) {
    throw new Error('Cliente Supabase não inicializado');
  }

  const fileExtension = mimeType.split('/')[1] || 'bin';
  const fileName = `whatsapp_media/${leadId}/${new Date().getTime()}.${fileExtension}`;
  
  const { data, error } = await supabaseClient.storage
    .from('crm-assets')
    .upload(fileName, buffer, { 
      contentType: mimeType,
      cacheControl: '3600'
    });
    
  if (error) {
    throw new Error(`Falha no upload para o Supabase Storage: ${error.message}`);
  }
  
  const { data: { publicUrl } } = supabaseClient.storage
    .from('crm-assets')
    .getPublicUrl(data.path);
    
  return publicUrl;
}

// --- FUNÇÃO PRINCIPAL DE CONEXÃO ---
export async function connectToWhatsApp(): Promise<WASocket> {
  if (socket && socket.user) {
    console.log('[Baileys] Socket já conectado');
    return socket;
  }

  // Verificar se é instância primária
  if (process.env.PRIMARY_INSTANCE !== 'true') {
    throw new Error('[Baileys] Apenas a instância primária pode conectar ao WhatsApp');
  }

  connectionAttempts++;
  if (connectionAttempts > MAX_CONNECTION_ATTEMPTS) {
    throw new Error('[Baileys] Número máximo de tentativas de conexão excedido');
  }

  try {
    // Inicializar Redis (com fallback se não disponível)
    const redisAvailable = await isRedisAvailable();
    let authState;
    
    if (redisAvailable) {
      authState = await createRedisAuthState();
      console.log('[Baileys] Usando Redis auth state');
    } else {
      authState = await createFileAuthState();
      console.log('[Baileys] Usando fallback auth state');
    }

    const { state, saveCreds } = authState;
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`[Baileys] Usando versão: ${version.join('.')}, é a mais recente: ${isLatest}`);

    socket = makeWASocket({
      version,
      auth: { 
        creds: state.creds, 
        keys: makeCacheableSignalKeyStore(state.keys, logger) 
      },
      logger,
      browser: ['FavaleTrainer CRM', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      defaultQueryTimeoutMs: 60000, // Aumentar timeout
      connectTimeoutMs: 60000, // Timeout de conexão
      qrTimeout: 40000, // Timeout para QR code
    });

    // --- EVENT HANDLERS ---
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      qrCode = qr ?? null;

      console.log('[Baileys] Connection update:', { 
        connection, 
        qr: !!qr, 
        lastDisconnect: lastDisconnect ? {
          error: lastDisconnect.error?.message,
          statusCode: (lastDisconnect.error as Boom)?.output?.statusCode
        } : null
      });

      if (qr) {
        console.log('[Baileys] QR Code gerado - tamanho:', qr.length);
        await updateConnectionStatus('qr_ready', qr, null);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        
        console.log('[Baileys] Conexão fechada. Status code:', statusCode, 'Should reconnect:', shouldReconnect);
        
        if (shouldReconnect && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
          console.log('[Baileys] Tentando reconectar...');
          setTimeout(() => connectToWhatsApp(), 5000); // Aguardar 5s antes de reconectar
        } else {
          socket = null;
          qrCode = null;
          connectionAttempts = 0;
          console.log('[Baileys] Desconectado permanentemente ou máximo de tentativas atingido');
          
          // Atualizar status no Supabase
          await updateConnectionStatus('disconnected', null, null, 
            statusCode === DisconnectReason.loggedOut ? 'Desconectado pelo usuário' : 'Conexão perdida');
        }
      } else if (connection === 'open') {
        qrCode = null;
        connectionAttempts = 0; // Reset counter on successful connection
        console.log('[Baileys] Conexão estabelecida com sucesso!');
        
        // Atualizar status no Supabase
        await updateConnectionStatus('connected', null, socket?.user);
      } else if (connection === 'connecting') {
        console.log('[Baileys] Iniciando conexão...');
        await updateConnectionStatus('connecting', null, null);
      }
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;
      
      const senderJid = msg.key.remoteJid;
      if (!senderJid) return;

      try {
        await processIncomingMessage(msg, senderJid);
      } catch (error) {
        console.error('[Baileys] Erro ao processar mensagem:', error);
      }
    });

    return socket;

  } catch (error) {
    console.error('[Baileys] Erro ao conectar:', error);
    socket = null;
    qrCode = null;
    throw error;
  }
}

// --- PROCESSAMENTO DE MENSAGENS RECEBIDAS ---
async function processIncomingMessage(msg: WAMessage, senderJid: string) {
  if (!supabaseClient) {
    console.error('[Baileys] Cliente Supabase não inicializado');
    return;
  }

  const senderNumber = senderJid.split('@')[0];
  
  // Buscar lead pelo número de telefone
  const { data: lead } = await supabaseClient
    .from('leads')
    .select('id, user_id')
    .or(`phone.eq.${senderNumber},phone.ilike.%${senderNumber}`)
    .limit(1)
    .single();
    
  if (!lead) {
    console.log('[Baileys] Mensagem de número não cadastrado:', senderNumber);
    return;
  }

  const messageType = Object.keys(msg.message!)[0];
  let messageContent: string | null = null;
  let mediaUrl: string | null = null;
  let mimeType: string | null = null;

  try {
    switch (messageType) {
      case 'conversation':
        messageContent = msg.message!.conversation ?? null;
        break;
        
      case 'extendedTextMessage':
        messageContent = msg.message!.extendedTextMessage?.text ?? null;
        break;
        
      case 'imageMessage':
      case 'videoMessage':
      case 'audioMessage':
      case 'documentMessage':
        const mediaBuffer = await downloadMediaMessage(
          msg, 
          'buffer', 
          {}, 
          { logger, reuploadRequest: socket!.updateMediaMessage }
        );
        
        const messageMedia = msg.message![messageType as keyof typeof msg.message] as any;
        mimeType = messageMedia?.mimetype ?? null;
        
        if (mimeType && mediaBuffer) {
          mediaUrl = await uploadMediaToSupabase(mediaBuffer as Buffer, mimeType, lead.id);
        }
        
        messageContent = messageMedia?.caption ?? null;
        break;
        
      default:
        console.log('[Baileys] Tipo de mensagem não suportado:', messageType);
        return;
    }

    // Salvar mensagem no banco
    await supabaseClient.from('whatsapp_messages').insert({
      lead_id: lead.id,
      user_id: lead.user_id,
      sender_jid: senderJid,
      message_content: messageContent,
      message_timestamp: new Date(Number(msg.messageTimestamp) * 1000),
      message_id: msg.key.id,
      is_from_lead: true,
      message_type: messageType.replace('Message', ''),
      media_url: mediaUrl,
      mime_type: mimeType,
    });

    console.log('[Baileys] Mensagem salva com sucesso para lead:', lead.id);

  } catch (error) {
    console.error('[Baileys] Erro ao processar mensagem:', error);
  }
}

// --- FUNÇÕES UTILITÁRIAS ---
export function getSocket(): WASocket {
  if (!socket) {
    throw new Error('[Baileys] Socket do WhatsApp não está conectado');
  }
  return socket;
}

export function getQRCode(): string | null {
  return qrCode;
}

export async function sendWhatsappMessage(to: string, content: AnyMessageContent): Promise<WAMessage | undefined> {
  const jid = `${to}@s.whatsapp.net`;
  const sock = getSocket();
  
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    
    const sentMsg = await sock.sendMessage(jid, content);
    
    await sock.sendPresenceUpdate('paused', jid);
    
    console.log('[Baileys] Mensagem enviada com sucesso para:', to);
    return sentMsg;
  } catch (error) {
    console.error('[Baileys] Erro ao enviar mensagem:', error);
    throw error;
  }
}

// --- FUNÇÃO PARA ATUALIZAR STATUS NO SUPABASE ---
async function updateConnectionStatus(
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error',
  qrCode: string | null = null,
  whatsappUser: any = null,
  errorMessage: string | null = null
) {
  try {
    if (!supabaseClient) {
      console.log(`[Baileys] Status atualizado para: ${status} (Supabase não inicializado)`);
      return;
    }

    console.log(`[Baileys] Atualizando status para: ${status}`);

    // Buscar o primeiro usuário admin/ativo para associar a conexão WhatsApp
    const { data: users, error: userError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.warn(`[Baileys] Nenhum usuário admin encontrado para associar a conexão`);
      return;
    }

    const userId = users[0].user_id;

    // Tentar upsert na tabela de conexões WhatsApp
    const { error } = await supabaseClient
      .from('whatsapp_connections')
      .upsert({
        user_id: userId,
        status: status,
        qr_code: qrCode,
        whatsapp_user: whatsappUser,
        phone_number: whatsappUser?.id || null,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[Baileys] Erro ao atualizar status no Supabase:', error);
    } else {
      console.log('[Baileys] Status atualizado com sucesso no Supabase');
    }
    
  } catch (error) {
    console.error('[Baileys] Erro ao atualizar status no Supabase:', error);
  }
}

// --- INICIALIZAÇÃO AUTOMÁTICA EM PRODUÇÃO ---
if (process.env.NODE_ENV === 'production' || process.env.PRIMARY_INSTANCE === 'true') {
  // Aguardar um pouco antes de tentar conectar automaticamente
  setTimeout(async () => {
    try {
      console.log('[Baileys] Iniciando conexão automática...');
      
      // Inicializar cliente Supabase para operações automáticas
      if (!supabaseClient) {
        const { createClient } = await import('@/utils/supabase/server');
        const client = await createClient();
        initializeSupabaseClient(client);
      }
      
      await connectToWhatsApp();
      console.log('[Baileys] Conexão automática estabelecida com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[Baileys] Falha na conexão inicial automática:', errorMessage);
      // Tentar novamente em 30 segundos
      setTimeout(() => {
        connectToWhatsApp().catch(retryErr => {
          const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
          console.error('[Baileys] Segunda tentativa de conexão falhou:', retryErrorMessage);
        });
      }, 30000);
    }
  }, 5000);
}

export { updateConnectionStatus };