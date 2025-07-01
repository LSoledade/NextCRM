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
import Redis from 'ioredis';
import { supabase } from './supabase';

// --- LÓGICA DO REDIS AUTH STORE ---
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  family: 4, // Use IPv4
});

// Adicionar listeners de eventos para monitorar a conexão
redis.on('error', (error: Error) => {
  console.error('Redis connection error:', error.message);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready for commands');
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

// BufferJSON replacement for handling binary data in Redis
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
  const BIND_KEY = 'baileys-auth-creds';

  const readData = async (key: string): Promise<any> => {
    try {
      const data = await redis.get(`${BIND_KEY}:${key}`);
      return data ? JSON.parse(data, BufferJSON.reviver) : null;
    } catch (error) {
      console.error(`Error reading Redis data for key ${key}:`, error);
      return null;
    }
  };

  const writeData = async (data: any, key: string): Promise<any> => {
    try {
      return await redis.set(`${BIND_KEY}:${key}`, JSON.stringify(data, BufferJSON.replacer));
    } catch (error) {
      console.error(`Error writing Redis data for key ${key}:`, error);
      throw error;
    }
  };

  const removeData = async (key: string): Promise<number> => {
    try {
      return await redis.del(`${BIND_KEY}:${key}`);
    } catch (error) {
      console.error(`Error removing Redis data for key ${key}:`, error);
      return 0;
    }
  };

  const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

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
            for (const id in data[cat]) {
              const value = data[cat]![id as keyof typeof data[typeof cat]];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
};

// Função para verificar se o Redis está disponível
const isRedisAvailable = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis não está disponível:', error);
    return false;
  }
};

// --- FIM DA LÓGICA DO REDIS AUTH STORE ---

let socket: WASocket | null = null;
let qrCode: string | null = null;
const logger = pino({ level: 'silent' });

async function uploadMediaToSupabase(buffer: Buffer, mimeType: string, leadId: string): Promise<string> {
  const fileExtension = mimeType.split('/')[1] || 'bin';
  const fileName = `whatsapp_media/${leadId}/${new Date().getTime()}.${fileExtension}`;
  const { data, error } = await supabase.storage.from('crm-assets').upload(fileName, buffer, { contentType: mimeType });
  if (error) throw new Error(`Falha no upload para o Supabase Storage: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from('crm-assets').getPublicUrl(data.path);
  return publicUrl;
}

export async function connectToWhatsApp() {
  if (socket) return socket;

  // Verificar se Redis está disponível antes de prosseguir
  const redisIsAvailable = await isRedisAvailable();
  if (!redisIsAvailable) {
    throw new Error('Redis não está disponível. Necessário para o funcionamento do WhatsApp.');
  }

  const { state, saveCreds } = await createRedisAuthState();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[Baileys] Usando versão: ${version.join('.')}, é a mais recente: ${isLatest}`);

  socket = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    printQRInTerminal: process.env.NODE_ENV === 'development',
    logger,
    browser: ['NextCRM', 'Chrome', '1.0.0'],
  });

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    qrCode = update.qr ?? null;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        socket = null;
        qrCode = null;
        console.error("[Baileys] Desconectado permanentemente. Reinicie o servidor para obter um novo QR Code.");
        
        // Atualizar status no Supabase
        updateConnectionStatus('disconnected', null, null, 'Desconectado pelo usuário');
      }
    } else if (connection === 'open') {
      qrCode = null;
      console.log('[Baileys] Conexão aberta!');
      
      // Atualizar status no Supabase
      updateConnectionStatus('connected', null, socket?.user);
    } else if (qrCode) {
      // QR Code gerado
      console.log('[Baileys] QR Code gerado');
      updateConnectionStatus('qr_ready', qrCode, null);
    }
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const senderJid = msg.key.remoteJid;
    if (!senderJid) return;

    try {
      const senderNumber = senderJid.split('@')[0];
      const { data: lead } = await supabase.from('leads').select('id, user_id').or(`phone.eq.${senderNumber},phone.ilike.%${senderNumber}`).limit(1).single();
      if (!lead) return;

      const messageType = Object.keys(msg.message)[0];
      let messageContent: string | null = null;
      let mediaUrl: string | null = null;
      let mimeType: string | null = null;

      switch (messageType) {
        case 'conversation': messageContent = msg.message.conversation ?? null; break;
        case 'extendedTextMessage': messageContent = msg.message.extendedTextMessage?.text ?? null; break;
        case 'imageMessage': case 'videoMessage': case 'audioMessage': case 'documentMessage':
          const mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: socket!.updateMediaMessage });
          const messageMedia = msg.message[messageType as keyof typeof msg.message] as any;
          mimeType = messageMedia?.mimetype ?? null;
          if (mimeType) {
            mediaUrl = await uploadMediaToSupabase(mediaBuffer as Buffer, mimeType, lead.id);
          }
          messageContent = messageMedia?.caption ?? null;
          break;
        default: return;
      }

      await supabase.from('whatsapp_messages').insert({
        lead_id: lead.id, user_id: lead.user_id, sender_jid: senderJid, message_content: messageContent,
        message_timestamp: new Date(Number(msg.messageTimestamp) * 1000), message_id: msg.key.id,
        is_from_lead: true, message_type: messageType.replace('Message', ''), media_url: mediaUrl, mime_type: mimeType,
      });
    } catch (error) { console.error('[Baileys] Erro ao processar mensagem:', error); }
  });

  return socket;
}

export function getSocket(): WASocket {
  if (!socket) throw new Error('Socket do WhatsApp não está conectado.');
  return socket;
}

export function getQRCode(): string | null { return qrCode; }

export async function sendWhatsappMessage(to: string, content: AnyMessageContent): Promise<WAMessage | undefined> {
  const jid = `${to}@s.whatsapp.net`;
  const sock = getSocket();
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    const sentMsg = await sock.sendMessage(jid, content);
    await sock.sendPresenceUpdate('paused', jid);
    return sentMsg;
  } catch (error) { console.error("[Baileys] Erro ao enviar mensagem:", error); return undefined; }
}

if (process.env.NODE_ENV !== 'production' || process.env.PRIMARY_INSTANCE) {
    connectToWhatsApp().catch(err => console.error("[Baileys] Falha na conexão inicial.", err));
}

// Função para atualizar status da conexão no Supabase
async function updateConnectionStatus(
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error',
  qrCode: string | null = null,
  whatsappUser: any = null,
  errorMessage: string | null = null
) {
  try {
    // Esta função será chamada do lado do servidor, então usamos o cliente administrativo
    // Note: Em produção, você deveria usar uma service key do Supabase
    const { error } = await supabase
      .from('whatsapp_connections')
      .upsert({
        user_id: process.env.ADMIN_USER_ID, // Você precisa definir isso nas env vars
        status: status,
        qr_code: qrCode,
        whatsapp_user: whatsappUser,
        phone_number: whatsappUser?.id || null,
        connected_at: status === 'connected' ? new Date().toISOString() : null,
        disconnected_at: status === 'disconnected' ? new Date().toISOString() : null,
        error_message: errorMessage
      });

    if (error) {
      console.error('[Baileys] Erro ao atualizar status no Supabase:', error);
    } else {
      console.log(`[Baileys] Status atualizado no Supabase: ${status}`);
    }
  } catch (error) {
    console.error('[Baileys] Erro ao conectar com Supabase:', error);
  }
}

export { updateConnectionStatus };
