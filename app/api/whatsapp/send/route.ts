import { NextResponse, NextRequest } from 'next/server';
import {
  sendTextMessage,
  sendMediaMessage,
  ApiResponse,
  // Removed: checkInstanceStatus (handled by instance/route.ts)
  // Removed: sendWhatsAppMessage (prefer specific sendText/sendMedia)
} from '@/lib/evolution-http.service';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// Constants for validation and security
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TEXT_LENGTH = 4096; // WhatsApp limit for text
const RATE_LIMIT_PER_MINUTE = 30; // Max messages per minute per user

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', // audio/mp4 for some voice notes
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'text/plain', // .txt
  'application/zip', // .zip
  'application/x-rar-compressed', // .rar
];

// In-memory cache for rate limiting (in production, consider Redis or similar)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitCache.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitCache.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }
  if (userLimit.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  userLimit.count++;
  return true;
}

async function uploadMediaSecurely(
  buffer: Buffer,
  mimeType: string,
  leadId: string,
  userId: string,
  originalFileName?: string
): Promise<string> {
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  if (buffer.length === 0) {
    throw new Error('Arquivo está vazio ou corrompido');
  }

  // Basic magic number validation for common types
  const magicNumbers: Record<string, Buffer> = {
    'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
    'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),
    'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]),
  };
  const magic = magicNumbers[mimeType];
  if (magic && !buffer.subarray(0, magic.length).equals(magic)) {
    console.warn(`Magic number mismatch for ${mimeType}. Expected ${magic.toString('hex')}, got ${buffer.subarray(0, magic.length).toString('hex')}`);
    // Depending on policy, this could be an error: throw new Error('Arquivo não corresponde ao tipo declarado (magic number mismatch)');
  }

  const supabase = createServiceClient(); // Use service client for storage from backend
  const fileExtension = originalFileName?.split('.').pop() || mimeType.split('/')[1] || 'bin';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const safeOriginalFileName = originalFileName ? originalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_') : 'file';
  
  const filePath = `${userId}/${leadId}/${timestamp}_${randomSuffix}_${safeOriginalFileName}`;

  const { data, error } = await supabase.storage
    .from('crm-assets') // Ensure this bucket exists and has appropriate policies
    .upload(filePath, buffer, {
      contentType: mimeType,
      cacheControl: '3600', // Cache for 1 hour
      upsert: false, // Do not overwrite
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Falha no upload do arquivo: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('crm-assets')
    .getPublicUrl(data.path);

  if (!publicUrl) {
    throw new Error('Não foi possível obter a URL pública do arquivo após o upload.');
  }
  return publicUrl;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove most control characters
    .substring(0, MAX_TEXT_LENGTH)
    .trim();
}

function validatePhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');
  // Basic check for length, can be improved with more specific country code logic if needed
  return cleaned.length >= 10 && cleaned.length <= 15 && !cleaned.startsWith('0');
}

export async function POST(request: NextRequest) {
  const supabaseServer = await createClient(); // For auth
  const serviceSupabase = createServiceClient(); // For DB operations

  try {
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Muitas mensagens enviadas. Tente novamente em alguns minutos.' }, { status: 429 });
    }

    const formData = await request.formData();
    const to = formData.get('to') as string;
    const lead_id = formData.get('lead_id') as string;
    const textContent = formData.get('text') as string | null;
    const file = formData.get('file') as File | null;

    if (!to || !lead_id) {
      return NextResponse.json({ error: 'Parâmetros "to" e "lead_id" são obrigatórios' }, { status: 400 });
    }
    if (!validatePhoneNumber(to)) {
      return NextResponse.json({ error: 'Número de telefone inválido' }, { status: 400 });
    }

    const { data: lead, error: leadError } = await serviceSupabase
      .from('leads')
      .select('id, user_id, phone')
      .eq('id', lead_id)
      .eq('user_id', user.id) // Ensure user owns the lead
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado ou sem permissão' }, { status: 403 });
    }

    // Optional: Stronger phone number validation against lead's phone
    if (lead.phone) {
      const leadPhoneClean = lead.phone.replace(/\D/g, '');
      const requestPhoneClean = to.replace(/\D/g, '');
      if (!leadPhoneClean.endsWith(requestPhoneClean) && !requestPhoneClean.endsWith(leadPhoneClean)) {
        // This check might be too strict depending on how numbers are stored/formatted
        console.warn(`Phone number mismatch: lead ${leadPhoneClean}, request ${requestPhoneClean}`);
        // return NextResponse.json({ error: 'Número não corresponde ao lead especificado' }, { status: 400 });
      }
    }

    const sanitizedText = textContent ? sanitizeText(textContent) : null;

    if (!file && (!sanitizedText || sanitizedText.trim() === '')) {
      return NextResponse.json({ error: 'Mensagem de texto ou arquivo é obrigatório' }, { status: 400 });
    }

    let mediaUrl: string | null = null;
    let mimeType: string | null = null;
    let originalFileName: string | undefined;

    if (file) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type;
        originalFileName = file.name;
        mediaUrl = await uploadMediaSecurely(buffer, mimeType, lead_id, user.id, originalFileName);
      } catch (uploadError: any) {
        console.error('Erro no upload seguro:', uploadError);
        return NextResponse.json({ error: uploadError.message || 'Falha no upload do arquivo' }, { status: 400 });
      }
    }

    let evolutionResponse: ApiResponse<any>;

    if (mediaUrl && mimeType) {
      const fileType = mimeType.split('/')[0];
      let mediaType: 'image' | 'video' | 'audio' | 'document';
      switch (fileType) {
        case 'image': mediaType = 'image'; break;
        case 'video': mediaType = 'video'; break;
        case 'audio': mediaType = 'audio'; break;
        default: mediaType = 'document'; break;
      }
      evolutionResponse = await sendMediaMessage({
        number: to,
        mediatype: mediaType,
        media: mediaUrl,
        caption: sanitizedText || undefined,
        filename: originalFileName || `file.${mimeType.split('/')[1] || 'bin'}`
      });
    } else if (sanitizedText) {
      evolutionResponse = await sendTextMessage({
        number: to,
        text: sanitizedText,
      });
    } else {
      // Should be caught by earlier validation, but as a safeguard
      return NextResponse.json({ error: 'Nenhum conteúdo para enviar' }, { status: 400 });
    }

    if (!evolutionResponse.success) {
      console.error('Falha ao enviar mensagem via Evolution API:', evolutionResponse.error);
      // Consider mapping Evolution API errors to user-friendly messages if needed
      return NextResponse.json({
        success: false,
        error: `Falha ao enviar mensagem pelo WhatsApp: ${evolutionResponse.error || 'Erro desconhecido'}`,
        details: evolutionResponse.data // Potentially include details if safe
      }, { status: 502 }); // Bad Gateway or appropriate error for upstream failure
    }

    const sentMsgData = evolutionResponse.data;
    const messageId = sentMsgData?.key?.id || sentMsgData?.messageId || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log('Mensagem enviada com sucesso pela Evolution API:', { messageId, status: sentMsgData?.status });

    // Save message to our database
    const messageToSave = {
      lead_id,
      user_id: user.id,
      sender_jid: `${to}@s.whatsapp.net`, // Standard JID format for sender (our side)
      // recipient_jid: `${to}@s.whatsapp.net`, // If tracking recipient JID explicitly
      message_content: sanitizedText || (file ? `[${mimeType?.split('/')[0] || 'arquivo'}] ${originalFileName || ''}`.trim() : null),
      message_timestamp: new Date(sentMsgData?.messageTimestamp ? sentMsgData.messageTimestamp * 1000 : Date.now()),
      message_id: messageId,
      is_from_lead: false, // This message is from the CRM user
      message_type: file ? (mimeType?.split('/')[0] || 'file') : 'text',
      media_url: mediaUrl,
      mime_type: mimeType,
      message_status: sentMsgData?.status || 'sent', // Status from Evolution API if available
      // raw_message_data: sentMsgData, // Optional: store the raw response for debugging
    };

    const { error: dbError } = await serviceSupabase
      .from('whatsapp_messages')
      .insert(messageToSave);

    if (dbError) {
      console.error('Erro ao salvar mensagem enviada no banco de dados:', dbError);
      // Non-critical error for the user, but should be logged.
      // The message was sent, but not recorded. This might need a retry or dead-letter queue.
    } else {
      console.log('Mensagem enviada salva no banco de dados.');
    }

    return NextResponse.json({
      success: true,
      messageId: messageId,
      status: sentMsgData?.status || 'sent',
      savedToDatabase: !dbError,
      data: sentMsgData // Return the response from Evolution API
    });

  } catch (error: any) {
    console.error('Erro geral na API /whatsapp/send:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor ao enviar mensagem.'
    }, { status: 500 });
  }
}

// Removed GET handler, as status checking is consolidated in instance/route.ts