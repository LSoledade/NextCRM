import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || 'Leonardo';
    
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas' 
      }, { status: 500 });
    }

    console.log('🔌 Reconectando instância WhatsApp...');
    console.log('Instance:', INSTANCE_NAME);

    // Tentar reconectar a instância
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao reconectar instância:', responseData);
      return NextResponse.json({ 
        error: 'Erro ao reconectar instância',
        details: responseData 
      }, { status: response.status });
    }

    console.log('✅ Tentativa de reconexão iniciada:', responseData);

    // Verificar status após tentativa de reconexão
    const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    let instanceStatus = null;
    if (statusResponse.ok) {
      const instances = await statusResponse.json();
      instanceStatus = instances.find((inst: any) => inst.name === INSTANCE_NAME);
    }

    return NextResponse.json({
      success: true,
      message: 'Tentativa de reconexão iniciada',
      reconnectData: responseData,
      currentStatus: instanceStatus,
      instructions: instanceStatus?.connectionStatus !== 'open' 
        ? 'Pode ser necessário escanear QR Code no painel da Evolution API'
        : 'Instância já conectada'
    });

  } catch (error: any) {
    console.error('❌ Erro ao reconectar instância:', error);
    return NextResponse.json({ 
      error: 'Erro ao reconectar instância',
      details: error.message 
    }, { status: 500 });
  }
}
