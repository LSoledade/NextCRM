import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'Leonardo';
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({
        error: 'Variáveis de ambiente da Evolution API não configuradas',
        missing: {
          EVOLUTION_API_URL: !EVOLUTION_API_URL,
          EVOLUTION_API_KEY: !EVOLUTION_API_KEY
        }
      }, { status: 500 });
    }

    // Verificar configuração do webhook na instância
    const response = await fetch(`${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({
        error: 'Erro ao verificar webhook na Evolution API',
        status: response.status,
        statusText: response.statusText,
        config: {
          instanceName: INSTANCE_NAME,
          expectedWebhookUrl: WEBHOOK_URL,
          evolutionApiUrl: EVOLUTION_API_URL
        }
      }, { status: 500 });
    }

    const webhookConfig = await response.json();

    return NextResponse.json({
      success: true,
      config: {
        instanceName: INSTANCE_NAME,
        expectedWebhookUrl: WEBHOOK_URL,
        evolutionApiUrl: EVOLUTION_API_URL
      },
      currentWebhookConfig: webhookConfig,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar configuração do webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao verificar webhook',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'Leonardo';
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

    // Configurar webhook na Evolution API
    const webhookData = {
      url: WEBHOOK_URL,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'MESSAGES_DELETE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED'
      ],
      webhook_by_events: true
    };

    console.log('🔧 Configurando webhook:', {
      instance: INSTANCE_NAME,
      url: WEBHOOK_URL,
      events: webhookData.events
    });

    const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: 'Erro ao configurar webhook na Evolution API',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        config: webhookData
      }, { status: 500 });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Webhook configurado com sucesso',
      config: webhookData,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro ao configurar webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao configurar webhook',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
