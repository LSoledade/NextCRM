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
        // Check if data is already an object (corrupted data case)
        if (typeof data === 'object') {
          console.warn(`[Baileys] Found corrupted data for key ${key}, clearing...`);
          await redisService.del(`${BIND_KEY}:${key}`);
          return null;
        }
        return JSON.parse(data, BufferJSON.reviver);
      } else {
        console.log(`[Baileys] Redis key not found: ${key} (normal for first run)`);
        return null;
      }
    } catch (error) {
      console.error(`[Baileys] Error reading Redis data for key ${key}:`, error);
      // Clear corrupted data
      try {
        await redisService.del(`${BIND_KEY}:${key}`);
        console.log(`[Baileys] Cleared corrupted Redis data for key ${key}`);
      } catch (delError) {
        console.error(`[Baileys] Error clearing corrupted data:`, delError);
      }
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

  // Função para limpar auth state corrompido
  const clearAuthState = async (): Promise<void> => {
    try {
      console.log('[Baileys] Clearing corrupted auth state...');
      // Tentar limpar todas as chaves relacionadas ao auth state
      const keysToTry = ['creds', 'pre-key', 'session', 'sender-key', 'app-state-sync-key'];
      for (const keyType of keysToTry) {
        try {
          await redisService.del(`${BIND_KEY}:${keyType}`);
        } catch (error) {
          // Ignorar erros individuais
        }
      }
      console.log('[Baileys] Auth state cleared successfully');
    } catch (error) {
      console.error('[Baileys] Error clearing auth state:', error);
    }
  };

  let creds: AuthenticationCreds;
  
  try {
    creds = (await readData('creds')) || initAuthCreds();
  } catch (error) {
    console.warn('[Baileys] Corrupted credentials detected, clearing auth state...');
    await clearAuthState();
    creds = initAuthCreds();
  }
  
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
let isConnecting = false; // Flag para evitar múltiplas conexões simultâneas
let reconnectTimeout: NodeJS.Timeout | null = null; // Para controlar timeouts de reconexão
let qrTimeoutHandler: NodeJS.Timeout | null = null; // Para timeout do QR Code
let lastConnectionAttempt = 0; // Timestamp da última tentativa
let cooldownPeriod = 0; // Período de cooldown atual em ms
const MAX_CONNECTION_ATTEMPTS = 3;
const QR_TIMEOUT_MS = 40000; // 40 segundos timeout para QR Code
const MIN_COOLDOWN_MS = 30000; // 30 segundos mínimo entre tentativas
const MAX_COOLDOWN_MS = 300000; // 5 minutos máximo
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
  // Verificar cooldown antes de tentar conectar
  const cooldownRemaining = getCooldownRemaining();
  if (cooldownRemaining > 0) {
    const secondsRemaining = Math.ceil(cooldownRemaining / 1000);
    const message = `Aguarde ${secondsRemaining}s antes de tentar novamente. Muitas tentativas podem bloquear o WhatsApp.`;
    console.log(`[Baileys] ${message}`);
    throw new Error(message);
  }

  // Evitar múltiplas conexões simultâneas
  if (isConnecting) {
    console.log('[Baileys] Conexão já em andamento, aguardando...');
    // Aguardar até que a conexão atual termine
    let attempts = 0;
    while (isConnecting && attempts < 30) { // máximo 30 segundos
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  if (socket && socket.user) {
    console.log('[Baileys] Socket já conectado');
    return socket;
  }

  // Marcar tentativa de conexão
  lastConnectionAttempt = Date.now();
  calculateCooldown(); // Calcular próximo cooldown

  // Verificar se é instância primária
  if (process.env.PRIMARY_INSTANCE !== 'true') {
    throw new Error('[Baileys] Apenas a instância primária pode conectar ao WhatsApp');
  }

  // Marcar como conectando
  isConnecting = true;
  
  try {
    connectionAttempts++;
    if (connectionAttempts > MAX_CONNECTION_ATTEMPTS) {
      throw new Error('[Baileys] Número máximo de tentativas de conexão excedido');
    }

    console.log(`[Baileys] Iniciando conexão (tentativa ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);

    // Limpar socket anterior se existir
    if (socket) {
      try {
        socket.end(undefined);
      } catch (error) {
        console.warn('[Baileys] Erro ao fechar socket anterior:', error);
      }
      socket = null;
    }

    // Inicializar Redis (with fallback se não disponível)
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
      // Configuração otimizada para melhor compatibilidade
      browser: ['Chrome', 'Desktop', '4.0.0'],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      qrTimeout: 40000, // 40 segundos para evitar QR expirado
      // Configurações para melhor estabilidade
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      printQRInTerminal: false,
      emitOwnEvents: false,
      // Configurações específicas para conexão
      mobile: false,
      getMessage: async (key) => {
        return undefined;
      }
    });

    // --- EVENT HANDLERS ---
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;
      
      console.log('[Baileys] Connection update:', { 
        connection, 
        qr: !!qr, 
        isNewLogin,
        lastDisconnect: lastDisconnect ? {
          error: lastDisconnect.error?.message,
          statusCode: (lastDisconnect.error as Boom)?.output?.statusCode
        } : null
      });

      // Atualizar QR Code
      if (qr) {
        qrCode = qr;
        console.log('[Baileys] QR Code gerado - tamanho:', qr.length);
        console.log('[Baileys] QR Code (primeiros 50 chars):', qr.substring(0, 50) + '...');
        await updateConnectionStatus('qr_ready', qr, null);
        
        // Limpar timeout anterior se existir
        if (qrTimeoutHandler) {
          clearTimeout(qrTimeoutHandler);
        }
        
        // Configurar timeout para o QR Code
        qrTimeoutHandler = setTimeout(async () => {
          console.log('[Baileys] QR Code timeout - gerando novo...');
          // Não resetar auth state, apenas gerar novo QR
          qrCode = null;
          
          // Tentar reconectar se ainda dentro do limite
          if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
            setTimeout(() => {
              connectToWhatsApp().catch(error => {
                console.error('[Baileys] Erro na reconexão após QR timeout:', error);
                isConnecting = false;
              });
            }, 1000);
          } else {
            isConnecting = false;
            await updateConnectionStatus('error', null, null, 'QR Code expirado - tente novamente');
          }
        }, QR_TIMEOUT_MS);
      }

      if (connection === 'close') {
        isConnecting = false; // Liberar flag de conexão
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        
        console.log('[Baileys] Conexão fechada. Status code:', statusCode, 'Should reconnect:', shouldReconnect);
        
        // Detectar se QR Code foi rejeitado ou auth state está corrompido
        // Tratar erros específicos do WhatsApp
        if (statusCode === DisconnectReason.badSession || 
            statusCode === DisconnectReason.multideviceMismatch ||
            lastDisconnect?.error?.message?.includes('Invalid auth state') ||
            lastDisconnect?.error?.message?.includes('QR rejected') ||
            lastDisconnect?.error?.message?.includes('QR code timeout') ||
            lastDisconnect?.error?.message?.includes('Não foi possível conectar') ||
            lastDisconnect?.error?.message?.includes('Connection failed')) {
          
          console.log('[Baileys] Auth state corrompido ou QR rejeitado, resetando...');
          await resetAuthState();
          
          // Limpar timeout anterior se existir
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          
          // Aguardar um pouco antes de tentar reconectar
          reconnectTimeout = setTimeout(() => {
            if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
              console.log('[Baileys] Tentando reconectar com auth state limpo...');
              connectToWhatsApp().catch(error => {
                console.error('[Baileys] Erro na reconexão:', error);
                isConnecting = false; // Garantir que flag seja liberada
              });
            } else {
              isConnecting = false; // Liberar flag se não vai reconectar
            }
          }, 3000);
          
        } else if (shouldReconnect && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
          console.log('[Baileys] Tentando reconectar...');
          
          // Limpar timeout anterior se existir
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          
          reconnectTimeout = setTimeout(() => {
            connectToWhatsApp().catch(error => {
              console.error('[Baileys] Erro na reconexão:', error);
              isConnecting = false; // Garantir que flag seja liberada
            });
          }, 5000); // Aguardar 5s antes de reconectar
        } else {
          socket = null;
          qrCode = null;
          connectionAttempts = 0;
          isConnecting = false; // Garantir que flag seja liberada
          console.log('[Baileys] Desconectado permanentemente ou máximo de tentativas atingido');
          
          // Limpar timeouts se existirem
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          if (qrTimeoutHandler) {
            clearTimeout(qrTimeoutHandler);
            qrTimeoutHandler = null;
          }
          
          // Atualizar status no Supabase
          await updateConnectionStatus('disconnected', null, null, 
            statusCode === DisconnectReason.loggedOut ? 'Desconectado pelo usuário' : 'Conexão perdida');
        }
      } else if (connection === 'open') {
        isConnecting = false; // Liberar flag de conexão
        qrCode = null;
        connectionAttempts = 0; // Reset counter on successful connection
        resetCooldown(); // Resetar cooldown em caso de sucesso
        
        // Limpar timeout do QR Code se existir
        if (qrTimeoutHandler) {
          clearTimeout(qrTimeoutHandler);
          qrTimeoutHandler = null;
        }
        
        console.log('[Baileys] Conexão estabelecida com sucesso! Cooldown resetado.');
        
        // Atualizar status no Supabase
        await updateConnectionStatus('connected', null, socket?.user);
      } else if (connection === 'connecting') {
        console.log('[Baileys] Iniciando conexão...');
        await updateConnectionStatus('connecting', null, null);
      } else if (connection === 'closed') {
        // Liberar flag mesmo quando conexão é fechada sem passar por 'close'
        isConnecting = false;
        console.log('[Baileys] Conexão foi fechada');
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
    isConnecting = false; // Liberar flag de conexão em caso de erro
    console.error('[Baileys] Erro ao conectar:', error);
    socket = null;
    qrCode = null;
    
    // Limpar timeouts se existirem
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (qrTimeoutHandler) {
      clearTimeout(qrTimeoutHandler);
      qrTimeoutHandler = null;
    }
    
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
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.warn(`[Baileys] Nenhum usuário admin encontrado para associar a conexão`);
      return;
    }

    const userId = users[0].id;

    // Use the upsert function instead of direct table upsert
    const { data: connectionId, error } = await supabaseClient
      .rpc('upsert_whatsapp_connection_v2', {
        p_user_id: userId,
        p_status: status,
        p_qr_code: qrCode,
        p_whatsapp_user: whatsappUser,
        p_phone_number: whatsappUser?.id || null,
        p_connected_at: status === 'connected' ? new Date().toISOString() : null,
        p_disconnected_at: status === 'disconnected' ? new Date().toISOString() : null,
        p_error_message: errorMessage
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

// --- FUNÇÕES DE LOCK DE CONCORRÊNCIA (REDIS) ---
async function acquireConnectionLock(userId: string, ttl = 30): Promise<boolean> {
  const redisService = await getRedisService();
  if (!redisService) return true; // Se não houver Redis, não bloqueia
  const lockKey = `whatsapp:lock:${userId}`;
  try {
    // SETNX + EXPIRE (atomic)
    const result = await (redisService as any).set(lockKey, '1', ttl);
    // ioredis: set(key, value, 'NX', 'EX', ttl)
    // vercel/kv: setex(key, ttl, value)
    // Para compatibilidade, retorna true se não existir ou se setex funcionar
    return result === 'OK' || result === undefined;
  } catch (err) {
    console.error('[Baileys] Erro ao adquirir lock Redis:', err);
    return false;
  }
}

async function releaseConnectionLock(userId: string) {
  const redisService = await getRedisService();
  if (!redisService) return;
  const lockKey = `whatsapp:lock:${userId}`;
  try {
    await redisService.del(lockKey);
  } catch (err) {
    console.error('[Baileys] Erro ao liberar lock Redis:', err);
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

// Função para resetar auth state (útil quando QR Code é rejeitado)
export async function resetAuthState(): Promise<void> {
  try {
    console.log('[Baileys] Resetting auth state...');
    
    // Liberar flag de conexão
    isConnecting = false;
    
    // Limpar timeout de reconexão se existir
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    // Limpar timeout do QR Code se existir
    if (qrTimeoutHandler) {
      clearTimeout(qrTimeoutHandler);
      qrTimeoutHandler = null;
    }
    
    // Tentar fazer logout explícito para liberar slot de dispositivo
    if (socket) {
      try {
        console.log('[Baileys] Tentando logout explícito para liberar slot do dispositivo...');
        await socket.logout();
        console.log('[Baileys] Logout realizado com sucesso');
        // Aguardar um pouco para o logout ser processado
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (logoutError) {
        console.warn('[Baileys] Erro no logout (normal se já desconectado):', logoutError);
      }
      
      try {
        socket.end(undefined);
      } catch (error) {
        console.warn('[Baileys] Erro ao fechar socket durante reset:', error);
      }
    }
    
    const redisService = await getRedisService();
    if (redisService) {
      const BIND_KEY = 'baileys-auth-creds';
      const keysToTry = ['creds', 'pre-key', 'session', 'sender-key', 'app-state-sync-key'];
      
      for (const keyType of keysToTry) {
        try {
          await redisService.del(`${BIND_KEY}:${keyType}`);
        } catch (error) {
          console.warn(`[Baileys] Could not delete ${keyType}:`, error);
        }
      }
    }
    
    // Reset variáveis globais
    socket = null;
    qrCode = null;
    connectionAttempts = 0;
    
    console.log('[Baileys] Auth state reset completed');
  } catch (error) {
    isConnecting = false; // Garantir que flag seja sempre liberada
    console.error('[Baileys] Error resetting auth state:', error);
    throw error;
  }
}

// --- FUNÇÕES DE COOLDOWN ---
function calculateCooldown(): number {
  // Cooldown progressivo: começa em 30s, dobra a cada tentativa até 5min máximo
  if (cooldownPeriod === 0) {
    cooldownPeriod = MIN_COOLDOWN_MS;
  } else {
    cooldownPeriod = Math.min(cooldownPeriod * 2, MAX_COOLDOWN_MS);
  }
  return cooldownPeriod;
}

function getCooldownRemaining(): number {
  if (lastConnectionAttempt === 0) return 0;
  
  const timeSinceLastAttempt = Date.now() - lastConnectionAttempt;
  const requiredCooldown = cooldownPeriod || MIN_COOLDOWN_MS;
  
  return Math.max(0, requiredCooldown - timeSinceLastAttempt);
}

function resetCooldown(): void {
  cooldownPeriod = 0;
  lastConnectionAttempt = 0;
}

function isInCooldown(): boolean {
  return getCooldownRemaining() > 0;
}

export { updateConnectionStatus };