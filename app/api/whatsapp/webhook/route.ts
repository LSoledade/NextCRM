import { NextRequest, NextResponse } from 'next/server';
import { processWebhookEvent } from '@/lib/webhook.processor';

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    
    console.log('[Webhook] 📥 =================================');
    console.log('[Webhook] 📥 DADOS COMPLETOS DO WEBHOOK:');
    console.log('[Webhook] 📥 =================================');
    console.log(JSON.stringify(webhookData, null, 2));
    console.log('[Webhook] 📥 =================================');
    
    console.log('[Webhook] 📥 Dados recebidos da Evolution API:', {
      event: webhookData.event,
      instance: webhookData.instance,
      timestamp: new Date().toISOString(),
      hasData: !!webhookData.data,
      dataType: typeof webhookData.data,
      dataKeys: webhookData.data ? Object.keys(webhookData.data) : []
    });

    // Validar se o webhook contém dados essenciais
    if (!webhookData.event) {
      console.warn('[Webhook] ⚠️ Webhook recebido sem evento');
      return NextResponse.json({ 
        success: false, 
        error: 'Evento não especificado' 
      }, { status: 400 });
    }

    // Process webhook with improved processor
    await processWebhookEvent(webhookData);
    
    console.log('[Webhook] ✅ Webhook processado com sucesso');
    
    // Responder com sucesso
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      event: webhookData.event,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Webhook] ❌ Erro ao processar webhook:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Permitir apenas POST
export async function GET(request: NextRequest) {
  console.log('[Webhook] ℹ️ Tentativa de acesso GET ao webhook');
  
  return NextResponse.json(
    { 
      error: 'Método não permitido',
      message: 'Este endpoint aceita apenas requisições POST',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  );
}

// Adicionar suporte para outros métodos para debugging
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Webhook da Evolution API',
      methods: ['POST'],
      timestamp: new Date().toISOString()
    },
    { 
      status: 200,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}
