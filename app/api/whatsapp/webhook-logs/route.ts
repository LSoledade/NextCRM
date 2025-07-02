import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simular logs do webhook (em produção, isso viria de um sistema de logs)
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Esta é uma simulação de logs do webhook',
        data: {
          note: 'Em produção, estes logs viriam do servidor ou sistema de logs'
        }
      }
    ];

    return NextResponse.json({
      success: true,
      logs: mockLogs,
      message: 'Logs simulados - implemente integração com sistema de logs real'
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar logs do webhook:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar logs',
      details: error.message 
    }, { status: 500 });
  }
}
