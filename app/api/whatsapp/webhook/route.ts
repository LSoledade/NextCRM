import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/evolution.service';

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    
    console.log('[Webhook] Dados recebidos da Evolution API:', {
      event: webhookData.event,
      instance: webhookData.instance,
      timestamp: new Date().toISOString()
    });

    // Processar webhook
    await processWebhook(webhookData);
    
    // Responder com sucesso
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado com sucesso' 
    });
    
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json(
    { error: 'Método não permitido' },
    { status: 405 }
  );
}
