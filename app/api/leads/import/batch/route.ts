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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
