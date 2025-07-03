import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage, checkInstanceStatus } from '@/lib/evolution-http.service';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { number, text } = await request.json();

    // Validações básicas
    if (!number || !text) {
      return NextResponse.json({ 
        error: 'Número e texto são obrigatórios' 
      }, { status: 400 });
    }

    // Verificar status da instância
    console.log('🔍 Verificando status da instância...');
    const status = await checkInstanceStatus();
    
    if (!status.connected) {
      return NextResponse.json({ 
        error: 'WhatsApp não está conectado',
        status: status.status,
        exists: status.exists
      }, { status: 400 });
    }

    console.log('✅ Instância conectada, enviando mensagem...');

    // Enviar mensagem de teste
    const result = await sendTextMessage({
      number: number,
      text: text
    });

    console.log('📱 Resultado do envio:', result);

    return NextResponse.json({ 
      success: true, 
      result: result,
      message: 'Mensagem de teste enviada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de envio:', error);
    
    let errorMessage = error.message || 'Erro desconhecido';
    let statusCode = 500;

    // Tratamento específico para erros da Evolution API
    if (error.response) {
      console.error('📊 Resposta da Evolution API:', {
        status: error.response.status,
        data: error.response.data
      });
      
      errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      statusCode = error.response.status || 500;
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: error.message,
        apiResponse: error.response?.data
      } : undefined
    }, { status: statusCode });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar status da instância
    const status = await checkInstanceStatus();

    return NextResponse.json({
      instanceStatus: status,
      canSendMessages: status.connected,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar status:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Erro ao verificar status',
      instanceStatus: {
        exists: false,
        connected: false,
        status: 'error'
      }
    }, { status: 500 });
  }
}
