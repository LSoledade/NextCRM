import { NextResponse, NextRequest } from 'next/server';
import { 
  sendWhatsAppMessage, 
  sendTextMessage, 
  sendMediaMessage,
  checkInstanceStatus,
  ApiResponse 
} from '@/lib/evolution-http.service';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// Constantes para validação e segurança
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TEXT_LENGTH = 4096; // Limite do WhatsApp para texto
const RATE_LIMIT_PER_MINUTE = 30; // Máximo de mensagens por minuto por usuário

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Cache em memória para rate limiting (em produção use Redis)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

// Função para verificar rate limiting
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitCache.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset ou primeira vez
    rateLimitCache.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minuto
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Função para upload seguro de mídia
async function uploadMediaSecurely(
  buffer: Buffer, 
  mimeType: string, 
  leadId: string, 
  userId: string,
  originalFileName?: string
): Promise<string> {
  // Validações de segurança
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
  }
  
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Verificar se o buffer não está corrompido
  if (buffer.length === 0) {
    throw new Error('Arquivo está vazio ou corrompido');
  }

  // Validar magic numbers para tipos de arquivo críticos
  const magicNumbers: Record<string, number[]> = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
  };

  const magic = magicNumbers[mimeType];
  if (magic && !magic.every((byte, index) => buffer[index] === byte)) {
    throw new Error('Arquivo não corresponde ao tipo declarado');
  }

  const supabaseServer = await createClient();
  const fileExtension = mimeType.split('/')[1] || 'bin';
  const timestamp = new Date().getTime();
  const randomSuffix = Math.random().toString(36).substring(7);
  
  // Estrutura de pastas segura: userId/leadId/timestamp_random.ext
  const fileName = `${userId}/${leadId}/${timestamp}_${randomSuffix}.${fileExtension}`;
  
  const { data, error } = await supabaseServer.storage
    .from('crm-assets')
    .upload(fileName, buffer, { 
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false // Não sobrescrever arquivos existentes
    });
    
  if (error) {
    throw new Error(`Falha no upload: ${error.message}`);
  }
  
  const { data: { publicUrl } } = supabaseServer.storage
    .from('crm-assets')
    .getPublicUrl(data.path);
    
  return publicUrl;
}

// Função para sanitizar texto
function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Remover caracteres de controle perigosos
  const sanitized = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caracteres de controle
    .substring(0, MAX_TEXT_LENGTH) // Limitar tamanho
    .trim();
    
  return sanitized;
}

// Função para validar número de telefone
function validatePhoneNumber(phoneNumber: string): boolean {
  // Remover caracteres não numéricos
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Verificar se tem entre 10 e 15 dígitos (padrão internacional)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  // Verificar se não começa com 0 (números internacionais não devem começar com 0)
  if (cleaned.startsWith('0')) {
    return false;
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  const supabaseServer = await createClient();
  
  try {
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ 
        error: 'Muitas mensagens enviadas. Tente novamente em alguns minutos.' 
      }, { status: 429 });
    }

    // Parse do form data
    const formData = await request.formData();
    const to = formData.get('to') as string;
    const lead_id = formData.get('lead_id') as string;
    const text = formData.get('text') as string | null;
    const file = formData.get('file') as File | null;

    // Validações obrigatórias
    if (!to || !lead_id) {
      return NextResponse.json({ 
        error: 'Parâmetros "to" e "lead_id" são obrigatórios' 
      }, { status: 400 });
    }

    // Validar número de telefone
    if (!validatePhoneNumber(to)) {
      return NextResponse.json({ 
        error: 'Número de telefone inválido' 
      }, { status: 400 });
    }

    // Verificar se o usuário tem acesso ao lead
    const { data: lead, error: leadError } = await supabaseServer
      .from('leads')
      .select('id, user_id, phone')
      .eq('id', lead_id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ 
        error: 'Lead não encontrado ou sem permissão' 
      }, { status: 403 });
    }

    // Verificar se o número corresponde ao lead (segurança adicional)
    if (lead.phone) {
      const leadPhoneClean = lead.phone.replace(/\D/g, '');
      const requestPhoneClean = to.replace(/\D/g, '');
      
      if (!leadPhoneClean.includes(requestPhoneClean) && !requestPhoneClean.includes(leadPhoneClean)) {
        return NextResponse.json({ 
          error: 'Número não corresponde ao lead especificado' 
        }, { status: 400 });
      }
    }

    // Preparar dados para envio
    const sanitizedText = text ? sanitizeText(text) : null;

    // Validar se há conteúdo para enviar
    if (!file && !sanitizedText?.trim()) {
      return NextResponse.json({ 
        error: 'Mensagem de texto ou arquivo é obrigatório' 
      }, { status: 400 });
    }

    // Processar arquivo se fornecido
    let mediaUrl: string | null = null;
    let mimeType: string | null = null;
    
    if (file) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type;
        
        // Verificar se o tipo MIME é confiável
        if (!mimeType || !ALLOWED_FILE_TYPES.includes(mimeType)) {
          return NextResponse.json({ 
            error: `Tipo de arquivo não suportado: ${mimeType || 'desconhecido'}` 
          }, { status: 400 });
        }
        
        mediaUrl = await uploadMediaSecurely(buffer, mimeType, lead_id, user.id, file.name);
        
      } catch (uploadError: any) {
        console.error('Erro no upload:', uploadError);
        return NextResponse.json({ 
          error: uploadError.message 
        }, { status: 400 });
      }
    }

    // Tentar enviar via WhatsApp com retry
    let sentResponse: ApiResponse<any> | undefined;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (file) {
          // Mensagem com mídia
          const fileType = mimeType!.split('/')[0];
          let mediaType: 'image' | 'video' | 'audio' | 'document';
          
          switch (fileType) {
            case 'image':
              mediaType = 'image';
              break;
            case 'video':
              mediaType = 'video';
              break;
            case 'audio':
              mediaType = 'audio';
              break;
            default:
              mediaType = 'document';
              break;
          }

          sentResponse = await sendMediaMessage({
            number: to,
            mediatype: mediaType,
            media: mediaUrl!,
            caption: sanitizedText || undefined,
            filename: file.name || undefined
          });
        } else {
          // Mensagem de texto simples
          sentResponse = await sendTextMessage({
            number: to,
            text: sanitizedText!
          });
        }
        
        if (sentResponse.success) break;
        lastError = new Error(sentResponse.error || 'Failed to send message');
      } catch (error: any) {
        lastError = error;
        console.error(`Tentativa ${attempt} falhou:`, error.message);
        
        if (attempt < 3) {
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!sentResponse || !sentResponse.success) {
      // Log do erro completo para debugging
      console.error('❌ Falha completa no envio:', {
        attempts: 3,
        lastError: lastError?.message,
        response: sentResponse
      });
      
      throw new Error(lastError?.message || "Falha ao enviar mensagem pelo WhatsApp após 3 tentativas");
    }

    const sentMsg = sentResponse.data;
    console.log('✅ Mensagem enviada com sucesso:', {
      messageId: sentMsg?.key?.id || sentMsg?.messageId || 'unknown',
      status: sentMsg?.status || 'sent'
    });

    // Usar service client para garantir que a mensagem seja salva
    const serviceSupabase = createServiceClient();
    let dbSaveSuccess = false;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Salvar mensagem enviada no banco com informações mais completas
        const messageData = {
          lead_id, 
          user_id: user.id, 
          sender_jid: `${to}@s.whatsapp.net`, // Formato correto do JID
          message_content: sanitizedText || (file ? `[${file.type.split('/')[0]}]` : null),
          message_timestamp: new Date(), 
          message_id: sentMsg?.key?.id || sentMsg?.messageId || `sent_${Date.now()}_${Math.random().toString(36).substring(7)}`, 
          is_from_lead: false, // Mensagem enviada pelo usuário
          message_type: file ? mimeType!.split('/')[0] : 'text', 
          media_url: mediaUrl, 
          mime_type: mimeType,
        };

        console.log('💾 Salvando mensagem enviada:', messageData);

        const { error: dbError } = await serviceSupabase
          .from('whatsapp_messages')
          .insert(messageData);

        if (dbError) {
          console.error('❌ Erro ao salvar mensagem:', dbError);
          throw dbError;
        }
        
        console.log('✅ Mensagem salva no banco com sucesso');
        dbSaveSuccess = true;
        break;
      } catch (dbError: any) {
        console.error(`Tentativa ${attempt} de salvar no banco falhou:`, dbError);
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!dbSaveSuccess) {
      console.warn('⚠️ Mensagem enviada mas não foi salva no banco de dados');
    }

    return NextResponse.json({ 
      success: true, 
      messageId: sentMsg?.key?.id || sentMsg?.messageId || 'unknown',
      savedToDatabase: dbSaveSuccess,
      status: sentMsg?.status || 'sent',
      data: sentMsg
    });
    
  } catch (error: any) {
    console.error('Erro na API WhatsApp send:', error);
    
    // Log detalhado para debugging (remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    
    // Retornar erro genérico para não vazar informações sensíveis
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// Endpoint para verificar status da conexão (GET)
export async function GET(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar status da instância diretamente com a Evolution API
    const instanceStatus = await checkInstanceStatus();
    
    // Também buscar status local da conexão
    const { data: connection, error: connectionError } = await supabaseServer
      .from('whatsapp_connections')
      .select('status, last_connected_at, whatsapp_user')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      connected: instanceStatus.connected,
      status: instanceStatus.status,
      exists: instanceStatus.exists,
      profile: instanceStatus.profile,
      localConnection: {
        status: connection?.status || 'unknown',
        lastConnectedAt: connection?.last_connected_at,
        whatsappUser: connection?.whatsapp_user
      }
    });

  } catch (error: any) {
    console.error('Erro ao verificar status WhatsApp:', error);
    return NextResponse.json({ 
      connected: false, 
      status: 'error',
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}