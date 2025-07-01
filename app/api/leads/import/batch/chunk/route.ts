import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

// Importar a mesma interface e Map do arquivo anterior
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

// Em produção, isso seria uma conexão com Redis ou banco de dados
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

    // Usar admin client para operações em lote
    const adminSupabase = createAdminClient();

    const { jobId, chunkIndex, data } = await request.json();

    // Validações
    if (!jobId || chunkIndex === undefined || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const job = importJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    if (job.userId !== user.id) {
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
      const lineNumber = (chunkIndex * 1000) + i + 1; // Assumindo chunks de 1000

      try {
        // Validação básica
        if (!row.name || !row.email) {
          chunkErrors.push({
            line: lineNumber,
            error: 'Nome e email são obrigatórios'
          });
          continue;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          chunkErrors.push({
            line: lineNumber,
            error: 'Email inválido'
          });
          continue;
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

        // Preparar dados do lead
        const leadData = {
          user_id: user.id,
          name: row.name?.trim(),
          email: row.email?.trim().toLowerCase(),
          phone: row.phone?.trim() || null,
          company: company,
          status: row.status?.trim() || 'new',
          source: source,
          campaign: row.campaign?.trim() || null,
          tags: row.tags ? row.tags.split(';').map((tag: string) => tag.trim()).filter(Boolean) : [],
          notes: row.notes?.trim() || null,
          created_at: new Date().toISOString(),
          is_student: isStudent // Temporário para processamento
        };

        validLeads.push(leadData);

      } catch (error) {
        chunkErrors.push({
          line: lineNumber,
          error: `Erro ao processar linha: ${error}`
        });
      }
    }

    // Inserir leads válidos no banco em batch
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

        // Usar upsert para evitar duplicatas por email
        const { data: insertResult, error: insertError } = await adminSupabase
          .from('leads')
          .upsert(leadsToInsert, { 
            onConflict: 'user_id,email',
            ignoreDuplicates: true 
          })
          .select('id, email');

        if (insertError) {
          console.error('Erro ao inserir leads:', insertError);
          // Tratar cada lead individualmente se o batch falhar
          for (let i = 0; i < leadsToInsert.length; i++) {
            try {
              const { data: individualResult } = await adminSupabase
                .from('leads')
                .upsert(leadsToInsert[i], {
                  onConflict: 'user_id,email',
                  ignoreDuplicates: true
                })
                .select('id, email');
              
              if (individualResult && individualResult.length > 0) {
                insertedCount++;
                // Verificar se este lead deve ser aluno
                const studentInfo = studentsToCreate.find(s => s.email === individualResult[0].email);
                if (studentInfo?.is_student) {
                  await adminSupabase
                    .from('students')
                    .upsert({
                      lead_id: individualResult[0].id,
                      user_id: user.id
                    }, {
                      onConflict: 'lead_id,user_id',
                      ignoreDuplicates: true
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
              .filter(lead => {
                const studentInfo = studentsToCreate.find(s => s.email === lead.email);
                return studentInfo?.is_student;
              })
              .map(lead => ({
                lead_id: lead.id,
                user_id: user.id
              }));

            if (studentsData.length > 0) {
              await adminSupabase
                .from('students')
                .upsert(studentsData, {
                  onConflict: 'lead_id,user_id',
                  ignoreDuplicates: true
                });
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
      job.status = job.errorCount === 0 ? 'completed' : 'completed'; // Completed mesmo com erros
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
