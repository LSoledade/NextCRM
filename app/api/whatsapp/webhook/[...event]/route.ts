import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/evolution.service';

export async function POST(request: NextRequest, { params }: { params: { event: string[] } }) {
  try {
    const webhookData = await request.json();
    const eventPath = params.event?.join('-') || 'unknown';
    
    console.log('[Webhook Catch-All] 📥 =================================');
    console.log('[Webhook Catch-All] 📥 DADOS RECEBIDOS NA SUBROTA:');
    console.log('[Webhook Catch-All] 📥 =================================');
    console.log(`[Webhook Catch-All] 📥 Subrota: /api/whatsapp/webhook/${eventPath}`);
    console.log('[Webhook Catch-All] 📥 Payload:', JSON.stringify(webhookData, null, 2));
    console.log('[Webhook Catch-All] 📥 =================================');
    
    // Se o evento não estiver presente no payload, extrair do path
    if (!webhookData.event && params.event?.length) {
      webhookData.event = eventPath;
      console.log(`[Webhook Catch-All] 📝 Evento extraído do path: ${eventPath}`);
    }
    
    console.log('[Webhook Catch-All] 📥 Dados recebidos da Evolution API:', {
      event: webhookData.event,
      instance: webhookData.instance,
      timestamp: new Date().toISOString(),
      hasData: !!webhookData.data,
      dataType: typeof webhookData.data,
      dataKeys: webhookData.data ? Object.keys(webhookData.data) : [],
      originalPath: eventPath
    });

    // Validar se o webhook contém dados essenciais
    if (!webhookData.event) {
      console.warn('[Webhook Catch-All] ⚠️ Webhook recebido sem evento');
      return NextResponse.json({ 
        success: false, 
        error: 'Evento não especificado' 
      }, { status: 400 });
    }

    // Processar webhook usando a mesma lógica do webhook principal
    await processWebhook(webhookData);
    
    console.log('[Webhook Catch-All] ✅ Webhook processado com sucesso');
    
    // Responder com sucesso
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      event: webhookData.event,
      path: eventPath,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Webhook Catch-All] ❌ Erro ao processar webhook:', error);
    
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

// Permitir apenas POST para consistência com o webhook principal
export async function GET(request: NextRequest, { params }: { params: { event: string[] } }) {
  const eventPath = params.event?.join('-') || 'unknown';
  
  console.log(`[Webhook Catch-All] ℹ️ Tentativa de acesso GET ao webhook: ${eventPath}`);
  
  return NextResponse.json(
    { 
      error: 'Método não permitido',
      message: 'Este endpoint aceita apenas requisições POST',
      path: `/api/whatsapp/webhook/${eventPath}`,
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  );
}

// Adicionar suporte para OPTIONS para debugging
export async function OPTIONS(request: NextRequest, { params }: { params: { event: string[] } }) {
  const eventPath = params.event?.join('-') || 'unknown';
  
  return NextResponse.json(
    { 
      message: 'Webhook da Evolution API - Catch-All Route',
      path: `/api/whatsapp/webhook/${eventPath}`,
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
