import Redis from 'ioredis';
import { kv } from '@vercel/kv';

export interface RedisService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ping(): Promise<string>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, field: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
}

class VercelKVService implements RedisService {
  async get(key: string): Promise<string | null> {
    return await kv.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await kv.setex(key, ttlSeconds, value);
    } else {
      await kv.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await kv.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await kv.exists(key);
    return result === 1;
  }

  async ping(): Promise<string> {
    // Vercel KV não tem ping, então fazemos um teste simples
    const testKey = '__ping_test__';
    await kv.set(testKey, 'pong');
    const result = await kv.get(testKey);
    await kv.del(testKey);
    return result === 'pong' ? 'PONG' : 'ERROR';
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await kv.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await kv.hset(key, { [field]: value });
  }

  async hdel(key: string, field: string): Promise<void> {
    await kv.hdel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await kv.hgetall(key);
    if (!result) return {};
    
    // Converte os valores para string para manter compatibilidade
    const converted: Record<string, string> = {};
    for (const [k, v] of Object.entries(result)) {
      converted[k] = String(v);
    }
    return converted;
  }
}

class IORedisService implements RedisService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async ping(): Promise<string> {
    return await this.redis.ping();
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.redis.hgetall(key);
  }
}

// --- CONFIGURAÇÃO DO REDIS COM RETRY E FALLBACK ---
let redisService: RedisService | null = null;
let redisInitialized = false;

const initializeRedisService = async (): Promise<RedisService | null> => {
  if (redisInitialized) return redisService;
  
  // Primeiro, tenta usar Vercel KV se estiver disponível
  // Vercel KV precisa das variáveis KV_REST_API_URL e KV_REST_API_TOKEN
  if (process.env.VERCEL_REDIS_KV_REST_API_URL && process.env.VERCEL_REDIS_KV_REST_API_TOKEN) {
    try {
      // Configurar as variáveis que o @vercel/kv espera
      process.env.KV_REST_API_URL = process.env.VERCEL_REDIS_KV_REST_API_URL;
      process.env.KV_REST_API_TOKEN = process.env.VERCEL_REDIS_KV_REST_API_TOKEN;
      
      const vercelService = new VercelKVService();
      await vercelService.ping();
      redisService = vercelService;
      redisInitialized = true;
      console.log('[Redis] Vercel KV inicializado com sucesso');
      return redisService;
    } catch (error) {
      console.warn('[Redis] Falha ao conectar com Vercel KV, tentando Redis tradicional:', error);
    }
  }

  // Fallback para Redis tradicional
  const redisUrl = process.env.VERCEL_REDIS_REDIS_URL || process.env.VERCEL_REDIS_KV_URL;
  
  if (!redisUrl) {
    console.error('[Redis] Nenhuma variável Redis configurada. Configure as variáveis do Vercel Redis');
    redisInitialized = true;
    return null;
  }

  try {
    const redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: Number(process.env.REDIS_MAX_RETRIES) || 3,
      lazyConnect: true,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
      commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT) || 5000,
      family: 4, // Use IPv4
      enableReadyCheck: false,
      keepAlive: 30000, // Keep connection alive
      db: 0,
    });

    // Configurar listeners de eventos
    redisInstance.on('error', (error: Error) => {
      console.error('[Redis] Connection error:', error.message);
      if (error.message.includes('ECONNRESET')) {
        console.log('[Redis] ECONNRESET detectado - aguardando antes de reconectar...');
      }
    });

    redisInstance.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisInstance.on('ready', () => {
      console.log('[Redis] Ready for commands');
    });

    redisInstance.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    redisInstance.on('reconnecting', (delay: number) => {
      console.log(`[Redis] Reconnecting in ${delay}ms...`);
    });

    // Testar conexão
    await redisInstance.ping();
    redisService = new IORedisService(redisInstance);
    redisInitialized = true;
    
    console.log('[Redis] IORedis inicializado com sucesso');
    return redisService;
  } catch (error) {
    console.error('[Redis] Falha ao inicializar Redis:', error);
    redisInitialized = true;
    return null;
  }
};

// Função para obter o serviço Redis
export const getRedisService = async (): Promise<RedisService | null> => {
  if (!redisService) {
    redisService = await initializeRedisService();
  }
  return redisService;
};

// Função para verificar se o Redis está disponível
export const isRedisAvailable = async (): Promise<boolean> => {
  const service = await getRedisService();
  
  if (!service) return false;
  
  try {
    await service.ping();
    console.log('[Redis] Health check: OK');
    return true;
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
};
