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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Chunk API - Auth check:', { user: user?.id, error: authError });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar role diretamente do user_metadata (mais confiável)
    const userRole = user.user_metadata?.role;
    console.log('Chunk API - User role from metadata:', userRole);
    
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
      
    console.log('Chunk API - Profile check:', { profile, profileError });
    
    // Se não existir na tabela public, mas tem role admin no metadata, permitir
    if (profileError && userRole !== 'admin') {
      console.error('No profile found and not admin in metadata');
      return NextResponse.json({ error: 'Usuário não encontrado no sistema.' }, { status: 403 });
    }

    const supabaseForInsert = await createClient();

    const { jobId, chunkIndex, data } = await request.json();

    // Validações
    if (!jobId || chunkIndex === undefined || !data || !Array.isArray(data)) {
      console.error('Parâmetros inválidos:', { jobId, chunkIndex, dataLength: data?.length });
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const job = importJobs.get(jobId);
    if (!job) {
      console.error('Job não encontrado:', jobId);
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    if (job.userId !== user.id) {
      console.error('Usuário não autorizado para o job');
      return NextResponse.json({ error: 'Não autorizado para este job' }, { status: 403 });
    }

    // Atualizar status do job
    job.status = 'processing';
    job.updatedAt = new Date();

    // Processar chunk de dados
    const chunkErrors: Array<{ line: number; error: string }> = [];
    const validLeads: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const lineNumber = (chunkIndex * 1000) + i + 1;

      try {
        // Validação básica
        if (!row.name) {
          chunkErrors.push({
            line: lineNumber,
            error: 'Nome é obrigatório'
          });
          continue;
        }

        // Validar que pelo menos email ou telefone estejam preenchidos
        if (!row.email && !row.phone) {
          chunkErrors.push({
            line: lineNumber,
            error: 'Pelo menos email ou telefone deve estar preenchido'
          });
          continue;
        }

        // Validar email se fornecido
        if (row.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            chunkErrors.push({
              line: lineNumber,
              error: 'Email inválido'
            });
            continue;
          }
        }

        // Validar e processar company
        let company = null;
        if (row.company) {
          const companyValue = row.company.trim();
          if (['Favale', 'Pink', 'Favale&Pink'].includes(companyValue)) {
            company = companyValue;
          } else {
            chunkErrors.push({
              line: lineNumber,
              error: `Empresa inválida: ${companyValue}. Valores aceitos: Favale, Pink, Favale&Pink`
            });
            continue;
          }
        }

        // Validar e processar source - garantir que Favale e Pink não sejam usados como origem
        let source = row.source?.trim() || 'import';
        if (['Favale', 'Pink'].includes(source)) {
          chunkErrors.push({
            line: lineNumber,
            error: `"${source}" deve ser usado como empresa, não como origem`
          });
          continue;
        }

        // Processar is_student
        let isStudent = false;
        if (row.is_student) {
          const studentValue = row.is_student.toString().toLowerCase().trim();
          isStudent = ['true', '1', 'yes', 'sim', 's'].includes(studentValue);
        }

        // Validar e processar status
        let status = 'New'; // Valor padrão
        if (row.status) {
          const statusValue = row.status.trim();
          if (['New', 'Contacted', 'Converted', 'Lost'].includes(statusValue)) {
            status = statusValue;
          }
        }

        // Preparar dados do lead
        const leadData = {
          user_id: user.id,
          name: row.name?.trim(),
          email: row.email?.trim().toLowerCase() || null,
          phone: row.phone?.trim() || null,
          company: company,
          status: status,
          source: source,
          tags: row.tags ? row.tags.split(';').map((tag: string) => tag.trim()).filter(Boolean) : [],
          is_student: isStudent
        };

        validLeads.push(leadData);

      } catch (error) {
        chunkErrors.push({
          line: lineNumber,
          error: `Erro ao processar linha: ${error}`
        });
      }
    }

    // Inserir leads válidos no banco
    let insertedCount = 0;
    const studentsToCreate: any[] = [];
    
    if (validLeads.length > 0) {
      try {
        // Separar informação de aluno e preparar dados para inserção
        const leadsToInsert = validLeads.map(lead => {
          const { is_student, ...leadData } = lead;
          if (is_student) {
            studentsToCreate.push({ email: lead.email, is_student });
          }
          return leadData;
        });

        // Inserir leads no banco
        const { data: insertResult, error: insertError } = await supabaseForInsert
          .from('leads')
          .insert(leadsToInsert)
          .select('id, email');

        if (insertError) {
          console.error('Erro ao inserir leads:', insertError);
          // Tratar cada lead individualmente se o batch falhar
          for (let i = 0; i < leadsToInsert.length; i++) {
            try {
              const { data: individualResult } = await supabaseForInsert
                .from('leads')
                .insert(leadsToInsert[i])
                .select('id, email');
              
              if (individualResult && individualResult.length > 0) {
                insertedCount++;
                // Verificar se este lead deve ser aluno
                const studentInfo = studentsToCreate.find(s => s.email === individualResult[0].email);
                if (studentInfo?.is_student) {
                  await supabaseForInsert
                    .from('students')
                    .insert({
                      lead_id: individualResult[0].id,
                      user_id: user.id
                    });
                }
              }
            } catch (individualError) {
              chunkErrors.push({
                line: (chunkIndex * 1000) + i + 1,
                error: `Erro ao inserir: ${individualError}`
              });
            }
          }
        } else if (insertResult) {
          insertedCount = insertResult.length;
          
          // Processar alunos em lote
          if (studentsToCreate.length > 0) {
            const studentsData = insertResult
              .filter((lead: any) => {
                const studentInfo = studentsToCreate.find(s => s.email === lead.email);
                return studentInfo?.is_student;
              })
              .map((lead: any) => ({
                lead_id: lead.id,
                user_id: user.id
              }));

            if (studentsData.length > 0) {
              await supabaseForInsert
                .from('students')
                .insert(studentsData);
            }
          }
        }
      } catch (error) {
        console.error('Erro geral na inserção:', error);
        chunkErrors.push({
          line: chunkIndex * 1000 + 1,
          error: `Erro geral no chunk: ${error}`
        });
      }
    }

    // Atualizar estatísticas do job
    job.processedChunks += 1;
    job.processedRows += data.length;
    job.successCount += insertedCount;
    job.errorCount += chunkErrors.length;
    job.errors.push(...chunkErrors);
    job.updatedAt = new Date();

    // Verificar se todos os chunks foram processados
    if (job.processedChunks >= job.totalChunks) {
      job.status = 'completed';
    }

    importJobs.set(jobId, job);

    return NextResponse.json({
      success: true,
      processedRows: data.length,
      insertedCount,
      errorCount: chunkErrors.length,
      errors: chunkErrors
    });

  } catch (error) {
    console.error('Erro ao processar chunk:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
