import { NextRequest, NextResponse } from 'next/server';
import { checkInstanceStatus } from '@/lib/evolution-http.service';
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

    // Return detailed status information
    const status = instanceStatus.connected ? 'connected' : 'disconnected';
    
    return NextResponse.json({
      status: status,
      exists: instanceStatus.exists,
      connected: instanceStatus.connected,
      instanceStatus: instanceStatus.status,
      profile: instanceStatus.profile,
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
