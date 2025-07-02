import { NextRequest, NextResponse } from 'next/server';
import { getConnectionState, checkInstanceStatus } from '@/lib/evolution.service';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar status da instância
    const instanceStatus = await checkInstanceStatus();
    
    if (!instanceStatus.exists) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'Instância não encontrada'
      });
    }

    // Verificar estado da conexão
    const connectionState = await getConnectionState();
    
    return NextResponse.json({
      status: connectionState.state,
      instanceStatus: instanceStatus.status,
      message: 'Status obtido com sucesso'
    });
    
  } catch (error: any) {
    console.error('[Status API] Erro:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Erro ao verificar status'
    }, { status: 500 });
  }
}
