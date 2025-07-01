import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Interface para o job de importação
interface ImportJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  totalChunks: number;
  processedChunks: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ line: number; error: string }>;
  createdAt: Date;
  updatedAt: Date;
}

// Armazenamento em memória para jobs (em produção, usar Redis)
declare global {
  var importJobs: Map<string, ImportJob> | undefined;
}

const importJobs = globalThis.importJobs ?? new Map<string, ImportJob>();
globalThis.importJobs = importJobs;

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação através do cliente Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Admin verification failed:', profileError);
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem importar leads.' }, { status: 403 });
    }

    const { totalRows, totalChunks, userId } = await request.json();

    // Validações
    if (!totalRows || !totalChunks || !userId) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    if (totalRows > 50000) {
      return NextResponse.json({ error: 'Limite máximo de 50.000 leads por importação' }, { status: 400 });
    }

    // Criar job de importação
    const jobId = uuidv4();
    console.log('Criando job com ID:', jobId);
    const job: ImportJob = {
      id: jobId,
      userId,
      status: 'pending',
      totalRows,
      totalChunks,
      processedChunks: 0,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    importJobs.set(jobId, job);
    console.log('Job criado e armazenado:', job);
    console.log('Total de jobs:', importJobs.size);

    // Em produção, salvar o job no banco de dados ou Redis
    // await supabase.from('import_jobs').insert(job);

    return NextResponse.json({ jobId });

  } catch (error) {
    console.error('Erro ao inicializar importação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
