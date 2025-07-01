import { NextResponse, NextRequest } from 'next/server';
import { sendWhatsappMessage } from '@/lib/baileys.service';
import { createClient } from '@/utils/supabase/server';

// Constantes para validação
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mpeg', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

async function uploadMedia(buffer: Buffer, mimeType: string, leadId: string, userId: string): Promise<string> {
  // Validações de segurança
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
  }
  
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const supabaseServer = await createClient();
  const fileExtension = mimeType.split('/')[1] || 'bin';
  // Usar estrutura de pastas recomendada: userId/leadId/timestamp
  const fileName = `${userId}/${leadId}/${new Date().getTime()}.${fileExtension}`;
  
  const { data, error } = await supabaseServer.storage
    .from('crm-assets')
    .upload(fileName, buffer, { 
      contentType: mimeType,
      cacheControl: '3600', // Cache por 1 hora
    });
    
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  
  const { data: { publicUrl } } = supabaseServer.storage
    .from('crm-assets')
    .getPublicUrl(data.path);
    
  return publicUrl;
}

export async function POST(request: NextRequest) {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
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

    // Verificar se o usuário tem acesso ao lead
    const { data: lead, error: leadError } = await supabaseServer
      .from('leads')
      .select('id, user_id')
      .eq('id', lead_id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ 
        error: 'Lead não encontrado ou sem permissão' 
      }, { status: 403 });
    }

    let messageContent: any;
    let messageType: string = 'text';
    let mediaUrl: string | null = null;
    let mimeType: string | null = null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      mimeType = file.type;
      
      try {
        mediaUrl = await uploadMedia(buffer, mimeType, lead_id, user.id);
      } catch (uploadError: any) {
        return NextResponse.json({ 
          error: uploadError.message 
        }, { status: 400 });
      }
      
      const fileType = mimeType.split('/')[0];

      switch (fileType) {
        case 'image': 
          messageContent = { image: { url: mediaUrl }, caption: text || '' }; 
          messageType = 'image'; 
          break;
        case 'audio': 
          messageContent = { audio: { url: mediaUrl }, mimetype: mimeType }; 
          messageType = 'audio'; 
          break;
        case 'video': 
          messageContent = { video: { url: mediaUrl }, caption: text || '' }; 
          messageType = 'video'; 
          break;
        default: 
          messageContent = { 
            document: { url: mediaUrl }, 
            mimetype: mimeType, 
            fileName: file.name 
          }; 
          messageType = 'document';
      }
    } else if (text?.trim()) {
      messageContent = { text: text.trim() };
    } else {
      return NextResponse.json({ 
        error: 'Mensagem de texto ou arquivo é obrigatório' 
      }, { status: 400 });
    }

    // Tentar enviar via WhatsApp
    const sentMsg = await sendWhatsappMessage(to, messageContent);
    if (!sentMsg) {
      throw new Error("Falha ao enviar mensagem pelo Baileys.");
    }

    // Salvar no banco de dados
    const { error: dbError } = await supabaseServer
      .from('whatsapp_messages')
      .insert({
        lead_id, 
        user_id: user.id, 
        sender_jid: user.id, 
        message_content: text?.trim() || null,
        message_timestamp: new Date(), 
        message_id: sentMsg.key.id, 
        is_from_lead: false,
        message_type: messageType, 
        media_url: mediaUrl, 
        mime_type: mimeType,
      });

    if (dbError) {
      console.error('Erro ao salvar mensagem no banco:', dbError);
      // Mensagem foi enviada mas não foi salva - log do erro mas não falhe a requisição
    }

    return NextResponse.json({ 
      success: true, 
      messageId: sentMsg.key.id 
    });
    
  } catch (error: any) {
    console.error('Erro na API WhatsApp send:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
