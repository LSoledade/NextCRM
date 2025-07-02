// app/api/whatsapp/connection/route.ts - VERSÃO EVOLUTION API
import { NextRequest, NextResponse } from 'next/server';
import { 
  initializeWhatsAppConnection,
  fetchQRCode, 
  getSocket, 
  initializeSupabaseClient, 
  resetAuthState,
  disconnect,
  checkConnectionStatus,
  getConnectionStatus,
  getConnectionState,
  setupWebhook,
  connectToWhatsApp
} from '@/lib/evolution.service';
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

    // Inicializar cliente Supabase no evolution.service
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
        // Configurar webhook automaticamente
        const webhookUrl = `${request.nextUrl.origin}/api/whatsapp/webhook`;
        console.log(`[Evolution] Configurando webhook: ${webhookUrl}`);
        
        try {
          await setupWebhook(webhookUrl);
          console.log('[Evolution] Webhook configurado com sucesso');
        } catch (webhookError: any) {
          console.warn('[Evolution] Erro ao configurar webhook (continuando):', webhookError.message);
        }
        
        // Usar timeout para evitar operações que ficam "presas"
        await withTimeout(connectToWhatsApp(), WHATSAPP_OPERATION_TIMEOUT);
        
        // Verificar status atualizado da conexão usando getConnectionState
        const connectionState = await getConnectionState();
        status = connectionState.state;
        
        // Para QR Code, precisamos usar uma abordagem diferente na Evolution API
        // O QR code geralmente vem via webhook ou endpoint específico
        if (status === 'open') {
          status = 'connected';
          qrCode = null; // Limpar QR se já conectado
          try {
            socket = getSocket();
            whatsappUser = socket;
          } catch {
            // Socket não disponível, mas status é connected
          }
        } else if (status === 'close') {
          status = 'connecting';
          // Tentar obter QR Code se ainda conectando
          try {
            qrCode = await withTimeout(fetchQRCode(), WHATSAPP_OPERATION_TIMEOUT);
            if (qrCode) {
              status = 'qr_ready';
            }
          } catch (error: any) {
            console.warn('Erro ao obter QR Code:', error.message);
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

    // Inicializar cliente Supabase no evolution.service
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
        await withTimeout(disconnect(), WHATSAPP_OPERATION_TIMEOUT);
        
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
        
        // Verificar status e obter QR Code se necessário
        const connectionState = await getConnectionState();
        let qrCode = null;
        
        if (connectionState.state === 'open') {
          // Já conectado
          await updateConnectionStatus(user.id, 'connected');
        } else {
          // Tentar obter QR Code
          try {
            qrCode = await withTimeout(fetchQRCode(), WHATSAPP_OPERATION_TIMEOUT);
          } catch (error: any) {
            console.warn('Erro ao obter QR Code durante reconexão:', error.message);
          }
        }
        
        // Atualizar com QR code se disponível
        if (qrCode) {
          await updateConnectionStatus(user.id, 'qr_ready', qrCode);
        }
        
        return NextResponse.json({
          success: true,
          status: qrCode ? 'qr_ready' : (connectionState.state === 'open' ? 'connected' : 'connecting'),
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
    
    // Usar upsert diretamente na tabela em vez de RPC
    const { data, error } = await supabaseServer
      .from('whatsapp_connections')
      .upsert({
        user_id: userId,
        status: status,
        qr_code: qrCode,
        whatsapp_user: whatsappUser,
        phone_number: whatsappUser?.id || null,
        connected_at: status === 'connected' ? new Date().toISOString() : null,
        disconnected_at: status === 'disconnected' ? new Date().toISOString() : null,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Erro ao atualizar status no banco:', error);
    } else {
      console.log('Status WhatsApp atualizado com sucesso:', status);
    }
  } catch (error) {
    console.error('Erro ao conectar com banco para atualizar status:', error);
  }
}