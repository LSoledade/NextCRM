/**
 * Optimized Evolution API HTTP Service
 * Replaces Axios with native fetch for better performance and fewer dependencies
 */

// Environment variables
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || 'Leonardo';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL;

// Only check environment variables at runtime, not build time
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'development') {
  // Only check in production server environment
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('EVOLUTION_API_URL and EVOLUTION_API_KEY should be set in environment variables');
  }
}

// Type definitions
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
  message: string | any;
  instanceName?: string;
}

export interface WhatsAppTextMessage {
  number: string;
  text: string;
}

export interface WhatsAppMediaMessage {
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  media: string;
  caption?: string;
  filename?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Error types
export class EvolutionApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'EvolutionApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// HTTP Client Configuration
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

class EvolutionHttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true
  };

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'NextCRM/1.0'
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    if (!config.exponentialBackoff) {
      return config.baseDelay;
    }

    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  private async makeRequest<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const {
      method,
      endpoint,
      body,
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.defaultRetryConfig.maxRetries
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 [${method}] ${url} (attempt ${attempt + 1}/${retries + 1})`);

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Handle different response types
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          let data: any = null;

          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else if (contentType?.includes('text/')) {
            data = await response.text();
          } else {
            data = await response.blob();
          }

          console.log(`✅ [${method}] ${url} - Success (${response.status})`);
          return {
            success: true,
            data,
            statusCode: response.status
          };
        }

        // Handle specific error status codes
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          throw new RateLimitError(
            `Rate limit exceeded (${response.status})`,
            retryDelay
          );
        }

        if (response.status >= 500) {
          // Server errors are retryable
          const errorText = await response.text();
          throw new EvolutionApiError(
            `Server error: ${response.status} - ${errorText}`,
            response.status,
            errorText
          );
        }

        // Client errors (4xx) are generally not retryable
        const errorText = await response.text();
        throw new EvolutionApiError(
          `Client error: ${response.status} - ${errorText}`,
          response.status,
          errorText
        );

      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        console.error(`❌ [${method}] ${url} - Error (attempt ${attempt + 1}):`, error);

        // Don't retry on certain errors
        if (error instanceof RateLimitError) {
          console.log(`⏳ Rate limited, waiting ${error.retryAfter}ms...`);
          await this.delay(error.retryAfter || 5000);
        } else if (error instanceof EvolutionApiError && error.statusCode && error.statusCode < 500) {
          // Don't retry client errors
          break;
        } else if (error instanceof TypeError || (error as any).name === 'AbortError') {
          // Network errors or timeouts
          if (attempt === retries) break;
        }

        // Calculate delay for next attempt
        if (attempt < retries) {
          const delay = this.calculateRetryDelay(attempt, this.defaultRetryConfig);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
      statusCode: lastError instanceof EvolutionApiError ? lastError.statusCode : undefined
    };
  }

  async get<T>(endpoint: string, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'GET',
      endpoint,
      ...options
    });
  }

  async post<T>(endpoint: string, body?: any, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'POST',
      endpoint,
      body,
      ...options
    });
  }

  async put<T>(endpoint: string, body?: any, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'PUT',
      endpoint,
      body,
      ...options
    });
  }

  async delete<T>(endpoint: string, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({
      method: 'DELETE',
      endpoint,
      ...options
    });
  }
}

// Create HTTP client instance
const httpClient = new EvolutionHttpClient(
  EVOLUTION_API_URL || 'http://localhost',
  EVOLUTION_API_KEY || 'dummy-key'
);

// Evolution API Service Functions
export async function checkInstanceStatus(instanceName: string = INSTANCE_NAME): Promise<InstanceStatus> {
  try {
    console.log(`🔍 Checking instance status: ${instanceName}`);
    
    const response = await httpClient.get<any[]>('/instance/fetchInstances');
    
    if (!response.success) {
      console.error('❌ Failed to fetch instances:', response.error);
      return {
        exists: false,
        connected: false,
        status: 'error'
      };
    }

    const instances = response.data || [];
    console.log(`📋 Found ${instances.length} instances`);
    
    const instance = instances.find((inst: any) => inst.name === instanceName);
    
    if (!instance) {
      console.log(`❌ Instance ${instanceName} not found`);
      return {
        exists: false,
        connected: false,
        status: 'not_found'
      };
    }
    
    console.log(`✅ Instance found: ${instance.name}`);
    console.log(`🔗 Connection status: ${instance.connectionStatus}`);
    
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
    console.error('❌ Error checking instance status:', error.message);
    return {
      exists: false,
      connected: false,
      status: 'error',
    };
  }
}

export async function fetchQRCode(instanceName: string = INSTANCE_NAME): Promise<QRCodeResponse> {
  try {
    console.log(`📱 Fetching QR code for: ${instanceName}`);
    
    const status = await checkInstanceStatus(instanceName);
    
    if (!status.exists) {
      console.log('❌ Instance does not exist, creating...');
      const created = await createInstance(instanceName);
      if (!created) {
        return { error: 'Failed to create instance' };
      }
    }
    
    if (status.connected) {
      console.log('✅ Instance already connected');
      return { error: 'Instance already connected' };
    }
    
    console.log('🔄 Getting QR code...');
    const response = await httpClient.get<any>(`/instance/connect/${instanceName}`);
    
    if (!response.success) {
      return { error: response.error || 'Failed to fetch QR code' };
    }

    console.log('📱 QR code response:', {
      hasCode: !!response.data?.code,
      hasPairingCode: !!response.data?.pairingCode,
      codeLength: response.data?.code?.length || 0
    });
    
    if (response.data?.code) {
      return {
        qrCode: response.data.code,
        pairingCode: response.data.pairingCode || undefined
      };
    }
    
    return { error: 'QR code not available in response' };
    
  } catch (error: any) {
    console.error('❌ Error fetching QR code:', error.message);
    return {
      error: error.message || 'Failed to fetch QR code'
    };
  }
}

export async function createInstance(instanceName: string = INSTANCE_NAME): Promise<boolean> {
  try {
    console.log(`🆕 Creating instance: ${instanceName}`);
    
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
    
    const response = await httpClient.post('/instance/create', payload);
    
    if (response.success) {
      console.log('✅ Instance created successfully');
      return true;
    } else {
      console.error('❌ Failed to create instance:', response.error);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error creating instance:', error.message);
    return false;
  }
}

export async function reconnectInstance(instanceName: string = INSTANCE_NAME): Promise<QRCodeResponse> {
  try {
    console.log(`🔄 Reconnecting instance: ${instanceName}`);
    
    // First logout to clear connection
    try {
      await httpClient.delete(`/instance/logout/${instanceName}`);
      console.log('✅ Logout successful');
    } catch (logoutError) {
      console.log('⚠️ Logout error (may be normal):', (logoutError as any).message);
    }
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get new QR code
    return await fetchQRCode(instanceName);
    
  } catch (error: any) {
    console.error('❌ Error reconnecting instance:', error.message);
    return {
      error: error.message || 'Failed to reconnect instance'
    };
  }
}

export async function setupWebhook(instanceName: string = INSTANCE_NAME): Promise<boolean> {
  try {
    console.log(`🕷️ Setting up webhook for: ${instanceName}`);
    console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
    
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
      webhook_by_events: false
    };
    
    console.log('📋 Webhook payload:', JSON.stringify(payload, null, 2));
    
    const response = await httpClient.post(`/webhook/set/${instanceName}`, payload);
    
    if (response.success) {
      console.log('✅ Webhook configured successfully');
      console.log('📊 Response:', response.data);
      return true;
    } else {
      console.error('❌ Failed to configure webhook:', response.error);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error configuring webhook:', error.message);
    return false;
  }
}

export async function sendWhatsAppMessage(data: WhatsAppMessage): Promise<ApiResponse<any>> {
  try {
    const instanceName = data.instanceName || INSTANCE_NAME;
    console.log(`📤 Sending message via ${instanceName} to: ${data.phone}`);
    
    // Check if instance is connected
    const status = await checkInstanceStatus(instanceName);
    if (!status.connected) {
      return {
        success: false,
        error: 'Instance not connected'
      };
    }

    let endpoint = '';
    let payload: any = {};

    // Determine message type and endpoint
    if (typeof data.message === 'string') {
      endpoint = `/message/sendText/${instanceName}`;
      payload = {
        number: data.phone,
        text: data.message
      };
    } else if (typeof data.message === 'object') {
      if (data.message.text) {
        endpoint = `/message/sendText/${instanceName}`;
        payload = {
          number: data.phone,
          text: data.message.text
        };
      } else if (data.message.image) {
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'image',
          media: data.message.image.url,
          caption: data.message.caption || ''
        };
      } else if (data.message.video) {
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'video',
          media: data.message.video.url,
          caption: data.message.caption || ''
        };
      } else if (data.message.audio) {
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'audio',
          media: data.message.audio.url
        };
      } else if (data.message.document) {
        endpoint = `/message/sendMedia/${instanceName}`;
        payload = {
          number: data.phone,
          mediatype: 'document',
          media: data.message.document.url,
          filename: data.message.fileName || 'document'
        };
      } else {
        return {
          success: false,
          error: 'Unsupported message format'
        };
      }
    } else {
      return {
        success: false,
        error: 'Invalid message format'
      };
    }

    console.log(`📡 Sending to endpoint: ${endpoint}`);
    console.log(`📊 Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await httpClient.post(endpoint, payload);
    
    if (response.success) {
      console.log('✅ Message sent successfully');
      console.log('📱 API Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.error('❌ Failed to send message:', response.error);
    }
    
    return response;
  } catch (error: any) {
    console.error('❌ Error sending message:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send message'
    };
  }
}

export async function sendTextMessage(data: WhatsAppTextMessage, instanceName: string = INSTANCE_NAME): Promise<ApiResponse<any>> {
  try {
    console.log(`📤 Sending text to: ${data.number}`);
    
    const status = await checkInstanceStatus(instanceName);
    if (!status.connected) {
      return {
        success: false,
        error: 'Instance not connected'
      };
    }

    const response = await httpClient.post(`/message/sendText/${instanceName}`, data);
    
    if (response.success) {
      console.log('✅ Text sent successfully');
    } else {
      console.error('❌ Failed to send text:', response.error);
    }
    
    return response;
  } catch (error: any) {
    console.error('❌ Error sending text:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send text message'
    };
  }
}

export async function sendMediaMessage(data: WhatsAppMediaMessage, instanceName: string = INSTANCE_NAME): Promise<ApiResponse<any>> {
  try {
    console.log(`📤 Sending media (${data.mediatype}) to: ${data.number}`);
    
    const status = await checkInstanceStatus(instanceName);
    if (!status.connected) {
      return {
        success: false,
        error: 'Instance not connected'
      };
    }

    const response = await httpClient.post(`/message/sendMedia/${instanceName}`, data);
    
    if (response.success) {
      console.log('✅ Media sent successfully');
    } else {
      console.error('❌ Failed to send media:', response.error);
    }
    
    return response;
  } catch (error: any) {
    console.error('❌ Error sending media:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send media message'
    };
  }
}

export async function testConnection(): Promise<ApiResponse<any>> {
  try {
    console.log('🔧 Testing Evolution API connectivity...');
    console.log('🌐 URL:', EVOLUTION_API_URL);
    console.log('🔑 API Key:', EVOLUTION_API_KEY?.substring(0, 8) + '...');
    
    const response = await httpClient.get('/instance/fetchInstances');
    
    if (response.success) {
      console.log('✅ Connectivity OK');
      console.log('📊 Response:', {
        instancesFound: Array.isArray(response.data) ? response.data.length : 0
      });
      
      return {
        success: true,
        data: {
          message: 'Evolution API connectivity OK',
          instancesFound: Array.isArray(response.data) ? response.data.length : 0,
          url: EVOLUTION_API_URL
        }
      };
    } else {
      console.error('❌ Connectivity failed:', response.error);
      return response;
    }
  } catch (error: any) {
    console.error('❌ Connection test error:', error.message);
    return {
      success: false,
      error: error.message || 'Connection test failed'
    };
  }
}

// Export the HTTP client for advanced usage
export { httpClient };

// Legacy compatibility aliases
export const checkConnectionStatus = checkInstanceStatus;
export const connectToWhatsApp = fetchQRCode;
export const ensureWebhookSetup = setupWebhook;