import { NextRequest, NextResponse } from 'next/server';
import { 
  getConnectionStatus, 
  connectToWhatsApp, 
  fetchQRCode, 
  checkConnectionStatus 
} from '@/lib/evolution.service';

export async function GET(request: NextRequest) {
  try {
    // Teste básico de status
    const status = getConnectionStatus();
    
    return NextResponse.json({
      success: true,
      currentStatus: status,
      message: 'Evolution API test endpoint',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'status':
        const connectionState = await checkConnectionStatus();
        return NextResponse.json({
          success: true,
          connectionState,
          currentStatus: getConnectionStatus()
        });
        
      case 'connect':
        await connectToWhatsApp();
        return NextResponse.json({
          success: true,
          message: 'Conexão iniciada',
          status: getConnectionStatus()
        });
        
      case 'qr':
        const qrCode = await fetchQRCode();
        return NextResponse.json({
          success: true,
          qrCode,
          message: 'QR Code obtido'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não reconhecida. Use: status, connect, qr'
        }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
