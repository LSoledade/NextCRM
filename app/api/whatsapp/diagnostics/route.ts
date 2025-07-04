import { NextRequest, NextResponse } from 'next/server';
import { testConnection, checkInstanceStatus } from '@/lib/evolution-http.service';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';

    if (type === 'connection') {
      // Teste rápido de conectividade
      const result = await testConnection();
      return NextResponse.json(result);
    } else {
      // Diagnósticos completos - simplified for now
      const connectionTest = await testConnection();
      const instanceStatus = await checkInstanceStatus();
      
      const result = {
        success: true,
        results: {
          timestamp: new Date().toISOString(),
          connectivity: connectionTest,
          instanceStatus: instanceStatus,
          canSendMessages: connectionTest.success && instanceStatus.connected
        }
      };
      
      return NextResponse.json(result);
    }

  } catch (error: any) {
    console.error('❌ Erro no diagnóstico:', error);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Erro no diagnóstico',
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

    const { action } = await request.json();

    if (action === 'test_connection') {
      const result = await testConnection();
      return NextResponse.json(result);
    } else if (action === 'full_diagnostics') {
      // Simplified diagnostics
      const connectionTest = await testConnection();
      const instanceStatus = await checkInstanceStatus();
      
      const result = {
        success: true,
        results: {
          timestamp: new Date().toISOString(),
          connectivity: connectionTest,
          instanceStatus: instanceStatus,
          canSendMessages: connectionTest.success && instanceStatus.connected
        }
      };
      
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ 
        error: 'Ação não reconhecida',
        availableActions: ['test_connection', 'full_diagnostics']
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Erro no diagnóstico POST:', error);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Erro no diagnóstico',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
