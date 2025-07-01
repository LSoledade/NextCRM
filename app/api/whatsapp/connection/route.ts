import { NextRequest, NextResponse } from 'next/server';
import { connectToWhatsApp, getQRCode, getSocket } from '@/lib/baileys.service';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica se já existe uma conexão ativa
    let socket = null;
    try {
      socket = getSocket();
    } catch (error) {
      // Socket não existe, vamos criar
    }

    let status = 'connecting';
    let qrCode = null;
    let whatsappUser = null;

    if (socket && socket.user) {
      // Já está conectado
      status = 'connected';
      whatsappUser = socket.user;
    } else {
      // Tentar iniciar conexão
      try {
        await connectToWhatsApp();
        qrCode = getQRCode();
        
        if (qrCode) {
          status = 'qr_ready';
        }
      } catch (error: any) {
        console.error('Erro ao conectar WhatsApp:', error.message);
        
        // Se o erro for relacionado ao Redis, atualizar status
        if (error.message?.includes('Redis')) {
          status = 'error';
          await supabase
            .from('whatsapp_connections')
            .upsert({
              user_id: user.id,
              status: 'error',
              error_message: 'Erro de conexão com o Redis. Tente novamente em alguns minutos.',
              qr_code: null,
              whatsapp_user: null,
              phone_number: null,
              connected_at: null,
              disconnected_at: new Date().toISOString()
            });

          return NextResponse.json({ 
            error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' 
          }, { status: 503 });
        }
        
        throw error; // Re-throw outros erros
      }
    }

    // Atualizar status no banco de dados
    await supabase
      .from('whatsapp_connections')
      .upsert({
        user_id: user.id,
        status: status,
        qr_code: qrCode,
        whatsapp_user: whatsappUser,
        phone_number: whatsappUser?.id || null,
        connected_at: status === 'connected' ? new Date().toISOString() : null,
        disconnected_at: null,
        error_message: null
      });

    return NextResponse.json({
      status: status,
      qrCode: qrCode,
      user: whatsappUser
    });

  } catch (error) {
    console.error('Erro na conexão WhatsApp:', error);
    
    // Tentar atualizar status de erro no banco
    try {
      const supabaseServer = await createClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      
      if (user) {
        await supabase
          .from('whatsapp_connections')
          .upsert({
            user_id: user.id,
            status: 'error',
            error_message: String(error),
            qr_code: null,
            whatsapp_user: null,
            phone_number: null
          });
      }
    } catch (dbError) {
      console.error('Erro ao atualizar status de erro no banco:', dbError);
    }

    return NextResponse.json(
      { error: 'Erro ao conectar com WhatsApp' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'disconnect') {
      try {
        const socket = getSocket();
        await socket.logout();
        
        // Atualizar status no banco
        await supabase
          .from('whatsapp_connections')
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            qr_code: null,
            whatsapp_user: null,
            phone_number: null
          })
          .eq('user_id', user.id);

        return NextResponse.json({ success: true, message: 'Desconectado com sucesso' });
      } catch (error) {
        // Atualizar status no banco mesmo se já estava desconectado
        await supabase
          .from('whatsapp_connections')
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            qr_code: null,
            whatsapp_user: null,
            phone_number: null
          })
          .eq('user_id', user.id);

        return NextResponse.json({ success: true, message: 'Já estava desconectado' });
      }
    }

    if (action === 'reconnect') {
      // Atualizar status para connecting
      await supabase
        .from('whatsapp_connections')
        .update({
          status: 'connecting',
          qr_code: null,
          whatsapp_user: null,
          phone_number: null,
          connected_at: null,
          disconnected_at: null,
          error_message: null
        })
        .eq('user_id', user.id);

      await connectToWhatsApp();
      const qrCode = getQRCode();
      
      // Atualizar com QR code se disponível
      if (qrCode) {
        await supabase
          .from('whatsapp_connections')
          .update({
            status: 'qr_ready',
            qr_code: qrCode
          })
          .eq('user_id', user.id);
      }
      
      return NextResponse.json({
        success: true,
        status: qrCode ? 'qr_ready' : 'connecting',
        qrCode: qrCode
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro na ação WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro ao processar ação' },
      { status: 500 }
    );
  }
}
