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
    const leads = (parsed.data as any[]).map((row, index) => {
      const lineNumber = index + 2; // +2 porque linha 1 é o header
      
      // Validar empresa se fornecida
      let company = null;
      if (row.company) {
        const companyValue = row.company.trim();
        if (['Favale', 'Pink', 'Favale&Pink'].includes(companyValue)) {
          company = companyValue;
        } else {
          console.warn(`Linha ${lineNumber}: Empresa inválida: ${companyValue}`);
        }
      }
      
      // Validar origem - garantir que Favale e Pink não sejam usados
      let source = row.source?.trim() || null;
      if (source && ['Favale', 'Pink'].includes(source)) {
        console.warn(`Linha ${lineNumber}: "${source}" deve ser usado como empresa, não como origem`);
        source = null; // Limpar a origem inválida
      }
      
      // Processar is_student
      let isStudent = false;
      if (row.is_student) {
        const studentValue = row.is_student.toString().toLowerCase().trim();
        isStudent = ['true', '1', 'yes', 'sim', 's'].includes(studentValue);
      }
      
      return {
        name: row.name?.trim(),
        email: row.email?.trim(),
        phone: row.phone?.trim() || null,
        company: company,
        status: row.status || 'New',
        source: source,
        is_student: isStudent,
        tags: row.tags ? row.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : [],
      };
    }).filter(l => l.name && l.email);
    if (leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead válido encontrado.' }, { status: 400 });
    }

    // Obter informações do usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // Separar leads que são alunos
    const studentsToCreate = leads.filter(lead => lead.is_student);
    
    // Remover is_student dos dados do lead (não existe essa coluna na tabela leads)
    const leadsToInsert = leads.map(({ is_student, ...lead }) => ({
      ...lead,
      user_id: user.id
    }));

    // Inserção em lote dos leads
    const { data: insertedLeads, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select('id, email');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Criar registros de alunos para leads marcados como aluno
    if (studentsToCreate.length > 0 && insertedLeads) {
      const studentsData = insertedLeads
        .filter(lead => {
          const originalLead = leads.find(l => l.email === lead.email);
          return originalLead?.is_student;
        })
        .map(lead => ({
          lead_id: lead.id,
          user_id: user.id
        }));

      if (studentsData.length > 0) {
        const { error: studentsError } = await supabase
          .from('students')
          .insert(studentsData);
        
        if (studentsError) {
          console.error('Erro ao criar registros de alunos:', studentsError);
          // Não retornar erro aqui, pois os leads já foram criados
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: leads.length,
      studentsCreated: studentsToCreate.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro desconhecido.' }, { status: 500 });
  }
}
