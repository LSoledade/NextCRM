import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID é obrigatório' }, { status: 400 });
    }

    const job = importJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Não autorizado para este job' }, { status: 403 });
    }

    // Finalizar o job
    job.status = job.errorCount > 0 ? 'completed' : 'completed';
    job.updatedAt = new Date();

    // Em produção, você poderia:
    // 1. Salvar um relatório final no banco
    // 2. Enviar email de notificação
    // 3. Limpar dados temporários
    // 4. Atualizar métricas de uso

    // Opcional: agendar limpeza do job após algum tempo
    setTimeout(() => {
      importJobs.delete(jobId);
    }, 24 * 60 * 60 * 1000); // Limpar após 24 horas

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      successCount: job.successCount,
      errorCount: job.errorCount,
      totalProcessed: job.processedRows
    });

  } catch (error) {
    console.error('Erro ao finalizar importação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
