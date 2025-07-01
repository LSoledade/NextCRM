import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

// Configuração do Supabase (ajuste se necessário)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const runtime = 'edge'; // ou 'nodejs' se precisar de fs

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const csv = new TextDecoder().decode(arrayBuffer);
    const parsed = Papa.parse(csv, { header: true });
    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: 'Erro ao processar CSV.' }, { status: 400 });
    }
    // Validação básica e preparação dos dados
    const leads = (parsed.data as any[]).map((row) => ({
      name: row.name?.trim(),
      email: row.email?.trim(),
      phone: row.phone?.trim() || null,
      status: row.status || 'New',
      source: row.source || null,
      tags: row.tags ? row.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : [],
    })).filter(l => l.name && l.email);
    if (leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead válido encontrado.' }, { status: 400 });
    }
    // Inserção em lote
    const { error } = await supabase.from('leads').insert(leads);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: leads.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro desconhecido.' }, { status: 500 });
  }
}
