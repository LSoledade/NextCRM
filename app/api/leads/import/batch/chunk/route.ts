import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Usar cliente regular autenticado em vez de admin client
    // O RLS está configurado corretamente para permitir que usuários insiram seus próprios leads
    const supabaseForInsert = await createClient();

    const { jobId, chunkIndex, data } = await request.json();
    console.log(`Processando chunk ${chunkIndex} para job ${jobId}`, { dataLength: data?.length });

    // Validações
    if (!jobId || chunkIndex === undefined || !data || !Array.isArray(data)) {
      console.error('Parâmetros inválidos:', { jobId, chunkIndex, dataLength: data?.length });
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const job = importJobs.get(jobId);
    if (!job) {
      console.error('Job não encontrado:', jobId);
      console.log('Jobs disponíveis:', Array.from(importJobs.keys()));
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    if (job.userId !== user.id) {
      console.error('Usuário não autorizado para o job:', { jobUserId: job.userId, currentUserId: user.id });
      return NextResponse.json({ error: 'Não autorizado para este job' }, { status: 403 });
    }

    // Atualizar status do job
    job.status = 'processing';
    job.updatedAt = new Date();

    // Processar chunk de dados
    const chunkErrors: Array<{ line: number; error: string }> = [];
    const validLeads: any[] = [];

    console.log(`Processando chunk ${chunkIndex} com ${data.length} linhas`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const lineNumber = (chunkIndex * 1000) + i + 1; // Assumindo chunks de 1000

      console.log(`Processando linha ${lineNumber}:`, row);

      try {
        // Validação básica
        if (!row.name || !row.email) {
          const error = 'Nome e email são obrigatórios';
          console.log(`Linha ${lineNumber} inválida:`, error);
          chunkErrors.push({
            line: lineNumber,
            error
          });
          continue;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          const error = 'Email inválido';
          console.log(`Linha ${lineNumber} com email inválido:`, row.email);
          chunkErrors.push({
            line: lineNumber,
            error
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

        // Validar e processar status
        let status = 'New'; // Valor padrão
        if (row.status) {
          const statusValue = row.status.trim();
          // Verificar se o status é válido conforme a tabela
          if (['New', 'Contacted', 'Converted', 'Lost'].includes(statusValue)) {
            status = statusValue;
          } else {
            // Se o status não for válido, usar o padrão mas não dar erro
            console.log(`Status inválido "${statusValue}" na linha ${lineNumber}, usando "New"`);
          }
        }

        // Preparar dados do lead - apenas campos que existem na tabela
        const leadData = {
          user_id: user.id,
          name: row.name?.trim(),
          email: row.email?.trim().toLowerCase(),
          phone: row.phone?.trim() || null,
          company: company,
          status: status,
          source: source,
          tags: row.tags ? row.tags.split(';').map((tag: string) => tag.trim()).filter(Boolean) : [],
          is_student: isStudent // Temporário para processamento
        };

        console.log(`Lead válido criado na linha ${lineNumber}:`, leadData);
        validLeads.push(leadData);

      } catch (error) {
        const errorMsg = `Erro ao processar linha: ${error}`;
        console.log(`Erro na linha ${lineNumber}:`, errorMsg);
        chunkErrors.push({
          line: lineNumber,
          error: errorMsg
        });
      }
    }

    console.log(`Chunk ${chunkIndex} processado: ${validLeads.length} leads válidos, ${chunkErrors.length} erros`);

    // Inserir leads válidos no banco em batch
    let insertedCount = 0;
    const studentsToCreate: any[] = [];
    
    console.log(`Processando ${validLeads.length} leads válidos para inserção`);
    
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

        console.log('Dados preparados para inserção:', leadsToInsert[0]); // Log do primeiro lead
        console.log('Total de leads para inserir:', leadsToInsert.length);

        // Usar insert simples já que não temos constraint única
        const { data: insertResult, error: insertError } = await supabaseForInsert
          .from('leads')
          .insert(leadsToInsert)
          .select('id, email');

        console.log('Resultado da inserção:', { insertResult, insertError });

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
      job.status = job.errorCount === 0 ? 'completed' : 'completed'; // Completed mesmo com erros
    }

    importJobs.set(jobId, job);
    
    console.log(`Chunk ${chunkIndex} processado:`, {
      insertedCount,
      errorCount: chunkErrors.length,
      jobProcessedChunks: job.processedChunks,
      jobTotalChunks: job.totalChunks,
      jobStatus: job.status
    });

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
