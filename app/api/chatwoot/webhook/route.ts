import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import crypto from 'crypto';

// Handle CORS preflight requests
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
    },
  });
}

export async function POST(request: Request) {

  // 1. Verify HMAC Signature (optional)
  const chatwootWebhookSecret = process.env.CHATWOOT_WEBHOOK_SECRET;
  const signature = request.headers.get('x-chatwoot-hmac-sha256');
  const body = await request.text();

  // Se há uma chave secreta configurada, validar HMAC
  if (chatwootWebhookSecret && signature) {
    const hmac = crypto.createHmac('sha256', chatwootWebhookSecret);
    const digest = hmac.update(body).digest('hex');

    if (digest !== signature) {
      console.error('Invalid HMAC signature');
      return NextResponse.json({ error: 'Invalid signature' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
        }
      });
    }
    console.log('✅ HMAC signature validated');
  } else if (chatwootWebhookSecret && !signature) {
    console.error('HMAC secret configured but no signature provided');
    return NextResponse.json({ error: 'Missing signature' }, { 
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
      }
    });
  } else {
    console.log('⚠️ HMAC validation skipped (no secret configured)');
  }

  // 2. Parse the payload
  const payload = JSON.parse(body);
  console.log('📦 Received payload:', JSON.stringify(payload, null, 2));
  
  const { event } = payload;
  console.log('🎯 Event:', event);
  
  // Extract contact data directly from payload (Chatwoot structure)
  const { name, email, phone_number, custom_attributes, additional_attributes } = payload;
  console.log('👤 Extracted fields:', { name, email, phone_number, custom_attributes, additional_attributes });

  // 3. Process only contact_created and contact_updated events
  if (event !== 'contact_created' && event !== 'contact_updated') {
    return NextResponse.json({ message: `Event ${event} not processed.` }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
      }
    });
  }

  if (!email && !phone_number) {
    return NextResponse.json({ error: 'Email or phone number is required.' }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
      }
    });
  }

  // Validar company - só aceita valores específicos
  const validCompanies = ['Favale', 'Pink', 'Favale&Pink'];
  const companyFromPayload = additional_attributes?.company_name || custom_attributes?.company_name;
  const validatedCompany = validCompanies.includes(companyFromPayload) ? companyFromPayload : 'Favale';
  
  // Melhorar o nome se for um número de telefone
  let displayName = name;
  if (name && /^\+?[\d\s\-\(\)]+$/.test(name.trim())) {
    displayName = 'Contato WhatsApp';
  }

  try {
    
    const leadData = {
      name: displayName,
      email: email || null,
      phone: phone_number || null,
      source: 'Chatwoot',
      tags: custom_attributes?.tags || [],
      company: validatedCompany,
      user_id: process.env.DEFAULT_USER_ID_FOR_LEADS || null,
      status: 'New'
    };
    
    console.log('💾 Lead data to save:', leadData);

    // 4. Verificar se lead já existe e atualizar ou criar novo
    // Prioridade: telefone > email
    let result: { data: any; wasUpdate: boolean } | undefined;
    
    if (phone_number) {
      // Se tem telefone, verificar se já existe e atualizar ou criar
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('phone', phone_number)
        .maybeSingle();
        
      if (existingLead) {
        // Atualizar lead existente
        const { data, error } = await supabaseAdmin
          .from('leads')
          .update({
            name: displayName,
            email: email || null,
            tags: custom_attributes?.tags || [],
            company: validatedCompany,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
          .select()
          .single();
          
        if (error) throw error;
        result = { data, wasUpdate: true };
      } else {
        // Criar novo lead
        const { data, error } = await supabaseAdmin
          .from('leads')
          .insert([leadData])
          .select()
          .single();
          
        if (error) throw error;
        result = { data, wasUpdate: false };
      }
    } else if (email) {
      // Se só tem email, verificar se já existe
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('email', email)
        .maybeSingle();
        
      if (existingLead) {
        // Atualizar lead existente
        const { data, error } = await supabaseAdmin
          .from('leads')
          .update({
            name: displayName,
            phone: phone_number || null,
            tags: custom_attributes?.tags || [],
            company: validatedCompany,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
          .select()
          .single();
          
        if (error) throw error;
        result = { data, wasUpdate: true };
      } else {
        // Criar novo lead
        const { data, error } = await supabaseAdmin
          .from('leads')
          .insert([leadData])
          .select()
          .single();
          
        if (error) throw error;
        result = { data, wasUpdate: false };
      }
    }
    
    if (!result) {
      throw new Error('No email or phone number provided');
    }
    
    const message = result.wasUpdate ? 'Lead updated successfully' : 'Lead created successfully';
    const statusCode = result.wasUpdate ? 200 : 201;
    
    return NextResponse.json({ message, lead: result.data }, { 
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
      }
    });
    
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-chatwoot-hmac-sha256',
      }
    });
  }
}