import { NextRequest, NextResponse } from 'next/server';
import { getConnectionState, checkInstanceStatus } from '@/lib/evolution.service';

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

    // Verificar estado da conexão
    const connectionState = await getConnectionState();
    
    return NextResponse.json({
      state: connectionState.state,
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
