import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || 'Leonardo';
    
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas' 
      }, { status: 500 });
    }

    console.log('🔍 Verificando configuração do webhook...');
    console.log('API URL:', EVOLUTION_API_URL);
    console.log('Instance:', INSTANCE_NAME);

    // Verificar webhook configurado
    const webhookResponse = await fetch(`${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    let webhookData = null;
    if (webhookResponse.ok) {
      webhookData = await webhookResponse.json();
    }

    // Verificar status da instância
    const instanceResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    let instanceData = null;
    if (instanceResponse.ok) {
      const instances = await instanceResponse.json();
      instanceData = instances.find((inst: any) => inst.name === INSTANCE_NAME);
    }

    return NextResponse.json({
      success: true,
      data: {
        webhook: {
          configured: webhookResponse.ok,
          status: webhookResponse.status,
          data: webhookData
        },
        instance: {
          found: !!instanceData,
          data: instanceData
        },
        config: {
          apiUrl: EVOLUTION_API_URL,
          instanceName: INSTANCE_NAME,
          webhookUrl: process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar configuração:', error);
    return NextResponse.json({ 
      error: 'Erro ao verificar configuração',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Adicione este log:
    const rawBody = await request.text();
    console.log('[Webhook] RAW BODY:', rawBody);

    // Depois, parse normalmente:
    const webhookData = JSON.parse(rawBody);

    // ... resto do seu código ...
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar webhook',
      details: error.message 
    }, { status: 500 });
  }
}
