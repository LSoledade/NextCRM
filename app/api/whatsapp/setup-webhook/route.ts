import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || 'Leonardo';
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';
    
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas' 
      }, { status: 500 });
    }

    console.log('🔧 Reconfigurando webhook...');
    console.log('Instance:', INSTANCE_NAME);
    console.log('Webhook URL:', WEBHOOK_URL);

    // Configurar webhook
    const webhookConfig = {
      url: WEBHOOK_URL,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE', 
        'MESSAGES_DELETE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
        'CALL',
        'NEW_JWT_TOKEN'
      ],
      webhook_by_events: false,
      webhook_base64: false
    };

    const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookConfig)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao configurar webhook:', responseData);
      return NextResponse.json({ 
        error: 'Erro ao configurar webhook',
        details: responseData 
      }, { status: response.status });
    }

    console.log('✅ Webhook configurado com sucesso:', responseData);

    return NextResponse.json({
      success: true,
      message: 'Webhook configurado com sucesso',
      data: responseData,
      config: webhookConfig
    });

  } catch (error: any) {
    console.error('❌ Erro ao configurar webhook:', error);
    return NextResponse.json({ 
      error: 'Erro ao configurar webhook',
      details: error.message 
    }, { status: 500 });
  }
}
