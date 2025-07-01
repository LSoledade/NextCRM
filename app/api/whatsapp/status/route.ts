import { NextResponse } from 'next/server';
import { getSocket, getQRCode } from '@/lib/baileys.service';

export async function GET() {
  try {
    getSocket();
    return NextResponse.json({ status: 'connected', qr: null });
  } catch (error) {
    const qr = getQRCode();
    if (qr) return NextResponse.json({ status: 'connecting', qr });
    return NextResponse.json({ status: 'disconnected', qr: null });
  }
}
