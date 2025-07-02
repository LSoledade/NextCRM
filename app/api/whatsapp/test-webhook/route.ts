import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 API de teste do webhook chamada');
    
    const body = await request.json();
    console.log('📋 Payload recebido:', body);

    // Simular uma mensagem de teste
    const testMessage = {
      key: {
        remoteJid: '5511999887766@s.whatsapp.net',
        id: `test_${Date.now()}`,
      },
      message: {
        conversation: body.message || 'Mensagem de teste do debug monitor'
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: body.contactName || 'Teste Debug',
      notifyName: body.contactName || 'Teste Debug'
    };

    console.log('📨 Simulando processamento de mensagem de teste:', testMessage);

    // Usar cliente de serviço para bypass do RLS
    const supabase = createServiceClient();

    // Buscar ou criar lead de teste
    const testPhone = '5511999887766';
    let leadId: string | null = null;
    let userId: string | null = null;

    // Buscar primeiro usuário ativo
    const { data: firstUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (!firstUser || userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado para teste' },
        { status: 400 }
      );
    }

    userId = firstUser.id;

    // Buscar lead de teste existente
    const { data: existingLead, error: leadSearchError } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', testPhone)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLead && !leadSearchError) {
      leadId = existingLead.id;
      console.log('✅ Lead de teste encontrado:', leadId);
    } else {
      // Criar lead de teste
      const { data: newLead, error: newLeadError } = await supabase
        .from('leads')
        .insert({
          phone: testPhone,
          name: 'Teste Debug Monitor',
          status: 'New',
          source: 'whatsapp',
          user_id: userId
        })
        .select('id')
        .single();

      if (newLead && !newLeadError) {
        leadId = newLead.id;
        console.log('✅ Lead de teste criado:', leadId);
      } else {
        console.error('❌ Erro ao criar lead de teste:', newLeadError);
        return NextResponse.json(
          { error: 'Erro ao criar lead de teste' },
          { status: 500 }
        );
      }
    }

    // Inserir mensagem de teste
    const messageData = {
      lead_id: leadId,
      user_id: userId,
      sender_jid: testMessage.key.remoteJid,
      message_content: testMessage.message.conversation,
      message_type: 'text',
      message_timestamp: new Date(testMessage.messageTimestamp * 1000),
      message_id: testMessage.key.id,
      is_from_lead: true,
      media_url: null
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(messageData)
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir mensagem de teste:', insertError);
      return NextResponse.json(
        { error: 'Erro ao inserir mensagem de teste', details: insertError },
        { status: 500 }
      );
    }

    console.log('✅ Mensagem de teste inserida com sucesso:', insertedMessage.id);

    return NextResponse.json({
      success: true,
      message: 'Mensagem de teste inserida com sucesso',
      data: {
        messageId: insertedMessage.id,
        leadId,
        userId,
        content: testMessage.message.conversation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na API de teste:', error.message);
    console.error('📋 Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
