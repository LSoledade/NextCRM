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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Verificar autenticação através do cliente Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Status API - Auth check:', { user: user?.id, error: authError });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar role diretamente do user_metadata (mais confiável)
    const userRole = user.user_metadata?.role;
    console.log('Status API - User role from metadata:', userRole);
    
    if (userRole !== 'admin') {
      console.error('Admin verification failed. User role:', userRole);
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem acessar status de importação.' }, { status: 403 });
    }

    // Como fallback, também verificar na tabela public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    console.log('Status API - Profile check:', { profile, profileError });
    
    // Se não existir na tabela public, mas tem role admin no metadata, permitir
    if (profileError && userRole !== 'admin') {
      console.error('No profile found and not admin in metadata');
      return NextResponse.json({ error: 'Usuário não encontrado no sistema.' }, { status: 403 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.jobId;
    console.log('Buscando job com ID:', jobId);
    const job = importJobs.get(jobId);

    if (!job) {
      console.log('Job não encontrado:', jobId);
      console.log('Jobs disponíveis:', Array.from(importJobs.keys()));
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    console.log('Job encontrado:', job);

    if (job.userId !== user.id) {
      console.log('Usuário não autorizado para o job:', { jobUserId: job.userId, currentUserId: user.id });
      return NextResponse.json({ error: 'Não autorizado para este job' }, { status: 403 });
    }

    // Retornar status do job
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      totalRows: job.totalRows,
      totalChunks: job.totalChunks,
      processedChunks: job.processedChunks,
      processedRows: job.processedRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      errors: job.errors.slice(0, 50), // Limitar a 50 erros para não sobrecarregar
      progress: job.totalRows > 0 ? (job.processedRows / job.totalRows) * 100 : 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });

  } catch (error) {
    console.error('Erro ao buscar status do job:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
