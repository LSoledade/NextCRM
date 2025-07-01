import { NextRequest } from 'next/server';
import { getQRCode, getSocket } from '@/lib/baileys.service';

export async function GET(request: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = () => {
        try {
          let socket = null;
          let status = 'connecting';
          let qrCode = null;
          let user = null;

          // Check if socket exists and is connected
          try {
            socket = getSocket();
            if (socket && socket.user) {
              status = 'connected';
              user = socket.user;
            }
          } catch (error) {
            // Socket doesn't exist or isn't connected
          }

          // Get QR code if not connected
          if (status === 'connecting') {
            qrCode = getQRCode();
            if (qrCode) {
              status = 'qr_ready';
            }
          }

          const data = JSON.stringify({
            status,
            qrCode,
            user,
            timestamp: new Date().toISOString()
          });

          controller.enqueue(`data: ${data}\n\n`);
        } catch (error) {
          console.error('Erro ao enviar atualização SSE:', error);
          const errorData = JSON.stringify({
            status: 'error',
            error: 'Erro interno do servidor',
            timestamp: new Date().toISOString()
          });
          controller.enqueue(`data: ${errorData}\n\n`);
        }
      };

      // Send initial update
      sendUpdate();

      // Send updates every 3 seconds
      const interval = setInterval(sendUpdate, 3000);

      // Cleanup function
      const cleanup = () => {
        clearInterval(interval);
        controller.close();
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);

      // Keep alive ping
      const keepAlive = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      }, 30000);

      // Cleanup keep alive
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
      });
    }
  });

  return new Response(stream, { headers });
}
