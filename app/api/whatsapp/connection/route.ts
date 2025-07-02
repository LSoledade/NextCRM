// app/api/whatsapp/connection/route.ts - VERSÃO EVOLUTION API
import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchQRCode, 
  checkInstanceStatus,
  reconnectInstance,
  ensureWebhookSetup
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
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user: authUser }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar status da instância Leonardo
    console.log('[Evolution] Verificando status da instância...');
    const instanceStatus = await checkInstanceStatus();
    
    let status = 'connecting';
    let qrCode = null;
    let whatsappUser = null;
    let message = '';

    if (!instanceStatus.exists) {
      // Instância não existe - isso não deveria acontecer
      console.error('[Evolution] Instância Leonardo não encontrada!');
      status = 'error';
      message = 'Instância WhatsApp não encontrada. Contate o administrador.';
    } else {
      console.log(`[Evolution] Instância encontrada - Status: ${instanceStatus.status}`);
      
      if (instanceStatus.connected) {
        status = 'connected';
        message = 'WhatsApp conectado';
        whatsappUser = instanceStatus.profile;
      } else {
        // Tentar configurar webhook
        const webhookUrl = `${request.nextUrl.origin}/api/whatsapp/webhook`;
        try {
          await ensureWebhookSetup();
          console.log('[Evolution] Webhook configurado');
        } catch (webhookError: any) {
          console.warn('[Evolution] Aviso webhook:', webhookError.message);
        }
        
        // Tentar obter QR Code se não conectado
        try {
          const qrResult = await withTimeout(fetchQRCode(), WHATSAPP_OPERATION_TIMEOUT);
          
          if (qrResult.qrCode) {
            status = 'qr_ready';
            qrCode = qrResult.qrCode;
            message = 'QR Code disponível para escaneamento';
          } else if (qrResult.error) {
            if (qrResult.error === 'Instance already connected') {
              status = 'connected';
              message = 'WhatsApp já está conectado';
            } else {
              status = 'error';
              message = qrResult.error;
            }
          }
        } catch (error: any) {
          console.error('[Evolution] Erro ao obter QR Code:', error.message);
          status = 'error';
          message = `Erro ao obter QR Code: ${error.message}`;
        }
      }
    }

    // Atualizar status no banco de dados
    await updateConnectionStatus(authUser.id, status as any, qrCode, whatsappUser, message);

    return NextResponse.json({
      status: status,
      qrCode: qrCode,
      user: whatsappUser,
      message: message
    });

  } catch (error: any) {
    console.error('Erro na conexão WhatsApp:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user: authUser }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Ação não especificada' }, { status: 400 });
    }

    if (action === 'reset') {
      // Para reset, vamos simplesmente reconectar a instância
      try {
        const reconnectResult = await reconnectInstance();
        
        if (reconnectResult.qrCode) {
          await updateConnectionStatus(authUser.id, 'qr_ready', reconnectResult.qrCode);
          return NextResponse.json({ 
            success: true, 
            message: 'Nova conexão iniciada. Escaneie o QR Code.',
            qrCode: reconnectResult.qrCode
          });
        } else if (reconnectResult.error) {
          return NextResponse.json({ 
            success: false, 
            error: reconnectResult.error 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Reconexão em andamento...' 
        });
      } catch (error: any) {
        console.error('Erro ao reconectar:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }

    if (action === 'disconnect') {
      try {
        // Para disconnect, vamos apenas atualizar o status no banco
        // A API Evolution não tem um endpoint específico de disconnect que funcione bem
        await updateConnectionStatus(authUser.id, 'disconnected');

        return NextResponse.json({ 
          success: true, 
          message: 'Desconectado com sucesso' 
        });
      } catch (error: any) {
        return NextResponse.json({ 
          success: true, 
          message: 'Status atualizado para desconectado' 
        });
      }
    }

    if (action === 'reconnect') {
      try {
        // Atualizar status para connecting
        await updateConnectionStatus(authUser.id, 'connecting');

        // Verificar status atual primeiro
        const instanceStatus = await checkInstanceStatus();
        
        if (instanceStatus.connected) {
          await updateConnectionStatus(authUser.id, 'connected', null, instanceStatus.profile);
          return NextResponse.json({
            success: true,
            status: 'connected',
            message: 'WhatsApp já está conectado'
          });
        }
        
        // Tentar reconectar
        const reconnectResult = await withTimeout(reconnectInstance(), WHATSAPP_OPERATION_TIMEOUT);
        
        if (reconnectResult.qrCode) {
          await updateConnectionStatus(authUser.id, 'qr_ready', reconnectResult.qrCode);
          return NextResponse.json({
            success: true,
            status: 'qr_ready',
            qrCode: reconnectResult.qrCode,
            message: 'QR Code gerado para reconexão'
          });
        } else if (reconnectResult.error) {
          await updateConnectionStatus(authUser.id, 'error', null, null, reconnectResult.error);
          return NextResponse.json({ 
            success: false, 
            error: reconnectResult.error 
          }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          status: 'connecting',
          message: 'Reconexão em andamento'
        });
      } catch (error: any) {
        console.error('Erro ao reconectar:', error);
        
        await updateConnectionStatus(authUser.id, 'error', null, null, error.message);
        
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