import { NextRequest, NextResponse } from 'next/server';
import { checkInstanceStatus } from '@/lib/evolution-http.service';

// Endpoint simplificado para verificação de status sem autenticação
// NOTA: Em produção, considere adicionar alguma forma de autenticação ou rate limiting
export async function GET(request: NextRequest) {
  try {
    // Verificar status da instância
    const instanceStatus = await checkInstanceStatus();
    
    if (!instanceStatus.exists) {
      return NextResponse.json({
        state: 'disconnected',
        instanceStatus: 'not_found',
        message: 'Instância não encontrada'
      });
    }

    // Return connection state based on instance status
    const state = instanceStatus.connected ? 'connected' : 'disconnected';
    
    return NextResponse.json({
      state: state,
      instanceStatus: instanceStatus.status,
      instanceConnected: instanceStatus.connected,
      profile: instanceStatus.profile,
      message: 'Status obtido com sucesso'
    });
    
  } catch (error: any) {
    console.error('❌ [WhatsApp Admin Status] Erro:', error);
    
    return NextResponse.json({
      state: 'error',
      error: error.message || 'Erro ao verificar status',
      instanceStatus: 'error'
    }, { status: 500 });
  }
}
