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
    
    console.log('Complete API - Auth check:', { user: user?.id, error: authError });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar role diretamente do user_metadata (mais confiável)
    const userRole = user.user_metadata?.role;
    console.log('Complete API - User role from metadata:', userRole);
    
    if (userRole !== 'admin') {
      console.error('Admin verification failed. User role:', userRole);
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem importar leads.' }, { status: 403 });
    }

    // Como fallback, também verificar na tabela public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    console.log('Complete API - Profile check:', { profile, profileError });
    
    // Se não existir na tabela public, mas tem role admin no metadata, permitir
    if (profileError && userRole !== 'admin') {
      console.error('No profile found and not admin in metadata');
      return NextResponse.json({ error: 'Usuário não encontrado no sistema.' }, { status: 403 });
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
