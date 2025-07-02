// app/api/whatsapp/connection/route.ts - VERSÃO OTIMIZADA
import { NextRequest, NextResponse } from 'next/server';
import { connectToWhatsApp, getQRCode, getSocket, initializeSupabaseClient, resetAuthState } from '@/lib/baileys.service';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

// Configurar timeout para operações WhatsApp
const WHATSAPP_OPERATION_TIMEOUT = 30000; // 30 segundos

// Helper para timeout em operações assíncronas
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operação timeout')), ms)
    )
  ]);
};

export async function GET(request: NextRequest) {
  let supabaseServer: any;
  let user: any;

  try {
    // Verificar autenticação
    supabaseServer = await createClient();
    const { data: { user: authUser }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    user = authUser;

    // Inicializar cliente Supabase no baileys.service
    initializeSupabaseClient(supabaseServer);

    // Verificar se já existe uma conexão ativa
    let socket = null;
    let status = 'connecting';
    let qrCode = null;
    let whatsappUser = null;

    try {
      socket = getSocket();
      if (socket && socket.user) {
        status = 'connected';
        whatsappUser = socket.user;
      }
    } catch (error) {
      // Socket não existe ou não está conectado
      console.log('Socket WhatsApp não está conectado, iniciando nova conexão...');
    }

    // Se não estiver conectado, tentar conectar
    if (status === 'connecting') {
      try {
        // Usar timeout para evitar operações que ficam "presas"
        await withTimeout(connectToWhatsApp(), WHATSAPP_OPERATION_TIMEOUT);
        
        // Verificar se temos QR code ou se já está conectado
        qrCode = getQRCode();
        
        try {
          socket = getSocket();
          if (socket && socket.user) {
            status = 'connected';
            whatsappUser = socket.user;
            qrCode = null; // Limpar QR se já conectado
          } else if (qrCode) {
            status = 'qr_ready';
          }
        } catch {
          // Socket ainda não está pronto
          if (qrCode) {
            status = 'qr_ready';
          }
        }
      } catch (error: any) {
        console.error('Erro ao conectar WhatsApp:', error.message);
        
        // Tratar diferentes tipos de erro
        if (error.message?.includes('Redis')) {
          status = 'error';
          await updateConnectionStatus(user.id, 'error', null, null, 'Erro de conexão com o Redis');
          return NextResponse.json({ 
            error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' 
          }, { status: 503 });
        }
        
        status = 'error';
        await updateConnectionStatus(user.id, 'error', null, null, error.message);
        return NextResponse.json({ 
          error: 'Erro ao conectar com WhatsApp' 
        }, { status: 500 });
      }
    }

    // Atualizar status no banco de dados
    await updateConnectionStatus(user.id, status as any, qrCode, whatsappUser);

    return NextResponse.json({
      status: status,
      qrCode: qrCode,
      user: whatsappUser
    });

  } catch (error: any) {
    console.error('Erro na conexão WhatsApp:', error);
    
    // Tentar atualizar status de erro no banco
    if (user?.id) {
      try {
        await updateConnectionStatus(user.id, 'error', null, null, error.message);
      } catch (dbError) {
        console.error('Erro ao atualizar status de erro no banco:', dbError);
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let supabaseServer: any;
  let user: any;

  try {
    // Verificar autenticação
    supabaseServer = await createClient();
    const { data: { user: authUser }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    user = authUser;

    // Inicializar cliente Supabase no baileys.service
    initializeSupabaseClient(supabaseServer);

    const { action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Ação não especificada' }, { status: 400 });
    }

    if (action === 'reset') {
      // Reset auth state quando QR Code é rejeitado
      try {
        await resetAuthState();
        return NextResponse.json({ 
          success: true, 
          message: 'Auth state resetado. Tente gerar um novo QR Code.' 
        });
      } catch (error: any) {
        console.error('Erro ao resetar auth state:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }

    if (action === 'disconnect') {
      try {
        const socket = getSocket();
        await withTimeout(socket.logout(), WHATSAPP_OPERATION_TIMEOUT);
        
        await updateConnectionStatus(user.id, 'disconnected');

        return NextResponse.json({ 
          success: true, 
          message: 'Desconectado com sucesso' 
        });
      } catch (error: any) {
        // Mesmo se der erro, atualizar status como desconectado
        await updateConnectionStatus(user.id, 'disconnected');

        if (error.message === 'Operação timeout') {
          return NextResponse.json({ 
            success: true, 
            message: 'Desconexão solicitada (timeout na confirmação)' 
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Já estava desconectado' 
        });
      }
    }

    if (action === 'reconnect') {
      try {
        // Atualizar status para connecting
        await updateConnectionStatus(user.id, 'connecting');

        // Tentar conectar com timeout
        await withTimeout(connectToWhatsApp(), WHATSAPP_OPERATION_TIMEOUT);
        
        const qrCode = getQRCode();
        
        // Atualizar com QR code se disponível
        if (qrCode) {
          await updateConnectionStatus(user.id, 'qr_ready', qrCode);
        }
        
        return NextResponse.json({
          success: true,
          status: qrCode ? 'qr_ready' : 'connecting',
          qrCode: qrCode
        });
      } catch (error: any) {
        console.error('Erro ao reconectar:', error);
        
        await updateConnectionStatus(user.id, 'error', null, null, error.message);
        
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Erro na ação WhatsApp:', error);
    
    if (user?.id) {
      try {
        await updateConnectionStatus(user.id, 'error', null, null, error.message);
      } catch (dbError) {
        console.error('Erro ao atualizar status de erro:', dbError);
      }
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Helper function para atualizar status no banco
async function updateConnectionStatus(
  userId: string,
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error',
  qrCode: string | null = null,
  whatsappUser: any = null,
  errorMessage: string | null = null
) {
  try {
    // Usar o cliente servidor com autenticação adequada
    const supabaseServer = await createClient();
    
    // Usar a função upsert segura que evitará conflitos de chave duplicada
    const { data, error } = await supabaseServer.rpc('upsert_whatsapp_connection_v2', {
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
      console.error('Erro ao atualizar status no banco:', error);
    } else {
      console.log('Status WhatsApp atualizado com sucesso:', data);
    }
  } catch (error) {
    console.error('Erro ao conectar com banco para atualizar status:', error);
  }
}